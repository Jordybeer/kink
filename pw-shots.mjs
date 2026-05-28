import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

await page.goto('http://localhost:3000');
await page.evaluate(() => {
  const entries = {};
  const statuses = ['yes','willing','maybe','no','hard_no'];
  for (let i = 1; i <= 40; i++) {
    entries[`k${i}`] = { status: statuses[i % 5], score: null, comment: i === 3 ? 'Alleen in veilige omgeving' : '', tags: i === 5 ? ['eerste keer'] : [] };
  }
  const state = {
    state: {
      profiles: [
        { id: 'p1', name: 'Alex', role: 'Switch', experienceLevel: 'gevorderd', relationshipStatus: 'Open relatie', fetLifeUsername: 'alextest', customKinks: [{ id: 'ck1', name: 'Eigen kink' }], createdAt: Date.now()-86400000*30, updatedAt: Date.now(), entries },
        { id: 'p2', name: 'Sam', role: 'Submissive', experienceLevel: 'beginner', customKinks: [], createdAt: Date.now()-86400000*5, updatedAt: Date.now(), entries: { k1: { status: 'yes', score: null, comment: '' }, k2: { status: 'no', score: null, comment: '' } } }
      ],
      contracts: [], onboardingComplete: true, profileTourComplete: true, installPromptDismissed: true, theme: 'midnight'
    }, version: 6
  };
  localStorage.setItem('kink-profiles', JSON.stringify(state));
});

for (const [url, name] of [
  ['http://localhost:3000', 'home'],
  ['http://localhost:3000/profile/p1', 'profile'],
  ['http://localhost:3000/compare?a=p1&b=p2', 'compare'],
  ['http://localhost:3000/contract?a=p1&b=p2', 'contract'],
  ['http://localhost:3000/scene', 'scene'],
  ['http://localhost:3000/session', 'session'],
]) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `/tmp/ks-${name}.png`, fullPage: true });
  console.log(`shot: ${name}`);
}

await page.goto('http://localhost:3000/profile/p1', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.evaluate(() => window.scrollBy(0, 750));
await page.waitForTimeout(400);
await page.screenshot({ path: '/tmp/ks-profile-kinks.png' });
console.log('shot: profile-kinks');

await browser.close();
