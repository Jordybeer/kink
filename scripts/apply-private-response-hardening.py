from pathlib import Path
import re


def replace_exact(path: Path, old: str, new: str, expected: int = 1) -> None:
    text = path.read_text()
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"{path}: verwacht {expected}× anker, vond {count}×\n{old[:160]}")
    path.write_text(text.replace(old, new))


def replace_regex(path: Path, pattern: str, replacement: str, expected: int = 1) -> None:
    text = path.read_text()
    updated, count = re.subn(pattern, replacement, text, flags=re.DOTALL)
    if count != expected:
        raise SystemExit(f"{path}: verwacht {expected}× regex, vond {count}×\n{pattern[:160]}")
    path.write_text(updated)


profile = Path("components/profile/ProfileScreen.tsx")
replace_exact(
    profile,
    'import { privateResponseKey, profileExportResponse } from "@/lib/privateResponses";\n',
    'import { privateResponseKey } from "@/lib/privateResponses";\n'
    'import { buildProfileTextExport } from "@/lib/profileTextExport";\n'
    'import PrivateResponseStatus from "@/components/PrivateResponseStatus";\n',
)
replace_exact(
    profile,
    '''  function revealPrivateResponse(kinkId: string) {
    const key = privateResponseKey(profile!.id, kinkId);
    setRevealedPrivateResponses((current) => new Set(current).add(key));
  }

  function isPrivateResponseRevealed(kinkId: string) {
''',
    '''  function revealPrivateResponse(kinkId: string) {
    const key = privateResponseKey(profile!.id, kinkId);
    setRevealedPrivateResponses((current) => new Set(current).add(key));
  }

  function concealPrivateResponse(kinkId: string) {
    const key = privateResponseKey(profile!.id, kinkId);
    setRevealedPrivateResponses((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });
  }

  function isPrivateResponseRevealed(kinkId: string) {
''',
)
replace_exact(
    profile,
    'count: visibleKinks.filter((k) => profile.entries[k.id]?.status === s).length,',
    'count: visibleKinks.filter((k) => profile.entries[k.id]?.status === s && profile.entries[k.id]?.privateResponse !== true).length,',
)
replace_regex(
    profile,
    r'''  function handleExport\(\) \{.*?\n  \}\n\n  async function handlePDFExport''',
    '''  function handleExport() {
    const text = buildProfileTextExport(profile!, maxLevel, {
      includePrivateResponses: includePrivateExports,
    });
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${profile!.name}-kinks.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handlePDFExport''',
)
replace_exact(
    profile,
    '''                onStatusChange={(kinkId, s) => handleStatus(kinkId, s)}
                onCuriousChange={(kinkId, v) => { setEntry(profile.id, kinkId, { curious: v }); markSaved(); }}
''',
    '''                onStatusChange={(kinkId, s) => handleStatus(kinkId, s)}
                onCuriousChange={(kinkId, v) => { setEntry(profile.id, kinkId, { curious: v }); markSaved(); }}
                onPrivateChange={(kinkId, v) => { setEntry(profile.id, kinkId, { privateResponse: v }); markSaved(); }}
''',
)
replace_exact(profile, '{entry.curious && (', '{!concealed && entry.curious && (', expected=2)
replace_exact(
    profile,
    '{(entry.tags?.length ?? 0) > 0 && (',
    '{!concealed && (entry.tags?.length ?? 0) > 0 && (',
)
replace_exact(
    profile,
    '''                              {concealed ? (
                                <button
                                  type="button"
                                  onClick={() => revealPrivateResponse(kink.id)}
                                  aria-label={`Privéantwoord voor ${kink.name} tonen`}
                                  className="focus-ring text-xs px-1.5 py-0.5 rounded-full border whitespace-nowrap flex-none min-w-[5.5rem] inline-flex items-center justify-center gap-1 transition-opacity"
                                  style={{ color: "var(--text2)", borderColor: "var(--border)", background: "var(--tag-muted)" }}
                                >
                                  <EyeSlash size={10} aria-hidden="true" />
                                  Privé
                                </button>
                              ) : (
                                <span
                                  className="text-xs px-1.5 py-0.5 rounded-full border whitespace-nowrap flex-none min-w-[5.5rem] text-center"
                                  style={{
                                    color: STATUS_VAR[s],
                                    borderColor: `color-mix(in srgb, ${STATUS_VAR[s]} 35%, transparent)`,
                                    background: `color-mix(in srgb, ${STATUS_VAR[s]} 15%, transparent)`,
                                  }}
                                >
                                  {STATUS_LABEL[s]}
                                </span>
                              )}
''',
    '''                              <PrivateResponseStatus
                                status={s}
                                privateResponse={entry.privateResponse === true}
                                concealed={!!concealed}
                                subject={kink.name}
                                onReveal={() => revealPrivateResponse(kink.id)}
                                onConceal={() => concealPrivateResponse(kink.id)}
                              />
''',
)
replace_exact(
    profile,
    '''                            {concealed ? (
                              <button
                                type="button"
                                onClick={() => revealPrivateResponse(ck.id)}
                                aria-label={`Privéantwoord voor ${ck.name} tonen`}
                                className="focus-ring text-xs px-1.5 py-0.5 rounded-full border whitespace-nowrap flex-none min-w-[5.5rem] inline-flex items-center justify-center gap-1"
                                style={{ color: "var(--text2)", borderColor: "var(--border)", background: "var(--tag-muted)" }}
                              >
                                <EyeSlash size={10} aria-hidden="true" />
                                Privé
                              </button>
                            ) : (
                              <span
                                className="text-xs px-1.5 py-0.5 rounded-full border whitespace-nowrap flex-none min-w-[5.5rem] text-center"
                                style={{
                                  color: STATUS_VAR[s],
                                  borderColor: `color-mix(in srgb, ${STATUS_VAR[s]} 35%, transparent)`,
                                  background: `color-mix(in srgb, ${STATUS_VAR[s]} 15%, transparent)`,
                                }}
                              >
                                {STATUS_LABEL[s]}
                              </span>
                            )}
''',
    '''                            <PrivateResponseStatus
                              status={s}
                              privateResponse={entry.privateResponse === true}
                              concealed={!!concealed}
                              subject={ck.name}
                              onReveal={() => revealPrivateResponse(ck.id)}
                              onConceal={() => concealPrivateResponse(ck.id)}
                            />
''',
)
replace_exact(
    profile,
    'Privé antwoorden worden geredigeerd; hun status en notitie komen niet in het bestand.',
    'Privé antwoorden worden volledig overgeslagen — ook hun kinknaam, tags en notitie.',
)


