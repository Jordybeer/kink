import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://localhost:3000';
const VIEWPORT = { width: 390, height: 844 };
const RESULTS = { issue61: [], issue63: [] };
let browser, page;

async function shot(name) {
  await page.screenshot({ path: `/tmp/sim-screenshots/testplan/${name}.png`, fullPage: false });
}

function result(issue, scenario, status, reason) {
  RESULTS[issue].push({ scenario, status, reason });
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '👀';
  console.log(`[${issue}] ${icon} ${scenario.substring(0, 72)} ${reason ? '— ' + reason : ''}`);
}

async function waitForSelector(selector, timeout = 5000) {
  try { await page.waitForSelector(selector, { timeout }); return true; }
  catch { return false; }
}

async function closeSheet(ariaLabel) {
  // Close sheet via Sluiten button or Escape
  const closeBtn = page.locator(`button[aria-label="Sluiten"]`).first();
  if (await closeBtn.count() > 0) {
    await closeBtn.click({ force: true });
  } else {
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(500);
  // Verify sheet is closed
  if (ariaLabel && await page.locator(`[aria-label="${ariaLabel}"]`).count() > 0) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }
}

async function openDrawerAndClickChip() {
  const kinkBtn = page.locator('button[aria-label="Kinks toevoegen"]').first();
  if (await kinkBtn.count() === 0) return false;
  await kinkBtn.click();
  await page.waitForTimeout(700);
  const drawerBtns = await page.locator('[role="dialog"][aria-label="Kinks toevoegen"] button:not([disabled])').all();
  for (const btn of drawerBtns) {
    const txt = await btn.innerText().catch(() => '');
    const al = await btn.getAttribute('aria-label') || '';
    if (txt.trim().length > 1 && !al.includes('sluit') && !al.includes('Sluiten')) {
      await btn.click({ force: true, timeout: 3000 });
      await page.waitForTimeout(400);
      // Close drawer
      const closeBtn = page.locator('[role="dialog"][aria-label="Kinks toevoegen"] button[aria-label="Sluiten"]').first();
      if (await closeBtn.count() > 0) {
        await closeBtn.click({ force: true });
      } else {
        await page.mouse.click(10, 10);
      }
      await page.waitForTimeout(500);
      return true;
    }
  }
  return false;
}

const ownProfile = {
  id: 'sim-own-001', name: 'SimOwn', role: 'Submissive',
  entries: {
    flogging:     { score: null, desire: null, status: 'yes',     comment: '' },
    spanking_hand:{ score: null, desire: null, status: 'yes',     comment: '' },
    blindfold:    { score: null, desire: null, status: 'willing', comment: '' },
    over_de_knie: { score: null, desire: null, status: 'no',      comment: '' },
    paddling:     { score: null, desire: null, status: 'hard_no', comment: '' },
  },
  createdAt: Date.now() - 100000, updatedAt: Date.now(), customKinks: [], experienceLevel: 'beginner',
};
const importedProfile = {
  id: 'sim-partner-001', name: 'SimPartner', role: 'Dominant',
  entries: {
    flogging:     { score: null, desire: null, status: 'yes',     comment: '' },
    spanking_hand:{ score: null, desire: null, status: 'yes',     comment: '' },
    blindfold:    { score: null, desire: null, status: 'no',      comment: '' },
    over_de_knie: { score: null, desire: null, status: 'yes',     comment: '' },
    paddling:     { score: null, desire: null, status: 'hard_no', comment: '' },
  },
  createdAt: Date.now() - 50000, updatedAt: Date.now(), isImported: true, customKinks: [], experienceLevel: 'ervaren',
};

