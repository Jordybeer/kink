'use client';

import { useState, useCallback } from 'react';

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [lockout, setLockout] = useState(false);

  const advance = useCallback(() => {
    setLeaving(true);
    setTimeout(() => {
      setStep((s) => s + 1);
      setLeaving(false);
    }, 220);
  }, []);

  return (
    <>
      <style>{`
        @keyframes ks-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ks-slide-up {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ks-slide-out {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(-32px); }
        }
        @keyframes ks-slide-in {
          from { opacity: 0; transform: translateX(32px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes ks-icon-pop {
          0%   { opacity: 0; transform: scale(0.6) translateY(12px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes ks-dot-expand {
          from { width: 8px; }
          to   { width: 24px; }
        }
        @keyframes ks-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.2); }
          50%     { box-shadow: 0 0 0 8px rgba(255,255,255,0); }
        }
        .ks-slide-out {
          animation: ks-slide-out 220ms ease forwards;
        }
        .ks-slide-in {
          animation: ks-slide-in 220ms ease forwards;
        }
      `}</style>

      <div
        style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
        role="dialog"
        aria-modal="true"
        aria-label="Welkom bij KinkSync"
      >
        {lockout ? (
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 10,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: '#000', textAlign: 'center', padding: '0 2rem',
            }}
          >
            <div style={{ fontSize: '2.25rem', marginBottom: '1.5rem' }} aria-hidden="true">🖤</div>
            <p style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', marginBottom: '0.75rem' }}>
              Kom terug als je 18 bent.
            </p>
            <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.3)' }}>
              KinkSync is alleen voor volwassenen.
            </p>
          </div>
        ) : (
          <>
            {/* Step content */}
            <div
              key={step}
              className={leaving ? 'ks-slide-out' : 'ks-slide-in'}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 1.5rem' }}
            >
              {step === 0 && <Step0 onNext={advance} onSkip={onComplete} />}
              {step === 1 && <Step1 onNext={advance} />}
              {step === 2 && <Step2 onNext={advance} />}
              {step === 3 && <Step3 onComplete={onComplete} onLockout={() => setLockout(true)} />}
            </div>

            {/* Step dots — only on steps 1-3 */}
            {step > 0 && (
              <div
                style={{
                  position: 'fixed', bottom: '2rem', left: 0, right: 0,
                  display: 'flex', justifyContent: 'center', gap: '0.5rem',
                }}
                aria-hidden="true"
              >
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      height: 4,
                      width: i === step ? 24 : 8,
                      borderRadius: 999,
                      background: i === step ? '#c084fc' : 'rgba(255,255,255,0.2)',
                      transition: 'width 300ms cubic-bezier(0.34,1.56,0.64,1), background 200ms ease',
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

/* ── Step 0 — Welkom ──────────────────────────────────────────── */

function Step0({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div>
        <h1
          style={{
            color: '#fff',
            fontSize: '2.25rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            margin: 0,
            animation: 'ks-fade-in 1s ease forwards',
            opacity: 0,
          }}
        >
          KinkSync
        </h1>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'rgba(255,255,255,0.5)',
            marginTop: '0.5rem',
            animation: 'ks-fade-in 1s ease 0.5s forwards',
            opacity: 0,
          }}
        >
          Verken grenzen. Samen.
        </p>
      </div>

      <div style={{ height: '3rem' }} />

      <button
        onClick={onNext}
        style={{
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.3)',
          background: 'transparent',
          padding: '0.75rem 2rem',
          borderRadius: '9999px',
          fontSize: '1rem',
          cursor: 'pointer',
          animation: 'ks-fade-in 0.8s ease 1.2s forwards, ks-pulse 2s ease 2s infinite',
          opacity: 0,
          transition: 'border-color 150ms ease',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.7)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.3)'; }}
        aria-label="Begin de introductie"
      >
        Begin
      </button>

      <button
        onClick={onSkip}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.2)',
          fontSize: '0.75rem',
          cursor: 'pointer',
          padding: '0.25rem 0.5rem',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.2)'; }}
        aria-label="Sla de introductie over"
      >
        Sla over
      </button>
    </div>
  );
}

/* ── Step 1 — Privacy ─────────────────────────────────────────── */

