// Renders the readCase() data into one self-contained, screen-shareable page.
// Zero dependencies; inline CSS + JS. Diagrams are the case's own interactive archify
// viewers (?theme=light&present=1) in iframes, one per distinct state: file:// reloads
// a frame on any hash change, so states are stacked, created lazily and crossfaded,
// and whatever the presenter does inside one survives scrolling away and back.

export const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;600&family=JetBrains+Mono:wght@400;500&display=swap';

export const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Plain text from an already-escaped HTML fragment (for attributes and search).
export const text = (html) =>
  String(html ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

export const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const truncate = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

// Turn bare "D-04" mentions into jump links; existing anchors and tags are left alone.
export function linkify(html, ids) {
  return String(html ?? '')
    .split(/(<a\b[^>]*>[\s\S]*?<\/a>|<[^>]+>)/)
    .map((part) =>
      part.startsWith('<')
        ? part
        : part.replace(/\bD-\d+\b/g, (id) => (ids.has(id) ? `<a class="dref" href="#${id.toLowerCase()}">${id}</a>` : id)),
    )
    .join('');
}

function renderBlocks(blocks, ids) {
  return (blocks ?? []).map((b) => renderBlock(b, ids)).join('\n');
}

function renderBlock(b, ids) {
  const l = (h) => linkify(h, ids);
  if (b.type === 'p') return `<p>${l(b.html)}</p>`;
  if (b.type === 'quote') return `<blockquote><p>${l(b.html)}</p></blockquote>`;
  if (b.type === 'list') {
    const items = b.items
      .map((it) => {
        const kids = it.children?.length ? `<ul>${it.children.map((c) => `<li>${l(c)}</li>`).join('')}</ul>` : '';
        return `<li>${l(it.html)}${kids}</li>`;
      })
      .join('');
    return `<ul class="list">${items}</ul>`;
  }
  if (b.type === 'table') {
    const labels = b.head.map(text);
    const head = b.head.map((h) => `<th scope="col">${l(h)}</th>`).join('');
    const rows = b.rows
      .map(
        (r) =>
          `<tr>${r
            .map((c, i) => (i === 0 ? `<th scope="row" data-label="${esc(labels[i])}">${l(c)}</th>` : `<td data-label="${esc(labels[i] ?? '')}"><span>${l(c)}</span></td>`))
            .join('')}</tr>`,
      )
      .join('');
    return `<div class="tbl"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  return '';
}

export function renderPage(data) {
  const ids = new Set(data.decisions.map((d) => d.id));
  const byId = new Map(data.decisions.map((d) => [d.id, d]));
  const arch = data.architectureDiagram;
  const title = esc(data.title);
  const nodeLabel = (diagram, id) => data.nodeLabels?.[diagram]?.[id] ?? id;

  // ---- diagram states -------------------------------------------------------
  // A state is one archify file + hash (#focus=…, #route=…, …) in the full viewer.
  const states = {};
  const state = (diagram, { hash = '', label } = {}) => {
    if (!diagram) return null;
    const key = hash ? `${diagram}#${hash}` : diagram;
    states[key] ??= { src: `${diagram}?theme=light&present=1${hash ? `#${hash}` : ''}`, label };
    return key;
  };
  const overview = state(arch, { label: 'Architecture · overview' });
  const archAffects = (d) => d.affects.find((a) => a.diagram === arch)?.ids ?? [];
  const decisionNodes = (d) => [...new Set([d.anchor, ...archAffects(d)].filter(Boolean))];
  const decisionState = (d) => (d.anchor ? state(arch, { hash: `focus=${d.anchor}`, label: `${d.id} · ${nodeLabel(arch, d.anchor)}` }) : overview);
  const flowId = (f) => `flow-${slug(text(f.name)) || 'flow'}`;

  // A trigger is any narrative block that drives the pinned panel.
  const trigger = (key, { label, historical, nodes } = {}) =>
    key
      ? ` data-panel="${esc(key)}" data-panel-label="${esc(label ?? states[key].label)}"${historical ? ` data-historical="${esc(historical)}"` : ''}${
          nodes?.length ? ` data-affects="${esc(JSON.stringify(nodes.map((id) => [id, nodeLabel(arch, id)])))}"` : ''
        }`
      : '';

  const expandButton = (key, extra = '') =>
    `<button class="expand${extra}" type="button" data-expand="${esc(key)}" aria-haspopup="dialog" aria-controls="viewer">Expand<kbd aria-hidden="true">F</kbd></button>`;

  const inlineFigure = (key, caption) =>
    key
      ? `<figure class="inline-fig" data-inline="${esc(key)}">
  <div class="inline-fig__frame"><span class="inline-fig__wait">Loading diagram…</span></div>
  <figcaption><span>${esc(caption)}</span>${expandButton(key)}</figcaption>
</figure>`
      : '';

  // ---- decisions ------------------------------------------------------------
  const decisionLabel = (d) => `${d.id} · ${truncate(text(d.title), 72)}`;
  const decisionNodeLabel = (d) => (d.anchor ? nodeLabel(arch, d.anchor) : 'overview');

  const optionList = (d) =>
    d.options.length
      ? `<div class="dr__block">
  <p class="label">Options</p>
  <ol class="opts">${d.options
    .slice()
    .sort((a, b) => Number(b.chosen) - Number(a.chosen))
    .map(
      (o) => `<li class="opt${o.chosen ? ' is-chosen' : ''}">
    <p class="opt__name"><span class="opt__tag">${o.chosen ? 'Chosen' : 'Alternative'}</span>${linkify(o.html, ids)}</p>
    <dl class="opt__trade">
      <div><dt><span aria-hidden="true">+</span> Wins</dt><dd>${linkify(o.wins, ids) || '—'}</dd></div>
      <div><dt><span aria-hidden="true">−</span> Costs</dt><dd>${linkify(o.costs, ids) || '—'}</dd></div>
    </dl>
  </li>`,
    )
    .join('\n')}</ol>
</div>`
      : '';

  const decisionArticle = (d, { omitRevisit = false } = {}) => {
    const historical = d.status === 'superseded';
    const key = decisionState(d);
    const statusChip = historical
      ? `<span class="status status--old">Superseded${d.supersededBy ? ` by ${linkify(d.supersededBy, ids)}` : ''}</span>`
      : `<span class="status status--ok">Accepted</span>`;
    const replaces = d.supersedes ? `<span class="status status--lineage">Replaces ${linkify(d.supersedes, ids)}</span>` : '';
    const revisit = !omitRevisit && d.revisit.length ? `<div><p class="label">Revisit when</p>${renderBlocks(d.revisit, ids)}</div>` : '';
    const cost = d.cost.length ? `<div><p class="label">Cost accepted</p>${renderBlocks(d.cost, ids)}</div>` : '';
    return `<article class="dr${historical ? ' is-historical' : ''}" id="${esc(d.anchorId)}" tabindex="-1"${trigger(key, {
      label: decisionLabel(d),
      historical: historical ? d.supersededBy ?? 'a later decision' : null,
      nodes: decisionNodes(d),
    })}>
  <header class="dr__head">
    <p class="dr__meta"><span class="dr__id">${esc(d.id)}</span>${statusChip}${replaces}</p>
    <h3 class="dr__title">${d.title}</h3>
  </header>
  ${d.context.length ? `<div class="dr__block dr__context"><p class="label">Context</p>${renderBlocks(d.context, ids)}</div>` : ''}
  ${d.why.length ? `<div class="dr__block dr__why"><p class="label label--force">Deciding force</p>${renderBlocks(d.why, ids)}</div>` : ''}
  ${optionList(d)}
  ${cost || revisit ? `<div class="dr__block dr__pair">${cost}${revisit}</div>` : ''}
  ${inlineFigure(key, historical ? `${d.id} · historical · ${decisionNodeLabel(d)}` : `${d.id} · ${decisionNodeLabel(d)}`)}
</article>`;
  };

  // Group supersession chains (D-02 → D-04) so they read as one evolution.
  const placed = new Set();
  const chains = [];
  for (const d of data.decisions) {
    if (placed.has(d.id)) continue;
    let root = d;
    while (root.supersedes && byId.has(root.supersedes) && !placed.has(root.supersedes)) root = byId.get(root.supersedes);
    const chain = [];
    for (let cur = root; cur && !placed.has(cur.id); ) {
      chain.push(cur);
      placed.add(cur.id);
      const next = cur.supersededBy ?? data.decisions.find((x) => x.supersedes === cur.id)?.id;
      cur = next ? byId.get(next) : null;
    }
    chains.push(chain);
  }

  const decisionsHtml = chains
    .map((chain) => {
      if (chain.length === 1) return decisionArticle(chain[0]);
      const parts = [];
      chain.forEach((d, i) => {
        const next = chain[i + 1];
        parts.push(decisionArticle(d, { omitRevisit: Boolean(next) && d.revisit.length > 0 }));
        if (next) {
          parts.push(`<div class="evo__bridge"${trigger(decisionState(next), { label: decisionLabel(next), nodes: decisionNodes(next) })}>
  <p class="evo__step"><span>${esc(d.id)}</span><span class="evo__arrow" aria-hidden="true">→</span><span class="visually-hidden">superseded by</span><span>${esc(next.id)}</span></p>
  ${d.revisit.length ? `<div class="evo__why"><p class="label">${esc(d.id)} said revisit when</p>${renderBlocks(d.revisit, ids)}</div>` : `<p class="label">${esc(d.id)} superseded by ${esc(next.id)}</p>`}
</div>`);
        }
      });
      return `<div class="evo" role="group" aria-label="${esc(chain.map((d) => d.id).join(' superseded by '))}">
${parts.join('\n')}
</div>`;
    })
    .join('\n');

  // Compact index: the README decision-log table when present, else the records.
  const decisionIndex = (section) => {
    const table = section?.blocks.find((b) => b.type === 'table');
    const rows = table
      ? table.rows.map((r) => {
          const id = text(r[0]);
          return {
            id,
            old: byId.get(id)?.status === 'superseded',
            title: linkify(r[1] ?? '', ids),
            extra: r.slice(2).map((c, i) => ({ label: text(table.head[i + 2] ?? ''), html: linkify(c, ids) })),
          };
        })
      : data.decisions.map((d) => ({ id: d.id, old: d.status === 'superseded', title: d.title, extra: [] }));
    return `<ol class="dindex">${rows
      .map(
        (r) => `<li class="dindex__row${r.old ? ' is-old' : ''}">
  <a class="dindex__id" href="#${esc(r.id.toLowerCase())}">${esc(r.id)}</a>
  <div class="dindex__body">
    <p class="dindex__title">${r.title}</p>
    ${r.extra.length ? `<dl class="dindex__extra">${r.extra.map((e) => `<div><dt>${esc(e.label)}</dt><dd>${e.html}</dd></div>`).join('')}</dl>` : ''}
  </div>
</li>`,
      )
      .join('\n')}</ol>`;
  };

  // ---- sections -------------------------------------------------------------
  const otherBlocks = (section, type) => section.blocks.filter((b) => b.type !== type);
  const renderSection = (s) => {
    const h2 = `<h2 class="sec__title">${esc(s.title)}</h2>`;
    if (s.id === 'key-flows') {
      const flows = data.flows.filter((f) => f.diagram);
      if (!flows.length) return `<section class="sec" id="${esc(s.id)}" tabindex="-1"${trigger(overview)}>${h2}${renderBlocks(s.blocks, ids)}</section>`;
      const flowHtml = flows
        .map((f) => {
          const key = state(f.diagram, { label: `Flow · ${text(f.name)}` });
          return `<div class="flow" id="${esc(flowId(f))}" tabindex="-1"${trigger(key)}>
  <h3 class="flow__name">${f.name}</h3>
  ${f.why ? `<p class="flow__why">${linkify(f.why, ids)}</p>` : ''}
  <p class="flow__link"><a href="${esc(f.diagram)}" data-diagram="${esc(f.diagram)}" data-hash="">Sequence diagram</a></p>
  ${inlineFigure(key, `Flow · ${text(f.name)}`)}
</div>`;
        })
        .join('\n');
      return `<section class="sec sec--flows" id="${esc(s.id)}" tabindex="-1"${trigger(state(flows[0].diagram, { label: `Flow · ${text(flows[0].name)}` }))}>
${h2}
${renderBlocks(otherBlocks(s, 'table'), ids)}
${flowHtml}
</section>`;
    }
    if (s.id === 'decision-log') {
      return `<section class="sec sec--decisions" id="${esc(s.id)}" tabindex="-1">
<div class="sec__intro"${trigger(overview)}>
${h2}
${renderBlocks(otherBlocks(s, 'table'), ids)}
${decisionIndex(s)}
</div>
<div class="decisions">
${decisionsHtml}
</div>
</section>`;
    }
    const extra = s.id === 'architecture' ? inlineFigure(overview, 'Architecture · overview') : '';
    return `<section class="sec sec--${esc(s.id)}" id="${esc(s.id)}" tabindex="-1"${trigger(overview)}>
${h2}
${renderBlocks(s.blocks, ids)}
${extra}
</section>`;
  };

  const hasLog = data.sections.some((s) => s.id === 'decision-log');
  const hindsight = data.sections.find((s) => s.id === 'hindsight');
  const gridSections = data.sections.filter((s) => s !== hindsight);
  let sectionsHtml = gridSections.map(renderSection).join('\n');
  if (!hasLog && data.decisions.length) {
    sectionsHtml += `\n<section class="sec sec--decisions" id="decisions" tabindex="-1"><div class="sec__intro"${trigger(overview)}><h2 class="sec__title">Decisions</h2>${decisionIndex(null)}</div><div class="decisions">${decisionsHtml}</div></section>`;
  }

  // ---- hero -----------------------------------------------------------------
  const ledes = data.ledes ?? [];
  const tagline = ledes.at(-1);
  const notes = ledes.slice(0, -1);
  const hero = `<header class="hero" id="top" tabindex="-1"${trigger(overview)}>
  ${notes.map((n) => `<p class="hero__note"><span class="label">Note</span><span>${linkify(n, ids)}</span></p>`).join('\n')}
  <h1 class="hero__title">${title}</h1>
  ${tagline ? `<p class="hero__tagline">${linkify(tagline, ids)}</p>` : ''}
  ${data.meta.length ? `<dl class="hero__meta">${data.meta.map((m) => `<div><dt>${esc(m.label)}</dt><dd>${linkify(m.html, ids)}</dd></div>`).join('')}</dl>` : ''}
</header>`;

  // ---- nav + palette --------------------------------------------------------
  const chips = data.decisions
    .map(
      (d) =>
        `<a class="chip${d.status === 'superseded' ? ' is-old' : ''}" href="#${esc(d.anchorId)}" data-chip="${esc(d.anchorId)}" aria-label="${esc(`${d.id}: ${text(d.title)}${d.status === 'superseded' ? ` (superseded by ${d.supersededBy ?? 'a later decision'})` : ''}`)}">${esc(d.id)}</a>`,
    )
    .join('');

  const paletteItems = [
    { group: 'Sections', target: 'top', label: text(data.title), meta: 'Top' },
    ...data.sections.flatMap((s) => {
      const items = [{ group: 'Sections', target: s.id, label: s.title, meta: '' }];
      if (s.id === 'key-flows') data.flows.filter((f) => f.diagram).forEach((f) => items.push({ group: 'Flows', target: flowId(f), label: text(f.name), meta: 'Sequence' }));
      return items;
    }),
    ...data.decisions.map((d) => ({
      group: 'Decisions',
      target: d.anchorId,
      label: `${d.id} · ${text(d.title)}`,
      meta: d.status === 'superseded' ? `Superseded by ${d.supersededBy ?? '—'}` : 'Accepted',
    })),
  ];
  let lastGroup = '';
  const paletteHtml = paletteItems
    .map((it, i) => {
      const head = it.group !== lastGroup ? `<li class="cmdk__group" role="presentation">${esc(it.group)}</li>` : '';
      lastGroup = it.group;
      return `${head}<li class="cmdk__item" role="option" id="cmdk-opt-${i}" data-target="${esc(it.target)}" data-search="${esc(`${it.label} ${it.meta} ${it.group}`.toLowerCase())}" aria-selected="false"><span class="cmdk__label">${esc(it.label)}</span>${it.meta ? `<span class="cmdk__meta">${esc(it.meta)}</span>` : ''}</li>`;
    })
    .join('');

  // ---- panel ----------------------------------------------------------------
  const panel = overview
    ? `<aside class="panel" aria-label="Live diagram">
  <div class="panel__head">
    <p class="panel__label" aria-live="polite">${esc(states[overview].label)}</p>
    <p class="panel__stamp" hidden>Historical</p>
    ${expandButton(overview, ' panel__expand')}
  </div>
  <div class="panel__stage"><span class="panel__wait">Loading diagram…</span></div>
  <div class="panel__foot">
    <p class="panel__affects" hidden><span class="label">Affects</span><span class="panel__nodes"></span></p>
    <p class="panel__hint">Live viewer: drag to pan, PATH traces a route, LENS filters, click a node for details.</p>
  </div>
</aside>`
    : '';

  const hindsightHtml = hindsight
    ? `<section class="band" id="${esc(hindsight.id)}" tabindex="-1">
  <div class="band__inner">
    <h2 class="sec__title">${esc(hindsight.title)}</h2>
    ${renderBlocks(hindsight.blocks, ids)}
  </div>
</section>`
    : '';

  const footerLinks = [
    `<a href="#top">Back to top</a>`,
    `<a href="../index.html">All cases</a>`,
    ...(overview ? [`<a href="${esc(states[overview].src)}" target="_blank" rel="noopener">Architecture diagram<span aria-hidden="true"> ↗</span></a>`] : []),
    ...data.flows.filter((f) => f.diagram).map((f) => `<a href="${esc(f.diagram)}?theme=light&amp;present=1" target="_blank" rel="noopener">${esc(text(f.name))} sequence<span aria-hidden="true"> ↗</span></a>`),
  ];

  const config = JSON.stringify({ states, overview, nodeLabels: data.nodeLabels ?? {} }).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title} · system design case</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONT_HREF}">
<style>${CSS}</style>
</head>
<body${overview ? '' : ' class="no-panel"'}>
<a class="skip" href="#main">Skip to content</a>
<header class="nav">
  <div class="nav__inner">
    <a class="nav__hub" href="../index.html" aria-label="All cases"><span aria-hidden="true">←</span><span class="nav__hub-text">Cases</span></a>
    <a class="nav__brand" href="#top"><span class="nav__mark" aria-hidden="true"></span><span class="nav__name">${title}</span></a>
    ${chips ? `<nav class="nav__chips" aria-label="Decisions">${chips}</nav>` : ''}
    <button class="searchpill" type="button" aria-haspopup="dialog" aria-controls="cmdk" aria-label="Jump to a section or decision (Ctrl K)">
      <span class="searchpill__ico" aria-hidden="true"></span><span class="searchpill__text">Jump to…</span><span class="searchpill__kbd" aria-hidden="true"><kbd class="kbd-mod">Ctrl</kbd><kbd>K</kbd></span>
    </button>
  </div>
</header>
<div class="stack">
  <main class="narr" id="main">
${hero}
${sectionsHtml}
  </main>
  ${panel}
</div>
${hindsightHtml}
<footer class="foot">
  <p class="foot__mark">${title}</p>
  ${tagline ? `<p class="foot__tag">${tagline}</p>` : ''}
  <p class="foot__links">${footerLinks.join('<span aria-hidden="true"> · </span>')}</p>
</footer>
<dialog class="cmdk" id="cmdk" aria-label="Jump to">
  <div class="cmdk__panel">
    <div class="cmdk__field">
      <span class="searchpill__ico" aria-hidden="true"></span>
      <input id="cmdk-input" type="text" role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="Section, decision or D-03" aria-label="Filter sections and decisions">
      <kbd>esc</kbd>
    </div>
    <ul class="cmdk__list" id="cmdk-list" role="listbox" aria-label="Sections and decisions">${paletteHtml}</ul>
    <p class="cmdk__empty" hidden>No section or decision matches.</p>
    <p class="cmdk__foot"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>↵</kbd> jump</span><span><kbd>esc</kbd> close</span></p>
  </div>
</dialog>
<dialog class="viewer" id="viewer" aria-labelledby="viewer-title">
  <div class="viewer__bar">
    <p class="viewer__title" id="viewer-title">Diagram</p>
    <a class="open-link viewer__newtab" href="#" target="_blank" rel="noopener">New tab<span aria-hidden="true"> ↗</span></a>
    <button class="viewer__close" type="button">Close<kbd aria-hidden="true">Esc</kbd></button>
  </div>
  <div class="viewer__stage"><span class="viewer__wait">Loading diagram…</span></div>
</dialog>
<script type="application/json" id="page-config">${config}</script>
<script>(${client.toString()})();</script>
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// Client runtime (serialised into the page; must stay self-contained ES2018).
function client() {
  var cfg = JSON.parse(document.getElementById('page-config').textContent);
  var wide = window.matchMedia('(min-width: 64rem)');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var panel = document.querySelector('.panel');
  var stage = panel && panel.querySelector('.panel__stage');
  var frames = {};
  var activeKey = null;
  var activeTrigger = null;

  function ensureState(diagram, hash, label) {
    var key = hash ? diagram + '#' + hash : diagram;
    if (!cfg.states[key]) cfg.states[key] = { src: diagram + '?theme=light&present=1' + (hash ? '#' + hash : ''), label: label };
    return key;
  }

  function makeFrame(key, cls) {
    var s = cfg.states[key];
    var f = document.createElement('iframe');
    f.className = cls;
    f.src = s.src;
    f.title = s.label + ' (interactive diagram)';
    f.setAttribute('loading', 'eager');
    f.addEventListener('load', function () {
      f.setAttribute('data-loaded', '');
      if (frames[activeKey] === f) panel.removeAttribute('data-waiting');
    });
    return f;
  }

  // One live archify viewer per state; created once, then kept so in-diagram work survives.
  function panelFrame(key) {
    if (!stage || !wide.matches || !cfg.states[key]) return null;
    if (!frames[key]) {
      frames[key] = makeFrame(key, 'panel__frame');
      frames[key].setAttribute('aria-hidden', 'true');
      frames[key].setAttribute('tabindex', '-1');
      stage.appendChild(frames[key]);
    }
    return frames[key];
  }

  function show(key, meta) {
    if (!panel || !cfg.states[key]) return;
    meta = meta || {};
    var f = panelFrame(key);
    if (f) {
      Object.keys(frames).forEach(function (k) {
        var on = k === key;
        frames[k].classList.toggle('is-active', on);
        frames[k].setAttribute('aria-hidden', on ? 'false' : 'true');
        if (on) frames[k].removeAttribute('tabindex');
        else frames[k].setAttribute('tabindex', '-1');
      });
    }
    activeKey = key;
    panel.querySelector('.panel__label').textContent = meta.label || cfg.states[key].label;
    var stamp = panel.querySelector('.panel__stamp');
    if (meta.historical) {
      stamp.textContent = 'Historical · superseded by ' + meta.historical;
      stamp.hidden = false;
      panel.setAttribute('data-historical', '');
    } else {
      stamp.hidden = true;
      panel.removeAttribute('data-historical');
    }
    var affects = panel.querySelector('.panel__affects');
    var hint = panel.querySelector('.panel__hint');
    if (meta.affects) {
      var list = affects.querySelector('.panel__nodes');
      list.textContent = '';
      JSON.parse(meta.affects).forEach(function (node) {
        var c = document.createElement('span');
        c.className = 'node';
        c.textContent = node[1];
        c.title = node[0];
        list.appendChild(c);
      });
      affects.hidden = false;
      hint.hidden = true;
    } else {
      affects.hidden = true;
      hint.hidden = false;
    }
    if (f) panel.toggleAttribute('data-waiting', !f.hasAttribute('data-loaded'));
  }

  function metaOf(el) {
    return {
      label: el.getAttribute('data-panel-label'),
      historical: el.getAttribute('data-historical'),
      affects: el.getAttribute('data-affects'),
    };
  }

  var triggers = Array.prototype.slice.call(document.querySelectorAll('[data-panel]'));
  triggers.forEach(function (el, i) {
    el._order = i;
  });

  // Preload: create a section's frame well before it reaches the reading line.
  var preload = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) panelFrame(e.target.getAttribute('data-panel'));
      });
    },
    { rootMargin: '120% 0px 120% 0px' },
  );

  // Active: whichever trigger crosses the reading line (deepest wins when nested).
  var crossing = new Set();
  var chips = Array.prototype.slice.call(document.querySelectorAll('[data-chip]'));
  function activate(el) {
    activeTrigger = el;
    show(el.getAttribute('data-panel'), metaOf(el));
    var id = el.classList.contains('dr') ? el.id : null;
    chips.forEach(function (c) {
      if (c.getAttribute('data-chip') === id) c.setAttribute('aria-current', 'true');
      else c.removeAttribute('aria-current');
    });
  }
  var reading = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) crossing.add(e.target);
        else crossing.delete(e.target);
      });
      var best = null;
      crossing.forEach(function (el) {
        if (!best || el._order > best._order) best = el;
      });
      if (best && best !== activeTrigger) activate(best);
    },
    { rootMargin: '-38% 0px -58% 0px' },
  );
  triggers.forEach(function (el) {
    preload.observe(el);
    reading.observe(el);
  });

  // Narrow screens: each section carries its own inline diagram, created lazily.
  var inline = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting || wide.matches) return;
        var fig = e.target;
        if (fig.querySelector('iframe')) return;
        var f = makeFrame(fig.getAttribute('data-inline'), 'inline-fig__iframe');
        fig.querySelector('.inline-fig__frame').appendChild(f);
        inline.unobserve(fig);
      });
    },
    { rootMargin: '100% 0px 100% 0px' },
  );
  document.querySelectorAll('[data-inline]').forEach(function (fig) {
    inline.observe(fig);
  });

  function onMedia() {
    if (!wide.matches) return;
    var first = triggers[0];
    if (!activeKey && first) activate(activeTrigger || first);
    else if (activeKey) show(activeKey, activeTrigger ? metaOf(activeTrigger) : {});
  }
  if (wide.addEventListener) wide.addEventListener('change', onMedia);
  if (triggers.length) {
    activeTrigger = triggers[0];
    if (wide.matches) activate(triggers[0]);
  }

  // "route=consumer~dasher" → "route Consumer App → Dasher App", using the diagram's node names.
  function describeHash(diagram, hash) {
    var names = cfg.nodeLabels[diagram] || {};
    var name = function (id) { return names[id] || id; };
    var p = new URLSearchParams(hash);
    var parts = [];
    p.forEach(function (v, k) {
      if (k === 'route') parts.push('route ' + v.split('~').map(name).join(' → '));
      else if (k === 'focus') parts.push('focus ' + name(v));
      else parts.push(k + ' ' + v);
    });
    return parts.join(' · ');
  }
  // Diagram links show their exact state (focus, route, reach, lens…) live: in the pinned
  // panel on wide screens, in the full-screen viewer otherwise.
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[data-diagram]');
    if (!a || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
    ev.preventDefault();
    var hash = (a.getAttribute('data-hash') || '').replace(/^#/, '');
    var diagram = a.getAttribute('data-diagram');
    var key = ensureState(diagram, hash, a.textContent.trim() + (hash ? ' · ' + describeHash(diagram, hash) : ''));
    var host = a.closest('[data-panel]');
    var meta = host && host.getAttribute('data-panel') === key ? metaOf(host) : { label: cfg.states[key].label };
    if (panel && wide.matches) show(key, meta);
    else openViewer(key, a, meta.label);
  });

  // Full-screen viewer: the full interactive archify page for one state ----------
  var viewer = document.getElementById('viewer');
  var viewerStage = viewer.querySelector('.viewer__stage');
  var viewerOpener = null;
  function currentKey() {
    if (wide.matches && activeKey) return activeKey;
    return activeTrigger ? activeTrigger.getAttribute('data-panel') : cfg.overview;
  }
  function currentLabel(key) {
    if (panel && wide.matches && key === activeKey) return panel.querySelector('.panel__label').textContent;
    if (activeTrigger && activeTrigger.getAttribute('data-panel') === key) return activeTrigger.getAttribute('data-panel-label');
    return cfg.states[key].label;
  }
  function openViewer(key, opener, label) {
    var s = cfg.states[key];
    if (!s || viewer.open) return;
    viewerOpener = opener || document.activeElement;
    label = label || currentLabel(key);
    viewer.querySelector('.viewer__title').textContent = label;
    viewer.querySelector('.viewer__newtab').href = s.src;
    var f = document.createElement('iframe');
    f.className = 'viewer__frame';
    f.src = s.src;
    f.title = label + ' (interactive diagram)';
    f.addEventListener('load', function () {
      f.setAttribute('data-loaded', '');
    });
    viewerStage.appendChild(f);
    viewer.showModal();
    viewer.querySelector('.viewer__close').focus();
  }
  viewer.addEventListener('close', function () {
    var f = viewerStage.querySelector('iframe');
    if (f) f.remove();
    if (viewerOpener && viewerOpener.isConnected && typeof viewerOpener.focus === 'function') viewerOpener.focus({ preventScroll: true });
    viewerOpener = null;
  });
  viewer.querySelector('.viewer__close').addEventListener('click', function () {
    viewer.close();
  });
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-expand]');
    if (!b) return;
    openViewer(b.classList.contains('panel__expand') ? currentKey() : b.getAttribute('data-expand'), b);
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'f' && ev.key !== 'F') return;
    if (ev.metaKey || ev.ctrlKey || ev.altKey || ev.defaultPrevented) return;
    var t = ev.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (document.querySelector('dialog[open]')) return;
    ev.preventDefault();
    openViewer(currentKey(), document.activeElement);
  });

  // Jumping ------------------------------------------------------------------
  function jump(id) {
    var target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
    target.focus({ preventScroll: true });
  }

  // Command palette ----------------------------------------------------------
  var dlg = document.getElementById('cmdk');
  var input = document.getElementById('cmdk-input');
  var items = Array.prototype.slice.call(dlg.querySelectorAll('.cmdk__item'));
  var groups = Array.prototype.slice.call(dlg.querySelectorAll('.cmdk__group'));
  var empty = dlg.querySelector('.cmdk__empty');
  var sel = -1;
  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  if (isMac) document.querySelectorAll('.kbd-mod').forEach(function (k) { k.textContent = '⌘'; });

  function visible() {
    return items.filter(function (it) { return !it.hidden; });
  }
  function select(i) {
    var vis = visible();
    items.forEach(function (it) { it.setAttribute('aria-selected', 'false'); });
    if (!vis.length) {
      sel = -1;
      input.removeAttribute('aria-activedescendant');
      return;
    }
    sel = (i + vis.length) % vis.length;
    vis[sel].setAttribute('aria-selected', 'true');
    input.setAttribute('aria-activedescendant', vis[sel].id);
    vis[sel].scrollIntoView({ block: 'nearest' });
  }
  function filter() {
    var q = input.value.trim().toLowerCase();
    items.forEach(function (it) {
      it.hidden = q && it.getAttribute('data-search').indexOf(q) === -1;
    });
    groups.forEach(function (g) {
      var n = g.nextElementSibling;
      var any = false;
      while (n && !n.classList.contains('cmdk__group')) {
        if (!n.hidden) any = true;
        n = n.nextElementSibling;
      }
      g.hidden = !any;
    });
    empty.hidden = visible().length > 0;
    select(0);
  }
  function openPalette() {
    if (dlg.open) return;
    input.value = '';
    filter();
    var current = activeTrigger && (activeTrigger.id || '');
    var vis = visible();
    for (var i = 0; i < vis.length; i++) if (vis[i].getAttribute('data-target') === current) { select(i); break; }
    dlg.showModal();
    input.focus();
  }
  function choose(it) {
    if (!it) return;
    var id = it.getAttribute('data-target');
    dlg.close();
    jump(id);
  }
  document.querySelector('.searchpill').addEventListener('click', openPalette);
  document.addEventListener('keydown', function (ev) {
    if ((ev.metaKey || ev.ctrlKey) && (ev.key === 'k' || ev.key === 'K') && !viewer.open) {
      ev.preventDefault();
      if (dlg.open) dlg.close();
      else openPalette();
    }
  });
  input.addEventListener('input', filter);
  input.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowDown') { ev.preventDefault(); select(sel + 1); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); select(sel - 1); }
    else if (ev.key === 'Enter') { ev.preventDefault(); choose(visible()[sel]); }
  });
  items.forEach(function (it) {
    it.addEventListener('click', function () { choose(it); });
    it.addEventListener('pointermove', function () {
      var i = visible().indexOf(it);
      if (i !== sel) select(i);
    });
  });
  dlg.addEventListener('click', function (ev) {
    if (ev.target === dlg) dlg.close();
  });
}

