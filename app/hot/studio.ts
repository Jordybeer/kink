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
.frame { max-width: 67rem; margin-inline: auto; padding: 1.7rem clamp(1rem, 5vw, 3.5rem) 3rem; }
.mast { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .5rem 1rem; border-bottom: 1px solid var(--line); padding-block-end: .8rem; }
.brand { font: italic 1.3rem var(--serif); }
.tag, .muted { color: var(--muted); }
.tag { font-size: .8rem; }
.intro { display: grid; grid-template-columns: minmax(0, .85fr) minmax(0, 1fr); align-items: end; gap: .65rem 2.5rem; margin: 2.85rem 0 2.15rem; }
h1 { font: italic 500 clamp(4.5rem, 11vw, 8rem)/.8 var(--serif); letter-spacing: -.04em; margin: 0; color: var(--rose); }
.intro p { max-width: 30ch; margin: 0; font: 1.2rem/1.55 var(--serif); }
.tabs { display: flex; flex-wrap: wrap; gap: .05rem clamp(.65rem, 3vw, 1.8rem); border-bottom: 1px solid var(--line); margin-bottom: 1.1rem; }
.tabs button { min-height: 44px; background: none; border: 0; border-bottom: 2px solid transparent; padding: .5rem .15rem; color: var(--muted); }
.tabs button[aria-selected="true"] { color: var(--ink); border-bottom-color: var(--rose); font-weight: 650; }
.motion-note { margin: 0 0 1rem; font-size: .88rem; color: var(--muted); }
.workspace { display: grid; grid-template-columns: minmax(0, 1fr) minmax(13rem, .39fr); align-items: start; gap: 1.2rem 2rem; }
.stage { min-width: 0; position: relative; overflow: clip; padding: clamp(1.12rem, 4vw, 2.4rem); border-radius: 1rem; background: var(--surface); border: 1px solid var(--line); }
h2 { margin: 0; font: 400 clamp(1.85rem, 5vw, 3.1rem)/1.05 var(--serif); letter-spacing: -.028em; text-wrap: balance; }
h3 { line-height: 1.2; margin: 0 0 .28rem; font-size: 1rem; }
.stage p { margin: .8rem 0; max-width: 38ch; }
.actions { display: flex; flex-wrap: wrap; gap: .5rem; padding-top: .95rem; margin-top: 1.15rem; border-top: 1px solid var(--line); }
.action, .option, .breadcrumb { min-height: 44px; border: 1px solid var(--line); background: none; border-radius: .55rem; padding: .52rem .78rem; overflow-wrap: anywhere; }
.action.primary { background: var(--rose); border-color: var(--rose); color: var(--bg); font-weight: 680; }
.action:hover:not(:disabled), .option:hover { border-color: var(--rose); }
.action:active:not(:disabled), .option:active { transform: translateY(1px); }
.action:disabled { opacity: .7; cursor: default; }
.breadcrumb { color: var(--lilac); border-color: transparent; padding-inline: .15rem; margin-bottom: .55rem; }
.breadcrumb:hover { text-decoration: underline; text-underline-offset: .28rem; }
.question { min-height: 8.4rem; position: relative; isolation: isolate; }
.question > :not(.question-wash) { position: relative; }
.question-wash { position: absolute; pointer-events: none; z-index: -1; inset: -.8rem -.6rem; border-radius: .75rem; background: linear-gradient(118deg, var(--paper2), transparent 76%); opacity: 0; }
.handoff { position: absolute; pointer-events: none; margin: 0; color: var(--lilac); transform-origin: left top; z-index: 2; }
.papers { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .5rem; margin: 1.45rem 0 1.1rem; perspective: 650px; }
.paper { min-width: 0; border-radius: .55rem; display: block; position: relative; overflow: hidden; background: var(--paper); color: var(--rose); padding: .85rem .8rem; font: italic 1.35rem var(--serif); border-bottom: 1px solid currentColor; }
.paper + .paper { background: var(--paper2); color: var(--lilac); }
.paper-ink { position: absolute; pointer-events: none; inset: 0; background: linear-gradient(112deg, transparent 24%, currentColor 50%, transparent 76%); opacity: 0; }
.facts { list-style: none; padding: 0; margin: 0; }
.facts li { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); padding: .49rem 0; gap: .35rem .85rem; border-top: 1px solid var(--line); }
.facts li span { color: var(--muted); overflow-wrap: anywhere; }
.facts li.limit strong { color: var(--limit); }
.private-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; gap: .6rem; margin-top: 1.25rem; padding-top: .85rem; border-top: 1px solid var(--line); }
.private-slot { position: relative; min-height: 2.5rem; display: flex; justify-content: flex-end; align-items: flex-start; }
.private-status { color: var(--lilac); text-align: end; overflow-wrap: anywhere; position: relative; }
.private-iris { pointer-events: none; position: absolute; inset: -.34rem -.4rem auto auto; width: min(100%, 10rem); height: 2.4rem; border: 1px solid var(--lilac); border-radius: .55rem; background: var(--paper2); opacity: 0; }
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
  .intro { grid-template-columns: minmax(0, 1fr); gap: 1rem; margin: 2.25rem 0 1.65rem; }
  .settings { padding: .75rem 0 0; border-left: 0; }
}
@media (max-width: 25rem) {
  .facts li { grid-template-columns: minmax(0, 1fr); }
}
</style>
</head>
<body>
<main class="frame">
  <header class="mast"><span class="brand">KinkSync</span><span class="tag">Motionlab · versie 02</span></header>
  <div class="intro"><h1>Hot.</h1><p>Een plek om te voelen welke beweging iets toevoegt.</p></div>
  <p class="motion-note" id="system-motion" hidden>Je apparaat staat op verminderde beweging. De demo’s slaan de animaties dan over.</p>
  <nav class="tabs" aria-label="Animatiestudies" role="tablist">
    <button type="button" role="tab" id="tab-questions" aria-controls="questions" aria-selected="true">Vragenlijst</button>
    <button type="button" role="tab" id="tab-compare" aria-controls="compare" aria-selected="false" tabindex="-1">Vergelijken</button>
    <button type="button" role="tab" id="tab-private" aria-controls="private" aria-selected="false" tabindex="-1">Privé</button>
  </nav>
  <div class="workspace">
    <section class="stage" id="questions" role="tabpanel" aria-labelledby="tab-questions" tabindex="0">
      <button type="button" id="trail" class="breadcrumb" hidden></button>
      <div class="question" aria-live="polite" aria-atomic="true">
        <span class="question-wash" aria-hidden="true"></span>
        <h2 id="question-title">Samen een ritueel kiezen?</h2>
        <p id="question-copy" class="muted">Een vertrouwd begin of einde kan een moment meer eigen maken. Wil je dit verder verkennen?</p>
      </div>
      <div class="actions">
        <button type="button" class="action primary" id="deeper">Ga dieper</button>
        <button type="button" class="action" id="change-topic">Ander onderwerp</button>
        <button type="button" class="action" id="reset-question">Opnieuw</button>
      </div>
    </section>
    <section class="stage" id="compare" role="tabpanel" aria-labelledby="tab-compare" tabindex="0" hidden>
      <h2>Twee perspectieven.</h2>
      <div class="papers"><span class="paper">Alex<i class="paper-ink" aria-hidden="true"></i></span><span class="paper">Sam<i class="paper-ink" aria-hidden="true"></i></span></div>
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
      <div class="private-row"><strong>Rustig samenzijn</strong><span class="private-slot"><i class="private-iris" aria-hidden="true"></i><span class="private-status" id="private-status" aria-live="polite" aria-atomic="true">Verborgen</span></span></div>
      <div class="actions"><button type="button" class="action primary" id="toggle-private" aria-controls="private-status" aria-expanded="false">Toon voorbeeldantwoord</button></div>
    </section>
    <aside class="settings" aria-label="Instellingen voor het prototype">
      <h3>Op je eigen tempo</h3>
      <p class="muted">Probeer een snelle tweede tik en wissel daarna van thema.</p>
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
<script>
(() => {
  'use strict';
  const root = document.documentElement;
  const get = (id) => document.getElementById(id);
  const tabs = [...document.querySelectorAll('[role=tab]')];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const easeOut = [.16, 1, .3, 1];
  let playing = null;
  const reduced = () => motion.matches || root.dataset.reduce === 'true';
  const canAnimate = () => !reduced() && typeof window.Motion?.animate === 'function';
  function clearMotion() {
    if (!playing) return;
    const current = playing;
    playing = null;
    current.clip.cancel();
    current.restore();
  }
  function timeline(parts, ghost) {
    if (!canAnimate()) { ghost?.remove(); return; }
    const originals = new Map(parts.map(([element]) => [element, element.getAttribute('style')]));
    const restore = () => {
      for (const [element, style] of originals) {
        if (style === null) element.removeAttribute('style');
        else element.setAttribute('style', style);
      }
      ghost?.remove();
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
  let topic = 0;
  let deep = false;
  function renderQuestion(animate) {
    const example = examples[topic];
    const trail = get('trail');
    clearMotion();
    const title = get('question-title');
    const start = canAnimate() && animate && trail.hidden ? title.getBoundingClientRect() : null;
    const outgoing = title.textContent;
    const outgoingFont = start ? getComputedStyle(title).font : '';
    if (!deep && document.activeElement === trail) get('deeper').focus();
    trail.hidden = !deep;
    trail.textContent = 'Terug naar ' + example.trail;
    title.textContent = deep ? example.next : example.title;
    get('question-copy').textContent = deep ? example.detail : example.copy;
    const deeper = get('deeper');
    deeper.textContent = deep ? 'Speel overgang opnieuw af' : 'Ga dieper';
    if (animate && canAnimate()) {
      const parts = [
        [trail, {opacity: [0, 1], transform: ['translateY(7px)', 'translateY(0)']}, .11, .28],
        [document.querySelector('.question-wash'), {opacity: [0, .85, 0], transform: ['scaleX(.68)', 'scaleX(1)']}, .13, .60],
        [title, {opacity: [0, 1], transform: ['translateY(24px) scale(.97)', 'translateY(0) scale(1)'], clipPath: ['inset(0 0 85% 0)', 'inset(0 0 0 0)']}, .17, .49],
        [get('question-copy'), {opacity: [0, 1], transform: ['translateY(18px)', 'translateY(0)']}, .27, .40],
      ];
      let ghost;
      if (start) {
        const stage = get('questions');
        const bounds = stage.getBoundingClientRect();
        const end = trail.getBoundingClientRect();
        ghost = document.createElement('span');
        ghost.className = 'handoff';
        ghost.setAttribute('aria-hidden', 'true');
        ghost.textContent = outgoing;
        Object.assign(ghost.style, {left: (start.left - bounds.left) + 'px', top: (start.top - bounds.top) + 'px', width: start.width + 'px', font: outgoingFont});
        stage.append(ghost);
        parts.push([ghost, {
          opacity: [.9, .65, 0],
          transform: ['translate(0px, 0px) scale(1)', 'translate(' + (end.left - start.left) + 'px, ' + (end.top - start.top + 5) + 'px) scale(.42)'],
        }, 0, .30]);
      }
      timeline(parts, ghost);
    }
  }
  get('deeper').addEventListener('click', () => {
    if (deep) { deep = false; renderQuestion(false); }
    deep = true;
    renderQuestion(true);
  });
  get('change-topic').addEventListener('click', () => { topic = 1 - topic; deep = false; renderQuestion(false); });
  get('reset-question').addEventListener('click', () => { topic = 0; deep = false; renderQuestion(false); });
  get('trail').addEventListener('click', () => { deep = false; renderQuestion(false); });
  function alignPapers() {
    clearMotion();
    const parts = [];
    [...get('compare').querySelectorAll('.paper')].forEach((paper, index) => {
      const sign = index ? 1 : -1;
      const from = 'translate3d(' + (sign * 34) + 'px, 22px, 0) rotateY(' + (sign * 20) + 'deg) rotate(' + (sign * 9) + 'deg) scale(.88)';
      parts.push([paper, {transform: [from, 'translate3d(0px, 0px, 0) rotateY(0deg) rotate(0deg) scale(1)'], opacity: [.52, 1]}, index * .055, .67]);
      parts.push([paper.querySelector('.paper-ink'), {transform: ['translateX(' + (sign * 85) + '%)', 'translateX(' + (-sign * 75) + '%)'], opacity: [0, .24, 0]}, .18 + index * .06, .50]);
    });
    timeline(parts);
  }
  get('replay-alignment').addEventListener('click', alignPapers);
  let revealed = false;
  const status = get('private-status');
  const privateButton = get('toggle-private');
  privateButton.addEventListener('click', () => {
    clearMotion();
    revealed = !revealed;
    status.textContent = revealed ? 'Heel graag' : 'Verborgen';
    privateButton.textContent = revealed ? 'Verberg voorbeeldantwoord' : 'Toon voorbeeldantwoord';
    privateButton.setAttribute('aria-expanded', String(revealed));
    if (revealed) timeline([
      [document.querySelector('.private-iris'), {clipPath: ['inset(0 100% 0 0 round 8px)', 'inset(0 0 0 0 round 8px)'], opacity: [0, .88, 0]}, 0, .62],
      [status, {opacity: [0, 1], filter: ['blur(9px)', 'blur(0px)'], transform: ['translateX(14px) scale(.9)', 'translateX(0) scale(1)']}, .10, .53],
    ]);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearMotion(); });
})();
</script>
</body>
</html>`;
