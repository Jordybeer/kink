"use client";
import { useState } from "react";
import { Drawer } from "vaul";
import { CaretUpDown, Check } from "@phosphor-icons/react";
import { ROLE_GROUPS } from "@/lib/roles";

interface Props {
  value: string;
  onChange: (role: string) => void;
}

// The wardrobe drawer — 24 roles used to stand in the room as a wall of
// chips; now they wait in a bottom drawer (vaul) until summoned. One field
// in the form, one pull to browse, one tap to choose.
export default function RolePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <button
          type="button"
          className="focus-ring w-full flex items-center justify-between gap-3 rounded-lg px-3 min-h-11 text-left transition-colors"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
        >
          {value ? (
            <span
              className="text-base italic truncate"
              style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500, color: "var(--text)" }}
            >
              {value}
            </span>
          ) : (
            <span className="text-sm" style={{ color: "var(--text2)" }}>Kies een rol…</span>
          )}
          <CaretUpDown size={15} aria-hidden="true" className="flex-none" style={{ color: "var(--text2)" }} />
        </button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[150]" style={{ background: "rgba(0,0,0,0.55)" }} />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-[151] flex flex-col rounded-t-2xl outline-none"
          style={{
            background: "var(--surface)",
            borderTop: "1px solid var(--border)",
            maxHeight: "85dvh",
          }}
        >
          {/* Grabber */}
          <div aria-hidden="true" className="mx-auto mt-3 mb-1 h-1 w-10 rounded-full" style={{ background: "var(--border)" }} />
          <div className="flex items-baseline justify-between px-5 pt-2 pb-3">
            <Drawer.Title
              className="text-lg italic"
              style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500, color: "var(--text)" }}
            >
              Kies een rol
            </Drawer.Title>
            {value && (
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className="focus-ring text-xs rounded"
                style={{ color: "var(--text2)" }}
              >
                Wis keuze
              </button>
            )}
          </div>
          <div className="overflow-y-auto px-3 pb-8">
            {ROLE_GROUPS.map((g) => (
              <div key={g.label} className="mb-2">
                <p className="text-xs uppercase tracking-widest px-2 mb-1 opacity-60" style={{ color: "var(--text2)" }}>
                  {g.label}
                </p>
                <div role="group" aria-label={g.label} className="flex flex-col">
                  {g.roles.map((r) => {
                    const active = value === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => { onChange(r); setOpen(false); }}
                        aria-pressed={active}
                        className="focus-ring flex items-center justify-between gap-3 rounded-lg px-2 min-h-11 text-left transition-colors"
                        style={active
                          ? { color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 8%, transparent)" }
                          : { color: "var(--text)" }}
                      >
                        <span className="text-sm">{r}</span>
                        {active && <Check size={15} aria-hidden="true" className="flex-none" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
