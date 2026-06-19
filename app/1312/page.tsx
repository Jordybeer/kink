"use client";
import TimerPill from "@/components/TimerPill";

export default function TimerPillTestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <TimerPill time="3:23" />
    </div>
  );
}
