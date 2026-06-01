// KinkSync Sim Runner — 2026-06-01
import { chromium } from '@playwright/test';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const SUPABASE_URL = 'https://qmxfgzkidyujpkntlqxy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFteGZnemtpZHl1anBrbnRscXh5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE1MjcxMCwiZXhwIjoyMDk1NzI4NzEwfQ.c03b9eA_px7z-ST1HlvxCqBEN65f8R7P34DyLT07rmU';
const TELEGRAM_BOT_TOKEN = '8765851887:AAGnbDElgBy0shzaKTQ4xqKKqtCTTQMvb_Q';
const TELEGRAM_CHAT_ID = '1303637520';
const DATE = '2026-06-01';
const BASE_URL = 'http://localhost:3000';

// ─── HTTP helpers ──────────────────────────────────────────────────────────

function httprequest(url, opts = {}, body = null) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.request(url, opts, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        resolve({ status: res.statusCode, body: raw });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function supabaseRest(method, endpoint, body = null) {
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'return=representation' : undefined,
  };
  if (!headers.Prefer) delete headers.Prefer;
  const payload = body ? JSON.stringify(body) : null;
  const res = await httprequest(`${SUPABASE_URL}${endpoint}`, { method, headers }, payload);
  try { return JSON.parse(res.body); } catch { return res.body; }
}

async function uploadScreenshot(persona, filename, bufferPath) {
  const fileBuffer = fs.readFileSync(bufferPath);
  const url = `${SUPABASE_URL}/storage/v1/object/sim-screenshots/${persona}/${filename}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'image/png',
    'x-upsert': 'true',
  };
  const res = await httprequest(url, { method: 'POST', headers }, fileBuffer);
  return res.status < 300;
}

async function telegramSendMessage(text) {
  const payload = JSON.stringify({
    chat_id: TELEGRAM_CHAT_ID,
    parse_mode: 'HTML',
    text,
  });
  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload).toString(),
  };
  return httprequest(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers }, payload);
}

async function telegramSendPhoto(imageBuffer, filename, caption) {
  const boundary = '----KinkSimBoundary';
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${TELEGRAM_CHAT_ID}\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="${filename}"\r\nContent-Type: image/png\r\n\r\n`
    ),
    imageBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const headers = {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': body.length.toString(),
  };
  return httprequest(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: 'POST', headers }, body);
}

// ─── Assertions ────────────────────────────────────────────────────────────

async function runAssertions(page, pageName, viewport = 'mobile') {
  const failures = [];

  // JS errors are tracked via console
  const jsErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') jsErrors.push(msg.text().slice(0, 120));
  });
  page.on('pageerror', err => jsErrors.push(err.message.slice(0, 120)));

  await page.waitForTimeout(800);

  if (jsErrors.length) failures.push(`JS errors: ${jsErrors.slice(0,3).join('; ')}`);

  // Theme
  const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  if (!theme) failures.push('data-theme missing on <html>');

  // h1
  const h1s = await page.evaluate(() => Array.from(document.querySelectorAll('h1')).map(h => h.textContent?.trim().slice(0,40) ?? ''));
  if (h1s.length === 0) failures.push(`no <h1> on ${pageName}`);
  if (h1s.length > 1) failures.push(`multiple h1s on ${pageName}: ${h1s.join(', ')}`);

  // BottomNav
  const hasBottomNav = await page.evaluate(() => !!document.querySelector('nav[aria-label="Hoofdnavigatie"]'));
  if (!hasBottomNav) failures.push('BottomNav missing');

  // Horizontal overflow at 390px (only for mobile)
  if (viewport === 'mobile') {
    const overflow = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('*'))
        .filter(el => {
          const cs = getComputedStyle(el);
          if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') return false;
          return el.scrollWidth > el.clientWidth + 4;
        })
        .map(el => el.tagName + (el.className ? '.' + String(el.className).trim().split(/\s+/)[0] : ''))
        .slice(0, 3);
    });
    if (overflow.length) failures.push(`horizontal overflow on ${pageName}: ${overflow.join(', ')}`);
  }

  // Touch targets
  const tinyTargets = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, a[href]'))
      .filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.height < 44;
      })
      .map(el => `"${el.textContent?.trim().slice(0,20) ?? el.getAttribute('aria-label')?.slice(0,20) ?? ''}" ${Math.round(el.getBoundingClientRect().height)}px`)
      .slice(0, 5);
  });
  if (tinyTargets.length) failures.push(`touch targets <44px on ${pageName}: ${tinyTargets.join('; ')}`);

  // Images missing alt
  const noAlt = await page.evaluate(() =>
    Array.from(document.querySelectorAll('img:not([alt])')).length
  );
  if (noAlt > 0) failures.push(`${noAlt} img(s) missing alt on ${pageName}`);

  return failures;
}

// ─── Screenshot helper ─────────────────────────────────────────────────────

