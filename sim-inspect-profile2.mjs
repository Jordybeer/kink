import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const VIEWPORT = { width: 390, height: 844 };

const robinLastState = {"state":{"theme":"midnight","profiles":[{"id":"9kwfvmdxmeompt5mg6g","name":"Robin","role":"Submissive","entries":{"blindfold":{"score":null,"desire":null,"status":null,"comment":""},"handcuffs":{"score":null,"desire":null,"status":null,"comment":""},"praise_kink":{"score":null,"desire":null,"status":null,"comment":""},"collar_leash":{"score":null,"desire":null,"status":null,"comment":""},"over_de_knie":{"score":null,"desire":null,"status":null,"comment":""},"leather_cuffs":{"score":null,"desire":null,"status":null,"comment":""},"spanking_hand":{"score":null,"desire":null,"status":null,"comment":""},"dominance_submission":{"score":null,"desire":null,"status":null,"comment":""}},"createdAt":1780194133096,"updatedAt":1780483065470,"customKinks":[],"experienceLevel":"beginner"}],"contracts":[],"scenes":[],"appLockPin":null,"appLockEnabled":false,"pinnedProfileId":null,"biometricEnabled":false,"onboardingComplete":true,"profileTourComplete":true,"biometricCredentialId":null,"installPromptDismissed":true},"version":10};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: VIEWPORT });
const page = await ctx.newPage();

await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.evaluate((s) => { localStorage.setItem('kink-profiles', JSON.stringify(s)); }, robinLastState);
await page.goto(`${BASE}/profile/9kwfvmdxmeompt5mg6g`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// Click Bewerken tab to get edit mode
const bewerkenTab = page.locator('button:has-text("Bewerken")').first();
if (await bewerkenTab.count() > 0) {
  await bewerkenTab.click();
  await page.waitForTimeout(500);
}

// All buttons
const allBtns = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('button')).map(b => ({
    text: b.innerText.trim().substring(0, 60),
    aria: b.getAttribute('aria-label'),
    disabled: b.disabled
  }));
});
console.log('ALL BUTTONS after Bewerken tab:');
allBtns.forEach((b, i) => console.log(i, JSON.stringify(b)));

await page.screenshot({ path: '/tmp/sim-profile-bewerken.png', fullPage: true });

await ctx.close();
await browser.close();
