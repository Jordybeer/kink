'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Fingerprint,
  HeartBreak,
  Lock,
  QrCode,
  ShieldWarning,
  Sparkle,
  UsersThree,
} from '@phosphor-icons/react';
import { useStore } from '@/lib/store';
import Wordmark from '@/components/Wordmark';
import ProfileCreateSheet from '@/components/ProfileCreateSheet';
import { hashPin } from '@/lib/crypto';
import { isPlatformAuthenticatorAvailable, registerBiometric } from '@/lib/webauthn';
import { useMotionSafe, TAP_SPRING, STAGGER_CHILDREN, fadeUp, SHAKE_ANIM } from '@/lib/motion';

interface OnboardingProps {
  onComplete: () => void;
}

const PIN_KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
const PIN_LENGTH = 4;
const STEP_COUNT = 6;
type LockSub = 'intro' | 'pin1' | 'pin2' | 'biometric';
const childV = fadeUp(10);

const primaryButton: React.CSSProperties = {
  background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
  color: 'var(--on-accent)',
  fontWeight: 650,
};

export default function Onboarding({ onComplete }: OnboardingProps) {
  const t = useMotionSafe();
  const [step, setStep] = useState(0);
  const [lockout, setLockout] = useState(false);
  const [skipRequested, setSkipRequested] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [lockSub, setLockSub] = useState<LockSub>('intro');
  const [pin1, setPin1] = useState<string[]>([]);
  const [pin2, setPin2] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);

  const setAppLockPin = useStore((s) => s.setAppLockPin);
  const enableBiometric = useStore((s) => s.enableBiometric);

  useEffect(() => { isPlatformAuthenticatorAvailable().then(setBioAvailable); }, []);
  const advance = useCallback(() => setStep((current) => current + 1), []);

  function passGate() {
    // Een skip mag de rondleiding inkorten, nooit de consent-boodschap omzeilen.
    if (skipRequested) setStep(3);
    else advance();
  }

  async function handlePinKey(key: string) {
    const active = lockSub === 'pin1' ? pin1 : pin2;
    const setActive = lockSub === 'pin1' ? setPin1 : setPin2;
    if (key === '⌫') { setActive((digits) => digits.slice(0, -1)); return; }
    if (active.length >= PIN_LENGTH) return;
    const next = [...active, key];
    setActive(next);
    if (next.length < PIN_LENGTH) return;
    if (lockSub === 'pin1') { setLockSub('pin2'); return; }
    if (next.join('') !== pin1.join('')) {
      setShake(true);
      window.setTimeout(() => {
        setShake(false); setPin1([]); setPin2([]); setLockSub('pin1');
      }, 500);
      return;
    }
    const hash = await hashPin(next.join(''));
    sessionStorage.setItem('app_unlocked', '1');
    setAppLockPin(hash);
    if (bioAvailable) setLockSub('biometric');
    else advance();
  }

  async function handleEnableBio() {
    setBioLoading(true); setBioError(null);
    try {
      const credId = await registerBiometric();
      enableBiometric(credId);
      advance();
    } catch {
      setBioError('Registratie mislukt. Je kunt biometrie later inschakelen via Instellingen.');
      setBioLoading(false);
    }
  }

  const currentDigits = lockSub === 'pin1' ? pin1 : pin2;
  const barKey = step === 4 ? `4-${lockSub}` : String(step);

  return (
    <div className="fixed inset-0 z-[500] grid min-h-[100dvh] grid-rows-[auto_1fr_auto] overflow-hidden" style={{ background: 'var(--bg)' }} role="dialog" aria-modal="true" aria-label="Welkom bij KinkSync">
      {lockout ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={t.fast} className="absolute inset-0 z-10 flex flex-col items-center justify-center px-8 text-center" style={{ background: 'var(--bg)' }}>
          <HeartBreak size={34} aria-hidden="true" style={{ color: 'var(--text2)' }} />
          <h2 className="serif-safe mt-5 text-3xl" style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontWeight: 500 }}>Kom terug als je 18 bent.</h2>
          <p className="mt-3 text-sm" style={{ color: 'var(--text2)' }}>KinkSync is alleen voor volwassenen.</p>
        </motion.div>
      ) : (
        <>
          <div className="px-5 pt-[max(1rem,env(safe-area-inset-top))]">
            <div className="mx-auto flex max-w-sm items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text2)' }}>KinkSync</span>
              <span className="text-xs tabular-nums" style={{ color: 'var(--text2)' }}>{step + 1} / {STEP_COUNT}</span>
            </div>
            <div className="mx-auto mt-3 grid max-w-sm grid-cols-6 gap-1.5" aria-hidden="true">
              {Array.from({ length: STEP_COUNT }, (_, index) => (
                <div key={index} className="h-1 rounded-full transition-colors" style={{ background: index <= step ? 'var(--accent)' : 'var(--surface3)' }} />
              ))}
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5 sm:py-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={step} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={t.enter} className="mx-auto flex min-h-full w-full max-w-sm items-center">
                <motion.div variants={STAGGER_CHILDREN} initial="hidden" animate="show" className="w-full">
                  {step === 0 && <Welcome />}
                  {step === 1 && <AgeGate />}
                  {step === 2 && <Discover />}
                  {step === 3 && <Together />}
                  {step === 4 && lockSub === 'intro' && <Privacy bioAvailable={bioAvailable} />}
                  {step === 4 && lockSub === 'biometric' && <Biometric bioError={bioError} />}
                  {step === 4 && (lockSub === 'pin1' || lockSub === 'pin2') && <Pin sub={lockSub} digits={currentDigits} shake={shake} onKey={handlePinKey} />}
                  {step === 5 && <Finale />}
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3" style={{ background: 'linear-gradient(to top, var(--bg) 78%, transparent)' }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={barKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={t.fast} className="mx-auto flex w-full max-w-sm flex-col gap-2.5">
                {step === 0 && <><Action primary onClick={advance}>Begin</Action><Action onClick={() => { setSkipRequested(true); setStep(1); }} ariaLabel="Sla de introductie over">Sla intro over</Action></>}
                {step === 1 && <><Action primary onClick={passGate}>Ja, ik ben 18+</Action><Action onClick={() => setLockout(true)}>Ik ben jonger</Action></>}
                {step === 2 && <Action primary onClick={advance}>Kom maar door <ArrowRight size={15} aria-hidden="true" /></Action>}
                {step === 3 && <Action primary onClick={skipRequested ? onComplete : advance}>{skipRequested ? 'Naar KinkSync' : 'Verder'} <ArrowRight size={15} aria-hidden="true" /></Action>}
                {step === 4 && lockSub === 'intro' && <><Action primary onClick={() => setLockSub('pin1')}>PIN instellen</Action><Action onClick={advance}>Niet nu</Action></>}
                {step === 4 && (lockSub === 'pin1' || lockSub === 'pin2') && <Action onClick={() => { setPin1([]); setPin2([]); setLockSub('intro'); }}><ArrowLeft size={15} aria-hidden="true" /> Terug</Action>}
                {step === 4 && lockSub === 'biometric' && <><Action primary onClick={handleEnableBio} disabled={bioLoading}>{bioLoading ? 'Even wachten…' : 'Biometrie inschakelen'}</Action><Action onClick={advance}>Alleen PIN</Action></>}
                {step === 5 && <Action primary onClick={() => setProfileOpen(true)}>Maak mijn profiel <ArrowRight size={15} aria-hidden="true" /></Action>}
              </motion.div>
            </AnimatePresence>
          </div>
        </>
      )}

      <ProfileCreateSheet open={profileOpen} onClose={() => { setProfileOpen(false); onComplete(); }} />
    </div>
  );
}