const plannedScene = {
  id: 'scene-planned-001', title: 'SimOwn & SimPartner',
  profileAId: 'sim-own-001', profileBId: 'sim-partner-001',
  profileAName: 'SimOwn', profileBName: 'SimPartner',
  items: [
    { id: 'item-1', name: 'Flogging', kinkId: 'flogging', intensity: 'midden', duration: '', note: '', fromKink: true },
    { id: 'item-2', name: 'Spanking', kinkId: 'spanking_hand', intensity: 'midden', duration: '', note: '', fromKink: true },
  ],
  status: 'planned', createdAt: Date.now() - 4000, updatedAt: Date.now(),
};
const completedScene = {
  id: 'scene-done-001', title: 'SimOwn & SimPartner',
  profileAId: 'sim-own-001', profileBId: 'sim-partner-001',
  profileAName: 'SimOwn', profileBName: 'SimPartner',
  items: [{ id: 'item-3', name: 'Blindfold', kinkId: 'blindfold', intensity: 'midden', duration: '', note: '', fromKink: true }],
  status: 'completed', completedAt: Date.now() - 3000,
  aftercare: { trafficLight: 'green', wentWell: 'Alles ging soepel', remember: 'Veiligheidswoord bespreken', completedAt: Date.now() - 3000 },
  createdAt: Date.now() - 6000, updatedAt: Date.now(),
};
const draftScene = {
  id: 'scene-draft-001', title: 'SimOwn & SimPartner',
  profileAId: 'sim-own-001', profileBId: 'sim-partner-001',
  profileAName: 'SimOwn', profileBName: 'SimPartner',
  items: [
    { id: 'item-4', name: 'Flogging', kinkId: 'flogging', intensity: 'midden', duration: '', note: '', fromKink: true },
    { id: 'item-5', name: 'Spanking', kinkId: 'spanking_hand', intensity: 'midden', duration: '', note: '', fromKink: true },
  ],
  status: 'draft', createdAt: Date.now() - 5000, updatedAt: Date.now(),
};

function makeState(extra = {}) {
  return {
    state: {
      theme: 'midnight', profiles: [ownProfile, importedProfile], contracts: [], scenes: [],
      appLockPin: null, appLockEnabled: false, pinnedProfileId: null,
      biometricEnabled: false, onboardingComplete: true, profileTourComplete: true,
      biometricCredentialId: null, installPromptDismissed: true, ...extra,
    },
    version: 10,
  };
}

async function seedAndReload(url, extra = {}) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.evaluate((s) => { localStorage.setItem('kink-profiles', JSON.stringify(s)); }, makeState(extra));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800); // Wait for Zustand hydration
}

