from pathlib import Path

p = Path("__tests__/visualAuditFixtures.test.ts")
text = p.read_text()
old_import = 'import { DEPRECATED_DIRECTIONAL_KINK_IDS } from "@/lib/directionality";'
new_import = 'import { stripDeprecatedDirectionalEntries } from "@/lib/directionality";'
if text.count(old_import) != 1:
    raise SystemExit("visual fixture retirement import drifted")
text = text.replace(old_import, new_import, 1)

old_loop = '''      for (const retiredId of DEPRECATED_DIRECTIONAL_KINK_IDS) {
        expect(script, `${pathname} still quotes retired ${retiredId}`).not.toContain(`"${retiredId}"`);
        expect(script, `${pathname} still seeds retired ${retiredId}`).not.toContain(`${retiredId}:`);
      }'''
new_loop = '''      const tokens = [...script.matchAll(/\\b[a-z][a-z0-9_]+\\b/g)].map((match) => match[0]);
      const fakeEntries = Object.fromEntries(tokens.map((id) => [id, { status: null, comment: "" }]));
      const stripped = stripDeprecatedDirectionalEntries(fakeEntries);
      const retiredMentions = Object.keys(fakeEntries).filter((id) => !(id in stripped));
      expect(retiredMentions, `${pathname} still mentions retired directionality IDs`).toEqual([]);'''
if text.count(old_loop) != 1:
    raise SystemExit("visual fixture retirement loop drifted")
p.write_text(text.replace(old_loop, new_loop, 1))

with Path("corrections.md").open("a") as f:
    f.write('''
## 2026-08-11 — Multiline fixturecode brak uit een Actions block scalar

**What went wrong:** De eerste tijdelijke visual-fixture workflow bevatte grote JavaScript/Python multiline literals rechtstreeks in `run: |`. De interne regels hadden minder YAML-inspringing dan het block scalar en maakten het workflowbestand ongeldig; GitHub registreerde een mislukte run met nul jobs.

**Rule:** Tijdelijke GitHub Actions blijven dun. Complexe transforms of multiline broncode gaan in een tijdelijk scriptbestand dat de workflow aanroept. Een run met nul jobs is eerst een workflow-parse/validatieprobleem, niet een product- of testfailure.
''')
