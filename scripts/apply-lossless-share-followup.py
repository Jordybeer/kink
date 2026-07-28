from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: verwacht exact één anker, vond {count}: {old[:100]!r}")
    target.write_text(text.replace(old, new, 1))


replace_once(
    "lib/profileSnapshot.ts",
    '''  for (const kinkId of ids) {
    const from = older[kinkId] ? effectiveStatus(older[kinkId]) : null;
    const to = newer[kinkId] ? effectiveStatus(newer[kinkId]) : null;
    if (from !== to) shifts.push({ kinkId, from, to });
  }
''',
    '''  for (const kinkId of ids) {
    const olderEntry = older[kinkId];
    const newerEntry = newer[kinkId];
    // A privacy transition may never confess either the former or current verdict.
    if (olderEntry?.privateResponse === true || newerEntry?.privateResponse === true) continue;
    const from = olderEntry ? effectiveStatus(olderEntry) : null;
    const to = newerEntry ? effectiveStatus(newerEntry) : null;
    if (from !== to) shifts.push({ kinkId, from, to });
  }
''',
)
replace_once(
    "lib/profileSnapshot.ts",
    '''export function prepareProfileTrendData(snapshots: ProfileSnapshot[]): ProfileTrendData {
  const ascending = [...snapshots]
    .sort((a, b) => a.date - b.date)
    .map((snapshot) => ({ ...snapshot, counts: deriveCounts(snapshot.entries) }));
''',
    '''export function prepareProfileTrendData(snapshots: ProfileSnapshot[]): ProfileTrendData {
  const sorted = [...snapshots].sort((a, b) => a.date - b.date);
  const latest = sorted[sorted.length - 1];
  const currentlyPrivate = new Set(
    Object.entries(latest?.entries ?? {})
      .filter(([, entry]) => entry.privateResponse === true)
      .map(([kinkId]) => kinkId),
  );
  const ascending = sorted.map((snapshot) => {
    const visibleEntries = Object.fromEntries(
      Object.entries(snapshot.entries).filter(([kinkId]) => !currentlyPrivate.has(kinkId)),
    );
    return { ...snapshot, counts: deriveCounts(visibleEntries) };
  });
''',
)

replace_once(
    "__tests__/profileSnapshot.test.ts",
    '''  it("recomputes old stored counts so private statuses stay hidden", () => {
    const old = snap(100, { hard_no: 1 });
    old.entries = {
      secret: { status: "hard_no", comment: "", privateResponse: true },
    };
    const out = prepareProfileTrendData([old]);
    expect(out.series.hard_no).toEqual([0]);
    expect(out.ascending[0].counts.hard_no).toBe(0);
  });
''',
    '''  it("recomputes old stored counts so private statuses stay hidden", () => {
    const old = snap(100, { hard_no: 1 });
    old.entries = {
      secret: { status: "hard_no", comment: "", privateResponse: true },
    };
    const out = prepareProfileTrendData([old]);
    expect(out.series.hard_no).toEqual([0]);
    expect(out.ascending[0].counts.hard_no).toBe(0);
  });

  it("redacts a currently hidden kink from its complete historical trend", () => {
    const older = snap(100, { yes: 1 });
    older.entries = { secret: { status: "yes", comment: "" } };
    const latest = snap(200, { hard_no: 1 });
    latest.entries = { secret: { status: "hard_no", comment: "", privateResponse: true } };
    const out = prepareProfileTrendData([older, latest]);
    expect(out.series.yes).toEqual([0, 0]);
    expect(out.series.hard_no).toEqual([0, 0]);
  });
''',
)
replace_once(
    "__tests__/profileSnapshot.test.ts",
    '''  it("never reveals a hidden status in the shift ledger", () => {
    const older = { secret: { status: "maybe" as const, comment: "", privateResponse: true } };
    const newer = { secret: { status: "yes" as const, comment: "", privateResponse: true } };
    expect(diffSnapshotEntries(older, newer)).toEqual([]);
  });
''',
    '''  it("never reveals a hidden status in the shift ledger", () => {
    const older = { secret: { status: "maybe" as const, comment: "", privateResponse: true } };
    const newer = { secret: { status: "yes" as const, comment: "", privateResponse: true } };
    expect(diffSnapshotEntries(older, newer)).toEqual([]);
  });

  it("does not reveal the former status when a public kink becomes hidden", () => {
    const older = { secret: { status: "yes" as const, comment: "" } };
    const newer = { secret: { status: "hard_no" as const, comment: "", privateResponse: true } };
    expect(diffSnapshotEntries(older, newer)).toEqual([]);
  });
''',
)

replace_once(
    "corrections.md",
    '''---

## 2026-07-28 — Een redundant icoon maakte de informatie niet redundant
''',
    '''---

## 2026-07-28 — Een QR-header mag de payload niet als scheidingsteken behandelen

**What went wrong:** De eerste multi-QR-parser gebruikte `split(".")` voor de volledige tekenreeks en verwachtte exact vijf delen. De v3-payload begint zelf met `3r.` of `3d.`, waardoor de eerste QR een extra punt bevatte en als ongeldig werd afgewezen. De regressietest stopte de productcommit vóór de build.

**Rule:** Parse een transportheader begrensd en behandel alles na het laatste vaste headerveld als opaque payload. Gebruik geen onbeperkte `split()` wanneer dezelfde delimiter legaal in de payload kan voorkomen. Test altijd het eerste én laatste chunk met echte formaatprefixen, plus uit-volgorde en dubbele delen.

---

## 2026-07-28 — Een redundant icoon maakte de informatie niet redundant
''',
)

Path("scripts/apply-lossless-share-followup.py").unlink()
Path(".github/workflows/apply-lossless-share-followup.yml").unlink()
print("Snapshotprivacy aangescherpt en QR-parserles vastgelegd.")