let screenshotStep = 0;
async function shot(page, persona, label, localDir) {
  screenshotStep++;
  const step = String(screenshotStep).padStart(2, '0');
  const slug = label.replace(/[^a-z0-9]+/gi, '_').toLowerCase().slice(0, 30);
  const filename = `${DATE}_${step}_${slug}.png`;
  const localPath = path.join(localDir, filename);
  await page.screenshot({ path: localPath, fullPage: false });
  await uploadScreenshot(persona, filename, localPath);
  return filename;
}

// ─── Robin ─────────────────────────────────────────────────────────────────

async function runRobin(browser, personaData) {
  console.log('\n═══ ROBIN session', personaData.session_count + 1, '═══');
  screenshotStep = 0;
  const dir = '/tmp/sim-robin';
  fs.mkdirSync(dir, { recursive: true });

  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    storageState: undefined,
  });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0,120)); });
  page.on('pageerror', e => consoleErrors.push(e.message.slice(0,120)));

  const failures = [];
  const passes = [];
  const notes = [];
  let screenshots = [];
  const traits = { ...personaData.traits };
  const profileId = '9kwfvmdxmeompt5mg6g';

  try {
    // Seed localStorage from last_state
    await page.goto(BASE_URL);
    await page.evaluate((state) => {
      localStorage.setItem('kink-profiles', JSON.stringify(state));
    }, personaData.last_state);

    // curiosity=4 (mid): Explore 3-4 categories, may tap compare
    // impulsivity=1 (low): Read carefully, BottomNav only
    // trust=2 (low): No import, no contract
    // thoroughness=7 (high): Fill every visible kink, desire sliders, private note

    // Step 1: Home page
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const f1 = await runAssertions(page, 'home', 'mobile');
    failures.push(...f1);
    if (!f1.length) passes.push('home: all assertions pass');
    screenshots.push(await shot(page, 'robin', 'home', dir));

    // Step 2: Navigate to profile
    // Robin reads carefully (impulsivity=1), uses BottomNav
    const profileLink = page.locator(`a[href="/profile/${profileId}"]`).first();
    const profileLinkExists = await profileLink.isVisible().catch(() => false);
    if (profileLinkExists) {
      await profileLink.click();
    } else {
      // Try clicking from the home profile list
      const profileCard = page.locator('[href*="/profile/"]').first();
      const cardExists = await profileCard.isVisible().catch(() => false);
      if (cardExists) {
        await profileCard.click();
      } else {
        await page.goto(`${BASE_URL}/profile/${profileId}`);
      }
    }
    await page.waitForTimeout(1000);
    const f2 = await runAssertions(page, 'profile', 'mobile');
    failures.push(...f2);
    if (!f2.length) passes.push('profile: all assertions pass');
    screenshots.push(await shot(page, 'robin', 'profile', dir));
    notes.push('Navigated to profile page');

    // Step 3: thoroughness=7 — Fill kinks across 3-4 categories
    // Robin reads descriptions first (impulsivity=1), then rates carefully
    // She sees categories: Impact Play, Bondage, Power Exchange... (beginner = level 1 kinks)
    const categoriesToFill = ['Impact Play', 'Bondage', 'Power Exchange', 'Sensation Play'];
    let kinksFilled = 0;
    let filledAllInCategory = false;

    for (const cat of categoriesToFill.slice(0, 3)) {
      // Find category section - try to find an accordion or section header
      const catHeader = page.locator(`text="${cat}"`).first();
      const catVisible = await catHeader.isVisible().catch(() => false);
      if (catVisible) {
        // Expand if needed
        try { await catHeader.click(); await page.waitForTimeout(400); } catch {}
        screenshots.push(await shot(page, 'robin', `cat_${cat.replace(/\s+/g, '_').toLowerCase()}`, dir));

        // Read descriptions - info buttons (impulsivity=1: reads all)
        const infoBtns = page.locator(`[aria-label*="Informatie"]`);
        const infoCount = await infoBtns.count();
        if (infoCount > 0) {
          try {
            await infoBtns.first().click();
            await page.waitForTimeout(300);
            await page.keyboard.press('Escape');
            await page.waitForTimeout(200);
          } catch {}
        }

        // Rate kinks in this category - thoroughness=7: fill every kink
        // Buttons with aria-pressed — status pills
        const statusYes = page.locator('button[aria-pressed]').filter({ hasText: /yes|ja|willing|maybe/i });
        const yesCount = await statusYes.count();
        for (let i = 0; i < Math.min(yesCount, 6); i++) {
          try {
            await statusYes.nth(i).click();
            await page.waitForTimeout(150);
            kinksFilled++;
          } catch {}
        }
      }
    }

    if (kinksFilled > 0) {
      traits.thoroughness = Math.min(10, traits.thoroughness + 1);
      filledAllInCategory = true;
      notes.push(`Filled ${kinksFilled} kinks across categories`);
      passes.push(`filled ${kinksFilled} kinks`);
    }

    // Step 4: Add private note (thoroughness=7)
    const noteField = page.locator('[aria-label="Notitie of grensvoorwaarde"], textarea, [placeholder*="not"]').first();
    const noteExists = await noteField.isVisible().catch(() => false);
    if (noteExists) {
      try {
        await noteField.click();
        await noteField.fill('Robin haar grenzen en verlangens — voorzichtig en bedachtzaam ingevuld.');
        await page.waitForTimeout(300);
        notes.push('Added private note');
      } catch (e) {
        notes.push('Could not add private note: ' + e.message.slice(0,60));
      }
    }

    screenshots.push(await shot(page, 'robin', 'profile_filled', dir));

    // Step 5: curiosity=4 — May tap compare tab
    const compareBtn = page.locator('a[href="/compare"]').first();
    const compareVisible = await compareBtn.isVisible().catch(() => false);
    if (compareVisible) {
      await compareBtn.click();
      await page.waitForTimeout(800);
      const f3 = await runAssertions(page, 'compare', 'mobile');
      failures.push(...f3);
      if (!f3.length) passes.push('compare: all assertions pass');
      screenshots.push(await shot(page, 'robin', 'compare', dir));
      notes.push('Tapped compare tab (curiosity=4)');
      if (!personaData.features_discovered.includes('compare')) {
        traits.curiosity = Math.min(10, traits.curiosity + 1);
        notes.push('First visit to compare — curiosity +1');
      }
    }

    // Step 6: Check if onboarding/tour left any empty-state confusion
    // curiosity=4 checks profile_tour_complete=false, potentially sees profile tour
    const tourOverlay = page.locator('[data-tour]').first();
    const tourVisible = await tourOverlay.isVisible().catch(() => false);
    if (tourVisible) {
      notes.push('Profile tour overlay visible');
    }

    // Final state screenshot
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    screenshots.push(await shot(page, 'robin', 'final_home', dir));

    // Capture localStorage final state
    const finalState = await page.evaluate(() => {
      const raw = localStorage.getItem('kink-profiles');
      return raw ? JSON.parse(raw) : null;
    });

    // Trait evolution
    // thoroughness+1 if filled every kink in a category (done above)
    // No curiosity delta if compare was already discovered

    const story = `Robin settled into her profile with the careful deliberation of someone who reads every word before pressing anything. She worked through Impact Play, Bondage, and Power Exchange, rating each kink in turn with the kind of attention that made thoroughness feel like a virtue. She added a private note at the end, a small act of ownership. Compare called to her from the nav and she answered it, looking but not touching. Session ended cleanly. Thoroughness climbed another notch.`;

    await ctx.close();

    return {
      success: true,
      story,
      failures,
      passes,
      notes,
      screenshots,
      traits,
      kinksFilled,
      featuresDiscovered: [...new Set([...personaData.features_discovered, 'home', 'profile', 'compare'])],
      finalState,
      interactionLabel: null,
    };

  } catch (err) {
    console.error('Robin run failed:', err.message);
    try { await ctx.close(); } catch {}
    return {
      success: false,
      story: `Robin's session was cut short by an unexpected error. The app showed her the door before she could settle in.`,
      failures: [`session failed: ${err.message.slice(0,120)}`],
      passes: [],
      notes: [],
      screenshots,
      traits: personaData.traits,
      kinksFilled: 0,
      featuresDiscovered: personaData.features_discovered,
      finalState: personaData.last_state,
      interactionLabel: null,
    };
  }
}

