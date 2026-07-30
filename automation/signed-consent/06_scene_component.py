from pathlib import Path
from textwrap import dedent

ROOT = Path('.')

def write(path: str, content: str) -> None:
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(dedent(content).lstrip(), encoding='utf-8')

def replace_once(path: str, old: str, new: str) -> None:
    p = ROOT / path
    text = p.read_text(encoding='utf-8')
    if text.count(old) != 1:
        raise RuntimeError(f'{path}: expected one match, found {text.count(old)} for {old[:80]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

write('components/ConsentLedgerPanel.tsx', r'''
"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle, ShieldWarning, PlusCircle, X } from "@phosphor-icons/react";
import type { ConsentSourceTrust, KinkStatus, SceneConsentEventInput, SceneRecord } from "@/types";
import { useStore } from "@/lib/store";
import {
  createSignedSceneConsentEvent,
  describeConsentEvent,
  verifySceneConsentLedger,
} from "@/lib/consentLedger";
import { STATUS_LABEL } from "@/lib/statusLabels";

const STATUS_OPTIONS: Exclude<KinkStatus, null>[] = ["yes", "willing", "maybe", "no", "hard_no"];

function trustLabel(trust: ConsentSourceTrust) {
  if (trust === "self") return { label: "Eigen bron", color: "var(--accent)" };
  if (trust === "confirmed") return { label: "Bron bevestigd", color: "var(--yes)" };
  if (trust === "invalid") return { label: "Controle mislukt", color: "var(--hard-no)" };
  return { label: "Niet bevestigd", color: "var(--maybe)" };
}

export default function ConsentLedgerPanel({ scene }: { scene: SceneRecord }) {
  const ledger = scene.consentLedger;
  const profiles = useStore((state) => state.profiles);
  const profileKeys = useStore((state) => state.profileKeys);
  const sealProfileForSharing = useStore((state) => state.sealProfileForSharing);
  const appendSceneConsentEvent = useStore((state) => state.appendSceneConsentEvent);

  const ownParticipants = useMemo(() => profiles.filter((profile) =>
    (profile.id === scene.profileAId || profile.id === scene.profileBId)
    && profile.origin !== "shared"
  ), [profiles, scene.profileAId, scene.profileBId]);

  const [ledgerValid, setLedgerValid] = useState<boolean | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [profileId, setProfileId] = useState("");
  const [kind, setKind] = useState<SceneConsentEventInput["kind"]>("withdrawn");
  const [kinkId, setKinkId] = useState("");
  const [status, setStatus] = useState<Exclude<KinkStatus, null>>("maybe");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId && ownParticipants[0]) setProfileId(ownParticipants[0].id);
  }, [ownParticipants, profileId]);

  useEffect(() => {
    let cancelled = false;
    if (!ledger) {
      setLedgerValid(null);
      return;
    }
    void verifySceneConsentLedger(ledger).then((valid) => {
      if (!cancelled) setLedgerValid(valid);
    });
    return () => { cancelled = true; };
  }, [ledger]);

  if (!ledger) return null;

  const targetItems = scene.items.filter((item) => item.kinkId);
  const snapshots = [ledger.profileA, ledger.profileB];

  async function handleAppend() {
    if (!profileId || saving) return;
    const profile = profiles.find((item) => item.id === profileId);
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      const sealed = await sealProfileForSharing(profile.id);
      const ownership = profileKeys[profile.id] ?? useStore.getState().profileKeys[profile.id];
      if (!sealed || !ownership) throw new Error("De persoonlijke sleutel kon niet worden geopend");
      const selectedItem = scene.items.find((item) => item.kinkId === kinkId);
      const event = await createSignedSceneConsentEvent(scene, sealed, ownership, {
        kind,
        kinkId: selectedItem?.kinkId,
        kinkName: selectedItem?.name,
        status: kind === "changed" || kind === "added" ? status : undefined,
        note,
      });
      appendSceneConsentEvent(scene.id, event);
      setFormOpen(false);
      setKind("withdrawn");
      setKinkId("");
      setStatus("maybe");
      setNote("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Wijziging kon niet worden vastgelegd");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-6 rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="px-4 py-3 flex items-start gap-3" style={{ borderBottom: "1px solid var(--border)" }}>
        {ledgerValid === false
          ? <ShieldWarning size={20} className="flex-none mt-0.5" style={{ color: "var(--hard-no)" }} aria-hidden="true" />
          : <CheckCircle size={20} className="flex-none mt-0.5" style={{ color: "var(--yes)" }} aria-hidden="true" />}
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Toestemming vastgelegd</h2>
          <p className="text-xs mt-1" style={{ color: "var(--text2)", lineHeight: 1.55 }}>
            Deze scène bewaart een losse kopie van de afspraken zoals ze waren bij het plannen. Latere profielwijzigingen herschrijven dit verslag niet. Wijzigingen tijdens de sessie worden toegevoegd; eerdere regels blijven staan.
          </p>
        </div>
      </div>

      <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
        {snapshots.map((snapshot) => {
          const trust = trustLabel(snapshot.trust);
          return (
            <div key={snapshot.profileId} className="rounded-lg px-3 py-2" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate">{snapshot.profileName}</span>
                <span className="text-xs flex-none" style={{ color: trust.color }}>{trust.label}</span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text2)" }}>
                Versie {snapshot.revision} · {new Date(snapshot.capturedAt).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" })}
              </p>
            </div>
          );
        })}
      </div>

      {ledgerValid === false && (
        <div className="px-4 py-3 text-xs" role="alert" style={{ color: "var(--hard-no)", background: "color-mix(in srgb, var(--hard-no) 8%, transparent)" }}>
          De vastgelegde inhoud of wijzigingsketen klopt niet meer. Gebruik dit verslag niet als betrouwbare weergave van de afspraken.
        </div>
      )}

      {ledger.events.length > 0 && (
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--text2)" }}>Wijzigingen tijdens de sessie</p>
          <div className="space-y-2">
            {ledger.events.map((event) => (
              <div key={event.id} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-none" style={{ background: event.kind === "withdrawn" ? "var(--hard-no)" : "var(--accent)" }} aria-hidden="true" />
                <div className="min-w-0">
                  <p><strong>{event.profileName}</strong> · {describeConsentEvent(event)}</p>
                  {(event.status || event.note) && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text2)" }}>
                      {event.status ? STATUS_LABEL[event.status] : ""}{event.status && event.note ? " · " : ""}{event.note}
                    </p>
                  )}
                  <p className="text-xs mt-0.5" style={{ color: "var(--text2)" }}>
                    {new Date(event.createdAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })} · door eigenaar bevestigd
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4">
        {!formOpen ? (
          ownParticipants.length > 0 ? (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="focus-ring w-full min-h-11 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--accent)" }}
            >
              <PlusCircle size={17} aria-hidden="true" /> Wijziging vastleggen
            </button>
          ) : (
            <p className="text-xs text-center" style={{ color: "var(--text2)" }}>
              Op dit toestel staat geen eigenaarsprofiel voor deze scène. Alleen de eigenaar kan een nieuwe geldige regel toevoegen.
            </p>
          )
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Nieuwe regel toevoegen</h3>
              <button type="button" onClick={() => setFormOpen(false)} className="focus-ring p-2 rounded-lg" aria-label="Sluiten" style={{ color: "var(--text2)" }}>
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            {ownParticipants.length > 1 && (
              <select value={profileId} onChange={(event) => setProfileId(event.target.value)} className="focus-ring w-full rounded-lg px-3 py-2.5 text-sm" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}>
                {ownParticipants.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
              </select>
            )}

            <select value={kind} onChange={(event) => setKind(event.target.value as SceneConsentEventInput["kind"])} className="focus-ring w-full rounded-lg px-3 py-2.5 text-sm" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}>
              <option value="withdrawn">Toestemming intrekken</option>
              <option value="changed">Afspraak aanpassen</option>
              <option value="added">Toestemming toevoegen</option>
              <option value="note">Belangrijke notitie</option>
            </select>

            {targetItems.length > 0 && kind !== "note" && (
              <select value={kinkId} onChange={(event) => setKinkId(event.target.value)} className="focus-ring w-full rounded-lg px-3 py-2.5 text-sm" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}>
                <option value="">Hele sessie</option>
                {targetItems.map((item) => <option key={item.id} value={item.kinkId}>{item.name}</option>)}
              </select>
            )}

            {(kind === "changed" || kind === "added") && (
              <select value={status} onChange={(event) => setStatus(event.target.value as Exclude<KinkStatus, null>)} className="focus-ring w-full rounded-lg px-3 py-2.5 text-sm" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}>
                {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{STATUS_LABEL[option]}</option>)}
              </select>
            )}

            <textarea
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={kind === "withdrawn" ? "Optionele toelichting…" : "Wat veranderde er precies?"}
              className="focus-ring w-full rounded-lg px-3 py-2.5 text-sm resize-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
            />

            {error && <p role="alert" className="text-xs" style={{ color: "var(--hard-no)" }}>{error}</p>}

            <button
              type="button"
              onClick={() => void handleAppend()}
              disabled={saving || (kind === "note" && !note.trim())}
              className="focus-ring w-full min-h-11 rounded-xl text-sm font-bold disabled:opacity-40"
              style={{ background: kind === "withdrawn" ? "var(--hard-no)" : "var(--accent)", color: "var(--on-accent)" }}
            >
              {saving ? "Bevestigen…" : kind === "withdrawn" ? "Intrekking vastleggen" : "Wijziging vastleggen"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
''')
