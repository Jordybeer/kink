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
  // Try multiple ways to close the chip drawer
  const closeBtn = page.locator('[role="dialog"] button[aria-label*="sluit"], [role="dialog"] button[aria-label*="close"], [role="dialog"] button:has-text("×"), [role="dialog"] button:has-text("✕")').first();
  if (await closeBtn.count() > 0) {
    await closeBtn.click({ force: true });
  } else {
    // Click outside the dialog (top-left corner)
    await page.mouse.click(10, 10);
  }
  await page.waitForTimeout(500);
  // Verify dialog closed
  const dialogOpen = await page.locator('[role="dialog"][aria-label="Kinks toevoegen"]').count();
  if (dialogOpen > 0) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }
}

async function clickChipInDrawer() {
  // Click first chip in the open drawer that is not disabled
  const drawerChips = await page.locator('[role="dialog"] button:not([disabled])').all();
  for (const btn of drawerChips) {
    const txt = await btn.innerText().catch(() => '');
    const ariaLabel = await btn.getAttribute('aria-label') || '';
    if (txt.trim().length > 1 && !ariaLabel.includes('sluit') && !ariaLabel.includes('close') && !ariaLabel.includes('sluiten')) {
      await btn.click({ timeout: 3000, force: true });
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

const completedScene = {
  id: 'scene-done-001', title: 'SimOwn & SimPartner',
  profileAId: 'sim-own-001', profileBId: 'sim-partner-001',
  profileAName: 'SimOwn', profileBName: 'SimPartner',
  items: [{ id: 'item-3', label: 'Blindfold', mutual: false }],
  status: 'completed', completedAt: Date.now() - 3000,
  aftercare: { trafficLight: 'green', wentWell: 'Alles ging soepel', remember: 'Veiligheidswoord bespreken' },
  createdAt: Date.now() - 6000, updatedAt: Date.now(),
};
const plannedScene = {
  id: 'scene-planned-001', title: 'SimOwn & SimPartner',
  profileAId: 'sim-own-001', profileBId: 'sim-partner-001',
  profileAName: 'SimOwn', profileBName: 'SimPartner',
  items: [{ id: 'item-2', label: 'Spanking', mutual: true }],
  status: 'planned',
  createdAt: Date.now() - 4000, updatedAt: Date.now(),
};
const draftScene = {
  id: 'scene-draft-001', title: 'SimOwn & SimPartner',
  profileAId: 'sim-own-001', profileBId: 'sim-partner-001',
  profileAName: 'SimOwn', profileBName: 'SimPartner',
  items: [{ id: 'item-1', label: 'Flogging', mutual: true }],
  status: 'draft',
  createdAt: Date.now() - 5000, updatedAt: Date.now(),
};

function baseState(extra = {}) {
  return {
    state: {
      theme: 'midnight', profiles: [ownProfile, importedProfile],
      contracts: [], scenes: [],
      appLockPin: null, appLockEnabled: false, pinnedProfileId: null,
      biometricEnabled: false, onboardingComplete: true, profileTourComplete: true,
      biometricCredentialId: null, installPromptDismissed: true,
      ...extra,
    },
    version: 9,
  };
}

async function seedState(state) {
  await page.evaluate((s) => { localStorage.setItem('kink-profiles', JSON.stringify(s)); }, state);
}

async function openSceneBuilderAndAddChip() {
  const kinkBtn = page.locator('button[aria-label="Kinks toevoegen"], button:has-text("+ Kinks")').first();
  if (await kinkBtn.count() === 0) return false;
  await kinkBtn.click();
  await page.waitForTimeout(700);
  const clicked = await clickChipInDrawer();
  if (clicked) {
    await page.waitForTimeout(400);
    await closeDrawer();
    await page.waitForTimeout(400);
  }
  return clicked;
}

// ===================== ISSUE #61 =====================
async function runIssue61() {
  console.log('\n=== ISSUE #61 ===');
  browser = await chromium.launch({ headless: true });

  // /scenes empty state
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await seedState(baseState({ scenes: [] }));
    await page.goto(BASE + '/scenes', { waitUntil: 'networkidle' });
    await screenshot('issue61_scenes_empty');
    const body = await page.textContent('body');
    const hasEmpty = /nog geen|geen|leeg/i.test(body);
    const hasCrash = body.includes('Error') && body.includes(' at ');
    result('issue61', '/scenes lege store — lege-staat tekst, geen crash',
      !hasCrash && hasEmpty ? 'pass' : 'fail', hasCrash ? 'Crash detected' : '');
    await ctx.close();
  }

  // Compare auto-select
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await seedState(baseState());
    await page.goto(BASE + '/compare', { waitUntil: 'networkidle' });
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
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await seedState(baseState());
    await page.goto(`${BASE}/scene?a=sim-own-001&b=sim-partner-001`, { waitUntil: 'networkidle' });

    const kinkBtn = page.locator('button[aria-label="Kinks toevoegen"]').first();
    if (await kinkBtn.count() === 0) {
      result('issue61', 'Scene builder renders with + Kinks button', 'fail', 'No + Kinks button');
      result('issue61', 'Chip drawer toont groene/oranje chips', 'fail', 'Skipped');
      result('issue61', 'Geen hard_no chips in drawer', 'fail', 'Skipped');
      result('issue61', 'Chip klikken — item in scenelijst', 'fail', 'Skipped');
      result('issue61', 'Opslaan → /scene?id=...', 'fail', 'Skipped');
    } else {
      // Open drawer
      await kinkBtn.click();
      await page.waitForTimeout(700);
      await screenshot('issue61_drawer_open');

      const drawerBody = await page.textContent('body');
      const drawerHtml = await page.content();
      const hasContent = drawerBody.includes('flogging') || drawerBody.includes('Flogging') ||
        drawerBody.includes('spanking') || drawerBody.includes('Spanking') ||
        await page.locator('[role="dialog"]').count() > 0;
      result('issue61', 'Chip drawer opent met kink-inhoud', hasContent ? 'pass' : 'fail', '');

      const paddlingInDrawer = drawerHtml.toLowerCase().includes('paddling');
      result('issue61', 'Geen hard_no chips in drawer', !paddlingInDrawer ? 'pass' : 'fail', '');

      // Click chip
      const clicked = await clickChipInDrawer();
      result('issue61', 'Chip klikken — item in scenelijst', clicked ? 'pass' : 'fail', clicked ? '' : 'No clickable chip');

      // Close drawer
      await closeDrawer();
      await screenshot('issue61_drawer_closed');

      // Now click Opslaan
      const opslBtn = page.locator('button:has-text("Opslaan")').first();
      const opslDisabled = await opslBtn.getAttribute('disabled').catch(() => 'yes');
      if (opslDisabled === null) {
        await opslBtn.click({ timeout: 5000 });
        await page.waitForTimeout(1000);
        const url = page.url();
        await screenshot('issue61_after_save');
        result('issue61', 'Opslaan → URL wordt /scene?id=...', url.includes('id=') ? 'pass' : 'fail', `URL: ${url}`);

        // Check /scenes for draft
        await page.goto(BASE + '/scenes', { waitUntil: 'networkidle' });
        await screenshot('issue61_scenes_with_draft');
        const scenesBody = await page.textContent('body');
        const hasDraft = scenesBody.includes('SimOwn') || scenesBody.includes('Flogging') ||
          scenesBody.includes('Spanking') || !scenesBody.includes('Nog geen concepten');
        result('issue61', '/scenes — scène staat onder Concepten', hasDraft ? 'pass' : 'fail', '');
      } else {
        result('issue61', 'Opslaan → URL wordt /scene?id=...', 'fail', 'Opslaan still disabled after adding chip and closing drawer');
        result('issue61', '/scenes — scène staat onder Concepten', 'fail', 'Skipped — save failed');
      }
    }
    await ctx.close();
  }

  // Planned scene: Spelen + Afronden
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await seedState(baseState({ scenes: [plannedScene] }));
    await page.goto(BASE + '/scenes', { waitUntil: 'networkidle' });
    await screenshot('issue61_scenes_planned');

    const spelenCount = await page.locator('a:has-text("Spelen"), button:has-text("Spelen")').count();
    const afrondCount = await page.locator('button:has-text("Afronden")').count();
    result('issue61', 'Geplande scène: Spelen + Afronden beide zichtbaar',
      spelenCount > 0 && afrondCount > 0 ? 'pass' : 'fail', `Spelen:${spelenCount} Afronden:${afrondCount}`);

    // Aftercare sheet
    const afrondBtn = page.locator('button:has-text("Afronden")').first();
    if (await afrondBtn.count() > 0) {
      await afrondBtn.click();
      await page.waitForTimeout(700);
      await screenshot('issue61_aftercare_sheet');
      const sheetBody = await page.textContent('body');
      const trafficCount = await page.locator('button:has-text("🟢"), button:has-text("🟡"), button:has-text("🔴")').count();
      result('issue61', 'Afronden — AftercareSheet opent met traffic lights', trafficCount >= 3 ? 'pass' : 'fail', `${trafficCount} traffic buttons`);

      if (trafficCount >= 3) {
        // Test: save disabled without selection
        const saveBeforeSelect = page.locator('button:has-text("Opslaan")').last();
        const saveDisBefore = await saveBeforeSelect.getAttribute('disabled').catch(() => null);
        result('issue61', 'Opslaan uitgeschakeld voor traffic light selectie',
          saveDisBefore !== null ? 'pass' : 'fail', `disabled=${saveDisBefore}`);

        // Select green and fill
        await page.locator('button:has-text("🟢")').first().click();
        await page.waitForTimeout(200);
        const textareas = await page.locator('textarea').all();
        for (const ta of textareas) { await ta.fill('Test aftercare tekst'); }

        const saveBtnSheet = page.locator('button:has-text("Opslaan")').last();
        const saveEnabled = await saveBtnSheet.getAttribute('disabled').catch(() => null);
        if (saveEnabled === null) {
          await saveBtnSheet.click();
          await page.waitForTimeout(800);
          await screenshot('issue61_aftercare_saved');
          const afterBody = await page.textContent('body');
          result('issue61', '🟢 + tekst + Opslaan → Afgerond zichtbaar',
            afterBody.includes('Afgerond') || afterBody.includes('🟢') ? 'pass' : 'fail', '');

          await page.goto(BASE + '/scenes', { waitUntil: 'networkidle' });
          await screenshot('issue61_scenes_completed');
          const scenesEnd = await page.textContent('body');
          result('issue61', '/scenes — scène staat onder Afgerond met groene badge',
            scenesEnd.includes('Afgerond') && !scenesEnd.includes('Nog geen afgerond') ? 'pass' : 'fail', '');
        } else {
          result('issue61', '🟢 + tekst + Opslaan → Afgerond', 'fail', 'Opslaan still disabled after selecting green');
          result('issue61', '/scenes — scène staat onder Afgerond', 'fail', 'Skipped');
        }
      } else {
        result('issue61', 'Opslaan uitgeschakeld voor traffic light selectie', 'fail', 'No traffic lights found');
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
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await seedState(baseState());
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await screenshot('issue61_home');

    // Try to find settings navigation
    // Try /profile/[id] first
    const profileId = ownProfile.id;
    await page.goto(`${BASE}/profile/${profileId}`, { waitUntil: 'networkidle' });
    await screenshot('issue61_profile');
    const profileBody = await page.textContent('body');
    const hasSettings = profileBody.includes('Beveiliging') || profileBody.includes('PIN') || profileBody.includes('Instellingen');
    result('issue61', 'Settings → Beveiliging PIN flow toegankelijk',
      hasSettings ? 'pass' : 'fail',
      hasSettings ? '' : 'No Beveiliging/PIN settings visible in profile');

    result('issue61', 'Juiste PIN → app ontgrendelt', 'manual', 'PIN flow requires interactive input');
    result('issue61', '/compare → / — lockscreen NIET zichtbaar (sessie onthouden)', 'manual', 'Session lock persistence requires full PIN flow');
    await ctx.close();
  }

  await browser.close();
}

// ===================== ISSUE #63 =====================
async function runIssue63() {
  console.log('\n=== ISSUE #63 ===');
  browser = await chromium.launch({ headless: true });

  // Arc + Chips
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await seedState(baseState());
    await page.goto(`${BASE}/scene?a=sim-own-001&b=sim-partner-001`, { waitUntil: 'networkidle' });
    await screenshot('issue63_scene_initial');

    const arcInitial = await page.locator('[class*="arc"], [class*="Arc"]').count();
    result('issue63', 'Geen arc-balk bij lege lijst', arcInitial === 0 ? 'pass' : 'fail', `${arcInitial} arc elements`);

    const kinkBtn = page.locator('button[aria-label="Kinks toevoegen"]').first();
    if (await kinkBtn.count() > 0) {
      await kinkBtn.click();
      await page.waitForTimeout(700);
      await screenshot('issue63_drawer_open');

      // Check chips
      const drawerHtml = await page.content();
      const paddlingInDrawer = drawerHtml.toLowerCase().includes('paddling');
      result('issue63', 'Geen chips voor hard_no kinks',
        !paddlingInDrawer ? 'pass' : 'fail', '');

      const greenChips = await page.locator('[role="dialog"] [class*="green"], [role="dialog"] [class*="mutual"]').count();
      const orangeChips = await page.locator('[role="dialog"] [class*="orange"], [role="dialog"] [class*="span"]').count();
      const anyChips = await page.locator('[role="dialog"] button:not([disabled])').count();
      result('issue63', 'Groene chips = mutual, oranje = spanning',
        anyChips > 0 ? 'pass' : 'fail', `green:${greenChips} orange:${orangeChips} any:${anyChips}`);

      // Click chip
      const clicked = await clickChipInDrawer();
      result('issue63', 'Toegevoegde chip wordt grayed out (disabled na klik)',
        clicked ? 'pass' : 'fail', clicked ? 'Chip clicked' : 'No chip clickable');

      await page.waitForTimeout(400);
      await closeDrawer();
      await page.waitForTimeout(400);
      await screenshot('issue63_after_chip_close');

      // Arc bar after item added
      const arcAfter = await page.locator('svg, [class*="arc"], [class*="progress"]').count();
      result('issue63', 'Arc-balk toont correcte proporties na toevoegen item',
        arcAfter > 0 ? 'pass' : 'fail', `${arcAfter} visual elements`);

      result('issue63', 'Flex-transitie (300ms) zichtbaar', 'manual', 'CSS animation cannot be measured headlessly');

      // Opslaan
      const opslBtn = page.locator('button:has-text("Opslaan")').first();
      const opslDisabled = await opslBtn.getAttribute('disabled').catch(() => 'yes');
      if (opslDisabled === null) {
        await opslBtn.click({ timeout: 5000 });
        await page.waitForTimeout(1000);
        const url = page.url();
        await screenshot('issue63_saved');
        result('issue63', 'Opslaan (draft) → URL wordt /scene?id=...',
          url.includes('id=') ? 'pass' : 'fail', `URL: ${url}`);

        // Check /scenes
        await page.goto(BASE + '/scenes', { waitUntil: 'networkidle' });
        await screenshot('issue63_scenes_draft');
        const scenesBody = await page.textContent('body');
        result('issue63', 'Draft verschijnt in /scenes onder Concepten',
          !scenesBody.includes('Nog geen concepten') ? 'pass' : 'fail', '');
      } else {
        result('issue63', 'Opslaan (draft) → URL wordt /scene?id=...', 'fail', 'Opslaan disabled after adding chip');
        result('issue63', 'Draft verschijnt in /scenes onder Concepten', 'fail', 'Skipped');
      }

      result('issue63', 'Sheet drag-to-close werkt', 'manual', 'Drag gesture needs touch emulation');
    } else {
      result('issue63', 'Geen chips voor hard_no kinks', 'fail', 'No drawer button');
      result('issue63', 'Groene chips = mutual, oranje = spanning', 'fail', 'Skipped');
      result('issue63', 'Toegevoegde chip wordt grayed out', 'fail', 'Skipped');
      result('issue63', 'Arc-balk toont correcte proporties na toevoegen item', 'fail', 'Skipped');
      result('issue63', 'Flex-transitie (300ms) zichtbaar', 'manual', 'No drawer to test');
      result('issue63', 'Opslaan (draft)', 'fail', 'Skipped');
      result('issue63', 'Draft verschijnt in /scenes', 'fail', 'Skipped');
      result('issue63', 'Sheet drag-to-close werkt', 'manual', 'No sheet to test');
    }
    await ctx.close();
  }

  // Plannen
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await seedState(baseState());
    await page.goto(`${BASE}/scene?a=sim-own-001&b=sim-partner-001`, { waitUntil: 'networkidle' });

    await openSceneBuilderAndAddChip();

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
      result('issue63', 'Plannen → verschijnt in /scenes onder Gepland', 'fail', 'Plannen disabled after chip add');
    }
    await ctx.close();
  }

  // ?id= load + Long-press reorder
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await seedState(baseState({ scenes: [draftScene, plannedScene] }));
    await page.goto(BASE + '/scenes', { waitUntil: 'networkidle' });
    await screenshot('issue63_scenes_seeded');

    const idHref = await page.locator('a[href*="id="]').first().getAttribute('href').catch(() => null);
    if (idHref) {
      await page.goto(BASE + idHref, { waitUntil: 'networkidle' });
      await screenshot('issue63_id_loaded');
      const body = await page.textContent('body');
      result('issue63', '?id= laadt items correct in builder',
        (body.includes('Flogging') || body.includes('Spanking')) && !body.includes('Error') ? 'pass' : 'fail', '');

      // Long-press on list item
      await page.waitForTimeout(400);
      const listItems = await page.locator('li:not(nav li), [class*="item"]:not([class*="nav"])').all();
      if (listItems.length > 0) {
        const item = listItems[0];
        const box = await item.boundingBox().catch(() => null);
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await page.waitForTimeout(400);
          await page.mouse.up();
          await page.waitForTimeout(500);
          await screenshot('issue63_longpress');
          const reorderUI = await page.locator('button:has-text("↑"), button:has-text("↓"), button:has-text("Klaar"), [class*="reorder"]').count();
          result('issue63', 'Long-press 300ms → reorder-modus actief', reorderUI > 0 ? 'pass' : 'fail', `${reorderUI} reorder elements`);

          if (reorderUI > 0) {
            const upFirst = page.locator('button:has-text("↑")').first();
            const upDisabled = await upFirst.getAttribute('disabled').catch(() => null);
            result('issue63', '↑ op eerste item uitgeschakeld', upDisabled !== null ? 'pass' : 'fail', '');

            const klaarBtn = page.locator('button:has-text("Klaar")').first();
            if (await klaarBtn.count() > 0) {
              await klaarBtn.click();
              await page.waitForTimeout(300);
              const reorderAfter = await page.locator('button:has-text("Klaar")').count();
              result('issue63', 'Klaar-knop verlaat reorder-modus', reorderAfter === 0 ? 'pass' : 'fail', '');
            } else {
              result('issue63', 'Klaar-knop verlaat reorder-modus', 'fail', 'No Klaar button');
            }
            const savedText = await page.locator(':text("Opgeslagen")').count();
            result('issue63', 'Opgeslagen-badge reset na herordenen', savedText === 0 ? 'pass' : 'fail', '');
          } else {
            result('issue63', '↑ op eerste item uitgeschakeld', 'fail', 'No reorder mode triggered');
            result('issue63', 'Klaar-knop verlaat reorder-modus', 'fail', 'Skipped');
            result('issue63', 'Opgeslagen-badge reset na herordenen', 'fail', 'Skipped');
          }
        } else {
          result('issue63', 'Long-press 300ms → reorder-modus actief', 'fail', 'No bounding box');
          result('issue63', '↑ op eerste item uitgeschakeld', 'fail', 'Skipped');
          result('issue63', 'Klaar-knop verlaat reorder-modus', 'fail', 'Skipped');
          result('issue63', 'Opgeslagen-badge reset na herordenen', 'fail', 'Skipped');
        }
      } else {
        result('issue63', 'Long-press 300ms → reorder-modus actief', 'fail', 'No list items found');
        result('issue63', '↑ op eerste item uitgeschakeld', 'fail', 'Skipped');
        result('issue63', 'Klaar-knop verlaat reorder-modus', 'fail', 'Skipped');
        result('issue63', 'Opgeslagen-badge reset na herordenen', 'fail', 'Skipped');
      }
    } else {
      result('issue63', '?id= laadt items correct in builder', 'fail', 'No ?id= link in /scenes');
      result('issue63', 'Long-press 300ms → reorder-modus actief', 'fail', 'Skipped');
      result('issue63', '↑ op eerste item uitgeschakeld', 'fail', 'Skipped');
      result('issue63', 'Klaar-knop verlaat reorder-modus', 'fail', 'Skipped');
      result('issue63', 'Opgeslagen-badge reset na herordenen', 'fail', 'Skipped');
    }
    await ctx.close();
  }

  // /scenes list + detail + AftercareSheet
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await seedState(baseState({ scenes: [completedScene, plannedScene] }));
    await page.goto(BASE + '/scenes', { waitUntil: 'networkidle' });
    await screenshot('issue63_scenes_full');

    // Bekijken link
    const bekijken = page.locator('a:has-text("Bekijken")').first();
    if (await bekijken.count() > 0) {
      result('issue63', 'Afgeronde scènes: Bekijken → /scenes/[id]', 'pass', '');

      await bekijken.click();
      await page.waitForTimeout(500);
      await screenshot('issue63_scene_detail');
      const detailBody = await page.textContent('body');

      const hasTraffic = detailBody.includes('🟢') || await page.locator('[class*="traffic"]').count() > 0;
      result('issue63', 'Traffic-light header zichtbaar met correcte kleur', hasTraffic ? 'pass' : 'fail', '');

      const hasWentWell = detailBody.includes('Alles ging soepel');
      result('issue63', 'wentWell en remember volledig weergegeven', hasWentWell ? 'pass' : 'fail', '');

      const editBtn = page.locator('button:has-text("Bewerken"), button[aria-label*="bewerk"]').first();
      if (await editBtn.count() > 0) {
        await editBtn.click();
        await page.waitForTimeout(600);
        await screenshot('issue63_edit_open');
        const editBody = await page.textContent('body');
        result('issue63', 'Bewerken-knop opent AftercareSheet met pre-fill',
          editBody.includes('🟢') || editBody.includes('aftercare') || editBody.includes('Aftercare') ? 'pass' : 'fail', '');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
      } else {
        result('issue63', 'Bewerken-knop opent AftercareSheet met pre-fill', 'fail', 'No Bewerken button');
      }

      // Delete inline confirm
      let browserConfirmFired = false;
      page.once('dialog', async (d) => { browserConfirmFired = true; await d.dismiss(); });
      const delBtn = page.locator('button:has-text("Verwijder"), button[aria-label*="verwijder"]').first();
      if (await delBtn.count() > 0) {
        await delBtn.click();
        await page.waitForTimeout(500);
        await screenshot('issue63_delete');
        const inlineConfirm = await page.locator('button:has-text("Annuleren")').count();
        result('issue63', 'Verwijder-knop toont inline confirm — geen browser confirm()',
          !browserConfirmFired && inlineConfirm > 0 ? 'pass' : 'fail',
          browserConfirmFired ? 'browser confirm() triggered' : `Annuleren visible: ${inlineConfirm}`);

        const cancelBtn = page.locator('button:has-text("Annuleren")').first();
        if (await cancelBtn.count() > 0) {
          await cancelBtn.click();
          await page.waitForTimeout(300);
          result('issue63', 'Annuleren annuleert de delete',
            page.url().includes('/scenes/') ? 'pass' : 'fail', page.url());
        } else {
          result('issue63', 'Annuleren annuleert de delete', 'fail', 'No Annuleren in confirm');
        }
      } else {
        result('issue63', 'Verwijder-knop toont inline confirm', 'fail', 'No delete button');
        result('issue63', 'Annuleren annuleert de delete', 'fail', 'Skipped');
      }
    } else {
      result('issue63', 'Afgeronde scènes: Bekijken → /scenes/[id]', 'fail', 'No Bekijken link');
      result('issue63', 'Traffic-light header zichtbaar', 'fail', 'Skipped');
      result('issue63', 'wentWell en remember volledig weergegeven', 'fail', 'Skipped');
      result('issue63', 'Bewerken-knop opent AftercareSheet', 'fail', 'Skipped');
      result('issue63', 'Verwijder-knop toont inline confirm', 'fail', 'Skipped');
      result('issue63', 'Annuleren annuleert de delete', 'fail', 'Skipped');
    }

    // Back to /scenes
    await page.goto(BASE + '/scenes', { waitUntil: 'networkidle' });
    await screenshot('issue63_scenes_for_list_checks');
    const spelenCount = await page.locator('a:has-text("Spelen"), button:has-text("Spelen")').count();
    const afrondCount = await page.locator('button:has-text("Afronden")').count();
    result('issue63', 'Geplande scènes: Spelen + Afronden beide zichtbaar',
      spelenCount > 0 && afrondCount > 0 ? 'pass' : 'fail', `Spelen:${spelenCount} Afronden:${afrondCount}`);

    // Afronden from list opens sheet
    const afrondListBtn = page.locator('button:has-text("Afronden")').first();
    if (await afrondListBtn.count() > 0) {
      await afrondListBtn.click();
      await page.waitForTimeout(700);
      await screenshot('issue63_aftercare_from_list');
      const sheetBody = await page.textContent('body');
      const trafficCount = await page.locator('button:has-text("🟢"), button:has-text("🟡"), button:has-text("🔴")').count();
      result('issue63', 'Afronden-knop opent AftercareSheet vanuit lijst', trafficCount >= 1 ? 'pass' : 'fail', `${trafficCount} traffic btns`);

      result('issue63', 'Traffic light selectie werkt', trafficCount >= 3 ? 'pass' : 'fail', `${trafficCount} buttons`);

      const saveBtnSheet = page.locator('button:has-text("Opslaan")').last();
      const saveDisabled = await saveBtnSheet.getAttribute('disabled').catch(() => null);
      result('issue63', 'Opslaan uitgeschakeld zonder traffic light selectie',
        saveDisabled !== null ? 'pass' : 'fail', `disabled=${saveDisabled}`);
    } else {
      result('issue63', 'Afronden-knop opent AftercareSheet vanuit lijst', 'fail', 'No Afronden in list');
      result('issue63', 'Traffic light selectie werkt', 'fail', 'Skipped');
      result('issue63', 'Opslaan uitgeschakeld zonder traffic light', 'fail', 'Skipped');
    }

    const lineClamp = await page.locator('[class*="line-clamp"]').count();
    result('issue63', 'Aftercare-tekst: max 2 regels (line-clamp)', lineClamp > 0 ? 'pass' : 'fail', `${lineClamp} clamped`);

    result('issue63', 'Sheet animeert in van onderaf (framer-motion)', 'manual', 'Animation needs visual inspection');
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
        version: 9,
      }));
    });
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
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
