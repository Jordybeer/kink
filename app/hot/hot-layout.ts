export const HOT_LAYOUT_CSS = `
/* One signature path; supporting studies remain quiet. */
.frame {max-width:72rem;padding:1rem clamp(1.1rem,4vw,3rem) 3rem}
.mast {min-height:3.7rem;padding-bottom:.55rem}
.brand {font-size:1.45rem;color:var(--ink)} .tag {font-size:.86rem}
.intro {display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,.65fr);align-items:end;gap:1rem 2.5rem;margin:clamp(2rem,6vw,4rem) 0 1.6rem}
.intro h1 {font-weight:400;line-height:.9;letter-spacing:-.035em}
.intro-lead {font:400 clamp(1.45rem,3.1vw,2.3rem)/1.16 var(--serif);color:var(--ink);margin:.65rem 0 0;letter-spacing:-.02em;text-wrap:balance}
.intro-note {color:var(--muted);font-size:.97rem;line-height:1.65;max-width:37ch;margin:0 0 .15rem}
.feature {display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);align-items:center;gap:1.4rem 2rem;min-height:17rem;padding:clamp(1.4rem,4vw,2.35rem);border:1px solid var(--line);border-radius:1rem;color:var(--ink);background:var(--profile-hero-glow),var(--surface);text-decoration:none;overflow:hidden}
.feature:focus-visible {outline:2px solid var(--lilac);outline-offset:4px}
.feature-copy {display:grid;gap:1.05rem;align-content:center;max-width:30rem}
.feature-title {font:400 clamp(2rem,3.5vw,3.45rem)/1.06 var(--serif);letter-spacing:-.027em;text-wrap:balance}
.feature-description {color:var(--muted);font-size:.95rem;line-height:1.65;max-width:48ch}
.feature-cta {display:inline-flex;align-items:center;gap:.55rem;font-size:.92rem;font-weight:650;color:var(--rose);width:fit-content}
.feature-cta svg {transition:transform 180ms cubic-bezier(.16,1,.3,1)}
.feature:hover .feature-cta svg,.feature:focus-visible .feature-cta svg {transform:translateX(5px)}
.feature-art {position:relative;display:block;min-width:0;height:12.5rem;contain:layout paint}
.feature-origin {position:absolute;inset:auto auto .5rem 0;display:flex;align-items:center;justify-content:space-between;gap:.45rem;width:55%;padding:.6rem .75rem;border-block:1px solid var(--line);font:italic 400 1.65rem/1 var(--serif)}
.feature-origin i,.feature-destination i {font:italic 400 1.6rem/1 var(--serif);display:grid;place-items:center;flex:none;width:2.6rem;height:2.6rem;border-radius:.4rem;background:var(--surface3);color:var(--lilac)}
.feature-destination {position:absolute;inset:0 0 auto auto;display:flex;align-items:center;justify-content:space-between;gap:.45rem;width:64%;min-height:5.4rem;padding:.7rem .9rem;border:1px solid var(--identity-border);border-radius:.75rem;background:var(--profile-hero-glow),var(--surface2);font:italic 400 clamp(2rem,3.1vw,2.7rem)/1 var(--serif)}
.feature-destination i {width:3.3rem;height:3.3rem;font-size:2.3rem}
.feature-curve {position:absolute;inset:0;width:100%;height:100%;color:var(--lilac);opacity:.75}
.lab-intro {display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:.5rem 2rem;margin:2.55rem 0 .6rem}
.lab-intro h2 {font:400 clamp(1.65rem,3vw,2.3rem)/1.1 var(--serif);color:var(--ink)}
.lab-intro p {margin:0;color:var(--muted);font-size:.92rem;max-width:48ch}
.tabs {margin-bottom:1.25rem;gap:.1rem 1.65rem}
.tabs button {font-size:.94rem;padding:.65rem .1rem}
.tabs button[aria-selected="true"] {color:var(--rose)}
.workspace {grid-template-columns:minmax(0,1fr) minmax(12rem,.27fr);gap:1.8rem}
.stage {background:var(--surface);border-color:var(--line);min-height:21rem;padding:clamp(1.3rem,3.5vw,2.3rem);border-radius:1rem}
.action,.option {border-radius:.7rem}
.action.primary {background:var(--accent-fill);border-color:var(--accent-fill);color:var(--on-accent-fill)}
.settings {border-color:var(--line);padding-left:1.35rem}
.option[aria-pressed="true"] {border-color:var(--accent2);background:var(--surface2)}
.study-figure {background:var(--surface2)}
.study-figure svg {--foil-warm:var(--accent-text);--foil-light:var(--accent);--foil-cool:var(--accent2-text)}
@media(max-width:47rem){
 .intro {grid-template-columns:1fr;margin:2rem 0 1.3rem}
 .feature {grid-template-columns:1fr;padding:1.4rem}
 .feature-art {height:10rem} .feature-origin {bottom:0} .feature-destination {top:0}
 .workspace {grid-template-columns:1fr;gap:1.15rem}
 .stage {min-height:0}
 .settings {border:0;border-top:1px solid var(--line);padding:1rem 0 0}
 .lab-intro {margin:2rem 0 .5rem}
}
@media(max-width:23rem){.feature {padding:1.05rem}.feature-art {height:9.5rem}.feature-destination i {width:2.7rem;height:2.7rem}.tabs {column-gap:.85rem}.tabs button {font-size:.86rem}}
@media(prefers-reduced-motion:reduce){.feature-cta svg {transition:none}}
`;