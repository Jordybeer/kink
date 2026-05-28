import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const issues = [];

// Seed localStorage with a profile that has entries
await page.goto('http://localhost:3000');
await page.evaluate(() => {
  const entries = {};
  for (let i = 1; i <= 10; i++) {
    entries[`k${i}`] = { status: i % 3 === 0 ? 'hard_no' : i % 2 === 0 ? 'yes' : 'maybe', score: null, comment: i === 2 ? 'een testnotitie om te checken' : '' };
  }
  const state = {
    state: {
      profiles: [{
        id: 'test1', name: 'Alex', role: 'Switch', experienceLevel: 'gevorderd',
        relationshipStatus: 'Open relatie', fetLifeUsername: 'alextest',
        customKinks: [{ id: 'ck1', name: 'Eigen kink test' }],
        createdAt: 1000000, updatedAt: 1000000, entries
      }],
      contracts: [], onboardingComplete: true, profileTourComplete: true,
      installPromptDismissed: true, theme: 'midnight'
    }, version: 6
  };
  localStorage.setItem('kink-profiles', JSON.stringify(state));
});

async function audit(url, label) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Horizontal overflow (excluding intentional scrollers)
  const overflow = await page.evaluate(() => {
    const ignore = new Set(['HTML', 'BODY', 'SCRIPT', 'STYLE', 'NOSCRIPT']);
    return Array.from(document.querySelectorAll('*'))
      .filter(el => {
        if (ignore.has(el.tagName)) return false;
        const cs = getComputedStyle(el);
        if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') return false;
        return el.scrollWidth > el.clientWidth + 4;
      })
      .map(el => el.tagName + (el.className ? ' .' + String(el.className).trim().split(/\s+/).slice(0,2).join('.') : ''))
      .slice(0, 5);
  });
  if (overflow.length) issues.push({ page: label, issue: 'horizontal overflow', items: overflow });

  // Tiny touch targets (< 28px height)
  const tiny = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, a[href]'))
      .filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.height < 28;
      })
      .map(el => `"${el.textContent?.trim().slice(0,20) ?? ''}" ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}px`)
      .slice(0, 5);
  });
  if (tiny.length) issues.push({ page: label, issue: 'small touch targets (<28px)', items: tiny });

  // Images without alt attribute
  const noAlt = await page.evaluate(() =>
    Array.from(document.querySelectorAll('img:not([alt])')).map(i => i.src?.slice(-40) ?? '?').slice(0,3)
  );
  if (noAlt.length) issues.push({ page: label, issue: 'img missing alt', items: noAlt });

  // Empty buttons (no label, no text)
  const emptyBtns = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .filter(b => !b.textContent?.trim() && !b.getAttribute('aria-label') && !b.getAttribute('title'))
      .map(b => b.outerHTML.slice(0, 80))
      .slice(0, 3)
  );
  if (emptyBtns.length) issues.push({ page: label, issue: 'unlabelled buttons', items: emptyBtns });

  // Duplicate heading levels (h1 > 1 on a page)
  const h1s = await page.evaluate(() => Array.from(document.querySelectorAll('h1')).map(h => h.textContent?.trim().slice(0,40) ?? ''));
  if (h1s.length > 1) issues.push({ page: label, issue: 'multiple h1 elements', items: h1s });

  return await page.screenshot({ path: `/tmp/pw-${label}.png`, fullPage: false });
}

for (const [url, label] of [
  ['http://localhost:3000', 'home'],
  ['http://localhost:3000/profile/test1', 'profile'],
  ['http://localhost:3000/compare?a=test1', 'compare'],
  ['http://localhost:3000/contract?a=test1', 'contract'],
]) {
  try { await audit(url, label); } catch (e) { issues.push({ page: label, issue: 'page error', items: [String(e).slice(0,120)] }); }
}

await browser.close();

if (issues.length === 0) {
  console.log('✅ Geen UI-issues gevonden');
} else {
  console.log(`⚠️  ${issues.length} issues gevonden:\n`);
  for (const i of issues) {
    console.log(`[${i.page}] ${i.issue}`);
    for (const item of i.items) console.log(`  · ${item}`);
  }
}
