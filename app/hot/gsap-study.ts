export const STUDY_STYLE = `
.study-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: .45rem 1rem; margin-bottom: 1rem; }
.study-head a { color: var(--lilac); text-underline-offset: .25em; font-size: .87rem; }
.study-figure { margin: 0; overflow: hidden; border: 1px solid var(--line); border-radius: .7rem; background: #17101e; }
.study-figure svg { display: block; width: 100%; height: auto; --foil-warm: #efa4ad; --foil-light: #ffdbce; --foil-cool: #c5b0e7; }
.study-controls { display: flex; align-items: center; flex-wrap: wrap; gap: .45rem; margin-top: .75rem; }
.study-reading { margin-top: 1rem; border-top: 1px solid var(--line); padding-top: .85rem; }
.study-reading h3 { font: 400 clamp(1.3rem, 3vw, 1.8rem)/1.18 var(--serif); margin: 0; color: var(--ink); }
.study-reading p { margin: .4rem 0 0; }
.study-play-icon { flex: none; }
#study-play { display: inline-flex; align-items: center; gap: .5rem; }
`;

export const STUDY_MARKUP = `<section class="stage study" id="study" role="tabpanel" aria-labelledby="tab-study" tabindex="0">
      <div class="study-head">
        <h2>Een laag dieper.</h2>
        <a href="/hot?concept=home">Open Home naar Profiel</a>
      </div>
      <figure class="study-figure">
        <svg viewBox="0 0 432 272" aria-hidden="true" focusable="false">
          <defs>
            <radialGradient id="study-room" cx="49%" cy="47%" r="75%">
              <stop stop-color="#3b283d"/><stop offset=".56" stop-color="#211726"/><stop offset="1" stop-color="#120d18"/>
            </radialGradient>
            <radialGradient id="study-light">
              <stop stop-color="var(--foil-warm)" stop-opacity=".85"/><stop offset="1" stop-color="var(--foil-cool)" stop-opacity="0"/>
            </radialGradient>
            <linearGradient id="study-warm-leaf" x1="0%" y1="4%" x2="100%" y2="100%">
              <stop stop-color="#492c3c"/><stop offset=".42" stop-color="#302035"/><stop offset="1" stop-color="#1e1425"/>
            </linearGradient>
            <linearGradient id="study-cool-leaf" x1="0%" y1="92%" x2="100%" y2="0%">
              <stop stop-color="#342749"/><stop offset=".48" stop-color="#302039"/><stop offset="1" stop-color="#21162b"/>
            </linearGradient>
            <linearGradient id="study-warm-edge" x1="0%" y1="0%" x2="90%" y2="100%">
              <stop stop-color="var(--foil-warm)" stop-opacity=".9"/><stop offset="1" stop-color="var(--foil-warm)" stop-opacity=".18"/>
            </linearGradient>
            <linearGradient id="study-cool-edge" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop stop-color="var(--foil-cool)" stop-opacity=".8"/><stop offset="1" stop-color="var(--foil-cool)" stop-opacity=".2"/>
            </linearGradient>
            <linearGradient id="study-ink" x1="0%" y1="66%" x2="100%" y2="36%">
              <stop stop-color="var(--foil-warm)"/><stop offset=".56" stop-color="var(--foil-light)"/><stop offset="1" stop-color="var(--foil-cool)"/>
            </linearGradient>
          </defs>
          <rect width="432" height="272" fill="url(#study-room)"/>
          <rect x="16.5" y="16.5" width="399" height="239" rx="9" fill="none" stroke="#bf99ae" stroke-opacity=".22"/>
          <path d="M28 37V28h9m358 0h9v9M28 235v9h9m358 0h9v-9M216 29v12m0 190v12M30 136h13m346 0h13" stroke="#ddadbf" stroke-opacity=".45" fill="none" stroke-linecap="round"/>
          <ellipse id="study-halo" cx="216" cy="136" rx="74" ry="61" fill="url(#study-light)" opacity=".09"/>
          <path d="M54 136h324M216 42v188" stroke="#c5b0e7" stroke-opacity=".12" stroke-dasharray="2 7" fill="none"/>
          <g id="study-leaf-a" transform="translate(0 0) rotate(0 216 136)"><path d="M215 53H159C105 53 76 90 76 136s29 83 83 83h56c-26-22-40-52-40-83s14-61 40-83Z" fill="url(#study-warm-leaf)" stroke="url(#study-warm-edge)" stroke-width=".9"/>
<path d="M204 60h-44c-49 0-76 33-76 76s27 76 76 76h44M193 71h-31c-43 0-67 29-67 65s24 65 67 65h31M185 82h-21c-38 0-57 25-57 54s19 54 57 54h21M179 94h-13c-30 0-44 18-44 42s14 42 44 42h13" fill="none" stroke="var(--foil-warm)" stroke-opacity=".34" stroke-width=".6"/>
<path d="M84 136h91M105 107h74M105 165h74" fill="none" stroke="var(--foil-warm)" stroke-opacity=".13" stroke-width=".7"/></g>
          <g id="study-leaf-b" transform="translate(0 0) rotate(0 216 136)"><g transform="translate(432 0) scale(-1 1)"><path d="M215 53H159C105 53 76 90 76 136s29 83 83 83h56c-26-22-40-52-40-83s14-61 40-83Z" fill="url(#study-cool-leaf)" stroke="url(#study-cool-edge)" stroke-width=".9"/>
<path d="M204 60h-44c-49 0-76 33-76 76s27 76 76 76h44M193 71h-31c-43 0-67 29-67 65s24 65 67 65h31M185 82h-21c-38 0-57 25-57 54s19 54 57 54h21M179 94h-13c-30 0-44 18-44 42s14 42 44 42h13" fill="none" stroke="var(--foil-cool)" stroke-opacity=".34" stroke-width=".6"/>
<path d="M84 136h91M105 107h74M105 165h74" fill="none" stroke="var(--foil-cool)" stroke-opacity=".13" stroke-width=".7"/></g></g>
          <path id="study-target" visibility="hidden" d="M82 184C152 184 168 181 206 145C245 108 268 87 350 85L350 88C269 91 246 112 208 149C170 184 152 188 82 188Z"/>
          <path id="study-outline" d="M150 81C170 66 189 65 216 65C258 65 286 93 286 136C286 177 257 207 216 207C173 207 145 179 145 137C145 111 148 94 150 81Z" fill="url(#study-ink)" fill-opacity=".035" stroke="url(#study-ink)" stroke-width="1.55" stroke-linejoin="round"/>
          <g id="study-endpoints" opacity="0" fill="none" stroke="url(#study-ink)" stroke-width="1.15">
            <circle cx="82" cy="186" r="6"/><circle cx="350" cy="87" r="6"/>
            <circle cx="82" cy="186" r="2.2" fill="var(--foil-warm)" stroke="none"/><circle cx="350" cy="87" r="2.2" fill="var(--foil-cool)" stroke="none"/>
          </g>
        </svg>
      </figure>
      <div class="study-controls">
        <button class="action primary" type="button" id="study-play"><svg class="study-play-icon" aria-hidden="true" width="14" height="14" viewBox="0 0 14 14"><path fill="currentColor" d="M4 2.5 12 7 4 11.5Z"/></svg><span>Speel studie</span></button>
        <button class="action quiet" type="button" id="study-reset">Zet terug</button>
      </div>
      <div class="study-reading" aria-live="polite" aria-atomic="true">
        <h3 id="study-question">Samen een ritueel kiezen?</h3>
        <p class="muted" id="study-copy">Begin breed. Kies zelf of je bij dit onderwerp verder wilt.</p>
      </div>
    </section>`;
