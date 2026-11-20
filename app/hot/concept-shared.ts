export type HotTheme = "dark" | "light";

export function conceptHref(concept: "home" | "profiel", theme: HotTheme) {
  return "/hot?concept=" + concept + (theme === "light" ? "&amp;thema=licht" : "");
}

export function conceptHeader(theme: HotTheme, profile = false) {
  const home = conceptHref("home", theme);
  return `<header class="top">
  ${profile ? `<a class="brand" href="${home}" data-concept-link aria-label="KinkSync Home">KinkSync</a>` : '<span class="brand">KinkSync</span>'}
  <nav class="top-actions" aria-label="Hot concept">${profile ? `<a href="${home}" data-concept-link>Home</a>` : ""}<a href="/hot">Alle studies</a><button class="text-button" id="theme" type="button" aria-pressed="${theme === "light"}">Papieren thema</button></nav>
</header>`;
}

export const CONCEPT_BASE_CSS = `
:root {
  --panel:var(--surface); --ink:var(--text); --muted:var(--text2); --stroke:var(--border);
  --rose:var(--accent-text); --lilac:var(--accent2-text); --selected:var(--surface2);
  --serif:"Iowan Old Style","Palatino Linotype",Georgia,serif;
}
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
.brand { display:inline-flex; align-items:center; min-height:44px; color:var(--ink); text-decoration:none; font:italic 500 1.6rem/1 var(--serif); }
.top-actions { display:flex; align-items:center; gap:.15rem 1rem; flex-wrap:wrap; font-size:.87rem; }
.top-actions a, .text-button { min-height:44px; display:inline-flex; align-items:center; }
.text-button { padding:.25rem 0; background:none; border:0; color:var(--lilac); gap:.38rem; }
.text-button:hover { text-decoration:underline; text-underline-offset:.25em; }
.identity-route { position:relative; isolation:isolate; }
.identity-surface { position:absolute; inset:0; z-index:-1; pointer-events:none; }
.identity-name { width:fit-content; max-width:100%; }
.portrait { width:100%; height:auto; display:block; border-radius:.66rem; border:1px solid var(--identity-border); }
footer { color:var(--muted); border-top:1px solid var(--stroke); margin-top:2.05rem; padding-top:.9rem; font-size:.85rem; }

/* The document stays live. Never capture the profile body or its private note. */
:root { view-transition-name:none; }
@media (prefers-reduced-motion:no-preference) {
  @view-transition { navigation:auto; }
  [data-share="surface"] { view-transition-name:profile-surface; }
  [data-share="name"] { view-transition-name:profile-name; }
  [data-share="avatar"] { view-transition-name:profile-avatar; }
  ::view-transition { pointer-events:none; }
  ::view-transition-group(profile-surface),
  ::view-transition-group(profile-name),
  ::view-transition-group(profile-avatar) { animation-duration:340ms; animation-timing-function:cubic-bezier(.24,.76,.34,1); }
  ::view-transition-group(profile-name), ::view-transition-group(profile-avatar) { z-index:1; }
  /* Resample the larger portrait and name, including when travelling back. */
  :root[data-hot-view="profile"]::view-transition-old(profile-name),
  :root[data-hot-view="profile"]::view-transition-old(profile-avatar),
  :root[data-hot-view="home"]::view-transition-new(profile-name),
  :root[data-hot-view="home"]::view-transition-new(profile-avatar) { animation:none; opacity:0; }
  :root[data-hot-view="profile"]::view-transition-new(profile-name),
  :root[data-hot-view="profile"]::view-transition-new(profile-avatar),
  :root[data-hot-view="home"]::view-transition-old(profile-name),
  :root[data-hot-view="home"]::view-transition-old(profile-avatar) { animation:none; opacity:1; }
}
`;

export const PROFILE_PORTRAIT = `<svg class="portrait" data-share="avatar" viewBox="0 0 322 260" aria-hidden="true" focusable="false">
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
</svg>`;

export const CONCEPT_THEME_SCRIPT = `
function toggleConceptTheme() {
  const root = document.documentElement;
  const light = root.dataset.theme !== 'light';
  root.dataset.theme = light ? 'light' : 'dark';
  document.getElementById('theme').setAttribute('aria-pressed', String(light));
  const themed = (href) => {
    const url = new URL(href);
    if (light) url.searchParams.set('thema', 'licht');
    else url.searchParams.delete('thema');
    return url;
  };
  history.replaceState(history.state, '', themed(location.href));
  for (const link of document.querySelectorAll('[data-concept-link]')) link.href = themed(link.href).href;
}
`;