function Action({ children, onClick, primary = false, disabled = false, ariaLabel }: { children: React.ReactNode; onClick: () => void; primary?: boolean; disabled?: boolean; ariaLabel?: string }) {
  return (
    <motion.button
      whileTap={disabled ? undefined : TAP_SPRING}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="focus-ring flex min-h-12 w-full items-center justify-center gap-1.5 rounded-full border px-5 text-sm transition-opacity disabled:cursor-default disabled:opacity-50"
      style={primary ? { ...primaryButton, borderColor: 'transparent' } : { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text2)' }}
    >
      {children}
    </motion.button>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <motion.p variants={childV} className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>{children}</motion.p>;
}

function Title({ children }: { children: React.ReactNode }) {
  return <motion.h2 variants={childV} className="serif-safe mt-2 text-[2rem] leading-[1.05]" style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontWeight: 500 }}>{children}</motion.h2>;
}

function Welcome() {
  return (
    <div className="relative py-4 text-center">
      <motion.div aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5, delay: 0.2 }} className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" style={{ background: 'var(--accent-glow)' }} />
      <motion.h1 variants={childV} className="relative text-5xl"><Wordmark /></motion.h1>
      <motion.p variants={childV} className="relative mx-auto mt-7 max-w-xs text-lg font-medium leading-7">Ontdek samen wat jullie leuk vinden, willen proberen of liever laten.</motion.p>
      <motion.p variants={childV} className="relative mx-auto mt-3 max-w-xs text-sm leading-6" style={{ color: 'var(--text2)' }}>En misschien een paar dingen waar jullie nog niet aan gedacht hadden.</motion.p>
    </div>
  );
}

