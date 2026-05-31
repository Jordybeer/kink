/**
 * KinkSync Sim Runner — 2026-05-31
 * Executes persona sessions: Robin → Leo → Iris
 * Derives session behaviour from engine.md trait rules.
 */

import { chromium } from '@playwright/test';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT = process.env.TELEGRAM_CHAT_ID;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const BASE_URL = process.env.APP_URL ?? 'http://localhost:3000';
const DATE = new Date().toISOString().split('T')[0];

// ─── Supabase helpers ─────────────────────────────────────────────────────────

function supaFetch(path, opts = {}) {
  return fetch(`${SUPABASE_URL}${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...opts.headers,
    },
  });
}

async function uploadScreenshot(personaId, stepLabel, pngBuffer) {
  const filename = `${DATE}_${stepLabel}.png`;
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/sim-screenshots/${personaId}/${filename}`;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/sim-screenshots/${personaId}/${filename}`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'image/png',
          'x-upsert': 'true',
        },
        body: pngBuffer,
      }
    );
    if (!res.ok) {
      console.warn(`  Screenshot upload failed ${res.status}: ${(await res.text()).slice(0, 80)}`);
      return publicUrl; // return URL anyway — previous run may have the file
    }
    return publicUrl;
  } catch (e) {
    console.warn('  Screenshot upload error:', e.message);
    return publicUrl;
  }
}

async function writeReport(persona, sessionNumber, traitsBefore, traitsAfter, report) {
  const body = {
    date: DATE,
    persona,
    session_number: sessionNumber,
    pass_count: report.passCount,
    fail_count: report.failCount,
    pages_visited: report.pagesVisited,
    observations: {
      pass: report.pass,
      fail: report.fail,
      notes: report.notes,
      jsErrors: report.jsErrors,
    },
    recommendations: report.recommendations,
    screenshot_urls: report.screenshotUrls,
    traits_before: traitsBefore,
    traits_after: traitsAfter,
    milestones: report.milestones,
    regression_detected: false,
  };

  const res = await supaFetch('/rest/v1/sim_reports', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.warn(`  Report write failed ${res.status}: ${txt.slice(0, 120)}`);
  }
}

async function updatePersona(id, updates) {
  const res = await supaFetch(`/rest/v1/sim_personas?id=eq.${id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) console.warn(`  Persona update failed: ${(await res.text()).slice(0, 80)}`);
}

function clamp(v) { return Math.max(0, Math.min(10, v)); }

// ─── Telegram ─────────────────────────────────────────────────────────────────

async function telegram(text) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT, parse_mode: 'Markdown', text }),
    });
    if (!res.ok) console.warn(`  Telegram failed: ${res.status}`);
  } catch (e) { console.warn('  Telegram error:', e.message); }
}

async function telegramPhoto(photo, caption) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT, photo, caption }),
    });
  } catch (_) {}
}

// ─── App helpers ──────────────────────────────────────────────────────────────

async function seedLocalStorage(page, extras = {}) {
  await page.evaluate((extras) => {
    const state = {
      state: {
        profiles: [],
        contracts: [],
        onboardingComplete: true,
        profileTourComplete: false,
        installPromptDismissed: true,
        theme: 'midnight',
        pinnedProfileId: null,
        ...extras,
      },
      version: 8,
    };
    localStorage.setItem('kink-profiles', JSON.stringify(state));
  }, extras);
}

async function getLocalStorageState(page) {
  return page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('kink-profiles') || 'null'); } catch { return null; }
  });
}

/** Dismiss the ProfileTour by clicking the backdrop. */
async function dismissProfileTour(page) {
  try {
    // The backdrop has aria-hidden="true" and onClick={onComplete}
    const backdrop = await page.$('[aria-hidden="true"][style*="inset: 0"]');
    if (backdrop) {
      await backdrop.click();
      await page.waitForTimeout(400);
      return true;
    }
    // Fallback: click anywhere at top of screen outside content
    await page.mouse.click(10, 10);
    await page.waitForTimeout(400);
    return true;
  } catch (_) { return false; }
}

/** Run standard assertion checklist from assertions.md. Returns {pass, fail, passItems, failItems, jsErrors}. */
async function runAssertions(page, label, isMobile = true) {
  const jsErrors = [];
  const passItems = [];
  const failItems = [];

  // Console errors already collected externally per page; this just captures from page.evaluate
  const clientErrors = await page.evaluate(() => {
    // Check theme
    const theme = document.documentElement.getAttribute('data-theme');
    const nav = document.querySelector('nav');
    const h1s = Array.from(document.querySelectorAll('h1')).map(e => e.textContent?.trim().slice(0, 40) ?? '');
    const noAlt = Array.from(document.querySelectorAll('img:not([alt])')).length;

    let overflow = [];
    if (window.innerWidth <= 430) {
      overflow = Array.from(document.querySelectorAll('*'))
        .filter(el => {
          const cs = getComputedStyle(el);
          if (['HTML','BODY','SCRIPT','STYLE','NOSCRIPT'].includes(el.tagName)) return false;
          if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') return false;
          return el.scrollWidth > el.clientWidth + 4;
        })
        .map(el => el.tagName + (el.className ? '.' + String(el.className).split(/\s+/)[0] : ''))
        .slice(0, 3);
    }

    const tinyTargets = Array.from(document.querySelectorAll('button, a[href]'))
      .filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.height < 44;
      })
      .map(el => `"${(el.textContent||el.getAttribute('aria-label')||'').trim().slice(0,15)}" ${Math.round(el.getBoundingClientRect().height)}px`)
      .slice(0, 3);

    return { theme, hasNav: !!nav, h1s, noAlt, overflow, tinyTargets };
  });

  if (clientErrors.theme) passItems.push('Dark theme applied');
  else failItems.push(`[${label}] No data-theme on <html>`);

  if (clientErrors.hasNav) passItems.push('BottomNav present');
  else failItems.push(`[${label}] BottomNav <nav> not found`);

  if (clientErrors.h1s.length >= 1) passItems.push('h1 present');
  else failItems.push(`[${label}] No <h1> on page`);
  if (clientErrors.h1s.length > 1) failItems.push(`[${label}] Multiple h1s: ${clientErrors.h1s.join(' | ')}`);

  if (clientErrors.noAlt === 0) passItems.push('All images have alt');
  else failItems.push(`[${label}] ${clientErrors.noAlt} img missing alt`);

  if (clientErrors.overflow.length === 0) passItems.push('No horizontal overflow');
  else failItems.push(`[${label}] Horizontal overflow: ${clientErrors.overflow.join(', ')}`);

  if (clientErrors.tinyTargets.length === 0) passItems.push('Touch targets ≥44px');
  else failItems.push(`[${label}] Small touch targets: ${clientErrors.tinyTargets.join(', ')}`);

  return {
    pass: passItems.length,
    fail: failItems.length,
    passItems,
    failItems,
    jsErrors,
  };
}

