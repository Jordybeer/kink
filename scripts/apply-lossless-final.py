from pathlib import Path
import shutil


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: verwacht exact één anker, vond {count}: {old[:100]!r}")
    target.write_text(text.replace(old, new, 1))


shutil.copyfile("scripts/lossless-final-src/QRModal.tsx", "components/QRModal.tsx")

replace_once(
    "lib/profileQr.ts",
    '''export const PROFILE_QR_SINGLE_LIMIT = 900;
export const PROFILE_QR_CHUNK_SIZE = 680;
''',
    '''export const PROFILE_QR_SINGLE_LIMIT = 900;
export const PROFILE_QR_CHUNK_SIZE = 680;
export const PROFILE_QR_MAX_PARTS = 64;
''',
)
replace_once(
    "lib/profileQr.ts",
    '''export interface ProfileQrSet {
  shareUrl: string;
  qrValues: string[];
  transferId: string | null;
}
''',
    '''export interface ProfileQrSet {
  shareUrl: string;
  qrValues: string[];
  transferId: string | null;
  qrTooLarge: boolean;
}
''',
)
replace_once(
    "lib/profileQr.ts",
    '''    return { shareUrl, qrValues: [shareUrl], transferId: null };
''',
    '''    return { shareUrl, qrValues: [shareUrl], transferId: null, qrTooLarge: false };
''',
)
replace_once(
    "lib/profileQr.ts",
    '''  const total = chunks.length;
  const base = cleanOrigin(origin);
''',
    '''  const total = chunks.length;
  if (total > PROFILE_QR_MAX_PARTS) {
    return { shareUrl, qrValues: [], transferId: null, qrTooLarge: true };
  }
  const base = cleanOrigin(origin);
''',
)
replace_once(
    "lib/profileQr.ts",
    '''  return { shareUrl, qrValues, transferId };
''',
    '''  return { shareUrl, qrValues, transferId, qrTooLarge: false };
''',
)

replace_once(
    "__tests__/profileQr.test.ts",
    '''  parseProfileQrPart,
  type ProfileQrAssembly,
''',
    '''  parseProfileQrPart,
  PROFILE_QR_CHUNK_SIZE,
  PROFILE_QR_MAX_PARTS,
  type ProfileQrAssembly,
''',
)
replace_once(
    "__tests__/profileQr.test.ts",
    '''  it("rejects malformed part headers", () => {
''',
    '''  it("keeps the complete link when a profile is too large for a practical QR set", () => {
    const payload = "3r." + "x".repeat(PROFILE_QR_CHUNK_SIZE * (PROFILE_QR_MAX_PARTS + 1));
    const set = buildProfileQrSet("https://kink.example", payload);
    expect(set.qrTooLarge).toBe(true);
    expect(set.qrValues).toEqual([]);
    expect(parseSharePaste(set.shareUrl)).toEqual({ kind: "profile", encoded: payload });
  });

  it("rejects malformed part headers", () => {
''',
)

replace_once(
    "lib/profileSnapshot.ts",
    '''export function prepareProfileTrendData(snapshots: ProfileSnapshot[]): ProfileTrendData {
  const sorted = [...snapshots].sort((a, b) => a.date - b.date);
  const latest = sorted[sorted.length - 1];
  const currentlyPrivate = new Set(
    Object.entries(latest?.entries ?? {})
''',
    '''export function prepareProfileTrendData(
  snapshots: ProfileSnapshot[],
  currentEntries?: Record<string, KinkEntry>,
): ProfileTrendData {
  const sorted = [...snapshots].sort((a, b) => a.date - b.date);
  const latest = sorted[sorted.length - 1];
  const privacySource = currentEntries ?? latest?.entries ?? {};
  const currentlyPrivate = new Set(
    Object.entries(privacySource)
''',
)
replace_once(
    "lib/profileSnapshot.ts",
    '''    return { ...snapshot, counts: deriveCounts(visibleEntries) };
''',
    '''    return { ...snapshot, entries: visibleEntries, counts: deriveCounts(visibleEntries) };
''',
)

