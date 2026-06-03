'use client';

import { useState, useCallback } from 'react';
import { useStore } from '@/lib/store';

interface OnboardingProps {
  onComplete: () => void;
}

const BTN_BASE: React.CSSProperties = {
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.3)',
  background: 'transparent',
  padding: '0.75rem 2rem',
  borderRadius: '9999px',
  fontSize: '1rem',
  cursor: 'pointer',
  transition: 'border-color 150ms ease',
};

const ICON_CIRCLE: React.CSSProperties = {
  width: '5rem', height: '5rem', borderRadius: '9999px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(192,132,252,0.08)', border: '1px solid rgba(192,132,252,0.2)',
  marginBottom: '2rem',
  animation: 'ks-icon-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
};

const TITLE: React.CSSProperties = {
  fontSize: '1.5rem', fontWeight: 600, color: '#fff', marginBottom: '1rem',
  animation: 'ks-slide-up 0.4s ease 0.1s both', opacity: 0,
};

const BODY: React.CSSProperties = {
  fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: '2.5rem',
  animation: 'ks-slide-up 0.4s ease 0.2s both', opacity: 0,
};

const NEXT_BTN: React.CSSProperties = {
  ...BTN_BASE,
  animation: 'ks-slide-up 0.4s ease 0.3s both', opacity: 0,
};

function NextButton({ onClick, label = 'Volgende →' }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} style={NEXT_BTN}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.7)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.3)'; }}>
      {label}
    </button>
  );
}

