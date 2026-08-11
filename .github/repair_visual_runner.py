from pathlib import Path

p = Path("scripts/screenshots.mjs")
text = p.read_text()
old = 'import { chromium } from "./node_modules/playwright/index.mjs";'
new = 'import { chromium } from "playwright";'
count = text.count(old)
if count != 1:
    raise SystemExit(f"screenshots.mjs: expected one stale Playwright import, found {count}")
p.write_text(text.replace(old, new, 1))

with Path("corrections.md").open("a") as f:
    f.write('''
## 2026-08-11 — Screenshot-runner zocht Playwright in scripts/node_modules

**What went wrong:** Toen de handmatige screenshottools eindelijk als echte gate draaiden, faalde `scripts/screenshots.mjs` direct: het importeerde Playwright via `./node_modules/playwright/index.mjs`. Vanuit een bestand onder `scripts/` wijst dat naar `scripts/node_modules`, dat niet bestaat. De tool was dus ook los van de stale seed niet uitvoerbaar.

**Rule:** Repositorytools importeren npm-packages via hun package specifier (`"playwright"`), nooit via een relatief pad naar `node_modules`. Een audittool telt pas als bewijs nadat het script zelf in CI tegen de gebouwde app is uitgevoerd.
''')
