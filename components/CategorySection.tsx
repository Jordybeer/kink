"use client";
import { useEffect, useState } from "react";
import { CaretDown, CaretRight } from "@phosphor-icons/react";
import type { Kink, KinkCategoryId, KinkEntry } from "@/types";
import { kinkCategoryLabel } from "@/lib/kinkCategories";
import KinkListRow from "./KinkListRow";

interface Props {
  category: KinkCategoryId;
  kinks: Kink[];
  entries: Record<string, KinkEntry>;
  onEdit: (kink: Kink) => void;
  onChooseCategory?: () => void;
  openByDefault?: boolean;
}

function countFilled(kinks: Kink[], entries: Record<string, KinkEntry>) {
  return kinks.filter((k) => entries[k.id]?.status != null).length;
}

export default function CategorySection({
  category,
  kinks,
  entries,
  onEdit,
  openByDefault = false,
}: Props) {
  const filled = countFilled(kinks, entries);
  const [open, setOpen] = useState(() => openByDefault);
  const [hasOpened, setHasOpened] = useState(() => openByDefault);
  const label = kinkCategoryLabel(category);
  const headingId = `category-${category}`;

  useEffect(() => {
    setOpen(openByDefault);
    if (openByDefault) setHasOpened(true);
  }, [openByDefault]);

  function toggleOpen() {
    setOpen((value) => {
      const next = !value;
      if (next) setHasOpened(true);
      return next;
    });
  }

  return (
    <section
      className="border-b"
      aria-labelledby={headingId}
      style={{ borderColor: "var(--border)" }}
    >
      <button
        type="button"
        data-testid="profile-category-header"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-controls={`${headingId}-content`}
        className="focus-ring flex min-h-[54px] w-full min-w-0 items-center gap-2.5 px-1 py-2.5 text-left transition-colors"
        style={{ background: open ? "color-mix(in srgb, var(--accent) 3%, transparent)" : "transparent" }}
      >
        <span className="flex-none" style={{ color: open ? "var(--accent-text)" : "var(--text2)" }}>
          {open ? <CaretDown aria-hidden="true" size={15} /> : <CaretRight aria-hidden="true" size={15} />}
        </span>
        <h2
          id={headingId}
          className="min-w-0 flex-1 text-sm font-semibold leading-5"
          style={{ color: "var(--text)" }}
        >
          {label}
        </h2>
        <span
          className="flex-none text-sm tabular-nums"
          aria-label={`${filled} van ${kinks.length} beoordeeld`}
          style={{ color: filled > 0 ? "var(--text)" : "var(--text2)" }}
        >
          {filled}/{kinks.length}
        </span>
      </button>

      <div
        id={`${headingId}-content`}
        className={`accordion-content ${open ? "open" : ""}`}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="accordion-inner">
          {hasOpened && (
            <div className="pb-1">
              {kinks.map((kink) => (
                <KinkListRow
                  key={kink.id}
                  kink={kink}
                  entry={entries[kink.id] ?? { status: null, comment: "" }}
                  onOpen={() => onEdit(kink)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}