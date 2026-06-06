'use client';

import { useState, useCallback, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { hashPin } from '@/lib/crypto';
import { isPlatformAuthenticatorAvailable, registerBiometric } from '@/lib/webauthn';
import { getInstallPrompt, clearInstallPrompt } from '@/lib/installPrompt';

interface OnboardingProps {
  onComplete: () => void;
}

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
  fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: '2rem',
  animation: 'ks-slide-up 0.4s ease 0.2s both', opacity: 0,
};

const BTN_GHOST: React.CSSProperties = {
  color: '#fff', border: '1px solid rgba(255,255,255,0.3)', background: 'transparent',
  padding: '0.875rem 2rem', borderRadius: '9999px', fontSize: '1rem', cursor: 'pointer',
  width: '100%', maxWidth: '22rem', transition: 'border-color 150ms ease',
};
const BTN_PRIMARY: React.CSSProperties = {
  background: 'linear-gradient(135deg, var(--accent), var(--accent2))', color: 'var(--on-accent)', fontWeight: 600,
  padding: '0.875rem 2rem', borderRadius: '9999px', border: 'none', fontSize: '1rem',
  cursor: 'pointer', width: '100%', maxWidth: '22rem',
};
const BTN_SECONDARY: React.CSSProperties = {
  background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
  color: 'rgba(255,255,255,0.4)', padding: '0.75rem 2rem', borderRadius: '9999px',
  fontSize: '0.875rem', cursor: 'pointer', width: '100%', maxWidth: '22rem',
};

const ACTION_BAR: React.CSSProperties = {
  position: 'fixed', bottom: '5rem', left: 0, right: 0,
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  gap: '0.75rem', padding: '0 2rem',
};

const PIN_KEYS = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
const PIN_LENGTH = 4;
const TOTAL_STEPS = 7;

type S6Sub = "intro" | "pin1" | "pin2" | "biometric";

