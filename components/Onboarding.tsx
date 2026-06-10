'use client';

import { useState, useCallback, useEffect } from 'react';
import { Zap, PenLine } from 'lucide-react';
import { useStore } from '@/lib/store';
import Wordmark from '@/components/Wordmark';
import { hashPin } from '@/lib/crypto';
import { isPlatformAuthenticatorAvailable, registerBiometric } from '@/lib/webauthn';

interface OnboardingProps {
  onComplete: () => void;
}

const ICON_CIRCLE: React.CSSProperties = {
  width: '5rem', height: '5rem', borderRadius: '9999px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'color-mix(in srgb, var(--accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
  marginBottom: '2rem',
  animation: 'ks-icon-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
};
const TITLE: React.CSSProperties = {
  fontSize: '1.5rem', fontWeight: 600, color: 'var(--text)', marginBottom: '1rem',
  animation: 'ks-slide-up 0.4s ease 0.1s both', opacity: 0,
};
const BODY: React.CSSProperties = {
  fontSize: '0.875rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '2rem',
  animation: 'ks-slide-up 0.4s ease 0.2s both', opacity: 0,
};

// Shared action-button styles
const BTN_GHOST: React.CSSProperties = {
  color: 'var(--text)', border: '1px solid var(--border)', background: 'transparent',
  padding: '0.875rem 2rem', borderRadius: '9999px', fontSize: '1rem', cursor: 'pointer',
  width: '100%', maxWidth: '22rem', transition: 'border-color 150ms ease',
};
const BTN_PRIMARY: React.CSSProperties = {
  background: 'linear-gradient(135deg, var(--accent), var(--accent2))', color: 'var(--on-accent)', fontWeight: 600,
  padding: '0.875rem 2rem', borderRadius: '9999px', border: 'none', fontSize: '1rem',
  cursor: 'pointer', width: '100%', maxWidth: '22rem',
};
const BTN_SECONDARY: React.CSSProperties = {
  background: 'transparent', border: '1px solid var(--border)',
  color: 'var(--text2)', padding: '0.75rem 2rem', borderRadius: '9999px',
  fontSize: '0.875rem', cursor: 'pointer', width: '100%', maxWidth: '22rem',
};

// The fixed slot where all continue/action buttons live — outside the animated div
const ACTION_BAR: React.CSSProperties = {
  position: 'fixed', bottom: '5rem', left: 0, right: 0,
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  gap: '0.75rem', padding: '0 2rem',
};

const PIN_KEYS = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
const PIN_LENGTH = 4;
const TOTAL_STEPS = 7;

type S6Sub = "intro" | "pin1" | "pin2" | "biometric";

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [lockout, setLockout] = useState(false);

  // Step6 state lives here so action buttons can render outside the animated div
  const [s6sub, setS6sub] = useState<S6Sub>("intro");
  const [pin1, setPin1] = useState<string[]>([]);
  const [pin2, setPin2] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);

  const setAppLockPin = useStore((s) => s.setAppLockPin);
  const enableBiometric = useStore((s) => s.enableBiometric);

  useEffect(() => { isPlatformAuthenticatorAvailable().then(setBioAvailable); }, []);

  const advance = useCallback(() => {
    setLeaving(true);
    setTimeout(() => { setStep(s => s + 1); setLeaving(false); }, 220);
  }, []);

  async function handlePinKey(k: string) {
    const active = s6sub === "pin1" ? pin1 : pin2;
    const setActive = s6sub === "pin1" ? setPin1 : setPin2;
    if (k === "⌫") { setActive(d => d.slice(0, -1)); return; }
    if (active.length >= PIN_LENGTH) return;
    const next = [...active, k];
    setActive(next);
    if (next.length < PIN_LENGTH) return;
    if (s6sub === "pin1") { setS6sub("pin2"); return; }
    if (next.join("") !== pin1.join("")) {
      setShake(true);
      setTimeout(() => { setShake(false); setPin1([]); setPin2([]); setS6sub("pin1"); }, 500);
      return;
    }
    const hash = await hashPin(next.join(""));
    setAppLockPin(hash);
    if (bioAvailable) setS6sub("biometric"); else advance();
  }

  async function handleEnableBio() {
    setBioLoading(true); setBioError(null);
    try {
      const credId = await registerBiometric();
      enableBiometric(credId);
      advance();
    } catch {
      setBioError("Registratie mislukt — je kunt Face ID later inschakelen via instellingen.");
      setBioLoading(false);
    }
  }

  const currentDigits = s6sub === "pin1" ? pin1 : pin2;

  return (
    <>
      <style>{`
        @keyframes ks-fade-in  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ks-slide-up { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ks-slide-out { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(-32px); } }
        @keyframes ks-slide-in  { from { opacity: 0; transform: translateX(32px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes ks-icon-pop  { 0% { opacity:0; transform:scale(0.6) translateY(12px); } 100% { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes ks-pulse     { 0%,100% { box-shadow:0 0 0 0 rgba(255,255,255,0.2); } 50% { box-shadow:0 0 0 8px rgba(255,255,255,0); } }
        @keyframes ks-shake     { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }
        .ks-slide-out { animation: ks-slide-out 220ms ease forwards; }
        .ks-slide-in  { animation: ks-slide-in  220ms ease forwards; }
        @media (prefers-reduced-motion: reduce) {
          .ks-slide-out, .ks-slide-in { animation: none; }
        }
      `}</style>

      <div
        style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'var(--bg)', transition: 'background 200ms ease', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
        role="dialog" aria-modal="true" aria-label="Welkom bij KinkSync"
      >
        {lockout ? (
          <div style={{ position: 'fixed', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', textAlign: 'center', padding: '0 2rem' }}>
            <div style={{ fontSize: '2.25rem', marginBottom: '1.5rem' }} aria-hidden="true">🖤</div>
            <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.75rem' }}>Kom terug als je 18 bent.</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text2)' }}>KinkSync is alleen voor volwassenen.</p>
          </div>
        ) : (
          <>
            {/* ── Animated content — NO buttons here (transform breaks fixed positioning) ── */}
            <div
              key={step}
              className={leaving ? 'ks-slide-out' : 'ks-slide-in'}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 1.5rem 14rem', overflowY: 'auto', maxHeight: '100dvh' }}
            >
              {step === 0 && <Step0Content />}
              {step === 1 && <Step1Content />}
              {step === 2 && <Step2Content />}
              {step === 3 && <Step3Content />}
              {step === 4 && <Step4Content />}
              {step === 5 && <Step5Content />}
              {step === 6 && s6sub === "intro"   && <Step6IntroContent bioAvailable={bioAvailable} />}
              {step === 6 && s6sub === "biometric" && <Step6BioContent bioError={bioError} />}
              {step === 6 && (s6sub === "pin1" || s6sub === "pin2") && (
                <Step6PinContent sub={s6sub} digits={currentDigits} shake={shake} onKey={handlePinKey} />
              )}
              {step === 7 && <Step7Content />}
            </div>

            {/* ── Fixed action bar — always at the same spot, never inside a transform ── */}
            <div style={ACTION_BAR}>
              {step === 0 && (
                <button
                  onClick={advance}
                  style={{ ...BTN_GHOST, animation: 'ks-fade-in 0.8s ease 1.2s both, ks-pulse 2s ease 2s infinite', opacity: 0 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
                >
                  Begin
                </button>
              )}

              {step >= 1 && step <= 5 && (
                <button
                  onClick={advance}
                  style={BTN_GHOST}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
                >
                  {step === 5 ? 'Ga door →' : 'Volgende →'}
                </button>
              )}

              {step === 6 && s6sub === "intro" && (
                <>
                  <button onClick={() => setS6sub("pin1")} style={BTN_PRIMARY}>PIN instellen</button>
                  <button onClick={advance} style={BTN_SECONDARY}>Sla over</button>
                </>
              )}

              {step === 6 && (s6sub === "pin1" || s6sub === "pin2") && (
                <button
                  onClick={() => { setPin1([]); setPin2([]); setS6sub("intro"); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: '0.8125rem', cursor: 'pointer', padding: '0.75rem 1rem', minHeight: '44px' }}
                >
                  ← Terug
                </button>
              )}

              {step === 6 && s6sub === "biometric" && (
                <>
                  <button
                    onClick={handleEnableBio}
                    disabled={bioLoading}
                    style={{ ...BTN_PRIMARY, background: bioLoading ? 'var(--surface2)' : 'linear-gradient(135deg, var(--accent), var(--accent2))', color: bioLoading ? 'var(--text2)' : 'var(--on-accent)', cursor: bioLoading ? 'default' : 'pointer' }}
                  >
                    {bioLoading ? 'Even wachten…' : 'Face ID / vingerafdruk inschakelen'}
                  </button>
                  <button onClick={advance} style={BTN_SECONDARY}>Nee, alleen PIN</button>
                </>
              )}

              {step === 7 && (
                <>
                  <button
                    onClick={onComplete}
                    style={BTN_PRIMARY}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                  >
                    Ja, ik ben 18+
                  </button>
                  <button onClick={() => setLockout(true)} style={BTN_SECONDARY}>Ik ben jonger</button>
                </>
              )}
            </div>

            {/* Skip (step 0 only) — jumps to age gate, never bypasses it */}
            {step === 0 && (
              <button
                onClick={() => { setLeaving(true); setTimeout(() => { setStep(7); setLeaving(false); }, 220); }}
                style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--text2)', fontSize: '0.875rem', cursor: 'pointer', padding: '0.75rem 1rem', minHeight: '44px' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text2)'; }}
                aria-label="Sla de introductie over"
              >
                Sla over
              </button>
            )}

            {/* Progress dots */}
            <div style={{ position: 'fixed', bottom: '2rem', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '0.5rem' }} aria-hidden="true">
              {Array.from({ length: TOTAL_STEPS + 1 }, (_, i) => i).map(i => (
                <div key={i} style={{
                  height: 4,
                  width: i === step ? 24 : 8,
                  borderRadius: 999,
                  background: i === step ? 'var(--accent)' : 'var(--border)',
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

/* ── Step content components (pure content, no buttons) ─────────────────── */

function Step0Content() {
  return (
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h1 style={{ fontSize: '2.25rem', fontWeight: 700, margin: 0, animation: 'ks-fade-in 1s ease forwards', opacity: 0 }}>
        <Wordmark style={{ letterSpacing: '0.08em' }} />
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--text2)', marginTop: '0.5rem', animation: 'ks-fade-in 1s ease 0.5s forwards', opacity: 0 }}>
        Verken grenzen. Samen.
      </p>
    </div>
  );
}

function Step1Content() {
  return (
    <div style={{ maxWidth: '22rem', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={ICON_CIRCLE} aria-hidden="true"><span style={{ fontSize: '2.25rem' }}>🔒</span></div>
      <h2 style={TITLE}>Jouw data verlaat dit apparaat nooit</h2>
      <div style={{ ...BODY, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ background: 'color-mix(in srgb, var(--accent) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 12%, transparent)', borderRadius: '0.75rem', padding: '0.75rem 1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem' }}>De app</div>
          Geen account, geen server, geen tracking. Alles staat in je browser en nergens anders.
        </div>
        <div style={{ background: 'color-mix(in srgb, var(--accent) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 12%, transparent)', borderRadius: '0.75rem', padding: '0.75rem 1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem' }}>Live sessie</div>
          End-to-end versleuteld — ook wij kunnen niet meelezen. Je kinks en naam verlaten je toestel nooit.
        </div>
      </div>
    </div>
  );
}

function Step2Content() {
  return (
    <div style={{ maxWidth: '22rem', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={ICON_CIRCLE} aria-hidden="true"><span style={{ fontSize: '2.25rem' }}>💾</span></div>
      <h2 style={TITLE}>Jij bent je eigen cloud</h2>
      <p style={{ ...BODY, textAlign: 'center' }}>
        Geen automatische sync — jij bewaart je data.<br />
        Exporteer je profiel via <strong style={{ color: 'var(--text)' }}>⚙ Instellingen</strong> en bewaar het bestand veilig.
      </p>
    </div>
  );
}

type FeatureIcon = string | React.FC<{ size: number }>;
const FEATURE_ROWS: { icon: FeatureIcon; title: string; sub: string }[] = [
  { icon: '👤', title: 'Profiel',        sub: 'Foto, rol, FetLife-link — allemaal optioneel' },
  { icon: '🏷',  title: 'Kinks',          sub: 'Ja / graag / misschien / nee / harde grens' },
  { icon: Zap,   title: 'Vergelijken',    sub: 'Zie direct waar jullie overlap zit' },
  { icon: '📡',  title: 'Live sessie',    sub: 'End-to-end versleuteld — vergelijk live op afstand' },
  { icon: '🎬',  title: 'Scène planner', sub: 'Plan elke scène tot in detail' },
  { icon: PenLine, title: 'Contract',     sub: 'Safeword, aftercare, handtekening → PDF' },
];

function Step3Content() {
  return (
    <div style={{ maxWidth: '26rem', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text)', marginBottom: '1.5rem', animation: 'ks-slide-up 0.4s ease 0.05s both', opacity: 0 }}>
        Wat kun je doen?
      </h2>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {FEATURE_ROWS.map((f, i) => (
          <div key={f.title} style={{
            display: 'flex', alignItems: 'center', gap: '0.875rem',
            background: 'color-mix(in srgb, var(--accent) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 12%, transparent)',
            borderRadius: '0.75rem', padding: '0.625rem 0.875rem',
            animation: `ks-slide-up 0.35s ease ${0.08 + i * 0.06}s both`, opacity: 0,
            textAlign: 'left',
          }}>
            <span style={{ flexShrink: 0 }} aria-hidden="true">{typeof f.icon === 'string' ? <span style={{ fontSize: '1.25rem' }}>{f.icon}</span> : <f.icon size={20} />}</span>
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)' }}>{f.title}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text2)', marginTop: '0.125rem' }}>{f.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Step4Content() {
  return (
    <div style={{ maxWidth: '22rem', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={ICON_CIRCLE} aria-hidden="true"><span style={{ fontSize: '2.25rem' }}>🖤</span></div>
      <h2 style={TITLE}>Consent, altijd</h2>
      <p style={{ ...BODY, textAlign: 'center' }}>
        KinkSync is een startpunt voor het gesprek, niet een vervanging.<br />
        Safewords zijn heilig. Grenzen zijn wet.
      </p>
    </div>
  );
}

const THEMES = [
  { value: 'midnight' as const, label: 'Midnight', color: '#c084fc' },
  { value: 'red'      as const, label: 'Deep Red', color: '#ef4444' },
  { value: 'forest'   as const, label: 'Forest',   color: '#4ade80' },
  { value: 'mono'     as const, label: 'Mono',     color: '#e5e5e5' },
];

function Step5Content() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);

  return (
    <div style={{ maxWidth: '22rem', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ ...ICON_CIRCLE, background: 'var(--surface2)', border: '1px solid var(--border)' }} aria-hidden="true">
        <span style={{ fontSize: '2.25rem' }}>🎨</span>
      </div>
      <h2 style={TITLE}>Kies je sfeer</h2>
      <p style={{ ...BODY, textAlign: 'center' }}>Je kunt dit altijd later aanpassen via de instellingen.</p>
      <div style={{
        width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '0.875rem', padding: '0.875rem 1rem',
        display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem',
        animation: 'ks-slide-up 0.4s ease 0.15s both', opacity: 0,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.125rem' }}>Voorbeeld</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>Zo ziet de app eruit</div>
        </div>
        <div style={{ background: 'var(--accent)', color: 'var(--on-accent)', borderRadius: '9999px', padding: '0.3125rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>Ja</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', width: '100%', animation: 'ks-slide-up 0.4s ease 0.2s both', opacity: 0 }}>
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
                background: selected ? `color-mix(in srgb, ${t.color} 12%, transparent)` : 'var(--surface2)',
                border: selected ? `2px solid ${t.color}` : '2px solid var(--border)',
                transition: 'border-color 150ms ease, background 150ms ease',
              }}
            >
              <span style={{ width: '2.5rem', height: '2.5rem', borderRadius: '9999px', background: t.color, display: 'block', flexShrink: 0 }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: selected ? t.color : 'var(--text2)' }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Step6IntroContent({ bioAvailable }: { bioAvailable: boolean }) {
  return (
    <div style={{ maxWidth: '22rem', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={ICON_CIRCLE} aria-hidden="true"><span style={{ fontSize: '2.25rem' }}>🔐</span></div>
      <h2 style={TITLE}>Vergrendel de app</h2>
      <p style={{ ...BODY, textAlign: 'center' }}>
        Bescherm je kinks met een PIN{bioAvailable ? ' of Face ID / vingerafdruk' : ''}.<br />
        Optioneel — je kunt dit ook later instellen via de instellingen.
      </p>
    </div>
  );
}

function Step6PinContent({ sub, digits, shake, onKey }: { sub: "pin1" | "pin2"; digits: string[]; shake: boolean; onKey: (k: string) => void }) {
  return (
    <div style={{ maxWidth: '18rem', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h2 style={TITLE}>{sub === "pin1" ? "Kies een PIN" : "Bevestig je PIN"}</h2>
      <p style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginBottom: '1.5rem' }}>
        {sub === "pin1" ? "Kies een code van 4 cijfers" : "Voer je PIN nog een keer in"}
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.875rem', marginBottom: '1.5rem', animation: shake ? 'ks-shake 0.4s ease' : 'none' }}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <div key={i} style={{
            width: 12, height: 12, borderRadius: '9999px',
            background: i < digits.length ? 'var(--accent)' : 'var(--border)',
            transition: 'background 150ms ease',
          }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', width: '100%' }}>
        {PIN_KEYS.map((k, i) => (
          <button
            key={i}
            onClick={() => k && onKey(k)}
            disabled={!k}
            style={{
              height: '3.25rem', borderRadius: '0.75rem', fontWeight: 600,
              cursor: k ? 'pointer' : 'default',
              background: k ? 'var(--surface2)' : 'transparent',
              border: k ? '1px solid var(--border)' : 'none',
              color: k === '⌫' ? 'var(--text2)' : 'var(--text)',
              fontSize: k === '⌫' ? '1.125rem' : '1.375rem',
              opacity: !k ? 0 : 1,
              transition: 'opacity 150ms ease, background 150ms ease',
            }}
            onPointerDown={e => { if (k) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface3)'; }}
            onPointerUp={e => { if (k) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface2)'; }}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

function Step6BioContent({ bioError }: { bioError: string | null }) {
  return (
    <div style={{ maxWidth: '22rem', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={ICON_CIRCLE} aria-hidden="true"><span style={{ fontSize: '2.25rem' }}>🔓</span></div>
      <h2 style={TITLE}>PIN ingesteld!</h2>
      <p style={{ ...BODY, textAlign: 'center' }}>
        Wil je ook Face ID of vingerafdruk inschakelen? Je PIN blijft altijd beschikbaar als terugval.
      </p>
      {bioError && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--hard-no)', marginBottom: '1rem' }}>{bioError}</p>
      )}
    </div>
  );
}

function Step7Content() {
  return (
    <div style={{ maxWidth: '20rem', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ fontSize: '2.25rem', marginBottom: '1.5rem', animation: 'ks-icon-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both', opacity: 0 }} aria-hidden="true">🔞</div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text)', marginBottom: '1rem' }}>Voor volwassenen</h2>
      <p style={{ ...BODY, animation: 'ks-slide-up 0.4s ease 0.15s both' }}>
        Hier praten we open over kinks, grenzen en alles daartussen.
        Ga alleen verder als je 18 jaar of ouder bent.
      </p>
    </div>
  );
}
