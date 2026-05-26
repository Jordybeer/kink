'use client';

import { useState, useCallback } from 'react';

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

// Total content steps: 1–5 (step 0 is the splash, step 5 is the age gate)
const TOTAL_STEPS = 5;

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
      `}</style>

      <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
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
              {step === 5 && <Step5 onComplete={onComplete} onLockout={() => setLockout(true)} />}
            </div>

            {step > 0 && (
              <div style={{ position: 'fixed', bottom: '2rem', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '0.5rem' }} aria-hidden="true">
                {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(i => (
                  <div key={i} style={{
                    height: 4,
                    width: i === step ? 24 : 8,
                    borderRadius: 999,
                    background: i === step ? '#c084fc' : 'rgba(255,255,255,0.2)',
                    transition: 'width 300ms cubic-bezier(0.34,1.56,0.64,1), background 200ms ease',
                  }} />
                ))}
              </div>
            )}
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
        style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', cursor: 'pointer', padding: '0.25rem 0.5rem' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.2)'; }}
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
      <div style={{ ...BODY, textAlign: 'left' }}>
        <p style={{ margin: '0 0 0.75rem' }}>
          Geen account. Geen server. Geen tracking. Alles wat je invoert — je naam, je kinks, je grenzen — slaat KinkSync uitsluitend op in jouw browser.
        </p>
        <p style={{ margin: '0 0 0.75rem' }}>
          Live sessies met je partner verlopen via <strong style={{ color: 'rgba(255,255,255,0.7)' }}>WebRTC met end-to-end encryptie</strong> — de data reist direct van apparaat naar apparaat, raakt nooit een server.
        </p>
        <p style={{ margin: 0 }}>
          Wanneer je een profiel van iemand anders importeert, wordt dat profiel geblokkeerd voor verdere deling — jouw partners data is van hen.
        </p>
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
      <h2 style={TITLE}>Maak regelmatig een back-up</h2>
      <div style={{ ...BODY, textAlign: 'left' }}>
        <p style={{ margin: '0 0 0.75rem' }}>
          Omdat alles lokaal staat, is jij de enige bewaarder van je data. Verwijder je de app, wissel je van apparaat, of wordt je browser-opslag gecleared — dan is je profiel weg.
        </p>
        <p style={{ margin: '0 0 0.75rem' }}>
          Via <strong style={{ color: 'rgba(255,255,255,0.7)' }}>⚙ Instellingen</strong> (rechtsboven op het startscherm) kun je een JSON-back-up exporteren en later opnieuw importeren.
        </p>
        <p style={{ margin: 0 }}>
          Behandel je back-up als je dagboek — sla hem veilig op.
        </p>
      </div>
      <NextButton onClick={onNext} />
    </div>
  );
}

/* ── Step 3 — Profiel & kinks (nieuw) ────────────────────────────────────── */

const FEATURE_ROWS: { icon: string; title: string; sub: string }[] = [
  { icon: '👤', title: 'Profiel',       sub: 'Foto, rol, FetLife-link — allemaal optioneel' },
  { icon: '🏷',  title: 'Kinks',         sub: 'Pills: ja / graag / misschien / nee / harde grens' },
  { icon: '⚡',  title: 'Vergelijken',   sub: 'Heatmap + compatibiliteitsscore per categorie' },
  { icon: '📡',  title: 'Live sessie',   sub: 'Peer-to-peer QR — geen server, real-time' },
  { icon: '🔗',  title: 'Profiel delen', sub: 'QR-code — importeur kan het niet doorsturen' },
  { icon: '✍',  title: 'Contract',      sub: 'Safeword, aftercare, handtekening → PDF' },
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
      <p style={{ ...BODY, textAlign: 'left' }}>
        KinkSync helpt je om open te zijn over je verlangens — maar de echte toestemming geef je aan elkaar, nooit aan een app.
        Gebruik de tools als startpunt voor een gesprek, niet als vervanging.
        Safewords zijn heilig. Grenzen zijn wet.
      </p>
      <NextButton onClick={onNext} />
    </div>
  );
}

/* ── Step 5 — Leeftijdscheck ─────────────────────────────────────────────── */

function Step5({ onComplete, onLockout }: { onComplete: () => void; onLockout: () => void }) {
  return (
    <div style={{ maxWidth: '20rem', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ fontSize: '2.25rem', marginBottom: '1.5rem', animation: 'ks-icon-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both', opacity: 0 }} aria-hidden="true">
        🔞
      </div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff', marginBottom: '1rem' }}>Voor volwassenen</h2>
      <p style={{ ...BODY, animation: 'ks-slide-up 0.4s ease 0.15s both' }}>
        KinkSync bevat inhoud voor volwassenen over seksuele grenzen en consent.
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
