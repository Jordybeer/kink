export const PROFILE_CONCEPT = `<!doctype html>
<html lang="nl" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Alex · KinkSync profielconcept</title>
<link rel="stylesheet" href="/hot?asset=profile-theme">
<style>
:root {
  --panel:var(--surface); --ink:var(--text); --muted:var(--text2); --stroke:var(--border);
  --rose:var(--accent-text); --lilac:var(--accent2-text); --selected:var(--surface2);
  --ok:var(--willing); --for:var(--no); --hard:var(--hard-no-text);
  --serif: "Iowan Old Style","Palatino Linotype",Georgia,serif;
}
:root[data-theme="dark"] {color-scheme:dark}
:root[data-theme="light"] {color-scheme:light}
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--ink); font:1rem/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
button,input { font:inherit; color:inherit; }
button { cursor:pointer; }
a { color:var(--lilac); text-decoration-thickness:1px; text-underline-offset:.24em; }
:focus-visible { outline:2px solid var(--focus); outline-offset:3px; }
[hidden] { display:none !important; }
::selection { background:var(--selected); color:var(--rose); }
.shell { max-width:69rem; margin-inline:auto; padding:0 clamp(1rem,5vw,3rem) 3.3rem; }
.top { min-height:4.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:.15rem 1rem; border-bottom:1px solid var(--stroke); }
.brand { color:var(--ink); text-decoration:none; font:italic 500 1.6rem/1 var(--serif); }
.top-actions { display:flex; align-items:center; gap:.7rem 1.15rem; flex-wrap:wrap; font-size:.87rem; }
.top-actions a, .text-button { min-height:44px; display:inline-flex; align-items:center; }
.text-button { padding:.25rem 0; background:none; border:0; color:var(--lilac); gap:.38rem; }
.text-button:hover { text-decoration:underline; text-underline-offset:.25em; }
.hero { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,19rem); align-items:center; gap:2rem; margin:1.75rem 0 2.75rem; padding:clamp(1.35rem,4vw,2.65rem); border:1px solid var(--stroke); border-radius:1rem; background:var(--profile-hero-glow),var(--panel); color:var(--ink); }
.identity { min-width:0; }
.owner { color:var(--muted); font-size:.86rem; margin:0 0 .45rem; }
h1 { font:italic 400 clamp(3.6rem,10vw,6rem)/.88 var(--serif); letter-spacing:-.035em; margin:0 0 .66rem; overflow-wrap:anywhere; }
.identity p:not(.owner) { margin:.45rem 0 0; color:var(--muted); max-width:34ch; overflow-wrap:anywhere; }
.portrait { width:100%; height:auto; display:block; border-radius:.66rem; border:1px solid var(--identity-border); }
.body-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,14rem); gap:3.2rem; align-items:start; }
h2 { font:400 clamp(1.9rem,5vw,3rem)/1.04 var(--serif); letter-spacing:-.026em; text-wrap:balance; margin:0; }
h3 { font:400 1.43rem/1.13 var(--serif); margin:0; }
.answer-top { display:flex; justify-content:space-between; align-items:center; gap:.16rem 1rem; flex-wrap:wrap; margin-bottom:.9rem; }
.answer-top .text-button { align-self:center; }
.searchfield { min-height:50px; display:flex; align-items:center; gap:.6rem; border:1px solid var(--stroke); border-radius:.61rem; background:var(--panel); padding:0 .78rem; color:var(--muted); }
.searchfield:focus-within { outline:2px solid var(--focus); outline-offset:2px; }
.searchfield input { width:100%; min-width:0; min-height:48px; border:0; outline:0; background:none; color:var(--ink); }
.searchfield input::placeholder { color:var(--muted); }
.searchfield > svg { flex:none; }
.searchfield input::-webkit-search-cancel-button { -webkit-appearance:none; }
.clear { background:none; border:0; color:var(--lilac); min-width:44px; min-height:44px; font-size:.85rem; }
.filters { position:relative; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); margin:.65rem 0 0; column-gap:1rem; }
.filter-ink { position:absolute; top:0; left:0; height:2px; width:0; border-radius:2px; background:var(--rose); pointer-events:none; }
.filter { display:flex; align-items:center; justify-content:space-between; text-align:start; gap:.2rem .4rem; min-height:46px; padding:.48rem .28rem; border:0; border-bottom:1px solid var(--stroke); background:none; overflow-wrap:anywhere; }
.filter small { color:var(--muted); font-size:.84rem; font-variant-numeric:tabular-nums; }
.filter[aria-pressed="true"] { font-weight:650; color:var(--rose); }
.filter:focus-visible { outline-offset:-3px; }
.list { margin:1.05rem 0 0; }
.answer { border-bottom:1px solid var(--stroke); }
.answer-trigger { display:grid; grid-template-columns:minmax(0,1fr) auto auto; align-items:center; gap:.62rem; min-height:68px; background:none; border:0; padding:.57rem .1rem; text-align:left; width:100%; }
.answer-trigger:hover, .answer-trigger[aria-expanded="true"] { color:var(--rose); }
.answer-title { min-width:0; display:grid; overflow-wrap:anywhere; }
.answer-title > span { font-size:1rem; font-weight:620; line-height:1.31; }
.answer-title small { color:var(--muted); font-size:.82rem; margin-top:.18rem; }
.answer-status { display:flex; align-items:center; gap:.36rem; min-width:0; overflow-wrap:anywhere; font-size:.78rem; color:var(--tone,var(--muted)); white-space:normal; }
.answer-status i { width:.38rem; height:.38rem; flex:none; background:currentColor; border-radius:50%; }
[data-tone="yes"] {--tone:var(--yes)} [data-tone="ok"] {--tone:var(--ok)} [data-tone="maybe"] {--tone:var(--maybe)} [data-tone="for"] {--tone:var(--for)} [data-tone="hard"] {--tone:var(--hard)}
.chevron { display:flex; color:var(--muted); }
.answer-trigger[aria-expanded="true"] .chevron { transform:rotate(90deg); }
.answer-inner { margin:0 0 .82rem; padding:.78rem 1rem; border-left:1px solid var(--lilac); background:var(--panel); overflow-wrap:anywhere; }
.answer-inner p { margin:.3rem 0 0; max-width:56ch; }
.context-label { color:var(--lilac); font-size:.82rem; font-weight:650; }
.empty { color:var(--muted); padding:1rem 0; margin:0; }
.boundary,.private,.catalogue { border-top:1px solid var(--stroke); margin:1.5rem 0 0; padding-top:1rem; }
.boundary h3 { color:var(--hard); }
.boundary p { margin:.37rem 0 .12rem; }
.boundary:focus-visible { outline-offset:6px; }
.private-trigger { width:100%; display:flex; align-items:center; gap:.55rem; text-align:left; background:none; border:0; padding:0; min-height:44px; color:var(--lilac); }
.private-trigger .chevron { margin-inline-start:auto; }
.private-trigger[aria-expanded="true"] .chevron { transform:rotate(90deg); }
.private-body { padding:.4rem 0 0; }
.private-body p { margin:.36rem 0; color:var(--muted); }
.note-frame { position:relative; overflow:hidden; isolation:isolate; display:grid; align-items:center; min-height:6rem; margin:.4rem 0 0; padding:.85rem .75rem; border:1px solid var(--identity-border); border-radius:.64rem; background:var(--panel); perspective:500px; }
.private-body .revealed-note { color:var(--ink); margin:0; max-width:46ch; }
.veil, .seal { display:none; pointer-events:none; }
.note-frame[data-veil] .veil { display:block; position:absolute; inset-block:0; width:50.3%; background:linear-gradient(125deg,var(--surface3),var(--surface2) 64%,var(--surface)); border:1px solid var(--identity-border); backface-visibility:hidden; }
.veil-left { left:0; transform-origin:left center; }
.veil-right { right:0; transform-origin:right center; }
.note-frame[data-veil] .seal { display:grid; position:absolute; inset:0; margin:auto; place-items:center; width:2.3rem; height:2.3rem; border:1px solid var(--accent); border-radius:50%; color:var(--on-accent-fill); background:var(--accent-fill); box-shadow:0 0 0 .24rem color-mix(in srgb,var(--accent) 18%,transparent); }
.catalogue { margin:0 0 1.35rem; padding-top:.85rem; }
.cat-head { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:.4rem 1rem; }
.catalogue ul { margin:0; padding:0; list-style:none; }
.catalogue li { border-bottom:1px solid var(--stroke); padding:.57rem .13rem; }
.sidebar { border-left:1px solid var(--stroke); padding:.25rem 0 .15rem 1.25rem; }
.sidebar p { color:var(--muted); margin:.5rem 0 0; font-size:.93rem; }
.sidebar .text-button { margin-top:.35rem; }
footer { color:var(--muted); border-top:1px solid var(--stroke); margin-top:2.05rem; padding-top:.9rem; font-size:.85rem; }
@media(max-width:48rem) {
  .hero { grid-template-columns:minmax(0,1fr) minmax(0,8rem); gap:.85rem; padding:1.23rem; margin:1.13rem 0 1.85rem; }
  .body-grid { grid-template-columns:minmax(0,1fr); gap:1.65rem; }
  .sidebar { border-left:0; border-top:1px solid var(--stroke); padding:.85rem 0 0; }
}
@media(max-width:30rem) {
  .hero { grid-template-columns:minmax(0,1fr) minmax(0,min(32%,6.15rem)); gap:.65rem; }
  .owner { font-size:.78rem; } .identity p:not(.owner) { font-size:.9rem; }
  .filters { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .answer-trigger { grid-template-columns:minmax(0,1fr) minmax(3.65rem,auto) 18px; gap:.45rem; }
}
@media(prefers-reduced-motion:reduce) { *, *::before, *::after { animation:none !important; transition:none !important; } }
</style>
</head>
<body>
<div class="shell">
<header class="top">
  <a class="brand" href="/hot">KinkSync</a>
  <div class="top-actions"><a href="/hot">Alle studies</a><button class="text-button" id="theme" type="button" aria-pressed="false">Papieren thema</button></div>
</header>
<main>
  <section class="hero" aria-labelledby="name">
    <div class="identity"><p class="owner">Mijn profiel</p><h1 id="name">Alex</h1><p>Ik neem graag de tijd om eerst bij elkaar af te stemmen.</p></div>
    <svg class="portrait" viewBox="0 0 322 260" aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="field" cx="55%" cy="45%" r="64%"><stop stop-color="var(--surface3)"/><stop offset="1" stop-color="var(--surface)"/></radialGradient>
    <linearGradient id="foil" x1="0%" x2="100%" y1="0%" y2="100%"><stop stop-color="var(--accent-text)"/><stop offset=".46" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent2-text)"/></linearGradient>
    <radialGradient id="orb"><stop stop-color="var(--accent)" stop-opacity=".25"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="322" height="260" fill="url(#field)"/>
  <ellipse cx="165" cy="126" rx="133" ry="125" fill="url(#orb)"/>
  <g fill="none" stroke="url(#foil)" stroke-width=".75" opacity=".65">
    <circle cx="161" cy="130" r="95"/><circle cx="161" cy="130" r="102"/>
    <ellipse cx="161" cy="130" rx="125" ry="54" transform="rotate(-33 161 130)"/>
    <ellipse cx="161" cy="130" rx="112" ry="42" transform="rotate(41 161 130)" opacity=".64"/>
    <path d="M161 18v15m0 194v15M48 130h15m196 0h15" opacity=".8"/>
  </g>
  <circle cx="243" cy="83" r="2.7" fill="var(--accent-text)"/><circle cx="76" cy="179" r="2" fill="var(--accent2-text)"/>
  <text x="157" y="175" text-anchor="middle" fill="var(--text)" font-family="Palatino Linotype, Georgia, serif" font-size="136" font-style="italic">A</text>
</svg>
  </section>
  <div class="body-grid">
    <section aria-labelledby="interests">
      <div class="answer-top"><h2 id="interests">Interesses &amp; grenzen</h2><button class="text-button" type="button" id="catalogue-trigger" aria-expanded="false" aria-controls="catalogue">Zoek in catalogus <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>
      <section id="catalogue" class="catalogue" aria-labelledby="cat-title" hidden>
        <div class="cat-head"><h3 id="cat-title">Catalogus</h3><button class="text-button" type="button" id="catalogue-close">Terug naar antwoorden</button></div>
        <div class="searchfield"><span aria-hidden="true"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="10.8" cy="10.8" r="6.2" stroke="currentColor" stroke-width="1.6"/><path d="m15.3 15.3 4.2 4.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></span><input type="search" id="catalogue-search" aria-label="Zoek een onderwerp in de catalogus" placeholder="Zoek een onderwerp"></div>
        <ul id="catalogue-list">
          <li>Een vast beginritueel</li><li>Een blinddoek</li><li>Samen landen</li><li>De ander het initiatief laten nemen</li><li>Een afgesproken pauzemoment</li>
        </ul><p id="catalogue-empty" class="empty" hidden>Geen onderwerpen gevonden.</p>
      </section>
      <div id="answers">
        <div class="searchfield"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="10.8" cy="10.8" r="6.2" stroke="currentColor" stroke-width="1.6"/><path d="m15.3 15.3 4.2 4.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><input type="search" id="answer-search" aria-label="Zoeken in mijn antwoorden" placeholder="Zoeken in mijn antwoorden"><button class="clear" id="clear-search" type="button" hidden>Wis</button></div>
        <div class="filters" id="filters" role="group" aria-label="Filter antwoorden op status">
          <span class="filter-ink" id="filter-ink" aria-hidden="true"></span>
          <button type="button" class="filter" data-filter="all" aria-pressed="true">Alles <small>5</small></button>
          <button type="button" class="filter" data-filter="yes" aria-pressed="false">Heel graag <small>2</small></button>
          <button type="button" class="filter" data-filter="ok" aria-pressed="false">Ja <small>1</small></button>
          <button type="button" class="filter" data-filter="maybe" aria-pressed="false">Misschien <small>1</small></button>
          <button type="button" class="filter" data-filter="for" aria-pressed="false">Voor hen <small>1</small></button>
          <button type="button" class="filter" data-filter="hard" aria-pressed="false">Harde grens <small>1</small></button>
        </div>
        <div id="answer-list" class="list"><article class="answer" data-answer="yes" data-search="Tijd nemen voor elkaar Intimiteit">
  <button class="answer-trigger" type="button" aria-expanded="false" aria-controls="vertragen">
    <span class="answer-title"><span>Tijd nemen voor elkaar</span><small>Intimiteit</small></span>
    <span class="answer-status" data-tone="yes"><i aria-hidden="true"></i>Heel graag</span>
    <span class="chevron"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
  </button>
  <div class="answer-panel" id="vertragen" hidden><div class="answer-inner"><span class="context-label">Mijn context</span><p>Een rustig begin maakt het makkelijker om af te stemmen en eerlijk te zeggen wat wel of niet fijn voelt.</p></div></div>
</article>
<article class="answer" data-answer="yes" data-search="Samen landen Nazorg">
  <button class="answer-trigger" type="button" aria-expanded="false" aria-controls="nazorg">
    <span class="answer-title"><span>Samen landen</span><small>Nazorg</small></span>
    <span class="answer-status" data-tone="yes"><i aria-hidden="true"></i>Heel graag</span>
    <span class="chevron"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
  </button>
  <div class="answer-panel" id="nazorg" hidden><div class="answer-inner"><span class="context-label">Mijn context</span><p>Ik vind het fijn om nadien nog even samen te blijven en te bespreken hoe het was.</p></div></div>
</article>
<article class="answer" data-answer="ok" data-search="Een vast beginritueel Rituelen">
  <button class="answer-trigger" type="button" aria-expanded="false" aria-controls="rituelen">
    <span class="answer-title"><span>Een vast beginritueel</span><small>Rituelen</small></span>
    <span class="answer-status" data-tone="ok"><i aria-hidden="true"></i>Ja</span>
    <span class="chevron"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
  </button>
  <div class="answer-panel" id="rituelen" hidden><div class="answer-inner"><span class="context-label">Mijn context</span><p>Een klein gebaar of een korte check-in is voor mij genoeg.</p></div></div>
</article>
<article class="answer" data-answer="maybe" data-search="Een blinddoek Zintuigen">
  <button class="answer-trigger" type="button" aria-expanded="false" aria-controls="blinddoek">
    <span class="answer-title"><span>Een blinddoek</span><small>Zintuigen</small></span>
    <span class="answer-status" data-tone="maybe"><i aria-hidden="true"></i>Misschien</span>
    <span class="chevron"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
  </button>
  <div class="answer-panel" id="blinddoek" hidden><div class="answer-inner"><span class="context-label">Mijn context</span><p>Alleen als ik vooraf weet wat ik kan verwachten en zelf kan stoppen.</p></div></div>
</article>
<article class="answer" data-answer="for" data-search="De ander het initiatief laten nemen Afstemming">
  <button class="answer-trigger" type="button" aria-expanded="false" aria-controls="initiatief">
    <span class="answer-title"><span>De ander het initiatief laten nemen</span><small>Afstemming</small></span>
    <span class="answer-status" data-tone="for"><i aria-hidden="true"></i>Voor hen</span>
    <span class="chevron"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
  </button>
  <div class="answer-panel" id="initiatief" hidden><div class="answer-inner"><span class="context-label">Mijn context</span><p>Dit hoeft voor mij niet, maar met duidelijke afspraken kan het voor de ander fijn zijn.</p></div></div>
</article></div>
        <p class="empty" id="answer-empty" role="status" hidden>Geen antwoorden voor deze zoekopdracht.</p>
      </div>
      <section class="boundary" id="boundaries" tabindex="-1" aria-labelledby="boundary-title">
        <h3 id="boundary-title">Harde grens</h3><p>Opnames maken</p>
      </section>
    </section>
    <aside class="sidebar" aria-label="Perspectief en privé">
      <h3>Mijn perspectief</h3><p>Dit profiel lees je vanuit mij. Een antwoord beschrijft een voorkeur, geen toestemming.</p>
      <section class="private">
        <h3><button type="button" class="private-trigger" id="private-trigger" aria-expanded="false" aria-controls="private-body"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M8 10V7a4 4 0 1 1 8 0v3m-9 0h10a2 2 0 0 1 2 2v7H5v-7a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg><span>Privé</span><span class="chevron"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span></button></h3>
        <div id="private-body" class="private-body" hidden>
          <p>Persoonlijke notities blijven afgeschermd tot je ze toont.</p>
          <button class="text-button" id="private-reveal" type="button" aria-controls="private-note" aria-expanded="false">Toon voorbeeldnotitie</button>
          <div class="note-frame" id="private-note" hidden><p class="revealed-note" id="private-copy"></p><div class="veil veil-left" aria-hidden="true"></div><div class="veil veil-right" aria-hidden="true"></div><span class="seal" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8 10V7a4 4 0 1 1 8 0v3m-9 0h10a2 2 0 0 1 2 2v7H5v-7a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg></span></div>
        </div>
      </section>
    </aside>
  </div>
</main>
<footer>Profielconcept · fictieve gegevens · niets wordt opgeslagen.</footer>
</div>
<script src="/hot?asset=gsap"></script>
<script>
(() => {
  'use strict';
  const get = (id) => document.getElementById(id);
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const engine = window.gsap;
  let motionElement = null;
  function settle() {
    if (!motionElement) return;
    engine?.killTweensOf(motionElement);
    motionElement.removeAttribute('style');
    motionElement = null;
  }
  function reveal(element, distance) {
    settle();
    if (!engine || preference.matches) return;
    motionElement = element;
    engine.fromTo(element, { opacity: .56, y: distance }, { opacity: 1, y: 0, ease: 'power3.out', duration: .26, onComplete: settle });
  }
  const theme = get('theme');
  theme.addEventListener('click', () => {
    settle();
    const paper = document.documentElement.dataset.theme !== 'light';
    document.documentElement.dataset.theme = paper ? 'light' : 'dark';
    theme.setAttribute('aria-pressed', String(paper));
  });

  const scope = get('answer-search');
  const clearSearch = get('clear-search');
  const empty = get('answer-empty');
  const list = get('answer-list');
  const answers = [...document.querySelectorAll('[data-answer]')];
  const filters = [...document.querySelectorAll('[data-filter]')];
  const filterInk = get('filter-ink');
  let currentFilter = 'all';
  let inkTarget = '';
  function alignInk(animate, force) {
    const button = filters.find(item => item.dataset.filter === currentFilter);
    if (!button.offsetWidth) return;
    const x = button.offsetLeft;
    const y = button.offsetTop + button.offsetHeight - 2;
    const width = button.offsetWidth;
    const target = x + ':' + y + ':' + width;
    if (!force && target === inkTarget) return;
    inkTarget = target;
    if (!engine) {
      filterInk.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
      filterInk.style.width = width + 'px';
      return;
    }
    engine.killTweensOf(filterInk);
    if (animate && !preference.matches) engine.to(filterInk, { x, y, width, duration: .28, ease: 'power3.out' });
    else engine.set(filterInk, { x, y, width });
  }
  alignInk(false);
  if (window.ResizeObserver) new ResizeObserver(() => alignInk(false)).observe(get('filters'));
  else addEventListener('resize', () => alignInk(false));
  const normalize = (value) => value.trim().toLocaleLowerCase('nl-BE');
  function closeRow(row) {
    const trigger = row.querySelector('.answer-trigger');
    trigger.setAttribute('aria-expanded', 'false');
    get(trigger.getAttribute('aria-controls')).hidden = true;
  }
  function filterAnswers() {
    settle();
    const term = normalize(scope.value);
    clearSearch.hidden = scope.value.length === 0;
    list.hidden = currentFilter === 'hard';
    let count = 0;
    for (const row of answers) {
      const status = currentFilter === 'all' || currentFilter === row.dataset.answer;
      row.hidden = !status || !normalize(row.dataset.search).includes(term);
      if (row.hidden) closeRow(row);
      else count++;
    }
    empty.hidden = currentFilter === 'hard' || count > 0;
  }
  function chooseFilter(button) {
    currentFilter = button.dataset.filter;
    filters.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    answers.forEach(closeRow);
    filterAnswers();
    alignInk(true);
    if (currentFilter === 'hard') get('boundaries').focus();
  }
  answers.forEach(row => {
    const trigger = row.querySelector('.answer-trigger');
    trigger.addEventListener('click', () => {
      const next = trigger.getAttribute('aria-expanded') !== 'true';
      settle();
      answers.forEach(closeRow);
      if (!next) return;
      trigger.setAttribute('aria-expanded', 'true');
      const body = get(trigger.getAttribute('aria-controls'));
      body.hidden = false;
      reveal(body.firstElementChild, -5);
    });
  });
  filters.forEach(item => item.addEventListener('click', () => chooseFilter(item)));
  scope.addEventListener('input', () => {
    if (currentFilter === 'hard') chooseFilter(filters[0]);
    filterAnswers();
  });
  clearSearch.addEventListener('click', () => { scope.value = ''; scope.focus(); filterAnswers(); });

  const catalogueTrigger = get('catalogue-trigger');
  const catalogueSearch = get('catalogue-search');
  const catalogueItems = [...get('catalogue-list').children];
  function openCatalogue(open) {
    settle();
    get('catalogue').hidden = !open;
    get('answers').hidden = open;
    catalogueTrigger.setAttribute('aria-expanded', String(open));
    if (open) catalogueSearch.focus();
    else { catalogueTrigger.focus(); alignInk(false); }
  }
  catalogueTrigger.addEventListener('click', () => openCatalogue(get('catalogue').hidden));
  get('catalogue-close').addEventListener('click', () => openCatalogue(false));
  get('catalogue').addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); openCatalogue(false); }
  });
  catalogueSearch.addEventListener('input', () => {
    let count = 0;
    for (const item of catalogueItems) {
      item.hidden = !normalize(item.textContent).includes(normalize(catalogueSearch.value));
      if (!item.hidden) count++;
    }
    get('catalogue-empty').hidden = count > 0;
  });

  const privateToggle = get('private-trigger');
  const privateBody = get('private-body');
  const privateButton = get('private-reveal');
  const note = get('private-note');
  const copy = get('private-copy');
  const left = note.querySelector('.veil-left');
  const right = note.querySelector('.veil-right');
  const seal = note.querySelector('.seal');
  let opening = null;
  function settleNote() {
    opening?.kill();
    opening = null;
    note.removeAttribute('data-veil');
    for (const part of [left, right, seal, copy]) part.removeAttribute('style');
  }
  function unseal() {
    if (!engine || preference.matches) return;
    note.dataset.veil = 'true';
    opening = engine.timeline({ onComplete: settleNote });
    opening
      .set(copy, { clipPath: 'inset(0 49% 0 49%)', y: 6 }, 0)
      .to(seal, { scale: 1.15, duration: .1, ease: 'power2.out' }, 0)
      .to(seal, { scale: .48, opacity: 0, duration: .16, ease: 'power2.in' }, .1)
      .to(left, { rotationY: -73, xPercent: -82, duration: .57, ease: 'power3.inOut' }, .12)
      .to(right, { rotationY: 73, xPercent: 82, duration: .57, ease: 'power3.inOut' }, .12)
      .to(copy, { clipPath: 'inset(0 0% 0 0%)', y: 0, duration: .44, ease: 'power2.inOut' }, .18);
  }
  function hideNote() {
    note.hidden = true;
    copy.textContent = '';
    settleNote();
    privateButton.textContent = 'Toon voorbeeldnotitie';
    privateButton.setAttribute('aria-expanded', 'false');
  }
  privateToggle.addEventListener('click', () => {
    const open = privateBody.hidden;
    if (!open) hideNote();
    privateToggle.setAttribute('aria-expanded', String(open));
    privateBody.hidden = !open;
  });
  privateButton.addEventListener('click', () => {
    if (!note.hidden) { hideNote(); return; }
    copy.textContent = 'Als ik stil word, helpt een rustige check-in meer dan een nieuwe vraag.';
    note.hidden = false;
    privateButton.textContent = 'Verberg voorbeeldnotitie';
    privateButton.setAttribute('aria-expanded', 'true');
    unseal();
  });
  preference.addEventListener('change', () => { settle(); settleNote(); alignInk(false, true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { settle(); hideNote(); } });
})();
</script>
</body>
</html>`;
