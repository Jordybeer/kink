"use client";

import { ArrowSquareOut, DownloadSimple, FilePdf, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import type { ContractSeries, ContractVersion } from "@/lib/contractLifecycle";
import { artifactForContractVersion } from "@/lib/contractDocument";
import { contractPdfBlob, type ContractPdfArtifact } from "@/lib/contractArtifacts";
import ContractCanonicalPreview from "@/components/contract/ContractCanonicalPreview";
import { shouldUseCanonicalPdfPreview } from "@/lib/pdfPreview";

export default function ContractPdfViewer({ series, version }: {
  series: ContractSeries;
  version: ContractVersion;
}) {
  const [artifact, setArtifact] = useState<ContractPdfArtifact | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [canonicalPreview, setCanonicalPreview] = useState<boolean | null>(null);

  useEffect(() => {
    setCanonicalPreview(shouldUseCanonicalPdfPreview({
      userAgent: window.navigator.userAgent,
      platform: window.navigator.platform,
      maxTouchPoints: window.navigator.maxTouchPoints,
    }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    let localUrl: string | null = null;
    setLoading(true);
    void artifactForContractVersion(series, version.id)
      .then((result) => {
        if (cancelled) return;
        setArtifact(result);
        if (result) {
          localUrl = URL.createObjectURL(contractPdfBlob(result));
          setObjectUrl(localUrl);
        } else {
          setObjectUrl(null);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => {
      cancelled = true;
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [series, version.id]);

  if (loading) {
    return (
      <div className="mt-5 rounded-2xl p-8 text-center text-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text2)" }}>
        Getekend document openen…
      </div>
    );
  }

  if (!artifact || !objectUrl) {
    return (
      <>
        <div className="mt-5 flex gap-3 rounded-xl p-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          <WarningCircle size={19} aria-hidden="true" className="mt-0.5 flex-none" style={{ color: "var(--maybe)" }} />
          <div>
            <p className="text-sm font-medium">Geen oorspronkelijk PDF-artifact beschikbaar</p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
              Deze versie komt uit oudere KinkSync-opslag of mist de toenmalige handgeschreven handtekeningen. KinkSync verzint die historische informatie niet achteraf.
            </p>
          </div>
        </div>
        {version.content && <div className="mt-5"><ContractCanonicalPreview content={version.content} /></div>}
      </>
    );
  }

  return (
    <section className="mt-5" aria-label="Getekende contract-PDF">
      <div className="mb-3 flex flex-wrap gap-2">
        <a
          href={objectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold"
          style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
        >
          <ArrowSquareOut size={17} aria-hidden="true" />
          PDF openen
        </a>
        <a
          href={objectUrl}
          download={artifact.filename}
          className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
        >
          <DownloadSimple size={17} aria-hidden="true" />
          PDF bewaren
        </a>
      </div>
      <div className="overflow-hidden rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 border-b px-4 py-3 text-xs" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
          <FilePdf size={17} aria-hidden="true" style={{ color: "var(--accent)" }} />
          <span className="truncate">{artifact.filename}</span>
        </div>
        {canonicalPreview === null ? (
          <p className="px-4 py-8 text-center text-sm" style={{ color: "var(--text2)" }}>
            Voorvertoning voorbereiden…
          </p>
        ) : canonicalPreview && version.content ? (
          <div className="p-4" data-testid="contract-pdf-canonical-fallback">
            <p className="mb-4 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
              Op dit toestel tonen we de getekende inhoud direct. Met PDF openen bekijk je het originele bestand.
            </p>
            <ContractCanonicalPreview content={version.content} eyebrow="Getekende inhoud" />
          </div>
        ) : (
          <iframe src={objectUrl} title="Getekende contract-PDF" className="h-[68dvh] min-h-[480px] w-full" style={{ background: "var(--surface2)" }} />
        )}
      </div>
    </section>
  );
}
