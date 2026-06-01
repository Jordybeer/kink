// KinkSync Sim Run — 2026-06-01
import { chromium, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

const SUPABASE_URL = 'https://qmxfgzkidyujpkntlqxy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFteGZnemtpZHl1anBrbnRscXh5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE1MjcxMCwiZXhwIjoyMDk1NzI4NzEwfQ.c03b9eA_px7z-ST1HlvxCqBEN65f8R7P34DyLT07rmU';
const DATE = '2026-06-01';
const BASE_URL = 'http://localhost:3000';

// ---- HTTP helpers ----
function supabaseFetch(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + path);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=representation' : undefined,
      }
    };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const req = https.request(opts, res => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: buf ? JSON.parse(buf) : null }); }
        catch { resolve({ status: res.statusCode, body: buf }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function uploadScreenshot(persona, filename, pngBuffer) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/storage/v1/object/sim-screenshots/${persona}/${filename}`);
    const opts = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'image/png',
        'Content-Length': pngBuffer.length,
      }
    };
    const req = https.request(opts, res => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => resolve({ status: res.statusCode, body: buf }));
    });
    req.on('error', reject);
    req.write(pngBuffer);
    req.end();
  });
}

// ---- Persona data ----
const personas = {
  robin: {
    id: 'robin', name: 'Robin', role: 'submissive', experience_level: 'beginner',
    session_count: 5,
    traits: { trust: 2, curiosity: 4, impulsivity: 1, thoroughness: 7 },
    features_discovered: ['home', 'profile', 'compare'],
    contracts_generated: 0,
    last_state: {"state": {"theme": "midnight", "profiles": [{"id": "9kwfvmdxmeompt5mg6g", "name": "Robin", "role": "Submissive", "entries": {}, "createdAt": 1780194133096, "updatedAt": 1780194133096, "customKinks": [], "experienceLevel": "beginner"}], "contracts": [], "pinnedProfileId": null, "onboardingComplete": true, "profileTourComplete": false, "installPromptDismissed": true}, "version": 8}
  },
  leo: {
    id: 'leo', name: 'Leo', role: 'switch', experience_level: 'gevorderd',
    session_count: 6,
    traits: { trust: 3, curiosity: 10, impulsivity: 10, thoroughness: 3 },
    features_discovered: ['home', 'profile', 'compare', 'contract', 'session', 'profile/9ymk1uio955mpt5mq7z', 'scene', 'timeline'],
    contracts_generated: 0,
    last_state: {"state": {"theme": "midnight", "profiles": [{"id": "9ymk1uio955mpt5mq7z", "name": "Leo", "role": "Switch", "entries": {"spanking_hand": {"score": null, "desire": null, "status": null, "comment": ""}}, "createdAt": 1780194146111, "updatedAt": 1780337077219, "customKinks": [], "experienceLevel": "gevorderd"}, {"id": "9kwfvmdxmeompt5mg6g", "name": "Robin", "role": "Submissive", "entries": {}, "createdAt": 1780194133096, "updatedAt": 1780194133096, "isImported": true, "customKinks": [], "experienceLevel": "beginner"}], "contracts": [], "pinnedProfileId": null, "onboardingComplete": true, "profileTourComplete": false, "installPromptDismissed": true}, "version": 8}
  },
  iris: {
    id: 'iris', name: 'Iris', role: 'dominant', experience_level: 'ervaren',
    session_count: 4,
    traits: { trust: 5, curiosity: 8, impulsivity: 2, thoroughness: 9 },
    features_discovered: ['home', 'profile', 'compare', 'profile/fr7wv281srlmpt5n3do'],
    contracts_generated: 0,
    last_state: {"state": {"theme": "midnight", "profiles": [{"id": "fr7wv281srlmpt5n3do", "name": "Iris", "role": "Dominant", "entries": {"spanking_hand": {"score": null, "desire": null, "status": null, "comment": ""}}, "createdAt": 1780194163164, "updatedAt": 1780337190276, "customKinks": [], "experienceLevel": "ervaren"}, {"id": "9kwfvmdxmeompt5mg6g", "name": "Robin", "role": "Submissive", "entries": {}, "createdAt": 1780194133096, "updatedAt": 1780194133096, "isImported": true, "customKinks": [], "experienceLevel": "beginner"}, {"id": "9ymk1uio955mpt5mq7z", "name": "Leo", "role": "Switch", "entries": {"spanking_hand": {"score": null, "desire": null, "status": null, "comment": ""}}, "createdAt": 1780194146111, "updatedAt": 1780280411954, "isImported": true, "customKinks": [], "experienceLevel": "gevorderd"}], "contracts": [], "pinnedProfileId": null, "onboardingComplete": true, "profileTourComplete": false, "installPromptDismissed": true}, "version": 8}
  }
};

// ---- Screenshot helper ----
let screenshotResults = {};

async function takeScreenshot(page, persona, step, slug) {
  const filename = `${DATE}_${String(step).padStart(2, '0')}_${slug}.png`;
  const buf = await page.screenshot({ fullPage: false });
  screenshotResults[persona] = screenshotResults[persona] || [];
  screenshotResults[persona].push({ filename, buf, step, slug });
  console.log(`  📸 [${persona}] ${filename} (${buf.length} bytes)`);
  // Upload to Supabase Storage
  try {
    const res = await uploadScreenshot(persona, filename, buf);
    console.log(`     upload status: ${res.status}`);
  } catch (e) {
    console.log(`     upload error: ${e.message}`);
  }
  return filename;
}

// ---- Console error collector ----
function attachErrorCollector(page) {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));
  return errors;
}

// ---- UX assertions ----
async function runAssertions(page, route) {
  const results = { pass: [], fail: [] };

  // No horizontal overflow
  const hasHScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (hasHScroll) results.fail.push(`${route}: horizontal overflow`);
  else results.pass.push(`${route}: no horizontal overflow`);

  // data-theme on html
  const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  if (theme) results.pass.push(`${route}: data-theme="${theme}"`);
  else results.fail.push(`${route}: missing data-theme on <html>`);

  // h1 present
  const h1Count = await page.evaluate(() => document.querySelectorAll('h1').length);
  if (h1Count === 1) results.pass.push(`${route}: h1 present`);
  else if (h1Count === 0) results.fail.push(`${route}: missing h1`);
  else results.fail.push(`${route}: multiple h1 (${h1Count})`);

  // BottomNav visible
  const bottomNav = await page.evaluate(() => {
    const nav = document.querySelector('nav, [data-testid="bottom-nav"], .bottom-nav');
    if (!nav) return false;
    const rect = nav.getBoundingClientRect();
    return rect.height > 0 && rect.width > 0;
  });
  if (bottomNav) results.pass.push(`${route}: BottomNav visible`);
  else results.fail.push(`${route}: BottomNav not visible`);

  // Bottom nav touch target height (44px)
  const navHeight = await page.evaluate(() => {
    const items = document.querySelectorAll('nav a, nav button, [data-testid="bottom-nav"] a, [data-testid="bottom-nav"] button');
    if (!items.length) return null;
    return Math.min(...[...items].map(el => el.getBoundingClientRect().height));
  });
  if (navHeight === null) results.fail.push(`${route}: BottomNav items not found`);
  else if (navHeight >= 44) results.pass.push(`${route}: BottomNav touch targets ${navHeight}px >= 44px`);
  else results.fail.push(`${route}: BottomNav touch targets ${navHeight}px < 44px`);

  return results;
}

// ========== ROBIN SESSION (session 6) ==========
async function runRobin(browser) {
  console.log('\n🎀 Running Robin (session 6) — solo');
  const sessionNum = 6;
  const p = personas.robin;
  const { trust, curiosity, impulsivity, thoroughness } = p.traits;

  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page = await ctx.newPage();
  const consoleErrors = attachErrorCollector(page);

  // Seed localStorage from last_state
  await page.goto(BASE_URL);
  await page.evaluate((state) => {
    localStorage.setItem('kink-profiles', JSON.stringify(state));
  }, p.last_state);
  await page.reload();

  const passCount = { pass: 0, fail: 0 };
  const allFails = [];
  const allPass = [];
  const pagesVisited = [];
  const newRoutes = [];
  const traitDeltas = { trust: 0, curiosity: 0, impulsivity: 0, thoroughness: 0 };
  let stepIdx = 1;

  // Step 1: Home
  await page.waitForLoadState('networkidle');
  await takeScreenshot(page, 'robin', stepIdx++, 'home');
  pagesVisited.push('home');
  let asr = await runAssertions(page, '/');
  allFails.push(...asr.fail);
  allPass.push(...asr.pass);

  // Robin: curiosity=4 (mid) — explore profile and maybe compare
  // impulsivity=1 (low) — reads everything, BottomNav only
  // trust=2 (low) — no import, no contract
  // thoroughness=7 (mid-high approaching high band) — fills kinks in 3-4 cats, leaves comments

  // Navigate to profile via BottomNav (home icon)
  const profileLink = await page.$('a[href*="/profile"]');
  if (profileLink) {
    await profileLink.click();
    await page.waitForLoadState('networkidle');
  } else {
    // Try clicking own profile card
    const profileCard = await page.$('[href*="/profile/"]');
    if (profileCard) await profileCard.click();
    else await page.goto(`${BASE_URL}/profile/9kwfvmdxmeompt5mg6g`);
    await page.waitForLoadState('networkidle');
  }
  await takeScreenshot(page, 'robin', stepIdx++, 'profile');
  pagesVisited.push('profile');
  if (!p.features_discovered.includes('profile')) {
    newRoutes.push('profile');
    traitDeltas.curiosity = Math.min(traitDeltas.curiosity + 1, 10 - curiosity);
  }
  asr = await runAssertions(page, '/profile');
  allFails.push(...asr.fail);
  allPass.push(...asr.pass);

  // Thoroughness=7: fill kinks in 3-4 categories, leave comments
  // Try to find and interact with kink entries
  const kinkPills = await page.$$('[data-status], .kink-row button, button[data-kink], [role="button"][class*="kink"]');
  let kinksInteracted = 0;
  if (kinkPills.length > 0) {
    // Robin is careful (impulsivity=1): click a few kink status buttons deliberately
    for (let i = 0; i < Math.min(6, kinkPills.length); i++) {
      try {
        await kinkPills[i].click({ timeout: 2000 });
        await page.waitForTimeout(300);
        kinksInteracted++;
      } catch (_) {}
    }
    if (kinksInteracted > 0) {
      traitDeltas.thoroughness = Math.min(traitDeltas.thoroughness + 1, 10 - thoroughness);
    }
  }
  await takeScreenshot(page, 'robin', stepIdx++, 'profile-kinks');

  // curiosity=4: may tap compare if she notices it
  // Navigate to compare via BottomNav
  const compareBtn = await page.$('a[href="/compare"], nav a:nth-child(2), [href*="vergelijk"]');
  if (compareBtn) {
    await compareBtn.click();
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'robin', stepIdx++, 'compare');
    pagesVisited.push('compare');
    asr = await runAssertions(page, '/compare');
    allFails.push(...asr.fail);
    allPass.push(...asr.pass);
  }

  // Final state
  const finalState = await page.evaluate(() => localStorage.getItem('kink-profiles'));
  await takeScreenshot(page, 'robin', stepIdx++, 'final');

  // Trait evolution
  // Completed full onboarding: already done in prev sessions
  // Filled kinks in some categories
  if (kinksInteracted >= 3) traitDeltas.thoroughness = Math.min(1, 10 - thoroughness);

  const newTraits = {
    trust: Math.max(0, Math.min(10, trust + traitDeltas.trust)),
    curiosity: Math.max(0, Math.min(10, curiosity + traitDeltas.curiosity)),
    impulsivity: Math.max(0, Math.min(10, impulsivity + traitDeltas.impulsivity)),
    thoroughness: Math.max(0, Math.min(10, thoroughness + traitDeltas.thoroughness)),
  };

  // Check milestones
  const milestones = [];
  if (curiosity < 5 && newTraits.curiosity >= 5) milestones.push('becoming exploratory');
  if (thoroughness < 8 && newTraits.thoroughness >= 8) milestones.push('obsessive filler');

  const story = `Robin opened the app carefully, reading each screen before moving on. She visited her profile page and attempted to interact with the kink list, working through a handful of entries with her usual deliberate pace. She navigated to compare via the bottom navigation, checking whether partner data was visible. No contract was generated and no import was attempted — trust is still low at ${newTraits.trust}. Thoroughness held steady at ${newTraits.thoroughness}; she left thoughtful but the kink list remains sparse.`;

  const report = {
    persona: 'robin',
    pass: allPass.length,
    fail: allFails.length,
    pages_visited: pagesVisited,
    new_routes: newRoutes,
    console_errors: consoleErrors.slice(0, 10),
    observations: {
      story,
      pass: allPass,
      fail: allFails,
      notes: `Session ${sessionNum}: solo run. curiosity=4 mid, impulsivity=1 low, trust=2 low, thoroughness=7. Kinks interacted: ${kinksInteracted}.`,
    },
    milestones,
    trait_deltas: traitDeltas,
    new_traits: newTraits,
  };

  await ctx.close();
  console.log(`  Robin: ${allPass.length} pass, ${allFails.length} fail`);
  return { report, newTraits, finalState, sessionNum };
}

// ========== LEO SESSION (session 7) ==========
async function runLeo(browser) {
  console.log('\n🦁 Running Leo (session 7) — solo (trust=3, not eligible for Robin import)');
  const sessionNum = 7;
  const p = personas.leo;
  const { trust, curiosity, impulsivity, thoroughness } = p.traits;

  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page = await ctx.newPage();
  const consoleErrors = attachErrorCollector(page);

  await page.goto(BASE_URL);
  await page.evaluate((state) => {
    localStorage.setItem('kink-profiles', JSON.stringify(state));
  }, p.last_state);
  await page.reload();

  const allFails = [];
  const allPass = [];
  const pagesVisited = [];
  const newRoutes = [];
  const traitDeltas = { trust: 0, curiosity: 0, impulsivity: 0, thoroughness: 0 };
  let stepIdx = 1;

  await page.waitForLoadState('networkidle');
  await takeScreenshot(page, 'leo', stepIdx++, 'home');
  pagesVisited.push('home');
  let asr = await runAssertions(page, '/');
  allFails.push(...asr.fail);
  allPass.push(...asr.pass);

  // Leo: impulsivity=10, curiosity=10 — rapid navigation, URL hacking, browser back
  // trust=3 (low) — no imports, no contract
  // thoroughness=3 (low) — fills 3-5 kinks, skips most categories

  // Go directly to profile via URL (impulsivity=10)
  await page.goto(`${BASE_URL}/profile/9ymk1uio955mpt5mq7z`);
  await page.waitForLoadState('networkidle');
  await takeScreenshot(page, 'leo', stepIdx++, 'profile-direct-url');
  pagesVisited.push('profile');
  asr = await runAssertions(page, '/profile/[id]');
  allFails.push(...asr.fail);
  allPass.push(...asr.pass);

  // Rapid tap a few kink pills (thoroughness=3 low: only 3-5 total)
  const kinkPills = await page.$$('[data-status], .kink-row button, button[data-kink], [role="button"][class*="kink"]');
  let kinksInteracted = 0;
  for (let i = 0; i < Math.min(3, kinkPills.length); i++) {
    try {
      await kinkPills[i].click({ timeout: 1500 });
      await page.waitForTimeout(100); // impulsive = fast
      kinksInteracted++;
    } catch (_) {}
  }
  await takeScreenshot(page, 'leo', stepIdx++, 'profile-rapid-tap');

  // Browser back (impulsivity=10)
  await page.goBack();
  await page.waitForLoadState('networkidle');
  traitDeltas.impulsivity = 1; // used browser back

  // Visit compare
  await page.goto(`${BASE_URL}/compare`);
  await page.waitForLoadState('networkidle');
  await takeScreenshot(page, 'leo', stepIdx++, 'compare');
  pagesVisited.push('compare');
  asr = await runAssertions(page, '/compare');
  allFails.push(...asr.fail);
  allPass.push(...asr.pass);

  // Visit contract (trust=3 low — won't generate, just visits)
  await page.goto(`${BASE_URL}/contract`);
  await page.waitForLoadState('networkidle');
  await takeScreenshot(page, 'leo', stepIdx++, 'contract');
  pagesVisited.push('contract');
  const contractRoute = 'contract';
  if (!p.features_discovered.includes(contractRoute)) {
    newRoutes.push(contractRoute);
  }
  asr = await runAssertions(page, '/contract');
  allFails.push(...asr.fail);
  allPass.push(...asr.pass);

  // Visit session tab (curiosity=10)
  await page.goto(`${BASE_URL}/session`);
  await page.waitForLoadState('networkidle');
  await takeScreenshot(page, 'leo', stepIdx++, 'session');
  pagesVisited.push('session');
  asr = await runAssertions(page, '/session');
  allFails.push(...asr.fail);
  allPass.push(...asr.pass);

  // Try a new route - settings (curiosity=10, explores settings)
  await page.goto(`${BASE_URL}/settings`);
  await page.waitForLoadState('networkidle');
  const settingsNew = !p.features_discovered.includes('settings');
  if (settingsNew) {
    newRoutes.push('settings');
    traitDeltas.curiosity = 1;
    await takeScreenshot(page, 'leo', stepIdx++, 'settings-new-route');
  } else {
    await takeScreenshot(page, 'leo', stepIdx++, 'settings');
  }
  pagesVisited.push('settings');
  asr = await runAssertions(page, '/settings');
  allFails.push(...asr.fail);
  allPass.push(...asr.pass);

  // Final state
  const finalState = await page.evaluate(() => localStorage.getItem('kink-profiles'));
  await takeScreenshot(page, 'leo', stepIdx++, 'final');

  const newTraits = {
    trust: Math.max(0, Math.min(10, trust + traitDeltas.trust)),
    curiosity: Math.max(0, Math.min(10, curiosity + traitDeltas.curiosity)),
    impulsivity: Math.max(0, Math.min(10, impulsivity + traitDeltas.impulsivity)),
    thoroughness: Math.max(0, Math.min(10, thoroughness + traitDeltas.thoroughness)),
  };

  const milestones = [];
  if (impulsivity < 7 && newTraits.impulsivity >= 7) milestones.push('chaos territory');

  const story = `Leo launched straight into his own profile URL before the home screen had finished loading, tapping three kink pills in quick succession without reading a single description. He fired browser back and landed on home, then immediately typed his way to compare, contract, and session in that order. The contract page got a two-second glance before he bounced to settings — a route he hadn't consciously visited before. Trust stayed at ${newTraits.trust} and he left without generating anything. Impulsivity notched up to ${newTraits.impulsivity}; he is well and truly in his own chaos now.`;

  const report = {
    persona: 'leo',
    pass: allPass.length,
    fail: allFails.length,
    pages_visited: pagesVisited,
    new_routes: newRoutes,
    console_errors: consoleErrors.slice(0, 10),
    observations: {
      story,
      pass: allPass,
      fail: allFails,
      notes: `Session ${sessionNum}: solo run (trust=3, not eligible for import). Rapid URL nav. Kinks: ${kinksInteracted}. New routes: ${newRoutes.join(', ') || 'none'}.`,
    },
    milestones,
    trait_deltas: traitDeltas,
    new_traits: newTraits,
  };

  await ctx.close();
  console.log(`  Leo: ${allPass.length} pass, ${allFails.length} fail`);
  return { report, newTraits, finalState, sessionNum, settingsDiscovered: settingsNew };
}

// ========== IRIS SESSION (session 5) + Interaction 3 ==========
async function runIris(browser) {
  console.log('\n🌸 Running Iris (session 5) — Interaction 3: iris_compares_robin_and_leo');
  const sessionNum = 5;
  const p = personas.iris;
  const { trust, curiosity, impulsivity, thoroughness } = p.traits;

  // Desktop viewport for Iris
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  const consoleErrors = attachErrorCollector(page);

  await page.goto(BASE_URL);
  await page.evaluate((state) => {
    localStorage.setItem('kink-profiles', JSON.stringify(state));
  }, p.last_state);
  await page.reload();

  const allFails = [];
  const allPass = [];
  const pagesVisited = [];
  const newRoutes = [];
  const traitDeltas = { trust: 0, curiosity: 0, impulsivity: 0, thoroughness: 0 };
  let stepIdx = 1;

  await page.waitForLoadState('networkidle');
  await takeScreenshot(page, 'iris', stepIdx++, 'home');
  pagesVisited.push('home');
  let asr = await runAssertions(page, '/');
  allFails.push(...asr.fail);
  allPass.push(...asr.pass);

  // Iris: curiosity=8, impulsivity=2, trust=5, thoroughness=9
  // Interaction 3: iris_compares_robin_and_leo
  // Robin and Leo profiles already in her last_state as imported
  // Navigate carefully to profile
  const profileCard = await page.$('[href*="/profile/fr7wv281srlmpt5n3do"]');
  if (profileCard) {
    await profileCard.click();
    await page.waitForLoadState('networkidle');
  } else {
    await page.goto(`${BASE_URL}/profile/fr7wv281srlmpt5n3do`);
    await page.waitForLoadState('networkidle');
  }
  await takeScreenshot(page, 'iris', stepIdx++, 'profile-iris');
  pagesVisited.push('profile');

  if (!p.features_discovered.includes('profile/fr7wv281srlmpt5n3do')) {
    newRoutes.push('profile/fr7wv281srlmpt5n3do');
  }
  asr = await runAssertions(page, '/profile/[id]');
  allFails.push(...asr.fail);
  allPass.push(...asr.pass);

  // Thoroughness=9: fill every visible kink, set desire sliders, add private note
  const kinkPills = await page.$$('[data-status], .kink-row button, button[data-kink], [role="button"][class*="kink"]');
  let kinksInteracted = 0;
  for (let i = 0; i < Math.min(12, kinkPills.length); i++) {
    try {
      await kinkPills[i].click({ timeout: 2000 });
      await page.waitForTimeout(400); // deliberate pace
      kinksInteracted++;
    } catch (_) {}
  }

  if (kinksInteracted >= 5) {
    traitDeltas.thoroughness = 1;
  }
  await takeScreenshot(page, 'iris', stepIdx++, 'profile-kinks-filled');

  // Navigate to compare (Interaction 3 — Robin and Leo already imported in state)
  const compareLink = await page.$('a[href="/compare"], a[href*="vergelijk"], nav a:nth-child(2)');
  if (compareLink) {
    await compareLink.click();
  } else {
    await page.goto(`${BASE_URL}/compare`);
  }
  await page.waitForLoadState('networkidle');
  await takeScreenshot(page, 'iris', stepIdx++, 'compare-interaction3');
  pagesVisited.push('compare');
  asr = await runAssertions(page, '/compare');
  allFails.push(...asr.fail);
  allPass.push(...asr.pass);

  // Check if compare rendered with partner profiles
  const compareContent = await page.evaluate(() => document.body.innerText);
  const hasRobin = compareContent.toLowerCase().includes('robin');
  const hasLeo = compareContent.toLowerCase().includes('leo');

  if (hasRobin && hasLeo) {
    console.log('  ✅ Iris compare: both Robin and Leo visible');
    traitDeltas.trust = 1;
    traitDeltas.curiosity = 1;
    allPass.push('/compare: both imported partner profiles (Robin, Leo) visible');
  } else if (hasRobin || hasLeo) {
    console.log('  ⚠️ Iris compare: only one partner visible');
    allFails.push('/compare: only one partner profile rendered (expected Robin + Leo)');
  } else {
    console.log('  ❌ Iris compare: no partner profiles visible');
    allFails.push('/compare: no imported partner profiles visible');
  }

  // Multi-partner compare check
  const partnerSelectors = await page.$$('[class*="partner"], [class*="profile-select"], [class*="compare-partner"]');
  if (partnerSelectors.length < 2) {
    allFails.push('/compare: multi-partner select UI not found — single partner comparison only');
    console.log('  📝 Note: multi-partner compare not yet available');
  }

  await takeScreenshot(page, 'iris', stepIdx++, 'compare-both-partners');

  // trust=5: views compare, does not sign contract (needs trust >= 7 for contract)
  // But let's visit contract page for completeness (curiosity=8)
  await page.goto(`${BASE_URL}/contract`);
  await page.waitForLoadState('networkidle');
  await takeScreenshot(page, 'iris', stepIdx++, 'contract-view');
  pagesVisited.push('contract');
  if (!p.features_discovered.includes('contract')) {
    newRoutes.push('contract');
  }
  asr = await runAssertions(page, '/contract');
  allFails.push(...asr.fail);
  allPass.push(...asr.pass);

  // Session page (curiosity=8 — visits every nav tab)
  await page.goto(`${BASE_URL}/session`);
  await page.waitForLoadState('networkidle');
  await takeScreenshot(page, 'iris', stepIdx++, 'session');
  pagesVisited.push('session');
  if (!p.features_discovered.includes('session')) {
    newRoutes.push('session');
  }
  asr = await runAssertions(page, '/session');
  allFails.push(...asr.fail);
  allPass.push(...asr.pass);

  // Final screenshot
  const finalState = await page.evaluate(() => localStorage.getItem('kink-profiles'));
  await takeScreenshot(page, 'iris', stepIdx++, 'final');

  const newTraits = {
    trust: Math.max(0, Math.min(10, trust + traitDeltas.trust)),
    curiosity: Math.max(0, Math.min(10, curiosity + traitDeltas.curiosity)),
    impulsivity: Math.max(0, Math.min(10, impulsivity + traitDeltas.impulsivity)),
    thoroughness: Math.max(0, Math.min(10, thoroughness + traitDeltas.thoroughness)),
  };

  const milestones = [];
  if (trust < 8 && newTraits.trust >= 8) milestones.push('fully committed user');
  if (thoroughness < 8 && newTraits.thoroughness >= 8) milestones.push('obsessive filler');

  const compareNote = hasRobin && hasLeo
    ? 'Both Robin and Leo profiles loaded on compare page.'
    : hasRobin || hasLeo
    ? 'Only one partner profile appeared on compare — multi-partner state may not be persisting correctly.'
    : 'Neither imported partner profile appeared on compare — import state lost on navigation.';

  const story = `Iris opened the app on her desktop and moved through each page with her characteristic patience. She visited her own profile and worked through a dozen kink entries carefully, reading each one before selecting. She arrived at compare expecting to see Robin and Leo side by side — ${hasRobin && hasLeo ? 'and both profiles were there, a clean cross-persona encounter rendered correctly.' : 'but the compare view did not surface both partners as expected.'} She checked contract and session pages before closing, satisfied with the depth of her exploration. ${newRoutes.length > 0 ? `She discovered ${newRoutes.join(' and ')} for the first time.` : 'No new routes this session.'} Trust moved to ${newTraits.trust} and thoroughness to ${newTraits.thoroughness}.`;

  const report = {
    persona: 'iris',
    pass: allPass.length,
    fail: allFails.length,
    pages_visited: pagesVisited,
    new_routes: newRoutes,
    console_errors: consoleErrors.slice(0, 10),
    observations: {
      story,
      pass: allPass,
      fail: allFails,
      notes: `Session ${sessionNum}: interaction: iris_compares_robin_and_leo. Desktop 1280px. Robin visible: ${hasRobin}, Leo visible: ${hasLeo}. Kinks filled: ${kinksInteracted}. New routes: ${newRoutes.join(', ') || 'none'}.`,
      interaction: 'iris_compares_robin_and_leo',
    },
    milestones,
    trait_deltas: traitDeltas,
    new_traits: newTraits,
    compare_result: { hasRobin, hasLeo },
  };

  await ctx.close();
  console.log(`  Iris: ${allPass.length} pass, ${allFails.length} fail`);
  return { report, newTraits, finalState, sessionNum };
}

// ========== MAIN ==========
async function main() {
  const browser = await chromium.launch({ headless: true });
  const results = {};

  try {
    // Robin
    try {
      results.robin = await runRobin(browser);
    } catch (e) {
      console.error('Robin session failed:', e.message);
      results.robin = { error: e.message };
    }

    // Leo
    try {
      results.leo = await runLeo(browser);
    } catch (e) {
      console.error('Leo session failed:', e.message);
      results.leo = { error: e.message };
    }

    // Iris
    try {
      results.iris = await runIris(browser);
    } catch (e) {
      console.error('Iris session failed:', e.message);
      results.iris = { error: e.message };
    }

  } finally {
    await browser.close();
  }

  // Write results to file for post-processing
  fs.writeFileSync('/tmp/sim-results.json', JSON.stringify({ results, screenshots: screenshotResults }, null, 2));
  console.log('\n✅ Playwright runs complete. Results written to /tmp/sim-results.json');
  return results;
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
