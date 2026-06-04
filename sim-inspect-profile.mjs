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

// Take screenshot
await page.screenshot({ path: '/tmp/sim-profile-robin.png', fullPage: true });

// Dump page structure
const body = await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
    text: b.innerText.trim().substring(0, 50),
    aria: b.getAttribute('aria-label'),
    disabled: b.disabled
  })).filter(b => b.text || b.aria);
  
  const inputs = Array.from(document.querySelectorAll('input, select')).map(i => ({
    type: i.type,
    name: i.name,
    value: i.value,
    placeholder: i.placeholder
  }));
  
  const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4')).map(h => h.innerText.trim());
  
  return { buttons: buttons.slice(0, 30), inputs: inputs.slice(0, 10), headings };
});

console.log('Headings:', JSON.stringify(body.headings));
console.log('\nButtons:', JSON.stringify(body.buttons, null, 2));
console.log('\nInputs:', JSON.stringify(body.inputs));
console.log('\nURL:', page.url());

await ctx.close();
await browser.close();