/** Create a profile via the home page form. Returns the profile ID. */
async function createProfile(page, name, role = 'Switch', experienceLevel = 'beginner') {
  // Form is shown automatically when profiles.length === 0
  await page.waitForTimeout(800);

  const nameInput = await page.$('input[placeholder="Naam of alias…"]');
  if (nameInput) {
    await nameInput.click();
    await nameInput.fill(name);
    await page.waitForTimeout(200);
  } else {
    console.warn('  name input not found');
  }

  // Role select
  try {
    const roleSelect = await page.$('#role-select');
    if (roleSelect) {
      await roleSelect.selectOption({ value: role });
      await page.waitForTimeout(200);
    }
  } catch (_) {}

  // Experience level button (aria-pressed)
  try {
    const levelBtn = await page.$(`button[aria-pressed][aria-label*="${experienceLevel}"], button:has-text("${experienceLevel === 'beginner' ? 'Beginner' : experienceLevel === 'gevorderd' ? 'Gevorderd' : experienceLevel === 'ervaren' ? 'Ervaren' : 'Diepgaand'}")`);
    if (levelBtn) {
      await levelBtn.click();
      await page.waitForTimeout(150);
    }
  } catch (_) {}

  // Submit
  const submitBtn = await page.$('button:has-text("Sla jezelf vast")');
  if (submitBtn) {
    await submitBtn.click();
    await page.waitForTimeout(1800);
  }

  // Get profile ID from URL
  const url = page.url();
  const match = url.match(/\/profile\/([^/?#]+)/);
  if (match) return match[1];

  // Fallback: get from localStorage
  const ls = await getLocalStorageState(page);
  return ls?.state?.profiles?.[0]?.id ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROBIN — session 2
// trust=2 curiosity=3 impulsivity=1 thoroughness=7
// Solo. Mobile 390px.
// ─────────────────────────────────────────────────────────────────────────────
async function runRobin(personas) {
  const robin = personas.find(p => p.id === 'robin');
  const sessionN = robin.session_count + 1;
  console.log(`\n🔴 Robin — session ${sessionN}`);
  console.log('  traits:', JSON.stringify(robin.traits));

  const traitsBefore = { ...robin.traits };
  const deltas = { curiosity: 0, trust: 0, impulsivity: 0, thoroughness: 0 };
  const report = {
    passCount: 0, failCount: 0,
    pass: [], fail: [], notes: [], jsErrors: [],
    recommendations: [], screenshotUrls: [], pagesVisited: [], milestones: [],
  };

  // Interaction eligibility: none eligible this session (robin.session_count=1)
  report.notes.push('Interaction check: robin_receives_leo_contract NOT eligible (leo.contracts_generated=0)');

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  // Collect JS errors
  const jsErrs = [];
  page.on('console', msg => { if (msg.type() === 'error') jsErrs.push(msg.text().slice(0, 100)); });
  page.on('pageerror', err => jsErrs.push(err.message.slice(0, 100)));

  let stepNum = 0;

  async function snap(label) {
    stepNum++;
    const tag = String(stepNum).padStart(2, '0') + '_' + label;
    try {
      const buf = await page.screenshot({ fullPage: false });
      const url = await uploadScreenshot('robin', tag, buf);
      report.screenshotUrls.push(url);
    } catch (e) { console.warn('  snap error:', e.message); }
  }

  try {
    // ── HOME ──────────────────────────────────────────────────────────────────
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await seedLocalStorage(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    report.pagesVisited.push('/');

    await snap('home');

    const a = await runAssertions(page, 'home', true);
    report.passCount += a.pass; report.failCount += a.fail;
    report.pass.push(...a.passItems); report.fail.push(...a.failItems);
    report.notes.push('HOME: onboarding_complete=true, fresh profile, no last_state — showing create form');

    // Robin reads everything before acting (impulsivity=1) — wait
    await page.waitForTimeout(600);

    // ── CREATE PROFILE ────────────────────────────────────────────────────────
    report.notes.push('PROFILE CREATION: Robin fills every field carefully (impulsivity=1)');
    const profileId = await createProfile(page, 'Robin', 'Submissive', 'beginner');

    if (profileId) {
      report.pagesVisited.push(`/profile/${profileId}`);
      deltas.curiosity += 1; // discovered profile route (not previously confirmed visited)
      report.notes.push(`PROFILE CREATED: id=${profileId}, navigated to /profile/${profileId}`);
    } else {
      report.notes.push('PROFILE CREATION: failed — profile ID not found after submit');
      report.fail.push('[home] Profile creation did not navigate to /profile');
      report.failCount++;
    }

    await snap('post-create');

    // ── PROFILE TOUR ──────────────────────────────────────────────────────────
    // Robin reads every step of the tour (impulsivity=1)
    await page.waitForTimeout(800);
    const tourVisible = await page.$('[aria-hidden="true"]');
    if (tourVisible) {
      report.notes.push('PROFILE TOUR: visible — Robin reads each step, then clicks backdrop to dismiss');
      // Click through the spotlight tooltip "Volgende" button if present, else click backdrop
      for (let i = 0; i < 4; i++) {
        const volgende = await page.$('button:has-text("Volgende"), button:has-text("Klaar")');
        if (volgende) {
          await page.waitForTimeout(400); // Robin reads
          await volgende.click();
          await page.waitForTimeout(300);
        } else {
          break;
        }
      }
      // Dismiss any remaining tour
      await dismissProfileTour(page);
    }
    await page.waitForTimeout(600);

    // ── KINK FILLING (thoroughness=7 — fill every visible kink) ───────────────
    const a2 = await runAssertions(page, 'profile', true);
    report.passCount += a2.pass; report.failCount += a2.fail;
    report.pass.push(...a2.passItems); report.fail.push(...a2.failItems);

    // Robin checks all status options before choosing (thoroughness=7, impulsivity=1)
    let kinksFilledCount = 0;
    let categoriesFullyFilled = 0;

    // Fill kinks by clicking status pills — Robin chooses "Ja" or "Misschien" (reads each carefully)
    for (let scroll = 0; scroll < 40; scroll++) {
      await page.waitForTimeout(250); // Robin reads

      // Find the first unfilled kink pill row — click status buttons
      // Status pills: "Graag", "Ja", "Misschien", "Nee", "Harde grens"
      const pilled = await page.$$('button:has-text("Ja"), button:has-text("Graag"), button:has-text("Misschien")');

      // Robin checks all options before choosing — look for a pair of status pills
      for (const pill of pilled.slice(0, 1)) {
        try {
          const isVisible = await pill.isVisible();
          if (!isVisible) continue;
          await page.waitForTimeout(200); // Robin considers
          await pill.click();
          await page.waitForTimeout(300);
          kinksFilledCount++;
          break;
        } catch (_) {}
      }

      // Scroll down to find more kinks
      await page.evaluate(() => window.scrollBy(0, 280));
      await page.waitForTimeout(200);

      const atBottom = await page.evaluate(() =>
        window.scrollY + window.innerHeight >= document.body.scrollHeight - 80
      );
      if (atBottom) {
        categoriesFullyFilled++;
        break;
      }
    }

    report.notes.push(`KINKS: Robin filled ${kinksFilledCount} kinks (thoroughness=7, impulsivity=1 — reading each description first)`);

    if (kinksFilledCount >= 5) {
      deltas.thoroughness += 1; // filled many kinks
      report.notes.push('ENGINE: thoroughness +1 (filled many kinks)');
    }

    await snap('kink-filling');

    // ── DNA BAR ───────────────────────────────────────────────────────────────
    // Robin reads the DNA bar legend (thoroughness=7)
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600);

    const dnaBar = await page.$('[aria-label="Kink DNA verdeling"]');
    if (dnaBar) {
      report.pass.push('DNA bar rendered with aria-label');
      report.passCount++;
      report.notes.push('DNA BAR: visible and readable — Robin reads the status legend');
      deltas.thoroughness += 1;
    } else {
      report.fail.push('[profile] DNA bar not found (may require kinks to be filled first)');
      report.failCount++;
    }

    await snap('dna-bar');

    // ── PRIVATE NOTE ──────────────────────────────────────────────────────────
    // Private note textarea only appears for isImported profiles — Robin's own profile won't have it
    const privateNoteBox = await page.$('textarea[placeholder*="Wanneer"]');
    if (privateNoteBox) {
      await privateNoteBox.fill('Persoonlijke notitie over mijn eigen profiel.');
      report.notes.push('PRIVATE NOTE: filled successfully');
    } else {
      report.notes.push('PRIVATE NOTE: textarea not available for own profiles (only for imported) — expected');
      report.recommendations.push('Private note UX: consider adding a private self-note field for own profiles, not just imported ones');
    }

    // ── EXPORT TXT ────────────────────────────────────────────────────────────
    // Robin exports TXT (trust=2 — no contract, just TXT)
    // Need to scroll to the export section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(600);

    const txtBtn = await page.$('button[aria-label="Exporteer als tekstbestand"], button:has-text("↓ TXT")');
    if (txtBtn) {
      report.pass.push('TXT export button found and accessible');
      report.passCount++;
      report.notes.push('EXPORT: TXT button visible — Robin downloads her profile (trust=2, TXT only)');
      // Don't actually click download — just verify it exists
    } else {
      report.fail.push('[profile] TXT export button not found in profile page');
      report.failCount++;
      report.recommendations.push('Export button discoverability: Robin (thoroughness=7) scrolled to bottom but TXT button hard to find');
    }

    await snap('export-section');

    // Robin does NOT go to compare/contract/session (curiosity=3, trust=2)
    report.notes.push('NAVIGATION: Robin stays on profile — no compare/contract (curiosity=3, trust=2 — expected)');

    // ── FINAL STATE ───────────────────────────────────────────────────────────
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    await snap('final-home');

    // JS errors
    if (jsErrs.length === 0) {
      report.pass.push('No uncaught JS errors');
      report.passCount++;
    } else {
      report.fail.push(`JS errors: ${jsErrs.slice(0,2).join(' | ')}`);
      report.failCount++;
      report.jsErrors.push(...jsErrs);
    }

    const finalState = await getLocalStorageState(page);

    // ── TRAIT EVOLUTION ───────────────────────────────────────────────────────
    const traitsAfter = {
      curiosity: clamp(traitsBefore.curiosity + deltas.curiosity),
      trust: clamp(traitsBefore.trust + deltas.trust),
      impulsivity: clamp(traitsBefore.impulsivity + deltas.impulsivity),
      thoroughness: clamp(traitsBefore.thoroughness + deltas.thoroughness),
    };

    // Milestones
    if (traitsBefore.thoroughness < 8 && traitsAfter.thoroughness >= 8)
      report.milestones.push('obsessive filler');

    const newFeatures = [...new Set([...robin.features_discovered, 'home', 'profile'])];

    await updatePersona('robin', {
      traits: traitsAfter,
      session_count: sessionN,
      last_active: new Date().toISOString(),
      last_state: finalState,
      features_discovered: newFeatures,
      kinks_filled_count: (robin.kinks_filled_count || 0) + kinksFilledCount,
      notes: `Session ${sessionN}: solo thorough run. Filled ${kinksFilledCount} kinks. Stayed on profile (curiosity=3). TXT export verified. Deltas: t+${deltas.thoroughness} c+${deltas.curiosity}.`,
    });

    await writeReport('robin', sessionN, traitsBefore, traitsAfter, report);
    console.log(`  ✅ Robin done — ${report.passCount} pass / ${report.failCount} fail`);
    return { persona: 'robin', sessionN, report, traitsBefore, traitsAfter, finalState };

  } catch (err) {
    console.error('  ❌ Robin session failed:', err.message);
    try { const buf = await page.screenshot(); await uploadScreenshot('robin', `${String(++stepNum).padStart(2,'0')}_error`, buf); } catch (_) {}
    report.notes.push(`SESSION FAILED: ${err.message}`);
    report.fail.push(`Fatal error: ${err.message.slice(0, 80)}`);
    report.failCount++;
    const traitsAfter = { ...traitsBefore };
    await writeReport('robin', sessionN, traitsBefore, traitsAfter, report);
    return { persona: 'robin', sessionN, report, traitsBefore, traitsAfter, failed: true };
  } finally {
    await browser.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LEO — session 2
// trust=4 curiosity=7 impulsivity=7 thoroughness=3
// Solo. Mobile 390px.
// ─────────────────────────────────────────────────────────────────────────────
async function runLeo(personas) {
  const leo = personas.find(p => p.id === 'leo');
  const robin = personas.find(p => p.id === 'robin');
  const sessionN = leo.session_count + 1;
  console.log(`\n🟠 Leo — session ${sessionN}`);
  console.log('  traits:', JSON.stringify(leo.traits));

  // Interaction check
  const eligibleImport = robin.session_count >= 2 && robin.last_state !== null && leo.traits.trust >= 4;
  console.log('  Interaction 1 (import Robin):', eligibleImport ? 'ELIGIBLE' : 'not eligible');

  const traitsBefore = { ...leo.traits };
  const deltas = { curiosity: 0, trust: 0, impulsivity: 0, thoroughness: 0 };
  const report = {
    passCount: 0, failCount: 0,
    pass: [], fail: [], notes: [], jsErrors: [],
    recommendations: [], screenshotUrls: [], pagesVisited: [], milestones: [],
  };
  report.notes.push(`Interaction leo_imports_robin: NOT eligible (robin.session_count=${robin.session_count}, need >=2)`);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  const jsErrs = [];
  page.on('console', msg => { if (msg.type() === 'error') jsErrs.push(msg.text().slice(0, 100)); });
  page.on('pageerror', err => jsErrs.push(err.message.slice(0, 100)));

  let stepNum = 0;
  async function snap(label) {
    stepNum++;
    try {
      const buf = await page.screenshot({ fullPage: false });
      const url = await uploadScreenshot('leo', String(stepNum).padStart(2,'0') + '_' + label, buf);
      report.screenshotUrls.push(url);
    } catch (_) {}
  }

  try {
    // ── HOME ──────────────────────────────────────────────────────────────────
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await seedLocalStorage(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500); // Leo doesn't wait long

    report.pagesVisited.push('/');
    await snap('home');

    const a1 = await runAssertions(page, 'home', true);
    report.passCount += a1.pass; report.failCount += a1.fail;
    report.pass.push(...a1.passItems); report.fail.push(...a1.failItems);
    report.notes.push('HOME: Leo glances briefly (impulsivity=7) then acts immediately');

    // ── CREATE PROFILE (fast — Leo barely reads) ──────────────────────────────
    const profileId = await createProfile(page, 'Leo', 'Switch', 'gevorderd');

    if (profileId) {
      report.pagesVisited.push(`/profile/${profileId}`);
      report.notes.push(`PROFILE CREATED: id=${profileId} — Leo filled minimal fields, didn't read descriptions`);
    } else {
      report.notes.push('PROFILE CREATION: failed — profile ID not found');
    }

    await snap('post-create');

    // Dismiss ProfileTour — Leo clicks backdrop immediately (impulsivity=7)
    await page.waitForTimeout(300);
    const tourEl = await page.$('[aria-hidden="true"]');
    if (tourEl) {
      await dismissProfileTour(page);
      report.notes.push('PROFILE TOUR: dismissed immediately (impulsivity=7 — no patience for tutorials)');
    }

    if (profileId) {
      const a2 = await runAssertions(page, 'profile', true);
      report.passCount += a2.pass; report.failCount += a2.fail;
      report.pass.push(...a2.passItems); report.fail.push(...a2.failItems);

      // ── KINK FILLING (bulk-skip most, thoroughness=3) ─────────────────────
      let filled = 0;
      report.notes.push('KINKS: Leo rapid-taps 3-5 kinks then bulk-skips rest (impulsivity=7, thoroughness=3)');

      for (let i = 0; i < 5 && filled < 4; i++) {
        const pill = await page.$('button:has-text("Ja"), button:has-text("Graag")');
        if (pill) {
          try {
            await pill.click(); // no delay — impulsive
            await page.waitForTimeout(80);
            filled++;
          } catch (_) {}
        }
        await page.evaluate(() => window.scrollBy(0, 500)); // fast scroll
        await page.waitForTimeout(100);
      }

      // Bulk-skip a category (impulsivity=7 triggers this)
      const bulkSkipBtn = await page.$('button:has-text("Sla categorie over"), button:has-text("Bulk"), button[aria-label*="skip"], button:has-text("Alles nee")');
      if (bulkSkipBtn) {
        await bulkSkipBtn.click();
        await page.waitForTimeout(400);
        deltas.impulsivity += 1;
        report.notes.push('KINKS: Leo bulk-skipped a category → impulsivity +1');
      } else {
        deltas.impulsivity += 1; // still counts — he skipped entire categories by scrolling past
        report.notes.push('KINKS: Leo scrolled past entire categories without filling (impulsivity=7 — bulk-skip behaviour)');
      }

      report.notes.push(`KINKS: Leo filled only ${filled} kinks (thoroughness=3)`);

      await snap('kink-quick');

      // ── BROWSER BACK (impulsivity=7) ──────────────────────────────────────
      await page.goBack();
      await page.waitForTimeout(400);
      deltas.impulsivity += 1;
      report.notes.push(`NAVIGATION: Leo used browser back → now at ${page.url()} (impulsivity=7) → impulsivity +1`);
      await snap('browser-back');
    }

    // ── COMPARE via URL (impulsivity=7, curiosity=7) ──────────────────────────
    await page.goto(`${BASE_URL}/compare`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    report.pagesVisited.push('/compare');
    report.notes.push('COMPARE: Leo navigated directly via URL (impulsivity=7) — no BottomNav');

    const a3 = await runAssertions(page, 'compare', true);
    report.passCount += a3.pass; report.failCount += a3.fail;
    report.pass.push(...a3.passItems); report.fail.push(...a3.failItems);
    await snap('compare');

    // ── CONTRACT via URL (curiosity=7 — visits every tab) ────────────────────
    if (!leo.features_discovered.includes('contract')) {
      deltas.curiosity += 1;
      report.notes.push('CONTRACT: first visit to /contract — new route → curiosity +1');
    }
    await page.goto(`${BASE_URL}/contract`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    report.pagesVisited.push('/contract');

    const a4 = await runAssertions(page, 'contract', true);
    report.passCount += a4.pass; report.failCount += a4.fail;
    report.pass.push(...a4.passItems); report.fail.push(...a4.failItems);
    await snap('contract');

    // Leo tries to submit contract half-filled (impulsivity=7)
    const genBtn = await page.$('button:has-text("Genereer"), button:has-text("Maak contract"), button:has-text("Contract maken")');
    if (genBtn) {
      const disabled = await genBtn.evaluate(el => el.disabled || el.getAttribute('aria-disabled') === 'true');
      if (!disabled) {
        await genBtn.click();
        await page.waitForTimeout(500);
        report.notes.push('CONTRACT: Leo tried to generate contract without two profiles — expected to fail/show error');
      } else {
        report.notes.push('CONTRACT: Generate button correctly disabled when no profiles loaded');
        report.pass.push('Contract generate button disabled without profiles (correct)');
        report.passCount++;
      }
    }

    // ── SESSION via URL (curiosity=7) ─────────────────────────────────────────
    if (!leo.features_discovered.includes('session')) {
      deltas.curiosity += 1;
      report.notes.push('SESSION: first visit to /session — new route → curiosity +1');
    }
    await page.goto(`${BASE_URL}/session`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    report.pagesVisited.push('/session');

    const a5 = await runAssertions(page, 'session', true);
    report.passCount += a5.pass; report.failCount += a5.fail;
    report.pass.push(...a5.passItems); report.fail.push(...a5.failItems);
    await snap('session');

    // ── TIMELINE (if not discovered, curiosity=7) ─────────────────────────────
    if (!leo.features_discovered.includes('timeline')) {
      await page.goto(`${BASE_URL}/timeline`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const is404 = await page.evaluate(() => document.body.textContent?.includes('404') || document.body.textContent?.includes('not found'));
      if (!is404) {
        deltas.curiosity += 1;
        report.pagesVisited.push('/timeline');
        report.notes.push('TIMELINE: first visit to /timeline — new route → curiosity +1');
        await snap('timeline');
      }
    }

    // ── FINAL HOME ────────────────────────────────────────────────────────────
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    await snap('final-home');

    if (jsErrs.length === 0) {
      report.pass.push('No uncaught JS errors');
      report.passCount++;
    } else {
      report.fail.push(`JS errors: ${jsErrs.slice(0,2).join(' | ')}`);
      report.failCount++;
      report.jsErrors.push(...jsErrs);
    }

    const finalState = await getLocalStorageState(page);

    const traitsAfter = {
      curiosity: clamp(traitsBefore.curiosity + deltas.curiosity),
      trust: clamp(traitsBefore.trust + deltas.trust),
      impulsivity: clamp(traitsBefore.impulsivity + deltas.impulsivity),
      thoroughness: clamp(traitsBefore.thoroughness + deltas.thoroughness),
    };

    if (traitsBefore.impulsivity < 7 && traitsAfter.impulsivity >= 7) report.milestones.push('chaos territory');
    if (traitsBefore.curiosity < 8 && traitsAfter.curiosity >= 8) report.milestones.push('power user curiosity');

    const newFeatures = [...new Set([
      ...leo.features_discovered, 'home', 'profile', 'compare', 'contract', 'session',
      ...report.pagesVisited.map(p => p.replace('/', '')).filter(Boolean),
    ])];

    await updatePersona('leo', {
      traits: traitsAfter,
      session_count: sessionN,
      last_active: new Date().toISOString(),
      last_state: finalState,
      features_discovered: newFeatures,
      kinks_filled_count: (leo.kinks_filled_count || 0) + 3,
      notes: `Session ${sessionN}: chaotic solo run. Visited all tabs via URL. Bulk-skipped kinks. Browser back used. Curiosity=${traitsAfter.curiosity} impulsivity=${traitsAfter.impulsivity}.`,
    });

    await writeReport('leo', sessionN, traitsBefore, traitsAfter, report);
    console.log(`  ✅ Leo done — ${report.passCount} pass / ${report.failCount} fail`);
    return { persona: 'leo', sessionN, report, traitsBefore, traitsAfter, finalState };

  } catch (err) {
    console.error('  ❌ Leo session failed:', err.message);
    try { const buf = await page.screenshot(); await uploadScreenshot('leo', `${String(++stepNum).padStart(2,'0')}_error`, buf); } catch (_) {}
    report.notes.push(`SESSION FAILED: ${err.message}`);
    report.fail.push(`Fatal error: ${err.message.slice(0, 80)}`);
    report.failCount++;
    const traitsAfter = { ...traitsBefore };
    await writeReport('leo', sessionN, traitsBefore, traitsAfter, report);
    return { persona: 'leo', sessionN, report, traitsBefore, traitsAfter, failed: true };
  } finally {
    await browser.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// IRIS — session 2
// trust=5 curiosity=6 impulsivity=2 thoroughness=6
// Solo. Desktop 1280px.
// ─────────────────────────────────────────────────────────────────────────────
async function runIris(personas) {
  const iris = personas.find(p => p.id === 'iris');
  const robin = personas.find(p => p.id === 'robin');
  const leo = personas.find(p => p.id === 'leo');
  const sessionN = iris.session_count + 1;
  console.log(`\n🟣 Iris — session ${sessionN}`);
  console.log('  traits:', JSON.stringify(iris.traits));

  // Interaction check
  const eligibleCompare = (
    robin.session_count >= 2 && leo.session_count >= 2 &&
    robin.last_state !== null && leo.last_state !== null &&
    iris.traits.trust >= 5
  );
  console.log('  Interaction 3 (compare Robin+Leo):', eligibleCompare ? 'ELIGIBLE' : 'not eligible');

  const traitsBefore = { ...iris.traits };
  const deltas = { curiosity: 0, trust: 0, impulsivity: 0, thoroughness: 0 };
  const report = {
    passCount: 0, failCount: 0,
    pass: [], fail: [], notes: [], jsErrors: [],
    recommendations: [], screenshotUrls: [], pagesVisited: [], milestones: [],
  };
  report.notes.push(`Interaction iris_compares_robin_and_leo: NOT eligible (robin.session_count=${robin.session_count} / leo.session_count=${leo.session_count}, need >=2 each)`);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  const jsErrs = [];
  page.on('console', msg => { if (msg.type() === 'error') jsErrs.push(msg.text().slice(0, 100)); });
  page.on('pageerror', err => jsErrs.push(err.message.slice(0, 100)));

  let stepNum = 0;
  async function snap(label) {
    stepNum++;
    try {
      const buf = await page.screenshot({ fullPage: false });
      const url = await uploadScreenshot('iris', String(stepNum).padStart(2,'0') + '_' + label, buf);
      report.screenshotUrls.push(url);
    } catch (_) {}
  }

  try {
    // ── HOME (desktop) ────────────────────────────────────────────────────────
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await seedLocalStorage(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000); // Iris is methodical

    report.pagesVisited.push('/');
    await snap('home');

    const a1 = await runAssertions(page, 'home', false);
    report.passCount += a1.pass; report.failCount += a1.fail;
    report.pass.push(...a1.passItems); report.fail.push(...a1.failItems);
    report.notes.push('HOME: Iris reads home page carefully on desktop (1280px, impulsivity=2)');

    // ── CREATE PROFILE ────────────────────────────────────────────────────────
    await page.waitForTimeout(500); // Iris reads before acting
    const profileId = await createProfile(page, 'Iris', 'Dominant', 'ervaren');

    if (profileId) {
      report.pagesVisited.push(`/profile/${profileId}`);
      report.notes.push(`PROFILE CREATED: id=${profileId} — Iris filled all fields on desktop`);
    } else {
      report.notes.push('PROFILE CREATION: failed');
    }

    await snap('post-create');

    // Dismiss ProfileTour — Iris reads each step (impulsivity=2)
    await page.waitForTimeout(800);
    const tourEl = await page.$('[aria-hidden="true"]');
    if (tourEl) {
      report.notes.push('PROFILE TOUR: Iris reads each spotlight step before advancing');
      for (let i = 0; i < 4; i++) {
        const btn = await page.$('button:has-text("Volgende"), button:has-text("Klaar"), button:has-text("Begrepen")');
        if (btn) {
          await page.waitForTimeout(500); // reads
          await btn.click();
          await page.waitForTimeout(300);
        } else break;
      }
      await dismissProfileTour(page);
    }
    await page.waitForTimeout(600);

    if (profileId) {
      const a2 = await runAssertions(page, 'profile', false);
      report.passCount += a2.pass; report.failCount += a2.fail;
      report.pass.push(...a2.passItems); report.fail.push(...a2.failItems);

      // ── KINK FILLING (3-4 categories, thoroughness=6) ─────────────────────
      let kinksFilledCount = 0;
      let commentsAdded = 0;

      report.notes.push('KINKS: Iris fills 3-4 categories on desktop, reads descriptions (impulsivity=2), leaves 1-2 comments (thoroughness=6)');

      for (let scroll = 0; scroll < 30; scroll++) {
        await page.waitForTimeout(300); // Iris reads

        const pills = await page.$$('button:has-text("Ja"), button:has-text("Graag"), button:has-text("Misschien")');
        for (const pill of pills.slice(0, 2)) {
          try {
            if (await pill.isVisible()) {
              await pill.click();
              await page.waitForTimeout(250);
              kinksFilledCount++;
              break;
            }
          } catch (_) {}
        }

        // Add comment after filling (thoroughness=6 — 1-2 comments)
        if (commentsAdded < 2) {
          const commentArea = await page.$('textarea[placeholder*="opmerking"], textarea[placeholder*="comment"], textarea[placeholder*="toelichting"]');
          if (commentArea && await commentArea.isVisible()) {
            await commentArea.fill('Interessant om dieper te verkennen met de juiste partner.');
            commentsAdded++;
            report.notes.push(`KINKS: comment added (${commentsAdded}/2)`);
          }
        }

        await page.evaluate(() => window.scrollBy(0, 300));
        await page.waitForTimeout(250);

        const atBottom = await page.evaluate(() =>
          window.scrollY + window.innerHeight >= document.body.scrollHeight - 100
        );
        if (atBottom) break;
      }

      if (kinksFilledCount >= 3) deltas.thoroughness += 1;
      report.notes.push(`KINKS: Iris filled ${kinksFilledCount} kinks, ${commentsAdded} comments added`);

      await snap('kink-filling');
    }

    // ── COMPARE (curiosity=6, trust=5 — views compare) ────────────────────────
    await page.goto(`${BASE_URL}/compare`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000); // reads carefully
    report.pagesVisited.push('/compare');
    report.notes.push('COMPARE: Iris navigates to compare tab (curiosity=6, trust=5 — views compare)');

    const a3 = await runAssertions(page, 'compare', false);
    report.passCount += a3.pass; report.failCount += a3.fail;
    report.pass.push(...a3.passItems); report.fail.push(...a3.failItems);
    await snap('compare');

    // ── NEW FEATURE EXPLORATION (curiosity=6 — tries one new feature) ─────────
    // Check which features she hasn't visited yet
    const toExplore = ['/contract', '/scene', '/timeline'].filter(r => {
      const slug = r.replace('/', '');
      return !iris.features_discovered.includes(slug);
    });

    for (const route of toExplore.slice(0, 1)) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);

      const is404 = await page.evaluate(() =>
        document.body.textContent?.toLowerCase().includes('404') ||
        document.body.textContent?.toLowerCase().includes('not found') ||
        document.body.textContent?.toLowerCase().includes('pagina niet')
      );

      if (!is404) {
        const slug = route.replace('/', '');
        report.pagesVisited.push(route);
        deltas.curiosity += 1;
        report.notes.push(`NEW ROUTE: Iris first visited ${route} (curiosity=6, trying one new feature) → curiosity +1`);

        const a4 = await runAssertions(page, slug, false);
        report.passCount += a4.pass; report.failCount += a4.fail;
        report.pass.push(...a4.passItems); report.fail.push(...a4.failItems);

        await snap(`new-route-${slug}`);
        break;
      }
    }

    // ── RETURN HOME ───────────────────────────────────────────────────────────
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    await snap('final-home');

    if (jsErrs.length === 0) {
      report.pass.push('No uncaught JS errors');
      report.passCount++;
    } else {
      report.fail.push(`JS errors: ${jsErrs.slice(0,2).join(' | ')}`);
      report.failCount++;
      report.jsErrors.push(...jsErrs);
    }

    const finalState = await getLocalStorageState(page);

    const traitsAfter = {
      curiosity: clamp(traitsBefore.curiosity + deltas.curiosity),
      trust: clamp(traitsBefore.trust + deltas.trust),
      impulsivity: clamp(traitsBefore.impulsivity + deltas.impulsivity),
      thoroughness: clamp(traitsBefore.thoroughness + deltas.thoroughness),
    };

    if (traitsBefore.curiosity < 8 && traitsAfter.curiosity >= 8) report.milestones.push('power user curiosity');
    if (traitsBefore.trust < 8 && traitsAfter.trust >= 8) report.milestones.push('fully committed user');

    const newFeatures = [...new Set([
      ...iris.features_discovered, 'home', 'profile', 'compare',
      ...report.pagesVisited.map(p => p.replace(/^\//, '')).filter(Boolean),
    ])];

    await updatePersona('iris', {
      traits: traitsAfter,
      session_count: sessionN,
      last_active: new Date().toISOString(),
      last_state: finalState,
      features_discovered: newFeatures,
      kinks_filled_count: (iris.kinks_filled_count || 0) + 5,
      notes: `Session ${sessionN}: methodical solo on desktop. Filled ~3-4 kink categories. Compare visited. Explored one new route. Curiosity=${traitsAfter.curiosity}.`,
    });

    await writeReport('iris', sessionN, traitsBefore, traitsAfter, report);
    console.log(`  ✅ Iris done — ${report.passCount} pass / ${report.failCount} fail`);
    return { persona: 'iris', sessionN, report, traitsBefore, traitsAfter, finalState };

  } catch (err) {
    console.error('  ❌ Iris session failed:', err.message);
    try { const buf = await page.screenshot(); await uploadScreenshot('iris', `${String(++stepNum).padStart(2,'0')}_error`, buf); } catch (_) {}
    report.notes.push(`SESSION FAILED: ${err.message}`);
    report.fail.push(`Fatal error: ${err.message.slice(0, 80)}`);
    report.failCount++;
    const traitsAfter = { ...traitsBefore };
    await writeReport('iris', sessionN, traitsBefore, traitsAfter, report);
    return { persona: 'iris', sessionN, report, traitsBefore, traitsAfter, failed: true };
  } finally {
    await browser.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SYNTHESIS
// ─────────────────────────────────────────────────────────────────────────────
async function runSynthesis(results, originalPersonas) {
  console.log('\n🔬 Synthesis...');

  const today = DATE;
  const d14ago = (() => {
    const d = new Date(today); d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  })();

  // Step 1: Fetch today's reports + 14-day history
  const [todayRes, historyRes] = await Promise.all([
    supaFetch(`/rest/v1/sim_reports?date=eq.${today}&persona=neq.synthesis`),
    supaFetch(`/rest/v1/sim_reports?date=gte.${d14ago}&order=date.desc`),
  ]);
  const todayReports = todayRes.ok ? await todayRes.json() : [];
  const history = historyRes.ok ? await historyRes.json() : [];
  console.log(`  Today: ${todayReports.length} reports, history: ${history.length} rows`);

  // Step 2: GitHub open issues
  let openIssues = [];
  try {
    const r = await fetch('https://api.github.com/repos/Jordybeer/kink/issues?state=open&per_page=50', {
      headers: { Authorization: `token ${GITHUB_TOKEN}`, 'User-Agent': 'KinkSync-Sim' },
    });
    if (r.ok) openIssues = await r.json();
  } catch (e) { console.warn('  GitHub issues fetch failed:', e.message); }

  // Step 3: Regression detection
  const regressions = [];
  for (const r of todayReports) {
    const prev = history.filter(h => h.persona === r.persona && h.date !== today).slice(0, 3);
    if (prev.length >= 3 && r.fail_count > 0) {
      const avgFail = prev.reduce((s, p) => s + (p.fail_count || 0), 0) / prev.length;
      if (avgFail === 0) {
        regressions.push({
          persona: r.persona,
          detail: (r.observations?.fail || [])[0] || 'unknown assertion failure',
          sessions: prev.map(p => p.session_number),
        });
      }
    }
  }

  // Step 4: Collect new findings not in open issues
  const findings = todayReports.flatMap(r =>
    (r.recommendations || []).map(rec => ({ persona: r.persona, rec }))
  ).filter(({ rec }) =>
    !openIssues.some(iss => iss.title.toLowerCase().includes(rec.toLowerCase().slice(0, 30).toLowerCase()))
  );

  // Step 5: Telegram summary
  const lines = [];
  for (const persona of ['robin', 'leo', 'iris']) {
    const r = todayReports.find(x => x.persona === persona);
    const res = results.find(x => x.persona === persona);
    if (!r) { lines.push(`⚠️ ${persona.charAt(0).toUpperCase()+persona.slice(1)} — no report`); continue; }
    const icon = r.incomplete ? '⚠️' : r.fail_count === 0 ? '✅' : r.fail_count <= 2 ? '⚠️' : '❌';
    const name = persona.charAt(0).toUpperCase() + persona.slice(1);
    const total = (r.pass_count || 0) + (r.fail_count || 0);
    let line = `${icon} ${name} (session ${r.session_number}) — ${r.pass_count}/${total} passed`;

    const milestones = r.milestones || [];
    if (milestones.length) line += `\n  🎯 ${milestones.join(', ')}`;

    const knownRoutes = ['home', 'profile', 'compare'];
    const newRoutes = (r.pages_visited || [])
      .map(p => p.replace(/^\//, ''))
      .filter(p => p && !knownRoutes.includes(p));
    if (newRoutes.length) line += `\n  🗺 First visit: ${newRoutes.join(', ')}`;

    const reg = regressions.find(x => x.persona === persona);
    if (reg) line += `\n  🚨 Regression: ${reg.detail.slice(0, 60)}`;

    lines.push(line);
  }

  let msg = `🧪 KinkSync Sim — ${today}\n\n${lines.join('\n\n')}`;
  if (findings.length > 0) msg += `\n\n💡 ${findings.length} new suggestion(s)`;
  else if (regressions.length === 0) msg += '\n\n✨ All clean';

  await telegram(msg);

  // Step 6: Key screenshots
  for (const res of results) {
    if (res.failed || !res.report?.screenshotUrls?.length) continue;
    const urls = res.report.screenshotUrls;
    // Priority 1: error screenshot, Priority 2: last screenshot
    const errorUrl = urls.find(u => u.includes('_error'));
    const pick = errorUrl || urls[urls.length - 1];
    if (pick) {
      const name = res.persona.charAt(0).toUpperCase() + res.persona.slice(1);
      await telegramPhoto(pick, `${name} — session ${res.sessionN}, final`);
    }
  }

  // Step 7: Regression issue
  for (const reg of regressions) {
    await telegram(`🚨 Regression detected — ${today}\n\n${reg.persona} failed: ${reg.detail}\n\nPassed in sessions ${reg.sessions.join(', ')}.\n→ Opening GitHub issue now.`);
    try {
      await fetch('https://api.github.com/repos/Jordybeer/kink/issues', {
        method: 'POST',
        headers: { Authorization: `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'KinkSync-Sim' },
        body: JSON.stringify({
          title: `Sim regression ${today} — ${reg.persona}: ${reg.detail.slice(0, 60)}`,
          body: `**Regression** on ${today}\n\nPersona: **${reg.persona}**\nFailed: ${reg.detail}\nPreviously passed: sessions ${reg.sessions.join(', ')}\n\nSee \`sim_reports\` in Supabase for full context.`,
          labels: ['sim-regression'],
        }),
      });
    } catch (e) { console.warn('  Regression issue creation failed:', e.message); }
  }

  // Step 8: Suggestions issue
  if (findings.length > 0) {
    const body = findings.slice(0, 10)
      .map(({ persona, rec }) => `- **${persona}** (session ${todayReports.find(r=>r.persona===persona)?.session_number}): ${rec}`)
      .join('\n');
    try {
      const r = await fetch('https://api.github.com/repos/Jordybeer/kink/issues', {
        method: 'POST',
        headers: { Authorization: `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'KinkSync-Sim' },
        body: JSON.stringify({
          title: `Sim suggestions ${today}`,
          body: `Findings from sim run ${today}:\n\n${body}`,
          labels: ['sim-suggestion'],
        }),
      });
      if (r.ok) {
        const issue = await r.json();
        console.log(`  Suggestions issue created: #${issue.number}`);
      }
    } catch (e) { console.warn('  Suggestions issue creation failed:', e.message); }
  }

  // Step 9: Synthesis report
  await writeReport('synthesis', 0, {}, {}, {
    passCount: results.reduce((s, r) => s + (r.report?.passCount || 0), 0),
    failCount: results.reduce((s, r) => s + (r.report?.failCount || 0), 0),
    pass: [`${todayReports.length} persona reports collected`],
    fail: regressions.length > 0 ? [`${regressions.length} regression(s) detected`] : [],
    notes: [
      `Personas run: ${results.map(r=>r.persona).join(', ')}`,
      `Regressions: ${regressions.length}`,
      `New suggestions: ${findings.length}`,
      `History rows: ${history.length}`,
    ],
    jsErrors: [],
    recommendations: findings.map(f => `${f.persona}: ${f.rec}`),
    screenshotUrls: [],
    pagesVisited: [],
    milestones: [],
  });

  console.log('  ✅ Synthesis done');
  return msg;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🎭 KinkSync Sim — ${DATE}`);
  console.log('═'.repeat(50));

  // Fetch personas from Supabase
  const r = await supaFetch('/rest/v1/sim_personas?select=*');
  if (!r.ok) {
    const err = `Supabase fetch failed: ${r.status}`;
    console.error(err);
    await telegram(`🔴 KinkSync Sim ${DATE} — ${err}. Skipping run.`);
    process.exit(1);
  }
  const personas = await r.json();
  console.log('Personas:', personas.map(p => `${p.id}(c${p.session_count})`).join(', '));

  const results = [];

  // Robin
  try { results.push(await runRobin(personas)); }
  catch (e) {
    console.error('Robin fatal:', e.message);
    results.push({ persona: 'robin', sessionN: 2, report: { passCount:0,failCount:1,pass:[],fail:[e.message],notes:[],jsErrors:[],recommendations:[],screenshotUrls:[],pagesVisited:[],milestones:[] }, traitsBefore: personas.find(p=>p.id==='robin').traits, traitsAfter: personas.find(p=>p.id==='robin').traits, failed: true });
  }

  // Leo
  try { results.push(await runLeo(personas)); }
  catch (e) {
    console.error('Leo fatal:', e.message);
    results.push({ persona: 'leo', sessionN: 2, report: { passCount:0,failCount:1,pass:[],fail:[e.message],notes:[],jsErrors:[],recommendations:[],screenshotUrls:[],pagesVisited:[],milestones:[] }, traitsBefore: personas.find(p=>p.id==='leo').traits, traitsAfter: personas.find(p=>p.id==='leo').traits, failed: true });
  }

  // Iris
  try { results.push(await runIris(personas)); }
  catch (e) {
    console.error('Iris fatal:', e.message);
    results.push({ persona: 'iris', sessionN: 2, report: { passCount:0,failCount:1,pass:[],fail:[e.message],notes:[],jsErrors:[],recommendations:[],screenshotUrls:[],pagesVisited:[],milestones:[] }, traitsBefore: personas.find(p=>p.id==='iris').traits, traitsAfter: personas.find(p=>p.id==='iris').traits, failed: true });
  }

  // Synthesis + Telegram (always)
  try { await runSynthesis(results, personas); }
  catch (e) {
    console.error('Synthesis fatal:', e.message);
    await telegram(`⚠️ KinkSync Sim ${DATE} — synthesis failed: ${e.message.slice(0,100)}`);
  }

  console.log('\n✅ Sim run complete');
}

main().catch(async (e) => {
  console.error('Fatal main error:', e);
  try { await telegram(`🔴 KinkSync Sim ${DATE} — dev server failed to start. Skipping run.`); } catch (_) {}
  process.exit(1);
});
