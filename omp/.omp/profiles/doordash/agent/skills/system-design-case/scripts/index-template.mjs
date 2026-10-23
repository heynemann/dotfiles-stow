// Renders the hub page (cases/index.html): one self-contained document listing every case so
// the candidate can pick one, open it, and come back for another. Shares the case pages'
// tokens, type and base styles (BASE_CSS) so hub → case reads as one site.
import { BASE_CSS, FONT_HREF, esc, linkify, slug, text } from './page-template.mjs';

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// Short decision names from the README decision-log table when present ("Transactional outbox
// to Kafka"); the full decision title otherwise.
function shortNames(data) {
  const table = data.sections.find((s) => s.id === 'decision-log')?.blocks.find((b) => b.type === 'table');
  const names = {};
  for (const row of table?.rows ?? []) {
    const id = text(row[0]);
    if (row[1]) names[id] = text(row[1]).replace(/\s*superseded by D-\d+$/i, '');
  }
  return names;
}

function caseEntry({ slug: caseSlug, href, data }) {
  const ids = new Set(data.decisions.map((d) => d.id));
  const byId = new Map(data.decisions.map((d) => [d.id, d]));
  const names = shortNames(data);
  const name = (d) => esc(names[d.id] ?? text(d.title));
  const at = (anchor) => `${esc(href)}#${esc(anchor)}`;
  const ledes = data.ledes ?? [];
  const tagline = ledes.at(-1);
  const notes = ledes.slice(0, -1);
  const accepted = data.decisions.filter((d) => d.status !== 'superseded');
  const superseded = data.decisions.length - accepted.length;
  const flows = data.flows.filter((f) => f.diagram);
  const diagram = data.architectureDiagram ? `${caseSlug}/${data.architectureDiagram}` : null;

  // Links inside case data point at the case folder; from the hub they need its prefix.
  const local = (html) =>
    linkify(html, new Set())
      .replace(/href="(?!https?:|#|\/)([^"]+)"/g, (_, p) => `href="${esc(caseSlug)}/${p}"`)
      .replace(/href="#(d-\d+)"/g, (_, a) => `href="${at(a)}"`);

  const decisionList = accepted
    .map((d) => {
      const old = d.supersedes && byId.get(d.supersedes);
      return `<li>
  <a class="case__dec" href="${at(d.anchorId)}"><span class="case__id">${esc(d.id)}</span><span>${name(d)}</span></a>
  ${old ? `<p class="case__lineage">Replaces <a href="${at(old.anchorId)}">${esc(old.id)}</a> · ${name(old)}</p>` : ''}
</li>`;
    })
    .join('\n');

  const decisionLabel = [`${accepted.length} accepted`, superseded ? `${superseded} superseded` : ''].filter(Boolean).join(' · ');

  return `<li class="case" id="case-${esc(caseSlug)}">
<article class="case__body" aria-labelledby="case-${esc(caseSlug)}-title">
  <div class="case__main">
    ${notes.map((n) => `<p class="case__note"><span class="label">Note</span><span>${local(n)}</span></p>`).join('\n')}
    <h2 class="case__title" id="case-${esc(caseSlug)}-title"><a href="${esc(href)}">${esc(data.title)}&nbsp;<span class="case__arrow" aria-hidden="true">→</span></a></h2>
    ${tagline ? `<p class="case__tagline">${local(tagline)}</p>` : ''}
    ${data.meta.length ? `<dl class="case__meta">${data.meta.map((m) => `<div><dt>${esc(m.label)}</dt><dd>${local(m.html)}</dd></div>`).join('')}</dl>` : ''}
  </div>
  <div class="case__side">
    ${
      diagram
        ? `<a class="case__thumb" href="${esc(href)}" tabindex="-1" aria-hidden="true">
      <iframe src="${esc(diagram)}?theme=light&amp;embed=1" loading="lazy" tabindex="-1" title="${esc(data.title)} architecture preview"></iframe>
    </a>`
        : ''
    }
    ${
      data.decisions.length
        ? `<div class="case__block">
      <p class="label">Decisions · ${esc(decisionLabel)}</p>
      <ol class="case__decs">${decisionList}</ol>
    </div>`
        : ''
    }
    ${
      flows.length
        ? `<div class="case__block">
      <p class="label">Key flows · ${flows.length}</p>
      <ul class="case__flows">${flows.map((f) => `<li><a href="${at(`flow-${slug(text(f.name)) || 'flow'}`)}">${esc(text(f.name))}</a></li>`).join('')}</ul>
    </div>`
        : ''
    }
  </div>
</article>
</li>`;
}

