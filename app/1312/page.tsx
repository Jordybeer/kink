"use client";
import { useState } from "react";

import SafewordRibbon from "@/components/SafewordRibbon";
import Accordion      from "@/components/ui/Accordion";
import ContextMenu    from "@/components/ui/ContextMenu";
import FAB            from "@/components/ui/FAB";
import SegmentedPill  from "@/components/ui/SegmentedPill";
import Sheet, { SheetOptionItem } from "@/components/ui/Sheet";
import SwipeRow       from "@/components/ui/SwipeRow";
import TabBar         from "@/components/ui/TabBar";
import { useSheet }   from "@/lib/useSheet";

/* ── Icons ── */
const Icon = ({ d, size = 18 }: { d: string | string[]; size?: number }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    {(Array.isArray(d) ? d : [d]).map((path, i) => <path key={i} d={path} />)}
  </svg>
);

const PencilIcon   = () => <Icon d={["M12 20h9","M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"]} />;
const TrashIcon    = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
const ShieldIcon   = () => <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const LinkIcon     = () => <Icon d={["M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71","M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"]} />;
const LockIcon     = () => <Icon d={["M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"]} />;
const SyncIcon     = () => <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const PlusIcon     = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const QRIcon       = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/></svg>;
const UserPlusIcon = () => <Icon d={["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2","M19 8v6","M22 11h-6"]} />;
const ZapIcon      = () => <Icon d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />;
const ClapIcon     = () => <Icon d={["M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1-.3 2.1.3 2.4 1.3L20.2 6zM4 11h16v11H4V11z","M12 11v4"]} />;
const AnchorIcon   = () => <Icon d={["M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8z","M3.27 12C5 17.16 8.38 21 12 21c3.62 0 7-3.84 8.73-9","M12 8v13"]} />;
const UserIcon     = () => <Icon d={["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2","M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"]} />;
const DotsIcon     = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/><circle cx="5" cy="12" r="1.2"/></svg>;
const ChevronIcon  = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>;

/* ── Mock data ── */
const KINK_CATEGORIES = [
  {
    name: "Impact Play",
    icon: <ShieldIcon />,
    kinks: [
      { id: "1", name: "Spanking",     status: "yes",          statusColor: "var(--yes)" },
      { id: "2", name: "Flogger",      status: "willing",      statusColor: "var(--willing)" },
      { id: "3", name: "Paddel",       status: "maybe",        statusColor: "var(--maybe)" },
    ],
  },
  {
    name: "Bondage",
    icon: <LinkIcon />,
    kinks: [
      { id: "4", name: "Touwbinding",  status: "yes",          statusColor: "var(--yes)" },
      { id: "5", name: "Handboeien",   status: "maybe",        statusColor: "var(--maybe)" },
    ],
  },
] as const;

const ALL_KINKS = [
  { id: "1", name: "Spanking",    status: "yes",     statusColor: "var(--yes)" },
  { id: "2", name: "Flogger",     status: "willing", statusColor: "var(--willing)" },
  { id: "3", name: "Paddel",      status: "maybe",   statusColor: "var(--maybe)" },
  { id: "4", name: "Touwbinding", status: "yes",     statusColor: "var(--yes)" },
  { id: "5", name: "Handboeien",  status: "maybe",   statusColor: "var(--maybe)" },
];

const STATUS_LABELS: Record<string, string> = {
  yes:     "Heel graag",
  willing: "Ja",
  maybe:   "Misschien",
  no:      "Voor hen",
  hard_no: "Harde grens",
};

const SWIPE_ACTIONS = [
  { label: "Bewerken", icon: <PencilIcon />, color: "var(--surface2)", textColor: "var(--text)" },
  { label: "Verwijder", icon: <TrashIcon />, color: "var(--hard-no)",  textColor: "white" },
];

const TAB_ITEMS = [
  { value: "compare",  label: "Vergelijk", icon: <ZapIcon /> },
  { value: "scenes",   label: "Scènes",    icon: <ClapIcon /> },
  { value: "session",  label: "Live",      icon: <AnchorIcon /> },
  { value: "profile",  label: "Profiel",   icon: <UserIcon /> },
];

const FAB_ITEMS = [
  { label: "Nieuwe scène",  icon: <ClapIcon />,   onClick: () => {} },
  { label: "Scan QR",       icon: <QRIcon />,     onClick: () => {} },
  { label: "Nieuw profiel", icon: <UserPlusIcon />, onClick: () => {} },
];

