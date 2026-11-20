import { CONCEPT_BASE_CSS, CONCEPT_THEME_SCRIPT, PROFILE_PORTRAIT, conceptHeader, conceptHref, type HotTheme } from "./concept-shared";

export function homeConcept(theme: HotTheme) {
  return `<!doctype html>
<html lang="nl" data-theme="${theme}" data-hot-view="home">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Home · KinkSync concept</title>
<link rel="stylesheet" href="/hot?asset=profile-theme">
<style>
${CONCEPT_BASE_CSS}
.study { max-width:40rem; padding-top:clamp(2rem,9vw,6.2rem); }
.eyebrow { color:var(--lilac); margin:0 0 .5rem; font-size:.86rem; }
h1 { font:400 clamp(2.4rem,7.7vw,4.35rem)/1.04 var(--serif); letter-spacing:-.038em; margin:0 0 .58rem; overflow-wrap:anywhere; }
.intro { margin:0 0 clamp(1.4rem,5vw,3rem); color:var(--muted); max-width:42ch; }
.person { display:grid; grid-template-columns:minmax(0,1fr) 3.5rem auto; align-items:center; gap:.8rem; padding:.82rem .48rem .82rem .72rem; min-height:5.65rem; color:var(--ink); text-decoration:none; }
.person .identity-surface { border-top:1px solid var(--stroke); border-bottom:1px solid var(--stroke); }
.person:hover .identity-surface, .person:focus-visible .identity-surface { background:var(--profile-stack-surface); }
.person:active .identity-surface { background:var(--surface2); }
.person-copy { min-width:0; }
.person p { margin:0; color:var(--muted); font-size:.86rem; }
.person h2 { margin:.25rem 0 0; font:italic 400 2.25rem/.96 var(--serif); letter-spacing:-.035em; overflow-wrap:anywhere; }
.person-arrow { color:var(--lilac); display:block; width:1.1rem; }
@media(max-width:24rem) { .person { grid-template-columns:minmax(0,1fr) 2.95rem auto; gap:.55rem; } }
</style>
</head>
<body><div class="shell">
${conceptHeader(theme)}
<main class="study">
  <p class="eyebrow">Jouw ruimte</p>
  <h1>Mijn profielen</h1>
  <p class="intro">Een plek voor je interesses, je grenzen en wat je erbij wilt vertellen.</p>
  <a class="person identity-route" href="${conceptHref("profiel", theme)}" data-concept-link aria-label="Open profiel van Alex">
    <span class="identity-surface" data-share="surface" aria-hidden="true"></span>
    <div class="person-copy"><p>Mijn profiel</p><h2 class="identity-name" data-share="name">Alex</h2></div>
    ${PROFILE_PORTRAIT}
    <svg class="person-arrow" aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </a>
</main>
<footer>Homeconcept · fictief profiel · niets wordt opgeslagen.</footer>
</div>
<script>(() => {
${CONCEPT_THEME_SCRIPT}
  document.getElementById('theme').addEventListener('click', toggleConceptTheme);
})();</script>
</body>
</html>`;
}
