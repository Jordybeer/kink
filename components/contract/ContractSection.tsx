"use client";

import StatusGlyph from "@/components/StatusGlyph";
import { PROFILE_COLOUR_A, PROFILE_COLOUR_B } from "@/lib/compare";

import { useEffect, useState } from "react";
import { STATUS_LABEL as STATUS_NL, STATUS_VAR } from "@/lib/statusLabels";
import { isKinkDetail } from "@/lib/contractPdf";
import type { ContractItem, KinkDetailItem } from "@/lib/contractPdf";

type NoteSide = "a" | "b";

interface Props {
  title: string;
  items: ContractItem[];
  colour: string;
  nameA?: string;
  nameB?: string;
  colourA?: string;
  colourB?: string;
  editableNotes?: boolean;
  noteScope?: string;
  getItemKey?: (item: KinkDetailItem) => string;
  onNoteChange?: (scope: string, itemName: string, side: NoteSide, value: string) => void;
}

export default function ContractSection({
  title,
  items,
  colour,
  nameA,
  nameB,
  colourA,
  colourB,
  editableNotes = false,
  noteScope = title,
  getItemKey,
  onNoteChange,
}: Props) {
  const [openNotes, setOpenNotes] = useState<Set<string>>(new Set());
  const cA = colourA ?? PROFILE_COLOUR_A;
  const cB = colourB ?? PROFILE_COLOUR_B;
  const nA = nameA ?? "A";
  const nB = nameB ?? "B";

  useEffect(() => {
    setOpenNotes(new Set());
  }, [noteScope, items.length]);

  if (!items.length) return null;

  function noteKey(itemName: string): string {
    return `${noteScope}:${itemName}`;
  }

  function openNoteEditor(itemName: string) {
    setOpenNotes((current) => new Set(current).add(noteKey(itemName)));
  }

  return (
    <div className="mb-8 min-w-0 [overflow-wrap:anywhere]">
      <h3 className="mb-2 text-sm" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontWeight: 400, color: colour }}>
        {title}
      </h3>
      {isKinkDetail(items[0]) ? (
        <div className="min-w-0">
          {(items as KinkDetailItem[]).map((item, i) => {
            const identity = getItemKey?.(item) ?? item.name;
            const editorOpen = openNotes.has(noteKey(identity)) || Boolean(item.commentA || item.commentB);
            return (
              <div key={getItemKey ? identity : `${item.name}-${i}`} data-contract-topic className="min-w-0 border-b py-4 text-sm" style={{ borderColor: "var(--border)" }}>
                <div className="mb-1.5 font-medium" style={{ color: "var(--text)" }}>{item.name}</div>
                {item.sourceKind === "custom" && (
                  <p className="mb-1.5 text-xs" style={{ color: "var(--text2)" }}>
                    Eigen onderwerp van {item.sourceAId && item.sourceBId ? `${nA} en ${nB}` : item.sourceAId ? nA : nB}
                  </p>
                )}
                <dl className="mt-2 grid min-w-0 gap-3 sm:grid-cols-2">
                  {[
                    { name: nA, colour: cA, status: item.statusA, desire: item.desireA },
                    { name: nB, colour: cB, status: item.statusB, desire: item.desireB },
                  ].map((answer, side) => (
                    <div key={side} data-contract-answer className="min-w-0">
                      <dt className="font-medium" style={{ color: answer.colour }}>{answer.name}</dt>
                      <dd className="mt-0.5">
                        {answer.status
                          ? <span style={{ color: STATUS_VAR[answer.status] }}><StatusGlyph status={answer.status} size={14} /> {STATUS_NL[answer.status]}</span>
                          : <span style={{ color: "var(--text2)" }}>geen antwoord</span>}
                        {answer.desire != null && <span className="mt-0.5 block text-xs" style={{ color: "var(--text2)" }}>Verlangen: {answer.desire}/5</span>}
                      </dd>
                    </div>
                  ))}
                </dl>

                {editableNotes && !editorOpen && (
                  <button
                    type="button"
                    onClick={() => openNoteEditor(identity)}
                    className="ks-motion-choice focus-ring -mb-1 -ml-2 mt-1 inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-semibold"
                    style={{ color: "var(--text2)" }}
                    aria-label={`Notitie toevoegen bij ${item.name}`}
                  >
                    + Notitie
                  </button>
                )}

                {editableNotes && editorOpen && (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <label className="min-w-0">
                      <span className="mb-1 block text-xs font-semibold" style={{ color: cA }}>{nA}</span>
                      <textarea
                        value={item.commentA ?? ""}
                        onChange={(event) => onNoteChange?.(noteScope, identity, "a", event.target.value)}
                        rows={2}
                        maxLength={500}
                        placeholder={`Notitie van ${nA}`}
                        className="focus-ring w-full resize-none rounded-lg px-2.5 py-2 text-sm focus:outline-none"
                        style={{ background: "var(--surface2)", border: `1px solid color-mix(in srgb, ${cA} 30%, var(--border))`, color: "var(--text)" }}
                      />
                    </label>
                    <label className="min-w-0">
                      <span className="mb-1 block text-xs font-semibold" style={{ color: cB }}>{nB}</span>
                      <textarea
                        value={item.commentB ?? ""}
                        onChange={(event) => onNoteChange?.(noteScope, identity, "b", event.target.value)}
                        rows={2}
                        maxLength={500}
                        placeholder={`Notitie van ${nB}`}
                        className="focus-ring w-full resize-none rounded-lg px-2.5 py-2 text-sm focus:outline-none"
                        style={{ background: "var(--surface2)", border: `1px solid color-mix(in srgb, ${cB} 30%, var(--border))`, color: "var(--text)" }}
                      />
                    </label>
                    <p className="text-xs leading-5 sm:col-span-2" style={{ color: "var(--text2)" }}>
                      Ingevulde notities worden onderdeel van deze contractversie en komen ook in de PDF.
                    </p>
                  </div>
                )}

                {!editableNotes && (item.commentA || item.commentB) && (
                  <div className="mt-1.5 space-y-0.5" style={{ color: "var(--text2)" }}>
                    {item.commentA && <div><span className="font-medium" style={{ color: cA }}>{nA}:</span> {item.commentA}</div>}
                    {item.commentB && <div><span className="font-medium" style={{ color: cB }}>{nB}:</span> {item.commentB}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="min-w-0">
          {(items as (string | { text: string; tag: string })[]).map((item, i) => (
            <span key={i} className="block border-b py-3 text-sm" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
              {typeof item === "string" ? item : (
                <>{item.text} <span style={{ opacity: 0.65 }}>{item.tag}</span></>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
