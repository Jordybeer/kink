"use client";
import type { Ref } from "react";
import { CaretDown, CircleDashed, Star } from "@phosphor-icons/react";
import type { Kink, KinkEntry } from "@/types";
import { STATUS_LABEL, STATUS_VAR } from "@/lib/statusLabels";
import StatusGlyph from "./StatusGlyph";

interface Props {
  kink: Kink;
  entry: KinkEntry;
  onOpen: () => void;
  editable?: boolean;
  concealed?: boolean;
  expanded?: boolean;
  controls?: string;
  triggerRef?: Ref<HTMLButtonElement>;
  categoryLabel?: string;
}

export default function KinkListRow({ kink, entry, onOpen, editable = true, concealed = false, expanded, controls, triggerRef, categoryLabel }: Props) {
  const status = concealed ? null : entry.status;
  const tags = concealed ? [] : entry.tags ?? [];
  const tagSpeech = tags.map((tag) => tag === "vraag eerst" ? "Eerst vragen"
    : tag === "eerste keer" ? "Eerste keer" : tag).join(" · ");
  const content = <>
    <span data-answer-subject={categoryLabel ? "" : undefined} className="col-start-1 row-start-1 min-w-0 flex-1">
      <span className="flex min-w-0 items-start gap-1.5">
        <span data-answer-title={categoryLabel ? "" : undefined} className="text-base font-medium leading-6 [overflow-wrap:anywhere]">{kink.name}</span>
        {!concealed && entry.curious && <Star size={12} weight="fill" aria-label="Nieuwsgierig" className="mt-1 flex-none" style={{ color: "var(--curious)" }} />}
      </span>
      {categoryLabel && <span className="mt-0.5 block text-xs leading-4" style={{ color: "var(--text2)" }}>{categoryLabel}</span>}
      {tagSpeech && <span className="mt-1 block text-xs leading-5" style={{ color: "var(--text2)" }}>{tagSpeech}</span>}
      {!concealed && entry.comment && <span className="mt-1 block text-sm font-normal leading-5 [overflow-wrap:anywhere]" style={{ color: "var(--text2)" }}>{entry.comment}</span>}
    </span>
    <span data-testid="kink-status-label" data-answer-verdict={categoryLabel ? status ?? "unrated" : undefined} className="col-start-1 row-start-2 flex min-h-5 min-w-0 items-center gap-1.5 min-[480px]:w-[7rem] min-[480px]:flex-none text-sm font-semibold leading-5" style={{ color: status ? STATUS_VAR[status] : "var(--text2)" }}>
      {status ? <><StatusGlyph status={status} size={categoryLabel ? 16 : undefined} /><span>{STATUS_LABEL[status]}</span></>
        : <>{categoryLabel && !concealed && <CircleDashed aria-hidden="true" size={16} className="flex-none" />}<span>{concealed ? "Privé" : categoryLabel ? "Onbeoordeeld" : "Beoordeel"}</span></>}
    </span>
    {editable && <CaretDown size={14} aria-hidden="true" data-answer-caret={categoryLabel ? "" : undefined} className="col-start-2 row-start-1 row-span-2 self-center flex-none ks-motion-state" style={{ color: "var(--text2)", transform: expanded ? "rotate(180deg)" : undefined }} />}
  </>;
  const className = "min-h-[58px] w-full min-w-0 gap-x-3 gap-y-1 border-b py-3 text-left [overflow-wrap:anywhere] grid grid-cols-[minmax(0,1fr)_auto] min-[480px]:flex min-[480px]:items-center";
  const style = { borderColor: "color-mix(in srgb, var(--border) 68%, transparent)" };
  return editable ? <button type="button" data-answer-summary={categoryLabel ? "" : undefined} ref={triggerRef} onClick={onOpen} aria-expanded={expanded} aria-controls={controls}
    aria-label={`${kink.name}, ${status ? STATUS_LABEL[status] : "nog niet beoordeeld"}${tagSpeech ? `, ${tagSpeech}` : ""}, bewerken`}
    className={`ks-motion-choice focus-ring ${className} hover:bg-[var(--surface2)] active:bg-[var(--surface2)]`} style={style}>{content}</button>
    : <div data-answer-summary={categoryLabel ? "" : undefined} className={className} style={style}>{content}</div>;
}
