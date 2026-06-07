export const metadata = {
  title: "Offline — KinkSync",
};

export default function OfflinePage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
      <span className="text-6xl" aria-hidden>
        📡
      </span>
      <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
        Je bent offline
      </h1>
      <p className="max-w-xs text-sm" style={{ color: "var(--text2)" }}>
        Geen verbinding op dit moment. Je opgeslagen profielen en contracten
        blijven veilig in dit toestel — zodra je weer online bent, gaat alles
        gewoon door.
      </p>
    </main>
  );
}