/* ── Page ── */
const INFO_ICON   = () => <Icon d={["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z","M12 8h.01","M12 12v4"]} />;

export default function UILabPage() {
  const [tab, setTab]       = useState("kinks");
  const [navTab, setNavTab] = useState("scenes");
  const [ctxOpen, setCtxOpen] = useState(false);
  const privacy = useSheet();
  const [privacyValue, setPrivacyValue] = useState("local");
  const kinkSheet = useSheet();
  const [activeKink, setActiveKink] = useState<{ name: string; statusColor: string; status: string } | null>(null);

  function openKinkSheet(kink: { name: string; statusColor: string; status: string }) {
    setActiveKink(kink);
    kinkSheet.onOpen();
  }

  return (
    <div className="relative z-[1] min-h-screen pb-44" style={{ background: "var(--bg)" }}>

      {/* 0 — Safeword ribbon */}
      <SafewordRibbon safeword="Rood" />

      <div className="max-w-lg mx-auto px-4 pt-5 flex flex-col gap-6">

        {/* Label */}
        <div>
          <p className="text-[11px] font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--text2)" }}>UI Lab · 1312</p>
          <h1 className="text-2xl font-bold tracking-tight">Component draft</h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--text2)" }}>Alle 7 nieuwe componenten in projectcontext.</p>
        </div>

        {/* 1 — SegmentedPill */}
        <section className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text2)" }}>1 · Segmented Pill</span>
          <SegmentedPill
            segments={[
              { value: "kinks",   label: "Kinks" },
              { value: "scènes",  label: "Scènes" },
              { value: "profiel", label: "Profiel" },
            ]}
            value={tab}
            onChange={setTab}
          />
        </section>

        {/* 2 + 3 — Accordion + SwipeRow */}
        <section className="flex flex-col gap-3">
          <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text2)" }}>2 · Accordion &nbsp;&nbsp; 3 · Swipe Row</span>
          {KINK_CATEGORIES.map((cat) => (
            <Accordion key={cat.name} trigger={cat.name} icon={cat.icon} defaultOpen={cat.name === "Impact Play"}>
              <div className="flex flex-col gap-2">
                {cat.kinks.map((kink) => (
                  <SwipeRow key={kink.id} actions={SWIPE_ACTIONS}>
                    <div className="flex items-center justify-between px-4 py-3" style={{ borderLeft: `3px solid ${kink.statusColor}` }}>
                      <div>
                        <p className="text-[14px] font-semibold">{kink.name}</p>
                        <p className="text-[12px] mt-0.5" style={{ color: kink.statusColor }}>{STATUS_LABELS[kink.status]}</p>
                      </div>
                      <span style={{ color: "var(--text2)" }}><ChevronIcon /></span>
                    </div>
                  </SwipeRow>
                ))}
              </div>
            </Accordion>
          ))}
        </section>

        {/* 4 — Context Menu */}
        <section className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text2)" }}>4 · Context Menu</span>
          <div
            className="rounded-[20px] px-5 py-4 flex items-center justify-between"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div>
              <p className="text-[15px] font-semibold">Avondscène #3</p>
              <p className="text-[12px] mt-0.5" style={{ color: "var(--text2)" }}>Gepland · 4 items · safeword: Rood</p>
            </div>
            <ContextMenu
              open={ctxOpen}
              onClose={() => setCtxOpen(false)}
              items={[
                { label: "Bewerken",   icon: <PencilIcon />, onClick: () => {} },
                { label: "Dupliceer",  icon: <PlusIcon /> },
                { label: "Verwijder",  icon: <TrashIcon />, danger: true, onClick: () => {} },
              ]}
            >
              <button
                onClick={() => setCtxOpen((v) => !v)}
                className="p-2 rounded-full flex items-center justify-center active:scale-[0.97] transition-transform"
                style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "var(--text2)" }}
                aria-label="Meer opties"
              >
                <DotsIcon />
              </button>
            </ContextMenu>
          </div>
        </section>

        {/* 5 — Sheet trigger */}
        <section className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text2)" }}>5 · Action Sheet</span>
          <button
            onClick={privacy.onOpen}
            className="w-full flex items-center justify-between px-5 py-4 rounded-[20px] active:scale-[0.97] transition-transform"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="text-left">
              <p className="text-[11px] font-medium mb-1" style={{ color: "var(--text2)" }}>Privacy niveau</p>
              <p className="text-[15px] font-semibold">{privacyValue === "local" ? "Alleen lokaal" : "Versleuteld"}</p>
            </div>
            <span
              className="p-2 rounded-full"
              style={{ background: "var(--surface2)", color: "var(--text2)" }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>
            </span>
          </button>
        </section>

        {/* 6 — TabBar preview */}
        <section className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text2)" }}>6 · Tab Bar (preview)</span>
          <TabBar
            tabs={TAB_ITEMS}
            value={navTab}
            onChange={setNavTab}
          />
        </section>

        {/* 7 — FAB note */}
        <section className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text2)" }}>7 · FAB Speed Dial</span>
          <p className="text-[13px]" style={{ color: "var(--text2)" }}>Zie rechtsonder → paarse knop.</p>
        </section>

        {/* 8 — Kink row → Action Sheet */}
        <section className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text2)" }}>8 · Kink Row Action Sheet</span>
          <p className="text-[12px] mb-1" style={{ color: "var(--text2)" }}>Tik op een kink → sheet opent, achtergrond dimt.</p>
          <div className="flex flex-col gap-2">
            {ALL_KINKS.map((kink) => (
              <button
                key={kink.id}
                onClick={() => openKinkSheet(kink)}
                className="w-full text-left rounded-xl flex items-center justify-between px-4 py-3 active:scale-[0.98] transition-transform"
                style={{
                  background: "var(--surface)",
                  borderTop: "1px solid var(--border)",
                  borderRight: "1px solid var(--border)",
                  borderBottom: "1px solid var(--border)",
                  borderLeft: `4px solid ${kink.statusColor}`,
                }}
              >
                <div>
                  <p className="text-[14px] font-semibold">{kink.name}</p>
                  <p className="text-[12px] mt-0.5" style={{ color: kink.statusColor }}>{STATUS_LABELS[kink.status]}</p>
                </div>
                <span style={{ color: "var(--text2)" }}><ChevronIcon /></span>
              </button>
            ))}
          </div>
        </section>

      </div>

      {/* FAB — fixed */}
      <div className="fixed bottom-24 right-4 z-40">
        <FAB items={FAB_ITEMS} aria-label="Acties" />
      </div>

      {/* TabBar — fixed */}
      <div className="fixed bottom-4 left-4 right-4 z-50 max-w-lg mx-auto" style={{ left: "50%", transform: "translateX(-50%)", width: "calc(100% - 2rem)", maxWidth: "32rem" }}>
        <TabBar
          tabs={TAB_ITEMS}
          value={navTab}
          onChange={setNavTab}
        />
      </div>

      {/* Sheet — kink actions */}
      <Sheet open={kinkSheet.open} onClose={kinkSheet.onClose} title={activeKink?.name ?? ""} aria-label="Kink acties">
        <SheetOptionItem
          value="info"
          label="Meer info"
          description="Beschrijving en uitleg over deze kink"
          icon={<INFO_ICON />}
          active={false}
          onClick={kinkSheet.onClose}
        />
        <SheetOptionItem
          value="edit"
          label="Bewerken"
          description="Status of richting aanpassen"
          icon={<PencilIcon />}
          active={false}
          onClick={kinkSheet.onClose}
        />
        <SheetOptionItem
          value="delete"
          label="Verwijder kink"
          description="Verwijder uit jouw lijst"
          icon={<TrashIcon />}
          active={false}
          onClick={kinkSheet.onClose}
        />
      </Sheet>

      {/* Sheet — privacy */}
      <Sheet open={privacy.open} onClose={privacy.onClose} title="Privacy niveau" aria-label="Privacy niveau kiezen">
        <SheetOptionItem
          value="local"
          label="Alleen lokaal"
          description="Data verlaat dit apparaat nooit"
          icon={<LockIcon />}
          active={privacyValue === "local"}
          onClick={() => { setPrivacyValue("local"); privacy.onClose(); }}
        />
        <SheetOptionItem
          value="sync"
          label="Versleuteld"
          description="E2E gesynchroniseerd op je apparaten"
          icon={<SyncIcon />}
          active={privacyValue === "sync"}
          onClick={() => { setPrivacyValue("sync"); privacy.onClose(); }}
        />
      </Sheet>
    </div>
  );
}
