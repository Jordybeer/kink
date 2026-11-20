import { CONCEPT_BASE_CSS, CONCEPT_THEME_SCRIPT, PROFILE_PORTRAIT, conceptHeader, type HotTheme } from "./concept-shared";

export function profileConcept(theme: HotTheme) {
  return `<!doctype html>
<html lang="nl" data-theme="${theme}" data-hot-view="profile">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Alex · KinkSync profielconcept</title>
<link rel="stylesheet" href="/hot?asset=profile-theme">
<style>
${CONCEPT_BASE_CSS}
:root { --ok:var(--willing); --for:var(--no); --hard:var(--hard-no-text); }
.sr-only { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap; }
.hero { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,19rem); align-items:center; gap:2rem; margin:1.75rem 0 2.75rem; padding:clamp(1.35rem,4vw,2.65rem); border:1px solid transparent; color:var(--ink); }
.hero .identity-surface { inset:-1px; border:1px solid var(--stroke); border-radius:1rem; background:var(--profile-hero-glow),var(--panel); }
.identity { min-width:0; }
.owner { color:var(--muted); font-size:.86rem; margin:0 0 .45rem; }
h1 { font:italic 400 clamp(3.6rem,10vw,6rem)/.88 var(--serif); letter-spacing:-.035em; margin:0 0 .66rem; overflow-wrap:anywhere; }
.identity p:not(.owner) { margin:.45rem 0 0; color:var(--muted); max-width:34ch; overflow-wrap:anywhere; }
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
.filter-ink { position:absolute; top:0; left:0; height:2px; width:100px; transform:scaleX(0); transform-origin:left center; border-radius:2px; background:var(--rose); pointer-events:none; }
.filter { display:flex; align-items:center; justify-content:space-between; text-align:start; gap:.2rem .4rem; min-height:46px; padding:.48rem .28rem; border:0; border-bottom:1px solid var(--stroke); font-weight:600; background:none; overflow-wrap:anywhere; }
.filter small { color:var(--muted); font-size:.84rem; font-variant-numeric:tabular-nums; }
.filter[aria-pressed="true"] { color:var(--rose); }
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
.note-frame { position:relative; overflow:hidden; isolation:isolate; display:grid; align-items:center; min-height:6rem; margin:.4rem 0 0; padding:.85rem .75rem; border:1px solid var(--identity-border); border-radius:.64rem; background:var(--panel); }
.private-body .revealed-note { color:var(--ink); margin:0; max-width:46ch; }
.veil, .seal { display:none; pointer-events:none; }
.note-frame[data-veil] .veil { display:block; position:absolute; inset-block:0; width:50.3%; background:linear-gradient(125deg,var(--surface3),var(--surface2) 64%,var(--surface)); border:1px solid var(--identity-border); }
.veil-left { left:0; }
.veil-right { right:0; }
.note-frame[data-veil] .seal { display:grid; position:absolute; inset:0; margin:auto; place-items:center; width:2.3rem; height:2.3rem; border:1px solid var(--accent); border-radius:50%; color:var(--on-accent-fill); background:var(--accent-fill); box-shadow:0 0 0 .24rem color-mix(in srgb,var(--accent) 18%,transparent); }
.catalogue { margin:0 0 1.35rem; padding-top:.85rem; }
.cat-head { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:.4rem 1rem; }
.catalogue ul { margin:0; padding:0; list-style:none; }
.catalogue li { border-bottom:1px solid var(--stroke); padding:.57rem .13rem; }
.sidebar { border-left:1px solid var(--stroke); padding:.25rem 0 .15rem 1.25rem; }
.sidebar p { color:var(--muted); margin:.5rem 0 0; font-size:.93rem; }
.sidebar .text-button { margin-top:.35rem; }
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
${conceptHeader(theme, true)}
<main>
  <section class="hero identity-route" aria-labelledby="name">
    <span class="identity-surface" data-share="surface" aria-hidden="true"></span>
    <div class="identity"><p class="owner">Mijn profiel</p><h1 class="identity-name" data-share="name" id="name">Alex</h1><p>Ik neem graag de tijd om eerst bij elkaar af te stemmen.</p></div>
    ${PROFILE_PORTRAIT}
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
        <div id="filter-status" class="sr-only" role="status"></div>
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
<script>
(() => {
  'use strict';
${CONCEPT_THEME_SCRIPT}
  const get = (id) => document.getElementById(id);
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const canAnimate = typeof Element.prototype.animate === 'function';
  const easeOut = 'cubic-bezier(.2,.8,.2,1)';
  let rowMotion = null;
  function settle() {
    rowMotion?.cancel();
    rowMotion = null;
  }
  function reveal(element) {
    settle();
    if (!canAnimate || preference.matches) return;
    rowMotion = element.animate(
      [{ opacity: .64, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 145, easing: easeOut },
    );
  }
  get('theme').addEventListener('click', () => {
    settle();
    toggleConceptTheme();
  });

  const scope = get('answer-search');
  const clearSearch = get('clear-search');
  const empty = get('answer-empty');
  const list = get('answer-list');
  const answers = [...document.querySelectorAll('[data-answer]')];
  const filters = [...document.querySelectorAll('[data-filter]')];
  const filterInk = get('filter-ink');
  const filterStatus = get('filter-status');
  let currentFilter = 'all';
  let inkTarget = null;
  let inkMotion = null;
  function alignInk(animate, force) {
    const button = filters.find(item => item.dataset.filter === currentFilter);
    if (!button.offsetWidth) return;
    const x = button.offsetLeft;
    const y = button.offsetTop + button.offsetHeight - 2;
    const width = button.offsetWidth;
    const transform = 'translate(' + x + 'px, ' + y + 'px) scaleX(' + width / 100 + ')';
    if (!force && transform === inkTarget?.transform) return;
    const play = animate && canAnimate && !preference.matches && inkTarget !== null;
    const sameRow = play && Math.abs(y - inkTarget.y) < 2;
    const from = sameRow
      ? (inkMotion?.playState === 'running' ? getComputedStyle(filterInk).transform : inkTarget.transform)
      : transform;
    inkMotion?.cancel();
    inkTarget = { transform, y };
    filterInk.style.transform = transform;
    inkMotion = play ? filterInk.animate(
      sameRow ? [{ transform: from }, { transform }] : [{ opacity: .32 }, { opacity: 1 }],
      { duration: sameRow ? 185 : 135, easing: easeOut },
    ) : null;
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
    return count;
  }
  function chooseFilter(button) {
    if (currentFilter === button.dataset.filter) return;
    currentFilter = button.dataset.filter;
    filters.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    answers.forEach(closeRow);
    const count = filterAnswers();
    alignInk(true);
    filterStatus.textContent = currentFilter === 'hard' ? 'Eén harde grens: opnames maken.'
      : count ? count + (count === 1 ? ' antwoord gevonden.' : ' antwoorden gevonden.') : '';
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
      reveal(body.firstElementChild);
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
  let opening = [];
  function settleNote() {
    for (const anim of opening) anim.cancel();
    opening = [];
    note.removeAttribute('data-veil');
  }
  function unseal() {
    if (!canAnimate || preference.matches) return;
    note.dataset.veil = 'true';
    const slide = (part, direction) => part.animate(
      [
        { transform: 'translateX(0) rotate(0deg)' },
        { transform: 'translateX(' + direction * 108 + '%) rotate(' + direction * 4 + 'deg)' },
      ],
      { duration: 345, delay: 40, fill: 'both', easing: 'cubic-bezier(.32,.05,.2,1)' },
    );
    const lead = slide(left, -1);
    opening = [
      lead,
      slide(right, 1),
      seal.animate(
        [{ transform: 'scale(1)', opacity: 1, easing: easeOut }, { transform: 'scale(1.08)', opacity: 1, offset: .25 }, { transform: 'scale(.72)', opacity: 0 }],
        { duration: 170, fill: 'both' },
      ),
      copy.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, delay: 80, fill: 'both', easing: easeOut }),
    ];
    lead.onfinish = () => { if (opening[0] === lead) settleNote(); };
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
  addEventListener('pagehide', hideNote);
})();
</script>
</body>
</html>`;
}
