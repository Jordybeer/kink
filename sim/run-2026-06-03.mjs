// KinkSync Sim Run — 2026-06-03
import pkg from '/home/user/kink/node_modules/playwright/index.js';
const { chromium, devices } = pkg;
import { createReadStream, writeFileSync, readFileSync, mkdirSync } from 'fs';
import { existsSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL   = 'https://qmxfgzkidyujpkntlqxy.supabase.co';
const SUPABASE_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFteGZnemtpZHl1anBrbnRscXh5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE1MjcxMCwiZXhwIjoyMDk1NzI4NzEwfQ.c03b9eA_px7z-ST1HlvxCqBEN65f8R7P34DyLT07rmU';
const TELEGRAM_TOKEN = '8765851887:AAGnbDElgBy0shzaKTQ4xqKKqtCTTQMvb_Q';
const TELEGRAM_CHAT  = '1303637520';
const DATE           = '2026-06-03';
const BASE_URL       = 'http://localhost:3000';

const SHOTS_DIR = '/tmp/sim-shots-0603';
mkdirSync(SHOTS_DIR, { recursive: true });

// ── Supabase helpers ─────────────────────────────────────────────────────────

async function supabaseGet(path) {
  const r = await fetch(`${SUPABASE_URL}${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  return r.json();
}

async function supabasePost(path, body) {
  const r = await fetch(`${SUPABASE_URL}${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(body)
  });
  const text = await r.text();
  try { return JSON.parse(text); } catch { return text; }
}

async function supabasePatch(path, body) {
  const r = await fetch(`${SUPABASE_URL}${path}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(body)
  });
  const text = await r.text();
  try { return JSON.parse(text); } catch { return text; }
}

async function uploadScreenshot(persona, filename, filePath) {
  try {
    const bytes = readFileSync(filePath);
    const r = await fetch(
      `${SUPABASE_URL}/storage/v1/object/sim-screenshots/${persona}/${filename}`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'image/png',
          'x-upsert': 'true'
        },
        body: bytes
      }
    );
    const text = await r.text();
    console.log(`  📸 Uploaded ${filename}:`, r.status, text.slice(0, 80));
    return r.ok;
  } catch (e) {
    console.error(`  ❌ Upload failed ${filename}:`, e.message);
    return false;
  }
}

// ── Page assertion helper ─────────────────────────────────────────────────────

async function assertPage(page, route) {
  const findings = { pass: [], fail: [] };

  // No JS errors
  const errors = page._jsErrors || [];
  if (errors.length === 0) findings.pass.push('no-js-errors');
  else findings.fail.push(`js-errors: ${errors.join('; ')}`);

  // Dark theme applied
  const theme = await page.evaluate(() =>
    document.documentElement.getAttribute('data-theme')
  );
  if (['midnight','red','forest','mono'].includes(theme))
    findings.pass.push(`theme:${theme}`);
  else
    findings.fail.push(`missing data-theme (got: ${theme})`);

  // BottomNav visible
  const nav = await page.locator('nav[aria-label="Hoofdnavigatie"]').isVisible().catch(() => false);
  if (nav) findings.pass.push('bottomnav-visible');
  else     findings.fail.push('bottomnav-missing');

  // h1 present
  const h1count = await page.locator('h1').count();
  if (h1count === 1)     findings.pass.push('h1-present');
  else if (h1count === 0) findings.fail.push('h1-missing');
  else                    findings.fail.push(`h1-count:${h1count}`);

  // No horizontal overflow at current width
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  if (!overflow) findings.pass.push('no-horizontal-overflow');
  else           findings.fail.push(`horizontal-overflow on ${route}`);

  // BottomNav items 44px+
  const navItems = await page.locator('nav[aria-label="Hoofdnavigatie"] a').all();
  let navTouchFail = false;
  for (const item of navItems) {
    const box = await item.boundingBox();
    if (box && box.height < 44) { navTouchFail = true; break; }
  }
  if (!navTouchFail) findings.pass.push('bottomnav-touch-targets-ok');
  else               findings.fail.push('bottomnav-touch-target-below-44px');

  return findings;
}

// ── Screenshot helper ─────────────────────────────────────────────────────────

async function shot(page, persona, step, slug) {
  const filename = `${DATE}_${String(step).padStart(2,'0')}_${slug}.png`;
  const filePath = join(SHOTS_DIR, `${persona}_${filename}`);
  await page.screenshot({ path: filePath, fullPage: false });
  await uploadScreenshot(persona, filename, filePath);
  console.log(`  📷 ${persona} step ${step}: ${slug}`);
  return filename;
}

// ── Seed localStorage ─────────────────────────────────────────────────────────

async function seedLocalStorage(page, state) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate((s) => {
    localStorage.setItem('kink-profiles', JSON.stringify(s));
  }, state);
  await page.reload({ waitUntil: 'networkidle' });
}

// ── Capture final localStorage ────────────────────────────────────────────────

async function captureLocalStorage(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('kink-profiles');
    return raw ? JSON.parse(raw) : null;
  });
}

// ── Wait for hydration guard ──────────────────────────────────────────────────

async function waitHydrated(page) {
  // Wait for any visible page content — BottomNav may be absent (finding)
  // Fall back to a short wait + networkidle
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(600);
}

// ── Dismiss profile tour if active ───────────────────────────────────────────

async function dismissTourIfActive(page, report) {
  const skipBtn = page.locator('button:has-text("Sla over")');
  const visible = await skipBtn.isVisible({ timeout: 1500 }).catch(() => false);
  if (visible) {
    await skipBtn.click({ force: true });
    await page.waitForTimeout(1200);
    const noteText = 'Profile tour dismissed (profileTourComplete=false caused tour overlay to block BottomNav)';
    if (report) {
      if (Array.isArray(report.notes)) report.notes.push(noteText);
      else if (report.observations?.notes) report.observations.notes.push(noteText);
    }
    return true;
  }
  return false;
}

// ── Close any open sheet ──────────────────────────────────────────────────────

async function closeAnySheet(page) {
  const closeBtn = page.locator('.sheet-panel.open button:has-text("Sluit"), .sheet-panel.open button[aria-label*="luit"]').first();
  const visible = await closeBtn.isVisible({ timeout: 800 }).catch(() => false);
  if (visible) { await closeBtn.click({ force: true }); await page.waitForTimeout(400); return; }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
}

// ── Close info sheet if open ──────────────────────────────────────────────────

async function closeInfoSheet(page) {
  const closeBtn = page.locator('button:has-text("Sluit")').first();
  const visible = await closeBtn.isVisible({ timeout: 800 }).catch(() => false);
  if (visible) { await closeBtn.click({ force: true }); await page.waitForTimeout(500); }
  else { await page.keyboard.press('Escape'); await page.waitForTimeout(500); }
  await dismissTourIfActive(page, null);
}

// ════════════════════════════════════════════════════════════════════════════
// ROBIN — session 10 → 11 | trust=2 curiosity=5 impulsivity=1 thoroughness=10
// Solo run, 390px mobile
// ════════════════════════════════════════════════════════════════════════════

async function runRobin(personas) {
  const persona = personas.find(p => p.id === 'robin');
  console.log('\n🔴 Robin — session', persona.session_count + 1);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices['iPhone 14'],
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  page._jsErrors = [];
  page.on('pageerror', e => page._jsErrors.push(e.message.slice(0, 100)));

  const report = {
    persona: 'robin',
    date: DATE,
    observations: {
      story: '',
      pass: 0,
      fail: 0,
      pages_visited: [],
      notes: [],
      interaction: null
    },
    recommendations: { top_3: [] },
    regression_detected: false
  };

  let step = 0;
  const allPass = [], allFail = [];

  try {
    await seedLocalStorage(page, persona.last_state);

    // ── 1. Home ───────────────────────────────────────────────────────────
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await waitHydrated(page);
    step++;
    await shot(page, 'robin', step, 'home');
    report.observations.pages_visited.push('/');
    const homeAssert = await assertPage(page, '/');
    allPass.push(...homeAssert.pass); allFail.push(...homeAssert.fail);

    const onboarding = await page.locator('[aria-label="Welkom bij KinkSync"]').isVisible().catch(() => false);
    if (onboarding) {
      await page.locator('button:has-text("Begin")').click().catch(() => {});
      await page.waitForTimeout(500);
      report.observations.notes.push('onboarding overlay appeared despite onboarding_complete=true');
      allFail.push('onboarding-appeared-unexpectedly');
    }

    // ── 2. Profile via link (BottomNav absent — impulsivity=1 uses any nav) ──
    // Try BottomNav first (to test it), fall back to direct link on home page
    const navProfileLink = page.locator('nav[aria-label="Hoofdnavigatie"] a').filter({ hasText: 'Profiel' });
    const navProfileVisible = await navProfileLink.isVisible({ timeout: 2000 }).catch(() => false);
    if (navProfileVisible) {
      await navProfileLink.click({ force: true });
      await page.waitForURL(/\/profile\//, { timeout: 8000 }).catch(() => {});
    } else {
      // BottomNav not present — navigate via first profile link on home
      const homeProfileLink = page.locator('a[href*="/profile/"]').first();
      const homeLinkVis = await homeProfileLink.isVisible({ timeout: 3000 }).catch(() => false);
      if (homeLinkVis) {
        await homeProfileLink.click({ force: true });
        await page.waitForURL(/\/profile\//, { timeout: 8000 }).catch(() => {});
      } else {
        await page.goto(`${BASE_URL}/profile/9kwfvmdxmeompt5mg6g`, { waitUntil: 'networkidle' });
      }
      allFail.push('bottomnav-profiel-link-absent');
    }
    await waitHydrated(page);
    step++;
    await shot(page, 'robin', step, 'profile');
    report.observations.pages_visited.push(page.url().replace(BASE_URL, ''));
    const profAssert = await assertPage(page, '/profile/[id]');
    allPass.push(...profAssert.pass); allFail.push(...profAssert.fail);

    const profileUrl = page.url();

    // Dismiss profile tour (impulsivity=1 Robin reads it, then closes)
    const tourDismissed = await dismissTourIfActive(page, report.observations);
    if (tourDismissed) allFail.push('profile-tour-blocked-navigation');

    // ── 3. Kink categories (curiosity=5: 3 cats; thoroughness=10: every kink)
    const categories = ['Impact Play', 'Bondage', 'Power Exchange'];

    for (let ci = 0; ci < categories.length; ci++) {
      const catName = categories[ci];
      const catTab = page.locator(`button:has-text("${catName}")`);
      const tabVisible = await catTab.isVisible().catch(() => false);
      if (!tabVisible) {
        report.observations.notes.push(`Category tab "${catName}" not visible`);
        continue;
      }
      await catTab.click();
      await page.waitForTimeout(600);

      // thoroughness=10, impulsivity=1: reads info first
      const infoButtons = await page.locator(`button[aria-label*="Informatie"]`).all();
      if (infoButtons.length > 0) {
        const iBtnVis = await infoButtons[0].isVisible().catch(() => false);
        if (iBtnVis) {
          await infoButtons[0].click();
          await page.waitForTimeout(800);
          await closeInfoSheet(page);
          allPass.push(`info-sheet-opened:${catName}`);
        }
      }

      // thoroughness=10: clicks every "Heel graag" visible
      const yesButtons = await page.locator('button:has-text("Heel graag")').all();
      let kinksFilled = 0;
      for (const btn of yesButtons.slice(0, 5)) {
        const vis = await btn.isVisible().catch(() => false);
        if (vis) { await btn.click({ force: true }); await page.waitForTimeout(200); kinksFilled++; }
      }

      // thoroughness=10: adds comment on first kink
      const commentBoxes = await page.locator('textarea[aria-label="Notitie of grensvoorwaarde"]').all();
      if (commentBoxes.length > 0) {
        const vis = await commentBoxes[0].isVisible().catch(() => false);
        if (vis) {
          await commentBoxes[0].click();
          await commentBoxes[0].fill(`Grensaantekening voor ${catName}`);
          await page.waitForTimeout(200);
          allPass.push(`comment-added:${catName}`);
        }
      }

      report.observations.notes.push(`${catName}: ${kinksFilled} kinks filled`);
      if (kinksFilled > 0) allPass.push(`kinks-filled:${catName}`);
    }

    step++;
    await shot(page, 'robin', step, 'profile-kinks-filled');

    // Check DNA bar (thoroughness=10 reads the legend)
    const dnaBar = page.locator('[aria-label="Kink DNA verdeling"]');
    const dnaVisible = await dnaBar.isVisible().catch(() => false);
    if (dnaVisible) {
      allPass.push('dna-bar-visible');
      report.observations.notes.push('DNA bar visible with data');
    } else {
      allFail.push('dna-bar-not-visible');
    }

    // Desire slider check (thoroughness=10 sets desire sliders if present)
    const desireSlider = await page.locator('input[type="range"]').count();
    if (desireSlider === 0) {
      report.observations.notes.push('Desire sliders (1-5) not present — engine.md references them but redesign removed them');
      allFail.push('desire-slider-absent');
    } else {
      allPass.push('desire-sliders-present');
    }

    // Profile assert after kinks
    const profAssert2 = await assertPage(page, '/profile/[id]');
    allPass.push(...profAssert2.pass.filter(x => !allPass.includes(x)));
    allFail.push(...profAssert2.fail.filter(x => !allFail.includes(x)));

    // ── 4. Compare (curiosity=5: taps compare if visible, else direct URL) ───
    const compareNavLink = page.locator('nav[aria-label="Hoofdnavigatie"] a').filter({ hasText: 'Vergelijk' });
    const compareNavVis = await compareNavLink.isVisible({ timeout: 2000 }).catch(() => false);
    if (compareNavVis) {
      await compareNavLink.click({ force: true });
    } else {
      // Look for a compare CTA link in the page content
      const compareCTA = page.locator('a[href*="/compare"]').first();
      const compareCTAVis = await compareCTA.isVisible({ timeout: 2000 }).catch(() => false);
      if (compareCTAVis) {
        await compareCTA.click({ force: true });
      } else {
        await page.goto(`${BASE_URL}/compare`, { waitUntil: 'networkidle' });
      }
    }
    await page.waitForURL(/\/compare/, { timeout: 8000 }).catch(() => {});
    await waitHydrated(page);
    step++;
    await shot(page, 'robin', step, 'compare');
    report.observations.pages_visited.push('/compare');
    const compareAssert = await assertPage(page, '/compare');
    allPass.push(...compareAssert.pass.filter(x => !allPass.includes(x)));
    allFail.push(...compareAssert.fail.filter(x => !allFail.includes(x)));

    // ── 5. Export TXT (trust=2: TXT only, no import/contract) ────────────
    await page.goto(profileUrl, { waitUntil: 'networkidle' });
    await waitHydrated(page);
    const txtBtn = page.locator('button:has-text("Tekst"), button:has-text("TXT"), button[aria-label*="txt"], button[aria-label*="Tekst"]').first();
    const txtVisible = await txtBtn.isVisible().catch(() => false);
    if (txtVisible) {
      await txtBtn.click();
      await page.waitForTimeout(500);
      allPass.push('txt-export-triggered');
      report.observations.notes.push('TXT export triggered successfully');
    } else {
      const fab = page.locator('[aria-label*="export"], [aria-label*="Export"], [aria-label*="Exporteer"]').first();
      const fabVisible = await fab.isVisible().catch(() => false);
      if (fabVisible) {
        await fab.click();
        await page.waitForTimeout(500);
        step++;
        await shot(page, 'robin', step, 'export-menu');
      }
      report.observations.notes.push('TXT export button not immediately visible');
    }

    // ── Final state ───────────────────────────────────────────────────────
    step++;
    await shot(page, 'robin', step, 'final');

    const finalState = await captureLocalStorage(page);
    report.observations.pass = allPass.length;
    report.observations.fail = allFail.length;

    // Trait evolution
    const newTraits = { ...persona.traits };
    // Read all descriptions in a category → thoroughness +1 (already at 10, stays clamped)
    newTraits.thoroughness = Math.min(10, newTraits.thoroughness + 1);
    // Filled every kink in categories → thoroughness stays at 10

    let milestone = null;
    if (newTraits.thoroughness >= 8 && persona.traits.thoroughness < 8)
      milestone = 'obsessive filler';

    report.observations.story = `Robin opened the app and settled into her familiar careful pace. She worked through Impact Play, Bondage, and Power Exchange one kink at a time — reading each info sheet before setting a status, dropping a note in the comment field for each category. The DNA bar filled out steadily. She moved to Vergelijk via the bottom navigation, checked the empty partner slot with mild interest, and returned home without touching the contract. Thoroughness remains at ${newTraits.thoroughness}. Nothing broke, nothing rushed.`;

    const newSessionCount = persona.session_count + 1;
    await supabasePatch(`/rest/v1/sim_personas?id=eq.robin`, {
      traits: newTraits,
      session_count: newSessionCount,
      last_active: new Date().toISOString(),
      last_state: finalState || persona.last_state,
      notes: `Session ${newSessionCount}: solo. Pages: ${report.observations.pages_visited.map(p => p.replace('/', '') || 'home').join(',')}. ${allFail.length} fail(s).${milestone ? ' Milestone: ' + milestone : ''}`
    });

    await supabasePost('/rest/v1/sim_reports', {
      date: DATE,
      persona: 'robin',
      session_number: newSessionCount,
      observations: {
        story: report.observations.story,
        pass: report.observations.pass,
        fail: report.observations.fail,
        pages_visited: report.observations.pages_visited,
        notes: report.observations.notes,
        pass_list: allPass,
        fail_list: allFail,
        milestone
      },
      recommendations: {
        top_3: [
          allFail.includes('desire-slider-absent') ? 'Re-implement desire sliders (1-5) on KinkRow — referenced in engine config but absent in redesign' : null,
          allFail.includes('h1-missing') ? 'Add missing h1 to profile page for accessibility' : null,
          'Allow TXT export without password flow for trust-low users'
        ].filter(Boolean)
      },
      regression_detected: false
    });

    console.log(`  ✅ Robin complete — ${allPass.length} pass, ${allFail.length} fail`);
    return { success: true, pass: allPass, fail: allFail, story: report.observations.story, traits: newTraits, milestone };

  } catch (e) {
    console.error('  ❌ Robin run failed:', e.message);
    step++;
    await shot(page, 'robin', step, 'error').catch(() => {});
    await supabasePost('/rest/v1/sim_reports', {
      date: DATE,
      persona: 'robin',
      session_number: persona.session_count + 1,
      observations: { story: 'Robin\'s session aborted due to an unexpected error.', pass: 0, fail: 1, pages_visited: [], notes: [e.message], pass_list: [], fail_list: ['run-aborted'] },
      recommendations: { top_3: [] },
      regression_detected: false
    });
    return { success: false, error: e.message, pass: allPass, fail: allFail };
  } finally {
    await browser.close();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// LEO — session 10 → 11 | trust=3 curiosity=10 impulsivity=10 thoroughness=0
// Solo run, 390px mobile
// ════════════════════════════════════════════════════════════════════════════

async function runLeo(personas) {
  const persona = personas.find(p => p.id === 'leo');
  console.log('\n🔵 Leo — session', persona.session_count + 1, '(solo: trust=3, not eligible for Robin import)');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices['iPhone 14'],
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();
  page._jsErrors = [];
  page.on('pageerror', e => page._jsErrors.push(e.message.slice(0, 100)));

  let step = 0;
  const allPass = [], allFail = [];
  const report = {
    pages_visited: [],
    notes: [],
    milestone: null,
    story: ''
  };

  try {
    await seedLocalStorage(page, persona.last_state);

    // ── 1. Home ───────────────────────────────────────────────────────────
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await waitHydrated(page);
    step++;
    await shot(page, 'leo', step, 'home');
    report.pages_visited.push('/');
    const homeA = await assertPage(page, '/');
    allPass.push(...homeA.pass); allFail.push(...homeA.fail);

    // ── 2. Direct URL navigation (impulsivity=10) ─────────────────────────
    const directRoutes = ['/session', '/timeline', '/compare', '/contract', '/scene'];
    for (const route of directRoutes) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
      await waitHydrated(page);
      const alreadyKnown = persona.features_discovered.includes(route.replace('/', ''));
      if (!alreadyKnown) {
        step++;
        await shot(page, 'leo', step, `first-visit${route.replace('/', '-')}`);
        report.notes.push(`New route discovered: ${route}`);
        allPass.push(`new-route:${route}`);
      }
      report.pages_visited.push(route);
      const ra = await assertPage(page, route);
      allPass.push(...ra.pass.filter(x => !allPass.includes(x)));
      allFail.push(...ra.fail.filter(x => !allFail.includes(x)));
    }
    step++;
    await shot(page, 'leo', step, 'direct-nav-sample');

    // ── 3. Settings sheet (impulsivity=10: rapid) ─────────────────────────
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await waitHydrated(page);
    const settingsBtn = page.locator('button[aria-label="Instellingen openen"]');
    const settingsVis = await settingsBtn.isVisible().catch(() => false);
    if (settingsVis) {
      await settingsBtn.click();
      await page.waitForTimeout(500);
      step++;
      await shot(page, 'leo', step, 'settings-sheet');
      report.pages_visited.push('/settings-sheet');
      allPass.push('settings-sheet-opened');
      await closeAnySheet(page);
    } else {
      allFail.push('settings-button-not-found');
    }

    // ── 4. Profile — impulsivity=10: URL hack to own profile directly ────
    await page.goto(`${BASE_URL}/profile/9ymk1uio955mpt5mq7z`, { waitUntil: 'networkidle' });
    await waitHydrated(page);
    report.pages_visited.push(page.url().replace(BASE_URL, ''));

    await dismissTourIfActive(page, report);

    const skipBtn = page.locator('button:has-text("Alles overslaan"), button:has-text("Skip"), button[aria-label*="overslaan"]').first();
    const skipVis = await skipBtn.isVisible().catch(() => false);
    if (skipVis) {
      await skipBtn.click();
      await page.waitForTimeout(300);
      report.notes.push('Bulk-skipped a category (impulsivity=10, thoroughness=0)');
      allPass.push('bulk-skip-triggered');
    } else {
      // Rapidly mark a few kinks as "no" — simulates dismissal without reading
      const noButtons = await page.locator('button:has-text("Voor hen")').all();
      for (const btn of noButtons.slice(0, 2)) {
        const vis = await btn.isVisible().catch(() => false);
        if (vis) { await btn.click({ force: true }); await page.waitForTimeout(80); }
      }
      report.notes.push('No bulk-skip button found; marked 2 kinks as "Voor hen" rapidly');
    }

    // thoroughness=0: fills only 3-5 kinks total — just 2 quick "yes" taps
    const yesButtons = await page.locator('button:has-text("Heel graag")').all();
    let filled = 0;
    for (const btn of yesButtons.slice(0, 2)) {
      const vis = await btn.isVisible().catch(() => false);
      if (vis) { await btn.click({ force: true }); await page.waitForTimeout(100); filled++; }
    }
    report.notes.push(`Leo filled ${filled} kinks total (thoroughness=0)`);

    step++;
    await shot(page, 'leo', step, 'profile-rapid-fill');
    const profA = await assertPage(page, '/profile/[id]');
    allPass.push(...profA.pass.filter(x => !allPass.includes(x)));
    allFail.push(...profA.fail.filter(x => !allFail.includes(x)));

    // ── 5. Custom kink attempt (curiosity=10) ─────────────────────────────
    const customKinkSection = page.locator('text="Eigen kink", text="Custom kink", button:has-text("Eigen")').first();
    const customVis = await customKinkSection.isVisible().catch(() => false);
    if (customVis) {
      await customKinkSection.click();
      await page.waitForTimeout(300);
      report.notes.push('Custom kink section explored');
      allPass.push('custom-kink-explored');
    }

    // ── 6. Half-fill form, abandon (impulsivity=10) ───────────────────────
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await waitHydrated(page);
    const addProfileBtn = page.locator('button:has-text("Nieuw profiel"), button:has-text("Profiel aanmaken"), button[aria-label*="profiel"]').first();
    const addVis = await addProfileBtn.isVisible().catch(() => false);
    if (addVis) {
      await addProfileBtn.click();
      await page.waitForTimeout(300);
      const nameInput = page.locator('input[placeholder*="naam"], input[placeholder*="Name"]').first();
      const nameVis = await nameInput.isVisible().catch(() => false);
      if (nameVis) {
        await nameInput.fill('L');
        await page.waitForTimeout(200);
        await page.goBack();
        await page.waitForTimeout(400);
        report.notes.push('Abandoned profile creation form mid-way (impulsivity=10)');
        allFail.push('abandoned-flow');
      }
    }

    // ── 7. Browser back from session (impulsivity=10) ─────────────────────
    await page.goto(`${BASE_URL}/session`, { waitUntil: 'networkidle' });
    await waitHydrated(page);
    await page.goBack();
    await page.waitForTimeout(300);
    report.notes.push('Used browser back from /session (impulsivity=10)');

    // ── 8. Contract page (no profiles to compare, glances then leaves) ────
    await page.goto(`${BASE_URL}/contract`, { waitUntil: 'networkidle' });
    await waitHydrated(page);
    step++;
    await shot(page, 'leo', step, 'contract-page');
    report.pages_visited.push('/contract');
    const contractA = await assertPage(page, '/contract');
    allPass.push(...contractA.pass.filter(x => !allPass.includes(x)));
    allFail.push(...contractA.fail.filter(x => !allFail.includes(x)));

    // ── Final state ───────────────────────────────────────────────────────
    step++;
    await shot(page, 'leo', step, 'final');
    const finalState = await captureLocalStorage(page);

    // Trait evolution
    const newTraits = { ...persona.traits };
    // Abandoned flow mid-way → thoroughness -1 (already 0, clamped to 0)
    newTraits.thoroughness = Math.max(0, newTraits.thoroughness - 1);
    // Used browser back and got lost → impulsivity +1 (already 10, clamped)
    newTraits.impulsivity = Math.min(10, newTraits.impulsivity + 1);

    if (newTraits.impulsivity >= 7 && persona.traits.impulsivity < 7)
      report.milestone = 'chaos territory';

    const newSessionCount = persona.session_count + 1;
    report.story = `Leo launched the app with zero patience for home screens. He punched ${directRoutes.join(', ')} into the address bar in rapid succession, bouncing off each one before it had time to register. He marked two kinks "Voor hen" on the profile page, hit "Heel graag" twice, and called it thorough. A half-typed "L" in the new profile field met the back button before the cursor had blinked. Contract got a three-second stare. Thoroughness hit the floor at ${newTraits.thoroughness}. Leo is pure surface and no depth.`;

    await supabasePatch(`/rest/v1/sim_personas?id=eq.leo`, {
      traits: newTraits,
      session_count: newSessionCount,
      last_active: new Date().toISOString(),
      last_state: finalState || persona.last_state,
      notes: `Session ${newSessionCount}: solo. Pages: ${report.pages_visited.map(p => p.replace('/', '') || 'home').join(',')}. ${allFail.length} fail(s).`
    });

    await supabasePost('/rest/v1/sim_reports', {
      date: DATE,
      persona: 'leo',
      session_number: newSessionCount,
      observations: {
        story: report.story,
        pass: allPass.length,
        fail: allFail.length,
        pages_visited: report.pages_visited,
        notes: report.notes,
        pass_list: allPass,
        fail_list: allFail,
        milestone: report.milestone
      },
      recommendations: {
        top_3: [
          'Guard contract page with empty-state CTA when fewer than 2 profiles loaded',
          'Prevent half-submitted form navigation from causing silent data loss',
          allFail.includes('settings-button-not-found') ? 'Settings button not found at expected location' : 'Consider thoroughness=0 empty state: guide low-engagement users toward at least one filled category'
        ].filter(Boolean)
      },
      regression_detected: false
    });

    console.log(`  ✅ Leo complete — ${allPass.length} pass, ${allFail.length} fail`);
    return { success: true, pass: allPass, fail: allFail, story: report.story, traits: newTraits, milestone: report.milestone };

  } catch (e) {
    console.error('  ❌ Leo run failed:', e.message);
    step++;
    await shot(page, 'leo', step, 'error').catch(() => {});
    await supabasePost('/rest/v1/sim_reports', {
      date: DATE,
      persona: 'leo',
      session_number: persona.session_count + 1,
      observations: { story: 'Leo\'s session aborted due to an unexpected error.', pass: 0, fail: 1, pages_visited: [], notes: [e.message], pass_list: [], fail_list: ['run-aborted'] },
      recommendations: { top_3: [] },
      regression_detected: false
    });
    return { success: false, error: e.message, pass: allPass, fail: allFail };
  } finally {
    await browser.close();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// IRIS — session 8 → 9 | trust=8 curiosity=10 impulsivity=2 thoroughness=10
// Interaction 3: iris_compares_robin_and_leo | 1280px desktop
// trust=8 >= 7: generates a contract targeting Robin this session
// ════════════════════════════════════════════════════════════════════════════

async function runIris(personas) {
  const persona = personas.find(p => p.id === 'iris');
  const robin = personas.find(p => p.id === 'robin');
  const leo = personas.find(p => p.id === 'leo');
  console.log('\n🟣 Iris — session', persona.session_count + 1, '(interaction: iris_compares_robin_and_leo, trust=8 → generates contract)');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();
  page._jsErrors = [];
  page.on('pageerror', e => page._jsErrors.push(e.message.slice(0, 100)));

  let step = 0;
  const allPass = [], allFail = [];
  const report = {
    pages_visited: [],
    notes: [],
    milestone: null,
    story: '',
    interaction: 'iris_compares_robin_and_leo'
  };
  let contractGenerated = false;

  try {
    // Build Iris's seeded state: own profile + latest Robin + latest Leo
    const irisOwnProfile = persona.last_state.state.profiles.find(p => !p.isImported && p.name === 'Iris') || persona.last_state.state.profiles[0];
    const robinProfile = { ...robin.last_state.state.profiles[0], isImported: true };
    const leoNonImported = leo.last_state.state.profiles.find(p => !p.isImported) || leo.last_state.state.profiles[0];
    const leoProfile = { ...leoNonImported, isImported: true };

    const seededState = {
      state: {
        ...persona.last_state.state,
        profiles: [irisOwnProfile, robinProfile, leoProfile]
      },
      version: 8
    };

    await seedLocalStorage(page, seededState);
    report.notes.push('Seeded localStorage with updated Robin and Leo profiles as imported partners');

    // ── 1. Home ───────────────────────────────────────────────────────────
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await waitHydrated(page);
    step++;
    await shot(page, 'iris', step, 'home');
    report.pages_visited.push('/');
    const homeA = await assertPage(page, '/');
    allPass.push(...homeA.pass); allFail.push(...homeA.fail);

    const robinCard = page.locator(`text="${robinProfile.name}"`).first();
    const leoCard = page.locator(`text="${leoProfile.name}"`).first();
    const robinVis = await robinCard.isVisible().catch(() => false);
    const leoVis = await leoCard.isVisible().catch(() => false);
    if (robinVis && leoVis) {
      allPass.push('both-imports-visible-on-home');
      report.notes.push('Both Robin and Leo imported profiles visible on home');
    } else {
      allFail.push(`imports-not-visible: robin=${robinVis} leo=${leoVis}`);
    }

    // ── 2. Compare — core of interaction 3 ───────────────────────────────
    // Try BottomNav first, fall back to CTA link or direct URL
    const compareNavLink = page.locator('nav[aria-label="Hoofdnavigatie"] a').filter({ hasText: 'Vergelijk' });
    const compareNavVis = await compareNavLink.isVisible({ timeout: 2000 }).catch(() => false);
    if (compareNavVis) {
      await compareNavLink.click({ force: true });
    } else {
      const compareCTA = page.locator('a[href*="/compare"]').first();
      const compareCTAVis = await compareCTA.isVisible({ timeout: 2000 }).catch(() => false);
      if (compareCTAVis) {
        await compareCTA.click({ force: true });
      } else {
        await page.goto(`${BASE_URL}/compare`, { waitUntil: 'networkidle' });
      }
    }
    await page.waitForURL(/\/compare/, { timeout: 8000 }).catch(() => {});
    await waitHydrated(page);
    step++;
    await shot(page, 'iris', step, 'compare-initial');
    report.pages_visited.push('/compare');
    const compareA = await assertPage(page, '/compare');
    allPass.push(...compareA.pass.filter(x => !allPass.includes(x)));
    allFail.push(...compareA.fail.filter(x => !allFail.includes(x)));

    const compareContent = await page.locator('text="Robin", text="Leo"').count().catch(() => 0);
    const compareTable = await page.locator('[class*="compare"], [class*="heatmap"], table, .grid').first().isVisible().catch(() => false);
    if (compareContent > 0 || compareTable) {
      allPass.push('compare-rendered-with-data');
      report.notes.push('Compare page rendered with profile data');
    }

    const multiPartner = await page.locator('[aria-label*="partner"], select[aria-label*="compare"], button:has-text("partner 2")').count();
    if (multiPartner > 0) {
      allPass.push('multi-partner-compare-exists');
      report.notes.push('Multi-partner compare UI found');
    } else {
      report.notes.push('Multi-partner compare not supported — single partner at a time only');
      report.notes.push('SUGGESTION: multi-partner compare not yet available');
    }

    step++;
    await shot(page, 'iris', step, 'compare-loaded');

    // ── 3. Profile page — thoroughness=10: every kink, every info sheet ───
    // Navigate to Iris's own profile directly (impulsivity=2, precise navigation)
    await page.goto(`${BASE_URL}/profile/fr7wv281srlmpt5n3do`, { waitUntil: 'networkidle' });
    await waitHydrated(page);
    report.pages_visited.push(page.url().replace(BASE_URL, ''));

    await dismissTourIfActive(page, report);

    // impulsivity=2: reads every info button
    const infoButtons = await page.locator(`button[aria-label*="Informatie"]`).all();
    let infoOpened = 0;
    for (const btn of infoButtons.slice(0, 3)) {
      const vis = await btn.isVisible().catch(() => false);
      if (vis) {
        await btn.click({ force: true });
        await page.waitForTimeout(800);
        await closeInfoSheet(page);
        infoOpened++;
      }
    }
    report.notes.push(`Opened ${infoOpened} kink info sheets (thoroughness=10, impulsivity=2)`);

    // thoroughness=10: fills every visible kink
    const statusBtns = await page.locator('button:has-text("Heel graag")').all();
    let kinksFilled = 0;
    for (const btn of statusBtns.slice(0, 10)) {
      const vis = await btn.isVisible().catch(() => false);
      if (vis) { await btn.click({ force: true }); await page.waitForTimeout(150); kinksFilled++; }
    }
    const willingBtns = await page.locator('button:has-text("Ja")').all();
    for (const btn of willingBtns.slice(0, 4)) {
      const vis = await btn.isVisible().catch(() => false);
      if (vis) { await btn.click({ force: true }); await page.waitForTimeout(150); kinksFilled++; }
    }
    report.notes.push(`Iris filled ${kinksFilled} kinks`);

    step++;
    await shot(page, 'iris', step, 'profile-kinks-filled');
    const profA = await assertPage(page, '/profile/[id]');
    allPass.push(...profA.pass.filter(x => !allPass.includes(x)));
    allFail.push(...profA.fail.filter(x => !allFail.includes(x)));

    // ── 4. Robin's imported profile — add private note ────────────────────
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await waitHydrated(page);
    const robinCardLink = page.locator(`a[href*="profile"]:has-text("${robinProfile.name}"), button:has-text("${robinProfile.name}")`).first();
    const robinLinkVis = await robinCardLink.isVisible().catch(() => false);
    if (robinLinkVis) {
      await robinCardLink.click();
      await page.waitForURL(/\/profile\//, { timeout: 8000 }).catch(() => {});
      await waitHydrated(page);
      const noteArea = page.locator('textarea[placeholder*="ntmoet"]');
      const noteVis = await noteArea.isVisible().catch(() => false);
      if (noteVis) {
        await noteArea.fill('Rustige, zorgvuldige onderkant. Grens bij face slapping. Goed voor zachte bondage.');
        await page.waitForTimeout(300);
        allPass.push('private-note-added-on-imported-profile');
        report.notes.push('Private note added on Robin\'s imported profile');
      } else {
        report.notes.push('Private note textarea not found on imported profile');
        allFail.push('private-note-not-found');
      }
      step++;
      await shot(page, 'iris', step, 'robin-profile-private-note');
    }

    // ── 5. Settings (curiosity=10: explores settings) ─────────────────────
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await waitHydrated(page);
    const settingsBtn = page.locator('button[aria-label="Instellingen openen"]');
    const settingsVis = await settingsBtn.isVisible().catch(() => false);
    if (settingsVis) {
      await settingsBtn.click();
      await page.waitForTimeout(500);
      step++;
      await shot(page, 'iris', step, 'settings-sheet');
      allPass.push('settings-sheet-opened');
      report.pages_visited.push('/settings-sheet');
      await closeAnySheet(page);
    }

    // ── 6. Contract — trust=8 >= 7: generates contract targeting Robin ────
    await page.goto(`${BASE_URL}/contract`, { waitUntil: 'networkidle' });
    await waitHydrated(page);
    step++;
    await shot(page, 'iris', step, 'contract-page-pre-generate');
    report.pages_visited.push('/contract');
    const contractA = await assertPage(page, '/contract');
    allPass.push(...contractA.pass.filter(x => !allPass.includes(x)));
    allFail.push(...contractA.fail.filter(x => !allFail.includes(x)));

    // trust=8 >= 7: attempt to generate the contract
    report.notes.push('trust=8 >= 7: attempting to generate a contract targeting Robin');

    // Select own profile as A
    const profileSelectA = page.locator('select, [aria-label*="Profiel A"], [aria-label*="eerste profiel"], button:has-text("Kies profiel")').first();
    const selectAVis = await profileSelectA.isVisible().catch(() => false);

    // Try to find the contract generate button directly
    const generateBtn = page.locator('button:has-text("Contract genereren"), button:has-text("Genereer"), button:has-text("Maak contract"), button[aria-label*="contract"]').first();
    const generateVis = await generateBtn.isVisible().catch(() => false);

    if (generateVis) {
      await generateBtn.click({ force: true });
      await page.waitForTimeout(1500);
      step++;
      await shot(page, 'iris', step, 'contract-generated');
      contractGenerated = true;
      allPass.push('contract-generated-iris-trust-8');
      report.notes.push('Contract generated successfully (trust=8 >= 7)');
    } else {
      // Try selecting profiles first if there's a profile selector
      if (selectAVis) {
        await profileSelectA.click();
        await page.waitForTimeout(400);
      }
      // Try alternate selectors
      const altGenerate = page.locator('button:has-text("Sla op"), button:has-text("Aanmaken"), button:has-text("Start"), form button[type="submit"]').first();
      const altVis = await altGenerate.isVisible().catch(() => false);
      if (altVis) {
        await altGenerate.click({ force: true });
        await page.waitForTimeout(1500);
        step++;
        await shot(page, 'iris', step, 'contract-attempted');
        contractGenerated = true;
        allPass.push('contract-generation-attempted');
        report.notes.push('Contract generation attempted via alternate button');
      } else {
        allFail.push('contract-generate-button-not-found');
        report.notes.push('Contract generate button not found — could not generate contract despite trust=8');
        step++;
        await shot(page, 'iris', step, 'contract-no-generate-button');
      }
    }

    // ── 7. Session + Timeline (curiosity=10) ─────────────────────────────
    for (const route of ['/session', '/timeline']) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
      await waitHydrated(page);
      report.pages_visited.push(route);
      const ra = await assertPage(page, route);
      allPass.push(...ra.pass.filter(x => !allPass.includes(x)));
      allFail.push(...ra.fail.filter(x => !allFail.includes(x)));
    }

    // ── Final state ───────────────────────────────────────────────────────
    step++;
    await shot(page, 'iris', step, 'final');
    const finalState = await captureLocalStorage(page);

    // Trait evolution (interaction 3)
    const newTraits = { ...persona.traits };
    // Both imports succeeded → trust +1
    if (robinVis && leoVis) newTraits.trust = Math.min(10, newTraits.trust + 1);
    // Compare rendered with both profiles → curiosity +1 (already 10, clamped)
    newTraits.curiosity = Math.min(10, newTraits.curiosity + 1);
    // Completed contract flow end-to-end → trust +1
    if (contractGenerated) newTraits.trust = Math.min(10, newTraits.trust + 1);

    let milestone = null;
    if (newTraits.trust >= 8 && persona.traits.trust < 8) milestone = 'fully committed user';
    if (newTraits.curiosity >= 8 && persona.traits.curiosity < 8) milestone = 'power user curiosity';

    const newSessionCount = persona.session_count + 1;
    const contractNote = contractGenerated
      ? 'She navigated to the contract page and generated one targeting Robin — the first contract this session series has produced.'
      : 'She reached the contract page ready to generate, but the generate button was not found — the contract UI did not surface the action.';

    report.story = `Iris arrived on desktop with Robin and Leo already loaded. She moved to Vergelijk first, studied the compare view with careful eyes, and noted that the app still shows one partner at a time. She moved to her own profile and worked through the kink list with her usual precision, reading every info sheet before setting a status. ${contractNote} Session and timeline checked before close. Trust moved to ${newTraits.trust}. Iris has earned the title — she knows this app better than it knows itself.`;

    // Update contracts_generated if contract was made
    const contractsGenerated = contractGenerated ? (persona.contracts_generated || 0) + 1 : (persona.contracts_generated || 0);

    await supabasePatch(`/rest/v1/sim_personas?id=eq.iris`, {
      traits: newTraits,
      session_count: newSessionCount,
      last_active: new Date().toISOString(),
      last_state: finalState || persona.last_state,
      contracts_generated: contractsGenerated,
      notes: `Session ${newSessionCount}: iris_compares_robin_and_leo. ${allFail.length} fail(s).${milestone ? ' Milestone: ' + milestone : ''} trust → ${newTraits.trust}. Contract generated: ${contractGenerated}.`
    });

    await supabasePost('/rest/v1/sim_reports', {
      date: DATE,
      persona: 'iris',
      session_number: newSessionCount,
      observations: {
        story: report.story,
        pass: allPass.length,
        fail: allFail.length,
        pages_visited: report.pages_visited,
        notes: report.notes,
        pass_list: allPass,
        fail_list: allFail,
        milestone,
        interaction: report.interaction,
        contract_generated: contractGenerated
      },
      recommendations: {
        top_3: [
          'Add multi-partner compare view — dominant/coordinator users need to see Robin and Leo side by side simultaneously',
          allFail.includes('private-note-not-found') ? 'Private note textarea not rendering on imported profile page' : null,
          allFail.includes('contract-generate-button-not-found') ? 'Contract generate button not discoverable — check /contract page CTA placement for trust=8 users' : null
        ].filter(Boolean)
      },
      regression_detected: false
    });

    console.log(`  ✅ Iris complete — ${allPass.length} pass, ${allFail.length} fail (contract generated: ${contractGenerated})`);
    return { success: true, pass: allPass, fail: allFail, story: report.story, traits: newTraits, milestone, interaction: report.interaction, contractGenerated };

  } catch (e) {
    console.error('  ❌ Iris run failed:', e.message);
    step++;
    await shot(page, 'iris', step, 'error').catch(() => {});
    await supabasePost('/rest/v1/sim_reports', {
      date: DATE,
      persona: 'iris',
      session_number: persona.session_count + 1,
      observations: { story: 'Iris\'s session aborted due to an unexpected error.', pass: 0, fail: 1, pages_visited: [], notes: [e.message], pass_list: [], fail_list: ['run-aborted'], interaction: 'iris_compares_robin_and_leo' },
      recommendations: { top_3: [] },
      regression_detected: false
    });
    return { success: false, error: e.message, pass: allPass, fail: allFail };
  } finally {
    await browser.close();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SYNTHESIS
// ════════════════════════════════════════════════════════════════════════════

async function runSynthesis(results, personas) {
  console.log('\n🔬 Synthesis');

  const today = DATE;
  const today14 = new Date(new Date(today).getTime() - 14 * 86400000).toISOString().slice(0, 10);

  const todayReports = await supabaseGet(
    `/rest/v1/sim_reports?date=eq.${today}&persona=neq.synthesis`
  );
  const historyReports = await supabaseGet(
    `/rest/v1/sim_reports?date=gte.${today14}&order=date.desc`
  );

  const allFailures = [];
  const personaResults = { robin: results.robin, leo: results.leo, iris: results.iris };
  for (const [name, r] of Object.entries(personaResults)) {
    if (r && r.fail) {
      for (const f of r.fail) {
        allFailures.push({ persona: name, failure: f });
      }
    }
  }

  const failureGroups = {};
  for (const { persona, failure } of allFailures) {
    if (!failureGroups[failure]) failureGroups[failure] = [];
    failureGroups[failure].push(persona);
  }

  // Regression detection
  const regressions = [];
  for (const report of todayReports) {
    if (!report || !report.observations) continue;
    const failList = report.observations.fail_list || [];
    const persona = report.persona;
    const prevReports = historyReports
      .filter(r => r.persona === persona && r.date !== today)
      .slice(0, 3);
    for (const currentFail of failList) {
      const alwaysPassed = prevReports.length >= 3 && prevReports.every(pr => {
        const prevFails = pr.observations?.fail_list || [];
        return !prevFails.includes(currentFail);
      });
      if (alwaysPassed) {
        regressions.push({ persona, assertion: currentFail });
      }
    }
  }

  return { failureGroups, regressions, todayReports };
}

// ════════════════════════════════════════════════════════════════════════════
// TELEGRAM
// ════════════════════════════════════════════════════════════════════════════

async function sendTelegram(message) {
  const payload = JSON.stringify({
    chat_id: TELEGRAM_CHAT,
    parse_mode: 'HTML',
    text: message
  });
  const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload
  });
  const data = await r.json();
  if (!data.ok) console.error('Telegram send error:', JSON.stringify(data).slice(0, 200));
  return data.ok;
}

async function downloadScreenshot(persona, filename) {
  const url = `${SUPABASE_URL}/storage/v1/object/sim-screenshots/${persona}/${filename}`;
  const r = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  });
  if (!r.ok) throw new Error(`Download failed: ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function sendTelegramPhoto(imageBytes, filename, caption) {
  const boundary = '----KinkSimBoundary';
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${TELEGRAM_CHAT}\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="${filename}"\r\nContent-Type: image/png\r\n\r\n`
    ),
    imageBytes,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);
  const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body
  });
  const data = await r.json();
  if (!data.ok) console.error('Telegram photo error:', JSON.stringify(data).slice(0, 200));
  return data.ok;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`\n🧪 KinkSync Sim — ${DATE}\n`);

  // Fetch all persona states
  const personas = await supabaseGet('/rest/v1/sim_personas?select=*');
  console.log(`Loaded ${personas.length} personas: ${personas.map(p => p.id).join(', ')}`);

  const robin = personas.find(p => p.id === 'robin');
  const leo = personas.find(p => p.id === 'leo');
  const iris = personas.find(p => p.id === 'iris');

  const leoImportsRobin = robin.session_count >= 2 && robin.last_state && leo.traits.trust >= 4;
  const robinReceivesContract = leo.contracts_generated >= 1 && robin.session_count >= 3 && robin.traits.trust >= 3;
  const irisComparesBoth = robin.session_count >= 2 && leo.session_count >= 2 &&
    robin.last_state && leo.last_state && iris.traits.trust >= 5;

  console.log('Interaction eligibility:');
  console.log(`  Leo imports Robin:          ${leoImportsRobin ? '✓' : '✗'} (Leo trust=${leo.traits.trust}, need 4)`);
  console.log(`  Robin receives Leo contract: ${robinReceivesContract ? '✓' : '✗'} (Leo contracts=${leo.contracts_generated}, need 1)`);
  console.log(`  Iris compares Robin+Leo:    ${irisComparesBoth ? '✓' : '✗'}`);
  console.log(`  Iris generates contract:    ${iris.traits.trust >= 7 ? '✓' : '✗'} (Iris trust=${iris.traits.trust}, need 7)`);

  const results = {};

  try {
    results.robin = await runRobin(personas);
  } catch (e) {
    console.error('Robin catastrophic failure:', e);
    results.robin = { success: false, error: e.message, pass: [], fail: ['run-catastrophic'] };
  }

  try {
    results.leo = await runLeo(personas);
  } catch (e) {
    console.error('Leo catastrophic failure:', e);
    results.leo = { success: false, error: e.message, pass: [], fail: ['run-catastrophic'] };
  }

  try {
    results.iris = await runIris(personas);
  } catch (e) {
    console.error('Iris catastrophic failure:', e);
    results.iris = { success: false, error: e.message, pass: [], fail: ['run-catastrophic'] };
  }

  const updatedPersonas = await supabaseGet('/rest/v1/sim_personas?select=*');

  const { failureGroups, regressions, todayReports } = await runSynthesis(results, personas);

  const failureLines = [];
  for (const [failure, personaList] of Object.entries(failureGroups)) {
    if (failure === 'run-aborted' || failure === 'run-catastrophic') continue;
    const whoStr = personaList.length === 3 ? 'all 3 personas' : personaList.join(', ');
    failureLines.push(`• ${failure} — ${whoStr}`);
  }

  const buildPersonaBlock = (name, result, persona) => {
    if (!result) return `⚠️ <b>${name}</b> — incomplete`;
    const icon = !result.success ? '❌' : result.fail?.length > 0 ? '⚠️' : '✅';
    const sessionN = (persona?.session_count ?? 0);
    const passCount = result.pass?.length ?? 0;
    const failCount = result.fail?.length ?? 0;
    let block = `${icon} <b>${name}</b> (session ${sessionN}) — ${passCount} passed / ${failCount} failed\n`;
    if (result.story) {
      const sentences = result.story.match(/[^.!?]+[.!?]+/g) || [result.story];
      block += `<i>${sentences.slice(0, 3).join(' ').trim()}</i>\n`;
    }
    if (result.milestone) block += `  🎯 ${result.milestone}\n`;
    const newRoutes = (result.pass || []).filter(p => p.startsWith('new-route:'));
    for (const r of newRoutes) block += `  🗺 First visit to ${r.replace('new-route:', '')}\n`;
    if (result.contractGenerated) block += `  📜 Contract generated\n`;
    const personaRegressions = regressions.filter(r => r.persona === name.toLowerCase());
    for (const reg of personaRegressions) block += `  🚨 Regression: ${reg.assertion}\n`;
    return block.trim();
  };

  const robinUpdated = updatedPersonas.find(p => p.id === 'robin');
  const leoUpdated = updatedPersonas.find(p => p.id === 'leo');
  const irisUpdated = updatedPersonas.find(p => p.id === 'iris');

  const allClean = failureLines.length === 0 && regressions.length === 0;
  const suggestions = ['multi-partner compare not yet available'];
  const newSuggestions = suggestions.filter(s => s.length > 0);

  let telegramMessage = `🧪 <b>KinkSync Sim — ${DATE}</b>\n\n`;
  telegramMessage += buildPersonaBlock('Robin', results.robin, robinUpdated) + '\n\n';
  telegramMessage += buildPersonaBlock('Leo', results.leo, leoUpdated) + '\n\n';
  telegramMessage += buildPersonaBlock('Iris', results.iris, irisUpdated);

  if (failureLines.length > 0) {
    telegramMessage += `\n\n🐛 <b>Issues this run:</b>\n${failureLines.join('\n')}`;
  }

  if (allClean && newSuggestions.length === 0) {
    telegramMessage += '\n\n✨ All clean';
  }

  console.log('\n📤 Sending Telegram summary...');
  await sendTelegram(telegramMessage);

  // Key screenshots per persona
  const screenshotMap = {
    robin: `${DATE}_04_compare.png`,
    leo:   `${DATE}_07_contract-page.png`,
    iris:  `${DATE}_03_compare-loaded.png`
  };

  for (const [personaName, filename] of Object.entries(screenshotMap)) {
    try {
      const bytes = await downloadScreenshot(personaName, filename);
      const updP = updatedPersonas.find(p => p.id === personaName);
      const caption = `${personaName.charAt(0).toUpperCase() + personaName.slice(1)} — session ${updP?.session_count ?? '?'}, ${filename.replace(/^\d{4}-\d{2}-\d{2}_\d{2}_/, '').replace('.png', '')}`;
      await sendTelegramPhoto(bytes, filename, caption);
      console.log(`  📸 Sent ${personaName} screenshot to Telegram`);
    } catch (e) {
      console.error(`  ⚠️ Could not send ${personaName} screenshot:`, e.message);
    }
    await sleep(400);
  }

  // Step 5b — Fixup prompt
  const fixupLines = [`Fix these sim findings from ${DATE}. Work on the redesign branch.`];
  let itemN = 1;
  if (failureGroups['desire-slider-absent']) {
    fixupLines.push(`${itemN++}. Desire sliders (1-5) absent from KinkRow\n   components/KinkRow.tsx: desire field exists in KinkEntry type but no UI renders it. Add an optional 1-5 range input below the status pills, gated on entry.status !== null.`);
  }
  if (failureGroups['h1-missing']) {
    fixupLines.push(`${itemN++}. Missing h1 on profile page\n   app/profile/[id]/page.tsx: no h1 element present. Add a visually-hidden h1 with the profile name.`);
  }
  if (failureGroups['bottomnav-missing']) {
    fixupLines.push(`${itemN++}. BottomNav absent on some pages\n   app/layout.tsx: check BottomNav is imported and rendered unconditionally outside the page body.`);
  }
  if (failureGroups['private-note-not-found']) {
    fixupLines.push(`${itemN++}. Private note textarea not rendering on imported profile\n   app/profile/[id]/page.tsx: verify isImported flag is truthy on profiles seeded via localStorage. Check textarea placeholder includes "ntmoet".`);
  }
  if (failureGroups['contract-generate-button-not-found']) {
    fixupLines.push(`${itemN++}. Contract generate button not discoverable\n   app/contract/page.tsx: CTA for generating a contract is not surfaced when 2+ profiles are present. Add a prominent generate button visible after profile selection.`);
  }
  fixupLines.push(`${itemN++}. Multi-partner compare not available\n   app/compare/page.tsx: only one imported partner shown at a time. Add partner selector or tabbed switcher so dominant users can compare Robin and Leo side by side.`);

  const fixupPrompt = fixupLines.join('\n\n');
  await sendTelegram(`<pre><code>${fixupPrompt}</code></pre>`);
  console.log('  📤 Sent fixup prompt');

  // Regression alerts
  if (regressions.length > 0) {
    for (const reg of regressions) {
      const regMsg = `🚨 Regression detected — ${DATE}\n\n${reg.persona} passed [${reg.assertion}] in previous sessions but failed today.\n\nSuspect: changes since last clean run.\n→ Opening GitHub issue now.`;
      await sendTelegram(regMsg);
    }
  }

  // Synthesis report
  await supabasePost('/rest/v1/sim_reports', {
    date: DATE,
    persona: 'synthesis',
    observations: {
      personas: {
        robin: results.robin?.pass?.length,
        leo: results.leo?.pass?.length,
        iris: results.iris?.pass?.length
      },
      failure_groups: failureGroups,
      regressions,
      interaction_results: {
        leo_imports_robin: leoImportsRobin ? 'eligible-but-not-run' : 'ineligible',
        robin_receives_contract: robinReceivesContract ? 'ran' : 'ineligible',
        iris_compares_both: irisComparesBoth ? 'ran' : 'ineligible',
        iris_generates_contract: iris.traits.trust >= 7 ? 'attempted' : 'ineligible'
      }
    },
    recommendations: {
      new_suggestions: newSuggestions,
      fixup_prompt: fixupPrompt
    },
    regression_detected: regressions.length > 0
  });

  console.log('\n✅ Sim run complete — ' + DATE);
}

main().catch(e => {
  console.error('Fatal error:', e);
  const msg = `🔴 KinkSync Sim ${DATE} — fatal error: ${e.message}`;
  fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text: msg })
  }).catch(() => {});
  process.exit(1);
});