function AgeGate() {
  return (
    <div>
      <motion.div variants={childV} className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'var(--surface2)', color: 'var(--accent)' }}><ShieldWarning size={22} aria-hidden="true" /></motion.div>
      <Eyebrow>Voor we beginnen</Eyebrow>
      <Title>18+?</Title>
      <motion.p variants={childV} className="mt-5 text-base leading-7" style={{ color: 'var(--text2)' }}>KinkSync bevat volwassen onderwerpen. Seks, kink en alles wat daarbij komt kijken.</motion.p>
      <motion.p variants={childV} className="mt-3 text-sm leading-6" style={{ color: 'var(--text2)' }}>Dus deze moeten we even vragen.</motion.p>
    </div>
  );
}

const statuses = [
  ['Heel graag', 'var(--yes)'],
  ['Ja', 'var(--willing)'],
  ['Misschien', 'var(--maybe)'],
  ['Voor hen', 'var(--no)'],
  ['Harde grens', 'var(--hard-no)'],
] as const;

function Discover() {
  return (
    <div>
      <Eyebrow>Jouw profiel</Eyebrow>
      <Title>Waar sta jij voor open?</Title>
      <motion.p variants={childV} className="mt-4 text-sm leading-6" style={{ color: 'var(--text2)' }}>We stellen je vragen. Jij kiest wat erbij past.</motion.p>
      <motion.div variants={childV} className="mt-5 overflow-hidden rounded-2xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <Sparkle size={17} aria-hidden="true" style={{ color: 'var(--accent)' }} />
          <span className="text-sm font-semibold">Een kink die je aandacht trekt</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {statuses.map(([label, color]) => <span key={label} className="rounded-full border px-2.5 py-1 text-[11px] font-medium" style={{ borderColor: `color-mix(in srgb, ${color} 45%, var(--border))`, color }}>{label}</span>)}
        </div>
      </motion.div>
      <motion.p variants={childV} className="mt-5 text-sm leading-6" style={{ color: 'var(--text2)' }}>Op sommige antwoorden gaan we wat dieper in. Andere laten we lekker met rust.</motion.p>
      <motion.p variants={childV} className="mt-2 text-sm font-medium">We nemen trouwens niets voor je aan.</motion.p>
    </div>
  );
}

function Together() {
  return (
    <div>
      <Eyebrow>Samen</Eyebrow>
      <Title>Nodig iemand uit.</Title>
      <motion.p variants={childV} className="mt-4 text-base leading-7">Want hier wordt KinkSync leuk.</motion.p>
      <motion.div variants={childV} className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="rounded-xl p-3 text-center" style={{ background: 'var(--surface2)' }}><span className="text-xs font-semibold">Jij</span></div>
        <UsersThree size={19} aria-hidden="true" style={{ color: 'var(--accent)' }} />
        <div className="rounded-xl p-3 text-center" style={{ background: 'var(--surface2)' }}><span className="text-xs font-semibold">De ander</span></div>
      </motion.div>
      <motion.p variants={childV} className="mt-5 text-sm leading-6" style={{ color: 'var(--text2)' }}>Leg jullie profielen naast elkaar en ontdek wat jullie allebei willen, waar jullie anders over denken en waar de grens ligt.</motion.p>
      <motion.div variants={childV} className="mt-4 rounded-xl border-l-2 py-1 pl-3 text-sm leading-6" style={{ borderColor: 'var(--accent)', color: 'var(--text)' }}><strong>Een match is geen toestemming.</strong> Blijf praten.</motion.div>
    </div>
  );
}

