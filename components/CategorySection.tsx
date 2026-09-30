"use client";
import { useEffect, useState } from "react";
import { CaretDown, CaretRight, ListBullets } from "@phosphor-icons/react";
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
  onChooseCategory,
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
    <section className="mb-2.5" aria-labelledby={headingId}>
      <div
        data-testid="profile-category-header"
        className="sticky z-[5] flex items-center rounded-2xl transition-colors"
        style={{
          top: "var(--nav-h)",
          background: "color-mix(in srgb, var(--surface2) 92%, var(--surface))",
          border: open
            ? "1px solid color-mix(in srgb, var(--accent) 30%, var(--border))"
            : "1px solid var(--border)",
          boxShadow: open ? "0 8px 24px color-mix(in srgb, var(--bg) 22%, transparent)" : undefined,
        }}
      >
        <button
          type="button"
          onClick={toggleOpen}
          aria-expanded={open}
          aria-controls={`${headingId}-content`}
          className="focus-ring flex min-h-12 min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-left"
        >
          <span className="flex-none" style={{ color: open ? "var(--accent)" : "var(--text2)" }}>
            {open ? <CaretDown aria-hidden="true" size={16} /> : <CaretRight aria-hidden="true" size={16} />}
          </span>
          <h2
            id={headingId}
            className="flex-1 truncate text-left text-base"
            style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500, color: "var(--text)" }}
          >
            {label}
          </h2>
          <span
            className="flex-none text-xs tabular-nums"
            aria-label={`${filled} van ${kinks.length} beoordeeld`}
            style={{ color: filled > 0 ? "var(--text)" : "var(--text2)" }}
          >
            {filled}/{kinks.length}
          </span>
        </button>
        {onChooseCategory && (
          <button
            type="button"
            onClick={onChooseCategory}
            aria-label={`Andere categorie kiezen; nu ${label}`}
            className="focus-ring mr-1 flex h-11 w-11 flex-none items-center justify-center rounded-xl"
            style={{ color: "var(--text2)" }}
          >
            <ListBullets size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      <div
        id={`${headingId}-content`}
        className={`accordion-content ${open ? "open" : ""}`}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="accordion-inner">
          {hasOpened && (
            <div className="mt-1.5 flex flex-col px-0.5">
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