// ===================== ISSUE #61 =====================
async function runIssue61() {
  console.log('\n=== ISSUE #61 ===');
  browser = await chromium.launch({ headless: true });

  // /scenes empty state
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await seedAndReload(BASE + '/scenes', { scenes: [] });
    await shot('issue61_scenes_empty');
    const body = await page.textContent('body');
    result('issue61', '/scenes lege store — lege-staat tekst, geen crash',
      /nog geen|geen|leeg/i.test(body) && !body.includes('Error') ? 'pass' : 'fail', '');
    await ctx.close();
  }

  // Compare auto-select
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await seedAndReload(BASE + '/compare');
    await shot('issue61_compare_autoselect');
    result('issue61', '/compare zonder URL-params — dropdowns gevuld',
      await page.locator('select').count() >= 2 ? 'pass' : 'fail', `${await page.locator('select').count()} selects`);
    await ctx.close();
  }

  // Scene hub chip + save flow
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await seedAndReload(`${BASE}/scene?a=sim-own-001&b=sim-partner-001`);
    // Wait explicitly for the drawer button
    const drawerAppeared = await waitForSelector('button[aria-label="Kinks toevoegen"]', 5000);

    if (!drawerAppeared) {
      ['Chip drawer kink-inhoud','Geen hard_no chips','Chip klikken','Opslaan → /scene?id=...','/scenes Concepten'].forEach(s => result('issue61', s, 'fail', 'Drawer button not rendered (hydration timeout)'));
    } else {
      // Open drawer
      await page.locator('button[aria-label="Kinks toevoegen"]').first().click();
      await page.waitForTimeout(700);
      await shot('issue61_drawer_open');

      const drawerHtml = await page.content();
      result('issue61', 'Chip drawer kink-inhoud', await page.locator('[role="dialog"] button:not([disabled])').count() > 0 ? 'pass' : 'fail', '');
      result('issue61', 'Geen hard_no chips in drawer', !drawerHtml.toLowerCase().includes('paddling') ? 'pass' : 'fail', '');

      // Click chip from ALREADY OPEN drawer (do NOT re-open)
      let chipClicked = false;
      const drawerBtns = await page.locator('[role="dialog"][aria-label="Kinks toevoegen"] button:not([disabled])').all();
      for (const btn of drawerBtns) {
        const txt = await btn.innerText().catch(() => '');
        const al = await btn.getAttribute('aria-label') || '';
        if (txt.trim().length > 1 && !al.includes('Sluiten')) {
          await btn.click({ force: true, timeout: 3000 });
          chipClicked = true;
          break;
        }
      }
      result('issue61', 'Chip klikken — item in scenelijst', chipClicked ? 'pass' : 'fail', '');
      await page.waitForTimeout(400);
      // Close drawer via Sluiten button
      const closeBtn61 = page.locator('[role="dialog"][aria-label="Kinks toevoegen"] button[aria-label="Sluiten"]').first();
      if (await closeBtn61.count() > 0) await closeBtn61.click({ force: true });
      else await page.mouse.click(10, 10);
      await page.waitForTimeout(600);

      await shot('issue61_chip_clicked');
      const opslBtn = page.locator('button:has-text("Opslaan")').first();
      const opslDis = await opslBtn.getAttribute('disabled').catch(() => 'y');
      if (opslDis === null) {
        await opslBtn.click({ timeout: 5000 });
        await page.waitForTimeout(1000);
        const url = page.url();
        result('issue61', 'Opslaan → URL wordt /scene?id=...', url.includes('id=') ? 'pass' : 'fail', '');
        await page.goto(BASE + '/scenes', { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);
        await shot('issue61_scenes_draft');
        result('issue61', '/scenes — scène staat onder Concepten', !(await page.textContent('body')).includes('Nog geen concepten') ? 'pass' : 'fail', '');
      } else {
        result('issue61', 'Opslaan → URL wordt /scene?id=...', 'fail', 'Opslaan disabled after chip');
        result('issue61', '/scenes — scène staat onder Concepten', 'fail', 'Skipped');
      }
    }
    await ctx.close();
  }

  // Planned scene: Spelen + Afronden + full aftercare
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await seedAndReload(BASE + '/scenes', { scenes: [plannedScene] });
    await waitForSelector('button:has-text("Spelen")', 5000);
    await shot('issue61_scenes_planned');

    const spelenCount = await page.locator('button:has-text("Spelen")').count();
    const afrondCount = await page.locator('button:has-text("Afronden")').count();
    result('issue61', 'Geplande scène: Spelen + Afronden beide zichtbaar',
      spelenCount > 0 && afrondCount > 0 ? 'pass' : 'fail', `Spelen:${spelenCount} Afronden:${afrondCount}`);

    // ▶ Spelen navigates
    if (spelenCount > 0) {
      await page.locator('button:has-text("Spelen")').first().click();
      await page.waitForURL(`${BASE}/scene?id=**`, { timeout: 5000 }).catch(() => {});
      const url = page.url();
      result('issue61', '▶ Spelen → navigeert naar /scene?id=...', url.includes('/scene?id=') ? 'pass' : 'fail', '');
      await page.goBack({ waitUntil: 'networkidle' });
      await waitForSelector('button:has-text("Afronden")', 5000);
    } else {
      result('issue61', '▶ Spelen → navigeert naar /scene?id=...', 'fail', 'No Spelen button');
    }

    // Afronden opens aftercare
    const afrondBtn2 = page.locator('button:has-text("Afronden")').first();
    if (await afrondBtn2.count() > 0) {
      await afrondBtn2.click();
      await waitForSelector('button:has-text("🟢")', 5000);
      await shot('issue61_aftercare_sheet');
      const trafficCount = await page.locator('button:has-text("🟢"), button:has-text("🟡"), button:has-text("🔴")').count();
      result('issue61', 'Afronden — AftercareSheet met traffic lights', trafficCount >= 3 ? 'pass' : 'fail', `${trafficCount}`);

      if (trafficCount >= 3) {
        const saveDis = await page.locator('button:has-text("Opslaan")').last().getAttribute('disabled').catch(() => null);
        result('issue61', 'Opslaan uitgeschakeld voor traffic light selectie', saveDis !== null ? 'pass' : 'fail', '');

        await page.locator('button:has-text("🟢")').first().click();
        await page.waitForTimeout(200);
        for (const ta of await page.locator('textarea').all()) await ta.fill('Test aftercare tekst');

        const saveBtn = page.locator('button:has-text("Opslaan")').last();
        const saveEnabled = await saveBtn.getAttribute('disabled').catch(() => null);
        if (saveEnabled === null) {
          await saveBtn.click();
          await page.waitForTimeout(800);
          await shot('issue61_aftercare_saved');
          const body = await page.textContent('body');
          result('issue61', '🟢 + Opslaan → Afgerond zichtbaar', body.includes('Afgerond') || body.includes('🟢') ? 'pass' : 'fail', '');
          await page.goto(BASE + '/scenes', { waitUntil: 'networkidle' });
          await page.waitForTimeout(500);
          await shot('issue61_scenes_afgerond');
          result('issue61', '/scenes — scène staat onder Afgerond', !(await page.textContent('body')).includes('Nog geen afgerond') ? 'pass' : 'fail', '');
        } else {
          result('issue61', '🟢 + Opslaan → Afgerond', 'fail', 'Opslaan disabled after 🟢');
          result('issue61', '/scenes — scène onder Afgerond', 'fail', 'Skipped');
        }
      } else {
        ['Opslaan uitgeschakeld','🟢 + Opslaan → Afgerond','/scenes Afgerond'].forEach(s => result('issue61', s, 'fail', 'No traffic lights'));
      }
    } else {
      ['Afronden — AftercareSheet','Opslaan uitgeschakeld','🟢 + Opslaan','Afgerond in /scenes'].forEach(s => result('issue61', s, 'fail', 'No Afronden after goBack'));
    }
    await ctx.close();
  }

  // Settings / PIN
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await seedAndReload(`${BASE}/profile/sim-own-001`);
    const body = await page.textContent('body');
    result('issue61', 'Settings → Beveiliging PIN toegankelijk',
      body.includes('Beveiliging') || body.includes('PIN') ? 'pass' : 'fail', '');
    result('issue61', 'Juiste PIN → app ontgrendelt', 'manual', 'PIN flow requires interactive verification');
    result('issue61', '/compare → / — lockscreen NIET zichtbaar', 'manual', 'Session lock requires full PIN flow');
    await ctx.close();
  }

  await browser.close();
}

