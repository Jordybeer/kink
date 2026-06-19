"use client";

export default function TimerPill({ time }: { time: string }) {
  return (
    <div className="relative inline-flex rounded-full bg-black p-[8px] shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
      <div
        className="
          relative overflow-hidden rounded-full
          px-7 py-3
          text-white font-semibold text-4xl tracking-tight
          bg-[linear-gradient(180deg,#3b16ff_0%,#2b0fcb_45%,#1b068f_100%)]
        "
      >
        {/* soft purple bloom */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(124,58,237,0.45),transparent_58%)]" />
        {/* darker edge / vignette */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_45%,rgba(0,0,0,0.28)_100%)]" />
        {/* bottom darkening */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,transparent_35%,rgba(0,0,0,0.24)_100%)]" />
        <span className="relative z-10">{time}</span>
      </div>
    </div>
  );
}