// Cobalt tokens + base element styles, shared by the case pages and the hub (index-template.mjs)
// so both read as one site. Each document prepends its own Hallmark stamp.
export const BASE_CSS = String.raw`
:root {
  --color-paper: oklch(98.5% 0.004 250);
  --color-paper-2: oklch(96.4% 0.006 252);
  --color-paper-3: oklch(93.6% 0.008 254);
  --color-rule: oklch(90.5% 0.008 255);
  --color-rule-2: oklch(82% 0.012 256);
  --color-muted: oklch(47% 0.018 257);
  --color-ink-2: oklch(34% 0.018 257);
  --color-ink: oklch(24% 0.02 258);
  --color-accent: oklch(58% 0.2 256);
  --color-accent-text: oklch(49% 0.2 258);
  --color-accent-wash: oklch(96.2% 0.022 256);
  --color-accent-ink: oklch(98.5% 0.004 250);
  --color-focus: oklch(52% 0.21 256);
  --color-graphite: oklch(21% 0.016 260);
  --color-graphite-rule: oklch(32% 0.018 260);
  --color-on-graphite: oklch(94% 0.008 255);
  --color-on-graphite-2: oklch(80% 0.014 256);
  --color-accent-on-graphite: oklch(76% 0.13 256);
  --color-scrim: oklch(24% 0.02 258 / 0.38);
  --shadow-lift: 0 1px 2px oklch(24% 0.02 258 / 0.06);
  --shadow-pop: 0 24px 48px -24px oklch(24% 0.02 258 / 0.35);

  --font-display: "Space Grotesk", ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  --font-body: "Inter", ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;

  --text-sm: 0.8125rem;
  --text-base: 1.0625rem;
  --text-lg: 1.5rem;
  --text-xl: 2rem;
  --text-display: clamp(2.75rem, 2.6vw + 1.6rem, 4.25rem);

  --space-3xs: 0.125rem;
  --space-2xs: 0.25rem;
  --space-xs: 0.5rem;
  --space-sm: 0.75rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2.5rem;
  --space-2xl: 4rem;
  --space-3xl: 6rem;

  --radius-sm: 6px;
  --radius-md: 10px;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --dur-micro: 120ms;
  --dur-short: 220ms;
  --dur-long: 360ms;

  --z-raised: 10;
  --z-sticky: 200;
  --z-modal: 400;

  --nav-h: 3.5rem;
  --gutter: clamp(1rem, 4vw, 2rem);
}

*, *::before, *::after { box-sizing: border-box; }
html, body { overflow-x: clip; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--color-paper);
  color: var(--color-ink-2);
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: 1.6;
  font-weight: 400;
  text-rendering: optimizeLegibility;
}
@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }

h1, h2, h3 { font-family: var(--font-display); color: var(--color-ink); font-style: normal; margin: 0; overflow-wrap: anywhere; min-width: 0; }
p { margin: 0; }
code { font-family: var(--font-mono); font-size: 0.88em; background: var(--color-paper-3); border-radius: 4px; padding: 0 var(--space-2xs); color: var(--color-ink); }
strong { color: var(--color-ink); font-weight: 600; }
s { color: var(--color-muted); }

a { color: var(--color-ink); text-decoration-line: underline; text-decoration-color: var(--color-accent); text-decoration-thickness: 1px; text-underline-offset: 2px; transition: text-decoration-color var(--dur-short) var(--ease-out), color var(--dur-short) var(--ease-out); }
@media (hover: hover) { a:hover { color: var(--color-accent-text); text-decoration-thickness: 2px; } }
:focus { outline: none; }
:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; border-radius: 3px; }
a:active { color: var(--color-ink); }
button:disabled, [aria-disabled="true"] { opacity: 0.55; cursor: not-allowed; }
[tabindex="-1"]:focus-visible { outline: none; }

.skip { position: absolute; left: var(--space-md); top: -10rem; z-index: var(--z-modal); background: var(--color-ink); color: var(--color-paper); padding: var(--space-xs) var(--space-md); border-radius: var(--radius-sm); }
.skip:focus-visible { top: var(--space-xs); }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

.label { font-family: var(--font-mono); font-size: var(--text-sm); font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-muted); line-height: 1.4; }
`;

