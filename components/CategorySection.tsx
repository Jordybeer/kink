"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CaretDown } from "@phosphor-icons/react";
import type { Kink, KinkCategoryId, KinkEntry } from "@/types";
import { kinkCategoryLabel } from "@/lib/kinkCategories";
import { useMotionSafe } from "@/lib/motion";
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
  const motionSafe = useMotionSafe();
  const filled = countFilled(kinks, entries);
  const [open, setOpen] = useState(() => openByDefault);
  const label = kinkCategoryLabel(category);
  const headingId = `category-${category}`;

  useEffect(() => {
    setOpen(openByDefault);
  }, [openByDefault]);

  function toggleOpen() {
    setOpen((value) => !value);
  }

  return (
    <motion.section
      aria-labelledby={headingId}
      layout={motionSafe.reduced ? false : "position"}
      transition={motionSafe.disclosure}
    >
      <button
        type="button"
        data-testid="profile-category-header"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-controls={`${headingId}-content`}
        className="focus-ring sticky z-[5] flex min-h-12 w-full items-center gap-3 border-b py-2.5 text-left transition-colors duration-150 motion-reduce:transition-none"
        style={{
          top: "var(--nav-h)",
          background: open
            ? "color-mix(in srgb, var(--accent) 5%, var(--bg))"
            : "color-mix(in srgb, var(--bg) 96%, var(--surface))",
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
          style={{ color: open
            ? "color-mix(in srgb, var(--accent) 22%, var(--text2))"
            : filled > 0 ? "var(--text)" : "var(--text2)" }}
        >
          {filled}/{kinks.length}
        </span>
        <motion.span
          className="flex h-8 w-8 flex-none items-center justify-center"
          style={{ color: open ? "color-mix(in srgb, var(--accent) 22%, var(--text2))" : "var(--text2)" }}
          animate={{ rotate: open ? 0 : -90 }}
          transition={motionSafe.state}
          aria-hidden="true"
        >
          <CaretDown size={16} />
        </motion.span>
      </button>

      <div id={`${headingId}-content`}>
        <AnimatePresence initial={false} mode="popLayout">
          {open && (
            <motion.div
              key="category-content"
              initial={motionSafe.reduced ? false : { y: -3 }}
              animate={{ y: 0 }}
              exit={motionSafe.reduced ? { y: 0 } : { y: -2 }}
              transition={motionSafe.state}
              className="overflow-hidden"
            >
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