function Privacy({ bioAvailable }: { bioAvailable: boolean }) {
  return (
    <div>
      <Eyebrow>Privé</Eyebrow>
      <Title>Wat hier gebeurt, blijft hier.</Title>
      <motion.p variants={childV} className="mt-3 text-base">Nou ja. Tot jij op delen drukt.</motion.p>
      <motion.div variants={childV} className="mt-5 rounded-2xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-start gap-3"><Lock size={20} className="mt-0.5 flex-none" aria-hidden="true" style={{ color: 'var(--accent)' }} /><div><p className="text-sm font-semibold">Op jouw toestel</p><p className="mt-1 text-xs leading-5" style={{ color: 'var(--text2)' }}>Profielen, antwoorden en contracten. Geen account of centrale database.</p></div></div>
        <div className="my-4 h-px" style={{ background: 'var(--border)' }} />
        <div className="flex items-start gap-3"><QrCode size={20} className="mt-0.5 flex-none" aria-hidden="true" style={{ color: 'var(--accent)' }} /><div><p className="text-sm font-semibold">Jij kiest wat vertrekt</p><p className="mt-1 text-xs leading-5" style={{ color: 'var(--text2)' }}>Via QR, link, export of back-up. Niets synchroniseert stilletjes.</p></div></div>
      </motion.div>
      <motion.p variants={childV} className="mt-5 text-sm leading-6" style={{ color: 'var(--text2)' }}>Wil je nieuwsgierige vingers buiten houden? Zet er een PIN{bioAvailable ? ' en eventueel biometrie' : ''} op.</motion.p>
    </div>
  );
}

function Pin({ sub, digits, shake, onKey }: { sub: 'pin1' | 'pin2'; digits: string[]; shake: boolean; onKey: (key: string) => void }) {
  return (
    <div className="mx-auto max-w-[18rem] text-center">
      <Title>{sub === 'pin1' ? 'Kies een PIN' : 'Nog één keer.'}</Title>
      <motion.p variants={childV} className="mt-3 text-sm" style={{ color: 'var(--text2)' }}>{sub === 'pin1' ? 'Vier cijfers. Hou ze voor jezelf.' : 'Voer dezelfde PIN opnieuw in.'}</motion.p>
      <motion.div variants={childV} animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : undefined} transition={shake ? SHAKE_ANIM : undefined} className="my-5 flex justify-center gap-3.5">
        {Array.from({ length: PIN_LENGTH }, (_, index) => <div key={index} className="h-3 w-3 rounded-full" style={{ background: index < digits.length ? 'var(--accent)' : 'var(--border)' }} />)}
      </motion.div>
      <motion.div variants={childV} className="grid grid-cols-3 gap-2">
        {PIN_KEYS.map((key, index) => <button key={index} type="button" onClick={() => key && onKey(key)} disabled={!key} className="focus-ring h-12 rounded-xl border text-lg font-semibold disabled:opacity-0" style={{ background: key ? 'var(--surface2)' : 'transparent', borderColor: key ? 'var(--border)' : 'transparent', color: key === '⌫' ? 'var(--text2)' : 'var(--text)' }}>{key}</button>)}
      </motion.div>
    </div>
  );
}

function Biometric({ bioError }: { bioError: string | null }) {
  return (
    <div>
      <motion.div variants={childV} className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'var(--surface2)', color: 'var(--accent)' }}><Fingerprint size={22} aria-hidden="true" /></motion.div>
      <Eyebrow>Extra slot</Eyebrow>
      <Title>PIN staat erop.</Title>
      <motion.p variants={childV} className="mt-4 text-sm leading-6" style={{ color: 'var(--text2)' }}>Wil je ook Face ID of je vingerafdruk gebruiken? Je PIN blijft altijd beschikbaar als terugval.</motion.p>
      {bioError && <motion.p variants={childV} className="mt-4 text-sm" style={{ color: 'var(--hard-no)' }}>{bioError}</motion.p>}
    </div>
  );
}

function Finale() {
  return (
    <div className="text-center">
      <motion.div variants={childV} className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'color-mix(in srgb, var(--accent) 12%, var(--surface2))', color: 'var(--accent)', border: '1px solid var(--border-accent)' }}><Check size={23} weight="bold" aria-hidden="true" /></motion.div>
      <motion.h2 variants={childV} className="serif-safe mt-6 text-4xl leading-tight" style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontWeight: 500 }}>Zin om te beginnen?</motion.h2>
      <motion.p variants={childV} className="mx-auto mt-4 max-w-xs text-sm leading-6" style={{ color: 'var(--text2)' }}>Maak je profiel en kies waar je nieuwsgierig naar bent.</motion.p>
      <motion.p variants={childV} className="mt-2 text-sm font-medium">De rest komt vanzelf voorbij.</motion.p>
    </div>
  );
}
