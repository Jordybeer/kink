"use client";

import { useEffect, useRef } from "react";
import type { ContractVersionContent } from "@/lib/contractLifecycle";
import {
  handwrittenSignaturesFromContent,
  handwrittenSignatureToPngDataUrl,
} from "@/lib/contractHandwriting";

function DetailList({ title, items }: {
  title: string;
  items: readonly { name: string; commentA?: string; commentB?: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h3 className="text-sm italic" style={{ fontFamily: "var(--font-display, Georgia, serif)", color: "var(--accent)" }}>{title}</h3>
      <div className="mt-2 flex flex-col gap-2">
        {items.map((item, index) => (
          <div key={`${item.name}:${index}`} className="rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            <p className="text-sm font-medium">{item.name}</p>
            {item.commentA && <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text2)" }}>{item.commentA}</p>}
            {item.commentB && <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text2)" }}>{item.commentB}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function SignatureImage({ dataUrl, label }: { dataUrl: string; label: string }) {
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.src = dataUrl;
  }, [dataUrl]);
  return (
    <div className="rounded-xl p-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={ref} alt={`Handtekening van ${label}`} className="h-16 w-full object-contain" />
      <p className="mt-2 text-center text-xs font-medium" style={{ color: "var(--text2)" }}>{label}</p>
    </div>
  );
}

export default function ContractCanonicalPreview({ content }: { content: ContractVersionContent }) {
  const handwriting = handwrittenSignaturesFromContent(content);
  const sigA = handwriting ? handwrittenSignatureToPngDataUrl(handwriting.profileA) : null;
  const sigB = handwriting ? handwrittenSignatureToPngDataUrl(handwriting.profileB) : null;

  return (
    <div className="flex flex-col gap-5" data-testid="contract-canonical-preview">
      <section className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--accent)" }}>Exact te bevestigen document</p>
        <h2 className="mt-3 text-xl italic" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}>
          {content.profileA.profileName} × {content.profileB.profileName}
        </h2>
        <p className="mt-3 text-sm italic leading-relaxed" style={{ color: "var(--text2)" }}>{content.preamble}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {[content.profileA, content.profileB].map((participant, index) => (
            <div key={participant.profileId} className="rounded-xl p-3" style={{ background: "var(--surface2)" }}>
              <p className="text-sm font-medium">{participant.profileName}</p>
              <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>{participant.role}</p>
              {(index === 0 ? content.realNameA : content.realNameB) && (
                <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>{index === 0 ? content.realNameA : content.realNameB}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm italic" style={{ fontFamily: "var(--font-display, Georgia, serif)", color: "var(--accent)" }}>Signalen & nazorg</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {[
            { name: content.profileA.profileName, signals: content.signalsA, aftercare: content.aftercareA },
            { name: content.profileB.profileName, signals: content.signalsB, aftercare: content.aftercareB },
          ].map(({ name, signals, aftercare }) => (
            <div key={name} className="rounded-xl p-3 text-xs leading-relaxed" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <p className="text-sm font-medium">{name}</p>
              <p className="mt-2" style={{ color: "var(--text2)" }}>Groen: {signals.green}</p>
              <p style={{ color: "var(--text2)" }}>Oranje: {signals.amber}</p>
              <p style={{ color: "var(--text2)" }}>Rood: {signals.red}</p>
              <p style={{ color: "var(--text2)" }}>Stop alles: {signals.black}</p>
              <p className="mt-2" style={{ color: "var(--text2)" }}>Nazorg: {aftercare.length ? aftercare.join(" · ") : "Geen specifieke voorkeur toegevoegd"}</p>
            </div>
          ))}
        </div>
      </section>

      <DetailList title="Gedeelde verlangens" items={content.shared} />
      <DetailList title="Zachte grenzen" items={content.softLimits} />
      <DetailList title="Bespreking nodig" items={content.discuss} />
      <DetailList title="Harde grenzen" items={content.hardLimitDetails} />

      <section>
        <h3 className="text-sm italic" style={{ fontFamily: "var(--font-display, Georgia, serif)", color: "var(--accent)" }}>Handgeschreven handtekeningen</h3>
        {sigA && sigB ? (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <SignatureImage dataUrl={sigA} label={content.profileA.profileName} />
            <SignatureImage dataUrl={sigB} label={content.profileB.profileName} />
          </div>
        ) : (
          <p className="mt-2 rounded-xl p-3 text-sm" style={{ background: "var(--surface2)", color: "var(--hard-no)", border: "1px solid var(--border)" }}>
            De twee verplichte handgeschreven handtekeningen ontbreken.
          </p>
        )}
      </section>
    </div>
  );
}
