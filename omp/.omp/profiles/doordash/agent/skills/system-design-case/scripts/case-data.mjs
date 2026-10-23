// Reads a case folder (README.md + decisions/D-NN-*.md) into plain data for the page renderer.
// Handles the markdown subset the case templates use: headings, paragraphs, blockquotes,
// one-level bullet lists (with one level of nesting), tables, and inline bold/strike/code/links.
import fs from 'node:fs';
import path from 'node:path';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Link targets become in-page anchors (decision records) or diagram hooks the page script intercepts.
function rewriteHref(href) {
  const decision = href.match(/(?:^|\/)(D-\d+)-[^/]*\.md$/);
  if (decision) return { href: `#${decision[1].toLowerCase()}` };
  const diagram = href.match(/^(diagrams\/[^#?]+\.html)(?:#(.*))?$/);
  if (diagram) return { href, diagram: diagram[1], hash: diagram[2] ?? '' };
  return { href };
}

export function inline(text) {
  const code = [];
  let s = text.replace(/`([^`]+)`/g, (_, c) => `\u0000${code.push(c) - 1}\u0000`);
  s = esc(s)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
      const t = rewriteHref(href.replace(/&amp;/g, '&'));
      const attrs = t.diagram ? ` data-diagram="${esc(t.diagram)}" data-hash="${esc(t.hash)}"` : '';
      return `<a href="${esc(t.href)}"${attrs}>${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/~~([^~]+)~~/g, '<s>$1</s>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(code[i])}</code>`);
}

const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

// Markdown lines → blocks: {type:'p'|'quote', html} | {type:'list', items:[{html, children}]} | {type:'table', head, rows}
export function blocks(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i += 1; continue; }
    if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      const [head, , ...body] = rows.map(cells);
      out.push({ type: 'table', head: head.map(inline), rows: body.map((r) => r.map(inline)), raw: body });
      continue;
    }
    if (/^\s*[-*] /.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*] /.test(lines[i])) {
        const nested = /^\s{2,}[-*] /.test(lines[i]);
        const html = inline(lines[i].replace(/^\s*[-*] /, ''));
        if (nested && items.length) items.at(-1).children.push(html);
        else items.push({ html, children: [] });
        i += 1;
      }
      out.push({ type: 'list', items });
      continue;
    }
    const quote = line.startsWith('>');
    const para = [];
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith('|') && !/^\s*[-*] /.test(lines[i]) && lines[i].startsWith('>') === quote) {
      para.push(lines[i].replace(/^>\s?/, ''));
      i += 1;
    }
    out.push({ type: quote ? 'quote' : 'p', html: inline(para.join(' ')) });
  }
  return out;
}

