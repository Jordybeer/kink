"use client";

import dynamic from "next/dynamic";
import {
  Camera,
  Clock,
  LockKey,
  Play,
  PlusCircle,
  ShieldCheck,
  Stop,
  Trash,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import PageShell from "@/components/PageShell";
import MunchPunchQr from "@/components/munch-punch/MunchPunchQr";
import {
  MUNCH_PUNCH_RESULTS_THRESHOLD,
  resultsUnlocked,
  visibleMunchPunchResults,
  type MunchPunchRoom,
} from "@/lib/munchPunch";
import {
  MUNCH_PUNCH_PROMPTS,
  MUNCH_PUNCH_PROMPT_IDS,
  type MunchPunchPromptId,
} from "@/lib/munchPunchCatalog";
import {
  buildMunchPunchJoinUrl,
  decryptMunchPunchResponse,
  forgetMunchPunchPrivateKey,
  generateMunchPunchRoomKeys,
  joinEnvelopeFromRoom,
  loadMunchPunchPrivateKey,
  newMunchPunchRoomId,
  saveMunchPunchPrivateKey,
} from "@/lib/munchPunchCrypto";
import { useMunchPunchStore } from "@/lib/munchPunchStore";
import type { MunchPunchScanFeedback } from "@/components/munch-punch/MunchPunchScanner";

const MunchPunchScanner = dynamic(() => import("@/components/munch-punch/MunchPunchScanner"), { ssr: false });

function statusLabel(status: MunchPunchRoom["status"]): string {
  if (status === "draft") return "Concept";
  if (status === "open") return "Open";
  if (status === "closed") return "Gesloten";
  return "Vervallen";
}

function formatMoment(value: number): string {
  return new Intl.DateTimeFormat("nl-BE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export default function MunchPunchPage() {
  const rooms = useMunchPunchStore((state) => state.rooms);
  const hydrated = useMunchPunchStore((state) => state._hasHydrated);
  const createDraft = useMunchPunchStore((state) => state.createDraft);
  const openRoom = useMunchPunchStore((state) => state.openRoom);
  const closeRoom = useMunchPunchStore((state) => state.closeRoom);
  const expireRooms = useMunchPunchStore((state) => state.expireRooms);
  const deleteRoom = useMunchPunchStore((state) => state.deleteRoom);
  const [origin, setOrigin] = useState("");
  const [title, setTitle] = useState("Munch Punch");
  const [selectedPrompts, setSelectedPrompts] = useState<MunchPunchPromptId[]>([...MUNCH_PUNCH_PROMPT_IDS]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [keyAvailable, setKeyAvailable] = useState(false);

  const activeRoom = rooms.find((room) => room.status === "draft" || room.status === "open") ?? null;
  const room = rooms.find((candidate) => candidate.id === selectedRoomId)
    ?? activeRoom
    ?? rooms[0]
    ?? null;

  useEffect(() => setOrigin(window.location.origin), []);

  useEffect(() => {
    if (!hydrated) return;
    const tick = () => {
      const now = Date.now();
      const expiring = useMunchPunchStore.getState().rooms.filter((candidate) => (
        candidate.status !== "expired" && now >= candidate.expiresAt
      ));
      expireRooms(now);
      expiring.forEach((candidate) => forgetMunchPunchPrivateKey(candidate.id));
    };
    tick();
    const interval = window.setInterval(tick, 30_000);
    return () => window.clearInterval(interval);
  }, [expireRooms, hydrated]);

  useEffect(() => {
    if (!room || room.status === "closed" || room.status === "expired") {
      setKeyAvailable(false);
      return;
    }
    setKeyAvailable(!!loadMunchPunchPrivateKey(room.id));
  }, [room?.id, room?.status]);

  useEffect(() => {
    if (selectedRoomId && !rooms.some((candidate) => candidate.id === selectedRoomId)) {
      setSelectedRoomId(null);
    }
  }, [rooms, selectedRoomId]);

  const joinUrl = useMemo(() => {
    if (!room || room.status !== "open" || !origin) return "";
    return buildMunchPunchJoinUrl(joinEnvelopeFromRoom(room), origin);
  }, [origin, room]);

  const results = room ? visibleMunchPunchResults(room) : [];

  async function handleCreate() {
    if (creating || selectedPrompts.length < 1 || activeRoom) return;
    setCreating(true);
    setCreateError(null);
    try {
      const now = Date.now();
      const id = newMunchPunchRoomId();
      const keys = await generateMunchPunchRoomKeys();
      const nextRoom = createDraft({
        id,
        title,
        now,
        promptIds: selectedPrompts,
        hostPublicKey: keys.publicKey,
      });
      saveMunchPunchPrivateKey(id, keys.privateKey);
      setSelectedRoomId(nextRoom.id);
      setKeyAvailable(true);
    } catch {
      setCreateError("De tijdelijke roomsleutel kon niet worden gemaakt.");
    } finally {
      setCreating(false);
    }
  }

  function handleOpen(nextRoom: MunchPunchRoom) {
    if (!loadMunchPunchPrivateKey(nextRoom.id)) {
      setCreateError("De tijdelijke privésleutel ontbreekt. Maak een nieuwe room.");
      return;
    }
    openRoom(nextRoom.id, Date.now());
    setSelectedRoomId(nextRoom.id);
  }

  function handleClose(nextRoom: MunchPunchRoom) {
    closeRoom(nextRoom.id, Date.now());
    forgetMunchPunchPrivateKey(nextRoom.id);
    setScanOpen(false);
    setKeyAvailable(false);
  }

  function handleDelete(nextRoom: MunchPunchRoom) {
    forgetMunchPunchPrivateKey(nextRoom.id);
    deleteRoom(nextRoom.id);
    setScanOpen(false);
  }

  const handleScanResult = useCallback(async (raw: string): Promise<MunchPunchScanFeedback> => {
    const current = useMunchPunchStore.getState().rooms.find((candidate) => candidate.status === "open");
    if (!current) return { status: "rejected", message: "Er staat geen open room klaar voor inzendingen." };
    const privateKey = loadMunchPunchPrivateKey(current.id);
    if (!privateKey) {
      return { status: "rejected", message: "De tijdelijke roomsleutel ontbreekt. Sluit deze room en maak een nieuwe." };
    }

    try {
      const decrypted = await decryptMunchPunchResponse(current, privateKey, raw, Date.now());
      const status = useMunchPunchStore.getState().recordResponse(
        current.id,
        decrypted.answers,
        decrypted.replayHash,
        Date.now(),
      );
      decrypted.answers.fill(-1);

      if (status === "accepted") {
        const count = useMunchPunchStore.getState().rooms.find((candidate) => candidate.id === current.id)?.responseCount ?? 0;
        return { status: "accepted", message: `Response ${count} is opgeteld. Het individuele antwoord is niet bewaard.` };
      }
      if (status === "replay") {
        return { status: "replay", message: "Exact dezelfde response-QR was al verwerkt." };
      }
      if (status === "full") {
        return { status: "rejected", message: "Deze room heeft het maximum van dertig responses bereikt." };
      }
      return { status: "rejected", message: "Deze room neemt geen responses meer aan." };
    } catch (error) {
      return {
        status: "rejected",
        message: error instanceof Error ? error.message : "De response is ongeldig of beschadigd.",
      };
    }
  }, []);

  function togglePrompt(promptId: MunchPunchPromptId) {
    setSelectedPrompts((current) => current.includes(promptId)
      ? current.filter((candidate) => candidate !== promptId)
      : [...current, promptId]);
  }

  if (!hydrated) return <PageShell loading width="2xl" />;

  return (
    <>
      <PageShell width="2xl" className="lg:max-w-4xl">
        <section className="mb-6 rounded-[26px] p-5" style={{ background: "var(--surface2)", border: "1px solid var(--border-accent)" }}>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
              <UsersThree size={23} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Tijdelijke groepsroom</p>
              <h1 className="mt-1 text-3xl font-semibold serif-safe" style={{ fontFamily: "var(--font-display, Georgia, serif)" }}>
                Munch Punch
              </h1>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
                Laat ongeveer vijf tot dertig mensen privé antwoorden. Telefoons wisselen alleen QR-codes uit; er is geen live verbinding, account of profiel nodig.
              </p>
            </div>
          </div>
        </section>

        {!activeRoom && (
          <section className="mb-6 rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="mb-4 flex items-center gap-2">
              <PlusCircle size={19} style={{ color: "var(--accent)" }} aria-hidden="true" />
              <h2 className="text-base font-semibold">Nieuwe room</h2>
            </div>

            <label htmlFor="munch-title" className="mb-2 block text-xs font-semibold">Naam van de room</label>
            <input
              id="munch-title"
              value={title}
              maxLength={48}
              onChange={(event) => setTitle(event.target.value)}
              className="focus-ring mb-4 min-h-11 w-full rounded-xl px-3 text-sm outline-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
            />

            <p className="mb-2 text-xs font-semibold">Vaste vragen</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {MUNCH_PUNCH_PROMPTS.map((prompt) => {
                const selected = selectedPrompts.includes(prompt.id);
                return (
                  <button
                    key={prompt.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => togglePrompt(prompt.id)}
                    className="focus-ring min-h-14 rounded-xl px-3 py-2 text-left text-sm transition-colors"
                    style={{
                      background: selected ? "color-mix(in srgb, var(--accent) 12%, var(--surface2))" : "var(--surface2)",
                      border: `1px solid ${selected ? "var(--border-accent)" : "var(--border)"}`,
                      color: selected ? "var(--text)" : "var(--text2)",
                    }}
                  >
                    {prompt.question}
                  </button>
                );
              })}
            </div>

            <p className="mt-3 text-xs" style={{ color: "var(--text2)" }}>
              De room vervalt na vier uur. Vrije tekst, chat en individuele antwoordweergave bestaan niet in deze versie.
            </p>
            {createError && <p className="mt-3 text-xs" style={{ color: "var(--hard-no)" }}>{createError}</p>}
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={creating || selectedPrompts.length < 1}
              className="focus-ring mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold disabled:opacity-40"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              <LockKey size={18} weight="bold" aria-hidden="true" />
              {creating ? "Tijdelijke sleutel maken…" : "Maak conceptroom"}
            </button>
          </section>
        )}

        {room && (
          <section className="mb-6 rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-semibold">{room.title}</h2>
                  <span
                    className="rounded-full px-2 py-1 text-xs font-semibold"
                    style={{
                      background: room.status === "open" ? "color-mix(in srgb, var(--yes) 14%, var(--surface2))" : "var(--surface2)",
                      color: room.status === "open" ? "var(--yes)" : "var(--text2)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {statusLabel(room.status)}
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs" style={{ color: "var(--text2)" }}>
                  <Clock size={14} aria-hidden="true" />
                  Vervalt {formatMoment(room.expiresAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(room)}
                aria-label="Room verwijderen"
                className="focus-ring flex h-11 w-11 flex-none items-center justify-center rounded-xl"
                style={{ color: "var(--hard-no)", border: "1px solid var(--border)" }}
              >
                <Trash size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl p-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <p className="text-2xl font-semibold tabular-nums">{room.responseCount}</p>
                <p className="text-xs" style={{ color: "var(--text2)" }}>geldige responses</p>
              </div>
              <div className="rounded-xl p-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <p className="text-2xl font-semibold tabular-nums">{room.promptIds.length}</p>
                <p className="text-xs" style={{ color: "var(--text2)" }}>vaste vragen</p>
              </div>
            </div>

            {room.status === "draft" && (
              <div className="mt-4">
                {!keyAvailable && (
                  <p className="mb-3 flex items-start gap-2 rounded-xl p-3 text-xs" style={{ color: "var(--hard-no)", background: "var(--surface2)", border: "1px solid var(--hard-no)" }}>
                    <WarningCircle size={17} className="mt-0.5 flex-none" aria-hidden="true" />
                    De tijdelijke privésleutel ontbreekt. Dit concept kan niet veilig worden geopend.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => handleOpen(room)}
                  disabled={!keyAvailable}
                  className="focus-ring flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold disabled:opacity-40"
                  style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                >
                  <Play size={18} weight="fill" aria-hidden="true" />
                  Open room en toon join-QR
                </button>
              </div>
            )}

            {room.status === "open" && (
              <div className="mt-4 space-y-3">
                {!keyAvailable && (
                  <p className="flex items-start gap-2 rounded-xl p-3 text-xs" style={{ color: "var(--hard-no)", background: "var(--surface2)", border: "1px solid var(--hard-no)" }}>
                    <WarningCircle size={17} className="mt-0.5 flex-none" aria-hidden="true" />
                    De browsersessie met de tijdelijke privésleutel is weg. Nieuwe responses kunnen niet worden ontsleuteld; sluit deze room.
                  </p>
                )}
                {joinUrl && (
                  <MunchPunchQr
                    value={joinUrl}
                    title="Join-QR"
                    caption="De QR bevat alleen roomconfiguratie en de publieke roomsleutel. Deelnemers kiezen geen profiel."
                    copyLabel="Kopieer join-link"
                  />
                )}
                <button
                  type="button"
                  onClick={() => setScanOpen(true)}
                  disabled={!keyAvailable}
                  className="focus-ring flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold disabled:opacity-40"
                  style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                >
                  <Camera size={19} weight="bold" aria-hidden="true" />
                  Open submission station
                </button>
                <button
                  type="button"
                  onClick={() => handleClose(room)}
                  className="focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold"
                  style={{ color: "var(--hard-no)", border: "1px solid var(--border)" }}
                >
                  <Stop size={17} weight="fill" aria-hidden="true" />
                  Sluit room definitief
                </button>
              </div>
            )}

            <div className="mt-5">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck size={18} style={{ color: "var(--accent)" }} aria-hidden="true" />
                <h3 className="text-base font-semibold">Groepsresultaten</h3>
              </div>
              {!resultsUnlocked(room) ? (
                <p className="rounded-xl p-3 text-sm" style={{ background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}>
                  Resultaten openen vanaf {MUNCH_PUNCH_RESULTS_THRESHOLD} responses. Nog {Math.max(0, MUNCH_PUNCH_RESULTS_THRESHOLD - room.responseCount)} te gaan.
                </p>
              ) : (
                <div className="space-y-3">
                  {results.map((result) => (
                    <article key={result.promptId} className="rounded-xl p-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                      <h4 className="text-sm font-semibold">{result.question}</h4>
                      {result.buckets.length === 0 ? (
                        <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
                          Deze uitsplitsing blijft verborgen omdat één of twee antwoorden anders via aftrekken herkenbaar zouden worden.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {result.buckets.map((bucket) => (
                            <div key={bucket.key}>
                              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                                <span className="min-w-0 truncate" style={{ color: "var(--text2)" }}>{bucket.label}</span>
                                <span className="font-semibold tabular-nums">{bucket.count}</span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface3)" }}>
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${Math.round((bucket.count / room.responseCount) * 100)}%`, background: "var(--accent)" }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {rooms.length > 1 && (
          <section className="mb-6">
            <h2 className="mb-2 text-base font-semibold">Recente rooms</h2>
            <div className="space-y-2">
              {rooms.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => setSelectedRoomId(candidate.id)}
                  className="focus-ring flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-left"
                  style={{ background: candidate.id === room?.id ? "var(--surface2)" : "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{candidate.title}</span>
                    <span className="block text-xs" style={{ color: "var(--text2)" }}>
                      {statusLabel(candidate.status)} · {candidate.responseCount} responses
                    </span>
                  </span>
                  <span className="text-xs" style={{ color: "var(--text2)" }}>{formatMoment(candidate.createdAt)}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl p-4 text-xs leading-relaxed" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}>
          <p className="font-semibold" style={{ color: "var(--text)" }}>De echte privacygrens</p>
          <p className="mt-2">
            KinkSync vermijdt namen en profielen en bewaart geen individuele inzendingen. Het kan niet verhinderen dat mensen in de fysieke ruimte zien wie een code scant, een scherm fotograferen of sociaal proberen te raden wie wat koos. Exacte replay wordt geblokkeerd, maar zonder identiteit bestaat geen perfecte één-persoon-één-stem-garantie.
          </p>
        </section>
      </PageShell>

      <MunchPunchScanner
        open={scanOpen && room?.status === "open"}
        onClose={() => setScanOpen(false)}
        onResult={handleScanResult}
      />
    </>
  );
}