tour = Path("components/ProfileTour.tsx")
replace_exact(
    tour,
    '''  {
    selector: '[data-tour="pills"]',
    title: "Hou een antwoord privé",
    body: "Open een kink en tik op het oogje bij Privé. De kinknaam blijft zichtbaar; je oordeel en notitie blijven afgeschermd tot je ze bewust toont.",
    pad: 4,
  },
''',
    '''  {
    selector: '[data-tour="private"]',
    title: "Hou een antwoord privé",
    body: "Tik het oogje voor of na je keuze. Alleen de kinknaam blijft zichtbaar; je oordeel, nieuwsgierigheid, tags en notitie blijven dicht tot je ze bewust toont.",
    pad: 6,
  },
''',
)


compare = Path("components/CompareKinkRow.tsx")
replace_exact(compare, 'import { EyeSlash } from "@phosphor-icons/react";\n', '')
replace_exact(compare, 'import type { KinkEntry, KinkStatus, Profile } from "@/types";\n', 'import type { KinkEntry, Profile } from "@/types";\n')
replace_exact(compare, 'import { STATUS_LABEL, STATUS_VAR } from "@/lib/statusLabels";\n', '')
replace_exact(compare, 'import StatusGlyph from "@/components/StatusGlyph";\n', 'import PrivateResponseStatus from "@/components/PrivateResponseStatus";\n')
replace_regex(compare, r'''function StatusBadge\(\{.*?\n\}\n\ninterface Props''', 'interface Props')
replace_exact(
    compare,
    '<StatusBadge entry={entryA} concealed={concealedA} onReveal={() => setRevealedA(true)} label={profileA.name} />',
    '''<PrivateResponseStatus
          status={entryA.status}
          privateResponse={entryA.privateResponse === true}
          concealed={concealedA}
          subject={`${profileA.name} bij ${name}`}
          onReveal={() => setRevealedA(true)}
          onConceal={() => setRevealedA(false)}
          compact
        />''',
)
replace_exact(
    compare,
    '<StatusBadge entry={entryB} concealed={concealedB} onReveal={() => setRevealedB(true)} label={profileB.name} />',
    '''<PrivateResponseStatus
          status={entryB.status}
          privateResponse={entryB.privateResponse === true}
          concealed={concealedB}
          subject={`${profileB.name} bij ${name}`}
          onReveal={() => setRevealedB(true)}
          onConceal={() => setRevealedB(false)}
          compact
        />''',
)