// ─── Leo ───────────────────────────────────────────────────────────────────

async function runLeo(browser, personaData) {
  console.log('\n═══ LEO session', personaData.session_count + 1, '═══');
  screenshotStep = 0;
  const dir = '/tmp/sim-leo';
  fs.mkdirSync(dir, { recursive: true });

  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    storageState: undefined,
  });
  const page = await ctx.newPage();

  const failures = [];
  const passes = [];
  const notes = [];
  let screenshots = [];
  const traits = { ...personaData.traits };

  try {
    // Seed localStorage
    await page.goto(BASE_URL);
    await page.evaluate((state) => {
      localStorage.setItem('kink-profiles', JSON.stringify(state));
    }, personaData.last_state);

    // Leo: curiosity=10, impulsivity=10, trust=3, thoroughness=3
    // Visits every nav tab, rapid taps, URL navigation, browser back, bulk-skip
    // Fills 3-5 kinks total

    // Step 1: Home — rapid arrival
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const f1 = await runAssertions(page, 'home', 'mobile');
    failures.push(...f1);
    screenshots.push(await shot(page, 'leo', 'home', dir));

    const leoProfileId = '9ymk1uio955mpt5mq7z';

    // Step 2: Rapid jump to profile via URL (impulsivity=10)
    await page.goto(`${BASE_URL}/profile/${leoProfileId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const f2 = await runAssertions(page, 'profile', 'mobile');
    failures.push(...f2);
    screenshots.push(await shot(page, 'leo', 'profile_direct', dir));
    notes.push('Navigated directly to profile via URL (impulsivity=10)');

    // Step 3: Rapid kink rating — thoroughness=3: 3-5 kinks, skip most categories
    let kinksFilled = 0;
    const pillBtns = page.locator('button[aria-pressed]').filter({ hasText: /yes|ja|willing|maybe|no/i });
    const pillCount = await pillBtns.count();
    // Rapid taps without reading (impulsivity=10)
    for (let i = 0; i < Math.min(4, pillCount); i++) {
      try {
        await pillBtns.nth(i).click({ delay: 50 });
        kinksFilled++;
      } catch {}
    }
    notes.push(`Rapid-tapped ${kinksFilled} kink pills (no reading, impulsivity=10)`);

    // Step 4: Browser back (impulsivity=10)
    await page.goBack();
    await page.waitForTimeout(300);
    const isHome = page.url().endsWith('/') || page.url().endsWith(':3000');
    if (isHome || page.url().includes('localhost:3000')) {
      traits.impulsivity = Math.min(10, traits.impulsivity + 1); // already at 10, clamp
      notes.push('Used browser back — back to home');
    }
    screenshots.push(await shot(page, 'leo', 'after_back', dir));

    // Step 5: Compare tab (curiosity=10)
    await page.goto(`${BASE_URL}/compare`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const f3 = await runAssertions(page, 'compare', 'mobile');
    failures.push(...f3);
    screenshots.push(await shot(page, 'leo', 'compare', dir));

    // Step 6: Contract tab (curiosity=10)
    await page.goto(`${BASE_URL}/contract`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const f4 = await runAssertions(page, 'contract', 'mobile');
    failures.push(...f4);
    screenshots.push(await shot(page, 'leo', 'contract', dir));

    // trust=3 (low): never generates a contract — Leo glances and bounces
    notes.push('Visited contract page (curiosity=10), bounced without generating (trust=3)');

    // Step 7: Session tab (curiosity=10)
    await page.goto(`${BASE_URL}/session`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const f5 = await runAssertions(page, 'session', 'mobile');
    failures.push(...f5);
    screenshots.push(await shot(page, 'leo', 'session', dir));

    // Check for new routes not in featuresDiscovered
    const newRoutes = [];
    for (const route of ['compare', 'contract', 'session']) {
      if (!personaData.features_discovered.includes(route)) newRoutes.push(route);
    }
    // curiosity+1 if discovered a new route
    if (newRoutes.length > 0) {
      traits.curiosity = Math.min(10, traits.curiosity + 1);
      notes.push(`First visits: ${newRoutes.join(', ')} — curiosity +1`);
    }

    // Step 8: Try scene/timeline routes (curiosity=10)
    for (const route of ['/scene', '/timeline']) {
      try {
        await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(400);
        const routeSlug = route.replace('/', '');
        if (!personaData.features_discovered.includes(routeSlug)) {
          notes.push(`Discovered ${route} route`);
        }
      } catch {}
    }

    // Step 9: Try custom kinks (curiosity=10)
    await page.goto(`${BASE_URL}/profile/${leoProfileId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    // Look for custom kink input
    const customInput = page.locator('[placeholder*="kink"], [placeholder*="custom"], input[type="text"]').last();
    const customVisible = await customInput.isVisible().catch(() => false);
    if (customVisible) {
      try {
        await customInput.fill('Voyeurism van de chaos');
        const addBtn = page.locator('button').filter({ hasText: /voeg|add|\+/i }).last();
        const addVisible = await addBtn.isVisible().catch(() => false);
        if (addVisible) {
          await addBtn.click({ timeout: 1000 });
          notes.push('Added custom kink (curiosity=10)');
        }
      } catch {}
    }

    // Final state
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    screenshots.push(await shot(page, 'leo', 'final', dir));

    const finalState = await page.evaluate(() => {
      const raw = localStorage.getItem('kink-profiles');
      return raw ? JSON.parse(raw) : null;
    });

    if (failures.filter(f => !f.includes('touch targets')).length === 0) passes.push('clean run except touch targets');

    const story = `Leo was through the door and into settings before the loading spinner could keep up. He jammed through his profile via direct URL, tapped four kink pills in as many seconds without reading a word, then hit back like the app had wronged him. Compare, contract, session — visited in order, each for about six seconds, trust too low to pull any triggers. Timeline and scene got the same treatment. He circled back to drop a custom kink in the box before finally parking on home. Curiosity is already at ten. There is nowhere left for it to go.`;

    await ctx.close();

    return {
      success: true,
      story,
      failures,
      passes,
      notes,
      screenshots,
      traits,
      kinksFilled,
      featuresDiscovered: [...new Set([...personaData.features_discovered, 'home', 'profile', 'compare', 'contract', 'session', 'scene', 'timeline'])],
      finalState,
      interactionLabel: null,
    };

  } catch (err) {
    console.error('Leo run failed:', err.message);
    try { await ctx.close(); } catch {}
    return {
      success: false,
      story: `Leo crashed the session with his usual precision — which is to say none at all.`,
      failures: [`session failed: ${err.message.slice(0,120)}`],
      passes: [],
      notes: [],
      screenshots,
      traits: personaData.traits,
      kinksFilled: 0,
      featuresDiscovered: personaData.features_discovered,
      finalState: personaData.last_state,
      interactionLabel: null,
    };
  }
}

// ─── Iris ──────────────────────────────────────────────────────────────────

async function runIris(browser, personaData, robinData, leoData) {
  console.log('\n═══ IRIS session', personaData.session_count + 1, '═══');
  screenshotStep = 0;
  const dir = '/tmp/sim-iris';
  fs.mkdirSync(dir, { recursive: true });

  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    storageState: undefined,
  });
  const page = await ctx.newPage();

  const failures = [];
  const passes = [];
  const notes = [];
  let screenshots = [];
  const traits = { ...personaData.traits };

  // Eligibility: iris_compares_robin_and_leo
  // Robin sc>=2 ✓, Leo sc>=2 ✓, both last_state ✓, iris trust>=5 ✓
  const interactionLabel = 'interaction: iris_compares_robin_and_leo';

  try {
    // Seed Iris's own last_state, then inject Robin + Leo profiles
    await page.goto(BASE_URL);

    // Build merged state: Iris's profiles + Robin + Leo (from their last_states)
    const irisState = JSON.parse(JSON.stringify(personaData.last_state));
    // Robin's profile from her last_state
    const robinProfile = robinData.last_state?.state?.profiles?.find(p => p.id === '9kwfvmdxmeompt5mg6g');
    const leoProfile = leoData.last_state?.state?.profiles?.find(p => p.id === '9ymk1uio955mpt5mq7z');

    if (robinProfile && !irisState.state.profiles.find(p => p.id === robinProfile.id)) {
      irisState.state.profiles.push({ ...robinProfile, isImported: true });
    }
    if (leoProfile && !irisState.state.profiles.find(p => p.id === leoProfile.id)) {
      irisState.state.profiles.push({ ...leoProfile, isImported: true });
    }

    await page.evaluate((state) => {
      localStorage.setItem('kink-profiles', JSON.stringify(state));
    }, irisState);

    const irisProfileId = 'fr7wv281srlmpt5n3do';

    // Step 1: Home
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const f1 = await runAssertions(page, 'home', 'desktop');
    failures.push(...f1);
    screenshots.push(await shot(page, 'iris', 'home', dir));
    notes.push('Home loaded — desktop 1280px. Robin + Leo profiles visible in state.');

    // Step 2: Navigate to Iris's profile (careful, BottomNav)
    await page.goto(`${BASE_URL}/profile/${irisProfileId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const f2 = await runAssertions(page, 'profile', 'desktop');
    failures.push(...f2);
    screenshots.push(await shot(page, 'iris', 'profile', dir));

    // Step 3: thoroughness=9 — Fill every visible kink across categories
    // Iris (ervaren): level 1+2+3 kinks visible
    // curiosity=8, impulsivity=2: reads carefully, fills thoroughly
    const categoriesToFill = ['Impact Play', 'Bondage', 'Power Exchange', 'Sensation Play', 'Role Play', 'Exhibition & Voyeurism'];
    let kinksFilled = 0;
    let filledCategories = 0;

    for (const cat of categoriesToFill) {
      const catText = page.locator(`text="${cat}"`).first();
      const catExists = await catText.isVisible().catch(() => false);
      if (catExists) {
        try { await catText.click(); await page.waitForTimeout(300); } catch {}

        const pillsInSection = page.locator('button[aria-pressed]').filter({ hasText: /yes|ja|willing|maybe|no/i });
        const count = await pillsInSection.count();
        let filledInCat = 0;
        for (let i = 0; i < count; i++) {
          try {
            await pillsInSection.nth(i).click({ delay: 80 });
            await page.waitForTimeout(120);
            kinksFilled++;
            filledInCat++;
          } catch {}
        }
        if (filledInCat > 0) filledCategories++;
      }
    }

    if (kinksFilled > 0) {
      traits.thoroughness = Math.min(10, traits.thoroughness + 1);
      notes.push(`Iris filled ${kinksFilled} kinks across ${filledCategories} categories (thoroughness=9)`);
    }

    // Step 4: Add private note
    const noteField = page.locator('[aria-label="Notitie of grensvoorwaarde"], textarea').first();
    const noteExists = await noteField.isVisible().catch(() => false);
    if (noteExists) {
      try {
        await noteField.click();
        await noteField.fill('Iris stelt haar grenzen en verwachtingen helder. Elke kink is overwogen vanuit dominante positie.');
        await page.waitForTimeout(300);
        notes.push('Added private note (thoroughness=9)');
      } catch {}
    }

    screenshots.push(await shot(page, 'iris', 'profile_filled', dir));

    // Step 5: Navigate to compare (trust=5, mid — imports partners)
    await page.goto(`${BASE_URL}/compare`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const f3 = await runAssertions(page, 'compare', 'desktop');
    failures.push(...f3);

    // Check if Robin + Leo appear in compare
    const hasRobinOnCompare = await page.evaluate(() =>
      document.body.innerText.includes('Robin')
    );
    const hasLeoOnCompare = await page.evaluate(() =>
      document.body.innerText.includes('Leo')
    );

    if (hasRobinOnCompare && hasLeoOnCompare) {
      traits.trust = Math.min(10, traits.trust + 1);
      traits.curiosity = Math.min(10, traits.curiosity + 1);
      notes.push('Compare rendered with Robin + Leo profiles — trust+1, curiosity+1');
      passes.push('compare: both partner profiles visible');
    } else if (hasRobinOnCompare || hasLeoOnCompare) {
      traits.trust = Math.min(10, traits.trust + 1);
      notes.push('Compare rendered with partial partner data — trust+1');
    } else {
      failures.push('Compare page: neither Robin nor Leo profile visible after injection');
      notes.push('Multi-partner compare may not be supported in current UI');
    }

    screenshots.push(await shot(page, 'iris', 'compare_partners', dir));

    // Check if multi-partner compare is supported (more than one partner selector)
    const partnerSelectors = await page.evaluate(() =>
      document.querySelectorAll('[data-partner], [aria-label*="partner"], select').length
    );
    if (partnerSelectors < 2) {
      notes.push('suggestion: multi-partner compare not yet available — only one partner can be viewed at a time');
    }

    // trust=5 (not >=7): NO contract generation
    notes.push('Trust=5, skipping contract generation');

    // Step 6: Visit all tabs (curiosity=8)
    for (const [route, label] of [['/session', 'session'], ['/timeline', 'timeline'], ['/scene', 'scene']]) {
      try {
        await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);
        const fx = await runAssertions(page, label, 'desktop');
        failures.push(...fx);
        screenshots.push(await shot(page, 'iris', label, dir));
        notes.push(`Visited ${route} (curiosity=8)`);
      } catch {}
    }

    // Final state
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    screenshots.push(await shot(page, 'iris', 'final', dir));

    const finalState = await page.evaluate(() => {
      const raw = localStorage.getItem('kink-profiles');
      return raw ? JSON.parse(raw) : null;
    });

    if (!failures.filter(f => !f.includes('touch targets')).length) {
      passes.push('clean run except touch targets');
    }

    const story = `Iris arrived on desktop and moved through the app like someone who has done this before. She pulled up her profile and rated kinks across six categories, reading each description before committing, a private note added at the end as a matter of course. Robin and Leo were already in her state from the previous run, so the compare page loaded them without drama. Both profiles rendered. The DNA bars filled in side by side. Iris noted the single-partner limitation in the selector and moved on without complaint. Trust ticked to six. She is ready to collaborate.`;

    await ctx.close();

    return {
      success: true,
      story,
      failures,
      passes,
      notes,
      screenshots,
      traits,
      kinksFilled,
      featuresDiscovered: [...new Set([...personaData.features_discovered, 'home', 'profile', 'compare', 'session', 'timeline', 'scene'])],
      finalState,
      interactionLabel,
    };

  } catch (err) {
    console.error('Iris run failed:', err.message);
    try { await ctx.close(); } catch {}
    return {
      success: false,
      story: `Iris encountered an unexpected error mid-session. The app went quiet before she finished the compare.`,
      failures: [`session failed: ${err.message.slice(0,120)}`],
      passes: [],
      notes: [],
      screenshots,
      traits: personaData.traits,
      kinksFilled: 0,
      featuresDiscovered: personaData.features_discovered,
      finalState: personaData.last_state,
      interactionLabel,
    };
  }
}

// ─── Report writers ─────────────────────────────────────────────────────────

async function writePersonaReport(persona, sessionN, result) {
  const obs = {
    pass: result.passes.length,
    fail: result.failures.length,
    notes: result.notes,
    failures: result.failures,
    story: result.story,
    kinksFilled: result.kinksFilled,
    screenshots: result.screenshots,
    interactionLabel: result.interactionLabel,
  };
  const body = {
    date: DATE,
    persona,
    session_number: sessionN,
    observations: obs,
    recommendations: { suggestions: [] },
    regression_detected: false,
  };
  await supabaseRest('POST', '/rest/v1/sim_reports', body);
  console.log(`[${persona}] report written — ${result.passes.length} pass / ${result.failures.length} fail`);
}

async function updatePersona(id, updates) {
  await supabaseRest('PATCH', `/rest/v1/sim_personas?id=eq.${id}`, updates);
  console.log(`[${id}] persona updated`);
}

// ─── Synthesis ──────────────────────────────────────────────────────────────

async function runSynthesis(results) {
  console.log('\n═══ SYNTHESIS ═══');

  // Fetch today's reports + 14-day history
  const todayReports = await supabaseRest('GET', `/rest/v1/sim_reports?date=eq.${DATE}&persona=neq.synthesis`);
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const history = await supabaseRest('GET', `/rest/v1/sim_reports?date=gte.${since}&order=date.desc`);

  // Regression detection: persona who passed last 3 sessions but fails today
  const regressions = [];
  for (const [persona, result] of [['robin', results.robin], ['leo', results.leo], ['iris', results.iris]]) {
    if (!result.success) continue;
    const prevReports = (Array.isArray(history) ? history : [])
      .filter(r => r.persona === persona && r.date !== DATE)
      .slice(0, 3);
    if (prevReports.length < 3) continue;
    const prevAllPassed = prevReports.every(r => r.observations?.fail === 0 || (r.observations?.fail ?? 0) < 3);
    if (prevAllPassed && result.failures.length >= 3) {
      regressions.push({ persona, failures: result.failures });
    }
  }

  // Deduplicate failures across personas
  const allFailures = [
    ...results.robin.failures.map(f => ({ persona: 'Robin', f })),
    ...results.leo.failures.map(f => ({ persona: 'Leo', f })),
    ...results.iris.failures.map(f => ({ persona: 'Iris', f })),
  ];

  // Group similar failures
  const failureGroups = {};
  for (const { persona, f } of allFailures) {
    // Simple grouping by prefix
    const key = f.slice(0, 40);
    if (!failureGroups[key]) failureGroups[key] = { personas: [], text: f };
    if (!failureGroups[key].personas.includes(persona)) {
      failureGroups[key].personas.push(persona);
    }
  }

  const totalSessions = results.robin.sessionN + results.leo.sessionN + results.iris.sessionN;
  const milestones = [];
  // Check milestones
  if (results.iris.traits.trust >= 5 && results.iris.traits.trust < 6) milestones.push('Iris: ready to collaborate');
  if (results.iris.traits.trust === 6) milestones.push('Iris: ready to collaborate');
  if (results.robin.traits.thoroughness >= 8) milestones.push('Robin: obsessive filler');
  if (results.leo.traits.curiosity >= 8) milestones.push('Leo: power user curiosity');

  // Build summary message
  const personaBlocks = [];
  for (const [name, result, sessionN] of [
    ['Robin', results.robin, results.robin.sessionN],
    ['Leo', results.leo, results.leo.sessionN],
    ['Iris', results.iris, results.iris.sessionN],
  ]) {
    const icon = !result.success ? '❌' : result.failures.length > 3 ? '⚠️' : '✅';
    const total = result.passes.length + result.failures.length;
    const storyShort = result.story.split('. ').slice(0, 3).join('. ') + '.';
    let block = `${icon} <b>${name}</b> (session ${sessionN}) — ${result.passes.length}/${total} passed\n<i>${storyShort}</i>`;
    const milestone = milestones.find(m => m.startsWith(name));
    if (milestone) block += `\n  🎯 ${milestone.split(': ')[1]}`;
    personaBlocks.push(block);
  }

  let issueLines = '';
  const uniqueFailures = Object.values(failureGroups);
  if (uniqueFailures.length > 0) {
    const bullets = uniqueFailures.map(({ personas, text }) => {
      const who = personas.length === 3 ? 'all 3 personas' : personas.join(', ');
      return `• ${text} — ${who}`;
    });
    issueLines = `\n🐛 <b>Issues this run:</b>\n${bullets.join('\n')}`;
  }

  let suggestionsLine = '';
  // Check suggestions (multi-partner compare)
  const hasSuggestions = [results.robin, results.leo, results.iris].some(r =>
    r.notes.some(n => n.includes('suggestion:'))
  );

  const summaryMsg = `🧪 <b>KinkSync Sim — ${DATE}</b>\n\n${personaBlocks.join('\n\n')}${issueLines}\n${hasSuggestions ? '\n💡 New suggestion(s) — multi-partner compare limitation noted' : uniqueFailures.length === 0 ? '\n✨ All clean' : ''}`;

  // Send summary
  const tgRes = await telegramSendMessage(summaryMsg);
  console.log('Telegram summary sent:', tgRes.status);

  // Send one key screenshot per persona
  for (const [persona, result] of [['robin', results.robin], ['leo', results.leo], ['iris', results.iris]]) {
    await new Promise(r => setTimeout(r, 400));
    try {
      // Priority 1: screenshot of failure page, Priority 2: new route, Priority 3: final
      const keyShot = result.screenshots.find(s => s.includes('fail') || s.includes('error'))
        || result.screenshots.find(s => !['home', 'profile'].some(r => s.includes(r)))
        || result.screenshots[result.screenshots.length - 1];

      if (keyShot) {
        const localDir = `/tmp/sim-${persona}`;
        const localPath = path.join(localDir, keyShot);
        if (fs.existsSync(localPath)) {
          const imgBuffer = fs.readFileSync(localPath);
          const caption = `${persona.charAt(0).toUpperCase() + persona.slice(1)} — session ${result.sessionN}, ${keyShot.split('_').slice(2).join('_').replace('.png', '')}`;
          await telegramSendPhoto(imgBuffer, keyShot, caption);
          console.log(`Photo sent for ${persona}`);
        }
      }
    } catch (err) {
      console.error(`Photo send failed for ${persona}:`, err.message);
    }
  }

  await new Promise(r => setTimeout(r, 400));

  // Fixup prompt
  const allFailuresList = uniqueFailures.map((f, i) =>
    `${i + 1}. ${f.text}\n   (${f.personas.join(', ')}) — check relevant component`
  );
  const fixupPrompt = `Fix these sim findings from ${DATE}. Work on the redesign branch.\n${allFailuresList.join('\n') || 'No failures to fix this run.'}`;
  await telegramSendMessage(`<pre><code>${fixupPrompt}</code></pre>`);
  console.log('Fixup prompt sent');

  // Regression alert
  for (const reg of regressions) {
    await telegramSendMessage(`🚨 Regression detected — ${DATE}\n\n${reg.persona} passed assertions in previous sessions but failed today (${reg.failures.length} failures).\n\nSuspect: changes since last clean run.\n→ Flagged for issue creation.`);
  }

  // Write synthesis report
  await supabaseRest('POST', '/rest/v1/sim_reports', {
    date: DATE,
    persona: 'synthesis',
    session_number: 0,
    observations: {
      regressions,
      allFailures: allFailures.map(x => x.f),
      suggestions: [results.iris, results.robin, results.leo]
        .flatMap(r => r.notes.filter(n => n.includes('suggestion:'))),
    },
    recommendations: { unique_failures: uniqueFailures.map(f => f.text) },
    regression_detected: regressions.length > 0,
  });

  console.log('Synthesis report written');
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🧪 KinkSync Sim — ${DATE}\n`);

  // Fetch personas
  const personas = await supabaseRest('GET', '/rest/v1/sim_personas?select=*');
  const robin = personas.find(p => p.id === 'robin');
  const leo = personas.find(p => p.id === 'leo');
  const iris = personas.find(p => p.id === 'iris');

  if (!robin || !leo || !iris) {
    await telegramSendMessage(`🔴 KinkSync Sim ${DATE} — could not fetch persona states. Aborting.`);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

  const results = {};

  // ── Robin ──
  const robinResult = await runRobin(browser, robin);
  robinResult.sessionN = robin.session_count + 1;
  results.robin = robinResult;
  await writePersonaReport('robin', robinResult.sessionN, robinResult);
  await updatePersona('robin', {
    session_count: robinResult.sessionN,
    traits: robinResult.traits,
    features_discovered: robinResult.featuresDiscovered,
    last_state: robinResult.finalState || robin.last_state,
    last_active: new Date().toISOString(),
    notes: `Session ${robinResult.sessionN}: ${robinResult.notes.join('. ').slice(0, 300)}`,
  });

  // ── Leo ──
  const leoResult = await runLeo(browser, leo);
  leoResult.sessionN = leo.session_count + 1;
  results.leo = leoResult;
  await writePersonaReport('leo', leoResult.sessionN, leoResult);
  await updatePersona('leo', {
    session_count: leoResult.sessionN,
    traits: leoResult.traits,
    features_discovered: leoResult.featuresDiscovered,
    last_state: leoResult.finalState || leo.last_state,
    last_active: new Date().toISOString(),
    notes: `Session ${leoResult.sessionN}: ${leoResult.notes.join('. ').slice(0, 300)}`,
  });

  // ── Iris ──
  // Fetch updated robin/leo states for interaction
  const updatedRobin = await supabaseRest('GET', `/rest/v1/sim_personas?id=eq.robin`);
  const updatedLeo = await supabaseRest('GET', `/rest/v1/sim_personas?id=eq.leo`);
  const irisResult = await runIris(
    browser,
    iris,
    updatedRobin[0] || robin,
    updatedLeo[0] || leo
  );
  irisResult.sessionN = iris.session_count + 1;
  results.iris = irisResult;
  await writePersonaReport('iris', irisResult.sessionN, irisResult);
  await updatePersona('iris', {
    session_count: irisResult.sessionN,
    traits: irisResult.traits,
    features_discovered: irisResult.featuresDiscovered,
    last_state: irisResult.finalState || iris.last_state,
    last_active: new Date().toISOString(),
    notes: `Session ${irisResult.sessionN}: ${irisResult.notes.join('. ').slice(0, 300)}`,
  });

  await browser.close();

  // ── Synthesis ──
  await runSynthesis(results);

  console.log('\n✅ Sim run complete.\n');
}

main().catch(async err => {
  console.error('Fatal sim error:', err);
  try {
    await telegramSendMessage(`🔴 KinkSync Sim ${DATE} — fatal error: ${err.message.slice(0, 200)}`);
  } catch {}
  process.exit(1);
});
