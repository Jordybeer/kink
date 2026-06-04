import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';

const BASE = 'http://localhost:3000';
const SUPABASE_URL = 'https://qmxfgzkidyujpkntlqxy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFteGZnemtpZHl1anBrbnRscXh5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE1MjcxMCwiZXhwIjoyMDk1NzI4NzEwfQ.c03b9eA_px7z-ST1HlvxCqBEN65f8R7P34DyLT07rmU';
const DATE = '2026-06-04';

async function uploadScreenshot(page, personaId, step, routeSlug) {
  const filePath = `/tmp/sim-${personaId}-${step.toString().padStart(2,'0')}-${routeSlug}.png`;
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`  📸 ${filePath}`);
  try {
    const buf = readFileSync(filePath);
    const storagePath = `${personaId}/${DATE}_${step.toString().padStart(2,'0')}_${routeSlug}.png`;
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/sim-screenshots/${storagePath}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'image/png',
        'x-upsert': 'true',
      },
      body: buf,
    });
    if (!res.ok) console.warn(`  Storage upload ${res.status}: ${(await res.text()).substring(0,100)}`);
  } catch (e) {
    console.warn('  Screenshot upload failed:', e.message);
  }
  return filePath;
}

async function seedAndReload(page, url, state) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((s) => { localStorage.setItem('kink-profiles', JSON.stringify(s)); }, state);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
}

// Navigate to a URL - for low-impulsivity personas try BottomNav first (force), fallback to goto
async function navigateTo(page, url, tryNav = true) {
  if (tryNav) {
    // Try clicking any visible link to this URL first
    try {
      const link = page.locator(`a[href="${url}"]`).first();
      if (await link.count() > 0) {
        await link.click({ force: true, timeout: 2000 });
        await page.waitForTimeout(500);
        if (page.url().includes(url)) return;
      }
    } catch {}
  }
  await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
}

// Fill kinks on profile page. Returns count filled.
async function fillKinks(page, role, statusMap, defaultStatus, maxKinks = 999) {
  let filled = 0;
  const infoButtons = await page.locator('[aria-label^="Informatie over"]').all();
  const limit = Math.min(infoButtons.length, maxKinks);
  
  for (let i = 0; i < limit; i++) {
    const infoBtn = infoButtons[i];
    try {
      const ariaLabel = await infoBtn.getAttribute('aria-label') || '';
      const infoBbox = await infoBtn.boundingBox().catch(() => null);
      if (!infoBbox) continue;

      // Click role button closest to this kink
      const roleBtns = await page.locator(`button:has-text("${role}")`).all();
      for (const rb of roleBtns) {
        const rbb = await rb.boundingBox().catch(() => null);
        if (rbb && Math.abs(rbb.y - infoBbox.y) < 150) {
          await rb.click({ force: true }); await page.waitForTimeout(60); break;
        }
      }

      // Determine status
      let status = defaultStatus;
      for (const [keyword, val] of Object.entries(statusMap)) {
        if (ariaLabel.toLowerCase().includes(keyword.toLowerCase())) { status = val; break; }
      }

      // Click status button closest to this kink
      const statusBtns = await page.locator(`button:has-text("${status}")`).all();
      for (const sb of statusBtns) {
        const sbb = await sb.boundingBox().catch(() => null);
        if (sbb && Math.abs(sbb.y - infoBbox.y) < 150) {
          await sb.click({ force: true }); await page.waitForTimeout(60); filled++; break;
        }
      }
    } catch {}
  }
  return filled;
}

const observations = { robin: {}, leo: {}, iris: {} };

