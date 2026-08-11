from pathlib import Path


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one seed-race target, found {count}")
    p.write_text(text.replace(old, new, 1))


replace_once(
    "scripts/screenshots.mjs",
    '''  const ctx  = await browser.newContext({ viewport: MOBILE });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.evaluate((seed) => localStorage.setItem("kink-profiles", JSON.stringify(seed)), SEED);
  await page.reload();
  await page.waitForTimeout(800);
  await assertSeedSurvived(page);
  await fn(page);''',
    '''  const ctx = await browser.newContext({ viewport: MOBILE });
  await ctx.addInitScript((seed) => {
    const guard = "kinksync-manual-screenshot-seeded";
    if (sessionStorage.getItem(guard) === "1") return;
    localStorage.setItem("kink-profiles", JSON.stringify(seed));
    sessionStorage.setItem(guard, "1");
  }, SEED);
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.waitForTimeout(800);
  await assertSeedSurvived(page);
  await fn(page);''',
)

replace_once(
    "scripts/audit-screenshots.mjs",
    '''  const ctx = await browser.newContext({ viewport: MOBILE });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.warn(`  ⚠ ${name} pageerror: ${e.message}`));
  await page.goto(BASE);
  await page.evaluate((seed) => localStorage.setItem("kink-profiles", JSON.stringify(seed)), SEED);
  await page.reload();
  await page.waitForTimeout(900);
  await assertSeedSurvived(page);
  await fn(page);''',
    '''  const ctx = await browser.newContext({ viewport: MOBILE });
  await ctx.addInitScript((seed) => {
    const guard = "kinksync-manual-audit-seeded";
    if (sessionStorage.getItem(guard) === "1") return;
    localStorage.setItem("kink-profiles", JSON.stringify(seed));
    sessionStorage.setItem(guard, "1");
  }, SEED);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.warn(`  ⚠ ${name} pageerror: ${e.message}`));
  await page.goto(BASE);
  await page.waitForTimeout(900);
  await assertSeedSurvived(page);
  await fn(page);''',
)

with Path("corrections.md").open("a") as f:
    f.write('''
## 2026-08-11 — Handmatige seed racete met de lege Zustand-hydration

**What went wrong:** De screenshottools openden eerst de app, schreven pas daarna hun seed naar `localStorage` en reloadeden vervolgens. De eerste lege Zustand-hydration kon in die tussenruimte nog naar dezelfde persistkey schrijven en de verse seed vervangen door `profiles: []`. De nieuwe post-hydration assertie ving dit nondeterministisch verlies onmiddellijk.

**Rule:** Browserfixtures die client-persist voeden installeren hun seed vóór de eerste app-JavaScript via `browserContext.addInitScript`, net als `e2e/fixtures.ts`. Gebruik een `sessionStorage`-guard zodat latere navigaties de teststate niet terugspoelen en een testcase de store bewust kan wissen zonder automatische reseed.
''')
