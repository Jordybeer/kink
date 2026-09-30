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
  openByDefault?: boolean;
}

function countFilled(kinks: Kink[], entries: Record<string, KinkEntry>) {
  return kinks.filter((kink) => entries[kink.id]?.status != null).length;
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
    <section aria-labelledby={headingId}>
      <button
        type="button"
        data-testid="profile-category-header"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-controls={`${headingId}-content`}
        className="focus-ring sticky z-[5] flex min-h-12 w-full items-center gap-3 border-b py-2.5 text-left"
        style={{
          top: "var(--nav-h)",
          background: "color-mix(in srgb, var(--bg) 96%, var(--surface))",
          borderColor: "color-mix(in srgb, var(--border) 76%, transparent)",
        }}
      >
        <span className="min-w-0 flex-1">
          <h2 id={headingId} className="truncate text-base font-semibold leading-6">
            {label}
          </h2>
        </span>
        <span
          className="flex-none text-xs tabular-nums"
          aria-label={`${filled} van ${kinks.length} beoordeeld`}
          style={{ color: filled > 0 ? "var(--text)" : "var(--text2)" }}
        >
          {filled}/{kinks.length}
        </span>
        <span className="flex h-8 w-8 flex-none items-center justify-center" style={{ color: "var(--text2)" }}>
          {open
            ? <CaretDown aria-hidden="true" size={16} />
            : <CaretRight aria-hidden="true" size={16} />}
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
            <div className="flex flex-col">
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