function Step1({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ maxWidth: '20rem', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div
        style={{
          width: '5rem', height: '5rem', borderRadius: '9999px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(192,132,252,0.08)', border: '1px solid rgba(192,132,252,0.2)',
          marginBottom: '2rem',
          animation: 'ks-icon-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
        aria-hidden="true"
      >
        <span style={{ fontSize: '2.25rem' }}>🔒</span>
      </div>

      <h2
        style={{
          fontSize: '1.5rem', fontWeight: 600, color: '#fff', marginBottom: '1rem',
          animation: 'ks-slide-up 0.4s ease 0.1s both',
          opacity: 0,
        }}
      >
        Alleen voor jou
      </h2>

      <p
        style={{
          fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: '2.5rem',
          animation: 'ks-slide-up 0.4s ease 0.2s both',
          opacity: 0,
        }}
      >
        Alles blijft op jouw apparaat. Geen account, geen server, geen data die ergens heen gaat.
        Gewoon jij en de mensen die je vertrouwt.
      </p>

      <button
        onClick={onNext}
        style={{
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.3)',
          background: 'transparent',
          padding: '0.75rem 2rem',
          borderRadius: '9999px',
          fontSize: '1rem',
          cursor: 'pointer',
          animation: 'ks-slide-up 0.4s ease 0.3s both',
          opacity: 0,
          transition: 'border-color 150ms ease',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.7)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.3)'; }}
      >
        Volgende →
      </button>
    </div>
  );
}

/* ── Step 2 — Hoe het werkt ───────────────────────────────────── */

const HOW_STEPS = [
  { icon: '👤', label: 'Profiel' },
  { icon: '★',  label: 'Beoordeel' },
  { icon: '⚖',  label: 'Vergelijk' },
  { icon: '✍',  label: 'Contract' },
] as const;

function Step2({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ maxWidth: '24rem', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h2
        style={{
          fontSize: '1.5rem', fontWeight: 600, color: '#fff', marginBottom: '2.5rem',
        }}
      >
        Vier stappen
      </h2>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
        {HOW_STEPS.map((s, i) => (
          <>
            <div
              key={s.label}
              style={{
                width: '3.5rem', height: '3.5rem', borderRadius: '1rem',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(192,132,252,0.08)', border: '1px solid rgba(192,132,252,0.15)',
                animation: `ks-icon-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.15}s both`,
                opacity: 0,
              }}
              aria-label={s.label}
            >
              <span style={{ fontSize: '1.25rem', marginBottom: '0.125rem' }} aria-hidden="true">{s.icon}</span>
              <span style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.25rem' }}>
                {s.label}
              </span>
            </div>
            {i < HOW_STEPS.length - 1 && (
              <span key={`arrow-${i}`} style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem' }} aria-hidden="true">→</span>
            )}
          </>
        ))}
      </div>

      <button
        onClick={onNext}
        style={{
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.3)',
          background: 'transparent',
          padding: '0.75rem 2rem',
          borderRadius: '9999px',
          fontSize: '1rem',
          cursor: 'pointer',
          animation: 'ks-slide-up 0.5s ease 0.6s both',
          opacity: 0,
          transition: 'border-color 150ms ease',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.7)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.3)'; }}
      >
        Volgende →
      </button>
    </div>
  );
}

/* ── Step 3 — Leeftijdscheck ──────────────────────────────────── */

function Step3({ onComplete, onLockout }: { onComplete: () => void; onLockout: () => void }) {
  return (
    <div style={{ maxWidth: '20rem', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div
        style={{
          fontSize: '2.25rem', marginBottom: '1.5rem',
          animation: 'ks-icon-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
          opacity: 0,
        }}
        aria-hidden="true"
      >
        🔞
      </div>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff', marginBottom: '1rem' }}>
        Voor volwassenen
      </h2>

      <p
        style={{
          fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: '2.5rem',
          animation: 'ks-slide-up 0.4s ease 0.15s both',
          opacity: 0,
        }}
      >
        KinkSync bevat inhoud voor volwassenen over seksuele grenzen en consent.
        Ga alleen verder als je 18 jaar of ouder bent.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, width: '100%' }}>
        <button
          onClick={onComplete}
          style={{
            background: 'linear-gradient(135deg, #c084fc, #818cf8)',
            color: '#000',
            fontWeight: 600,
            padding: '0.75rem 2rem',
            borderRadius: '9999px',
            border: 'none',
            fontSize: '1rem',
            cursor: 'pointer',
            width: '100%',
            maxWidth: '16rem',
            transition: 'opacity 150ms ease',
            animation: 'ks-slide-up 0.4s ease 0.25s both',
            opacity: 0,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
        >
          Ja, ik ben 18+
        </button>

        <button
          onClick={onLockout}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.3)',
            padding: '0.625rem 2rem',
            borderRadius: '9999px',
            fontSize: '0.875rem',
            cursor: 'pointer',
            marginTop: '0.75rem',
            width: '100%',
            maxWidth: '16rem',
            animation: 'ks-slide-up 0.4s ease 0.35s both',
            opacity: 0,
          }}
        >
          Ik ben jonger
        </button>
      </div>
    </div>
  );
}