// Splits on "## " headings: { preamble: lines, sections: [{id, title, lines}] }
function sections(text) {
  const result = { preamble: [], sections: [] };
  for (const line of text.split('\n')) {
    const h = line.match(/^## (.+)$/);
    if (h) result.sections.push({ id: slug(h[1]), title: h[1].trim(), lines: [] });
    else (result.sections.at(-1)?.lines ?? result.preamble).push(line);
  }
  return result;
}

// "**Label:** value **Label:** value" → [{label, html}]
function labelled(line) {
  return [...line.matchAll(/\*\*([^*]+?):\*\*\s*(.*?)(?=\s*(?:·\s*)?\*\*[^*]+?:\*\*|$)/g)]
    .map(([, label, value]) => ({ label, html: inline(value.trim()) }));
}

function readDecision(file) {
  const text = fs.readFileSync(file, 'utf8');
  const { preamble, sections: parts } = sections(text);
  const heading = preamble.find((l) => l.startsWith('# ')).match(/^# (D-\d+):\s*(.+)$/);
  const statusLine = preamble.find((l) => l.startsWith('**Status:**')) ?? '';
  const status = statusLine.match(/\*\*Status:\*\*\s*(\w+)/)?.[1] ?? 'accepted';
  const affectsText = statusLine.split('**Affects:**')[1] ?? '';
  const affects = affectsText.split(';').map((part) => {
    const m = part.match(/`(diagrams\/[^`]+)`\s*→\s*(.*)/);
    return m && { diagram: m[1].replace(/\.json$/, '.html'), ids: [...m[2].matchAll(/`([^`]+)`/g)].map((x) => x[1]) };
  }).filter(Boolean);
  const byId = Object.fromEntries(parts.map((p) => [p.id, p]));
  const options = (blocks(byId.options?.lines ?? []).find((b) => b.type === 'table')?.raw ?? []).map(([name, wins, costs]) => ({
    chosen: /^\*\*.*\*\*$/.test(name),
    html: inline(name.replace(/^\*\*(.*)\*\*$/, '$1')),
    wins: inline(wins ?? ''),
    costs: inline(costs ?? ''),
  }));
  const body = (id) => blocks(byId[id]?.lines ?? []);
  return {
    id: heading[1],
    anchorId: heading[1].toLowerCase(),
    title: inline(heading[2]),
    status,
    supersededBy: status === 'superseded' ? statusLine.match(/superseded by \[?(D-\d+)/)?.[1] ?? null : null,
    supersedes: statusLine.match(/supersedes \[?(D-\d+)/)?.[1] ?? null,
    affects,
    anchor: affects.find((a) => a.diagram.endsWith('architecture.html'))?.ids[0] ?? null,
    context: body('context'),
    options,
    why: body('why'),
    cost: body('cost-accepted'),
    revisit: body('revisit-when'),
  };
}

export function readCase(dir) {
  const { preamble, sections: parts } = sections(fs.readFileSync(path.join(dir, 'README.md'), 'utf8'));
  const title = preamble.find((l) => l.startsWith('# '))?.slice(2).trim() ?? path.basename(dir);
  const pre = blocks(preamble.filter((l) => !l.startsWith('# ')));
  const metaLine = preamble.find((l) => l.startsWith('**My role:**')) ?? '';
  const decisionsDir = path.join(dir, 'decisions');
  const decisions = fs.existsSync(decisionsDir)
    ? fs.readdirSync(decisionsDir).filter((f) => /^D-\d+-.*\.md$/.test(f)).sort().map((f) => readDecision(path.join(decisionsDir, f)))
    : [];
  const flowTable = parts.find((p) => p.id === 'key-flows') && blocks(parts.find((p) => p.id === 'key-flows').lines).find((b) => b.type === 'table');
  const flows = (flowTable?.raw ?? []).map(([name, diagram, why]) => ({
    name: inline(name),
    diagram: diagram.match(/\((diagrams\/[^)#]+\.html)/)?.[1] ?? null,
    why: inline(why ?? ''),
  }));
  const architecture = parts.find((p) => p.id === 'architecture');
  // Node labels per rendered diagram, from the archify JSON sources: { 'diagrams/x.html': { id: label } }.
  const diagramsDir = path.join(dir, 'diagrams');
  const nodeLabels = Object.fromEntries((fs.existsSync(diagramsDir) ? fs.readdirSync(diagramsDir) : [])
    .filter((f) => f.endsWith('.json') && !f.includes('.delivery.'))
    .map((f) => {
      const spec = JSON.parse(fs.readFileSync(path.join(diagramsDir, f), 'utf8'));
      const nodes = spec.components ?? spec.participants ?? spec.nodes ?? spec.states ?? [];
      return [`diagrams/${f.replace(/\.json$/, '.html')}`, Object.fromEntries(nodes.map((n) => [n.id, n.label]))];
    }));
  return {
    title,
    ledes: pre.filter((b) => b.type === 'quote').map((b) => b.html),
    meta: labelled(metaLine),
    architectureDiagram: architecture?.lines.join('\n').match(/\((diagrams\/architecture\.html)\)/)?.[1] ?? null,
    flows,
    decisions,
    nodeLabels,
    // Interview prep is the presenter's private notes; it stays in the README only.
    sections: parts.filter((p) => p.id !== 'interview-prep').map((p) => ({ id: p.id, title: p.title, blocks: blocks(p.lines) })),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(`${JSON.stringify(readCase(process.argv[2]), null, 2)}\n`);
}