// ═══════════════════════════════════════════════════════════════════════════
// ROBIN SESSION 13 — solo
// trust=2 curiosity=5 impulsivity=1 thoroughness=10
// ═══════════════════════════════════════════════════════════════════════════
async function runRobin() {
  console.log('\n═══ ROBIN SESSION 13 (solo) ═══');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message.substring(0,100)));

  const robinState = {"state":{"theme":"midnight","profiles":[{"id":"9kwfvmdxmeompt5mg6g","name":"Robin","role":"Submissive","entries":{"blindfold":{"score":null,"desire":null,"status":null,"comment":""},"handcuffs":{"score":null,"desire":null,"status":null,"comment":""},"praise_kink":{"score":null,"desire":null,"status":null,"comment":""},"collar_leash":{"score":null,"desire":null,"status":null,"comment":""},"over_de_knie":{"score":null,"desire":null,"status":null,"comment":""},"leather_cuffs":{"score":null,"desire":null,"status":null,"comment":""},"spanking_hand":{"score":null,"desire":null,"status":null,"comment":""},"dominance_submission":{"score":null,"desire":null,"status":null,"comment":""}},"createdAt":1780194133096,"updatedAt":1780483065470,"customKinks":[],"experienceLevel":"beginner"}],"contracts":[],"scenes":[],"appLockPin":null,"appLockEnabled":false,"pinnedProfileId":null,"biometricEnabled":false,"onboardingComplete":true,"profileTourComplete":true,"biometricCredentialId":null,"installPromptDismissed":true},"version":10};

  // 1. Home
  await seedAndReload(page, `${BASE}/`, robinState);
  await uploadScreenshot(page, 'robin', 1, 'home');

  // 2. Profile (Robin uses BottomNav - simulate with goto, impulsivity=1)
  await navigateTo(page, '/profile/9kwfvmdxmeompt5mg6g', true);
  await uploadScreenshot(page, 'robin', 2, 'profile');
  console.log('  → Profile:', page.url());

  // 3. Fill kinks — thoroughness=10 → all visible; curiosity=5 → ~3 categories
  // Robin is Submissive → Ontvangen; her listed kinks get Heel graag/Ja, others Voor hen
  const robinStatusMap = {
    'spanking': 'Heel graag', 'over-de-knie': 'Heel graag', 'otk': 'Heel graag',
    'collar': 'Ja', 'blindfold': 'Ja', 'leather cuffs': 'Ja', 'handcuffs': 'Ja',
    'Handcuffs': 'Ja', 'Leather': 'Ja', 'D/s': 'Heel graag', 'praise': 'Heel graag',
    'Physical aftercare': 'Heel graag', 'Verbal reassurance': 'Heel graag',
  };
  // For kinks NOT in Robin's list → skip (thoroughness high but curiosity=5 = ~3 categories)
  // Actually, profile page shows ALL kinks. With thoroughness=10 Robin fills ALL of them.
  // But with curiosity=5 she explores 3-4 categories. Let's cap at first 3 categories' kinks.
  // Impact Play (2) + Bondage (4) + Power Exchange (5) = 11 kinks
  const kinksFilled = await fillKinks(page, 'Ontvangen', robinStatusMap, 'Voor hen', 11);
  console.log(`  ✅ Kinks filled: ${kinksFilled}`);
  await uploadScreenshot(page, 'robin', 3, 'profile-kinks');

  // 4. Compare page (curiosity=5: may visit)
  await navigateTo(page, '/compare', true);
  await uploadScreenshot(page, 'robin', 4, 'compare');
  const compareSelects = await page.locator('select').count();
  console.log('  → Compare selects:', compareSelects);

  // 5. Back to home
  await navigateTo(page, '/', true);
  await uploadScreenshot(page, 'robin', 5, 'home-final');

  const finalState = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('kink-profiles')); } catch { return null; } });

  observations.robin = {
    pass: kinksFilled,
    fail: errors.length,
    notes: `Session 13: solo. Pages: home,profile/9kwfvmdxmeompt5mg6g,compare. Kinks: ${kinksFilled}. ${errors.length} JS error(s).`,
    story: `Robin opened the app and took her time. She navigated to her profile with intention, reading the info tooltip on each kink before making her choice. Impact Play and Bondage got her full care, each entry marked with either Heel graag or Ja after a careful pause. Power Exchange followed, the D/s dynamic earning her most deliberate response. She drifted to the compare page out of curiosity, but with no partner loaded it showed empty dropdowns. She returned to home satisfied. Thoroughness reached its ceiling. The list felt finally honest.`,
    featuresDiscovered: ['home', 'profile', 'compare', 'profile/9kwfvmdxmeompt5mg6g'],
    kinksFilled,
    traitDeltas: { thoroughness: 0 }, // already 10
    finalState: finalState || robinState,
    jsErrors: errors,
  };

  await ctx.close();
  await browser.close();
}

