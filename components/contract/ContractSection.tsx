"use client";
import { STATUS_LABEL as STATUS_NL } from "@/lib/statusLabels";
import { isKinkDetail } from "@/lib/contractPdf";
import type { ContractItem, KinkDetailItem } from "@/lib/contractPdf";

// The on-screen face of a contract section — moved whole from
// app/contract/page.tsx, no styling touched.
export default function ContractSection({ title, items, colour, nameA, nameB, colourA, colourB }: {
  title: string;
  items: ContractItem[];
  colour: string;
  nameA?: string;
  nameB?: string;
  colourA?: string;
  colourB?: string;
}) {
  if (!items.length) return null;
  const cA = colourA ?? "var(--accent)";
  const cB = colourB ?? "var(--accent2)";
  const nA = nameA?.split(" ")[0] ?? "A";
  const nB = nameB?.split(" ")[0] ?? "B";

  return (
    <div className="mb-5">
      <h3 className="text-sm mb-2" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontWeight: 400, color: colour }}>
        {title}
      </h3>
      {isKinkDetail(items[0]) ? (
        <div className="space-y-2">
          {(items as KinkDetailItem[]).map((item, i) => (
            <div key={i} className="rounded-xl p-2.5 text-sm" style={{
              background: `color-mix(in srgb, ${colour} 8%, transparent)`,
              border: `1px solid color-mix(in srgb, ${colour} 20%, transparent)`,
            }}>
              <div className="font-medium mb-1.5" style={{ color: "var(--text)" }}>{item.name}</div>
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  {item.statusA
                    ? <span className="text-xs px-1.5 py-0.5 rounded-full border whitespace-nowrap" style={{ color: cA, borderColor: `color-mix(in srgb, ${cA} 40%, transparent)`, background: `color-mix(in srgb, ${cA} 10%, transparent)` }}>{nA}: {STATUS_NL[item.statusA]}</span>
                    : <span style={{ color: "var(--text2)", fontSize: "11px" }}>{nA}: —</span>
                  }
                </div>
                <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${cA}, ${cB})`, opacity: 0.2 }} />
                <div className="flex flex-col gap-0.5 items-end">
                  {item.statusB
                    ? <span className="text-xs px-1.5 py-0.5 rounded-full border whitespace-nowrap" style={{ color: cB, borderColor: `color-mix(in srgb, ${cB} 40%, transparent)`, background: `color-mix(in srgb, ${cB} 10%, transparent)` }}>{STATUS_NL[item.statusB]}: {nB}</span>
                    : <span style={{ color: "var(--text2)", fontSize: "11px" }}>—: {nB}</span>
                  }
                </div>
              </div>
              {(item.desireA != null || item.desireB != null || item.commentA || item.commentB) && (
                <div className="mt-1.5 space-y-0.5" style={{ color: "var(--text2)" }}>
                  {item.desireA != null && <div className="text-xs"><span className="font-medium" style={{ color: cA }}>{nA} verlangen:</span> {item.desireA}/5</div>}
                  {item.desireB != null && <div className="text-xs"><span className="font-medium" style={{ color: cB }}>{nB} verlangen:</span> {item.desireB}/5</div>}
                  {item.commentA && <div><span className="font-medium" style={{ color: cA }}>{nA}:</span> {item.commentA}</div>}
                  {item.commentB && <div><span className="font-medium" style={{ color: cB }}>{nB}:</span> {item.commentB}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {(items as (string | { text: string; tag: string })[]).map((item, i) => (
            <span key={i} className="text-xs px-2.5 py-1 rounded-full" style={{
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
