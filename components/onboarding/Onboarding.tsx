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
import { hashPin } from '@/lib/crypto';
import { isPlatformAuthenticatorAvailable, registerBiometric } from '@/lib/webauthn';
import { useMotionSafe, TAP_SPRING, STAGGER_CHILDREN, fadeUp, SHAKE_ANIM } from '@/lib/motion';

interface OnboardingProps {
  onComplete: () => void;
}

const PIN_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
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
  const [lockSub, setLockSub] = useState<LockSub>('intro');
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
  }, []);

  const advance = useCallback(() => setStep((current) => current + 1), []);

  function passGate() {
    if (skipRequested) setStep(3);
    else advance();
  }

  async function handlePinKey(key: string) {
    const active = lockSub === 'pin1' ? pin1 : pin2;
    const setActive = lockSub === 'pin1' ? setPin1 : setPin2;

    if (key === '⌫') {
      setActive((digits) => digits.slice(0, -1));
      return;
    }
    if (active.length >= PIN_LENGTH) return;

    const next = [...active, key];
    setActive(next);
    if (next.length < PIN_LENGTH) return;

    if (lockSub === 'pin1') {
      setLockSub('pin2');
      return;
    }

    if (next.join('') !== pin1.join('')) {
      setShake(true);
      window.setTimeout(() => {
        setShake(false);
        setPin1([]);
        setPin2([]);
        setLockSub('pin1');
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
    setBioLoading(true);
    setBioError(null);
    try {
      const credId = await registerBiometric();
      enableBiometric(credId);
      advance();
    } catch {
      setBioError('Registratie mislukt.\nJe kunt biometrie later inschakelen via Instellingen.');
      setBioLoading(false);
    }
  }

  const currentDigits = lockSub === 'pin1' ? pin1 : pin2;
  const barKey = step === 4 ? `4-${lockSub}` : String(step);
  const denseSlide = step === 3 || (step === 4 && lockSub === 'intro');

  return (
    <div
      className="fixed inset-x-0 top-0 z-[500] grid h-[100dvh] min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden"
      style={{ background: 'var(--bg)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Welkom bij KinkSync"
    >
      {lockout ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={t.fast}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center px-8 text-center"
          style={{ background: 'var(--bg)' }}
        >
          <HeartBreak size={38} aria-hidden="true" style={{ color: 'var(--text2)' }} />
          <h2
            className="serif-safe mt-6 text-[2.25rem] leading-tight"
            style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}
          >
            Kom terug als je 18 bent.
          </h2>
          <p className="mt-5 text-base leading-7" style={{ color: 'var(--text2)' }}>
            KinkSync is alleen voor volwassenen.
          </p>
        </motion.div>
      ) : (
        <>
          <div className="shrink-0 px-5 pt-[max(1rem,env(safe-area-inset-top))]">
            <div className="mx-auto flex max-w-sm items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text2)' }}>
                KinkSync
              </span>
              <span className="text-sm tabular-nums" style={{ color: 'var(--text2)' }}>
                {step + 1} / {STEP_COUNT}
              </span>
            </div>
            <div className="mx-auto mt-4 grid max-w-sm grid-cols-6 gap-1.5" aria-hidden="true">
              {Array.from({ length: STEP_COUNT }, (_, index) => (
                <div
                  key={index}
                  className="h-1 rounded-full transition-colors"
                  style={{ background: index <= step ? 'var(--accent)' : 'var(--surface3)' }}
                />
              ))}
            </div>
          </div>

          <div
            className={`min-h-0 overflow-y-auto overscroll-contain px-5 pb-10 ${denseSlide ? 'pt-5' : 'pt-8 sm:pt-10'}`}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={t.enter}
                className="mx-auto w-full max-w-sm"
              >
                <motion.div variants={STAGGER_CHILDREN} initial="hidden" animate="show" className="w-full">
                  {step === 0 && <Welcome />}
                  {step === 1 && <AgeGate />}
                  {step === 2 && <Discover />}
                  {step === 3 && <Together />}
                  {step === 4 && lockSub === 'intro' && <Privacy bioAvailable={bioAvailable} />}
                  {step === 4 && lockSub === 'biometric' && <Biometric bioError={bioError} />}
                  {step === 4 && (lockSub === 'pin1' || lockSub === 'pin2') && (
                    <Pin sub={lockSub} digits={currentDigits} shake={shake} onKey={handlePinKey} />
                  )}
                  {step === 5 && <Finale />}
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div
            className="relative z-10 shrink-0 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3"
            style={{ background: 'var(--bg)' }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={barKey}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={t.fast}
                className="mx-auto flex w-full max-w-sm flex-col gap-2.5"
              >
                {step === 0 && (
                  <>
                    <Action primary onClick={advance}>Begin</Action>
                    <Action onClick={() => { setSkipRequested(true); setStep(1); }} ariaLabel="Sla de introductie over">
                      Sla intro over
                    </Action>
                  </>
                )}
                {step === 1 && (
                  <>
                    <Action primary onClick={passGate}>Ik ben 18+</Action>
                    <Action onClick={() => setLockout(true)}>Ik ben jonger</Action>
                  </>
                )}
                {step === 2 && (
                  <Action primary onClick={advance}>Kom maar door <ArrowRight size={17} aria-hidden="true" /></Action>
                )}
                {step === 3 && (
                  <Action primary onClick={skipRequested ? onComplete : advance}>
                    {skipRequested ? 'Naar KinkSync' : 'Verder'} <ArrowRight size={17} aria-hidden="true" />
                  </Action>
                )}
                {step === 4 && lockSub === 'intro' && (
                  <>
                    <Action primary onClick={() => setLockSub('pin1')}>PIN instellen</Action>
                    <Action onClick={advance}>Niet nu</Action>
                  </>
                )}
                {step === 4 && (lockSub === 'pin1' || lockSub === 'pin2') && (
                  <Action onClick={() => { setPin1([]); setPin2([]); setLockSub('intro'); }}>
                    <ArrowLeft size={17} aria-hidden="true" /> Terug
                  </Action>
                )}
                {step === 4 && lockSub === 'biometric' && (
                  <>
                    <Action primary onClick={handleEnableBio} disabled={bioLoading}>
                      {bioLoading ? 'Even wachten…' : 'Biometrie inschakelen'}
                    </Action>
                    <Action onClick={advance}>Alleen PIN</Action>
                  </>
                )}
                {step === 5 && (
                  <Action primary onClick={onComplete}>Naar KinkSync <ArrowRight size={17} aria-hidden="true" /></Action>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}

function Action({ children, onClick, primary = false, disabled = false, ariaLabel }: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <motion.button
      whileTap={disabled ? undefined : TAP_SPRING}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="focus-ring flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-full border px-5 text-base transition-opacity disabled:cursor-default disabled:opacity-50"
      style={primary
        ? { ...primaryButton, borderColor: 'transparent' }
        : { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text2)' }}
    >
      {children}
    </motion.button>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <motion.p variants={childV} className="text-[13px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>
      {children}
    </motion.p>
  );
}

function Title({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <motion.h2
      variants={childV}
      className={`serif-safe mt-4 leading-[1.05] ${compact ? 'text-[clamp(2rem,8.4vw,2.15rem)]' : 'text-[2.25rem]'}`}
      style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}
    >
      {children}
    </motion.h2>
  );
}

function Welcome() {
  return (
    <div className="relative pt-[clamp(3.5rem,8dvh,5.5rem)] text-center">
      <motion.div aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5, delay: 0.2 }} className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" style={{ background: 'var(--accent-glow)' }} />
      <motion.h1 variants={childV} className="relative text-[3.5rem] leading-none"><Wordmark /></motion.h1>
      <motion.p variants={childV} className="relative mx-auto mt-9 max-w-xs text-xl font-medium leading-8">Ontdek waar je voor openstaat.</motion.p>
      <motion.p variants={childV} className="relative mx-auto mt-5 max-w-xs text-base leading-7" style={{ color: 'var(--text2)' }}>
        Wat je graag doet.<br />
        Wat je misschien eens wilt proberen.<br />
        Wat vooral leuk is voor de ander.
      </motion.p>
      <motion.p variants={childV} className="relative mx-auto mt-5 max-w-xs text-base font-medium leading-7">En waar je absoluut niet aan begint.</motion.p>
    </div>
  );
}

function AgeGate() {
  return (
    <div className="pt-5">
      <motion.div variants={childV} className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'var(--surface2)', color: 'var(--accent)' }}><ShieldWarning size={24} aria-hidden="true" /></motion.div>
      <Eyebrow>Voor we beginnen</Eyebrow>
      <Title>18+?</Title>
      <motion.p variants={childV} className="mt-7 text-lg leading-8" style={{ color: 'var(--text2)' }}>KinkSync gaat openlijk over BDSM, seks, fantasieën, verlangens en grenzen.</motion.p>
      <motion.p variants={childV} className="mt-5 text-base leading-7" style={{ color: 'var(--text2)' }}>Daar hoef je hier niet omheen te draaien.</motion.p>
      <motion.p variants={childV} className="mt-5 text-base font-semibold leading-7">Je moet wel 18 of ouder zijn.</motion.p>
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
    <div className="pt-2">
      <Eyebrow>Jouw profiel</Eyebrow>
      <Title>Hoe klinkt dit voor jou?</Title>
      <motion.p variants={childV} className="mt-6 text-base leading-7" style={{ color: 'var(--text2)' }}>Sommige dingen weet je meteen.<br />Bij andere wil je misschien eerst weten wat er precies bedoeld wordt.</motion.p>
      <motion.div variants={childV} className="mt-7 overflow-hidden rounded-2xl border px-5 py-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3"><Sparkle size={20} aria-hidden="true" style={{ color: 'var(--accent)' }} /><span className="text-base font-semibold">Waar sta jij?</span></div>
        <div className="mt-5 flex flex-wrap gap-2.5">
          {statuses.map(([label, color]) => <span key={label} className="rounded-full border px-3 py-1.5 text-[13px] font-medium" style={{ borderColor: `color-mix(in srgb, ${color} 45%, var(--border))`, color }}>{label}</span>)}
        </div>
      </motion.div>
      <motion.p variants={childV} className="mt-7 text-base leading-7" style={{ color: 'var(--text2)' }}>Geen goed of fout.<br />Geen kinkier-dan-de-rest-score.</motion.p>
      <motion.p variants={childV} className="mt-5 text-base font-semibold leading-7">Gewoon waar jij staat.</motion.p>
    </div>
  );
}

function Together() {
  return (
    <div>
      <Eyebrow>Samen</Eyebrow>
      <Title compact>Leg jullie kaarten op tafel.</Title>
      <motion.p variants={childV} className="mt-5 text-base leading-[1.65]" style={{ color: 'var(--text2)' }}>Misschien weten jullie al precies waar jullie samen van genieten.<br />Maar er is altijd iets dat nog niet ter sprake kwam.</motion.p>
      <motion.div variants={childV} className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border px-4 py-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="rounded-xl px-3 py-3.5 text-center text-sm font-semibold" style={{ background: 'var(--surface2)' }}>Jij</div>
        <UsersThree size={21} aria-hidden="true" style={{ color: 'var(--accent)' }} />
        <div className="rounded-xl px-3 py-3.5 text-center text-sm font-semibold" style={{ background: 'var(--surface2)' }}>De ander</div>
      </motion.div>
      <motion.p variants={childV} className="mt-5 text-base leading-[1.65]" style={{ color: 'var(--text2)' }}>Leg jullie profielen naast elkaar en ontdek wat jullie delen.<br />En waar jullie nét anders in staan.</motion.p>
      <motion.div variants={childV} className="mt-5 rounded-xl border-l-2 py-3 pl-4 pr-3 text-base leading-[1.6]" style={{ borderColor: 'var(--accent)', color: 'var(--text)' }}>
        <strong className="block">Een match opent mogelijkheden.</strong>
        <span className="mt-1.5 block" style={{ color: 'var(--text2)' }}>Wat jullie ermee doen, bepalen jullie samen.</span>
        <span className="mt-1.5 block font-medium">Een match is nooit automatisch consent.</span>
      </motion.div>
    </div>
  );
}

function Privacy({ bioAvailable }: { bioAvailable: boolean }) {
  return (
    <div>
      <Eyebrow>Privé</Eyebrow>
      <Title compact>Niet voor iedere pottenkijker.</Title>
      <motion.p variants={childV} className="mt-5 text-base leading-[1.65]">Al jouw data blijft standaard op jouw toestel.<span className="mt-2 block font-semibold" style={{ color: 'var(--accent)' }}>Volledig offline. Privacy-first.</span></motion.p>
      <motion.div variants={childV} className="mt-5 rounded-2xl border px-4 py-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-start gap-3.5">
          <Lock size={21} className="mt-0.5 flex-none" aria-hidden="true" style={{ color: 'var(--accent)' }} />
          <div><p className="text-base font-semibold">Lokaal, zonder account</p><p className="mt-2 text-[15px] leading-6" style={{ color: 'var(--text2)' }}>Geen centrale database.<br />Geen stille synchronisatie.</p></div>
        </div>
        <div className="my-4 h-px" style={{ background: 'var(--border)' }} />
        <div className="flex items-start gap-3.5">
          <QrCode size={21} className="mt-0.5 flex-none" aria-hidden="true" style={{ color: 'var(--accent)' }} />
          <div><p className="text-base font-semibold">Delen wanneer jij dat wilt</p><p className="mt-2 text-[15px] leading-6" style={{ color: 'var(--text2)' }}>Via QR, link, export of back-up.<br />Jij kiest wat vertrekt.</p></div>
        </div>
      </motion.div>
      <motion.p variants={childV} className="mt-5 text-base leading-[1.65]" style={{ color: 'var(--text2)' }}>Nieuwsgierige vingers? <span className="font-semibold" style={{ color: 'var(--text)' }}>Zet er een PIN{bioAvailable ? ' en eventueel biometrie' : ''} op.</span></motion.p>
    </div>
  );
}

function Pin({ sub, digits, shake, onKey }: { sub: 'pin1' | 'pin2'; digits: string[]; shake: boolean; onKey: (key: string) => void }) {
  return (
    <div className="mx-auto max-w-[19rem] pt-4 text-center">
      <Title compact>{sub === 'pin1' ? 'Hou nieuwsgierige vingers buiten.' : 'Nog één keer.'}</Title>
      <motion.p variants={childV} className="mt-6 text-base leading-7" style={{ color: 'var(--text2)' }}>{sub === 'pin1' ? <>Vier cijfers.<br />Hou ze voor jezelf.</> : 'Dezelfde vier cijfers.'}</motion.p>
      <motion.div variants={childV} animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : undefined} transition={shake ? SHAKE_ANIM : undefined} className="my-8 flex justify-center gap-4">
        {Array.from({ length: PIN_LENGTH }, (_, index) => <div key={index} className="h-3.5 w-3.5 rounded-full" style={{ background: index < digits.length ? 'var(--accent)' : 'var(--border)' }} />)}
      </motion.div>
      <motion.div variants={childV} className="grid grid-cols-3 gap-2.5">
        {PIN_KEYS.map((key, index) => <button key={index} type="button" onClick={() => key && onKey(key)} disabled={!key} className="focus-ring h-13 rounded-xl border text-xl font-semibold disabled:opacity-0" style={{ background: key ? 'var(--surface2)' : 'transparent', borderColor: key ? 'var(--border)' : 'transparent', color: key === '⌫' ? 'var(--text2)' : 'var(--text)' }}>{key}</button>)}
      </motion.div>
    </div>
  );
}

function Biometric({ bioError }: { bioError: string | null }) {
  return (
    <div className="pt-5">
      <motion.div variants={childV} className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'var(--surface2)', color: 'var(--accent)' }}><Fingerprint size={24} aria-hidden="true" /></motion.div>
      <Eyebrow>Extra slot</Eyebrow>
      <Title compact>Liever met één blik naar binnen?</Title>
      <motion.p variants={childV} className="mt-7 text-base leading-7" style={{ color: 'var(--text2)' }}>Gebruik Face ID of je vingerafdruk.<br />Je PIN blijft altijd achter de hand.</motion.p>
      {bioError && <motion.p variants={childV} className="mt-6 whitespace-pre-line text-base leading-7" style={{ color: 'var(--hard-no)' }}>{bioError}</motion.p>}
    </div>
  );
}

function Finale() {
  return (
    <div className="pt-[clamp(2rem,5dvh,3.5rem)]">
      <motion.div variants={childV} className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'color-mix(in srgb, var(--accent) 12%, var(--surface2))', color: 'var(--accent)', border: '1px solid var(--border-accent)' }}><Check size={24} weight="bold" aria-hidden="true" /></motion.div>
      <motion.h2 variants={childV} className="serif-safe mt-7 text-[2.5rem] leading-[1.05]" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}>Genoeg voorspel.</motion.h2>
      <motion.p variants={childV} className="mt-5 text-xl font-medium leading-8">Vanaf hier gaat het over jou.</motion.p>
      <motion.div variants={childV} className="mt-7 space-y-4 text-base leading-7" style={{ color: 'var(--text2)' }}>
        <p>Wat verlegen om open en bloot over je kinks te praten?</p>
        <p>Op een munch en op zoek naar een goede ijsbreker?</p>
        <p>Of gewoon benieuwd welke nieuwe kinks verrassend goed bij je passen?</p>
      </motion.div>
      <motion.p variants={childV} className="mt-7 text-lg font-semibold leading-8">Kruip het konijnenhol in.</motion.p>
    </div>
  );
}
