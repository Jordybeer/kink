"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle,
  Flask,
  ShieldCheck,
  UploadSimple,
  Wrench,
} from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";
import { setDevTestToolsEnabled, syncDevTestToolsFromLocation } from "@/lib/devTestTools";
import {
  parseDevQaKinkList,
  qaProfileNameFromFilename,
  type DevQaProfileImport,
} from "@/lib/devQaProfileImport";
import { profileHref } from "@/lib/localRoutes";
import { useStore } from "@/lib/store";

const MAX_QA_FILE_BYTES = 2 * 1024 * 1024;

type ImportPreview = {
  fileName: string;
  parsed: DevQaProfileImport;
};

export default function DevQaConsole() {
  const localProfileCount = useStore((state) => state.profiles.filter((profile) => profile.origin !== "shared").length);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [profileName, setProfileName] = useState("");
  const [role, setRole] = useState("Testprofiel");
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  useEffect(() => {
    setEnabled(syncDevTestToolsFromLocation());
  }, []);

  async function handleFile(file: File | undefined) {
    setError(null);
    setCreatedId(null);
    setPreview(null);
    if (!file) return;
    if (file.size > MAX_QA_FILE_BYTES) {
      setError("QA-bestand is te groot (max. 2 MB).");
      return;
    }

    try {
      const raw = JSON.parse(await file.text()) as unknown;
      const parsed = parseDevQaKinkList(raw);
      setPreview({ fileName: file.name, parsed });
      setProfileName(qaProfileNameFromFilename(file.name));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "QA-bestand kon niet worden gelezen.");
    }
  }

  function createImportedProfile() {
    if (!preview) return;
    const cleanName = profileName.trim();
    if (!cleanName) {
      setError("Geef het testprofiel een naam.");
      return;
    }

    const cleanRole = role.trim() || "Testprofiel";
    const id = useStore.getState().createProfile(cleanName, cleanRole, "diepgaand");
    const now = Date.now();
    useStore.setState((state) => ({
      profiles: state.profiles.map((profile) => profile.id === id
        ? {
            ...profile,
            entries: structuredClone(preview.parsed.entries),
            questionnaireSetup: { mode: "deepDive", interests: [], version: 2 },
            updatedAt: now,
          }
        : profile),
    }));
    setError(null);
    setCreatedId(id);
  }

  if (enabled === null) return <PageShell loading width="2xl" />;

  if (!enabled) {
    return (
      <PageShell width="2xl" className="lg:max-w-3xl">
        <section className="mx-auto max-w-xl py-10 text-center">
          <span
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "var(--surface2)", color: "var(--accent)" }}
          >
            <ShieldCheck size={22} aria-hidden="true" />
          </span>
          <h1
            className="mt-4 text-3xl italic"
            style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}
          >
            QA is vergrendeld
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6" style={{ color: "var(--text2)" }}>
            Deze route bestaat alleen op de dev-host. Activeer testtools expliciet op dit toestel om de lokale QA-hulpmiddelen te openen.
          </p>
          <button
            type="button"
            onClick={() => setEnabled(setDevTestToolsEnabled(true))}
            className="focus-ring mt-5 min-h-11 rounded-xl px-5 text-sm font-semibold"
            style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
          >
            Testtools activeren
          </button>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell width="2xl" className="lg:max-w-3xl">
      <section className="mb-6 px-1">
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--accent)" }}>
          <Flask size={18} aria-hidden="true" />
          Dev-only QA
        </div>
        <h1
          className="mt-2 text-3xl italic"
          style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}
        >
          QA-lab
        </h1>
        <p className="mt-2 text-sm leading-6" style={{ color: "var(--text2)" }}>
          Alles hier werkt alleen op dev en raakt uitsluitend de lokale data van deze browser. Er wordt niets geüpload.
        </p>
      </section>

      <section
        className="rounded-2xl p-5"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 flex-none items-center justify-center rounded-full"
            style={{ background: "var(--surface2)", color: "var(--accent)" }}
          >
            <UploadSimple size={19} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold">Kinklijst importeren als testprofiel</h2>
            <p className="mt-1 text-sm leading-6" style={{ color: "var(--text2)" }}>
              Voor platte JSON-lijsten met <code>id</code>, <code>status</code> en optioneel <code>conditions</code>. Alleen huidige catalogus-ID&apos;s worden overgenomen.
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="focus-ring mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
        >
          <UploadSimple size={18} aria-hidden="true" />
          JSON kiezen
        </button>

        {preview && (
          <div className="mt-4 rounded-xl p-4" style={{ background: "var(--surface2)" }}>
            <p className="truncate text-sm font-medium">{preview.fileName}</p>
            <p className="mt-1 text-sm leading-6" style={{ color: "var(--text2)" }}>
              {preview.parsed.matchedCount} van {preview.parsed.sourceCount} antwoorden klaar om te importeren.
              {preview.parsed.unknownIds.length > 0 ? ` ${preview.parsed.unknownIds.length} onbekende ID(s) worden overgeslagen.` : ""}
              {preview.parsed.invalidCount > 0 ? ` ${preview.parsed.invalidCount} ongeldige regel(s) worden overgeslagen.` : ""}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Naam
                <input
                  value={profileName}
                  maxLength={80}
                  onChange={(event) => setProfileName(event.target.value)}
                  className="focus-ring mt-1 min-h-11 w-full rounded-xl px-3 text-base"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                />
              </label>
              <label className="text-sm font-medium">
                Rol
                <input
                  value={role}
                  maxLength={80}
                  onChange={(event) => setRole(event.target.value)}
                  className="focus-ring mt-1 min-h-11 w-full rounded-xl px-3 text-base"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                />
              </label>
            </div>

            <button
              type="button"
              onClick={createImportedProfile}
              className="focus-ring mt-4 min-h-11 w-full rounded-xl px-4 text-sm font-semibold"
              style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
            >
              Lokaal testprofiel maken
            </button>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm leading-6" style={{ color: "var(--hard-no)" }}>
            {error}
          </p>
        )}

        {createdId && (
          <div className="mt-4 flex items-center gap-3 rounded-xl p-3" style={{ background: "var(--surface2)" }}>
            <CheckCircle size={20} weight="fill" aria-hidden="true" style={{ color: "var(--yes)" }} />
            <span className="min-w-0 flex-1 text-sm">Testprofiel aangemaakt.</span>
            <Link
              href={profileHref(createdId)}
              className="focus-ring flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-semibold"
              style={{ color: "var(--accent)" }}
            >
              Open
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>

      <section
        className="mt-4 rounded-2xl p-5"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-start gap-3">
          <Wrench size={20} className="mt-0.5 flex-none" aria-hidden="true" style={{ color: "var(--accent)" }} />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">Contractflow in fast-forward</h2>
            <p className="mt-1 text-sm leading-6" style={{ color: "var(--text2)" }}>
              Testmodus is actief. Gebruik twee lokaal aangemaakte profielen en KinkSync biedt in de contractflow automatisch lokale dubbele bevestiging aan. Request, response, receipt en cryptografische controles blijven gewoon lopen.
            </p>
            <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>
              Lokale profielen op dit toestel: {localProfileCount}.
            </p>
            <Link
              href="/compare"
              className="focus-ring mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
            >
              Naar vergelijken
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={() => {
          setDevTestToolsEnabled(false);
          setPreview(null);
          setCreatedId(null);
          setEnabled(false);
        }}
        className="focus-ring mt-5 min-h-11 rounded-xl px-3 text-sm font-medium"
        style={{ color: "var(--text2)" }}
      >
        Testmodus op dit toestel uitschakelen
      </button>
    </PageShell>
  );
}