export function renderIndex(cases) {
  const decisions = cases.reduce((n, c) => n + c.data.decisions.length, 0);
  const flows = cases.reduce((n, c) => n + c.data.flows.filter((f) => f.diagram).length, 0);
  const counts = [plural(cases.length, 'case'), plural(decisions, 'decision'), plural(flows, 'key flow')].join(' · ');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>System design cases</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONT_HREF}">
<style>${CSS}</style>
</head>
<body>
<a class="skip" href="#main">Skip to cases</a>
<header class="hubnav">
  <div class="hubnav__inner">
    <a class="hubnav__brand" href="#main"><span class="hubnav__mark" aria-hidden="true"></span>System design cases</a>
    <p class="hubnav__count">${esc(plural(cases.length, 'case'))}</p>
  </div>
</header>
<main class="hub" id="main" tabindex="-1">
  <p class="hub__intro"><span class="label">Index</span><span>${esc(counts)}</span></p>
  ${
    cases.length > 3
      ? `<nav class="hub__jump" aria-label="Jump to a case"><ul>${cases.map((c) => `<li><a href="#case-${esc(c.slug)}">${esc(c.data.title)}</a></li>`).join('')}</ul></nav>`
      : ''
  }
  <ol class="cases${cases.length > 2 ? ' cases--many' : ''}">
${cases.map(caseEntry).join('\n')}
  </ol>
</main>
<footer class="hubfoot"><p>System design cases<span aria-hidden="true"> · </span>${esc(counts)}</p></footer>
</body>
</html>
`;
}

const CSS =
  String.raw`
/* Hallmark · genre: modern-minimal · macrostructure: Index-First · theme: Cobalt (shared BASE_CSS with the case pages) · enrichment: lazy archify thumbnails (desktop only) · nav: N9 (edge-aligned: wordmark + count) · footer: Ft2
 * tone: technical light · anchor hue: 256 cobalt · axes: light / grotesk-sans / cool
 * audience: senior engineer watching a screen share · job: pick a case to walk through, come back for the next
 * pre-emit critique: P4 H4 E4 S5 R5 V4
 * contrast: pass (40–41) · slop: pass (42–45) · honest: pass (46) · chrome: pass (47) · tokens: pass (48) · responsive: pass (49) · mobile: pass (34, 49, 50–57)
 */
` +
  BASE_CSS +
  String.raw`
/* ---------- nav (N9) ---------- */
.hubnav { border-bottom: 1px solid var(--color-rule); background: var(--color-paper); }
.hubnav__inner { height: var(--nav-h); display: flex; align-items: center; justify-content: space-between; gap: var(--space-md); padding-inline: var(--gutter); }
.hubnav__brand { display: inline-flex; align-items: center; gap: var(--space-xs); font-family: var(--font-display); font-weight: 700; color: var(--color-ink); text-decoration: none; white-space: nowrap; letter-spacing: -0.01em; }
.hubnav__mark { width: 0.625rem; height: 0.625rem; background: var(--color-accent); border-radius: 2px; flex: none; }
.hubnav__count { font-family: var(--font-mono); font-size: var(--text-sm); font-weight: 500; color: var(--color-muted); white-space: nowrap; }

/* ---------- index ---------- */
.hub { padding: var(--space-xl) var(--gutter) var(--space-2xl); max-width: 84rem; }
.hub:focus-visible { outline: none; }
.hub__intro { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-xs) var(--space-sm); color: var(--color-ink-2); font-family: var(--font-mono); font-size: var(--text-sm); font-variant-numeric: tabular-nums; }
.cases { list-style: none; margin: var(--space-lg) 0 0; padding: 0; }
/* More than a couple of cases: smaller titles keep the index scannable. */
.cases--many .case__title { font-size: var(--text-xl); line-height: 1.1; letter-spacing: -0.025em; }
.cases--many .case { padding-bottom: var(--space-xl); }
.case { scroll-margin-top: var(--space-md); }
.hub__jump ul { list-style: none; margin: var(--space-md) 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--space-2xs) var(--space-md); font-family: var(--font-mono); font-size: var(--text-sm); }
.hub__jump a { white-space: nowrap; }
.case { border-top: 2px solid var(--color-ink); padding: var(--space-xl) 0 var(--space-2xl); }
.case:last-child { border-bottom: 1px solid var(--color-rule); }
.case__body { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-xl); }
.case__main, .case__side { display: grid; gap: var(--space-lg); align-content: start; min-width: 0; }