replace_once(
    "__tests__/profileSnapshot.test.ts",
    '''  it("returns one label per snapshot", () => {
''',
    '''  it("uses the live profile privacy state even before another moment is saved", () => {
    const older = snap(100, { yes: 1 });
    older.entries = { secret: { status: "yes", comment: "" } };
    const latest = snap(200, { yes: 1 });
    latest.entries = { secret: { status: "yes", comment: "" } };
    const currentEntries = {
      secret: { status: "hard_no" as const, comment: "", privateResponse: true },
    };
    const out = prepareProfileTrendData([older, latest], currentEntries);
    expect(out.series.yes).toEqual([0, 0]);
    expect(out.ascending.every((snapshot) => snapshot.entries.secret === undefined)).toBe(true);
  });

  it("returns one label per snapshot", () => {
''',
)

replace_once(
    "components/ProfileSnapshotPanel.tsx",
    '''import type { ProfileSnapshot } from "@/types";
''',
    '''import type { KinkEntry, ProfileSnapshot } from "@/types";
''',
)
replace_once(
    "components/ProfileSnapshotPanel.tsx",
    '''  snapshots: ProfileSnapshot[];
  onSave: (profileId: string) => unknown;
''',
    '''  snapshots: ProfileSnapshot[];
  currentEntries: Record<string, KinkEntry>;
  onSave: (profileId: string) => unknown;
''',
)
replace_once(
    "components/ProfileSnapshotPanel.tsx",
    '''export default function ProfileSnapshotPanel({ profileId, snapshots, onSave }: Props) {
''',
    '''export default function ProfileSnapshotPanel({ profileId, snapshots, currentEntries, onSave }: Props) {
''',
)
replace_once(
    "components/ProfileSnapshotPanel.tsx",
    '''      <ProfileTrendsChart snapshots={mine} />
''',
    '''      <ProfileTrendsChart snapshots={mine} currentEntries={currentEntries} />
''',
)

replace_once(
    "components/ProfileTrendsChart.tsx",
    '''import type { ProfileSnapshot } from "@/types";
''',
    '''import type { KinkEntry, ProfileSnapshot } from "@/types";
''',
)
replace_once(
    "components/ProfileTrendsChart.tsx",
    '''interface Props {
  snapshots: ProfileSnapshot[];
}

export function ProfileTrendsChart({ snapshots }: Props) {
''',
    '''interface Props {
  snapshots: ProfileSnapshot[];
  currentEntries: Record<string, KinkEntry>;
}

export function ProfileTrendsChart({ snapshots, currentEntries }: Props) {
''',
)
replace_once(
    "components/ProfileTrendsChart.tsx",
    '''  const prep = useMemo(() => prepareProfileTrendData(snapshots), [snapshots]);
''',
    '''  const prep = useMemo(
    () => prepareProfileTrendData(snapshots, currentEntries),
    [snapshots, currentEntries],
  );
''',
)

replace_once(
    "components/profile/ProfileScreen.tsx",
    '''              snapshots={profileSnapshots}
              onSave={saveProfileSnapshot}
''',
    '''              snapshots={profileSnapshots}
              currentEntries={profile.entries}
              onSave={saveProfileSnapshot}
''',
)

replace_once(
    "docs/lossless-profile-sharing.md",
    '''Each QR carries transfer id, part number, total and whole-payload checksum. Parts may
arrive out of order; duplicates are ignored. Import begins only after every part is
present and the checksum matches.
''',
    '''Each QR carries transfer id, part number, total and whole-payload checksum. Parts may
arrive out of order; duplicates are ignored. Import begins only after every part is
present and the checksum matches. The modal renders only the currently visible QR,
not the full set in memory. Profiles requiring more than 64 reliable QR parts keep
the complete lossless link but deliberately fall back to link sharing.
''',
)

shutil.rmtree("scripts/lossless-final-src")
Path("scripts/apply-lossless-final.py").unlink()
Path(".github/workflows/apply-lossless-final.yml").unlink()
print("Luie QR-rendering, extreme linkfallback en live snapshotprivacy toegepast.")
