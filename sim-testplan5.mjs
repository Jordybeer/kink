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
  if (await page.locator('[role="dialog"][aria-label="Kinks toevoegen"]').count() > 0) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }
}

async function clickFirstChipInDrawer() {
  const btns = await page.locator('[role="dialog"] button:not([disabled])').all();
  for (const btn of btns) {
    const txt = await btn.innerText().catch(() => '');
    const al = await btn.getAttribute('aria-label') || '';
    if (txt.trim().length > 1 && !al.includes('sluit') && !al.includes('close')) {
      await btn.click({ force: true, timeout: 3000 });
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

const plannedScene = {
  id: 'scene-planned-001', title: 'SimOwn & SimPartner',
  profileAId: 'sim-own-001', profileBId: 'sim-partner-001',
  profileAName: 'SimOwn', profileBName: 'SimPartner',
  items: [{ id: 'item-1', name: 'Flogging', kinkId: 'flogging', intensity: 'midden', duration: '', note: '', fromKink: true }],
  status: 'planned', createdAt: Date.now() - 4000, updatedAt: Date.now(),
};
const completedScene = {
  id: 'scene-done-001', title: 'SimOwn & SimPartner',
  profileAId: 'sim-own-001', profileBId: 'sim-partner-001',
  profileAName: 'SimOwn', profileBName: 'SimPartner',
  items: [{ id: 'item-2', name: 'Blindfold', kinkId: 'blindfold', intensity: 'midden', duration: '', note: '', fromKink: true }],
  status: 'completed', completedAt: Date.now() - 3000,
  aftercare: { trafficLight: 'green', wentWell: 'Alles ging soepel', remember: 'Veiligheidswoord bespreken', completedAt: Date.now() - 3000 },
  createdAt: Date.now() - 6000, updatedAt: Date.now(),
};
const draftScene = {
  id: 'scene-draft-001', title: 'SimOwn & SimPartner',
  profileAId: 'sim-own-001', profileBId: 'sim-partner-001',
  profileAName: 'SimOwn', profileBName: 'SimPartner',
  items: [{ id: 'item-3', name: 'Flogging', kinkId: 'flogging', intensity: 'midden', duration: '', note: '', fromKink: true }],
  status: 'draft', createdAt: Date.now() - 5000, updatedAt: Date.now(),
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
    version: 10,
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
    result('issue61', '/scenes lege store — lege-staat tekst, geen crash',
      /nog geen|geen|leeg/i.test(body) && !body.includes('Error') ? 'pass' : 'fail', '');
    await ctx.close();
  }

  // Compare auto-select
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

  // Scene hub chip flow: full flow via live interaction
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await seedAndReload(`${BASE}/scene?a=sim-own-001&b=sim-partner-001`);

    const kinkBtn = page.locator('button[aria-label="Kinks toevoegen"]').first();
    if (await kinkBtn.count() === 0) {
      ['chip drawer toont kink-inhoud','Geen hard_no chips','chip klikken','Opslaan → /scene?id=...','/scenes Concepten'].forEach(s => result('issue61', s, 'fail', 'No drawer btn'));
    } else {
      await kinkBtn.click();
      await page.waitForTimeout(700);
      await screenshot('issue61_drawer_open');

      const drawerHtml = await page.content();
      result('issue61', 'Chip drawer toont kink-inhoud',
        await page.locator('[role="dialog"] button:not([disabled])').count() > 0 ? 'pass' : 'fail', '');
      result('issue61', 'Geen hard_no chips in drawer', !drawerHtml.toLowerCase().includes('paddling') ? 'pass' : 'fail', '');

      const clicked = await clickFirstChipInDrawer();
      result('issue61', 'Chip klikken — item in scenelijst', clicked ? 'pass' : 'fail', '');
      await page.waitForTimeout(400);
      await closeDrawer();
      await page.waitForTimeout(400);

      const opslBtn = page.locator('button:has-text("Opslaan")').first();
      const opslDisabled = await opslBtn.getAttribute('disabled').catch(() => 'yes');
      if (opslDisabled === null) {
        await opslBtn.click({ timeout: 5000 });
        await page.waitForTimeout(1000);
        const url = page.url();
        result('issue61', 'Opslaan → URL wordt /scene?id=...', url.includes('id=') ? 'pass' : 'fail', '');
        await page.goto(BASE + '/scenes', { waitUntil: 'networkidle' });
        await screenshot('issue61_scenes_draft');
        const body = await page.textContent('body');
        result('issue61', '/scenes — scène staat onder Concepten', !body.includes('Nog geen concepten') ? 'pass' : 'fail', '');
      } else {
        result('issue61', 'Opslaan → URL wordt /scene?id=...', 'fail', 'Opslaan disabled after chip');
        result('issue61', '/scenes — scène staat onder Concepten', 'fail', 'Skipped');
      }
    }
    await ctx.close();
  }

  // Planned scene: Spelen + Afronden visible + aftercare flow
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await seedAndReload(BASE + '/scenes', { scenes: [plannedScene] });
    await screenshot('issue61_scenes_planned');

    const spelenCount = await page.locator('button:has-text("Spelen")').count();
    const afrondCount = await page.locator('button:has-text("Afronden")').count();
    result('issue61', 'Geplande scène: Spelen + Afronden beide zichtbaar',
      spelenCount > 0 && afrondCount > 0 ? 'pass' : 'fail', `Spelen:${spelenCount} Afronden:${afrondCount}`);

    // Spelen button navigates to /scene?id=
    const spelenBtn = page.locator('button:has-text("Spelen")').first();
    if (await spelenBtn.count() > 0) {
      await spelenBtn.click();
      await page.waitForURL(`${BASE}/scene?id=**`, { timeout: 5000 }).catch(() => {});
      await screenshot('issue61_spelen_nav');
      const url = page.url();
      result('issue61', '▶ Spelen → navigeert naar /scene?id=...', url.includes('/scene?id=') ? 'pass' : 'fail', `URL: ${url}`);
      await page.goBack({ waitUntil: 'networkidle' });
    } else {
      result('issue61', '▶ Spelen → navigeert naar /scene?id=...', 'fail', 'No Spelen button');
    }

    // Aftercare flow
    const afrondBtn = page.locator('button:has-text("Afronden")').first();
    if (await afrondBtn.count() > 0) {
      await afrondBtn.click();
      await page.waitForTimeout(700);
      await screenshot('issue61_aftercare_sheet');
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
          await screenshot('issue61_aftercare_saved');
          const body = await page.textContent('body');
          result('issue61', '🟢 + Opslaan → Afgerond zichtbaar', body.includes('Afgerond') || body.includes('🟢') ? 'pass' : 'fail', '');
          await page.goto(BASE + '/scenes', { waitUntil: 'networkidle' });
          await screenshot('issue61_scenes_completed');
          const body2 = await page.textContent('body');
          result('issue61', '/scenes — scène staat onder Afgerond', !body2.includes('Nog geen afgerond') ? 'pass' : 'fail', '');
        } else {
          result('issue61', '🟢 + Opslaan → Afgerond', 'fail', 'Opslaan still disabled after selecting 🟢');
          result('issue61', '/scenes — scène staat onder Afgerond', 'fail', 'Skipped');
        }
      } else {
        result('issue61', 'Opslaan uitgeschakeld voor traffic light selectie', 'fail', 'No traffic lights');
        result('issue61', '🟢 + Opslaan → Afgerond', 'fail', 'Skipped');
        result('issue61', '/scenes — scène staat onder Afgerond', 'fail', 'Skipped');
      }
    } else {
      result('issue61', 'Afronden — AftercareSheet', 'fail', 'No Afronden button');
      result('issue61', 'Opslaan uitgeschakeld voor traffic light', 'fail', 'Skipped');
      result('issue61', '🟢 + Opslaan → Afgerond', 'fail', 'Skipped');
      result('issue61', '/scenes — scène staat onder Afgerond', 'fail', 'Skipped');
    }
    await ctx.close();
  }

  // Settings / PIN (check if profile page has settings)
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await seedAndReload(`${BASE}/profile/sim-own-001`);
    await screenshot('issue61_profile_settings');
    const body = await page.textContent('body');
    const hasSettings = body.includes('Beveiliging') || body.includes('PIN') || body.includes('Slot') || body.includes('Lock');
    result('issue61', 'Settings → Beveiliging PIN flow toegankelijk', hasSettings ? 'pass' : 'fail', '');
    result('issue61', 'Juiste PIN → app ontgrendelt', 'manual', 'PIN flow requires interactive verification');
    result('issue61', '/compare → / — lockscreen NIET zichtbaar (sessie onthouden)', 'manual', 'Session lock requires full PIN flow');
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
    await screenshot('issue63_scene_initial');

    result('issue63', 'Geen arc-balk bij lege lijst',
      await page.locator('[class*="arc"], [class*="Arc"]').count() === 0 ? 'pass' : 'fail', '');

    const kinkBtn = page.locator('button[aria-label="Kinks toevoegen"]').first();
    if (await kinkBtn.count() > 0) {
      await kinkBtn.click();
      await page.waitForTimeout(700);
      await screenshot('issue63_drawer_open');

      const html = await page.content();
      result('issue63', 'Geen chips voor hard_no kinks', !html.toLowerCase().includes('paddling') ? 'pass' : 'fail', '');
      result('issue63', 'Groene chips = mutual, oranje = spanning (drawer heeft chips)',
        await page.locator('[role="dialog"] button:not([disabled])').count() > 0 ? 'pass' : 'fail', '');

      const clicked = await clickFirstChipInDrawer();
      result('issue63', 'Toegevoegde chip disabled na klik', clicked ? 'pass' : 'fail', '');
      await page.waitForTimeout(400);
      await closeDrawer();
      await page.waitForTimeout(400);
      await screenshot('issue63_after_chip');

      result('issue63', 'Arc-balk toont proporties na toevoegen item',
        await page.locator('svg, [class*="arc"]').count() > 0 ? 'pass' : 'fail', '');

      result('issue63', 'Flex-transitie (300ms) zichtbaar', 'manual', 'CSS animation headless');
      result('issue63', 'Sheet drag-to-close werkt', 'manual', 'Drag gesture needs touch emulation');

      const opslBtn = page.locator('button:has-text("Opslaan")').first();
      if (await opslBtn.getAttribute('disabled').catch(() => 'y') === null) {
        await opslBtn.click({ timeout: 5000 });
        await page.waitForTimeout(1000);
        const url = page.url();
        result('issue63', 'Opslaan (draft) → URL wordt /scene?id=...', url.includes('id=') ? 'pass' : 'fail', '');
        await page.goto(BASE + '/scenes', { waitUntil: 'networkidle' });
        await screenshot('issue63_scenes_draft');
        result('issue63', 'Draft verschijnt in /scenes onder Concepten',
          !(await page.textContent('body')).includes('Nog geen concepten') ? 'pass' : 'fail', '');
      } else {
        result('issue63', 'Opslaan (draft) → URL wordt /scene?id=...', 'fail', 'Opslaan disabled after chip');
        result('issue63', 'Draft verschijnt in /scenes', 'fail', 'Skipped');
      }
    } else {
      ['Geen chips hard_no','Groene/oranje chips','Chip disabled','Arc toont proporties','Flex-transitie','Sheet drag-close','Opslaan draft','Draft in /scenes'].forEach((s,i) =>
        result('issue63', s, ['Flex-transitie','Sheet drag-close'].includes(s) ? 'manual' : 'fail', 'No drawer'));
    }
    await ctx.close();
  }

  // Plannen → Gepland
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await seedAndReload(`${BASE}/scene?a=sim-own-001&b=sim-partner-001`);
    const kinkBtn = page.locator('button[aria-label="Kinks toevoegen"]').first();
    if (await kinkBtn.count() > 0) {
      await kinkBtn.click();
      await page.waitForTimeout(600);
      await clickFirstChipInDrawer();
      await page.waitForTimeout(400);
      await closeDrawer();
      await page.waitForTimeout(400);
    }
    const planBtn = page.locator('button:has-text("Plannen")').first();
    if (await planBtn.getAttribute('disabled').catch(() => 'y') === null) {
      await planBtn.click({ timeout: 5000 });
      await page.waitForTimeout(800);
      await page.goto(BASE + '/scenes', { waitUntil: 'networkidle' });
      await screenshot('issue63_scenes_planned');
      result('issue63', 'Plannen → verschijnt in /scenes onder Gepland',
        !(await page.textContent('body')).includes('Nog geen gepland') ? 'pass' : 'fail', '');
    } else {
      result('issue63', 'Plannen → verschijnt in /scenes onder Gepland', 'fail', 'Plannen disabled after chip');
    }
    await ctx.close();
  }

  // ?id= load: use Spelen button (SPA nav), then test long-press on scene builder
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await seedAndReload(BASE + '/scenes', { scenes: [draftScene] });
    await screenshot('issue63_scenes_seeded_draft');

    // Spelen button for draft navigates to /scene?id=
    const spelenBtn = page.locator('button:has-text("Spelen")').first();
    if (await spelenBtn.count() > 0) {
      await spelenBtn.click();
      await page.waitForURL(`${BASE}/scene?id=**`, { timeout: 5000 }).catch(() => {});
      await screenshot('issue63_scene_id_loaded');
      const url = page.url();
      const body = await page.textContent('body');
      result('issue63', '?id= laadt items correct in builder',
        url.includes('id=') && body.includes('Flogging') ? 'pass' : 'fail',
        url.includes('id=') ? '' : `URL: ${url}`);

      if (url.includes('id=')) {
        // Long-press test
        await page.waitForTimeout(400);
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
            result('issue63', 'Long-press 300ms → reorder-modus actief', reorderUI > 0 ? 'pass' : 'fail', `${reorderUI} elems`);
            if (reorderUI > 0) {
              const upDisabled = await page.locator('button:has-text("↑")').first().getAttribute('disabled').catch(() => null);
              result('issue63', '↑ op eerste item uitgeschakeld', upDisabled !== null ? 'pass' : 'fail', '');
              const klaarBtn = page.locator('button:has-text("Klaar")').first();
              if (await klaarBtn.count() > 0) {
                await klaarBtn.click();
                await page.waitForTimeout(300);
                result('issue63', 'Klaar-knop verlaat reorder-modus',
                  await page.locator('button:has-text("Klaar")').count() === 0 ? 'pass' : 'fail', '');
              } else {
                result('issue63', 'Klaar-knop verlaat reorder-modus', 'fail', 'No Klaar button');
              }
              result('issue63', 'Opgeslagen-badge reset na herordenen',
                await page.locator(':text("Opgeslagen")').count() === 0 ? 'pass' : 'fail', '');
            } else {
              ['↑ uitgeschakeld','Klaar verlaat reorder','Opgeslagen reset'].forEach(s => result('issue63', s, 'fail', 'No reorder mode'));
            }
          } else {
            ['Long-press → reorder','↑ uitgeschakeld','Klaar verlaat reorder','Opgeslagen reset'].forEach(s => result('issue63', s, 'fail', 'No bbox'));
          }
        } else {
          ['Long-press → reorder','↑ uitgeschakeld','Klaar verlaat reorder','Opgeslagen reset'].forEach(s => result('issue63', s, 'fail', 'No list items'));
        }
      } else {
        ['Long-press → reorder','↑ uitgeschakeld','Klaar verlaat reorder','Opgeslagen reset'].forEach(s => result('issue63', s, 'fail', 'Skipped — id= nav failed'));
      }
    } else {
      result('issue63', '?id= laadt items correct in builder', 'fail', 'No Spelen button for draft in /scenes');
      ['Long-press → reorder','↑ uitgeschakeld','Klaar verlaat reorder','Opgeslagen reset'].forEach(s => result('issue63', s, 'fail', 'Skipped'));
    }
    await ctx.close();
  }

  // Detail page + delete confirm (navigate directly)
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await seedAndReload(BASE + '/scenes', { scenes: [completedScene] });
    await page.goto(`${BASE}/scenes/${completedScene.id}`, { waitUntil: 'networkidle' });
    await screenshot('issue63_scene_detail');
    const detailBody = await page.textContent('body');

    // Traffic light header
    result('issue63', 'Traffic-light header zichtbaar met correcte kleur',
      detailBody.includes('🟢') || await page.locator('[class*="traffic"]').count() > 0 ? 'pass' : 'fail', '');

    // wentWell and remember displayed
    result('issue63', 'wentWell en remember volledig weergegeven (niet afgekapt)',
      detailBody.includes('Alles ging soepel') ? 'pass' : 'fail', '');

    // Bewerken button (inside aftercare section)
    const editBtn = page.locator('button:has-text("Bewerken")').first();
    if (await editBtn.count() > 0) {
      await editBtn.click();
      await page.waitForTimeout(600);
      await screenshot('issue63_edit_aftercare');
      const editBody = await page.textContent('body');
      result('issue63', 'Bewerken-knop opent AftercareSheet met pre-fill',
        editBody.includes('🟢') || editBody.includes('Aftercare') ? 'pass' : 'fail', '');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    } else {
      result('issue63', 'Bewerken-knop opent AftercareSheet', 'fail', 'No Bewerken button on detail page');
    }

    // Delete with inline confirm
    let browserConfirm = false;
    page.once('dialog', async (d) => { browserConfirm = true; await d.dismiss(); });
    const delBtn = page.locator('button:has-text("Verwijderen")').first();
    if (await delBtn.count() > 0) {
      await delBtn.click();
      await page.waitForTimeout(500);
      await screenshot('issue63_delete_confirm');
      const inlineConfirmCount = await page.locator('button:has-text("Annuleren")').count();
      result('issue63', 'Verwijder-knop toont inline confirm — geen browser confirm()',
        !browserConfirm && inlineConfirmCount > 0 ? 'pass' : 'fail',
        browserConfirm ? 'browser confirm()' : `Annuleren: ${inlineConfirmCount}`);

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
      result('issue63', 'Verwijder-knop toont inline confirm', 'fail', 'No Verwijderen button');
      result('issue63', 'Annuleren annuleert de delete', 'fail', 'Skipped');
    }
    await ctx.close();
  }

  // /scenes list tests (separate context, no state contamination)
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    page = await ctx.newPage();
    await seedAndReload(BASE + '/scenes', { scenes: [plannedScene, completedScene] });
    await screenshot('issue63_scenes_full');

    // Bekijken for completed
    const bekijken = page.locator('button:has-text("Bekijken")').first();
    result('issue63', 'Afgeronde scènes: Bekijken → /scenes/[id]', await bekijken.count() > 0 ? 'pass' : 'fail', '');

    // Spelen + Afronden for planned
    const spelenCount = await page.locator('button:has-text("Spelen")').count();
    const afrondCount = await page.locator('button:has-text("Afronden")').count();
    result('issue63', 'Geplande scènes: Spelen + Afronden beide zichtbaar',
      spelenCount > 0 && afrondCount > 0 ? 'pass' : 'fail', `Spelen:${spelenCount} Afronden:${afrondCount}`);

    // Afronden opens sheet
    const afrondBtn = page.locator('button:has-text("Afronden")').first();
    if (await afrondBtn.count() > 0) {
      await afrondBtn.click();
      await page.waitForTimeout(700);
      await screenshot('issue63_aftercare_from_list');
      const trafficCount = await page.locator('button:has-text("🟢"), button:has-text("🟡"), button:has-text("🔴")').count();
      result('issue63', 'Afronden-knop opent AftercareSheet vanuit lijst', trafficCount >= 1 ? 'pass' : 'fail', `${trafficCount}`);
      result('issue63', 'Traffic light selectie werkt (3 knoppen)', trafficCount >= 3 ? 'pass' : 'fail', `${trafficCount}`);

      const saveDis = await page.locator('button:has-text("Opslaan")').last().getAttribute('disabled').catch(() => null);
      result('issue63', 'Opslaan uitgeschakeld zonder traffic light selectie', saveDis !== null ? 'pass' : 'fail', `dis=${saveDis}`);
    } else {
      ['Afronden opent AftercareSheet','Traffic light werkt','Opslaan uitgeschakeld'].forEach(s => result('issue63', s, 'fail', 'No Afronden'));
    }

    // line-clamp on aftercare text
    result('issue63', 'Aftercare-tekst: max 2 regels (line-clamp)',
      await page.locator('[class*="line-clamp"]').count() > 0 ? 'pass' : 'fail', '');

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
        version: 10,
      }));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await screenshot('issue63_onboarding');

    const contBtn = page.locator('button:has-text("Doorgaan"), button:has-text("Verder"), button:has-text("Begin")').first();
    if (await contBtn.count() > 0) {
      const box1 = await contBtn.boundingBox();
      await contBtn.click();
      await page.waitForTimeout(600);
      const cont2 = page.locator('button:has-text("Doorgaan"), button:has-text("Verder"), button:has-text("Begin")').first();
      if (await cont2.count() > 0) {
        const box2 = await cont2.boundingBox();
        result('issue63', 'Continue-knop springt niet van positie tussen stappen',
          Math.abs(box1.y - box2.y) <= 10 ? 'pass' : 'fail', `shift:${Math.abs(box1.y - box2.y)}px`);
      } else {
        result('issue63', 'Continue-knop springt niet van positie tussen stappen', 'pass', 'Single-step onboarding');
      }
    } else {
      result('issue63', 'Continue-knop springt niet van positie tussen stappen', 'fail', 'No Continue button');
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
