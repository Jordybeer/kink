"use client";

import { useEffect, useMemo, useState } from "react";
import type { Profile, SceneRecord } from "@/types";
import { consentEventLabel } from "@/lib/consentProof";
import {
  verifySceneConsentRecord,
  type SceneConsentVerification,
} from "@/lib/sceneConsentVerification";
import { useStore } from "@/lib/store";

export default function ConsentLedgerPanel({ scene, profiles }: { scene: SceneRecord; profiles: Profile[] }) {
  const { lockSceneConsent, appendSceneConsentEvent } = useStore();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [verification, setVerification] = useState<SceneConsentVerification | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [note, setNote] = useState("");
  const events = scene.consentLedger ?? [];
  const ownProfiles = useMemo(() => [scene.profileAId, scene.profileBId]
    .map((id) => profiles.find((profile) => profile.id === id))
    .filter((profile): profile is Profile => !!profile && profile.origin !== "shared" && !profile.isImported), [profiles, scene.profileAId, scene.profileBId]);

  useEffect(() => {
    if (!selectedProfileId && ownProfiles[0]) setSelectedProfileId(ownProfiles[0].id);
  }, [ownProfiles, selectedProfileId]);

  useEffect(() => {
    let cancelled = false;
    if (!events.length) { setVerification(null); return; }
    void verifySceneConsentRecord(scene).then((result) => {
      if (!cancelled) setVerification(result);
    });
    return () => { cancelled = true; };
  }, [scene, events.length]);

  async function lockNow() {
    setBusy(true); setMessage(null);
    try {
      const result = await lockSceneConsent(scene.id);
      setMessage(result.message);
    } catch {
      setMessage("De afspraken konden niet worden vastgezet. Probeer opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  async function append(type: "changed" | "withdrawn") {
    if (!selectedProfileId) return;
    setBusy(true); setMessage(null);
    try {
      const result = await appendSceneConsentEvent(scene.id, selectedProfileId, type, note.trim() || undefined);
      setMessage(result.message);
      if (result.ok) setNote("");
    } catch {
      setMessage("De wijziging kon niet worden toegevoegd. Probeer opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  const valid = verification?.status === "valid";
  const signerIds = valid ? verification.signedByProfileIds : [];
  const signerNames = signerIds.map((id) =>
    scene.consentSnapshots?.profileA.profileId === id
      ? scene.consentSnapshots.profileA.profileName
      : scene.consentSnapshots?.profileB.profileName ?? id);
  const bothSigned = signerIds.includes(scene.profileAId) && signerIds.includes(scene.profileBId);

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="text-sm" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontWeight: 400, color: "var(--text)" }}>
          Vastgelegde afspraken
        </h2>
        {events.length > 0 && (
          <span className="text-sm" style={{ color: verification?.status === "invalid" ? "var(--hard-no)" : valid ? "var(--yes)" : "var(--text2)" }}>
            {verification?.status === "invalid" ? "Controle mislukt" : valid ? "Afspraken intact" : "Controleren…"}
          </span>
        )}
      </div>

      <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: `1px solid ${verification?.status === "invalid" ? "var(--hard-no)" : "var(--border)"}` }}>
        {!scene.consentSnapshots ? (
          <>
            <p className="text-sm mb-3" style={{ color: "var(--text2)", lineHeight: 1.6 }}>
              Leg vast welke profielversies, activiteiten, intensiteiten, notities en welk safeword nu gelden. Latere wijzigingen worden toegevoegd en overschrijven deze versie niet.
            </p>
            <button onClick={lockNow} disabled={busy} className="focus-ring w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}>
              {busy ? "Vastzetten…" : "Afspraken nu vastzetten"}
            </button>
          </>
        ) : (
          <>
            {verification?.status === "invalid" && (
              <div role="alert" className="rounded-lg px-3 py-3 mb-4 text-sm" style={{ background: "color-mix(in srgb, var(--hard-no) 10%, var(--surface2))", border: "1px solid var(--hard-no)", color: "var(--text2)" }}>
                <strong style={{ color: "var(--hard-no)" }}>Gebruik dit niet als betrouwbare weergave.</strong> {verification.reason}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mb-3">
              {[scene.consentSnapshots.profileA, scene.consentSnapshots.profileB].map((snapshot) => (
                <div key={snapshot.profileId} className="rounded-lg px-3 py-2" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <p className="text-sm font-semibold truncate">{snapshot.profileName}</p>
                  <p className="text-sm mt-0.5" style={{ color: "var(--yes)" }}>Profielbron bevestigd · v{snapshot.proof.version}</p>
                  <p className="text-xs truncate mt-0.5" style={{ color: "var(--text2)" }}>{snapshot.alias}</p>
                </div>
              ))}
            </div>

            {valid && (
              <div className="rounded-lg px-3 py-2.5 mb-4 text-sm leading-relaxed" style={{ background: "color-mix(in srgb, var(--yes) 7%, var(--surface2))", border: "1px solid var(--border)", color: "var(--text2)" }}>
                {bothSigned
                  ? `De exacte scène-afspraak is door beide lokale profielsleutels bevestigd (${signerNames.join(" en ")}).`
                  : `De exacte scène-afspraak is vastgezet door ${signerNames.join(" en ")}. De andere profielbron is bevestigd, maar dat is geen aparte live bevestiging voor deze specifieke sessie.`}
              </div>
            )}

            <div className="flex flex-col gap-2 mb-4">
              {events.map((event) => (
                <div key={event.id} className="flex gap-3 text-sm">
                  <span className="flex-none" style={{ color: event.type === "withdrawn" ? "var(--hard-no)" : "var(--accent)" }}>●</span>
                  <div className="min-w-0">
                    <p style={{ color: "var(--text)" }}>{consentEventLabel(event.type)}{event.profileName ? ` · ${event.profileName}` : ""}</p>
                    <p className="text-xs" style={{ color: "var(--text2)" }}>{new Date(event.createdAt).toLocaleString("nl-NL")}</p>
                    {event.note && <p className="mt-0.5" style={{ color: "var(--text2)" }}>{event.note}</p>}
                  </div>
                </div>
              ))}
            </div>

            {ownProfiles.length > 0 && valid && (
              <div className="rounded-lg p-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <p className="text-sm mb-2 leading-relaxed" style={{ color: "var(--text2)" }}>Een nieuwe wijziging wordt ondertekend door het gekozen eigen profiel en achteraan toegevoegd. Eerdere regels blijven staan.</p>
                {ownProfiles.length > 1 && (
                  <select value={selectedProfileId} onChange={(event) => setSelectedProfileId(event.target.value)} className="w-full rounded-lg px-3 py-2 text-sm mb-2" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}>
                    {ownProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
                  </select>
                )}
                <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Wat veranderde? (optioneel)" className="w-full rounded-lg px-3 py-2 text-sm mb-2" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
                <div className="flex gap-2">
                  <button onClick={() => append("changed")} disabled={busy} className="focus-ring flex-1 py-2 rounded-lg text-sm font-semibold border disabled:opacity-50" style={{ borderColor: "var(--border-accent)", color: "var(--accent)" }}>Wijziging bevestigen</button>
                  <button onClick={() => append("withdrawn")} disabled={busy} className="focus-ring flex-1 py-2 rounded-lg text-sm font-semibold border disabled:opacity-50" style={{ borderColor: "var(--hard-no)", color: "var(--hard-no)" }}>Toestemming intrekken</button>
                </div>
              </div>
            )}
          </>
        )}

        {message && <p role="status" className="text-sm mt-3" style={{ color: message.startsWith("✓") ? "var(--yes)" : "var(--text2)" }}>{message}</p>}

        <details className="mt-4">
          <summary className="text-sm cursor-pointer focus-ring rounded" style={{ color: "var(--accent)" }}>Hoe beschermt dit jullie afspraken?</summary>
          <div className="text-sm mt-2 flex flex-col gap-2 leading-relaxed" style={{ color: "var(--text2)" }}>
            <p>Elke bevestigde profielversie heeft een controleerbare digitale verzegeling. Een logregel telt alleen wanneer de sleutel werkelijk bij één van de twee scèneprofielen hoort; een willekeurige andere sleutel wordt afgewezen.</p>
            <p>Bij het vastzetten bewaart KinkSync exact welke profielversies, activiteiten, intensiteiten, notities en welk safeword golden. Een wijziging of intrekking komt later als nieuwe regel erbij.</p>
            <p>Dit maakt gewijzigde inhoud en gebroken ketens zichtbaar. Zonder server kan een volledig toestel of volledige backup nog steeds naar een oudere, op zichzelf geldige kopie worden teruggezet. Twee onafhankelijke toestelkopieën of een versleutelde backup geven bij belangrijke afspraken extra controle.</p>
            <p>Dit vervangt geen gesprek: toestemming kan altijd mondeling of non-verbaal worden ingetrokken en dan moet de activiteit meteen stoppen.</p>
          </div>
        </details>
      </div>
    </section>
  );
}
