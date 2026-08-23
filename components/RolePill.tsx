import { categorizeRole } from "@/lib/roles";

const BASE = "text-sm px-2 py-0.5 rounded-full border whitespace-nowrap";

export default function RolePill({ role }: { role?: string }) {
  const dir = categorizeRole(role ?? "");

  if (!role || dir === "none") {
    return (
      <span
        className={BASE}
        style={{ background: "var(--surface2)", color: "var(--text2)", borderColor: "var(--border)" }}
      >
        D/s dynamiek
      </span>
    );
  }

  return (
    <>
      {(dir === "give" || dir === "both") && (
        <span
          className={BASE}
          style={{
            background: "color-mix(in srgb, var(--accent) 15%, transparent)",
            color: "var(--accent)",
            borderColor: "var(--accent)",
          }}
        >
          geven
        </span>
      )}
      {(dir === "receive" || dir === "both") && (
        <span
          className={BASE}
          style={{
            background: "color-mix(in srgb, var(--accent2, var(--accent)) 15%, transparent)",
            color: "var(--accent2, var(--accent))",
            borderColor: "var(--accent2, var(--accent))",
          }}
        >
          ontvangen
        </span>
      )}
    </>
  );
}
