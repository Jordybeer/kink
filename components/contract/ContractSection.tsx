"use client";

import { useEffect, useState } from "react";
import { STATUS_LABEL as STATUS_NL } from "@/lib/statusLabels";
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
  onNoteChange,
}: Props) {
  const [openNotes, setOpenNotes] = useState<Set<string>>(new Set());
  const cA = colourA ?? "var(--accent)";
  const cB = colourB ?? "var(--accent2)";
  const nA = nameA?.split(" ")[0] ?? "A";
  const nB = nameB?.split(" ")[0] ?? "B";

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
    <div className="mb-5">
      <h3 className="mb-2 text-sm" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontWeight: 400, color: colour }}>
        {title}
      </h3>
      {isKinkDetail(items[0]) ? (
        <div className="space-y-2">
          {(items as KinkDetailItem[]).map((item, i) => {
            const editorOpen = openNotes.has(noteKey(item.name)) || Boolean(item.commentA || item.commentB);
            return (
              <div key={`${item.name}-${i}`} className="rounded-xl p-2.5 text-sm" style={{
                background: `color-mix(in srgb, ${colour} 8%, transparent)`,
                border: `1px solid color-mix(in srgb, ${colour} 20%, transparent)`,
              }}>
                <div className="mb-1.5 font-medium" style={{ color: "var(--text)" }}>{item.name}</div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    {item.statusA
                      ? <span className="whitespace-nowrap rounded-full border px-1.5 py-0.5 text-sm" style={{ color: cA, borderColor: `color-mix(in srgb, ${cA} 40%, transparent)`, background: `color-mix(in srgb, ${cA} 10%, transparent)` }}>{nA}: {STATUS_NL[item.statusA]}</span>
                      : <span style={{ color: "var(--text2)", fontSize: "14px" }}>{nA}: geen antwoord</span>
                    }
                  </div>
                  <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${cA}, ${cB})`, opacity: 0.2 }} />
                  <div className="flex flex-col items-end gap-0.5">
                    {item.statusB
                      ? <span className="whitespace-nowrap rounded-full border px-1.5 py-0.5 text-sm" style={{ color: cB, borderColor: `color-mix(in srgb, ${cB} 40%, transparent)`, background: `color-mix(in srgb, ${cB} 10%, transparent)` }}>{STATUS_NL[item.statusB]}: {nB}</span>
                      : <span style={{ color: "var(--text2)", fontSize: "14px" }}>geen antwoord: {nB}</span>
                    }
                  </div>
                </div>

                {(item.desireA != null || item.desireB != null) && (
                  <div className="mt-1.5 space-y-0.5" style={{ color: "var(--text2)" }}>
                    {item.desireA != null && <div className="text-xs"><span className="font-medium" style={{ color: cA }}>{nA} verlangen:</span> {item.desireA}/5</div>}
                    {item.desireB != null && <div className="text-xs"><span className="font-medium" style={{ color: cB }}>{nB} verlangen:</span> {item.desireB}/5</div>}
                  </div>
                )}

                {editableNotes && !editorOpen && (
                  <button
                    type="button"
                    onClick={() => openNoteEditor(item.name)}
                    className="focus-ring -mb-1 -ml-2 mt-1 inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-semibold"
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
                        onChange={(event) => onNoteChange?.(noteScope, item.name, "a", event.target.value)}
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
                        onChange={(event) => onNoteChange?.(noteScope, item.name, "b", event.target.value)}
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
        <div className="flex flex-wrap gap-1.5">
          {(items as (string | { text: string; tag: string })[]).map((item, i) => (
            <span key={i} className="rounded-full px-2.5 py-1 text-sm" style={{
              background: `color-mix(in srgb, ${colour} 12%, transparent)`,
              color: colour,
              border: `1px solid color-mix(in srgb, ${colour} 30%, transparent)`,
            }}>
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
