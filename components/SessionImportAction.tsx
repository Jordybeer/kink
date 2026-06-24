"use client";

interface Props {
  status: null | "saved" | "exists";
  onImport: () => void;
}

export default function SessionImportAction({ status, onImport }: Props) {
  if (status) {
    return (
      <p className="text-sm text-center py-3 font-semibold" style={{ color: "var(--accent)" }}>
        {status === "saved" ? "✓ Profiel geïmporteerd" : "✓ Al opgeslagen"}
      </p>
    );
  }
  return (
    <button
      onClick={onImport}
      className="focus-ring w-full py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
      style={{ background: "var(--accent)", color: "var(--on-accent)" }}
    >
      Importeer dit profiel
    </button>
  );
}
