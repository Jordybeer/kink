import { STUDY_MARKUP, STUDY_STYLE } from "./gsap-study";

export const HOT_DOCUMENT = `<!doctype html>
<html lang="nl" data-tone="night" data-speed="normal" data-reduce="false">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Hot · KinkSync</title>
<style>
:root {
  color-scheme: dark; --bg: #100c15; --surface: #1a1320; --ink: #f4eaf0; --muted: #c1afbf; --line: #463549;
  --rose: #efa4ad; --lilac: #c5b0e7; --limit: #ffb0ac; --paper: #382630; --paper2: #2d233b;
  --serif: "Iowan Old Style", "Palatino Linotype", Georgia, serif;
}
:root[data-tone="paper"] {
  color-scheme: light; --bg: #f8efeb; --surface: #fff8f4; --ink: #30212c; --muted: #655360; --line: #d7c1cd;
  --rose: #8b304c; --lilac: #654387; --limit: #911f31; --paper: #f6e1e5; --paper2: #eee3f3;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 1rem/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
button { font: inherit; color: inherit; cursor: pointer; }
button:focus-visible { outline: 2px solid var(--lilac); outline-offset: 4px; }
[hidden] { display: none !important; }
::selection { background: var(--paper2); color: var(--ink); }
.frame { max-width: 65rem; margin-inline: auto; padding: 1.4rem clamp(1rem, 5vw, 3.5rem) 3rem; }
.mast { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .5rem 1rem; border-bottom: 1px solid var(--line); padding-block-end: .8rem; }
.brand { font: italic 1.3rem var(--serif); }
.tag, .muted { color: var(--muted); }
.tag { font-size: .8rem; }
.intro { display: grid; grid-template-columns: minmax(0, .85fr) minmax(0, 1fr); align-items: end; gap: .65rem 2.5rem; margin: 2.45rem 0 1.9rem; }
h1 { font: italic 500 clamp(3.6rem, 11vw, 6rem)/.88 var(--serif); letter-spacing: -.04em; margin: 0; color: var(--rose); }
.intro p { max-width: 30ch; margin: 0; font: 1.2rem/1.55 var(--serif); }
.tabs { display: flex; flex-wrap: wrap; gap: .05rem clamp(.65rem, 3vw, 1.8rem); border-bottom: 1px solid var(--line); margin-bottom: 1.1rem; }
.tabs button { min-height: 44px; background: none; border: 0; border-bottom: 2px solid transparent; padding: .5rem .15rem; color: var(--muted); }
.tabs button[aria-selected="true"] { color: var(--ink); border-bottom-color: var(--rose); font-weight: 650; }
.motion-note { margin: 0 0 1rem; font-size: .88rem; color: var(--muted); }
.workspace { display: grid; grid-template-columns: minmax(0, 1fr) minmax(13rem, .39fr); align-items: start; gap: 1.2rem 2rem; }
.stage { min-width: 0; position: relative; padding: clamp(1rem, 4vw, 2rem); border-radius: .9rem; background: radial-gradient(ellipse at 0% 0%, var(--paper2) 0%, transparent 82%) no-repeat 0 0 / 100% 58%, var(--surface); border: 1px solid var(--line); }
h2 { margin: 0; font: 400 clamp(1.85rem, 5vw, 3.1rem)/1.05 var(--serif); letter-spacing: -.028em; text-wrap: balance; }
h3 { line-height: 1.2; margin: 0 0 .28rem; font-size: 1rem; }
.stage p { margin: .8rem 0; max-width: 38ch; }
.actions { display: flex; flex-wrap: wrap; align-items: center; gap: .45rem; padding-top: .85rem; margin-top: .8rem; border-top: 1px solid var(--line); }
.action, .option { min-height: 44px; border: 1px solid var(--line); background: none; border-radius: .55rem; padding: .52rem .75rem; overflow-wrap: anywhere; }
.action.primary { background: var(--rose); border-color: var(--rose); color: var(--bg); font-weight: 680; }
.action.quiet { border-color: transparent; color: var(--muted); }
.action:hover:not(:disabled), .option:hover { border-color: var(--rose); }
.action:active:not(:disabled), .option:active { transform: translateY(1px); }
.action:disabled { opacity: .7; cursor: default; }
.pathline { display: flex; flex-wrap: wrap; align-items: center; gap: .12rem .5rem; margin: 0 0 1.05rem; font-size: .82rem; }
.path-topic { min-height: 44px; max-width: 100%; border: 0; background: none; padding: 0; font-weight: 650; color: var(--lilac); overflow-wrap: anywhere; }
.path-topic[aria-disabled="true"] { cursor: default; }
.path-topic:not([aria-disabled="true"]):hover { text-decoration: underline; text-underline-offset: .23rem; }
.path-next { font-weight: 650; color: var(--muted); overflow-wrap: anywhere; }
.path-next[aria-current="step"] { color: var(--rose); }
.pathline svg { flex: none; width: clamp(2.5rem, 17vw, 6.5rem); height: 1rem; overflow: visible; }
.path-rail,.path-ink { fill: none; stroke-width: 1.5; vector-effect: non-scaling-stroke; stroke-linecap: round; }
.path-rail { stroke: var(--lilac); opacity: .35; }
.path-ink { stroke: var(--rose); stroke-dasharray: 1; opacity: 0; }
.pathline[data-deep="true"] .path-ink { opacity: 1; }
.questions-stack { display: grid; min-width: 0; }
.question, .question-measure { grid-area: 1 / 1; min-width: 0; overflow-wrap: anywhere; }
.question-measure { visibility: hidden; pointer-events: none; }
#deeper { display: inline-grid; }
#deeper span { grid-area: 1 / 1; }
#deeper .action-measure { visibility: hidden; }
.papers { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .55rem; margin: 1.35rem 0 1rem; }
.paper { min-width: 0; border-radius: .55rem; display: block; position: relative; overflow: hidden; background: var(--paper); color: var(--rose); padding: .78rem .8rem; font: italic 1.35rem var(--serif); }
.paper + .paper { background: var(--paper2); color: var(--lilac); }
.paper-name { display: block; }
.paper-ink { position: absolute; pointer-events: none; inset: auto .8rem .45rem; height: 1px; background: currentColor; transform-origin: left; opacity: .5; }
.paper + .paper .paper-ink { transform-origin: right; }
.facts { list-style: none; padding: 0; margin: 0; }
.facts li { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); padding: .49rem 0; gap: .35rem .85rem; border-top: 1px solid var(--line); }
.facts li span { color: var(--muted); overflow-wrap: anywhere; }
.facts li.limit strong { color: var(--limit); }
.private-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; gap: .6rem; margin-top: 1.25rem; padding-top: .85rem; border-top: 1px solid var(--line); }
.private-slot { position: relative; display: grid; justify-items: end; align-items: start; overflow: hidden; }
.private-status { color: var(--muted); text-align: end; overflow-wrap: anywhere; position: relative; padding: .25rem .55rem; }
.private-slot[data-open="true"] .private-status { color: var(--lilac); }
.private-iris { pointer-events: none; position: absolute; inset: 0 0 auto; height: 2rem; transform-origin: right; border-radius: .45rem; background: var(--paper2); opacity: 0; }
.settings { min-width: 0; padding: .32rem 0 .25rem 1rem; border-left: 1px solid var(--line); }
.settings > p { margin: .55rem 0 1rem; font-size: .92rem; max-width: 33ch; }
.control-line { margin: 0; padding: .65rem 0; border: 0; border-top: 1px solid var(--line); display: flex; flex-wrap: wrap; align-items: center; gap: .35rem; }
.control-line strong { flex: 0 0 100%; font-size: .87rem; }
.option { font-size: .87rem; text-align: left; }
.option[aria-pressed="true"] { border-color: var(--lilac); background: var(--paper2); font-weight: 650; }
footer { border-top: 1px solid var(--line); margin-top: 1.5rem; padding-top: .85rem; font-size: .85rem; color: var(--muted); }
:root[data-reduce="true"] *, :root[data-reduce="true"] *::before, :root[data-reduce="true"] *::after { animation: none !important; transition: none !important; }
:root[data-reduce="true"] button:active { transform: none; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
  button:active { transform: none !important; }
}
@media (max-width: 44rem) {
  .workspace { grid-template-columns: minmax(0, 1fr); }
  .intro { grid-template-columns: minmax(0, 1fr); gap: .6rem; margin: 1.65rem 0 1.15rem; }
  .settings { padding: .75rem 0 0; border-left: 0; }
}
@media (max-width: 25rem) {
  .facts li { grid-template-columns: minmax(0, 1fr); }
}
${STUDY_STYLE}
</style>
</head>
<body>
<main class="frame">
  <header class="mast"><span class="brand">KinkSync</span><span class="tag">Motionlab · GSAP</span></header>
  <div class="intro"><h1>Hot.</h1><p>Een plek om te voelen welke beweging iets toevoegt.</p></div>
  <p class="motion-note" id="system-motion" hidden>Je apparaat staat op verminderde beweging. De demo’s slaan de animaties dan over.</p>
  <nav class="tabs" aria-label="Animatiestudies" role="tablist">
    <button type="button" role="tab" id="tab-study" aria-controls="study" aria-selected="true">GSAP-studie</button>
    <button type="button" role="tab" id="tab-questions" aria-controls="questions" aria-selected="false" tabindex="-1">Vragenlijst</button>
    <button type="button" role="tab" id="tab-compare" aria-controls="compare" aria-selected="false" tabindex="-1">Vergelijken</button>
    <button type="button" role="tab" id="tab-private" aria-controls="private" aria-selected="false" tabindex="-1">Privé</button>
  </nav>
  <div class="workspace">
    ${STUDY_MARKUP}
    <section class="stage" id="questions" role="tabpanel" aria-labelledby="tab-questions" tabindex="0" hidden>
      <div class="pathline" id="question-path" data-deep="false" role="group" aria-label="Vraagpad">
        <button type="button" id="trail" class="path-topic" aria-disabled="true" aria-current="step" tabindex="-1">Rituelen</button>
        <svg viewBox="0 0 100 16" preserveAspectRatio="none" aria-hidden="true"><path class="path-rail" d="M3 12 C36 12 54 4 97 4"></path><path class="path-ink" id="path-ink" pathLength="1" d="M3 12 C36 12 54 4 97 4"></path></svg>
        <span class="path-next" id="path-next">Verdieping</span>
      </div>
      <div class="questions-stack" id="questions-stack">
        <div class="question" aria-live="polite" aria-atomic="true">
          <h2 id="question-title">Samen een ritueel kiezen?</h2>
          <p id="question-copy" class="muted">Een vertrouwd begin of einde kan een moment meer eigen maken. Wil je dit verder verkennen?</p>
        </div>
      </div>
      <div class="actions">
        <button type="button" class="action primary" id="deeper"><span id="deeper-label">Ga dieper</span><span class="action-measure" aria-hidden="true">Speel opnieuw</span></button>
        <button type="button" class="action" id="change-topic">Ander onderwerp</button>
        <button type="button" class="action quiet" id="reset-question">Opnieuw</button>
      </div>
    </section>
    <section class="stage" id="compare" role="tabpanel" aria-labelledby="tab-compare" tabindex="0" hidden>
      <h2>Twee perspectieven.</h2>
      <div class="papers"><span class="paper"><span class="paper-name">Alex</span><i class="paper-ink" aria-hidden="true"></i></span><span class="paper"><span class="paper-name">Sam</span><i class="paper-ink" aria-hidden="true"></i></span></div>
      <ul class="facts">
        <li><strong>Gedeelde interesse</strong><span>Tijd nemen voor nazorg</span></li>
        <li><strong>Te bespreken</strong><span>Hoeveel voorbereiding fijn voelt</span></li>
        <li class="limit"><strong>Harde grens van Sam</strong><span>Opnames maken</span></li>
      </ul>
      <div class="actions"><button type="button" class="action primary" id="replay-alignment">Speel uitlijning af</button></div>
    </section>
    <section class="stage" id="private" role="tabpanel" aria-labelledby="tab-private" tabindex="0" hidden>
      <h2>Alleen als jij kijkt.</h2>
      <p class="muted">Het antwoord blijft verborgen tot je het zelf toont.</p>
      <div class="private-row"><strong>Rustig samenzijn</strong><span class="private-slot" id="private-slot" data-open="false"><i class="private-iris" aria-hidden="true"></i><span class="private-status" id="private-status" aria-live="polite" aria-atomic="true">Verborgen</span></span></div>
      <div class="actions"><button type="button" class="action primary" id="toggle-private" aria-controls="private-status" aria-expanded="false">Toon voorbeeldantwoord</button></div>
    </section>
    <aside class="settings" aria-label="Instellingen voor het prototype">
      <h3>Op je eigen tempo</h3>
      <p class="muted">Kies Traag om de beweging van dichtbij te zien.</p>
      <div class="control-line" role="group" aria-label="Snelheid">
        <strong aria-hidden="true">Snelheid</strong><button class="option" type="button" data-setting="speed" data-value="normal" aria-pressed="true">Normaal</button><button class="option" type="button" data-setting="speed" data-value="slow" aria-pressed="false">Traag</button>
      </div>
      <div class="control-line" role="group" aria-label="Thema">
        <strong aria-hidden="true">Thema</strong><button class="option" type="button" data-setting="tone" data-value="night" aria-pressed="true">Nacht</button><button class="option" type="button" data-setting="tone" data-value="paper" aria-pressed="false">Papier</button>
      </div>
      <div class="control-line"><button class="option" type="button" id="reduce" aria-pressed="false">Verminder beweging</button></div>
    </aside>
  </div>
  <footer>Fictieve voorbeelden. Geen profielgegevens, opslag of deelacties.</footer>
</main>
<script src="/hot?asset=motion"></script>
<script src="/hot?asset=gsap"></script>
<script src="/hot?asset=morph"></script>
<script>
(() => {
  'use strict';
  const root = document.documentElement;
  const get = (id) => document.getElementById(id);
  const tabs = [...document.querySelectorAll('[role=tab]')];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const easeOut = [.16, 1, .3, 1];
  let playing = null;
  let studyTimeline = null;
  let studyOpen = false;
  const reduced = () => motion.matches || root.dataset.reduce === 'true';
  const canAnimate = () => !reduced() && typeof window.Motion?.animate === 'function';
  function clearMotion() {
    if (studyTimeline) {
      studyTimeline.kill();
      studyTimeline = null;
      paintStudy(studyOpen);
    }
    if (!playing) return;
    const current = playing;
    playing = null;
    current.clip.cancel();
    current.restore();
  }
  function timeline(parts) {
    if (!canAnimate()) return;
    const originals = new Map(parts.map(([element]) => [element, element.getAttribute('style')]));
    const restore = () => {
      for (const [element, style] of originals) {
        if (style === null) element.removeAttribute('style');
        else element.setAttribute('style', style);
      }
    };
    const speed = root.dataset.speed === 'slow' ? 2.5 : 1;
    const sequence = parts.map(([element, frames, at, duration]) =>
      [element, frames, { at: at * speed, duration: duration * speed, ease: easeOut }]);
    const clip = window.Motion.animate(sequence);
    const current = {clip, restore};
    playing = current;
    const finish = () => {
      if (playing !== current) return;
      playing = null;
      restore();
    };
    clip.then(finish, finish);
  }
  const onSystemMotion = () => {
    get('system-motion').hidden = !motion.matches;
    if (reduced()) clearMotion();
  };
  motion.addEventListener('change', onSystemMotion);
  onSystemMotion();
  function selectTab(index, focus) {
    const unchanged = tabs[index].getAttribute('aria-selected') === 'true';
    clearMotion();
    if (!unchanged && tabs[index].id !== 'tab-private') setPrivate(false);
    tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      get(tab.getAttribute('aria-controls')).hidden = !selected;
    });
    if (focus) tabs[index].focus();
    if (!unchanged && tabs[index].id === 'tab-compare') alignPapers();
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(i, false));
    tab.addEventListener('keydown', (event) => {
      const next = { ArrowLeft: (i + tabs.length - 1) % tabs.length, ArrowRight: (i + 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      selectTab(next, true);
    });
  });
  document.querySelectorAll('[data-setting]').forEach((button) => {
    button.addEventListener('click', () => {
      const kind = button.dataset.setting;
      if (root.dataset[kind] !== button.dataset.value) clearMotion();
      root.dataset[kind] = button.dataset.value;
      document.querySelectorAll('[data-setting=' + kind + ']').forEach((choice) => choice.setAttribute('aria-pressed', String(choice === button)));
    });
  });
  get('reduce').addEventListener('click', () => {
    const enabled = root.dataset.reduce !== 'true';
    root.dataset.reduce = String(enabled);
    get('reduce').setAttribute('aria-pressed', String(enabled));
    if (enabled) clearMotion();
  });
  const examples = [
    { title: 'Samen een ritueel kiezen?', copy: 'Een vertrouwd begin of einde kan een moment meer eigen maken. Wil je dit verder verkennen?', trail: 'Rituelen', next: 'Een vast beginritueel?', detail: 'Bijvoorbeeld eerst samen afstemmen over wat ieder die dag nodig heeft.' },
    { title: 'Bepalen we het tempo samen?', copy: 'Misschien helpt het om te benoemen wie het initiatief neemt en hoe je samen pauzeert.', trail: 'Tempo', next: 'Een afgesproken pauzemoment?', detail: 'Je kunt op voorhand kiezen hoe je even stilvalt om bij elkaar in te checken.' },
  ];
  // Reserve the largest question in this sandbox, so changing question never moves a tap target.
  for (const example of examples) {
    for (const [title, copy] of [[example.title, example.copy], [example.next, example.detail]]) {
      const measure = document.createElement('div');
      measure.className = 'question-measure';
      measure.setAttribute('aria-hidden', 'true');
      const heading = document.createElement('h2');
      const body = document.createElement('p');
      heading.textContent = title;
      body.textContent = copy;
      measure.append(heading, body);
      get('questions-stack').append(measure);
    }
  }
  let topic = 0;
  let deep = false;
  function renderQuestion(animate) {
    const example = examples[topic];
    const trail = get('trail');
    clearMotion();
    const title = get('question-title');
    const pathNext = get('path-next');
    const copy = get('question-copy');
    if (!deep && document.activeElement === trail) get('deeper').focus();
    trail.tabIndex = deep ? 0 : -1;
    trail.setAttribute('aria-disabled', String(!deep));
    trail.setAttribute('aria-label', deep ? 'Terug naar ' + example.trail : example.trail);
    trail.textContent = example.trail;
    if (deep) {
      trail.removeAttribute('aria-current');
      pathNext.setAttribute('aria-current', 'step');
    } else {
      trail.setAttribute('aria-current', 'step');
      pathNext.removeAttribute('aria-current');
    }
    get('question-path').dataset.deep = String(deep);
    title.textContent = deep ? example.next : example.title;
    copy.textContent = deep ? example.detail : example.copy;
    get('deeper-label').textContent = deep ? 'Speel opnieuw' : 'Ga dieper';
    if (animate) timeline([
      [get('path-ink'), {strokeDashoffset: [1, 0]}, 0, .48],
      [pathNext, {transform: ['translateX(-4px)', 'translateX(0px)']}, .09, .34],
      [title, {opacity: [.88, 1], transform: ['translateY(9px)', 'translateY(0px)']}, 0, .36],
      [copy, {opacity: [.9, 1], transform: ['translateY(6px)', 'translateY(0px)']}, .035, .31],
    ]);
  }
  get('deeper').addEventListener('click', () => {
    deep = true;
    renderQuestion(true);
  });
  get('change-topic').addEventListener('click', () => { topic = 1 - topic; deep = false; renderQuestion(false); });
  get('reset-question').addEventListener('click', () => { topic = 0; deep = false; renderQuestion(false); });
  get('trail').addEventListener('click', () => { if (deep) { deep = false; renderQuestion(false); } });
  function alignPapers() {
    clearMotion();
    const parts = [];
    [...get('compare').querySelectorAll('.paper')].forEach((paper, index) => {
      const sign = index ? 1 : -1;
      const from = 'translateX(' + (sign * 10) + 'px)';
      parts.push([paper.querySelector('.paper-name'), {transform: [from, 'translateX(0px)'], opacity: [.88, 1]}, 0, .36]);
      parts.push([paper.querySelector('.paper-ink'), {transform: ['scaleX(.08)', 'scaleX(1)'], opacity: [.12, .5]}, .03, .41]);
    });
    timeline(parts);
  }
  get('replay-alignment').addEventListener('click', alignPapers);
  let revealed = false;
  const status = get('private-status');
  const privateButton = get('toggle-private');
  function setPrivate(open) {
    if (revealed === open) return;
    revealed = open;
    get('private-slot').dataset.open = String(revealed);
    status.textContent = revealed ? 'Heel graag' : 'Verborgen';
    privateButton.textContent = revealed ? 'Verberg voorbeeldantwoord' : 'Toon voorbeeldantwoord';
    privateButton.setAttribute('aria-expanded', String(revealed));
  }
  privateButton.addEventListener('click', () => {
    clearMotion();
    setPrivate(!revealed);
    if (revealed) timeline([
      [document.querySelector('.private-iris'), {transform: ['scaleX(1)', 'scaleX(.02)'], opacity: [.85, 0]}, 0, .37],
      [status, {opacity: [.25, 1], filter: ['blur(3px)', 'blur(0px)']}, .03, .34],
    ]);
  });

  const studyOutline = get('study-outline');
  const studyTarget = get('study-target');
  const studyClosedD = studyOutline.getAttribute('d');
  const studyOpenD = studyTarget.getAttribute('d');
  const closedLeaf = 'translate(0 0) rotate(0 216 136)';
  const leftLeaf = 'translate(-39 7) rotate(-9 216 136)';
  const rightLeaf = 'translate(39 -7) rotate(9 216 136)';
  const engine = window.gsap;
  const morph = window.MorphSVGPlugin;
  if (engine && morph) engine.registerPlugin(morph);

  function paintStudy(open) {
    get('study-leaf-a').setAttribute('transform', open ? leftLeaf : closedLeaf);
    get('study-leaf-b').setAttribute('transform', open ? rightLeaf : closedLeaf);
    studyOutline.setAttribute('d', open ? studyOpenD : studyClosedD);
    studyOutline.setAttribute('fill-opacity', open ? '.82' : '.035');
    studyOutline.setAttribute('stroke-width', open ? '.8' : '1.55');
    get('study-halo').setAttribute('rx', open ? '124' : '74');
    get('study-halo').setAttribute('opacity', open ? '.22' : '.09');
    get('study-endpoints').setAttribute('opacity', open ? '1' : '0');
  }
  function describeStudy(open) {
    get('study-question').textContent = open ? 'Een vast beginritueel?' : 'Samen een ritueel kiezen?';
    get('study-copy').textContent = open
      ? 'Bijvoorbeeld eerst samen afstemmen over wat ieder die dag nodig heeft.'
      : 'Begin breed. Kies zelf of je bij dit onderwerp verder wilt.';
  }
  get('study-play').addEventListener('click', () => {
    clearMotion();
    studyOpen = true;
    describeStudy(true);
    if (!engine || !morph || reduced()) { paintStudy(true); return; }

    paintStudy(false);
    const run = engine.timeline({
      paused: true,
      defaults: {ease: 'power3.inOut'},
      onComplete: () => {
        if (studyTimeline !== run) return;
        studyTimeline = null;
        paintStudy(true);
      },
    });
    studyTimeline = run;
    run.to(get('study-leaf-a'), {attr: {transform: leftLeaf}, duration: .76}, 0)
      .to(get('study-leaf-b'), {attr: {transform: rightLeaf}, duration: .76}, 0)
      .to(studyOutline, {morphSVG: {shape: studyTarget, shapeIndex: 0}, attr: {'fill-opacity': .82, 'stroke-width': .8}, duration: .76}, .13)
      .to(get('study-halo'), {attr: {rx: 124, opacity: .22}, duration: .86}, .05)
      .to(get('study-endpoints'), {attr: {opacity: 1}, duration: .22, ease: 'power2.out'}, .79);
    run.timeScale(root.dataset.speed === 'slow' ? .4 : 1).play();
  });
  get('study-reset').addEventListener('click', () => {
    clearMotion();
    studyOpen = false;
    paintStudy(false);
    describeStudy(false);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearMotion(); });
})();
</script>
</body>
</html>`;