const CSS = String.raw`
/* Hallmark · genre: modern-minimal · macrostructure: Feature Stack · theme: Cobalt · enrichment: none (the live archify diagrams are the visual) · nav: N13 (inline ⌘K pill + decision chips) · footer: Ft1
 * F2 knobs: pinned side=right · pane content=live archify viewer (present=1, interactive) · pin steps=one per section/decision/flow
 * diagram iframes carry archify's own chrome and palette (not page tokens); page tokens govern everything around them
 * tone: technical light · anchor hue: 256 cobalt · axes: light / grotesk-sans / cool
 * audience: senior engineer watching a screen share · job: decisions + trade-offs legible beside the live architecture
 * pre-emit critique: P4 H5 E4 S5 R4 V4
 * contrast: pass (40–41) · slop: pass (42–45) · honest: pass (46) · chrome: pass (47) · tokens: pass (48) · responsive: pass (49) · icons: pass (30) · mobile: pass (34, 49, 50–57)
 */
` + BASE_CSS + String.raw`
/* ---------- nav (N13 + decision chips) ---------- */
.nav { position: sticky; top: 0; z-index: var(--z-sticky); background: var(--color-paper); border-bottom: 1px solid var(--color-rule); }
.nav__inner { height: var(--nav-h); display: flex; align-items: center; gap: var(--space-sm); padding-inline: var(--gutter); }
.nav__brand { display: none; align-items: center; gap: var(--space-xs); text-decoration: none; font-family: var(--font-display); font-weight: 700; color: var(--color-ink); white-space: nowrap; letter-spacing: -0.01em; min-width: 0; }
.nav__mark { width: 0.625rem; height: 0.625rem; background: var(--color-accent); border-radius: 2px; flex: none; }
.nav__hub { flex: none; display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2xs); min-width: 2.25rem; height: 2.25rem; padding: 0 var(--space-xs); font-family: var(--font-mono); font-size: var(--text-sm); font-weight: 500; color: var(--color-muted); text-decoration: none; white-space: nowrap; border-radius: var(--radius-sm); transition: color var(--dur-short) var(--ease-out), background-color var(--dur-short) var(--ease-out); }
@media (hover: hover) { .nav__hub:hover { color: var(--color-ink); background: var(--color-paper-3); } }
.nav__hub:active { transform: translateY(1px); }
.nav__hub-text { display: none; }
@media (pointer: coarse) { .nav__hub { height: 2.75rem; min-width: 2.75rem; } }
.nav__name { overflow: hidden; text-overflow: ellipsis; }
.nav__chips { display: flex; gap: var(--space-2xs); min-width: 0; overflow-x: auto; scrollbar-width: none; padding: var(--space-2xs); margin: calc(-1 * var(--space-2xs)); }
.nav__chips::-webkit-scrollbar { display: none; }
.chip { flex: none; display: inline-flex; align-items: center; height: 2.25rem; padding: 0 var(--space-xs); font-family: var(--font-mono); font-size: var(--text-sm); font-weight: 500; color: var(--color-ink); text-decoration: none; border: 1px solid var(--color-rule-2); border-radius: var(--radius-sm); background: var(--color-paper); white-space: nowrap; transition: background-color var(--dur-short) var(--ease-out), border-color var(--dur-short) var(--ease-out); }
@media (min-width: 40rem) { .chip { padding: 0 var(--space-sm); } }
.chip.is-old { color: var(--color-muted); text-decoration: line-through; text-decoration-color: var(--color-muted); border-style: dashed; }
.chip[aria-current] { border-color: var(--color-accent); background: var(--color-accent-wash); color: var(--color-ink); box-shadow: inset 0 -2px 0 var(--color-accent); }
@media (hover: hover) { .chip:hover { background: var(--color-paper-3); color: var(--color-ink); } }
.chip:active { transform: translateY(1px); }

.searchpill { margin-left: auto; flex: none; display: inline-flex; align-items: center; gap: var(--space-xs); height: 2.25rem; min-width: 2.75rem; justify-content: center; padding: 0 var(--space-xs); background: var(--color-paper-2); border: 1px solid var(--color-rule-2); border-radius: var(--radius-sm); color: var(--color-muted); font: inherit; font-size: var(--text-sm); line-height: 1; white-space: nowrap; cursor: pointer; transition: border-color var(--dur-short) var(--ease-out), background-color var(--dur-short) var(--ease-out); }
@media (hover: hover) { .searchpill:hover { border-color: var(--color-accent); background: var(--color-paper); } }
.searchpill:active { transform: translateY(1px); }
.searchpill__ico { width: 0.875rem; height: 0.875rem; border: 1.5px solid currentColor; border-radius: 50%; position: relative; flex: none; }
.searchpill__ico::after { content: ""; position: absolute; width: 0.375rem; height: 1.5px; background: currentColor; right: -0.3rem; bottom: -0.15rem; transform: rotate(45deg); }
.searchpill__text, .searchpill__kbd { display: none; }
kbd { font-family: var(--font-mono); font-size: 0.75rem; border: 1px solid var(--color-rule-2); border-bottom-width: 2px; border-radius: 4px; padding: 0 var(--space-2xs); color: var(--color-ink-2); background: var(--color-paper); line-height: 1.5; }
.searchpill__kbd { gap: var(--space-3xs); }
@media (pointer: coarse) { .chip, .searchpill { height: 2.75rem; } }

@media (min-width: 40rem) {
  .nav__brand { display: inline-flex; padding-left: var(--space-sm); border-left: 1px solid var(--color-rule); }
  .nav__hub-text { display: inline; }
  .nav__chips { margin-left: var(--space-md); }
  .searchpill { padding: 0 var(--space-xs) 0 var(--space-sm); }
  .searchpill__text { display: inline; }
  .searchpill__kbd { display: inline-flex; }
}

/* ---------- layout: narrative + pinned diagram ---------- */
.stack { padding-inline: var(--gutter); }
.narr { min-width: 0; container-type: inline-size; container-name: narr; }
.panel { display: none; }

@media (min-width: 64rem) {
  .stack { display: grid; grid-template-columns: minmax(0, 31rem) minmax(0, 1fr); gap: var(--space-xl); align-items: start; }
  .no-panel .stack { grid-template-columns: minmax(0, 46rem); }
  .panel {
    display: flex; flex-direction: column;
    position: sticky; top: calc(var(--nav-h) + var(--space-md));
    height: calc(100dvh - var(--nav-h) - var(--space-md) * 2);
    margin-top: var(--space-md);
    border: 1px solid var(--color-rule); border-radius: var(--radius-md);
    background: var(--color-paper); box-shadow: var(--shadow-lift); overflow: hidden;
  }
  .inline-fig { display: none; }
}
@media (min-width: 90rem) { .stack { grid-template-columns: minmax(0, 33rem) minmax(0, 1fr); gap: var(--space-2xl); } }

.panel__head, .panel__foot { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-sm) var(--space-md); min-height: 3rem; }
.panel__head { border-bottom: 1px solid var(--color-rule); }
.panel__foot { border-top: 1px solid var(--color-rule); }
.panel__label { font-family: var(--font-mono); font-size: var(--text-sm); font-weight: 500; color: var(--color-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; flex: 1 1 auto; }
.panel__stamp { flex: none; font-family: var(--font-mono); font-size: var(--text-sm); font-weight: 500; letter-spacing: 0.04em; color: var(--color-ink-2); border: 1px dashed var(--color-rule-2); background: var(--color-paper-2); border-radius: var(--radius-sm); padding: var(--space-3xs) var(--space-xs); white-space: nowrap; }
.open-link { flex: none; font-family: var(--font-mono); font-size: var(--text-sm); font-weight: 500; white-space: nowrap; }
.expand { flex: none; display: inline-flex; align-items: center; gap: var(--space-xs); height: 2rem; padding: 0 var(--space-2xs) 0 var(--space-sm); font-family: var(--font-mono); font-size: var(--text-sm); font-weight: 500; line-height: 1; color: var(--color-ink); white-space: nowrap; background: var(--color-paper); border: 1px solid var(--color-rule-2); border-radius: var(--radius-sm); cursor: pointer; transition: border-color var(--dur-short) var(--ease-out), background-color var(--dur-short) var(--ease-out); }
@media (hover: hover) { .expand:hover { border-color: var(--color-accent); background: var(--color-accent-wash); } }
.expand:active { transform: translateY(1px); }
@media (pointer: coarse) { .expand { height: 2.75rem; } .expand kbd { display: none; } }
.panel__stage { position: relative; flex: 1 1 auto; min-height: 0; display: grid; place-items: center; overflow: hidden; background: var(--color-paper-2); }
.panel__wait, .inline-fig__wait { grid-area: 1 / 1; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-muted); opacity: 0; transition: opacity var(--dur-short) var(--ease-out); }
.panel[data-waiting] .panel__wait { opacity: 1; }
/* Live archify viewers, one per state, stacked; only the active one is visible and interactive. */
.panel__frame {
  position: absolute; inset: 0; width: 100%; height: 100%;
  border: 0; display: block; background: transparent;
  opacity: 0; visibility: hidden;
  transition: opacity var(--dur-long) var(--ease-in-out), visibility 0s linear var(--dur-long);
}
.panel__frame.is-active[data-loaded] { opacity: 1; visibility: visible; transition: opacity var(--dur-long) var(--ease-in-out), visibility 0s; }
.panel[data-historical] .panel__stage { outline: 2px dashed var(--color-rule-2); outline-offset: -2px; }
.panel__affects { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-xs); min-width: 0; }
.panel__nodes { display: inline-flex; flex-wrap: wrap; gap: var(--space-2xs); }
.node { font-family: var(--font-mono); font-size: var(--text-sm); font-weight: 500; color: var(--color-ink); background: var(--color-paper-3); border-radius: 4px; padding: var(--space-3xs) var(--space-xs); white-space: nowrap; }
.panel__hint { font-size: var(--text-sm); color: var(--color-muted); }
.panel__affects[hidden], .panel__hint[hidden], .panel__stamp[hidden] { display: none; }
.panel__foot:not(:has(> :not([hidden]))) { display: none; }

.inline-fig { margin: var(--space-lg) 0 0; }
.inline-fig__frame { display: grid; place-items: center; border: 1px solid var(--color-rule); border-radius: var(--radius-md); overflow: hidden; background: var(--color-paper-2); height: min(75dvh, 30rem); }
.inline-fig__frame:not(:has(iframe)) .inline-fig__wait { opacity: 1; }
.inline-fig__iframe { grid-area: 1 / 1; width: 100%; height: 100%; border: 0; display: block; }
.dr.is-historical .inline-fig__frame { border-style: dashed; border-color: var(--color-rule-2); }
.inline-fig figcaption { display: flex; justify-content: space-between; align-items: center; gap: var(--space-sm); padding-top: var(--space-xs); font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-muted); }
.inline-fig figcaption span { min-width: 0; overflow-wrap: anywhere; }

/* ---------- full-screen diagram viewer ---------- */
.viewer { padding: 0; border: 0; margin: 0; width: 100%; height: 100dvh; max-width: none; max-height: none; background: var(--color-paper); color: var(--color-ink-2); }
.viewer[open] { display: flex; flex-direction: column; animation: viewer-in var(--dur-short) var(--ease-out); }
@keyframes viewer-in { from { opacity: 0; } to { opacity: 1; } }
.viewer::backdrop { background: var(--color-scrim); }
html:has(.viewer[open]) { overflow: hidden; }
.viewer__bar { flex: none; display: flex; align-items: center; gap: var(--space-md); height: var(--nav-h); padding-inline: var(--gutter); border-bottom: 1px solid var(--color-rule); }
.viewer__title { flex: 1 1 auto; min-width: 0; font-family: var(--font-mono); font-size: var(--text-sm); font-weight: 500; color: var(--color-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.viewer__close { flex: none; display: inline-flex; align-items: center; gap: var(--space-xs); height: 2.25rem; padding: 0 var(--space-2xs) 0 var(--space-sm); font-family: var(--font-mono); font-size: var(--text-sm); font-weight: 500; line-height: 1; color: var(--color-accent-ink); background: var(--color-ink); border: 1px solid var(--color-ink); border-radius: var(--radius-sm); white-space: nowrap; cursor: pointer; transition: background-color var(--dur-short) var(--ease-out); }
.viewer__close kbd { background: var(--color-ink-2); color: var(--color-accent-ink); border-color: var(--color-muted); }
@media (hover: hover) { .viewer__close:hover { background: var(--color-ink-2); } }
.viewer__close:active { transform: translateY(1px); }
@media (pointer: coarse) { .viewer__close { height: 2.75rem; } }
.viewer__stage { position: relative; flex: 1 1 auto; min-height: 0; display: grid; place-items: center; }
.viewer__wait { grid-area: 1 / 1; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-muted); }
.viewer__frame { grid-area: 1 / 1; width: 100%; height: 100%; border: 0; display: block; background: var(--color-paper); opacity: 0; transition: opacity var(--dur-short) var(--ease-out); }
.viewer__frame[data-loaded] { opacity: 1; }

/* ---------- hero ---------- */
.hero { padding: var(--space-lg) 0 var(--space-xl); display: grid; gap: var(--space-lg); }
.hero + .sec { border-top: 0; padding-top: var(--space-xl); }
.hero__note { display: flex; gap: var(--space-sm); align-items: baseline; font-size: var(--text-sm); color: var(--color-muted); line-height: 1.5; padding: var(--space-xs) var(--space-sm); border: 1px dashed var(--color-rule-2); border-radius: var(--radius-sm); justify-self: start; }
.hero__note .label { flex: none; }
.hero__title { font-size: var(--text-display); font-weight: 700; line-height: 1.02; letter-spacing: -0.035em; }
.hero__tagline { font-family: var(--font-display); font-weight: 500; font-size: var(--text-lg); line-height: 1.3; color: var(--color-ink-2); letter-spacing: -0.01em; }
.hero__meta { margin: 0; display: grid; border-top: 1px solid var(--color-rule); }
.hero__meta > div { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-2xs) var(--space-md); padding: var(--space-sm) 0; border-bottom: 1px solid var(--color-rule); }
@container narr (min-width: 20rem) { .hero__meta > div { grid-template-columns: 7rem minmax(0, 1fr); } }
.hero__meta dt { font-family: var(--font-mono); font-size: var(--text-sm); font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-muted); padding-top: 0.15em; }
.hero__meta dd { margin: 0; color: var(--color-ink); }
.hero__meta dd::first-letter { text-transform: uppercase; }

/* ---------- sections ---------- */
.sec { padding: var(--space-2xl) 0 var(--space-xl); border-top: 1px solid var(--color-rule); scroll-margin-top: calc(var(--nav-h) + var(--space-xs)); }
.sec > * + *, .sec__intro > * + * { margin-top: var(--space-md); }
.sec__title { font-size: var(--text-xl); font-weight: 700; line-height: 1.15; letter-spacing: -0.025em; }
.sec > .sec__title + *, .sec__intro > .sec__title + * { margin-top: var(--space-lg); }
.hero, .dr, .flow, .band { scroll-margin-top: calc(var(--nav-h) + var(--space-xs)); }

.list { margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--color-rule); }
.list > li { padding: var(--space-sm) 0; border-bottom: 1px solid var(--color-rule); }
.list > li > strong:first-child { display: block; font-family: var(--font-mono); font-size: var(--text-sm); font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-muted); margin-bottom: var(--space-3xs); }
.list ul { margin: var(--space-2xs) 0 0; padding-left: var(--space-lg); }
blockquote { margin: 0; padding-left: var(--space-md); border-left: 1px solid var(--color-rule-2); color: var(--color-ink-2); }

.sec--results p { font-family: var(--font-display); font-size: var(--text-lg); font-weight: 500; line-height: 1.35; color: var(--color-ink); letter-spacing: -0.01em; font-variant-numeric: tabular-nums; }

/* tables: stacked rows in a narrow column, a real grid when there is room */
.tbl { min-width: 0; }
.tbl table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.tbl thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
.tbl tr { display: grid; gap: var(--space-2xs); padding: var(--space-md) 0; border-top: 1px solid var(--color-rule); }
.tbl tr:last-child { border-bottom: 1px solid var(--color-rule); }
.tbl th[scope="row"] { text-align: left; font-family: var(--font-display); font-weight: 700; font-size: var(--text-base); color: var(--color-ink); }
.tbl td { display: grid; grid-template-columns: minmax(0, 1fr); gap: 0 var(--space-sm); }
@container narr (min-width: 20rem) { .tbl td { grid-template-columns: 7.5rem minmax(0, 1fr); } }
.tbl td::before { content: attr(data-label); font-family: var(--font-mono); font-size: var(--text-sm); font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; color: var(--color-muted); padding-top: 0.2em; }
@container narr (min-width: 44rem) {
  .tbl thead { position: static; width: auto; height: auto; overflow: visible; clip-path: none; }
  .tbl tr { display: table-row; }
  .tbl th, .tbl td { display: table-cell; padding: var(--space-sm) var(--space-sm) var(--space-sm) 0; vertical-align: top; text-align: left; border-bottom: 1px solid var(--color-rule); }
  .tbl thead th { font-family: var(--font-mono); font-size: var(--text-sm); font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-muted); border-bottom-color: var(--color-rule-2); }
  .tbl td::before { content: none; }
}

/* ---------- flows ---------- */
.flow { padding: var(--space-lg) 0 var(--space-md); }
.flow + .flow { border-top: 1px solid var(--color-rule); }
.flow__name { font-size: var(--text-lg); font-weight: 700; letter-spacing: -0.015em; line-height: 1.2; }
.flow__why { margin-top: var(--space-xs); color: var(--color-ink); }
.flow__link { margin-top: var(--space-sm); font-family: var(--font-mono); font-size: var(--text-sm); font-weight: 500; white-space: nowrap; }

/* ---------- decision index ---------- */
.dindex { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--color-rule); }
.dindex__row { position: relative; display: grid; grid-template-columns: 3.75rem minmax(0, 1fr); gap: var(--space-sm); padding: var(--space-sm) 0; border-bottom: 1px solid var(--color-rule); transition: background-color var(--dur-short) var(--ease-out); }
@media (hover: hover) { .dindex__row:hover { background: var(--color-paper-2); } }
.dindex__id { font-family: var(--font-mono); font-size: var(--text-sm); font-weight: 500; text-decoration: none; color: var(--color-ink); padding-top: 0.2em; white-space: nowrap; }
.dindex__id::after { content: ""; position: absolute; inset: 0; }
.dindex__title { font-weight: 600; color: var(--color-ink); line-height: 1.4; }
.dindex__title a { position: relative; z-index: var(--z-raised); }
.is-old .dindex__title, .is-old .dindex__id { color: var(--color-muted); font-weight: 400; }
.dindex__extra { margin: var(--space-2xs) 0 0; display: grid; gap: var(--space-3xs); font-size: var(--text-sm); line-height: 1.5; }
.dindex__extra div { display: grid; grid-template-columns: minmax(0, 1fr); gap: 0 var(--space-xs); }
@container narr (min-width: 20rem) { .dindex__extra div { grid-template-columns: 7.5rem minmax(0, 1fr); } }
.dindex__extra dt { font-family: var(--font-mono); letter-spacing: 0.04em; text-transform: uppercase; color: var(--color-muted); }
.dindex__extra dd { margin: 0; color: var(--color-ink-2); }

/* ---------- decision records ---------- */
.decisions { margin-top: var(--space-xl); display: grid; gap: var(--space-2xl); }
.dr { display: grid; gap: var(--space-lg); padding-top: var(--space-xl); border-top: 2px solid var(--color-ink); }
.dr__head { display: grid; gap: var(--space-sm); }
.dr__meta { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-xs); }
.dr__id { font-family: var(--font-mono); font-size: var(--text-sm); font-weight: 500; color: var(--color-accent-ink); background: var(--color-ink); border-radius: var(--radius-sm); padding: var(--space-3xs) var(--space-xs); }
.status { display: inline-flex; align-items: center; gap: 0.4em; font-family: var(--font-mono); font-size: var(--text-sm); font-weight: 500; letter-spacing: 0.04em; color: var(--color-ink-2); white-space: nowrap; }
.status::before { content: ""; width: 0.55rem; height: 0.55rem; border-radius: 2px; flex: none; }
.status--ok::before { background: var(--color-accent); }
.status--old::before { border: 1.5px solid var(--color-muted); }
.status--lineage::before { width: 0.9rem; height: 1.5px; background: var(--color-muted); border-radius: 0; }
.dr__title { font-size: var(--text-lg); font-weight: 700; line-height: 1.22; letter-spacing: -0.018em; }
.dr__block { display: grid; gap: var(--space-xs); }
.dr__block > * + * { margin-top: var(--space-2xs); }
.dr__context p:not(.label) { color: var(--color-ink-2); }
.label--force { color: var(--color-accent-text); display: inline-flex; align-items: center; gap: 0.5em; }
.label--force::before { content: ""; width: 0.55rem; height: 0.55rem; background: var(--color-accent); border-radius: 2px; }
.dr__why p:not(.label) { font-family: var(--font-display); font-size: var(--text-lg); font-weight: 500; line-height: 1.32; color: var(--color-ink); letter-spacing: -0.012em; }

.opts { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-xs); }
.opt { padding: var(--space-sm) var(--space-md); border: 1px solid var(--color-rule); border-radius: var(--radius-md); background: var(--color-paper); }
.opt.is-chosen { border-color: var(--color-accent); background: var(--color-accent-wash); padding-block: var(--space-md); }
.opt__name { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-2xs) var(--space-sm); color: var(--color-ink-2); line-height: 1.4; }
.opt.is-chosen .opt__name { color: var(--color-ink); font-weight: 600; }
.opt__tag { font-family: var(--font-mono); font-size: var(--text-sm); font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; color: var(--color-muted); }
.opt.is-chosen .opt__tag { color: var(--color-accent-text); }
.opt__trade { margin: var(--space-xs) 0 0; display: grid; gap: var(--space-xs); font-size: var(--text-sm); line-height: 1.5; }
.opt__trade div { display: grid; grid-template-columns: 4.5rem minmax(0, 1fr); gap: var(--space-xs); }
.opt__trade dt { font-family: var(--font-mono); font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; color: var(--color-muted); white-space: nowrap; }
.opt__trade dd { margin: 0; color: var(--color-ink-2); }
.opt.is-chosen .opt__trade dd { color: var(--color-ink); font-size: var(--text-base); line-height: 1.45; }

.dr__pair { grid-template-columns: minmax(0, 1fr); gap: var(--space-lg); padding-top: var(--space-md); border-top: 1px solid var(--color-rule); }
.dr__pair > div { display: grid; gap: var(--space-xs); align-content: start; }
.dr__pair > div:only-child { grid-column: 1 / -1; }
.dr__pair > * + * { margin-top: 0; }
@container narr (min-width: 30rem) { .dr__pair { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }

/* superseded record: kept readable, marked historical */
.dr.is-historical { border-top: 2px dashed var(--color-rule-2); }
.dr.is-historical .dr__id { background: var(--color-paper-3); color: var(--color-ink-2); }
.dr.is-historical .dr__title, .dr.is-historical .dr__why p:not(.label) { color: var(--color-ink-2); }
.dr.is-historical .opt.is-chosen { border-color: var(--color-rule-2); border-style: dashed; background: var(--color-paper-2); }
.dr.is-historical .opt.is-chosen .opt__tag { color: var(--color-muted); }
.dr.is-historical .label--force { color: var(--color-muted); }
.dr.is-historical .label--force::before { background: var(--color-rule-2); }

/* evolution: D-02 → D-04 reads as one line of reasoning */
.evo { display: grid; gap: 0; }
.evo__bridge { position: relative; display: grid; gap: var(--space-xs); margin: var(--space-xl) 0; padding: var(--space-md) var(--space-md) var(--space-md) var(--space-xl); border: 1px solid var(--color-rule); border-radius: var(--radius-md); background: var(--color-paper-2); }
.evo__bridge::before { content: ""; position: absolute; left: var(--space-md); top: calc(-1 * var(--space-xl)); bottom: calc(-1 * var(--space-xl)); width: 1px; background: var(--color-accent); }
.evo__step { display: flex; align-items: center; gap: var(--space-xs); font-family: var(--font-mono); font-size: var(--text-sm); font-weight: 500; color: var(--color-ink); }
.evo__arrow { color: var(--color-accent-text); }
.evo__why p:not(.label) { color: var(--color-ink); }
.evo__why .label + p { margin-top: var(--space-2xs); }

a.dref { font-family: var(--font-mono); font-size: 0.92em; font-weight: 500; white-space: nowrap; }

/* ---------- hindsight: the one dark band ---------- */
.band { background: var(--color-graphite); color: var(--color-on-graphite-2); margin-top: var(--space-2xl); padding: var(--space-3xl) var(--gutter) var(--space-2xl); }
.band__inner { max-width: 46rem; display: grid; gap: var(--space-lg); }
.band .sec__title { color: var(--color-on-graphite); }
.band p { font-family: var(--font-display); font-size: var(--text-lg); font-weight: 500; line-height: 1.38; color: var(--color-on-graphite); letter-spacing: -0.01em; }
.band a { color: var(--color-on-graphite); text-decoration-color: var(--color-accent-on-graphite); }
@media (hover: hover) { .band a:hover { color: var(--color-accent-on-graphite); } }
.band code { background: var(--color-graphite-rule); color: var(--color-on-graphite); }
.band :focus-visible { outline-color: var(--color-accent-on-graphite); }

/* ---------- footer (Ft1) ---------- */
.foot { padding: var(--space-xl) var(--gutter) var(--space-2xl); display: grid; gap: var(--space-xs); border-top: 1px solid var(--color-rule); }
.stack + .foot { margin-top: var(--space-2xl); }
.foot__mark { font-family: var(--font-display); font-weight: 700; font-size: var(--text-lg); color: var(--color-ink); letter-spacing: -0.015em; }
.foot__tag { color: var(--color-muted); max-width: 60ch; }
.foot__links { margin-top: var(--space-sm); font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-muted); display: flex; flex-wrap: wrap; gap: var(--space-2xs) var(--space-xs); }
.foot__links a { white-space: nowrap; }

/* ---------- command palette ---------- */
.cmdk { padding: 0; border: 0; background: transparent; width: min(36rem, calc(100% - 2rem)); max-width: none; max-height: min(80dvh, 34rem); margin: 12dvh auto auto; overflow: visible; color: var(--color-ink-2); }
.cmdk::backdrop { background: var(--color-scrim); }
.cmdk__panel { display: flex; flex-direction: column; max-height: min(80dvh, 34rem); background: var(--color-paper); border: 1px solid var(--color-rule-2); border-radius: var(--radius-md); box-shadow: var(--shadow-pop); overflow: hidden; }
.cmdk[open] .cmdk__panel { animation: cmdk-in var(--dur-short) var(--ease-out); }
@keyframes cmdk-in { from { opacity: 0; transform: translateY(-6px) scale(0.985); } to { opacity: 1; transform: none; } }
.cmdk__field { display: flex; align-items: center; gap: var(--space-sm); padding: 0 var(--space-md); border-bottom: 1px solid var(--color-rule); color: var(--color-muted); }
.cmdk__field input { flex: 1 1 auto; min-width: 0; height: 2.75rem; margin-block: var(--space-2xs); padding-inline: var(--space-xs); border: 1px solid transparent; border-radius: var(--radius-sm); background: transparent; font-family: var(--font-mono); font-size: var(--text-base); color: var(--color-ink); outline: 2px solid transparent; outline-offset: 1px; }
.cmdk__field input::placeholder { color: var(--color-muted); }
.cmdk__field input:focus-visible { outline-color: var(--color-focus); }
.cmdk__list { list-style: none; margin: 0; padding: var(--space-xs); overflow-y: auto; }
.cmdk__group { padding: var(--space-sm) var(--space-xs) var(--space-2xs); font-family: var(--font-mono); font-size: var(--text-sm); letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-muted); }
.cmdk__item { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-md); padding: var(--space-xs) var(--space-sm); border-radius: var(--radius-sm); cursor: pointer; min-height: 2.75rem; align-items: center; }
.cmdk__item[aria-selected="true"] { background: var(--color-accent-wash); }
.cmdk__item[aria-selected="true"] .cmdk__label { color: var(--color-accent-text); }
.cmdk__label { color: var(--color-ink); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cmdk__meta { flex: none; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-muted); }
.cmdk__item[hidden], .cmdk__group[hidden], .cmdk__empty[hidden] { display: none; }
.cmdk__empty { padding: var(--space-md); color: var(--color-muted); }
.cmdk__foot { display: flex; gap: var(--space-md); flex-wrap: wrap; padding: var(--space-xs) var(--space-md); border-top: 1px solid var(--color-rule); font-size: var(--text-sm); color: var(--color-muted); }
.cmdk__foot span { display: inline-flex; gap: var(--space-2xs); align-items: center; }

@media (max-width: 39.99rem) {
  .cmdk { width: 100%; margin: 0 auto auto; max-height: 100dvh; }
  .cmdk__panel { max-height: 100dvh; border-radius: 0 0 var(--radius-md) var(--radius-md); }
  .cmdk__foot { display: none; }
}

@media (min-width: 40rem) {
  .hero { padding: var(--space-xl) 0 var(--space-2xl); }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
  .panel__frame, .panel__frame.is-active[data-loaded] { transition: opacity 150ms linear, visibility 0s; }
  .chip:active, .searchpill:active { transform: none; }
}
`;
