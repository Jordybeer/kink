'use client';

import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PenNib, ShieldCheck, Heart, Lock, Fingerprint, ShieldWarning, HeartBreak } from '@phosphor-icons/react';
import { useStore } from '@/lib/store';
import Wordmark from '@/components/Wordmark';
import { hashPin } from '@/lib/crypto';
import { isPlatformAuthenticatorAvailable, registerBiometric } from '@/lib/webauthn';
import { useMotionSafe, TAP_SPRING, STAGGER_CHILDREN, fadeUp, SHAKE_ANIM } from '@/lib/motion';

interface OnboardingProps {
  onComplete: () => void;
}

const ICON_CIRCLE: React.CSSProperties = {
  width: '6rem', height: '6rem', borderRadius: '9999px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'color-mix(in srgb, var(--accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
  marginBottom: '2rem',
};
const TITLE: React.CSSProperties = {
  fontFamily: "var(--font-display, Georgia, serif)", fontStyle: 'italic', fontWeight: 500,
  fontSize: '1.875rem', color: 'var(--text)', marginBottom: '0.875rem', lineHeight: 1.2,
};
const BODY: React.CSSProperties = {
  fontSize: '0.875rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '2rem',
};
const CARD: React.CSSProperties = {
  background: 'color-mix(in srgb, var(--accent) 6%, transparent)',
  border: '1px solid color-mix(in srgb, var(--accent) 12%, transparent)',
  borderRadius: '0.75rem', padding: '0.75rem 1rem', textAlign: 'left',
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

// The fixed slot where all continue/action buttons live — outside the animated
// step container (transforms break fixed positioning, learned the hard way).
const ACTION_BAR: React.CSSProperties = {
  position: 'fixed', bottom: '5rem', left: 0, right: 0,
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  gap: '0.75rem', padding: '0 2rem',
};

const PIN_KEYS = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
const PIN_LENGTH = 4;

// The dramaturgy: welcome → the door (18+) → trust → consent → slot → eerste profiel.
// The age gate stands at the entrance, not the exit; the finale hands off into the app.
const STEP_COUNT = 6;

type LockSub = "intro" | "pin1" | "pin2" | "biometric";

const childV = fadeUp(10);

export default function Onboarding({ onComplete }: OnboardingProps) {
  const t = useMotionSafe();
  const [step, setStep] = useState(0);
  const [lockout, setLockout] = useState(false);
  // "Sla over" jumps to the age gate — never around it. Passing it then completes.
  const [skipRequested, setSkipRequested] = useState(false);

  // Lock-step state lives here so action buttons can render outside the animated div
  const [lockSub, setLockSub] = useState<LockSub>("intro");
  const [pin1, setPin1] = useState<string[]>([]);
  const [pin2, setPin2] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);

  const setAppLockPin = useStore((s) => s.setAppLockPin);
  const enableBiometric = useStore((s) => s.enableBiometric);

  useEffect(() => { isPlatformAuthenticatorAvailable().then(setBioAvailable); }, []);

  const advance = useCallback(() => setStep(s => s + 1), []);

  function passGate() {
    if (skipRequested) onComplete();
    else advance();
  }

  async function handlePinKey(k: string) {
    const active = lockSub === "pin1" ? pin1 : pin2;
    const setActive = lockSub === "pin1" ? setPin1 : setPin2;
    if (k === "⌫") { setActive(d => d.slice(0, -1)); return; }
    if (active.length >= PIN_LENGTH) return;
    const next = [...active, k];
    setActive(next);
    if (next.length < PIN_LENGTH) return;
    if (lockSub === "pin1") { setLockSub("pin2"); return; }
    if (next.join("") !== pin1.join("")) {
      setShake(true);
      setTimeout(() => { setShake(false); setPin1([]); setPin2([]); setLockSub("pin1"); }, 500);
      return;
    }
    const hash = await hashPin(next.join(""));
    // Whoever just chose this PIN is standing right here — mark the session
    // unlocked BEFORE the store flips appLockEnabled, or HomeContent trades
    // the wizard for the lock screen and the wizard forgets its page.
    sessionStorage.setItem("app_unlocked", "1");
    setAppLockPin(hash);
    if (bioAvailable) setLockSub("biometric"); else advance();
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

  const currentDigits = lockSub === "pin1" ? pin1 : pin2;
  const barKey = step === 4 ? `4-${lockSub}` : String(step);

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'var(--bg)', transition: 'background 200ms ease', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
      role="dialog" aria-modal="true" aria-label="Welkom bij KinkSync"
    >
      {lockout ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={t.fast}
          style={{ position: 'fixed', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', textAlign: 'center', padding: '0 2rem' }}
        >
          <div style={{ marginBottom: '1.5rem', color: 'var(--text2)' }} aria-hidden="true"><HeartBreak size={36} /></div>
          <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.75rem' }}>Kom terug als je 18 bent.</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text2)' }}>KinkSync is alleen voor volwassenen.</p>
        </motion.div>
      ) : (
        <>
          {/* ── Animated step stage — NO buttons here (transform breaks fixed positioning) ── */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 16, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98, transition: t.exit }}
              transition={t.enter}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 1.5rem 14rem', overflowY: 'auto', maxHeight: '100dvh' }}
            >
              <motion.div
                variants={STAGGER_CHILDREN} initial="hidden" animate="show"
                style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              >
                {step === 0 && <Step0Welcome />}
                {step === 1 && <Step1Gate />}
                {step === 2 && <Step2Data />}
                {step === 3 && <Step3Consent />}
                                {step === 4 && lockSub === "intro" && <StepLockIntro bioAvailable={bioAvailable} />}
                {step === 4 && lockSub === "biometric" && <StepBio bioError={bioError} />}
                {step === 4 && (lockSub === "pin1" || lockSub === "pin2") && (
                  <StepPin sub={lockSub} digits={currentDigits} shake={shake} onKey={handlePinKey} />
                )}
                {step === 5 && <StepFinale />}
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {/* ── Fixed action bar — always at the same spot, never inside a transform ── */}
          <div style={ACTION_BAR}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={barKey}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={t.fast}
                style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}
              >
                {step === 0 && (
                  <>
                    <motion.button whileTap={TAP_SPRING} onClick={advance} style={BTN_GHOST}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
                    >
                      Begin
                    </motion.button>
                    <motion.button whileTap={TAP_SPRING}
                      onClick={() => { setSkipRequested(true); setStep(1); }}
                      style={BTN_SECONDARY}
                      aria-label="Sla de introductie over"
                    >
                      Sla over
                    </motion.button>
                  </>
                )}

                {step === 1 && (
                  <>
                    <motion.button whileTap={TAP_SPRING} onClick={passGate} style={BTN_PRIMARY}>
                      Ja, ik ben 18+
                    </motion.button>
                    <motion.button whileTap={TAP_SPRING} onClick={() => setLockout(true)} style={BTN_SECONDARY}>
                      Ik ben jonger
                    </motion.button>
                  </>
                )}

                {step >= 2 && step <= 3 && (
                  <motion.button whileTap={TAP_SPRING} onClick={advance} style={BTN_GHOST}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
                  >
                    {step === 3 ? 'Ga door →' : 'Volgende →'}
                  </motion.button>
                )}

                {step === 4 && lockSub === "intro" && (
                  <>
                    <motion.button whileTap={TAP_SPRING} onClick={() => setLockSub("pin1")} style={BTN_PRIMARY}>PIN instellen</motion.button>
                    <motion.button whileTap={TAP_SPRING} onClick={advance} style={BTN_SECONDARY}>Sla over</motion.button>
                  </>
                )}

                {step === 4 && (lockSub === "pin1" || lockSub === "pin2") && (
                  <motion.button whileTap={TAP_SPRING}
                    onClick={() => { setPin1([]); setPin2([]); setLockSub("intro"); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: '0.8125rem', cursor: 'pointer', padding: '0.75rem 1rem', minHeight: '44px' }}
                  >
                    ← Terug
                  </motion.button>
                )}

                {step === 4 && lockSub === "biometric" && (
                  <>
                    <motion.button whileTap={TAP_SPRING}
                      onClick={handleEnableBio}
                      disabled={bioLoading}
                      style={{ ...BTN_PRIMARY, background: bioLoading ? 'var(--surface2)' : 'linear-gradient(135deg, var(--accent), var(--accent2))', color: bioLoading ? 'var(--text2)' : 'var(--on-accent)', cursor: bioLoading ? 'default' : 'pointer' }}
                    >
                      {bioLoading ? 'Even wachten…' : 'Face ID / vingerafdruk inschakelen'}
                    </motion.button>
                    <motion.button whileTap={TAP_SPRING} onClick={advance} style={BTN_SECONDARY}>Nee, alleen PIN</motion.button>
                  </>
                )}

                {step === 5 && (
                  <motion.button whileTap={TAP_SPRING} onClick={onComplete} style={BTN_PRIMARY}>
                    Maak je eerste profiel
                  </motion.button>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Progress dots */}
          <div style={{ position: 'fixed', bottom: '2rem', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '0.5rem' }} aria-hidden="true">
            {Array.from({ length: STEP_COUNT }, (_, i) => i).map(i => (
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
  );
}

/* ── Step content components (pure content, no buttons) ─────────────────── */

function Step0Welcome() {
  return (
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      {/* Ambient glow behind the wordmark */}
      <motion.div aria-hidden="true"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5, delay: 0.3 }}
        style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -60%)',
          width: '18rem', height: '10rem',
          background: 'radial-gradient(ellipse at center, var(--accent-glow) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
      <motion.h1 variants={childV} style={{ fontSize: '2.25rem', fontWeight: 700, margin: 0, position: 'relative' }}>
        <Wordmark style={{ letterSpacing: '0.08em' }} />
      </motion.h1>
      <motion.p variants={childV} style={{ fontSize: '0.875rem', color: 'var(--text2)', marginTop: '0.5rem', position: 'relative' }}>
        Verken grenzen. Samen.
      </motion.p>
    </div>
  );
}

function Step1Gate() {
  return (
    <div style={{ maxWidth: '22rem', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <motion.div variants={childV} style={{ ...ICON_CIRCLE, color: 'var(--accent)' }} aria-hidden="true"><ShieldWarning size={48} /></motion.div>
      <motion.h2 variants={childV} style={TITLE}>Voor volwassenen</motion.h2>
      <motion.div variants={childV} style={{ ...BODY, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <p style={{ margin: 0 }}>Hier praten we open over kinks, grenzen en alles daartussen.</p>
        <p style={{ margin: 0 }}>Ga alleen verder als je 18 jaar of ouder bent.</p>
      </motion.div>
    </div>
  );
}

function Step2Data() {
  return (
    <div style={{ maxWidth: '22rem', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <motion.div variants={childV} style={{ ...ICON_CIRCLE, color: 'var(--accent)' }} aria-hidden="true"><ShieldCheck size={48} /></motion.div>
      <motion.h2 variants={childV} style={TITLE}>Jouw data verlaat dit apparaat nooit</motion.h2>
      <div style={{ ...BODY, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
        <motion.div variants={childV} style={CARD}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem' }}>De app</div>
          Geen account, geen server, geen tracking. Eenmaal op je beginscherm werkt de app volledig offline.
        </motion.div>
        <motion.div variants={childV} style={CARD}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem' }}>Live sessie</div>
          End-to-end versleuteld — ook wij kunnen niet meelezen. Je kinks en naam verlaten je toestel nooit.
        </motion.div>
        <motion.div variants={childV} style={CARD}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem' }}>Back-up</div>
          Jij bent je eigen cloud: exporteer een back-up via <strong style={{ color: 'var(--text)' }}>Instellingen</strong> en bewaar het bestand veilig.
        </motion.div>
      </div>
    </div>
  );
}

function Step3Consent() {
  return (
    <div style={{ maxWidth: '22rem', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <motion.div variants={childV} style={{ ...ICON_CIRCLE, color: 'var(--text)' }} aria-hidden="true"><Heart size={48} /></motion.div>
      <motion.h2 variants={childV} style={TITLE}>Consent, altijd</motion.h2>
      <motion.p variants={childV} style={{
        fontFamily: "var(--font-display, Georgia, serif)", fontStyle: 'italic', fontWeight: 500,
        fontSize: '1.25rem', lineHeight: 1.4, color: 'var(--text)', margin: '0 0 1rem',
      }}>
        Safewords zijn heilig.<br />Grenzen zijn wet.
      </motion.p>
      <motion.p variants={childV} style={{ ...BODY, textAlign: 'center', margin: 0 }}>
        KinkSync is een startpunt voor het gesprek — nooit een vervanging ervan. Niets hier is een afspraak totdat jullie het samen zeggen.
      </motion.p>
    </div>
  );
}

function StepLockIntro({ bioAvailable }: { bioAvailable: boolean }) {
  return (
    <div style={{ maxWidth: '22rem', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <motion.div variants={childV} style={{ ...ICON_CIRCLE, color: 'var(--accent)' }} aria-hidden="true"><Lock size={48} /></motion.div>
      <motion.h2 variants={childV} style={TITLE}>Vergrendel de app</motion.h2>
      <motion.div variants={childV} style={{ ...BODY, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <p style={{ margin: 0 }}>Bescherm je kinks met een PIN{bioAvailable ? ' of Face ID / vingerafdruk' : ''}.</p>
        <p style={{ margin: 0 }}>Optioneel — je kunt dit ook later instellen.</p>
      </motion.div>
    </div>
  );
}

function StepPin({ sub, digits, shake, onKey }: { sub: "pin1" | "pin2"; digits: string[]; shake: boolean; onKey: (k: string) => void }) {
  return (
    <div style={{ maxWidth: '18rem', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <motion.h2 variants={childV} style={TITLE}>{sub === "pin1" ? "Kies een PIN" : "Bevestig je PIN"}</motion.h2>
      <motion.p variants={childV} style={{ fontSize: '0.8125rem', color: 'var(--text2)', marginBottom: '1.5rem' }}>
        {sub === "pin1" ? "Kies een code van 4 cijfers" : "Voer je PIN nog een keer in"}
      </motion.p>
      <motion.div
        variants={childV}
        animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : undefined}
        transition={shake ? SHAKE_ANIM : undefined}
        style={{ display: 'flex', justifyContent: 'center', gap: '0.875rem', marginBottom: '1.5rem' }}
      >
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <div key={i} style={{
            width: 12, height: 12, borderRadius: '9999px',
            background: i < digits.length ? 'var(--accent)' : 'var(--border)',
            transition: 'background 150ms ease',
          }} />
        ))}
      </motion.div>
      <motion.div variants={childV} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', width: '100%' }}>
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
      </motion.div>
    </div>
  );
}

function StepBio({ bioError }: { bioError: string | null }) {
  return (
    <div style={{ maxWidth: '22rem', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <motion.div variants={childV} style={{ ...ICON_CIRCLE, color: 'var(--accent)' }} aria-hidden="true"><Fingerprint size={48} /></motion.div>
      <motion.h2 variants={childV} style={TITLE}>PIN ingesteld!</motion.h2>
      <motion.p variants={childV} style={{ ...BODY, textAlign: 'center' }}>
        Wil je ook Face ID of vingerafdruk inschakelen? Je PIN blijft altijd beschikbaar als terugval.
      </motion.p>
      {bioError && (
        <motion.p variants={childV} style={{ fontSize: '0.8125rem', color: 'var(--hard-no)', marginBottom: '1rem' }}>{bioError}</motion.p>
      )}
    </div>
  );
}

function StepFinale() {
  return (
    <div style={{ maxWidth: '22rem', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <motion.div variants={childV} style={{ ...ICON_CIRCLE, color: 'var(--accent)' }} aria-hidden="true"><PenNib size={48} /></motion.div>
      <motion.h2 variants={childV} style={TITLE}>Het speelveld is van jou</motion.h2>
      <motion.div variants={childV} style={{ ...BODY, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <p style={{ margin: 0 }}>Begin met je eigen profiel — kinks, grenzen, verlangens.</p>
        <p style={{ margin: 0 }}>Alles op jouw tempo. Alles blijft van jou.</p>
      </motion.div>
    </div>
  );
}
