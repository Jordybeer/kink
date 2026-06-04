import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const VIEWPORT = { width: 390, height: 844 };

const ownProfile = {
  id: 'sim-own-001', name: 'SimOwn', role: 'Submissive',
  entries: {
    flogging:     { score: null, desire: null, status: 'yes', comment: '' },
    spanking_hand:{ score: null, desire: null, status: 'yes', comment: '' },
  },
  createdAt: Date.now() - 100000, updatedAt: Date.now(),
  customKinks: [], experienceLevel: 'beginner',
};
const importedProfile = {
  id: 'sim-partner-001', name: 'SimPartner', role: 'Dominant',
  entries: {
    flogging:     { score: null, desire: null, status: 'yes', comment: '' },
    spanking_hand:{ score: null, desire: null, status: 'yes', comment: '' },
  },
  createdAt: Date.now() - 50000, updatedAt: Date.now(),
  isImported: true, customKinks: [], experienceLevel: 'ervaren',
};

const baseState = {
  state: {
    theme: 'midnight', profiles: [ownProfile, importedProfile],
    contracts: [], scenes: [],
    appLockPin: null, appLockEnabled: false, pinnedProfileId: null,
    biometricEnabled: false, onboardingComplete: true, profileTourComplete: true,
    biometricCredentialId: null, installPromptDismissed: true,
  },
  version: 9,
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: VIEWPORT });
const page = await ctx.newPage();

// Seed state, navigate to scene, add chip, save
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.evaluate((s) => { localStorage.setItem('kink-profiles', JSON.stringify(s)); }, baseState);
await page.goto(`${BASE}/scene?a=sim-own-001&b=sim-partner-001`, { waitUntil: 'networkidle' });

// Open drawer and click chip
const kinkBtn = page.locator('button[aria-label="Kinks toevoegen"]').first();
await kinkBtn.click();
await page.waitForTimeout(700);

// Click first chip
const drawerBtns = await page.locator('[role="dialog"] button:not([disabled])').all();
for (const btn of drawerBtns) {
  const txt = await btn.innerText().catch(() => '');
  const ariaLabel = await btn.getAttribute('aria-label') || '';
  if (txt.trim().length > 1 && !ariaLabel.includes('sluit')) {
    await btn.click({ force: true });
    break;
  }
}
await page.waitForTimeout(400);

// Close drawer
await page.mouse.click(10, 10);
await page.waitForTimeout(500);

// Save
const opslBtn = page.locator('button:has-text("Opslaan")').first();
const isDisabled = await opslBtn.getAttribute('disabled').catch(() => 'yes');
console.log('Opslaan disabled:', isDisabled);
if (isDisabled === null) {
  await opslBtn.click();
  await page.waitForTimeout(1000);
}

// Dump ALL localStorage keys and values
const allLS = await page.evaluate(() => {
  const result = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    try { result[key] = JSON.parse(localStorage.getItem(key)); }
    catch { result[key] = localStorage.getItem(key); }
  }
  return result;
});

console.log('\n=== ALL LOCALSTORAGE KEYS ===');
for (const [key, val] of Object.entries(allLS)) {
  if (typeof val === 'object' && val !== null) {
    console.log(`KEY: "${key}" =`, JSON.stringify(val).substring(0, 500));
  } else {
    console.log(`KEY: "${key}" =`, String(val).substring(0, 200));
  }
}

// Check current URL
console.log('\nCurrent URL:', page.url());

await ctx.close();
await browser.close();
