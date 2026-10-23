#!/usr/bin/env node
// Usage: node build-page.mjs <case-dir | cases-root>
// The cases root (has case subfolders; its own README.md, e.g. a repo README, is ignored) writes every case page,
// then the hub at <cases-root>/index.html.
// A case dir (has README.md, no case subfolders) writes <case-dir>/index.html, then rebuilds the hub in its parent.
import fs from 'node:fs';
import path from 'node:path';
import { readCase } from './case-data.mjs';
import { renderPage } from './page-template.mjs';
import { renderIndex } from './index-template.mjs';

const isCase = (dir) => fs.existsSync(path.join(dir, 'README.md'));
const caseDirs = (root) => fs.readdirSync(root, { withFileTypes: true })
  .filter((e) => e.isDirectory() && isCase(path.join(root, e.name)))
  .map((e) => path.join(root, e.name));
const wrote = (file) => process.stdout.write(`wrote ${path.relative(process.cwd(), file) || file}\n`);

function buildCase(caseDir) {
  const data = readCase(caseDir);

  // Every diagram the page can show: architecture, flows, decision affects, and inline links.
  const diagrams = new Set([data.architectureDiagram, ...data.flows.map((f) => f.diagram), ...data.decisions.flatMap((d) => d.affects.map((a) => a.diagram))]);
  for (const [, d] of JSON.stringify(data.sections).matchAll(/data-diagram=\\"([^"\\]+)\\"/g)) diagrams.add(d);
  for (const d of diagrams) {
    if (d && !fs.existsSync(path.join(caseDir, d))) process.stderr.write(`build-page: warning: ${d} not found; sections that use it show no diagram\n`);
  }

  // Every Affects id must be a node in its diagram's archify JSON, or archify's #focus has nothing to show.
  for (const d of data.decisions) {
    for (const { diagram, ids } of d.affects) {
      const known = data.nodeLabels[diagram];
      for (const id of known ? ids : []) {
        if (!(id in known)) process.stderr.write(`build-page: warning: ${d.id} affects "${id}", which is not a node in ${diagram.replace(/\.html$/, '.json')}\n`);
      }
    }
  }

  const out = path.join(caseDir, 'index.html');
  fs.writeFileSync(out, renderPage(data));
  wrote(out);
}

function buildHub(root) {
  const cases = caseDirs(root)
    .map((dir) => ({ slug: path.basename(dir), href: `${path.basename(dir)}/index.html`, data: readCase(dir) }))
    .sort((a, b) => a.data.title.localeCompare(b.data.title));
  const out = path.join(root, 'index.html');
  fs.writeFileSync(out, renderIndex(cases));
  wrote(out);
}

const arg = process.argv[2];
if (!arg) {
  process.stderr.write('usage: node build-page.mjs <case-dir | cases-root>\n');
  process.exit(1);
}
const target = path.resolve(arg);
if (fs.existsSync(target) && caseDirs(target).length) {
  for (const dir of caseDirs(target)) buildCase(dir);
  buildHub(target);
} else if (isCase(target)) {
  buildCase(target);
  buildHub(path.dirname(target));
} else {
  process.stderr.write(`build-page: ${target} is neither a case (no README.md) nor a folder of cases\n`);
  process.exit(1);
}
