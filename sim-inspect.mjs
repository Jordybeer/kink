import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const VIEWPORT = { width: 390, height: 844 };

const ownProfile = {
  id: 'sim-own-001',
  name: 'SimOwn',
  role: 'Submissive',
  entries: {
    flogging: { score: null, desire: null, status: 'yes', comment: '' },
    spanking_hand: { score: null, desire: null, status: 'yes', comment: '' },
    blindfold: { score: null, desire: null, status: 'willing', comment: '' },
    over_de_knie: { score: null, desire: null, status: 'no', comment: '' },
    hard_limit_test: { score: null, desire: null, status: 'hard_no', comment: '' },
  },
  createdAt: Date.now() - 100000,
  updatedAt: Date.now(),
  customKinks: [],
  experienceLevel: 'beginner',
};
const importedProfile = {
  id: 'sim-partner-001',
  name: 'SimPartner',
  role: 'Dominant',
  entries: {
    flogging: { score: null, desire: null, status: 'yes', comment: '' },
    spanking_hand: { score: null, desire: null, status: 'yes', comment: '' },
    blindfold: { score: null, desire: null, status: 'no', comment: '' },
    over_de_knie: { score: null, desire: null, status: 'yes', comment: '' },
    hard_limit_test: { score: null, desire: null, status: 'hard_no', comment: '' },
  },
  createdAt: Date.now() - 50000,
  updatedAt: Date.now(),
  isImported: true,
  customKinks: [],
  experienceLevel: 'ervaren',
};

const twoProfileState = {
  state: {
    theme: 'midnight',
    profiles: [ownProfile, importedProfile],
    contracts: [],
    scenes: [],
    appLockPin: null,
    appLockEnabled: false,
    pinnedProfileId: null,
    biometricEnabled: false,
    onboardingComplete: true,
    profileTourComplete: true,
    biometricCredentialId: null,
    installPromptDismissed: true,
  },
  version: 9,
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: VIEWPORT });
const page = await ctx.newPage();

await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.evaluate((s) => {
  localStorage.setItem('kink-profiles', JSON.stringify(s));
}, twoProfileState);

const sceneUrl = `${BASE}/scene?a=sim-own-001&b=sim-partner-001`;
await page.goto(sceneUrl, { waitUntil: 'networkidle' });
await page.screenshot({ path: '/tmp/sim-screenshots/testplan/inspect_scene.png' });

// Get buttons
const buttons = await page.locator('button').all();
console.log('\n=== BUTTONS ON /scene page ===');
for (const btn of buttons) {
  const text = await btn.innerText().catch(() => '');
  const cls = await btn.getAttribute('class') || '';
  const disabled = await btn.getAttribute('disabled');
  console.log(`  [${disabled !== null ? 'DISABLED' : 'enabled'}] "${text.replace(/\n/g,' ').substring(0,50)}" cls="${cls.substring(0,60)}"`);
}

// Inspect links
const links = await page.locator('a').all();
console.log('\n=== LINKS ===');
for (const link of links) {
  const text = await link.innerText().catch(() => '');
  const href = await link.getAttribute('href') || '';
  console.log(`  "${text.replace(/\n/g,' ').substring(0,40)}" -> ${href}`);
}

// Check all clickable elements with color info
console.log('\n=== PAGE STRUCTURE (first 3000 chars of body) ===');
const bodyHtml = await page.evaluate(() => document.body.innerHTML.substring(0, 3000));
console.log(bodyHtml);

// Also check /scenes page
await page.goto(BASE + '/scenes', { waitUntil: 'networkidle' });
await page.screenshot({ path: '/tmp/sim-screenshots/testplan/inspect_scenes.png' });

console.log('\n=== /scenes BUTTONS ===');
const sceneBtns = await page.locator('button').all();
for (const btn of sceneBtns) {
  const text = await btn.innerText().catch(() => '');
  const cls = await btn.getAttribute('class') || '';
  console.log(`  "${text.replace(/\n/g,' ').substring(0,60)}" cls="${cls.substring(0,40)}"`);
}

console.log('\n=== /scenes BODY (first 2000 chars) ===');
const scenesBody = await page.evaluate(() => document.body.innerHTML.substring(0, 2000));
console.log(scenesBody);

await ctx.close();
await browser.close();
