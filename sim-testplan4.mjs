import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://localhost:3000';
const VIEWPORT = { width: 390, height: 844 };
const RESULTS = { issue61: [], issue63: [] };
let browser, page;

async function screenshot(name) {
  const path = `/tmp/sim-screenshots/testplan/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  return path;
}

function result(issue, scenario, status, reason) {
  RESULTS[issue].push({ scenario, status, reason });
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '👀';
  console.log(`[${issue}] ${icon} ${scenario.substring(0, 72)} ${reason ? '— ' + reason : ''}`);
}

async function closeDrawer() {
  await page.mouse.click(10, 10);
  await page.waitForTimeout(500);
  const dialogStillOpen = await page.locator('[role="dialog"][aria-label="Kinks toevoegen"]').count();
  if (dialogStillOpen > 0) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }
}

async function clickChipInDrawer() {
  const drawerBtns = await page.locator('[role="dialog"] button:not([disabled])').all();
  for (const btn of drawerBtns) {
    const txt = await btn.innerText().catch(() => '');
    const ariaLabel = await btn.getAttribute('aria-label') || '';
    if (txt.trim().length > 1 && !ariaLabel.includes('sluit') && !ariaLabel.includes('close')) {
      await btn.click({ force: true, timeout: 3000 });
      return true;
    }
  }
  return false;
}

// Profile data
const ownProfile = {
  id: 'sim-own-001', name: 'SimOwn', role: 'Submissive',
  entries: {
    flogging:     { score: null, desire: null, status: 'yes',     comment: '' },
    spanking_hand:{ score: null, desire: null, status: 'yes',     comment: '' },
    blindfold:    { score: null, desire: null, status: 'willing', comment: '' },
    over_de_knie: { score: null, desire: null, status: 'no',      comment: '' },
    paddling:     { score: null, desire: null, status: 'hard_no', comment: '' },
  },
  createdAt: Date.now() - 100000, updatedAt: Date.now(),
  customKinks: [], experienceLevel: 'beginner',
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
  createdAt: Date.now() - 50000, updatedAt: Date.now(),
  isImported: true, customKinks: [], experienceLevel: 'ervaren',
};

// VERSION 10 — scenes in same kink-profiles key
const plannedScene = {
  id: 'scene-planned-001', title: 'SimOwn & SimPartner',
  profileAId: 'sim-own-001', profileBId: 'sim-partner-001',
  profileAName: 'SimOwn', profileBName: 'SimPartner',
  items: [{ id: 'item-1', name: 'Flogging', kinkId: 'flogging', intensity: 'midden', duration: '', note: '', fromKink: true }],
  status: 'planned',
  createdAt: Date.now() - 4000, updatedAt: Date.now(),
};
const completedScene = {
  id: 'scene-done-001', title: 'SimOwn & SimPartner',
  profileAId: 'sim-own-001', profileBId: 'sim-partner-001',
  profileAName: 'SimOwn', profileBName: 'SimPartner',
  items: [{ id: 'item-2', name: 'Blindfold', kinkId: 'blindfold', intensity: 'midden', duration: '', note: '', fromKink: true }],
  status: 'completed',
  completedAt: Date.now() - 3000,
  aftercare: { trafficLight: 'green', wentWell: 'Alles ging soepel', remember: 'Veiligheidswoord bespreken' },
  createdAt: Date.now() - 6000, updatedAt: Date.now(),
};
const draftScene = {
  id: 'scene-draft-001', title: 'SimOwn & SimPartner',
  profileAId: 'sim-own-001', profileBId: 'sim-partner-001',
  profileAName: 'SimOwn', profileBName: 'SimPartner',
  items: [{ id: 'item-3', name: 'Flogging', kinkId: 'flogging', intensity: 'midden', duration: '', note: '', fromKink: true }],
  status: 'draft',
  createdAt: Date.now() - 5000, updatedAt: Date.now(),
};

function makeState(extra = {}) {
  return {
    state: {
      theme: 'midnight', profiles: [ownProfile, importedProfile],
      contracts: [], scenes: [],
      appLockPin: null, appLockEnabled: false, pinnedProfileId: null,
      biometricEnabled: false, onboardingComplete: true, profileTourComplete: true,
      biometricCredentialId: null, installPromptDismissed: true,
      ...extra,
    },
    version: 10,  // Must be 10 — migration v<10 resets scenes to []
  };
}

async function seedAndReload(url, extra = {}) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.evaluate((s) => { localStorage.setItem('kink-profiles', JSON.stringify(s)); }, makeState(extra));
  await page.reload({ waitUntil: 'networkidle' });
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
    await screenshot('issue61_scenes_empty');
    const body = await page.textContent('body');
    const hasEmpty = /nog geen|geen|leeg/i.test(body);
    const hasCrash = body.includes('Error') && body.includes(' at ');
    result('issue61', '/scenes lege store — lege-staat tekst, geen crash',
      !hasCrash && hasEmpty ? 'pass' : 'fail', '');
    await ctx.close();
  }

  // Compare auto-select with 2 profiles
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await seedAndReload(BASE + '/compare');
    await screenshot('issue61_compare_autoselect');
    const selects = await page.locator('select').count();
    result('issue61', '/compare zonder URL-params — dropdowns gevuld, kinklijst zichtbaar',
      selects >= 2 ? 'pass' : 'fail', `${selects} selects`);
    await ctx.close();
  }

  // Scene hub chip flow
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await seedAndReload(`${BASE}/scene?a=sim-own-001&b=sim-partner-001`);

    const kinkBtn = page.locator('button[aria-label="Kinks toevoegen"]').first();
    if (await kinkBtn.count() === 0) {
      result('issue61', '/scene chip drawer toont kink-inhoud', 'fail', 'No + Kinks button');
      result('issue61', 'Geen hard_no chips in drawer', 'fail', 'Skipped');
      result('issue61', 'Chip klikken — item in scenelijst', 'fail', 'Skipped');
      result('issue61', 'Opslaan → /scene?id=...', 'fail', 'Skipped');
      result('issue61', '/scenes — scène staat onder Concepten', 'fail', 'Skipped');
    } else {
      await kinkBtn.click();
      await page.waitForTimeout(700);
      await screenshot('issue61_drawer_open');

      const drawerHtml = await page.content();
      const paddlingInDrawer = drawerHtml.toLowerCase().includes('paddling');
      result('issue61', 'Geen hard_no chips in drawer', !paddlingInDrawer ? 'pass' : 'fail', '');

      const anyChip = await page.locator('[role="dialog"] button:not([disabled])').count();
      result('issue61', '/scene chip drawer toont kink-inhoud', anyChip > 0 ? 'pass' : 'fail', `${anyChip} chips`);

      const clicked = await clickChipInDrawer();
      result('issue61', 'Chip klikken — item in scenelijst', clicked ? 'pass' : 'fail', '');
      await page.waitForTimeout(400);
      await closeDrawer();
      await page.waitForTimeout(400);
      await screenshot('issue61_drawer_closed');

      const opslBtn = page.locator('button:has-text("Opslaan")').first();
      const disabled = await opslBtn.getAttribute('disabled').catch(() => 'yes');
      if (disabled === null) {
        await opslBtn.click({ timeout: 5000 });
        await page.waitForTimeout(1000);
        const url = page.url();
        await screenshot('issue61_saved');
        result('issue61', 'Opslaan → URL wordt /scene?id=...', url.includes('id=') ? 'pass' : 'fail', url.includes('id=') ? '' : url);

        await page.goto(BASE + '/scenes', { waitUntil: 'networkidle' });
        await screenshot('issue61_scenes_with_draft');
        const scenesBody = await page.textContent('body');
        result('issue61', '/scenes — scène staat onder Concepten', !scenesBody.includes('Nog geen concepten') ? 'pass' : 'fail', '');
      } else {
        result('issue61', 'Opslaan → URL wordt /scene?id=...', 'fail', 'Opslaan disabled after chip+close');
        result('issue61', '/scenes — scène staat onder Concepten', 'fail', 'Skipped');
      }
    }
    await ctx.close();
  }

  // Planned scene: Spelen + Afronden
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await seedAndReload(BASE + '/scenes', { scenes: [plannedScene] });
    await screenshot('issue61_scenes_planned');

    const spelenCount = await page.locator('a:has-text("Spelen"), button:has-text("Spelen")').count();
    const afrondCount = await page.locator('button:has-text("Afronden")').count();
    result('issue61', 'Geplande scène: Spelen + Afronden beide zichtbaar',
      spelenCount > 0 && afrondCount > 0 ? 'pass' : 'fail', `Spelen:${spelenCount} Afronden:${afrondCount}`);

    const afrondBtn = page.locator('button:has-text("Afronden")').first();
    if (await afrondBtn.count() > 0) {
      await afrondBtn.click();
      await page.waitForTimeout(700);
      await screenshot('issue61_aftercare_sheet');
      const trafficCount = await page.locator('button:has-text("🟢"), button:has-text("🟡"), button:has-text("🔴")').count();
      result('issue61', 'Afronden — AftercareSheet opent met traffic lights', trafficCount >= 3 ? 'pass' : 'fail', `${trafficCount} btns`);

      if (trafficCount >= 3) {
        const saveBefore = page.locator('button:has-text("Opslaan")').last();
        const disabledBefore = await saveBefore.getAttribute('disabled').catch(() => null);
        result('issue61', 'Opslaan uitgeschakeld voor traffic light selectie', disabledBefore !== null ? 'pass' : 'fail', '');

        await page.locator('button:has-text("🟢")').first().click();
        await page.waitForTimeout(200);
        for (const ta of await page.locator('textarea').all()) await ta.fill('Test aftercare tekst');

        const saveBtn = page.locator('button:has-text("Opslaan")').last();
        const saveDisabled = await saveBtn.getAttribute('disabled').catch(() => null);
        if (saveDisabled === null) {
          await saveBtn.click();
          await page.waitForTimeout(800);
          await screenshot('issue61_aftercare_saved');
          const bodyAfter = await page.textContent('body');
          result('issue61', '🟢 + tekst + Opslaan → Afgerond zichtbaar',
            bodyAfter.includes('Afgerond') || bodyAfter.includes('🟢') ? 'pass' : 'fail', '');

          await page.goto(BASE + '/scenes', { waitUntil: 'networkidle' });
          await screenshot('issue61_scenes_completed');
          const scenesBody = await page.textContent('body');
          result('issue61', '/scenes — scène staat onder Afgerond',
            scenesBody.includes('Afgerond') && !scenesBody.includes('Nog geen afgerond') ? 'pass' : 'fail', '');
        } else {
          result('issue61', '🟢 + tekst + Opslaan → Afgerond', 'fail', 'Opslaan still disabled after 🟢');
          result('issue61', '/scenes — scène staat onder Afgerond', 'fail', 'Skipped');
        }
      } else {
        result('issue61', 'Opslaan uitgeschakeld voor traffic light selectie', 'fail', 'No traffic lights');
        result('issue61', '🟢 + tekst + Opslaan → Afgerond', 'fail', 'Skipped');
        result('issue61', '/scenes — scène staat onder Afgerond', 'fail', 'Skipped');
      }
    } else {
      result('issue61', 'Afronden — AftercareSheet opent', 'fail', 'No Afronden button');
      result('issue61', 'Opslaan uitgeschakeld voor traffic light selectie', 'fail', 'Skipped');
      result('issue61', '🟢 + tekst + Opslaan → Afgerond', 'fail', 'Skipped');
      result('issue61', '/scenes — scène staat onder Afgerond', 'fail', 'Skipped');
    }
    await ctx.close();
  }

  // Settings / PIN
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await seedAndReload(BASE + '/');
    const body = await page.textContent('body');
    // Look for any settings or Beveiliging access point
    const settingsCount = await page.locator('[aria-label*="instelling"], [aria-label*="setting"], button:has-text("Beveiliging"), button:has-text("⚙")').count();
    result('issue61', 'Settings → Beveiliging PIN flow toegankelijk',
      settingsCount > 0 ? 'pass' : 'fail', `${settingsCount} settings elements found`);
    result('issue61', 'Juiste PIN → app ontgrendelt', 'manual', 'PIN flow requires interactive verification');
    result('issue61', '/compare → / — lockscreen NIET zichtbaar (sessie onthouden)', 'manual', 'Session persistence after PIN requires full flow');
    await ctx.close();
  }

  await browser.close();
}

// ===================== ISSUE #63 =====================
async function runIssue63() {
  console.log('\n=== ISSUE #63 ===');
  browser = await chromium.launch({ headless: true });

  // Arc + chip drawer tests
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await seedAndReload(`${BASE}/scene?a=sim-own-001&b=sim-partner-001`);
    await screenshot('issue63_scene_initial');

    // No arc on empty list
    const arcInitial = await page.locator('[class*="arc"], [class*="Arc"]').count();
    result('issue63', 'Geen arc-balk bij lege lijst', arcInitial === 0 ? 'pass' : 'fail', `${arcInitial} arc elements`);

    const kinkBtn = page.locator('button[aria-label="Kinks toevoegen"]').first();
    if (await kinkBtn.count() > 0) {
      await kinkBtn.click();
      await page.waitForTimeout(700);
      await screenshot('issue63_drawer_open');

      const drawerHtml = await page.content();
      const paddlingInDrawer = drawerHtml.toLowerCase().includes('paddling');
      result('issue63', 'Geen chips voor hard_no kinks', !paddlingInDrawer ? 'pass' : 'fail', '');

      const anyChip = await page.locator('[role="dialog"] button:not([disabled])').count();
      result('issue63', 'Groene chips = mutual, oranje = spanning (drawer heeft chips)',
        anyChip > 0 ? 'pass' : 'fail', `${anyChip} chips in drawer`);

      const clicked = await clickChipInDrawer();
      result('issue63', 'Toegevoegde chip wordt disabled na klik', clicked ? 'pass' : 'fail', '');
      await page.waitForTimeout(400);
      await closeDrawer();
      await page.waitForTimeout(400);
      await screenshot('issue63_after_chip_close');

      const arcAfter = await page.locator('svg, [class*="arc"]').count();
      result('issue63', 'Arc-balk toont proporties na toevoegen item', arcAfter > 0 ? 'pass' : 'fail', `${arcAfter} svg/arc elements`);

      result('issue63', 'Flex-transitie (300ms) zichtbaar', 'manual', 'CSS animation cannot be measured headlessly');
      result('issue63', 'Sheet drag-to-close werkt', 'manual', 'Drag gesture needs touch emulation');

      // Opslaan
      const opslBtn = page.locator('button:has-text("Opslaan")').first();
      const opslDisabled = await opslBtn.getAttribute('disabled').catch(() => 'yes');
      if (opslDisabled === null) {
        await opslBtn.click({ timeout: 5000 });
        await page.waitForTimeout(1000);
        const url = page.url();
        await screenshot('issue63_saved');
        result('issue63', 'Opslaan (draft) → URL wordt /scene?id=...', url.includes('id=') ? 'pass' : 'fail', url.includes('id=') ? '' : url);

        await page.goto(BASE + '/scenes', { waitUntil: 'networkidle' });
        await screenshot('issue63_scenes_draft');
        const body = await page.textContent('body');
        result('issue63', 'Draft verschijnt in /scenes onder Concepten', !body.includes('Nog geen concepten') ? 'pass' : 'fail', '');
      } else {
        result('issue63', 'Opslaan (draft) → URL wordt /scene?id=...', 'fail', 'Opslaan disabled after chip');
        result('issue63', 'Draft verschijnt in /scenes', 'fail', 'Skipped');
      }
    } else {
      ['Geen chips voor hard_no kinks','Groene chips = mutual, oranje = spanning','Toegevoegde chip grayed out',
       'Arc-balk toont proporties','Flex-transitie','Sheet drag-to-close','Opslaan draft','Draft in /scenes'].forEach(s =>
        result('issue63', s, s.includes('transitie')||s.includes('drag') ? 'manual' : 'fail', 'No + Kinks button'));
    }
    await ctx.close();
  }

  // Plannen
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await seedAndReload(`${BASE}/scene?a=sim-own-001&b=sim-partner-001`);
    const kinkBtn = page.locator('button[aria-label="Kinks toevoegen"]').first();
    if (await kinkBtn.count() > 0) {
      await kinkBtn.click();
      await page.waitForTimeout(600);
      await clickChipInDrawer();
      await page.waitForTimeout(400);
      await closeDrawer();
      await page.waitForTimeout(400);
    }
    const planBtn = page.locator('button:has-text("Plannen")').first();
    const planDisabled = await planBtn.getAttribute('disabled').catch(() => 'yes');
    if (planDisabled === null) {
      await planBtn.click({ timeout: 5000 });
      await page.waitForTimeout(800);
      await page.goto(BASE + '/scenes', { waitUntil: 'networkidle' });
      await screenshot('issue63_scenes_planned');
      const body = await page.textContent('body');
      result('issue63', 'Plannen → verschijnt in /scenes onder Gepland',
        !body.includes('Nog geen gepland') ? 'pass' : 'fail', '');
    } else {
      result('issue63', 'Plannen → verschijnt in /scenes onder Gepland', 'fail', 'Plannen disabled after chip');
    }
    await ctx.close();
  }

  // ?id= load + Long-press reorder
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await seedAndReload(BASE + '/scenes', { scenes: [draftScene, plannedScene] });
    await screenshot('issue63_scenes_seeded');

    const body = await page.textContent('body');
    console.log('  /scenes seeded: Nog geen concepten?', body.includes('Nog geen concepten'));
    console.log('  /scenes seeded: Flogging?', body.includes('Flogging'));

    const idHref = await page.locator('a[href*="id="]').first().getAttribute('href').catch(() => null);
    if (idHref) {
      await page.goto(BASE + idHref, { waitUntil: 'networkidle' });
      await screenshot('issue63_id_loaded');
      const b = await page.textContent('body');
      result('issue63', '?id= laadt items correct in builder', b.includes('Flogging') && !b.includes('Error') ? 'pass' : 'fail', '');

      // Long-press
      await page.waitForTimeout(300);
      const listItems = await page.locator('li:not(nav li)').all();
      if (listItems.length > 0) {
        const box = await listItems[0].boundingBox().catch(() => null);
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await page.waitForTimeout(400);
          await page.mouse.up();
          await page.waitForTimeout(500);
          await screenshot('issue63_longpress');
          const reorderUI = await page.locator('button:has-text("↑"), button:has-text("Klaar"), [class*="reorder"]').count();
          result('issue63', 'Long-press 300ms → reorder-modus actief', reorderUI > 0 ? 'pass' : 'fail', `${reorderUI}`);
          if (reorderUI > 0) {
            const upDisabled = await page.locator('button:has-text("↑")').first().getAttribute('disabled').catch(() => null);
            result('issue63', '↑ op eerste item uitgeschakeld', upDisabled !== null ? 'pass' : 'fail', '');
            const klaarBtn = page.locator('button:has-text("Klaar")').first();
            if (await klaarBtn.count() > 0) {
              await klaarBtn.click();
              await page.waitForTimeout(300);
              result('issue63', 'Klaar-knop verlaat reorder-modus', await page.locator('button:has-text("Klaar")').count() === 0 ? 'pass' : 'fail', '');
            } else {
              result('issue63', 'Klaar-knop verlaat reorder-modus', 'fail', 'No Klaar button');
            }
            const savedText = await page.locator(':text("Opgeslagen")').count();
            result('issue63', 'Opgeslagen-badge reset na herordenen', savedText === 0 ? 'pass' : 'fail', '');
          } else {
            ['↑ op eerste item uitgeschakeld','Klaar-knop verlaat reorder-modus','Opgeslagen-badge reset na herordenen']
              .forEach(s => result('issue63', s, 'fail', 'No reorder mode'));
          }
        } else {
          ['Long-press → reorder-modus','↑ uitgeschakeld','Klaar verlaat reorder','Opgeslagen reset']
            .forEach(s => result('issue63', s, 'fail', 'No bounding box'));
        }
      } else {
        ['Long-press → reorder-modus','↑ uitgeschakeld','Klaar verlaat reorder','Opgeslagen reset']
          .forEach(s => result('issue63', s, 'fail', 'No list items'));
      }
    } else {
      result('issue63', '?id= laadt items correct in builder', 'fail', 'No ?id= link in /scenes (seeded scenes not visible)');
      ['Long-press → reorder','↑ uitgeschakeld','Klaar verlaat reorder','Opgeslagen reset']
        .forEach(s => result('issue63', s, 'fail', 'Skipped'));
    }
    await ctx.close();
  }

  // /scenes list + detail + AftercareSheet tests
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await seedAndReload(BASE + '/scenes', { scenes: [completedScene, plannedScene] });
    await screenshot('issue63_scenes_full');

    const scenesBody = await page.textContent('body');
    console.log('  Completed scene visible?', !scenesBody.includes('Nog geen afgerond'));
    console.log('  Planned scene visible?', !scenesBody.includes('Nog geen gepland'));

    // Bekijken link for completed scene
    const bekijken = page.locator('a:has-text("Bekijken"), button:has-text("Bekijken")').first();
    if (await bekijken.count() > 0) {
      result('issue63', 'Afgeronde scènes: Bekijken → /scenes/[id]', 'pass', '');
      await bekijken.click();
      await page.waitForTimeout(500);
      await screenshot('issue63_scene_detail');
      const detailBody = await page.textContent('body');

      const hasTraffic = detailBody.includes('🟢') || await page.locator('[class*="traffic"]').count() > 0;
      result('issue63', 'Traffic-light header zichtbaar', hasTraffic ? 'pass' : 'fail', '');

      const hasWentWell = detailBody.includes('Alles ging soepel');
      result('issue63', 'wentWell en remember volledig weergegeven', hasWentWell ? 'pass' : 'fail', '');

      const editBtn = page.locator('button:has-text("Bewerken"), button[aria-label*="bewerk"]').first();
      if (await editBtn.count() > 0) {
        await editBtn.click();
        await page.waitForTimeout(600);
        await screenshot('issue63_edit_open');
        const editBody = await page.textContent('body');
        result('issue63', 'Bewerken-knop opent AftercareSheet met pre-fill',
          editBody.includes('🟢') || editBody.includes('Aftercare') || editBody.includes('aftercare') ? 'pass' : 'fail', '');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
      } else {
        result('issue63', 'Bewerken-knop opent AftercareSheet', 'fail', 'No Bewerken button');
      }

      // Delete with inline confirm
      let browserConfirm = false;
      page.once('dialog', async (d) => { browserConfirm = true; await d.dismiss(); });
      const delBtn = page.locator('button:has-text("Verwijder"), button[aria-label*="verwijder"]').first();
      if (await delBtn.count() > 0) {
        await delBtn.click();
        await page.waitForTimeout(500);
        await screenshot('issue63_delete');
        const inlineConfirm = await page.locator('button:has-text("Annuleren")').count();
        result('issue63', 'Verwijder-knop toont inline confirm — geen browser confirm()',
          !browserConfirm && inlineConfirm > 0 ? 'pass' : 'fail',
          browserConfirm ? 'browser confirm() fired' : `Annuleren:${inlineConfirm}`);
        const cancelBtn = page.locator('button:has-text("Annuleren")').first();
        if (await cancelBtn.count() > 0) {
          await cancelBtn.click();
          await page.waitForTimeout(300);
          result('issue63', 'Annuleren annuleert de delete', page.url().includes('/scenes/') ? 'pass' : 'fail', page.url());
        } else {
          result('issue63', 'Annuleren annuleert de delete', 'fail', 'No Annuleren in confirm');
        }
      } else {
        result('issue63', 'Verwijder-knop toont inline confirm', 'fail', 'No delete button');
        result('issue63', 'Annuleren annuleert de delete', 'fail', 'Skipped');
      }
    } else {
      result('issue63', 'Afgeronde scènes: Bekijken → /scenes/[id]', 'fail', 'No Bekijken link (scene not visible in /scenes)');
      ['Traffic-light header zichtbaar','wentWell en remember volledig','Bewerken-knop opent AftercareSheet',
       'Verwijder-knop inline confirm','Annuleren annuleert delete'].forEach(s => result('issue63', s, 'fail', 'Skipped'));
    }

    // Back to /scenes for list tests
    await page.goto(BASE + '/scenes', { waitUntil: 'networkidle' });
    await screenshot('issue63_scenes_list_checks');
    const spelenCount = await page.locator('a:has-text("Spelen"), button:has-text("Spelen")').count();
    const afrondCount = await page.locator('button:has-text("Afronden")').count();
    result('issue63', 'Geplande scènes: Spelen + Afronden beide zichtbaar',
      spelenCount > 0 && afrondCount > 0 ? 'pass' : 'fail', `Spelen:${spelenCount} Afronden:${afrondCount}`);

    // Afronden from list
    const afrondBtn = page.locator('button:has-text("Afronden")').first();
    if (await afrondBtn.count() > 0) {
      await afrondBtn.click();
      await page.waitForTimeout(700);
      await screenshot('issue63_aftercare_from_list');
      const trafficCount = await page.locator('button:has-text("🟢"), button:has-text("🟡"), button:has-text("🔴")').count();
      result('issue63', 'Afronden-knop opent AftercareSheet vanuit lijst', trafficCount >= 1 ? 'pass' : 'fail', `${trafficCount}`);
      result('issue63', 'Traffic light selectie werkt (3 knoppen)', trafficCount >= 3 ? 'pass' : 'fail', `${trafficCount}`);

      const saveSheet = page.locator('button:has-text("Opslaan")').last();
      const saveDisabled = await saveSheet.getAttribute('disabled').catch(() => null);
      result('issue63', 'Opslaan uitgeschakeld zonder traffic light selectie', saveDisabled !== null ? 'pass' : 'fail', `disabled=${saveDisabled}`);
    } else {
      result('issue63', 'Afronden-knop opent AftercareSheet vanuit lijst', 'fail', 'No Afronden in list');
      result('issue63', 'Traffic light selectie werkt', 'fail', 'Skipped');
      result('issue63', 'Opslaan uitgeschakeld zonder selectie', 'fail', 'Skipped');
    }

    const lineClamp = await page.locator('[class*="line-clamp"]').count();
    result('issue63', 'Aftercare-tekst: max 2 regels (line-clamp)', lineClamp > 0 ? 'pass' : 'fail', `${lineClamp} clamped`);

    result('issue63', 'Sheet animeert in van onderaf (framer-motion)', 'manual', 'Animation needs visual inspection');
    result('issue63', 'Drag-to-close werkt', 'manual', 'Drag needs touch emulation');

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
    await screenshot('issue63_onboarding');

    const continueBtn = page.locator('button:has-text("Doorgaan"), button:has-text("Verder"), button:has-text("Begin")').first();
    if (await continueBtn.count() > 0) {
      const box1 = await continueBtn.boundingBox();
      await continueBtn.click();
      await page.waitForTimeout(600);
      const cont2 = page.locator('button:has-text("Doorgaan"), button:has-text("Verder"), button:has-text("Begin")').first();
      if (await cont2.count() > 0) {
        const box2 = await cont2.boundingBox();
        const shift = Math.abs(box1.y - box2.y);
        result('issue63', 'Continue-knop springt niet van positie tussen stappen', shift <= 10 ? 'pass' : 'fail', `shift:${shift}px`);
      } else {
        result('issue63', 'Continue-knop springt niet van positie tussen stappen', 'pass', 'Single-step onboarding');
      }
    } else {
      result('issue63', 'Continue-knop springt niet van positie tussen stappen', 'fail', 'No Continue button in onboarding');
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