.case__note { display: flex; gap: var(--space-sm); align-items: baseline; justify-self: start; font-size: var(--text-sm); line-height: 1.5; color: var(--color-muted); padding: var(--space-xs) var(--space-sm); border: 1px dashed var(--color-rule-2); border-radius: var(--radius-sm); }
.case__note .label { flex: none; }
.case__title { font-size: var(--text-display); font-weight: 700; line-height: 1.02; letter-spacing: -0.035em; }
.case__title a { color: var(--color-ink); text-decoration: none; }
.case__arrow { display: inline-block; }
.case__arrow { font-size: 0.6em; color: var(--color-accent-text); transition: transform var(--dur-short) var(--ease-out); }
@media (hover: hover) { .case__title a:hover .case__arrow { transform: translateX(4px); } .case__title a:hover { color: var(--color-ink); } }
.case__title a:active .case__arrow { transform: translateX(2px); }
.case__tagline { font-family: var(--font-display); font-weight: 500; font-size: var(--text-lg); line-height: 1.3; letter-spacing: -0.01em; color: var(--color-ink-2); }
.case__meta { margin: 0; display: grid; border-top: 1px solid var(--color-rule); }
.case__meta > div { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-2xs) var(--space-md); padding: var(--space-sm) 0; border-bottom: 1px solid var(--color-rule); }
.case__meta dt { font-family: var(--font-mono); font-size: var(--text-sm); font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-muted); padding-top: 0.15em; }
.case__meta dd { margin: 0; color: var(--color-ink); }
.case__meta dd::first-letter { text-transform: uppercase; }

.case__thumb { display: none; position: relative; aspect-ratio: 2 / 1; border: 1px solid var(--color-rule); border-radius: var(--radius-md); overflow: hidden; background: var(--color-paper-2); }
.case__thumb iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; pointer-events: none; }
@media (hover: hover) { .case__thumb { transition: border-color var(--dur-short) var(--ease-out); } .case__thumb:hover { border-color: var(--color-accent); } }

.case__block { display: grid; gap: var(--space-xs); }
.case__decs, .case__flows { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--color-rule); }
.case__decs > li, .case__flows > li { border-bottom: 1px solid var(--color-rule); }
.case__dec { display: grid; grid-template-columns: 3.5rem minmax(0, 1fr); gap: var(--space-sm); padding: var(--space-sm) 0; color: var(--color-ink); text-decoration: none; font-weight: 600; line-height: 1.4; transition: background-color var(--dur-short) var(--ease-out); }
@media (hover: hover) { .case__dec:hover { background: var(--color-paper-2); color: var(--color-ink); } }
.case__id { font-family: var(--font-mono); font-size: var(--text-sm); font-weight: 500; color: var(--color-ink-2); padding-top: 0.15em; white-space: nowrap; }
.case__lineage { margin: calc(-1 * var(--space-xs)) 0 0; padding: 0 0 var(--space-sm) calc(3.5rem + var(--space-sm)); font-size: var(--text-sm); color: var(--color-muted); }
.case__lineage a { font-family: var(--font-mono); white-space: nowrap; }
.case__flows a { display: block; padding: var(--space-sm) 0; color: var(--color-ink); text-decoration: none; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
@media (hover: hover) { .case__flows a:hover { background: var(--color-paper-2); color: var(--color-ink); } }

@media (min-width: 30rem) { .case__meta > div { grid-template-columns: 7rem minmax(0, 1fr); } }
@media (min-width: 48rem) { .case__thumb { display: block; } }
@media (min-width: 64rem) {
  .case__body { grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: var(--space-2xl); }
  .case { padding-top: var(--space-2xl); }
}

/* ---------- footer (Ft2) ---------- */
.hubfoot { border-top: 1px solid var(--color-rule); padding: var(--space-md) var(--gutter) var(--space-xl); font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-muted); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 1ms !important; }
  .case__arrow, .case__title a:active .case__arrow { transform: none !important; transition: none; }
}
`;