// Step 5 is the PWA install slide — only shown on Android with a pending prompt.
const STEP_INSTALL = 5;

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [lockout, setLockout] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [hasAndroidPrompt, setHasAndroidPrompt] = useState(false);
  const [installing, setInstalling] = useState(false);

  const [s6sub, setS6sub] = useState<S6Sub>("intro");
  const [pin1, setPin1] = useState<string[]>([]);
  const [pin2, setPin2] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);

  const setAppLockPin = useStore((s) => s.setAppLockPin);
  const enableBiometric = useStore((s) => s.enableBiometric);

  useEffect(() => {
    isPlatformAuthenticatorAvailable().then(setBioAvailable);
    const ua = navigator.userAgent;
    setIsIos(/iPhone|iPad|iPod/.test(ua) && !/Chrome/.test(ua));
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
    // Check if the module-level prompt was already captured by ThemeProvider.
    setHasAndroidPrompt(getInstallPrompt() !== null);
  }, []);

  const advance = useCallback(() => {
    setLeaving(true);
    setTimeout(() => { setStep(s => s + 1); setLeaving(false); }, 220);
  }, []);

  // Whether to show the install slide at step 5.
  const showInstallStep = !isStandalone && (isIos || hasAndroidPrompt);

  async function handleAndroidInstall() {
    const prompt = getInstallPrompt();
    if (!prompt) { advance(); return; }
    setInstalling(true);
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      clearInstallPrompt();
      if (outcome === 'accepted') {
        // Auto-advance — user installed, no need to linger on the slide.
        advance();
      }
      // If dismissed, stay on slide so they can tap "Sla over".
    } finally {
      setInstalling(false);
    }
  }

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
          <div style={{ position: 'fixed', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', textAlign: 'center', padding: '0 2rem' }}>
            <div style={{ fontSize: '2.25rem', marginBottom: '1.5rem' }} aria-hidden="true">🖤</div>
            <p style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', marginBottom: '0.75rem' }}>Kom terug als je 18 bent.</p>
            <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.3)' }}>KinkSync is alleen voor volwassenen.</p>
          </div>
        ) : (
          <>
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
              {step === STEP_INSTALL && showInstallStep && isIos && <StepInstallIosContent />}
              {step === STEP_INSTALL && showInstallStep && !isIos && <StepInstallAndroidContent />}
              {step === STEP_INSTALL && !showInstallStep && <Step5Content />}
              {step === 5 && !showInstallStep && null /* theme step shifted */}
              {/* When install step is skipped, theme step (originally 5) maps to step 5 */}
              {step === (showInstallStep ? 6 : 5) && <Step5ThemeContent />}
              {step === (showInstallStep ? 7 : 6) && s6sub === "intro"    && <Step6IntroContent bioAvailable={bioAvailable} />}
              {step === (showInstallStep ? 7 : 6) && s6sub === "biometric" && <Step6BioContent bioError={bioError} />}
              {step === (showInstallStep ? 7 : 6) && (s6sub === "pin1" || s6sub === "pin2") && (
                <Step6PinContent sub={s6sub} digits={currentDigits} shake={shake} onKey={handlePinKey} />
              )}
              {step === (showInstallStep ? 8 : 7) && <Step7Content />}
            </div>

            <div style={ACTION_BAR}>
              {step === 0 && (
                <button
                  onClick={advance}
                  style={{ ...BTN_GHOST, animation: 'ks-fade-in 0.8s ease 1.2s both, ks-pulse 2s ease 2s infinite', opacity: 0 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.7)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.3)'; }}
                >
                  Begin
                </button>
              )}

              {step >= 1 && step <= 4 && (
                <button
                  onClick={advance}
                  style={BTN_GHOST}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.7)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.3)'; }}
                >
                  Volgende →
                </button>
              )}

              {/* Install step — Android */}
              {step === STEP_INSTALL && showInstallStep && !isIos && (
                <>
                  <button
                    onClick={handleAndroidInstall}
                    disabled={installing}
                    style={{ ...BTN_PRIMARY, opacity: installing ? 0.6 : 1, cursor: installing ? 'default' : 'pointer' }}
                  >
                    {installing ? 'Even wachten…' : 'Installeer app'}
                  </button>
                  <button onClick={advance} style={BTN_SECONDARY}>Sla over</button>
                </>
              )}

              {/* Install step — iOS (inline instructions, just a continue button) */}
              {step === STEP_INSTALL && showInstallStep && isIos && (
                <button
                  onClick={advance}
                  style={BTN_GHOST}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.7)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.3)'; }}
                >
                  Ga door →
                </button>
              )}

              {/* Theme step */}
              {step === (showInstallStep ? 6 : 5) && (
                <button
                  onClick={advance}
                  style={BTN_GHOST}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.7)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.3)'; }}
                >
                  Ga door →
                </button>
              )}

              {/* Security step */}
              {step === (showInstallStep ? 7 : 6) && s6sub === "intro" && (
                <>
                  <button onClick={() => setS6sub("pin1")} style={BTN_PRIMARY}>PIN instellen</button>
                  <button onClick={advance} style={BTN_SECONDARY}>Sla over</button>
                </>
              )}

              {step === (showInstallStep ? 7 : 6) && (s6sub === "pin1" || s6sub === "pin2") && (
                <button
                  onClick={() => { setPin1([]); setPin2([]); setS6sub("intro"); }}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '0.8125rem', cursor: 'pointer', padding: '0.75rem 1rem', minHeight: '44px' }}
                >
                  ← Terug
                </button>
              )}

              {step === (showInstallStep ? 7 : 6) && s6sub === "biometric" && (
                <>
                  <button
                    onClick={handleEnableBio}
                    disabled={bioLoading}
                    style={{ ...BTN_PRIMARY, background: bioLoading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, var(--accent), var(--accent2))', color: bioLoading ? 'rgba(255,255,255,0.4)' : 'var(--on-accent)', cursor: bioLoading ? 'default' : 'pointer' }}
                  >
                    {bioLoading ? 'Even wachten…' : 'Face ID / vingerafdruk inschakelen'}
                  </button>
                  <button onClick={advance} style={BTN_SECONDARY}>Nee, alleen PIN</button>
                </>
              )}

              {/* Age gate */}
              {step === (showInstallStep ? 8 : 7) && (
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

            {step === 0 && (
              <button
                onClick={onComplete}
                style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem', cursor: 'pointer', padding: '0.75rem 1rem', minHeight: '44px' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)'; }}
                aria-label="Sla de introductie over"
              >
                Sla over
              </button>
            )}

            <div style={{ position: 'fixed', bottom: '2rem', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '0.5rem' }} aria-hidden="true">
              {Array.from({ length: (showInstallStep ? TOTAL_STEPS + 2 : TOTAL_STEPS + 1) }, (_, i) => i).map(i => (
                <div key={i} style={{
                  height: 4,
                  width: i === step ? 24 : 8,
                  borderRadius: 999,
                  background: i === step ? 'var(--accent)' : 'rgba(255,255,255,0.2)',
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

/* ── Step content components ─────────────────────────────────────────────── */

function Step0Content() {
  return (
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h1 style={{ color: '#fff', fontSize: '2.25rem', fontWeight: 700, letterSpacing: '0.08em', margin: 0, animation: 'ks-fade-in 1s ease forwards', opacity: 0 }}>
        KinkSync
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem', animation: 'ks-fade-in 1s ease 0.5s forwards', opacity: 0 }}>
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
        <div style={{ background: 'rgba(192,132,252,0.06)', border: '1px solid rgba(192,132,252,0.12)', borderRadius: '0.75rem', padding: '0.75rem 1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '0.25rem' }}>De app</div>
          Geen account, geen server, geen tracking. Alles staat in je browser en nergens anders.
        </div>
        <div style={{ background: 'rgba(192,132,252,0.06)', border: '1px solid rgba(192,132,252,0.12)', borderRadius: '0.75rem', padding: '0.75rem 1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '0.25rem' }}>Live sessie</div>
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
        Exporteer je profiel via <strong style={{ color: 'rgba(255,255,255,0.7)' }}>⚙ Instellingen</strong> en bewaar het bestand veilig.
      </p>
    </div>
  );
}

const FEATURE_ROWS: { icon: string; title: string; sub: string }[] = [
  { icon: '👤', title: 'Profiel',        sub: 'Foto, rol, FetLife-link — allemaal optioneel' },
  { icon: '🏷',  title: 'Kinks',          sub: 'Ja / graag / misschien / nee / harde grens' },
  { icon: '⚡',  title: 'Vergelijken',    sub: 'Zie direct waar jullie overlap zit' },
  { icon: '📡',  title: 'Live sessie',    sub: 'End-to-end versleuteld — vergelijk live op afstand' },
  { icon: '🎬',  title: 'Scène planner', sub: 'Plan elke scène tot in detail' },
  { icon: '✍',  title: 'Contract',       sub: 'Safeword, aftercare, handtekening → PDF' },
];

function Step3Content() {
  return (
    <div style={{ maxWidth: '26rem', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff', marginBottom: '1.5rem', animation: 'ks-slide-up 0.4s ease 0.05s both', opacity: 0 }}>
        Wat kun je doen?
      </h2>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {FEATURE_ROWS.map((f, i) => (
          <div key={f.title} style={{
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

// Android install step
function StepInstallAndroidContent() {
  return (
    <div style={{ maxWidth: '22rem', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={ICON_CIRCLE} aria-hidden="true"><span style={{ fontSize: '2.25rem' }}>📲</span></div>
      <h2 style={TITLE}>Installeer KinkSync</h2>
      <p style={{ ...BODY, textAlign: 'center' }}>
        Voeg de app toe aan je startscherm voor de beste ervaring — volledig offline, geen browser-balk.
      </p>
    </div>
  );
}

// iOS install step — inline instructions so no PwaInstallGuide z-index conflict
function StepInstallIosContent() {
  return (
    <div style={{ maxWidth: '22rem', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={ICON_CIRCLE} aria-hidden="true"><span style={{ fontSize: '2.25rem' }}>📲</span></div>
      <h2 style={TITLE}>Installeer op iOS</h2>
      <div style={{ ...BODY, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {[
          { n: '1', t: 'Tik op het Deel-icoon', s: 'De vierkant-met-pijl onderaan Safari' },
          { n: '2', t: '"Zet op beginscherm"', s: 'Scroll naar beneden in het deelmenu' },
          { n: '3', t: 'Tik op "Voeg toe"', s: 'KinkSync verschijnt op je beginscherm' },
        ].map(({ n, t, s }) => (
          <div key={n} style={{ display: 'flex', gap: '0.875rem', background: 'rgba(192,132,252,0.06)', border: '1px solid rgba(192,132,252,0.12)', borderRadius: '0.75rem', padding: '0.75rem 1rem', alignItems: 'flex-start' }}>
            <span style={{ width: '1.5rem', height: '1.5rem', borderRadius: '9999px', background: 'rgba(192,132,252,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(192,132,252,1)', flexShrink: 0 }}>{n}</span>
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff', marginBottom: '0.125rem' }}>{t}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{s}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const THEMES = [
  { value: 'midnight' as const, label: 'Midnight', color: '#c084fc' },
  { value: 'red'      as const, label: 'Deep Red', color: '#ef4444' },
  { value: 'forest'   as const, label: 'Forest',   color: '#4ade80' },
  { value: 'mono'     as const, label: 'Mono',     color: '#e5e5e5' },
];

function Step5ThemeContent() {
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
        display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem',
        animation: 'ks-slide-up 0.4s ease 0.15s both', opacity: 0,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.125rem' }}>Voorbeeld</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>Zo ziet de app eruit</div>
        </div>
        <div style={{ background: 'var(--accent)', color: '#000', borderRadius: '9999px', padding: '0.3125rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>Ja</div>
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
      <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem' }}>
        {sub === "pin1" ? "Kies een code van 4 cijfers" : "Voer je PIN nog een keer in"}
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.875rem', marginBottom: '1.5rem', animation: shake ? 'ks-shake 0.4s ease' : 'none' }}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <div key={i} style={{
            width: 12, height: 12, borderRadius: '9999px',
            background: i < digits.length ? 'var(--accent)' : 'rgba(255,255,255,0.2)',
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
              background: k ? 'rgba(255,255,255,0.07)' : 'transparent',
              border: k ? '1px solid rgba(255,255,255,0.12)' : 'none',
              color: k === '⌫' ? 'rgba(255,255,255,0.5)' : '#fff',
              fontSize: k === '⌫' ? '1.125rem' : '1.375rem',
              opacity: !k ? 0 : 1,
              transition: 'opacity 150ms ease, background 150ms ease',
            }}
            onPointerDown={e => { if (k) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.14)'; }}
            onPointerUp={e => { if (k) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'; }}
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
        <p style={{ fontSize: '0.8125rem', color: 'rgba(255,100,100,0.9)', marginBottom: '1rem' }}>{bioError}</p>
      )}
    </div>
  );
}

function Step7Content() {
  return (
    <div style={{ maxWidth: '20rem', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ fontSize: '2.25rem', marginBottom: '1.5rem', animation: 'ks-icon-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both', opacity: 0 }} aria-hidden="true">🔞</div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff', marginBottom: '1rem' }}>Voor volwassenen</h2>
      <p style={{ ...BODY, animation: 'ks-slide-up 0.4s ease 0.15s both' }}>
        Hier praten we open over kinks, grenzen en alles daartussen.
        Ga alleen verder als je 18 jaar of ouder bent.
      </p>
    </div>
  );
}