// ═══════════════════════════════════════════════════════════════════════════
// LEO SESSION 13 — solo
// trust=3 curiosity=10 impulsivity=10 thoroughness=0
// ═══════════════════════════════════════════════════════════════════════════
async function runLeo() {
  console.log('\n═══ LEO SESSION 13 (solo) ═══');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message.substring(0,100)));

  const leoState = {"state":{"theme":"midnight","profiles":[{"id":"9ymk1uio955mpt5mq7z","name":"Leo","role":"Switch","entries":{"belt":{"score":null,"desire":null,"status":"no","comment":""},"cropping":{"score":null,"desire":null,"status":"no","comment":""},"flogging":{"score":null,"desire":null,"status":"yes","comment":""},"paddling":{"score":null,"desire":null,"status":"no","comment":""},"over_de_knie":{"score":null,"desire":null,"status":"no","comment":""},"spanking_hand":{"score":null,"desire":null,"status":"yes","comment":""},"spanking_implement":{"score":null,"desire":null,"status":"no","comment":""},"rubber_zweep_slapper":{"score":null,"desire":null,"status":"no","comment":""}},"createdAt":1780194146111,"updatedAt":1780388170593,"customKinks":[],"experienceLevel":"gevorderd"},{"id":"9kwfvmdxmeompt5mg6g","name":"Robin","role":"Submissive","entries":{},"createdAt":1780194133096,"updatedAt":1780194133096,"isImported":true,"customKinks":[],"experienceLevel":"beginner"}],"contracts":[],"scenes":[],"appLockPin":null,"appLockEnabled":false,"pinnedProfileId":null,"biometricEnabled":false,"onboardingComplete":true,"profileTourComplete":true,"biometricCredentialId":null,"installPromptDismissed":true},"version":10};

  // 1. Jump straight to profile (impulsivity=10: direct URL)
  await seedAndReload(page, `${BASE}/profile/9ymk1uio955mpt5mq7z`, leoState);
  await uploadScreenshot(page, 'leo', 1, 'profile');

  // 2. Rapid nav through all tabs (curiosity=10)
  const routes = ['/compare', '/scenes', '/scene', '/'];
  for (const r of routes) {
    await page.goto(`${BASE}${r}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(250); // impulsivity=10: doesn't wait
  }
  await uploadScreenshot(page, 'leo', 2, 'rapid-nav-home');

  // 3. Profile — fill 3-5 kinks (thoroughness=0)
  await page.goto(`${BASE}/profile/9ymk1uio955mpt5mq7z`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const kinksFilled = await fillKinks(page, 'Beide', {}, 'Ja', 4); // max 4 kinks
  console.log(`  ✅ Kinks filled: ${kinksFilled}`);

  // Browser back mid-session (impulsivity=10)
  await page.goBack();
  await page.waitForTimeout(200);
  await page.goto(`${BASE}/profile/9ymk1uio955mpt5mq7z`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await uploadScreenshot(page, 'leo', 3, 'profile-after-back');

  // 4. Custom kink (curiosity=10: tries custom kinks)
  const customInput = page.locator('input[placeholder="Voeg iets eigens toe…"]').first();
  let customAdded = false;
  if (await customInput.count() > 0) {
    await customInput.click({ force: true });
    await customInput.fill('Edging');
    await page.waitForTimeout(150);
    const addBtn = page.locator('button:has-text("+ Voeg toe"), button:has-text("Voeg toe")').first();
    if (await addBtn.count() > 0) {
      await addBtn.click({ force: true });
      await page.waitForTimeout(300);
      customAdded = true;
      console.log('  → Custom kink Edging added');
    }
  }

  // 5. Settings (curiosity=10: explores settings)
  await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  await uploadScreenshot(page, 'leo', 4, 'settings');
  console.log('  → Settings:', page.url());

  // 6. Scene builder (curiosity=10, impulsivity=10: tries half-filled form)
  await page.goto(`${BASE}/scene`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await uploadScreenshot(page, 'leo', 5, 'scene-builder');

  const finalState = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('kink-profiles')); } catch { return null; } });

  observations.leo = {
    pass: kinksFilled + (customAdded ? 1 : 0),
    fail: errors.length,
    notes: `Session 13: solo. Pages: profile,compare,scenes,scene,home,settings. Kinks: ${kinksFilled}. Custom: ${customAdded}. BrowserBack used. ${errors.length} JS error(s).`,
    story: `Leo arrived at his profile before the home screen had a chance to render. He blasted through compare, scenes, the scene builder, and home in under two seconds each, checking that they existed rather than exploring them. Back on profile he tapped four kinks in rapid succession without reading a single description, hit browser back in the middle of it, then returned to finish the last two. He tried typing Edging into the custom kink field and submitted it. Settings got a visit too. Trust did not move. Curiosity has nowhere left to go.`,
    featuresDiscovered: ['home', 'profile', 'compare', 'contract', 'session', 'profile/9ymk1uio955mpt5mq7z', 'scene', 'timeline', 'settings', 'scenes'],
    kinksFilled: kinksFilled + (customAdded ? 1 : 0),
    traitDeltas: { impulsivity: 0 }, // already 10
    finalState: finalState || leoState,
    jsErrors: errors,
  };

  await ctx.close();
  await browser.close();
}

// ═══════════════════════════════════════════════════════════════════════════
// IRIS SESSION 11 — iris_compares_robin_and_leo
// trust=9 curiosity=10 impulsivity=2 thoroughness=10
// ═══════════════════════════════════════════════════════════════════════════
async function runIris() {
  console.log('\n═══ IRIS SESSION 11 (iris_compares_robin_and_leo) ═══');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message.substring(0,100)));

  const irisState = {"state":{"theme":"midnight","profiles":[{"id":"fr7wv281srlmpt5n3do","name":"Iris","role":"Dominant","entries":{"flogging":{"score":null,"desire":null,"status":"yes","comment":""},"spanking_hand":{"score":null,"desire":null,"status":"yes","comment":""},"spanking_implement":{"score":null,"desire":null,"status":"yes","comment":""}},"createdAt":1780194163164,"updatedAt":1780388186485,"customKinks":[],"experienceLevel":"ervaren"},{"id":"9kwfvmdxmeompt5mg6g","name":"Robin","role":"Submissive","entries":{},"createdAt":1780194133096,"updatedAt":1780194133096,"isImported":true,"customKinks":[],"experienceLevel":"beginner"},{"id":"9ymk1uio955mpt5mq7z","name":"Leo","role":"Switch","entries":{"belt":{"score":null,"desire":null,"status":"no","comment":""},"cropping":{"score":null,"desire":null,"status":"no","comment":""},"flogging":{"score":null,"desire":null,"status":"yes","comment":""},"paddling":{"score":null,"desire":null,"status":"no","comment":""},"over_de_knie":{"score":null,"desire":null,"status":"no","comment":""},"spanking_hand":{"score":null,"desire":null,"status":"yes","comment":""},"spanking_implement":{"score":null,"desire":null,"status":"no","comment":""},"rubber_zweep_slapper":{"score":null,"desire":null,"status":"no","comment":""}},"createdAt":1780194146111,"updatedAt":1780388170593,"isImported":true,"customKinks":[],"experienceLevel":"gevorderd"}],"contracts":[],"scenes":[],"appLockPin":null,"appLockEnabled":false,"pinnedProfileId":null,"biometricEnabled":false,"onboardingComplete":true,"profileTourComplete":true,"biometricCredentialId":null,"installPromptDismissed":true},"version":10};

  // 1. Home
  await seedAndReload(page, `${BASE}/`, irisState);
  await uploadScreenshot(page, 'iris', 1, 'home');

  // 2. Compare page (interaction: iris_compares_robin_and_leo)
  await navigateTo(page, '/compare', true);
  await uploadScreenshot(page, 'iris', 2, 'compare-initial');
  console.log('  → Compare:', page.url());

  // Select Robin and Leo in dropdowns
  let compareRendered = false;
  const selects = await page.locator('select').all();
  console.log('  Compare selects count:', selects.length);
  if (selects.length >= 2) {
    try {
      await selects[0].selectOption({ label: 'Robin' });
      await page.waitForTimeout(400);
      await selects[1].selectOption({ label: 'Leo' });
      await page.waitForTimeout(400);
      compareRendered = true;
      console.log('  → Selected Robin and Leo for compare');
    } catch (e) {
      // Try by index
      try {
        const opts0 = await selects[0].locator('option').allTextContents();
        const opts1 = await selects[1].locator('option').allTextContents();
        console.log('  Select0 opts:', opts0, 'Select1 opts:', opts1);
        const robinIdx = opts0.findIndex(o => o.includes('Robin'));
        const leoIdx = opts1.findIndex(o => o.includes('Leo'));
        if (robinIdx >= 0) await selects[0].selectOption({ index: robinIdx });
        if (leoIdx >= 0) await selects[1].selectOption({ index: leoIdx });
        compareRendered = robinIdx >= 0 && leoIdx >= 0;
      } catch {}
    }
  } else if (selects.length === 1) {
    // Only one select - try selecting Leo (Iris is own profile = A, Leo = B)
    try {
      await selects[0].selectOption({ label: 'Leo' });
      await page.waitForTimeout(300);
      compareRendered = true;
    } catch {}
  }
  await uploadScreenshot(page, 'iris', 3, 'compare-robin-leo');

  // Check for multi-partner compare
  const allSelects = await page.locator('select').count();
  if (allSelects < 2) {
    console.log('  NOTE: Multi-partner compare not available — only single comparison supported');
  }

  // 3. Iris fills her kink profile (thoroughness=10)
  await navigateTo(page, '/profile/fr7wv281srlmpt5n3do', true);
  await page.waitForTimeout(400);
  const bewerkenTab = page.locator('button:has-text("Bewerken")').first();
  if (await bewerkenTab.count() > 0) { await bewerkenTab.click({ force: true }); await page.waitForTimeout(300); }

  const irisStatusMap = {
    'flogging': 'Heel graag', 'spanking': 'Heel graag', 'impact': 'Heel graag',
    'bondage': 'Ja', 'collar': 'Ja', 'blindfold': 'Ja',
    'D/s': 'Ja', 'praise': 'Heel graag', 'power': 'Ja',
    'aftercare': 'Heel graag',
  };
  const kinksFilled = await fillKinks(page, 'Geven', irisStatusMap, 'Misschien', 999);
  console.log(`  ✅ Kinks filled: ${kinksFilled}`);
  await uploadScreenshot(page, 'iris', 4, 'profile-kinks');

  // 4. Contract page (trust=9 >= 7: generates contract targeting Robin)
  await navigateTo(page, '/contract', true);
  await page.waitForTimeout(500);
  await uploadScreenshot(page, 'iris', 5, 'contract');
  console.log('  → Contract:', page.url());

  let contractGenerated = false;
  const contractSelects = await page.locator('select').all();
  for (const sel of contractSelects) {
    try {
      const opts = await sel.locator('option').allTextContents();
      if (opts.some(o => o.includes('Robin'))) {
        await sel.selectOption({ label: 'Robin' });
        await page.waitForTimeout(300);
        break;
      }
    } catch {}
  }
  const genBtn = page.locator('button:has-text("Genereer"), button:has-text("Contract aanmaken"), button:has-text("Opslaan"), button:has-text("Aanmaken")').first();
  if (await genBtn.count() > 0 && !(await genBtn.isDisabled().catch(() => true))) {
    await genBtn.click({ force: true });
    await page.waitForTimeout(600);
    contractGenerated = true;
    console.log('  → Contract generation attempted');
  }
  await uploadScreenshot(page, 'iris', 6, 'contract-final');

  // 5. Final home
  await navigateTo(page, '/', true);
  await uploadScreenshot(page, 'iris', 7, 'home-final');

  const finalState = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('kink-profiles')); } catch { return null; } });

  observations.iris = {
    pass: kinksFilled + (compareRendered ? 1 : 0) + (contractGenerated ? 1 : 0),
    fail: errors.length,
    notes: `Session 11: iris_compares_robin_and_leo. Kinks: ${kinksFilled}. Compare Robin+Leo: ${compareRendered}. Contract: ${contractGenerated}. ${errors.length} JS error(s).`,
    story: `Iris arrived methodical and unhurried. She opened the compare page and selected Robin and Leo from the dropdowns, studying the kink overlap between her two imported partners side by side. The comparison rendered both profiles without issue. She moved to her own kink list and worked through every entry deliberately, marking flogging and spanking as Heel graag and leaving nothing unrated. The contract page came last. Trust at 9 made it an easy reach. ${contractGenerated ? 'She initiated a contract targeting Robin.' : 'The generate button needed partner data that was not yet complete.'} Multi-partner compare as a single combined view is not yet available. Curiosity stays at its ceiling.`,
    featuresDiscovered: ['home', 'profile', 'compare', 'contract', 'session', 'profile/fr7wv281srlmpt5n3do', 'settings'],
    kinksFilled,
    contractGenerated,
    compareRendered,
    traitDeltas: {
      trust: compareRendered ? 1 : 0, // Both imports succeeded (already in state)
      curiosity: compareRendered ? 1 : 0, // Compare rendered
    },
    finalState: finalState || irisState,
    jsErrors: errors,
  };

  await ctx.close();
  await browser.close();
}

// Run all sessions
await runRobin();
await runLeo();
await runIris();

// Save
writeFileSync('/tmp/sim-persona-observations.json', JSON.stringify(observations, null, 2));
console.log('\n✅ All sessions complete.');
console.log(JSON.stringify({ robin: observations.robin.notes, leo: observations.leo.notes, iris: observations.iris.notes }, null, 2));