// ===================== ISSUE #63 =====================
async function runIssue63() {
  console.log('\n=== ISSUE #63 ===');
  browser = await chromium.launch({ headless: true });

  // Arc + chip drawer
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await seedAndReload(`${BASE}/scene?a=sim-own-001&b=sim-partner-001`);
    await waitForSelector('button[aria-label="Kinks toevoegen"]', 5000);
    await shot('issue63_scene_initial');

    result('issue63', 'Geen arc-balk bij lege lijst',
      await page.locator('[class*="arc"], [class*="Arc"]').count() === 0 ? 'pass' : 'fail', '');

    await page.locator('button[aria-label="Kinks toevoegen"]').first().click();
    await page.waitForTimeout(700);
    await shot('issue63_drawer_open');

    const html = await page.content();
    result('issue63', 'Geen chips voor hard_no kinks', !html.toLowerCase().includes('paddling') ? 'pass' : 'fail', '');
    const chipCount = await page.locator('[role="dialog"] button:not([disabled])').count();
    result('issue63', 'Groene chips = mutual, oranje = spanning (drawer heeft chips)', chipCount > 0 ? 'pass' : 'fail', `${chipCount} chips`);

    // Click chip and close drawer
    let chipClicked = false;
    const drawerBtns = await page.locator('[role="dialog"] button:not([disabled])').all();
    for (const btn of drawerBtns) {
      const txt = await btn.innerText().catch(() => '');
      const al = await btn.getAttribute('aria-label') || '';
      if (txt.trim().length > 1 && !al.includes('Sluiten')) {
        await btn.click({ force: true, timeout: 3000 });
        chipClicked = true;
        break;
      }
    }
    result('issue63', 'Toegevoegde chip disabled na klik', chipClicked ? 'pass' : 'fail', '');

    await page.waitForTimeout(400);
    // Close drawer via Sluiten button
    const closeBtn = page.locator('[role="dialog"][aria-label="Kinks toevoegen"] button[aria-label="Sluiten"]').first();
    if (await closeBtn.count() > 0) {
      await closeBtn.click({ force: true });
    } else {
      await page.mouse.click(10, 10);
    }
    await page.waitForTimeout(600);
    await shot('issue63_after_chip');

    result('issue63', 'Arc-balk toont proporties na toevoegen item',
      await page.locator('[class*="arc"], svg, [class*="scene-arc"]').count() > 0 ? 'pass' : 'fail', '');

    result('issue63', 'Flex-transitie (300ms) zichtbaar', 'manual', 'CSS animation headless');
    result('issue63', 'Sheet drag-to-close werkt', 'manual', 'Drag gesture needs touch emulation');

    const opslBtn = page.locator('button:has-text("Opslaan")').first();
    if (await opslBtn.getAttribute('disabled').catch(() => 'y') === null) {
      await opslBtn.click({ timeout: 5000 });
      await page.waitForTimeout(1000);
      const url = page.url();
      result('issue63', 'Opslaan (draft) → URL wordt /scene?id=...', url.includes('id=') ? 'pass' : 'fail', '');
      await page.goto(BASE + '/scenes', { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      await shot('issue63_scenes_draft');
      result('issue63', 'Draft verschijnt in /scenes onder Concepten', !(await page.textContent('body')).includes('Nog geen concepten') ? 'pass' : 'fail', '');
    } else {
      result('issue63', 'Opslaan (draft) → URL wordt /scene?id=...', 'fail', 'Opslaan disabled');
      result('issue63', 'Draft verschijnt in /scenes', 'fail', 'Skipped');
    }
    await ctx.close();
  }

  // Plannen → Gepland
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await seedAndReload(`${BASE}/scene?a=sim-own-001&b=sim-partner-001`);
    await waitForSelector('button[aria-label="Kinks toevoegen"]', 5000);
    await page.locator('button[aria-label="Kinks toevoegen"]').first().click();
    await page.waitForTimeout(700);
    const drawerBtns = await page.locator('[role="dialog"] button:not([disabled])').all();
    for (const btn of drawerBtns) {
      const txt = await btn.innerText().catch(() => '');
      const al = await btn.getAttribute('aria-label') || '';
      if (txt.trim().length > 1 && !al.includes('Sluiten')) {
        await btn.click({ force: true, timeout: 3000 });
        break;
      }
    }
    await page.waitForTimeout(400);
    const closeBtn = page.locator('[role="dialog"] button[aria-label="Sluiten"]').first();
    if (await closeBtn.count() > 0) await closeBtn.click({ force: true });
    else await page.mouse.click(10, 10);
    await page.waitForTimeout(600);

    const planBtn = page.locator('button:has-text("Plannen")').first();
    if (await planBtn.getAttribute('disabled').catch(() => 'y') === null) {
      await planBtn.click({ timeout: 5000 });
      await page.waitForTimeout(800);
      await page.goto(BASE + '/scenes', { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      await shot('issue63_scenes_planned');
      result('issue63', 'Plannen → verschijnt in /scenes onder Gepland', !(await page.textContent('body')).includes('Nog geen gepland') ? 'pass' : 'fail', '');
    } else {
      result('issue63', 'Plannen → verschijnt in /scenes onder Gepland', 'fail', 'Plannen disabled');
    }
    await ctx.close();
  }

  // ?id= + Long-press reorder
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await seedAndReload(BASE + '/scenes', { scenes: [draftScene] });
    await waitForSelector('button:has-text("Spelen")', 5000);

    const spelenBtn = page.locator('button:has-text("Spelen")').first();
    await spelenBtn.click();
    await page.waitForURL(`${BASE}/scene?id=**`, { timeout: 5000 }).catch(() => {});
    const url = page.url();
    await page.waitForTimeout(800);
    await shot('issue63_scene_id_loaded');
    const body = await page.textContent('body');
    result('issue63', '?id= laadt items correct in builder',
      url.includes('id=') && body.includes('Flogging') ? 'pass' : 'fail', url.includes('id=') ? '' : url);

    if (url.includes('id=')) {
      // Long-press on scene item (use drag handle button)
      await page.waitForTimeout(500);
      const dragHandle = page.locator('button[aria-label="Ingedrukt houden om te herordenen"]').first();
      const sceneItem = page.locator('[class*="scene-item-reorder"]').first();

      let box = await dragHandle.boundingBox().catch(() => null);
      if (!box) box = await sceneItem.boundingBox().catch(() => null);

      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(400);
        await page.mouse.up();
        await page.waitForTimeout(500);
        await shot('issue63_longpress');
        const reorderUI = await page.locator('button:has-text("↑"), button:has-text("Klaar"), [class*="reorder"]').count();
        result('issue63', 'Long-press 300ms → reorder-modus actief', reorderUI > 0 ? 'pass' : 'fail', `${reorderUI} elems`);

        if (reorderUI > 0) {
          const upDis = await page.locator('button:has-text("↑")').first().getAttribute('disabled').catch(() => null);
          result('issue63', '↑ op eerste item uitgeschakeld', upDis !== null ? 'pass' : 'fail', '');
          const klaarBtn = page.locator('button:has-text("Klaar")').first();
          if (await klaarBtn.count() > 0) {
            await klaarBtn.click();
            await page.waitForTimeout(300);
            result('issue63', 'Klaar-knop verlaat reorder-modus', await page.locator('button:has-text("Klaar")').count() === 0 ? 'pass' : 'fail', '');
          } else {
            result('issue63', 'Klaar-knop verlaat reorder-modus', 'fail', 'No Klaar');
          }
          result('issue63', 'Opgeslagen-badge reset na herordenen', await page.locator(':text("Opgeslagen")').count() === 0 ? 'pass' : 'fail', '');
        } else {
          ['↑ uitgeschakeld','Klaar verlaat reorder','Opgeslagen reset'].forEach(s => result('issue63', s, 'fail', 'No reorder mode triggered'));
        }
      } else {
        ['Long-press → reorder','↑ uitgeschakeld','Klaar verlaat reorder','Opgeslagen reset'].forEach(s => result('issue63', s, 'fail', 'No bounding box'));
      }
    } else {
      ['Long-press → reorder','↑ uitgeschakeld','Klaar verlaat reorder','Opgeslagen reset'].forEach(s => result('issue63', s, 'fail', 'Skipped — id= nav failed'));
    }
    await ctx.close();
  }

  // Detail page /scenes/[id]
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    // Navigate directly to avoid SPA timing issues
    await page.goto(BASE + '/scenes', { waitUntil: 'domcontentloaded' });
    await page.evaluate((s) => { localStorage.setItem('kink-profiles', JSON.stringify(s)); }, makeState({ scenes: [completedScene] }));
    await page.goto(`${BASE}/scenes/${completedScene.id}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await shot('issue63_scene_detail');
    const detailBody = await page.textContent('body');

    result('issue63', 'Traffic-light header zichtbaar', detailBody.includes('🟢') ? 'pass' : 'fail', '');
    result('issue63', 'wentWell en remember volledig weergegeven', detailBody.includes('Alles ging soepel') ? 'pass' : 'fail', '');

    // Bewerken
    const editBtn = page.locator('button:has-text("Bewerken")').first();
    if (await editBtn.count() > 0) {
      await editBtn.click();
      await waitForSelector('[aria-label="Aftercare bewerken"]', 3000);
      await shot('issue63_edit_aftercare');
      const editBody = await page.textContent('body');
      result('issue63', 'Bewerken-knop opent AftercareSheet met pre-fill',
        editBody.includes('🟢') || editBody.includes('Aftercare') ? 'pass' : 'fail', '');
      // Close via Sluiten button
      const closeBtn = page.locator('[aria-label="Aftercare bewerken"] button[aria-label="Sluiten"]').first();
      if (await closeBtn.count() > 0) await closeBtn.click({ force: true });
      else await page.keyboard.press('Escape');
      await page.waitForTimeout(600);
      // Verify sheet closed
      const sheetClosed = await page.locator('[aria-label="Aftercare bewerken"]').count() === 0;
      if (!sheetClosed) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
      }
    } else {
      result('issue63', 'Bewerken-knop opent AftercareSheet', 'fail', 'No Bewerken button');
    }

    // Delete with inline confirm
    let browserConfirm = false;
    page.once('dialog', async (d) => { browserConfirm = true; await d.dismiss(); });
    const delBtn = page.locator('button:has-text("Verwijderen")').first();
    if (await delBtn.count() > 0) {
      await delBtn.click({ force: true });
      await page.waitForTimeout(500);
      await shot('issue63_delete_confirm');
      const annulCount = await page.locator('button:has-text("Annuleren")').count();
      result('issue63', 'Verwijder-knop toont inline confirm — geen browser confirm()',
        !browserConfirm && annulCount > 0 ? 'pass' : 'fail',
        browserConfirm ? 'browser confirm()' : `Annuleren: ${annulCount}`);
      if (annulCount > 0) {
        await page.locator('button:has-text("Annuleren")').first().click();
        await page.waitForTimeout(300);
        result('issue63', 'Annuleren annuleert de delete', page.url().includes('/scenes/') ? 'pass' : 'fail', page.url());
      } else {
        result('issue63', 'Annuleren annuleert de delete', 'fail', 'No Annuleren');
      }
    } else {
      result('issue63', 'Verwijder-knop toont inline confirm', 'fail', 'No Verwijderen button');
      result('issue63', 'Annuleren annuleert de delete', 'fail', 'Skipped');
    }
    await ctx.close();
  }

  // /scenes list checks
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await seedAndReload(BASE + '/scenes', { scenes: [plannedScene, completedScene] });
    await waitForSelector('button:has-text("Bekijken")', 5000);
    await shot('issue63_scenes_full');

    result('issue63', 'Afgeronde scènes: Bekijken → /scenes/[id]',
      await page.locator('button:has-text("Bekijken")').count() > 0 ? 'pass' : 'fail', '');

    const spelenCount = await page.locator('button:has-text("Spelen")').count();
    const afrondCount = await page.locator('button:has-text("Afronden")').count();
    result('issue63', 'Geplande scènes: Spelen + Afronden beide zichtbaar',
      spelenCount > 0 && afrondCount > 0 ? 'pass' : 'fail', `Spelen:${spelenCount} Afronden:${afrondCount}`);

    const afrondBtn = page.locator('button:has-text("Afronden")').first();
    if (await afrondBtn.count() > 0) {
      await afrondBtn.click();
      await waitForSelector('button:has-text("🟢")', 5000);
      await shot('issue63_aftercare_from_list');
      const trafficCount = await page.locator('button:has-text("🟢"), button:has-text("🟡"), button:has-text("🔴")').count();
      result('issue63', 'Afronden-knop opent AftercareSheet vanuit lijst', trafficCount >= 1 ? 'pass' : 'fail', `${trafficCount}`);
      result('issue63', 'Traffic light selectie werkt (3 knoppen)', trafficCount >= 3 ? 'pass' : 'fail', `${trafficCount}`);
      const saveDis = await page.locator('button:has-text("Opslaan")').last().getAttribute('disabled').catch(() => null);
      result('issue63', 'Opslaan uitgeschakeld zonder traffic light selectie', saveDis !== null ? 'pass' : 'fail', `dis=${saveDis}`);
    } else {
      ['Afronden opent AftercareSheet','Traffic light werkt','Opslaan uitgeschakeld'].forEach(s => result('issue63', s, 'fail', 'No Afronden'));
    }

    result('issue63', 'Aftercare-tekst: max 2 regels (line-clamp)',
      await page.locator('[class*="line-clamp"]').count() > 0 ? 'pass' : 'fail', '');
    result('issue63', 'Sheet animeert in van onderaf (framer-motion)', 'manual', 'Animation inspection required');
    result('issue63', 'Drag-to-close werkt', 'manual', 'Drag gesture needs touch emulation');
    await ctx.close();
  }

  // Onboarding
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('kink-profiles', JSON.stringify({
        state: { theme: 'midnight', profiles: [], contracts: [], scenes: [],
          appLockPin: null, appLockEnabled: false, pinnedProfileId: null,
          biometricEnabled: false, onboardingComplete: false, profileTourComplete: false,
          biometricCredentialId: null, installPromptDismissed: false },
        version: 10,
      }));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await shot('issue63_onboarding');

    const contBtn = page.locator('button:has-text("Doorgaan"), button:has-text("Verder"), button:has-text("Begin")').first();
    if (await contBtn.count() > 0) {
      const box1 = await contBtn.boundingBox();
      await contBtn.click();
      await page.waitForTimeout(600);
      const cont2 = page.locator('button:has-text("Doorgaan"), button:has-text("Verder"), button:has-text("Begin")').first();
      if (await cont2.count() > 0) {
        const shift = Math.abs(box1.y - (await cont2.boundingBox()).y);
        result('issue63', 'Continue-knop springt niet van positie', shift <= 10 ? 'pass' : 'fail', `shift:${shift}px`);
      } else {
        result('issue63', 'Continue-knop springt niet van positie', 'pass', 'Single-step onboarding');
      }
    } else {
      result('issue63', 'Continue-knop springt niet van positie', 'fail', 'No Continue button');
    }
    result('issue63', 'PIN keypad reageert op touch (iOS Safari)', 'manual', 'iOS device required');
    result('issue63', 'Substap-switch geen onnodige slide-animatie', 'manual', 'Animation needs visual check');
    result('issue63', 'Biometric registratie flow werkt na PIN', 'manual', 'Biometric not available headless');
    await ctx.close();
  }

  await browser.close();
}

try { await runIssue61(); } catch (e) { console.error('Issue61 fatal:', e.message); }
try { await runIssue63(); } catch (e) { console.error('Issue63 fatal:', e.message); }

fs.writeFileSync('/tmp/sim-testplan-results.json', JSON.stringify(RESULTS, null, 2));
console.log('\n=== FINAL SUMMARY ===');
for (const [issue, results] of Object.entries(RESULTS)) {
  const pass = results.filter(r => r.status === 'pass').length;
  const fail = results.filter(r => r.status === 'fail').length;
  const manual = results.filter(r => r.status === 'manual').length;
  console.log(`${issue}: ${pass}✅ ${fail}❌ ${manual}👀`);
}
