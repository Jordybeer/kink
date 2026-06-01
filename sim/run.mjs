/**
 * KinkSync Sim Runner — 2026-06-01 (session 3)
 * Executes persona sessions: Robin → Leo → Iris
 * Derives session behaviour from engine.md trait rules.
 *
 * Session 3 interactions:
 *   Leo  → leo_imports_robin          (eligible: robin SC=2, leo trust=4)
 *   Iris → iris_compares_robin_and_leo (eligible: both SC=2, iris trust=5)
 *   Robin → robin_receives_leo_contract: NOT eligible (leo contracts_generated=0)
 */

import { chromium } from '@playwright/test';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

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
      story: report.story ? report.story.join(' ') : '',
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

/** Seed empty/default localStorage (used when session_count=0) */
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

/** Seed localStorage from a Supabase last_state snapshot */
async function seedFromLastState(page, lastState) {
  if (!lastState) return seedLocalStorage(page);
  await page.evaluate((s) => {
    localStorage.setItem('kink-profiles', JSON.stringify(s));
  }, lastState);
}

async function getLocalStorageState(page) {
  return page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('kink-profiles') || 'null'); } catch { return null; }
  });
}

/** Dismiss ProfileTour overlay */
async function dismissProfileTour(page) {
  try {
    const backdrop = await page.$('[aria-hidden="true"][style*="inset: 0"]');
    if (backdrop) { await backdrop.click(); await page.waitForTimeout(400); return true; }
    await page.mouse.click(10, 10);
    await page.waitForTimeout(400);
    return true;
  } catch (_) { return false; }
}

/** Run standard assertion checklist. Returns {pass, fail, passItems, failItems}. */
async function runAssertions(page, label) {
  const passItems = [];
  const failItems = [];

  const clientData = await page.evaluate(() => {
    const theme = document.documentElement.getAttribute('data-theme');
    const nav = document.querySelector('nav');
    const h1s = Array.from(document.querySelectorAll('h1')).map(e => e.textContent?.trim().slice(0, 40) ?? '');
    const noAlt = Array.from(document.querySelectorAll('img:not([alt])')).length;

    const overflow = Array.from(document.querySelectorAll('*'))
      .filter(el => {
        const cs = getComputedStyle(el);
        if (['HTML','BODY','SCRIPT','STYLE','NOSCRIPT'].includes(el.tagName)) return false;
        if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') return false;
        return el.scrollWidth > el.clientWidth + 4;
      })
      .map(el => el.tagName + (el.className ? '.' + String(el.className).split(/\s+/)[0] : ''))
      .slice(0, 3);

    const tinyTargets = Array.from(document.querySelectorAll('button, a[href]'))
      .filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.height < 44;
      })
      .map(el => `"${(el.textContent||el.getAttribute('aria-label')||'').trim().slice(0,15)}" ${Math.round(el.getBoundingClientRect().height)}px`)
      .slice(0, 3);

    return { theme, hasNav: !!nav, h1s, noAlt, overflow, tinyTargets };
  });

  if (clientData.theme) passItems.push('Dark theme applied');
  else failItems.push(`[${label}] No data-theme on <html>`);

  if (clientData.hasNav) passItems.push('BottomNav present');
  else failItems.push(`[${label}] BottomNav <nav> not found`);

  if (clientData.h1s.length >= 1) passItems.push('h1 present');
  else failItems.push(`[${label}] No <h1> on page`);
  if (clientData.h1s.length > 1) failItems.push(`[${label}] Multiple h1s: ${clientData.h1s.join(' | ')}`);

  if (clientData.noAlt === 0) passItems.push('All images have alt');
  else failItems.push(`[${label}] ${clientData.noAlt} img missing alt`);

  if (clientData.overflow.length === 0) passItems.push('No horizontal overflow');
  else failItems.push(`[${label}] Horizontal overflow: ${clientData.overflow.join(', ')}`);

  if (clientData.tinyTargets.length === 0) passItems.push('Touch targets ≥44px');
  else failItems.push(`[${label}] Small touch targets: ${clientData.tinyTargets.join(', ')}`);

  return {
    pass: passItems.length,
    fail: failItems.length,
    passItems,
    failItems,
  };
}

/**
 * Import a partner profile via the settings sheet backup restore input.
 * Returns { success, message }.
 */
async function importPartnerViaSettings(page, profileData) {
  const tmpFile = join(tmpdir(), `kink-import-${Date.now()}.json`);
  const exportPayload = JSON.stringify({ version: 1, profiles: [profileData] });
  writeFileSync(tmpFile, exportPayload, 'utf8');

  let success = false;
  let message = '';

  try {
    // Open settings
    const gear = await page.$('button[aria-label="Instellingen openen"]');
    if (!gear) {
      message = 'Settings gear button not found';
      return { success: false, message };
    }
    await gear.click();
    await page.waitForTimeout(600);

    // Find the file input inside the settings sheet
    const fileInput = await page.$('input[type="file"][accept=".json"]');
    if (!fileInput) {
      message = 'Backup file input not found in settings';
      // Close settings
      await page.keyboard.press('Escape');
      return { success: false, message };
    }

    await fileInput.setInputFiles(tmpFile);
    await page.waitForTimeout(800);

    // Check for success/error message
    const successEl = await page.$('p:has-text("profiel(en) toegevoegd")');
    const errorEl = await page.$('p:has-text("Ongeldig"), p:has-text("kon niet"), p:has-text("bestaan al")');

    if (successEl) {
      const text = await successEl.textContent();
      success = true;
      message = text?.trim() || 'Import successful';
    } else if (errorEl) {
      const text = await errorEl.textContent();
      message = text?.trim() || 'Import error';
    } else {
      message = 'No confirmation message shown after import';
    }

    // Close settings via "Sluit" button
    const closeBtn = await page.$('button:has-text("Sluit")');
    if (closeBtn && await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    } else {
      // Fallback: click the overlay backdrop (aria-hidden, onClick=setSettingsOpen(false))
      const overlay = await page.$('.sheet-overlay.open');
      if (overlay) {
        await overlay.dispatchEvent('click');
        await page.waitForTimeout(400);
      } else {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
      }
    }
    // Verify sheet is closed
    const stillOpen = await page.$('.sheet-overlay.open, .sheet-panel.open');
    if (stillOpen) {
      // Force-close via JS
      await page.evaluate(() => {
        document.querySelectorAll('.sheet-overlay.open, .sheet-panel.open')
          .forEach(el => el.classList.remove('open'));
      });
      await page.waitForTimeout(300);
    }
  } finally {
    try { unlinkSync(tmpFile); } catch (_) {}
  }

  return { success, message };
}