session = Path("app/session/page.tsx")
replace_exact(
    session,
    'import SessionImportAction from "@/components/SessionImportAction";\n',
    'import SessionImportAction from "@/components/SessionImportAction";\nimport PrivateResponseStatus from "@/components/PrivateResponseStatus";\n',
)
replace_exact(
    session,
    '''  function revealPrivate(kinkId: string) {
    setPrivacyRevealedIds(current => new Set(current).add(kinkId));
  }
''',
    '''  function revealPrivate(kinkId: string) {
    setPrivacyRevealedIds(current => new Set(current).add(kinkId));
  }

  function concealPrivate(kinkId: string) {
    setPrivacyRevealedIds(current => {
      const next = new Set(current);
      next.delete(kinkId);
      return next;
    });
  }
''',
)
replace_exact(
    session,
    'if (mine?.privateResponse || theirs?.privateResponse) continue;',
    'if (theirs?.privateResponse && !privacyRevealedIds.has(id)) continue;',
)
replace_exact(
    session,
    'const theirCount = kinks.filter(kink => statusOf(remote[kink.id])).length;',
    'const theirCount = kinks.filter(kink => statusOf(remote[kink.id]) && remote[kink.id]?.privateResponse !== true).length;',
)
replace_exact(
    session,
    '''                      {privateConcealed ? (
                        <button
                          type="button"
                          onClick={() => revealPrivate(kink.id)}
                          aria-label={`Privéantwoord van ${partnerName} voor ${kink.name} tonen`}
                          className="focus-ring text-[11px] px-1.5 py-0.5 rounded-full border flex-none inline-flex items-center gap-1"
                          style={{ color: "var(--text2)", borderColor: "var(--border)", background: "var(--tag-muted)" }}
                        >
                          <EyeSlash size={9} aria-hidden="true" />
                          Privé
                        </button>
                      ) : rowMatch ? (
                        <span className="text-xs font-bold" style={{ color: "var(--yes)" }}>✓ Match</span>
                      ) : (
                        <span
                          className="text-[11px] px-1.5 py-0.5 rounded-full border flex-none"
                          style={{
                            color: STATUS_VAR[remoteStatus],
                            borderColor: `color-mix(in srgb, ${STATUS_VAR[remoteStatus]} 35%, transparent)`,
                            background: `color-mix(in srgb, ${STATUS_VAR[remoteStatus]} 15%, transparent)`,
                          }}
                        >
                          {STATUS_LABEL[remoteStatus]}
                        </span>
                      )}
''',
    '''                      {remoteResponse.privateResponse ? (
                        <PrivateResponseStatus
                          status={remoteStatus}
                          privateResponse
                          concealed={!!privateConcealed}
                          subject={`${partnerName} bij ${kink.name}`}
                          onReveal={() => revealPrivate(kink.id)}
                          onConceal={() => concealPrivate(kink.id)}
                          compact
                        />
                      ) : rowMatch ? (
                        <span className="text-xs font-bold" style={{ color: "var(--yes)" }}>✓ Match</span>
                      ) : (
                        <PrivateResponseStatus
                          status={remoteStatus}
                          subject={`${partnerName} bij ${kink.name}`}
                          compact
                        />
                      )}
''',
)

print("Privacytransformatie toegepast; alle ankers klopten.")
