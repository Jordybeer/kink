"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

const ROLES = ["Switch", "Dominant", "Submissive", "Top", "Bottom", "Rope top", "Rope bottom", "Sadist", "Masochist", "Other"];

export default function Home() {
  const router = useRouter();
  const { profiles, createProfile, deleteProfile, renameProfile, _hasHydrated } = useStore();
  const [name, setName] = useState("");
  const [role, setRole] = useState("Switch");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const id = createProfile(name.trim(), role);
    setName("");
    router.push(`/profile/${id}`);
  }

  function startEdit(p: { id: string; name: string; role: string }) {
    setEditId(p.id);
    setEditName(p.name);
    setEditRole(p.role);
  }

  function saveEdit() {
    if (!editId || !editName.trim()) return;
    renameProfile(editId, editName.trim(), editRole);
    setEditId(null);
  }

  if (!_hasHydrated) return null;

  const compareProfiles = profiles.slice(0, 2).map((p) => p.id);

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 w-full">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold" style={{ background: "linear-gradient(90deg, var(--accent), var(--accent2))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          KinkList
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Build kink lists, rate activities, add limits — share contracts without spreadsheets.
        </p>
      </div>

      {/* Create profile */}
      <form onSubmit={handleCreate} className="rounded-xl p-5 mb-8" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h2 className="font-semibold text-xs uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>New Profile</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name or handle…"
            className="flex-1 min-w-0 rounded-lg px-3 py-2 text-sm focus:outline-none placeholder-[color:var(--muted)]"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
          >
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            Create
          </button>
        </div>
      </form>

      {/* Profile list */}
      {profiles.length === 0 ? (
        <p className="text-center text-sm py-12" style={{ color: "var(--muted)" }}>
          No profiles yet — create one above to start your list.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3 mb-6">
            {profiles.map((p) => {
              const total = Object.values(p.entries).filter((e) => e.status).length;
              return (
                <div key={p.id} className="rounded-xl p-4 flex items-center gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  {editId === p.id ? (
                    <div className="flex flex-1 gap-2 flex-wrap">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 min-w-0 rounded px-2 py-1 text-sm focus:outline-none"
                        style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                      />
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="rounded px-2 py-1 text-sm"
                        style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                      >
                        {ROLES.map((r) => <option key={r}>{r}</option>)}
                      </select>
                      <button onClick={saveEdit} className="px-3 py-1 rounded text-sm font-medium" style={{ background: "var(--accent)", color: "#000" }}>Save</button>
                      <button onClick={() => setEditId(null)} className="px-3 py-1 rounded border text-sm" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold truncate">{p.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--surface2)", color: "var(--muted)", border: "1px solid var(--border)" }}>{p.role}</span>
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{total} items rated</div>
                      </div>
                      <Link
                        href={`/profile/${p.id}`}
                        className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                        style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                      >
                        Open
                      </Link>
                      <button onClick={() => startEdit(p)} title="Edit" className="p-1.5 rounded text-sm transition-colors" style={{ color: "var(--muted)" }}>✎</button>
                      {confirmDelete === p.id ? (
                        <>
                          <button onClick={() => deleteProfile(p.id)} className="text-xs px-2 py-1 rounded" style={{ background: "#450a0a", border: "1px solid #7f1d1d", color: "#fca5a5" }}>Delete</button>
                          <button onClick={() => setConfirmDelete(null)} className="text-xs px-2 py-1 rounded border text-sm" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDelete(p.id)} title="Delete" className="p-1.5 rounded text-sm transition-colors" style={{ color: "var(--muted)" }}>🗑</button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {profiles.length >= 2 && (
            <div className="text-center">
              <Link
                href={`/compare?a=${compareProfiles[0]}&b=${compareProfiles[1]}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ border: "1px solid var(--accent)", color: "var(--accent)" }}
              >
                ⚖ Compare two profiles
              </Link>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Side-by-side view for contract negotiation</p>
            </div>
          )}
        </>
      )}
    </main>
  );
}