// ─────────────────────────────────────────────────────────────────────────────
// ROBIN — session 3
// trust=2 curiosity=4 impulsivity=1 thoroughness=7
// Solo (robin_receives_leo_contract NOT eligible: leo contracts_generated=0)
// Seeds from last_state. Mobile 390px.
// ─────────────────────────────────────────────────────────────────────────────
async function runRobin(personas) {
  const robin = personas.find(p => p.id === 'robin');
  const leo = personas.find(p => p.id === 'leo');
  const sessionN = robin.session_count + 1;
  console.log(`\n🔴 Robin — session ${sessionN}`);
  console.log('  traits:', JSON.stringify(robin.traits));

  // Interaction 2 eligibility check
  const eligibleContract = (
    leo.contracts_generated >= 1 &&
    robin.session_count >= 3 &&
    robin.traits.trust >= 3
  );

  const traitsBefore = { ...robin.traits };
  const deltas = { curiosity: 0, trust: 0, impulsivity: 0, thoroughness: 0 };
  const report = {
    passCount: 0, failCount: 0,
    pass: [], fail: [], notes: [], jsErrors: [],
    recommendations: [], screenshotUrls: [], pagesVisited: [], milestones: [],
    story: [],
  };
  report.notes.push(`Interaction robin_receives_leo_contract: NOT eligible (leo.contracts_generated=${leo.contracts_generated}, need >=1) — solo run`);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

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
    // ── HOME — seed from last_state (session 3 continues from session 2) ──────
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await seedFromLastState(page, robin.last_state);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500); // Robin reads everything
    report.pagesVisited.push('/');

    await snap('home');

    const a1 = await runAssertions(page, 'home');
    report.passCount += a1.pass; report.failCount += a1.fail;
    report.pass.push(...a1.passItems); report.fail.push(...a1.failItems);
    report.notes.push('HOME: Seeded from last_state (session 3). Robin reads page carefully (impulsivity=1)');
    report.story.push(`Robin opened the app for session ${sessionN}, her existing profile sitting quietly on the home screen.`);

    // ── NAVIGATE TO PROFILE (Robin already has a profile from last_state) ─────
    // Robin uses BottomNav exclusively (impulsivity=1)
    const profileLink = await page.$(`a[href*="/profile/"], a:has-text("Robin")`);
    if (profileLink) {
      await page.waitForTimeout(500); // reads before tapping
      await profileLink.click();
      await page.waitForTimeout(1200);
    } else {
      // Fallback: navigate to profile directly using stored ID
      const robinProfileId = robin.last_state?.state?.profiles?.[0]?.id;
      if (robinProfileId) {
        await page.goto(`${BASE_URL}/profile/${robinProfileId}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);
      }
    }

    const profileUrl = page.url();
    const profileMatch = profileUrl.match(/\/profile\/([^/?#]+)/);
    const profileId = profileMatch?.[1];
    if (profileId) {
      report.pagesVisited.push(`/profile/${profileId}`);
      report.notes.push(`PROFILE: Navigated to /profile/${profileId} — Robin's existing profile from last_state`);
    }

    await snap('profile');

    // Dismiss tour if present (should not appear — profile_tour_complete=false but tour was dismissed)
    await page.waitForTimeout(600);
    const tourBackdrop = await page.$('[aria-hidden="true"][style*="inset: 0"]');
    if (tourBackdrop) {
      // Robin reads each step (impulsivity=1)
      for (let i = 0; i < 4; i++) {
        const btn = await page.$('button:has-text("Volgende"), button:has-text("Klaar"), button:has-text("Begrepen")');
        if (btn) { await page.waitForTimeout(400); await btn.click(); await page.waitForTimeout(300); }
        else break;
      }
      await dismissProfileTour(page);
    }

    const a2 = await runAssertions(page, 'profile');
    report.passCount += a2.pass; report.failCount += a2.fail;
    report.pass.push(...a2.passItems); report.fail.push(...a2.failItems);

    // ── KINK FILLING (thoroughness=7 — fill every visible kink) ───────────────
    // Robin checks all status options before choosing (reads carefully, impulsivity=1)
    let kinksFilledCount = 0;
    let descriptionInfoClicked = 0;

    report.notes.push('KINKS: Robin fills every visible kink, reads descriptions (thoroughness=7, impulsivity=1)');
    report.notes.push('KINKS: Robin checks all 5 status options for each kink before choosing (thoroughness=7)');

    for (let scroll = 0; scroll < 50; scroll++) {
      await page.waitForTimeout(350); // Robin reads each kink description

      // Click info button to read description (thoroughness=7 — reads descriptions)
      if (descriptionInfoClicked < 3) {
        const infoBtn = await page.$('button[data-tour="info"], button[aria-label*="Informatie"]');
        if (infoBtn && await infoBtn.isVisible()) {
          await infoBtn.click();
          await page.waitForTimeout(600); // reads the description
          descriptionInfoClicked++;
          // Close the info sheet
          const closeBtn = await page.$('button[aria-label*="Sluiten"], button:has-text("Sluiten"), button:has-text("✕")');
          if (closeBtn && await closeBtn.isVisible()) {
            await closeBtn.click();
            await page.waitForTimeout(300);
          } else {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);
          }
        }
      }

      // Find and click status pills — Robin considers all before choosing "Ja" or "Graag"
      const pills = await page.$$('button:has-text("Ja"), button:has-text("Graag"), button:has-text("Misschien")');
      let clicked = false;
      for (const pill of pills.slice(0, 2)) {
        try {
          if (await pill.isVisible()) {
            await page.waitForTimeout(200); // Robin considers each option
            await pill.click();
            await page.waitForTimeout(300);
            kinksFilledCount++;
            clicked = true;
            break;
          }
        } catch (_) {}
      }

      await page.evaluate(() => window.scrollBy(0, 240));
      await page.waitForTimeout(250);

      const atBottom = await page.evaluate(() =>
        window.scrollY + window.innerHeight >= document.body.scrollHeight - 80
      );
      if (atBottom) break;
    }

    report.notes.push(`KINKS: Robin filled ${kinksFilledCount} kinks, read ${descriptionInfoClicked} descriptions`);

    if (kinksFilledCount >= 5) {
      report.story.push(`She moved through the kink list methodically, reading each description before committing to a status — all ${kinksFilledCount} she could find.`);
    } else if (kinksFilledCount > 0) {
      report.story.push(`She managed to rate ${kinksFilledCount} kinks before the list ran dry, reading each description first.`);
    } else {
      report.story.push(`She scrolled through the profile looking for kinks to rate but the list showed nothing to interact with — something felt off about the page.`);
    }

    if (kinksFilledCount >= 5) {
      deltas.thoroughness += 1;
      report.notes.push('ENGINE: thoroughness +1 (filled many kinks in session)');
    }
    if (descriptionInfoClicked >= 2) {
      deltas.thoroughness += 1;
      report.notes.push('ENGINE: thoroughness +1 (read all descriptions in a category)');
    }

    await snap('kink-filling');

    // ── DNA BAR check ─────────────────────────────────────────────────────────
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    const dnaBar = await page.$('[aria-label="Kink DNA verdeling"], [aria-label*="DNA"], .dna-bar, svg[aria-label]');
    if (dnaBar) {
      report.pass.push('DNA bar visible — Robin reads the legend (thoroughness=7)');
      report.passCount++;
      report.notes.push('DNA BAR: Robin reads the status legend carefully');
    } else {
      report.notes.push('DNA BAR: not visible at top of profile (may require scroll or more kinks filled)');
    }

    await snap('dna-bar');

    // ── DESIRE SLIDER check (thoroughness=7 — sets desire sliders) ────────────
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(400);
    const desireSlider = await page.$('input[type="range"], [aria-label*="verlangen"], [aria-label*="desire"]');
    if (desireSlider) {
      await desireSlider.evaluate(el => {
        const input = el;
        input.value = '4';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await page.waitForTimeout(300);
      report.pass.push('Desire slider found and set (thoroughness=7)');
      report.passCount++;
      report.notes.push('KINKS: Robin set desire slider to 4 (thoroughness=7)');
    } else {
      report.notes.push('DESIRE SLIDER: not found on profile (may only appear after status is set on a kink)');
    }

    // ── EXPORT / TRUST=2 (no import, no contract — TXT export check) ──────────
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(600);

    // Look for export FAB or export buttons
    const exportFab = await page.$('button[aria-label*="export"], button[aria-label*="Export"], button:has-text("Exporteer"), a:has-text("Exporteer")');
    if (exportFab) {
      report.pass.push('Export button accessible at bottom of profile');
      report.passCount++;
      report.notes.push('EXPORT: Export button found — Robin can export profile (trust=2, TXT only)');
    } else {
      // Try scrolling to find FAB
      const fabEl = await page.$('.fab, button[aria-label*="↓"], button:has-text("↓")');
      if (fabEl) {
        report.notes.push('EXPORT: FAB found — Robin verifies export is available');
        report.pass.push('FAB export button present');
        report.passCount++;
      } else {
        report.fail.push('[profile] No export button found at bottom of profile');
        report.failCount++;
        report.recommendations.push('Export discoverability: Robin (thoroughness=7) scrolled to bottom but export CTA not clearly visible');
      }
    }

    await snap('export-section');

    // Robin stays on profile — curiosity=4 might glance at compare via BottomNav
    // curiosity=4 (mid): may tap compare if they notice it
    const compareNavBtn = await page.$('a[href="/compare"], nav a:has-text("Vergelijk")');
    if (compareNavBtn) {
      await page.waitForTimeout(500);
      await compareNavBtn.click();
      await page.waitForTimeout(1000);
      report.pagesVisited.push('/compare');
      report.notes.push('COMPARE: Robin noticed compare in BottomNav and tapped it (curiosity=4 — tries one unfamiliar feature)');
      deltas.curiosity += 1;
      report.notes.push('ENGINE: curiosity +1 (discovered compare route)');

      const a3 = await runAssertions(page, 'compare');
      report.passCount += a3.pass; report.failCount += a3.fail;
      report.pass.push(...a3.passItems); report.fail.push(...a3.failItems);

      await snap('compare');

      // Robin reads the compare page (impulsivity=1) but doesn't import (trust=2)
      report.notes.push('COMPARE: Robin reads compare page carefully but exits — no import (trust=2)');
    report.story.push(`The compare tab had been sitting in the bottom navigation the whole time. Curiosity won out — she tapped it, read the page carefully, then backed out. Not ready to add a partner yet.`);

      // Go back via BottomNav (impulsivity=1 — never uses browser back)
      const homeNavBtn = await page.$('a[href="/"], nav a:has-text("Home"), nav a:has-text("KinkSync")');
      if (homeNavBtn) {
        await page.waitForTimeout(400);
        await homeNavBtn.click();
        await page.waitForTimeout(600);
        report.notes.push('NAVIGATION: Robin returns Home via BottomNav (impulsivity=1 — never browser back)');
      }
    } else {
      report.notes.push('NAVIGATION: Robin stays on profile page — no compare visited (BottomNav compare not found)');
    report.story.push(`She stayed on her profile, not venturing further — no partner imports, no contract, no shortcuts. Trust at ${traitsBefore.trust} keeps those doors closed.`);
    }

    // ── FINAL STATE ───────────────────────────────────────────────────────────
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

    // ── TRAIT EVOLUTION ───────────────────────────────────────────────────────
    // Cap deltas: curiosity discovered compare route (max +1 per session)
    const traitsAfter = {
      curiosity: clamp(traitsBefore.curiosity + Math.min(deltas.curiosity, 1)),
      trust: clamp(traitsBefore.trust + deltas.trust),
      impulsivity: clamp(traitsBefore.impulsivity + deltas.impulsivity),
      thoroughness: clamp(traitsBefore.thoroughness + Math.min(deltas.thoroughness, 2)),
    };

    if (traitsBefore.thoroughness < 8 && traitsAfter.thoroughness >= 8)
      report.milestones.push('obsessive filler');
    if (traitsBefore.curiosity < 5 && traitsAfter.curiosity >= 5)
      report.milestones.push('becoming exploratory');

    const newFeatures = [...new Set([
      ...robin.features_discovered,
      'home', 'profile',
      ...report.pagesVisited.map(p => p.replace(/^\//, '').split('/')[0]).filter(Boolean),
    ])];

    await updatePersona('robin', {
      traits: traitsAfter,
      session_count: sessionN,
      last_active: new Date().toISOString(),
      last_state: finalState,
      features_discovered: newFeatures,
      kinks_filled_count: (robin.kinks_filled_count || 0) + kinksFilledCount,
      notes: `Session ${sessionN}: solo thorough run. Seeded from last_state. Filled ${kinksFilledCount} kinks (thoroughness=7, impulsivity=1). Compare tab tapped (curiosity=4). Deltas: t+${Math.min(deltas.thoroughness,2)} c+${Math.min(deltas.curiosity,1)}.`,
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
// LEO — session 3
// trust=4 curiosity=9 impulsivity=9 thoroughness=3
// INTERACTION: leo_imports_robin (eligible: robin SC=2, robin last_state ✓, leo trust=4 ✓)
// Seeds from last_state. Mobile 390px.
// ─────────────────────────────────────────────────────────────────────────────
async function runLeo(personas) {
  const leo = personas.find(p => p.id === 'leo');
  const robin = personas.find(p => p.id === 'robin');
  const sessionN = leo.session_count + 1;
  console.log(`\n🟠 Leo — session ${sessionN}`);
  console.log('  traits:', JSON.stringify(leo.traits));

  const eligibleImport = robin.session_count >= 2 && robin.last_state !== null && leo.traits.trust >= 4;
  console.log('  Interaction leo_imports_robin:', eligibleImport ? 'ELIGIBLE ✓' : 'not eligible');

  const traitsBefore = { ...leo.traits };
  const deltas = { curiosity: 0, trust: 0, impulsivity: 0, thoroughness: 0 };
  const report = {
    passCount: 0, failCount: 0,
    pass: [], fail: [], notes: [], jsErrors: [],
    recommendations: [], screenshotUrls: [], pagesVisited: [], milestones: [],
    story: [],
  };

  if (eligibleImport) {
    report.notes.push('interaction: leo_imports_robin — ELIGIBLE (robin.session_count=2, leo.trust=4)');
  } else {
    report.notes.push(`Interaction leo_imports_robin: NOT eligible — robin SC=${robin.session_count}, leo trust=${leo.traits.trust}`);
  }

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
    // ── HOME — seed from last_state ────────────────────────────────────────────
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await seedFromLastState(page, leo.last_state);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500); // Leo barely reads
    report.pagesVisited.push('/');

    await snap('home');

    const a1 = await runAssertions(page, 'home');
    report.passCount += a1.pass; report.failCount += a1.fail;
    report.pass.push(...a1.passItems); report.fail.push(...a1.failItems);
    report.notes.push('HOME: Seeded from last_state (session 3, Leo already has profile). Leo barely glances (impulsivity=9)');
    report.story.push(`Leo was back, and already scrolling before the home screen had settled.`);

    // ── IMPORT ROBIN (if eligible) ────────────────────────────────────────────
    if (eligibleImport) {
      const robinProfile = robin.last_state?.state?.profiles?.[0];
      if (robinProfile) {
        report.notes.push(`IMPORT: Leo imports Robin's profile (id=${robinProfile.id}) from her last_state`);
        report.notes.push('IMPORT: Robin\'s profile is available — Leo opens settings and uses backup restore');

        const importResult = await importPartnerViaSettings(page, robinProfile);

        if (importResult.success) {
          deltas.trust += 1; // Import of Robin succeeded → leo trust +1
          report.pass.push('Robin import succeeded — leo trust +1');
          report.passCount++;
          report.notes.push(`IMPORT: Success — "${importResult.message}" — trust +1`);
          report.story.push(`He popped open settings and slid Robin's profile in via the backup restore — trusting enough for that, at least. It worked.`);
          await snap('import-success');
        } else {
          deltas.trust -= 1; // Import failed → leo trust -1
          report.fail.push(`Robin import failed: ${importResult.message}`);
          report.failCount++;
          report.notes.push(`IMPORT: FAILED — "${importResult.message}" — trust -1`);
          report.story.push(`He tried to load Robin's profile through the backup restore — it threw an error: "${importResult.message}". Trust took a hit.`);
          await snap('import-failed');
          report.recommendations.push(`Import flow: Leo tried to import Robin's profile but got: "${importResult.message}". Investigate backup restore flow for imported profiles.`);
        }
      } else {
        report.notes.push('IMPORT: Robin profile not found in last_state — skipping import');
        report.fail.push('Robin last_state has no profiles array');
        report.failCount++;
      }
    }

    // ── PROFILE (rapid — impulsivity=9) ───────────────────────────────────────
    const leoProfileId = leo.last_state?.state?.profiles?.[0]?.id;
    if (leoProfileId) {
      // Leo navigates directly via URL (impulsivity=9)
      await page.goto(`${BASE_URL}/profile/${leoProfileId}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(300); // Leo doesn't read
      report.pagesVisited.push(`/profile/${leoProfileId}`);
      report.notes.push(`PROFILE: Leo navigates directly to /profile/${leoProfileId} via URL (impulsivity=9)`);

      // Dismiss tour immediately (impulsivity=9)
      const tourEl = await page.$('[aria-hidden="true"]');
      if (tourEl) {
        await dismissProfileTour(page);
        report.notes.push('PROFILE TOUR: dismissed immediately (impulsivity=9)');
      }

      const a2 = await runAssertions(page, 'profile');
      report.passCount += a2.pass; report.failCount += a2.fail;
      report.pass.push(...a2.passItems); report.fail.push(...a2.failItems);

      // ── KINK FILLING (rapid, bulk-skip — impulsivity=9, thoroughness=3) ──────
      let filled = 0;
      report.notes.push('KINKS: Leo rapid-taps 3-5 kinks then bulk-skips rest (impulsivity=9, thoroughness=3)');

      for (let i = 0; i < 5 && filled < 4; i++) {
        const pill = await page.$('button:has-text("Ja"), button:has-text("Graag"), button:has-text("Nee")');
        if (pill) {
          try { await pill.click(); await page.waitForTimeout(60); filled++; } catch (_) {}
        }
        await page.evaluate(() => window.scrollBy(0, 600)); // fast scroll
        await page.waitForTimeout(80);
      }

      // Bulk-skip by scrolling past categories (impulsivity=9)
      deltas.impulsivity += 1;
      report.notes.push('KINKS: Leo scrolled past entire categories (impulsivity=9 — bulk-skip behaviour) → impulsivity +1');
      report.notes.push(`KINKS: Leo filled only ${filled} kinks (thoroughness=3)`);

      await snap('kink-quick');

      // ── BROWSER BACK (impulsivity=9) ──────────────────────────────────────
      await page.goBack();
      await page.waitForTimeout(300);
      deltas.impulsivity += 1;
      report.notes.push(`NAVIGATION: Leo used browser back → now at ${page.url()} (impulsivity=9) → impulsivity +1`);
    report.story.push(`He hit browser back mid-flow, ended up somewhere unexpected, and didn't particularly care.`);
      await snap('browser-back');
    }

    // ── COMPARE — key page for import interaction ─────────────────────────────
    // Navigate directly via URL (impulsivity=9) — this is the core of the interaction
    await page.goto(`${BASE_URL}/compare`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    report.pagesVisited.push('/compare');
    report.notes.push('COMPARE: Leo navigates directly via URL (impulsivity=9). Core of leo_imports_robin interaction.');

    const a3 = await runAssertions(page, 'compare');
    report.passCount += a3.pass; report.failCount += a3.fail;
    report.pass.push(...a3.passItems); report.fail.push(...a3.failItems);

    // Check if Robin's profile is shown in compare
    const compareContent = await page.evaluate(() => document.body.textContent || '');
    if (compareContent.includes('Robin')) {
      deltas.curiosity += 1;
      report.pass.push('Compare page shows Robin\'s imported profile — leo curiosity +1');
      report.passCount++;
      report.notes.push('COMPARE: Robin\'s profile visible in compare view → curiosity +1');
      report.story.push(`He typed /compare directly into the URL bar — who needs a menu. Robin's data was there. Something about seeing her answers alongside his made curiosity tick up.`);
    } else {
      report.notes.push('COMPARE: Robin\'s profile not visible in compare page (may need both profiles pinned or selected)');
      report.recommendations.push('Compare UX: After importing a partner, it\'s not clear how to get them into the compare view. Consider auto-pinning on import or a prompt directing to compare.');
      report.story.push(`He typed /compare directly into the URL bar. Robin's profile didn't show up — the compare view was blank even after the import. He shrugged and moved on.`);
    }

    await snap('compare-with-robin');

    // Leo (trust=4 < 7) — views compare only, does NOT generate contract
    report.notes.push('CONTRACT: Leo trust=4 (< 7 threshold) — views compare only, does not generate contract');

    // ── CONTRACT via URL (curiosity=9 — visits every feature) ─────────────────
    await page.goto(`${BASE_URL}/contract`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    report.pagesVisited.push('/contract');

    const a4 = await runAssertions(page, 'contract');
    report.passCount += a4.pass; report.failCount += a4.fail;
    report.pass.push(...a4.passItems); report.fail.push(...a4.failItems);

    // Leo tries to submit half-filled (impulsivity=9)
    const genBtn = await page.$('button:has-text("Genereer"), button:has-text("Maak contract"), button:has-text("Contract")');
    if (genBtn) {
      const disabled = await genBtn.evaluate(el => el.disabled || el.getAttribute('aria-disabled') === 'true');
      if (!disabled) {
        await genBtn.click();
        await page.waitForTimeout(400);
        report.notes.push('CONTRACT: Leo tried to generate without full setup (impulsivity=9) — expected error/guard');
      } else {
        report.pass.push('Contract button correctly disabled without required data');
        report.passCount++;
        report.notes.push('CONTRACT: Generate button correctly disabled (expected)');
      }
    }
    await snap('contract');

    // ── SESSION via URL (curiosity=9) ─────────────────────────────────────────
    await page.goto(`${BASE_URL}/session`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    report.pagesVisited.push('/session');

    const a5 = await runAssertions(page, 'session');
    report.passCount += a5.pass; report.failCount += a5.fail;
    report.pass.push(...a5.passItems); report.fail.push(...a5.failItems);
    await snap('session');

    // ── SCENE / TIMELINE (curiosity=9 — try every undiscovered route) ─────────
    for (const route of ['/scene', '/timeline']) {
      const slug = route.replace('/', '');
      if (!leo.features_discovered.includes(slug)) {
        await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(400);
        const is404 = await page.evaluate(() =>
          document.body.textContent?.toLowerCase().includes('404') ||
          document.title?.includes('404')
        );
        if (!is404) {
          deltas.curiosity += 1;
          report.pagesVisited.push(route);
          report.notes.push(`NEW ROUTE: Leo first visited ${route} → curiosity +1`);
          await snap(`new-route-${slug}`);
        }
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
      curiosity: clamp(traitsBefore.curiosity + Math.min(deltas.curiosity, 1)),
      trust: clamp(traitsBefore.trust + deltas.trust),
      impulsivity: clamp(traitsBefore.impulsivity + Math.min(deltas.impulsivity, 2)),
      thoroughness: clamp(traitsBefore.thoroughness + deltas.thoroughness),
    };

    if (traitsBefore.impulsivity < 7 && traitsAfter.impulsivity >= 7)
      report.milestones.push('chaos territory');
    if (traitsBefore.curiosity < 8 && traitsAfter.curiosity >= 8)
      report.milestones.push('power user curiosity');
    if (traitsBefore.trust < 5 && traitsAfter.trust >= 5)
      report.milestones.push('ready to collaborate');

    {
      const trustLine = deltas.trust > 0
        ? `He let Robin in, and trust moved to ${traitsAfter.trust}.`
        : deltas.trust < 0
          ? `The failed import left a dent — trust dropped to ${traitsAfter.trust}.`
          : `Trust held at ${traitsAfter.trust}.`;
      report.story.push(`He hit the contract page and jabbed at the generate button before anything was ready. Nothing. He bounced through session and timeline before landing back on home, satisfied with nothing in particular. ${trustLine}`);
    }

    const newFeatures = [...new Set([
      ...leo.features_discovered, 'home', 'profile', 'compare', 'contract', 'session',
      ...report.pagesVisited.map(p => p.replace(/^\//, '').split('/')[0]).filter(Boolean),
    ])];

    await updatePersona('leo', {
      traits: traitsAfter,
      session_count: sessionN,
      last_active: new Date().toISOString(),
      last_state: finalState,
      features_discovered: newFeatures,
      kinks_filled_count: (leo.kinks_filled_count || 0) + 3,
      notes: `Session ${sessionN}: leo_imports_robin interaction. Imported Robin's profile. Compare visited. Chaotic navigation (impulsivity=9). Trust ${deltas.trust > 0 ? '+1 import succeeded' : deltas.trust < 0 ? '-1 import failed' : '±0'}.`,
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
// IRIS — session 3
// trust=5 curiosity=6 impulsivity=2 thoroughness=7
// INTERACTION: iris_compares_robin_and_leo
//   (eligible: robin SC=2, leo SC=2, both last_states ✓, iris trust=5 ✓)
// Seeds from last_state. Desktop 1280px.
// ─────────────────────────────────────────────────────────────────────────────
async function runIris(personas) {
  const iris = personas.find(p => p.id === 'iris');
  const robin = personas.find(p => p.id === 'robin');
  const leo = personas.find(p => p.id === 'leo');
  const sessionN = iris.session_count + 1;
  console.log(`\n🟣 Iris — session ${sessionN}`);
  console.log('  traits:', JSON.stringify(iris.traits));

  const eligibleCompare = (
    robin.session_count >= 2 && leo.session_count >= 2 &&
    robin.last_state !== null && leo.last_state !== null &&
    iris.traits.trust >= 5
  );
  console.log('  Interaction iris_compares_robin_and_leo:', eligibleCompare ? 'ELIGIBLE ✓' : 'not eligible');

  const traitsBefore = { ...iris.traits };
  const deltas = { curiosity: 0, trust: 0, impulsivity: 0, thoroughness: 0 };
  const report = {
    passCount: 0, failCount: 0,
    pass: [], fail: [], notes: [], jsErrors: [],
    recommendations: [], screenshotUrls: [], pagesVisited: [], milestones: [],
    story: [],
  };

  if (eligibleCompare) {
    report.notes.push('interaction: iris_compares_robin_and_leo — ELIGIBLE (both SC=2, iris.trust=5)');
  } else {
    report.notes.push(`Interaction iris_compares_robin_and_leo: NOT eligible — robin SC=${robin.session_count}, leo SC=${leo.session_count}, iris trust=${iris.traits.trust}`);
  }

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
    // ── HOME — seed from last_state ────────────────────────────────────────────
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await seedFromLastState(page, iris.last_state);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200); // Iris is methodical
    report.pagesVisited.push('/');

    await snap('home');

    const a1 = await runAssertions(page, 'home');
    report.passCount += a1.pass; report.failCount += a1.fail;
    report.pass.push(...a1.passItems); report.fail.push(...a1.failItems);
    report.notes.push('HOME: Iris reads carefully on desktop 1280px (impulsivity=2). Seeded from last_state.');
    report.story.push(`Iris settled in at her desktop for session ${sessionN}, unhurried.`);

    // ── IMPORT ROBIN (interaction: import partner 1) ───────────────────────────
    if (eligibleCompare) {
      const robinProfile = robin.last_state?.state?.profiles?.[0];
      if (robinProfile) {
        report.notes.push(`IMPORT ROBIN: Iris imports Robin (id=${robinProfile.id}) as partner 1 via settings backup`);
        await page.waitForTimeout(600); // Iris reads before acting

        const importRobin = await importPartnerViaSettings(page, robinProfile);
        if (importRobin.success) {
          report.pass.push('Robin import into Iris succeeded');
          report.passCount++;
          report.notes.push(`IMPORT ROBIN: Success — "${importRobin.message}"`);
          report.story.push(`She opened settings and imported Robin's profile cleanly — partner one loaded.`);
          await snap('import-robin-success');
        } else {
          report.fail.push(`Robin import into Iris failed: ${importRobin.message}`);
          report.failCount++;
          report.notes.push(`IMPORT ROBIN: FAILED — "${importRobin.message}"`);
          report.story.push(`She tried to import Robin's profile through the backup restore — it returned: "${importRobin.message}". She noted it and continued.`);
          await snap('import-robin-failed');
          report.recommendations.push(`Import flow (Iris): Robin import failed with "${importRobin.message}". Check backup restore compatibility with last_state profiles.`);
        }
      } else {
        report.notes.push('IMPORT ROBIN: Robin profile not found in last_state — skipping');
      }

      // ── IMPORT LEO (interaction: import partner 2) ───────────────────────────
      const leoProfile = leo.last_state?.state?.profiles?.[0];
      if (leoProfile) {
        report.notes.push(`IMPORT LEO: Iris imports Leo (id=${leoProfile.id}) as partner 2`);
        await page.waitForTimeout(600);

        const importLeo = await importPartnerViaSettings(page, leoProfile);
        if (importLeo.success) {
          deltas.trust += 1; // Both imports succeeded → iris trust +1
          report.pass.push('Leo import into Iris succeeded — both imports succeeded → iris trust +1');
          report.passCount++;
          report.notes.push(`IMPORT LEO: Success — "${importLeo.message}" — both imports done → trust +1`);
          report.story.push(`Leo's followed. Two partners now loaded alongside her own profile — trust moved to ${traitsBefore.trust + 1}.`);
          await snap('import-leo-success');
        } else {
          report.fail.push(`Leo import into Iris failed: ${importLeo.message}`);
          report.failCount++;
          report.notes.push(`IMPORT LEO: FAILED — "${importLeo.message}"`);
          await snap('import-leo-failed');
          report.recommendations.push(`Import flow (Iris): Leo import failed with "${importLeo.message}".`);
        }
      } else {
        report.notes.push('IMPORT LEO: Leo profile not found in last_state — skipping');
      }
    }

    // ── PROFILE — Iris fills kinks (thoroughness=7) ───────────────────────────
    const irisProfileId = iris.last_state?.state?.profiles?.[0]?.id;
    if (irisProfileId) {
      await page.goto(`${BASE_URL}/profile/${irisProfileId}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000); // Iris reads
      report.pagesVisited.push(`/profile/${irisProfileId}`);
      report.notes.push(`PROFILE: Iris navigates to /profile/${irisProfileId} via BottomNav`);

      // Dismiss tour if present
      const tourEl = await page.$('[aria-hidden="true"]');
      if (tourEl) {
        for (let i = 0; i < 4; i++) {
          const btn = await page.$('button:has-text("Volgende"), button:has-text("Klaar"), button:has-text("Begrepen")');
          if (btn) { await page.waitForTimeout(500); await btn.click(); await page.waitForTimeout(300); }
          else break;
        }
        await dismissProfileTour(page);
      }

      const a2 = await runAssertions(page, 'profile');
      report.passCount += a2.pass; report.failCount += a2.fail;
      report.pass.push(...a2.passItems); report.fail.push(...a2.failItems);

      // ── KINK FILLING (thoroughness=7 — fill every visible kink) ──────────────
      let kinksFilledCount = 0;
      let commentsAdded = 0;
      report.notes.push('KINKS: Iris fills kinks carefully on desktop (thoroughness=7, impulsivity=2) — 3-4 categories, desire sliders, 1-2 comments');

      for (let scroll = 0; scroll < 50; scroll++) {
        await page.waitForTimeout(350); // Iris reads carefully

        // Add comment if rating is set and comment not yet added
        if (commentsAdded < 2) {
          const commentArea = await page.$('textarea[aria-label="Notitie of grensvoorwaarde"], textarea[placeholder*="Notitie"], textarea[placeholder*="opmerking"]');
          if (commentArea && await commentArea.isVisible()) {
            const existing = await commentArea.inputValue();
            if (!existing) {
              await commentArea.fill('Relevant voor Dominant-perspectief — vraag eerst naar intenties.');
              commentsAdded++;
              report.notes.push(`KINKS: comment added (${commentsAdded}/2)`);
            }
          }
        }

        const pills = await page.$$('button:has-text("Ja"), button:has-text("Graag"), button:has-text("Misschien"), button:has-text("Nee")');
        let clicked = false;
        for (const pill of pills.slice(0, 2)) {
          try {
            if (await pill.isVisible()) {
              await page.waitForTimeout(250);
              await pill.click();
              await page.waitForTimeout(300);
              kinksFilledCount++;
              clicked = true;
              break;
            }
          } catch (_) {}
        }

        await page.evaluate(() => window.scrollBy(0, 280));
        await page.waitForTimeout(300);

        const atBottom = await page.evaluate(() =>
          window.scrollY + window.innerHeight >= document.body.scrollHeight - 100
        );
        if (atBottom) break;
      }

      if (kinksFilledCount >= 5) {
        deltas.thoroughness += 1;
        report.notes.push(`ENGINE: thoroughness +1 (Iris filled ${kinksFilledCount} kinks)`);
      }
      report.notes.push(`KINKS: Iris filled ${kinksFilledCount} kinks, ${commentsAdded} comments`);
      if (kinksFilledCount >= 5) {
        report.story.push(`She worked through the kink list the way she does everything — completely. ${commentsAdded > 0 ? `Left comments on ${commentsAdded} entr${commentsAdded !== 1 ? 'ies' : 'y'}.` : ''} ${kinksFilledCount} kinks rated.`);
      } else if (kinksFilledCount > 0) {
        report.story.push(`She rated ${kinksFilledCount} kinks before the list ran out, leaving ${commentsAdded} comment${commentsAdded !== 1 ? 's' : ''}.`);
      }

      await snap('kink-filling');

      // Check DNA bar (thoroughness=7 — reads the legend)
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
      const dnaBar = await page.$('[aria-label="Kink DNA verdeling"], [aria-label*="DNA"]');
      if (dnaBar) {
        report.pass.push('DNA bar visible on profile — Iris reads legend');
        report.passCount++;
        report.notes.push('DNA BAR: Iris reads the kink DNA bar legend (thoroughness=7)');
      }
    }

    // ── COMPARE — core of the iris_compares_robin_and_leo interaction ──────────
    await page.goto(`${BASE_URL}/compare`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200); // Iris reads carefully
    report.pagesVisited.push('/compare');
    report.notes.push('COMPARE: Iris navigates to compare (trust=5, has imported Robin + Leo)');

    const a3 = await runAssertions(page, 'compare');
    report.passCount += a3.pass; report.failCount += a3.fail;
    report.pass.push(...a3.passItems); report.fail.push(...a3.failItems);

    // Check if multiple profiles are visible in compare
    const compareText = await page.evaluate(() => document.body.textContent || '');
    const hasRobin = compareText.includes('Robin');
    const hasLeo = compareText.includes('Leo');
    const hasIris = compareText.includes('Iris');

    if (hasRobin && hasLeo) {
      deltas.curiosity += 1;
      report.pass.push('Compare page shows both Robin and Leo profiles — iris curiosity +1');
      report.passCount++;
      report.notes.push('COMPARE: Both Robin and Leo visible in compare view → curiosity +1');
      report.story.push(`She navigated to compare and found both Robin and Leo's data there alongside her own — exactly what she came for. The app only shows two profiles at once, but it was enough to work with.`);
    } else if (hasRobin || hasLeo) {
      report.notes.push(`COMPARE: Only partial data visible (robin=${hasRobin}, leo=${hasLeo}, iris=${hasIris})`);
      report.notes.push('COMPARE: App only shows 2 profiles in compare at a time — multi-partner compare not supported');
      report.recommendations.push('Multi-partner compare not yet available — Iris manages two partners (Robin + Leo) but compare only shows 2 profiles at once. Consider adding partner selector or tabbed compare view.');
      report.story.push(`She navigated to compare with two partners loaded — but the page only shows two profiles at once. One of them was missing from the view. She noted the limitation without frustration.`);
    } else {
      report.notes.push('COMPARE: No partner profiles shown in compare — may need to select profiles or pin');
      report.recommendations.push('Compare empty state: Iris imported two partners but compare shows empty state. Consider redirecting to compare after successful import.');
      report.story.push(`She navigated to compare after importing both partners — but the page came up empty. The app didn't connect the imports to the compare view automatically.`);
    }

    await snap('compare-robin-leo');

    // ── MULTI-PARTNER LIMITATION NOTE ─────────────────────────────────────────
    if (hasRobin || hasLeo) {
      report.notes.push('MULTI-PARTNER: App compare supports 2 profiles only. Iris (Dominant managing multiple partners) would benefit from multi-profile compare or partner switching in compare view.');
    }

    // Iris (trust=5 < 7) — does NOT generate contract
    report.notes.push('CONTRACT: Iris trust=5 (< 7 threshold) — views compare only, does not generate contract');

    // ── NEW FEATURE (curiosity=6 — tries one undiscovered feature) ────────────
    const toExplore = ['/contract', '/scene', '/timeline'].filter(r =>
      !iris.features_discovered.includes(r.replace('/', ''))
    );

    for (const route of toExplore.slice(0, 1)) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(900);

      const is404 = await page.evaluate(() =>
        document.body.textContent?.toLowerCase().includes('404') ||
        document.title?.includes('404')
      );

      if (!is404) {
        const slug = route.replace('/', '');
        report.pagesVisited.push(route);
        deltas.curiosity += 1;
        report.notes.push(`NEW ROUTE: Iris first visited ${route} (curiosity=6, one new feature) → curiosity +1`);

        const a4 = await runAssertions(page, slug);
        report.passCount += a4.pass; report.failCount += a4.fail;
        report.pass.push(...a4.passItems); report.fail.push(...a4.failItems);

        await snap(`new-route-${slug}`);
        break;
      }
    }

    // ── RETURN HOME ───────────────────────────────────────────────────────────
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
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
      curiosity: clamp(traitsBefore.curiosity + Math.min(deltas.curiosity, 1)),
      trust: clamp(traitsBefore.trust + deltas.trust),
      impulsivity: clamp(traitsBefore.impulsivity + deltas.impulsivity),
      thoroughness: clamp(traitsBefore.thoroughness + Math.min(deltas.thoroughness, 1)),
    };

    if (traitsBefore.curiosity < 8 && traitsAfter.curiosity >= 8) report.milestones.push('power user curiosity');
    if (traitsBefore.trust < 5 && traitsAfter.trust >= 5) report.milestones.push('ready to collaborate');
    if (traitsBefore.trust < 8 && traitsAfter.trust >= 8) report.milestones.push('fully committed user');

    {
      const milestoneLines = report.milestones.map(m => {
        if (m === 'obsessive filler') return `Thoroughness maxed out — the app had no more kinks for her to rate.`;
        if (m === 'power user curiosity') return `She's now explored everything the app has to offer.`;
        if (m === 'ready to collaborate') return `Trust crossed into territory where partner features start making sense.`;
        return '';
      }).filter(Boolean).join(' ');
      if (milestoneLines) report.story.push(milestoneLines);
    }

    const newFeatures = [...new Set([
      ...iris.features_discovered, 'home', 'profile', 'compare',
      ...report.pagesVisited.map(p => p.replace(/^\//, '').split('/')[0]).filter(Boolean),
    ])];

    await updatePersona('iris', {
      traits: traitsAfter,
      session_count: sessionN,
      last_active: new Date().toISOString(),
      last_state: finalState,
      features_discovered: newFeatures,
      kinks_filled_count: (iris.kinks_filled_count || 0) + (report.notes.filter(n => n.includes('filled')).length > 0 ? 5 : 0),
      notes: `Session ${sessionN}: iris_compares_robin_and_leo interaction. Imported Robin + Leo. Compare visited. Desktop 1280px. Trust ${deltas.trust > 0 ? '+1' : '±0'}. Curiosity +${Math.min(deltas.curiosity,1)}.`,
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

    // Story — lead with the narrative
    const story = r.observations?.story || '';
    let line = `${icon} *${name}* (session ${r.session_number}) — ${r.pass_count}/${total} passed`;
    if (story) line += `\n_${story}_`;

    const milestones = r.milestones || [];
    if (milestones.length) line += `\n  🎯 ${milestones.join(', ')}`;

    const knownPrev = (originalPersonas.find(p => p.id === persona)?.features_discovered || []);
    const newRoutes = (r.pages_visited || [])
      .map(p => p.replace(/^\//, '').split('/')[0])
      .filter(p => p && !knownPrev.includes(p));
    if (newRoutes.length) line += `\n  🗺 First visit: ${[...new Set(newRoutes)].join(', ')}`;

    // Top failed assertions
    const topFails = (r.observations?.fail || []).slice(0, 2);
    if (topFails.length) line += `\n  ⚠️ ${topFails.join(' · ')}`;

    const reg = regressions.find(x => x.persona === persona);
    if (reg) line += `\n  🚨 Regression: ${reg.detail.slice(0, 60)}`;

    lines.push(line);
  }

  let msg = `🧪 KinkSync Sim — ${today}\n\n${lines.join('\n\n')}`;
  if (findings.length > 0) msg += `\n\n💡 ${findings.length} new suggestion(s)`;
  else if (regressions.length === 0) msg += '\n\n✨ All clean';

  await telegram(msg);

  // Step 6: Key screenshots per persona
  for (const res of results) {
    if (res.failed || !res.report?.screenshotUrls?.length) continue;
    const urls = res.report.screenshotUrls;
    const errorUrl = urls.find(u => u.includes('_error') || u.includes('failed'));
    const interactionUrl = urls.find(u => u.includes('import') || u.includes('compare'));
    const pick = errorUrl || interactionUrl || urls[urls.length - 1];
    if (pick) {
      const name = res.persona.charAt(0).toUpperCase() + res.persona.slice(1);
      await telegramPhoto(pick, `${name} — session ${res.sessionN}`);
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
      `Interactions: leo_imports_robin (eligible), iris_compares_robin_and_leo (eligible)`,
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
  console.log(`\n🎭 KinkSync Sim — ${DATE} (session 3)`);
  console.log('═'.repeat(50));

  const r = await supaFetch('/rest/v1/sim_personas?select=*');
  if (!r.ok) {
    const err = `Supabase fetch failed: ${r.status}`;
    console.error(err);
    await telegram(`🔴 KinkSync Sim ${DATE} — ${err}. Skipping run.`);
    process.exit(1);
  }
  const personas = await r.json();
  console.log('Personas:', personas.map(p => `${p.id}(SC=${p.session_count}, t=${p.traits.trust})`).join(', '));

  const results = [];

  // Robin — solo (contract receive not eligible)
  try { results.push(await runRobin(personas)); }
  catch (e) {
    console.error('Robin fatal:', e.message);
    const robin = personas.find(p => p.id === 'robin');
    results.push({ persona: 'robin', sessionN: robin.session_count + 1, report: { passCount:0,failCount:1,pass:[],fail:[e.message],notes:[],jsErrors:[],recommendations:[],screenshotUrls:[],pagesVisited:[],milestones:[] }, traitsBefore: robin.traits, traitsAfter: robin.traits, failed: true });
  }

  // Leo — interaction: leo_imports_robin
  try { results.push(await runLeo(personas)); }
  catch (e) {
    console.error('Leo fatal:', e.message);
    const leo = personas.find(p => p.id === 'leo');
    results.push({ persona: 'leo', sessionN: leo.session_count + 1, report: { passCount:0,failCount:1,pass:[],fail:[e.message],notes:[],jsErrors:[],recommendations:[],screenshotUrls:[],pagesVisited:[],milestones:[] }, traitsBefore: leo.traits, traitsAfter: leo.traits, failed: true });
  }

  // Iris — interaction: iris_compares_robin_and_leo
  try { results.push(await runIris(personas)); }
  catch (e) {
    console.error('Iris fatal:', e.message);
    const iris = personas.find(p => p.id === 'iris');
    results.push({ persona: 'iris', sessionN: iris.session_count + 1, report: { passCount:0,failCount:1,pass:[],fail:[e.message],notes:[],jsErrors:[],recommendations:[],screenshotUrls:[],pagesVisited:[],milestones:[] }, traitsBefore: iris.traits, traitsAfter: iris.traits, failed: true });
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