// Total content steps: 1–6 (step 0 is the splash, step 5 is theme, step 6 is the age gate)
const TOTAL_STEPS = 6;

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [lockout, setLockout] = useState(false);

  const advance = useCallback(() => {
    setLeaving(true);
    setTimeout(() => {
      setStep(s => s + 1);
      setLeaving(false);
    }, 220);
  }, []);

  return (
    <>
      <style>{`
        @keyframes ks-fade-in  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ks-slide-up { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ks-slide-out { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(-32px); } }
        @keyframes ks-slide-in  { from { opacity: 0; transform: translateX(32px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes ks-icon-pop  { 0% { opacity:0; transform:scale(0.6) translateY(12px); } 100% { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes ks-pulse     { 0%,100% { box-shadow:0 0 0 0 rgba(255,255,255,0.2); } 50% { box-shadow:0 0 0 8px rgba(255,255,255,0); } }
        .ks-slide-out { animation: ks-slide-out 220ms ease forwards; }
        .ks-slide-in  { animation: ks-slide-in  220ms ease forwards; }
        @media (prefers-reduced-motion: reduce) {
          .ks-slide-out, .ks-slide-in { animation: none; }
        }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'var(--bg)', transition: 'background 200ms ease', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
        role="dialog" aria-modal="true" aria-label="Welkom bij KinkSync">

        {lockout ? (
          <div style={{ position: 'fixed', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', textAlign: 'center', padding: '0 2rem' }}>
            <div style={{ fontSize: '2.25rem', marginBottom: '1.5rem' }} aria-hidden="true">🖤</div>
            <p style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', marginBottom: '0.75rem' }}>Kom terug als je 18 bent.</p>
            <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.3)' }}>KinkSync is alleen voor volwassenen.</p>
          </div>
        ) : (
          <>
            <div key={step} className={leaving ? 'ks-slide-out' : 'ks-slide-in'}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 1.5rem' }}>
              {step === 0 && <Step0 onNext={advance} onSkip={onComplete} />}
              {step === 1 && <Step1 onNext={advance} />}
              {step === 2 && <Step2 onNext={advance} />}
              {step === 3 && <Step3 onNext={advance} />}
              {step === 4 && <Step4 onNext={advance} />}
              {step === 5 && <Step5 onNext={advance} />}
              {step === 6 && <Step6 onComplete={onComplete} onLockout={() => setLockout(true)} />}
            </div>

            <div style={{ position: 'fixed', bottom: '2rem', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '0.5rem' }} aria-hidden="true">
              {Array.from({ length: TOTAL_STEPS + 1 }, (_, i) => i).map(i => (
                <div key={i} style={{
                  height: 4,
                  width: i === step ? 24 : 8,
                  borderRadius: 999,
                  background: i === step ? '#c084fc' : 'rgba(255,255,255,0.2)',
                  transition: 'width 300ms cubic-bezier(0.34,1.56,0.64,1), background 200ms ease',
                }} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ── Step 0 — Welkom ──────────────────────────────────────────────────────── */

function Step0({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h1 style={{ color: '#fff', fontSize: '2.25rem', fontWeight: 700, letterSpacing: '0.08em', margin: 0, animation: 'ks-fade-in 1s ease forwards', opacity: 0 }}>
        KinkSync
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem', animation: 'ks-fade-in 1s ease 0.5s forwards', opacity: 0 }}>
        Verken grenzen. Samen.
      </p>
      <div style={{ height: '3rem' }} />
      <button onClick={onNext}
        style={{ ...BTN_BASE, animation: 'ks-fade-in 0.8s ease 1.2s forwards, ks-pulse 2s ease 2s infinite', opacity: 0 }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.7)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.3)'; }}
        aria-label="Begin de introductie">
        Begin
      </button>
      <button onClick={onSkip}
        style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem', cursor: 'pointer', padding: '0.75rem 1rem' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)'; }}
        aria-label="Sla de introductie over">
        Sla over
      </button>
    </div>
  );
}

/* ── Step 1 — Privacy (uitgebreid) ───────────────────────────────────────── */

function Step1({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ maxWidth: '22rem', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={ICON_CIRCLE} aria-hidden="true">
        <span style={{ fontSize: '2.25rem' }}>🔒</span>
      </div>
      <h2 style={TITLE}>Jouw data verlaat dit apparaat nooit</h2>
      <div style={{ ...BODY, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ background: 'rgba(192,132,252,0.06)', border: '1px solid rgba(192,132,252,0.12)', borderRadius: '0.75rem', padding: '0.75rem 1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '0.25rem' }}>De app</div>
          Geen account, geen server, geen tracking. Alles staat in je browser en nergens anders.
        </div>
        <div style={{ background: 'rgba(192,132,252,0.06)', border: '1px solid rgba(192,132,252,0.12)', borderRadius: '0.75rem', padding: '0.75rem 1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '0.25rem' }}>Live sessie</div>
          End-to-end versleuteld — ook wij kunnen niet meelezen. De verbinding loopt eerst via onze server, daarna gaat alles direct tussen jullie twee. Je kinks en naam verlaten je toestel nooit.
        </div>
      </div>
      <NextButton onClick={onNext} />
    </div>
  );
}

/* ── Step 2 — Back-up (nieuw) ─────────────────────────────────────────────── */

function Step2({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ maxWidth: '22rem', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={ICON_CIRCLE} aria-hidden="true">
        <span style={{ fontSize: '2.25rem' }}>💾</span>
      </div>
      <h2 style={TITLE}>Jij bent je eigen cloud</h2>
      <p style={{ ...BODY, textAlign: 'center' }}>
        Geen automatische sync — jij bewaart je data.<br />
        Exporteer je profiel via <strong style={{ color: 'rgba(255,255,255,0.7)' }}>⚙ Instellingen</strong> en bewaar het bestand veilig.
      </p>
      <NextButton onClick={onNext} />
    </div>
  );
}

/* ── Step 3 — Profiel & kinks (nieuw) ────────────────────────────────────── */

const FEATURE_ROWS: { icon: string; title: string; sub: string }[] = [
  { icon: '👤', title: 'Profiel',        sub: 'Foto, rol, FetLife-link — allemaal optioneel' },
  { icon: '🏷',  title: 'Kinks',          sub: 'Ja / graag / misschien / nee / harde grens' },
  { icon: '⚡',  title: 'Vergelijken',    sub: 'Zie direct waar jullie overlap zit' },
  { icon: '📡',  title: 'Live sessie',    sub: 'End-to-end versleuteld — vergelijk live op afstand' },
  { icon: '🎬',  title: 'Scène planner', sub: 'Plan elke scène tot in detail' },
  { icon: '✍',  title: 'Contract',       sub: 'Safeword, aftercare, handtekening → PDF' },
];

function Step3({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ maxWidth: '26rem', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff', marginBottom: '1.5rem', animation: 'ks-slide-up 0.4s ease 0.05s both', opacity: 0 }}>
        Wat kun je doen?
      </h2>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '2.5rem' }}>
        {FEATURE_ROWS.map((f, i) => (
          <div key={f.title}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.875rem',
              background: 'rgba(192,132,252,0.06)', border: '1px solid rgba(192,132,252,0.12)',
              borderRadius: '0.75rem', padding: '0.625rem 0.875rem',
              animation: `ks-slide-up 0.35s ease ${0.08 + i * 0.06}s both`, opacity: 0,
              textAlign: 'left',
            }}>
            <span style={{ fontSize: '1.25rem', flexShrink: 0 }} aria-hidden="true">{f.icon}</span>
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>{f.title}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.125rem' }}>{f.sub}</div>
            </div>
          </div>
        ))}
      </div>
      <NextButton onClick={onNext} />
    </div>
  );
}

/* ── Step 4 — Consent (ongewijzigd inhoud, nieuwe positie) ───────────────── */

function Step4({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ maxWidth: '22rem', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={ICON_CIRCLE} aria-hidden="true">
        <span style={{ fontSize: '2.25rem' }}>🖤</span>
      </div>
      <h2 style={TITLE}>Consent, altijd</h2>
      <p style={{ ...BODY, textAlign: 'center' }}>
        KinkSync is een startpunt voor het gesprek, niet een vervanging.<br />
        Safewords zijn heilig. Grenzen zijn wet.
      </p>
      <NextButton onClick={onNext} />
    </div>
  );
}

/* ── Step 5 — Kies je thema ──────────────────────────────────────────────── */

const THEMES = [
  { value: 'midnight' as const, label: 'Midnight',  color: '#c084fc' },
  { value: 'red'      as const, label: 'Deep Red',  color: '#ef4444' },
  { value: 'forest'   as const, label: 'Forest',    color: '#4ade80' },
  { value: 'mono'     as const, label: 'Mono',      color: '#e5e5e5' },
];

function Step5({ onNext }: { onNext: () => void }) {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);

  return (
    <div style={{ maxWidth: '22rem', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ ...ICON_CIRCLE, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }} aria-hidden="true">
        <span style={{ fontSize: '2.25rem' }}>🎨</span>
      </div>
      <h2 style={TITLE}>Kies je sfeer</h2>
      <p style={{ ...BODY, textAlign: 'center' }}>Je kunt dit altijd later aanpassen via de instellingen.</p>
      <div style={{
        width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '0.875rem', padding: '0.875rem 1rem',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        marginBottom: '1rem',
        animation: 'ks-slide-up 0.4s ease 0.15s both', opacity: 0,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.125rem' }}>Voorbeeld</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>Zo ziet de app eruit</div>
        </div>
        <div style={{
          background: 'var(--accent)', color: '#000',
          borderRadius: '9999px', padding: '0.3125rem 0.75rem',
          fontSize: '0.75rem', fontWeight: 600, flexShrink: 0,
        }}>
          Ja
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', width: '100%', marginBottom: '2.5rem', animation: 'ks-slide-up 0.4s ease 0.2s both', opacity: 0 }}>
        {THEMES.map((t) => {
          const selected = theme === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              aria-pressed={selected}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.625rem',
                padding: '1rem 0.75rem', borderRadius: '0.875rem', cursor: 'pointer',
                background: selected ? `color-mix(in srgb, ${t.color} 12%, transparent)` : 'rgba(255,255,255,0.04)',
                border: selected ? `2px solid ${t.color}` : '2px solid rgba(255,255,255,0.1)',
                transition: 'border-color 150ms ease, background 150ms ease',
              }}
            >
              <span style={{ width: '2.5rem', height: '2.5rem', borderRadius: '9999px', background: t.color, display: 'block', flexShrink: 0 }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: selected ? t.color : 'rgba(255,255,255,0.6)' }}>{t.label}</span>
            </button>
          );
        })}
      </div>
      <NextButton onClick={onNext} label="Ga door →" />
    </div>
  );
}

/* ── Step 6 — Leeftijdscheck ─────────────────────────────────────────────── */

function Step6({ onComplete, onLockout }: { onComplete: () => void; onLockout: () => void }) {
  return (
    <div style={{ maxWidth: '20rem', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ fontSize: '2.25rem', marginBottom: '1.5rem', animation: 'ks-icon-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both', opacity: 0 }} aria-hidden="true">
        🔞
      </div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff', marginBottom: '1rem' }}>Voor volwassenen</h2>
      <p style={{ ...BODY, animation: 'ks-slide-up 0.4s ease 0.15s both' }}>
        Hier praten we open over kinks, grenzen en alles daartussen.
        Ga alleen verder als je 18 jaar of ouder bent.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <button onClick={onComplete}
          style={{ background: 'linear-gradient(135deg, #c084fc, #818cf8)', color: '#000', fontWeight: 600, padding: '0.75rem 2rem', borderRadius: '9999px', border: 'none', fontSize: '1rem', cursor: 'pointer', width: '100%', maxWidth: '16rem', transition: 'opacity 150ms ease', animation: 'ks-slide-up 0.4s ease 0.25s both', opacity: 0 }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}>
          Ja, ik ben 18+
        </button>
        <button onClick={onLockout}
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.3)', padding: '0.625rem 2rem', borderRadius: '9999px', fontSize: '0.875rem', cursor: 'pointer', marginTop: '0.75rem', width: '100%', maxWidth: '16rem', animation: 'ks-slide-up 0.4s ease 0.35s both', opacity: 0 }}>
          Ik ben jonger
        </button>
      </div>
    </div>
  );
}
