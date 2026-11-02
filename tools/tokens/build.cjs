#!/usr/bin/env node
'use strict';
/**
 * Vila do Caminho design tokens: validate tokens/vila.tokens.json and generate tokens/dist/.
 * Supports the subset of the Design Tokens Format Module 2025.10 used by this file:
 * color (srgb), dimension (px/rem), number, duration (ms/s), fontFamily, and {group.token} aliases.
 * No dependencies. `node tools/tokens/build.cjs` writes dist; `--check` fails if dist is stale.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'tokens/vila.tokens.json');
const DIST = path.join(ROOT, 'tokens/dist');
const NS = 'com.viladocaminho';
const TYPES = new Set(['color', 'dimension', 'number', 'duration', 'fontFamily']);
const SOURCES = new Set(['runtime', 'measured', 'derived', 'proposed']);
const HEADER = 'Gerado por tools/tokens/build.cjs a partir de tokens/vila.tokens.json. Não editar à mão.';

/** Walk the tree: every token with its dotted path and resolved $type (own or inherited from the closest group). */
function collect(doc) {
  const tokens = new Map(), errors = [];
  (function walk(node, trail, inherited) {
    const type = node.$type ?? inherited;
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('$')) continue;
      const here = [...trail, key];
      if (/[.{}]/.test(key)) errors.push(`${here.join('.')}: invalid name`);
      if (!child || typeof child !== 'object' || Array.isArray(child)) { errors.push(`${here.join('.')}: not a group or token`); continue; }
      if (Object.hasOwn(child, '$value')) tokens.set(here.join('.'), { path: here.join('.'), token: child, type: child.$type ?? type });
      else walk(child, here, type);
    }
  })(doc, [], undefined);
  return { tokens, errors };
}

const isAlias = v => typeof v === 'string' && /^\{[^{}]+\}$/.test(v);

function checkValue(type, v) {
  switch (type) {
    case 'color': {
      if (!v || v.colorSpace !== 'srgb' || !Array.isArray(v.components) || v.components.length !== 3) return 'color needs srgb and 3 components';
      if (!v.components.every(c => Number.isFinite(c) && c >= 0 && c <= 1)) return 'components must be in [0, 1]';
      if (v.alpha !== undefined && !(Number.isFinite(v.alpha) && v.alpha >= 0 && v.alpha <= 1)) return 'alpha must be in [0, 1]';
      if (!/^#[0-9a-f]{6}$/.test(v.hex ?? '')) return 'hex must be #rrggbb (lower case)';
      const fromComponents = '#' + v.components.map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('');
      return fromComponents === v.hex ? null : `hex ${v.hex} disagrees with components (${fromComponents})`;
    }
    case 'dimension': return v && Number.isFinite(v.value) && ['px', 'rem'].includes(v.unit) ? null : 'dimension needs {value, unit: px|rem}';
    case 'number': return Number.isFinite(v) ? null : 'number must be finite';
    case 'duration': return v && Number.isFinite(v.value) && v.value >= 0 && ['ms', 's'].includes(v.unit) ? null : 'duration needs {value >= 0, unit: ms|s}';
    case 'fontFamily': return (typeof v === 'string' && v) || (Array.isArray(v) && v.length && v.every(s => typeof s === 'string' && s)) ? null : 'fontFamily must be a string or string[]';
    default: return `unsupported $type ${type}`;
  }
}

/** Validate structure, types, sources and aliases. Returns {tokens, errors}; resolved values in token.resolved. */
function validate(doc) {
  const { tokens, errors } = collect(doc);
  for (const t of tokens.values()) {
    if (!TYPES.has(t.type)) { errors.push(`${t.path}: missing or unsupported $type`); continue; }
    const ext = t.token.$extensions?.[NS];
    if (!ext || !SOURCES.has(ext.source) || typeof ext.from !== 'string' || !ext.from) errors.push(`${t.path}: $extensions.${NS} needs source and from`);
    if (!isAlias(t.token.$value)) { const e = checkValue(t.type, t.token.$value); if (e) errors.push(`${t.path}: ${e}`); }
  }
  function resolve(t, seen = []) {
    if (!isAlias(t.token.$value)) return t.token.$value;
    const target = t.token.$value.slice(1, -1);
    if (seen.includes(target)) throw new Error(`alias cycle ${[...seen, target].join(' -> ')}`);
    const next = tokens.get(target);
    if (!next) throw new Error(`alias to missing token ${target}`);
    if (next.type !== t.type) throw new Error(`alias type ${t.type} -> ${next.type}`);
    return resolve(next, [...seen, t.path]);
  }
  for (const t of tokens.values()) {
    try { t.resolved = resolve(t); } catch (e) { errors.push(`${t.path}: ${e.message}`); }
  }
  return { tokens, errors };
}

const kebab = s => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
const cssName = p => '--vila-' + p.split('.').map(kebab).join('-');
function colorHex(v) {
  return v.alpha === undefined || v.alpha >= 1 ? v.hex : v.hex + Math.round(v.alpha * 255).toString(16).padStart(2, '0');
}
const FONT_GENERIC = new Set(['serif', 'sans-serif', 'monospace', 'system-ui', 'cursive', 'fantasy']);
const fontCss = v => (Array.isArray(v) ? v : [v]).map(f => FONT_GENERIC.has(f) || !/\s/.test(f) ? f : JSON.stringify(f)).join(', ');
function plain(type, v) {
  switch (type) {
    case 'color': return colorHex(v);
    case 'dimension': return v.unit === 'px' ? v.value : `${v.value}${v.unit}`;
    case 'duration': return v.unit === 'ms' ? v.value : v.value * 1000;
    case 'fontFamily': return fontCss(v);
    default: return v;
  }
}
function cssValue(type, v) {
  if (type === 'dimension') return `${v.value}${v.unit}`;
  if (type === 'duration') return `${v.value}${v.unit}`;
  return String(plain(type, v));
}

function render(doc) {
  const { tokens, errors } = validate(doc);
  if (errors.length) throw new Error('Invalid tokens:\n' + errors.join('\n'));
  const version = doc.$extensions?.[NS]?.version ?? '0.0.0';
  const all = [...tokens.values()];

  // CSS custom properties; aliases stay aliases.
  const css = [`/* ${HEADER} Versão ${version}. */`, ':root {'];
  for (const t of all) {
    const v = isAlias(t.token.$value) ? `var(${cssName(t.token.$value.slice(1, -1))})` : cssValue(t.type, t.resolved);
    css.push(`  ${cssName(t.path)}: ${v};`);
  }
  css.push('}', '');

  // UMD module: frozen tree of plain values (colour hex, px and ms as numbers).
  const tree = {};
  for (const t of all) {
    const keys = t.path.split('.'); let node = tree;
    for (const k of keys.slice(0, -1)) node = node[k] ??= {};
    node[keys.at(-1)] = plain(t.type, t.resolved);
  }
  const js = `/* ${HEADER} Versão ${version}. Cores em hex, dimensões em px e durações em ms. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.VILA_TOKENS = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function freeze(o) { Object.values(o).forEach(function (v) { if (v && typeof v === 'object') freeze(v); }); return Object.freeze(o); }
  return freeze(${JSON.stringify({ version, ...tree }, null, 2).replace(/\n/g, '\n  ')});
});
`;

  // Palettes: GIMP/Aseprite .gpl and a Lospec .hex of the named runtime palette.
  const gpl = (name, list) => ['GIMP Palette', `Name: ${name}`, 'Columns: 8', `# ${HEADER}`,
    ...list.map(([p, hex]) => { const n = parseInt(hex.slice(1), 16); return `${String(n >> 16).padStart(3)} ${String((n >> 8) & 255).padStart(3)} ${String(n & 255).padStart(3)}\t${p}`; }), ''].join('\n');
  const colours = prefix => all.filter(t => t.type === 'color' && t.path.startsWith(prefix) && !isAlias(t.token.$value)).map(t => [t.path.replace(/^color\./, ''), t.resolved.hex]);
  const runtime = colours('color.runtime.');
  const concept = [...colours('color.reference.'), ...colours('color.season.'), ...colours('color.skin.')];
  const named = runtime.filter(([p]) => !p.startsWith('runtime.inline.'));
  return {
    'preview.html': preview(doc, tokens, version),
    'vila-tokens.css': css.join('\n'),
    'vila-tokens.js': js,
    'vila-runtime.gpl': gpl('Vila do Caminho - runtime (P + literais)', runtime),
    'vila-concept.gpl': gpl('Vila do Caminho - referência e temporada (medidas)', concept),
    'vila-runtime-named.hex': named.map(([, h]) => h.slice(1)).join('\n') + '\n',
  };
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = n => typeof n === 'number' ? String(Math.round(n * 1000) / 1000) : n;

/** Static preview page (no script, no network): every token, styled with the repo's own UI tokens. */
function preview(doc, tokens, version) {
  const all = [...tokens.values()];
  const meta = doc.$extensions?.[NS] ?? {};
  const short = p => p.replace(/^color\./, '');
  const chip = (t, inRow) => {
    const v = t.resolved, e = t.token.$extensions[NS], alias = isAlias(t.token.$value);
    const near = e.nearestReference ?? e.nearestRuntime ?? e.nearestNamed;
    const note = alias ? `= ${short(t.token.$value.slice(1, -1))}` : near ? `${short(near.token)} · ΔE ${near.dE2000}` :
      e.contrast ? `contraste ${e.contrast.ratio}:1` : '';
    return `<li class="sw ${e.source}"><span class="chip${v.alpha !== undefined ? ' alpha' : ''}"><i style="background:${colorHex(v)}"></i></span>` +
      `<code>${esc(inRow ? t.path.split('.').at(-1) : t.path.split('.').slice(2).join('.') || t.path)}</code><b>${colorHex(v)}</b><small>${esc(e.source)}${note ? ' · ' + esc(note) : ''}</small></li>`;
  };
  const groupsUnder = prefix => {
    const out = new Map();
    for (const t of all) if (t.type === 'color' && t.path.startsWith(prefix)) {
      const rest = t.path.slice(prefix.length).split('.');
      const key = rest.length > 1 ? rest.slice(0, -1).join('.') : '';
      if (!out.has(key)) out.set(key, []); out.get(key).push(t);
    }
    return out;
  };
  const describe = p => { let n = doc; for (const k of p.split('.')) n = n?.[k]; return n?.$description ?? ''; };
  const section = (title, prefix, intro) => {
    const rows = [...groupsUnder(prefix)].map(([key, list]) =>
      `<div class="row">${key ? `<h3>${esc(key)}${describe(prefix + key) ? `<span>${esc(describe(prefix + key))}</span>` : ''}</h3>` : ''}<ul>${list.map(t => chip(t, Boolean(key))).join('')}</ul></div>`).join('');
    return `<section><h2>${esc(title)}</h2><p>${esc(intro)}</p>${rows}</section>`;
  };
  const value = t => {
    const v = t.resolved;
    if (t.type === 'dimension' || t.type === 'duration') return `${fmt(v.value)} ${v.unit}`;
    if (t.type === 'fontFamily') return fontCss(v);
    return fmt(v);
  };
  const others = all.filter(t => t.type !== 'color').map(t => {
    const e = t.token.$extensions[NS];
    return `<tr><td><code>${esc(t.path)}</code></td><td class="num">${esc(value(t))}</td><td><span class="tag ${e.source}">${esc(e.source)}</span></td><td>${esc(e.from)}</td></tr>`;
  }).join('');
  const cov = meta.coverageOfReference ?? {};
  const covRows = ['runtime_P', 'runtime_drawn', 'reference_measured'].filter(k => cov[k]).map(k =>
    `<tr><td>${esc(k)}</td><td class="num">${cov[k].colors}</td><td class="num">${cov[k].mean}</td><td class="num">${cov[k].median}</td><td class="num">${cov[k].p90}</td><td class="num">${Math.round(cov[k].share_lt_5 * 1000) / 10}%</td></tr>`).join('');
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tokens da Vila</title>
<!-- ${HEADER} Versão ${version}. -->
<link rel="stylesheet" href="vila-tokens.css">
<style>
*{box-sizing:border-box}body{margin:0;background:var(--vila-color-ui-page-background);color:var(--vila-color-ui-page-text);font:15px/1.6 var(--vila-font-family-ui)}
main{max-width:1180px;margin:0 auto;padding:28px 16px 64px}h1{font:400 clamp(30px,5vw,46px)/1.1 var(--vila-font-family-display);margin:8px 0 12px}
h2{font:400 26px/1.2 var(--vila-font-family-display);margin:44px 0 6px;padding-top:18px;border-top:1px solid var(--vila-color-ui-divider-header)}
h3{font-size:13px;letter-spacing:.06em;margin:18px 0 8px;color:var(--vila-color-ui-text-eyebrow)}h3 span{font-weight:400;letter-spacing:0;margin-left:8px;color:var(--vila-color-ui-text-small)}
p{color:var(--vila-color-ui-text-body);max-width:760px}.eyebrow{font-size:11px;letter-spacing:.2em;color:var(--vila-color-ui-text-eyebrow)}
ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.sw{display:grid;grid-template-columns:44px 1fr;column-gap:10px;align-items:center;min-width:0}.sw code,.sw b,.sw small{grid-column:2;min-width:0;overflow-wrap:anywhere}
.chip{grid-row:1/span 3;width:44px;height:44px;border-radius:6px;overflow:hidden;box-shadow:0 0 0 1px var(--vila-color-ui-divider-section)}.chip.alpha{background:conic-gradient(#999 25%,#ddd 0 50%,#999 0 75%,#ddd 0) 0 0/12px 12px}
.chip i{display:block;width:100%;height:100%}.sw code{font-size:12px}.sw b{font:600 12px var(--vila-font-family-canvas)}.sw small{font-size:11px;color:var(--vila-color-ui-text-small)}
.sw.proposed .chip{outline:2px dashed var(--vila-color-ui-accent-badge);outline-offset:2px}
table{width:100%;border-collapse:collapse;font-size:13px}td,th{text-align:left;padding:6px 8px;border-bottom:1px solid var(--vila-color-ui-divider-section);vertical-align:top}
td.num{font-family:var(--vila-font-family-canvas);white-space:nowrap}.scroll{overflow-x:auto}
.tag{font-size:11px;padding:1px 6px;border-radius:4px;border:1px solid var(--vila-color-ui-button-border)}.legend{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:13px}
</style></head><body><main>
<div class="eyebrow">VILA DO CAMINHO · TOKENS ${esc(version)}</div>
<h1>Tokens do jogo 2D</h1>
<p>Cada valor diz de onde veio: <b>runtime</b> (lido em public/world.js ou style.css), <b>measured</b> (medido na arte-conceito), <b>derived</b> (calculado) ou <b>proposed</b> (cor nova medida, ainda sem equivalente no runtime, com borda tracejada). ΔE é CIEDE2000.</p>
<section><h2>Quanto o runtime reproduz a referência</h2><p>Pixels da referência aprovada levados à cor mais próxima de cada paleta. Erro em ΔE2000; abaixo de 5 a diferença é pequena em pixel art.</p>
<div class="scroll"><table><tr><th>paleta</th><th>cores</th><th>média</th><th>mediana</th><th>p90</th><th>ΔE &lt; 5</th></tr>${covRows}</table></div></section>
${section('Paleta do runtime (P)', 'color.runtime.', 'A paleta nomeada que o jogo usa hoje. Abaixo de cada cor, a cor medida mais próxima na referência.')}
${section('Referência aprovada (medida)', 'color.reference.', 'Rampas medidas na imagem aprovada, do escuro (1) ao claro.')}
${section('Temporada (medida, para arte nova)', 'color.season.', 'Materiais que a cena ainda não tem. Alias = reaproveita uma cor do runtime.')}
${section('Pele por ofício', 'color.skin.', '1 sombra, 2 base, 3 luz, medidas por rosto.')}
${section('Página e luz', 'color.ui.', 'Cores do CSS publicado, com contraste calculado.')}
${section('Luz', 'color.light.', 'Véu da noite e brilho da fogueira.')}
<section><h2>Escala, câmera, movimento e tipo</h2><div class="scroll"><table><tr><th>token</th><th>valor</th><th>origem</th><th>de onde</th></tr>${others}</table></div></section>
</main></body></html>
`;
}

const README = path.join(ROOT, 'tokens/README.md');
const BEGIN = '<!-- gerado por tools/tokens/build.cjs: início -->', END = '<!-- gerado por tools/tokens/build.cjs: fim -->';
const br = (n, d = 2) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: d });

/** The numbers section of tokens/README.md, written from the token file so no figure is typed by hand. */
function readmeBlock(doc) {
  const { tokens } = validate(doc);
  const meta = doc.$extensions[NS], cov = meta.coverageOfReference, all = [...tokens.values()];
  const e = t => t.token.$extensions[NS];
  const label = { runtime_P: 'P do runtime', runtime_drawn: 'tudo que o runtime desenha', reference_measured: 'paleta medida da referência' };
  const lines = ['### Cobertura da referência aprovada', '',
    'Cada pixel da referência (1 a cada 3, nos dois eixos) levado à cor mais próxima da paleta.', '',
    '| paleta | cores | ΔE médio | mediana | p90 | pixels com ΔE < 5 |', '|---|---:|---:|---:|---:|---:|',
    ...Object.keys(label).map(k => `| ${label[k]} | ${cov[k].colors} | ${br(cov[k].mean)} | ${br(cov[k].median)} | ${br(cov[k].p90)} | ${br(cov[k].share_lt_5 * 100, 1)}% |`), ''];
  const far = all.filter(t => /^color\.runtime\.[^.]+$/.test(t.path) && e(t).nearestReference.dE2000 > 6).sort((a, b) => e(b).nearestReference.dE2000 - e(a).nearestReference.dE2000);
  lines.push('### Cores de P mais longe da referência (ΔE > 6)', '', '| token | runtime | referência mais próxima | ΔE |', '|---|---|---|---:|',
    ...far.map(t => `| \`${t.path}\` | ${t.resolved.hex} | \`${e(t).nearestReference.token}\` ${tokens.get(e(t).nearestReference.token).resolved.hex} | ${br(e(t).nearestReference.dE2000)} |`), '');
  const missing = all.filter(t => t.path.startsWith('color.reference.') && e(t).nearestRuntime.dE2000 > 8).sort((a, b) => e(b).nearestRuntime.dE2000 - e(a).nearestRuntime.dE2000);
  lines.push('### Cores da referência sem par em P (ΔE > 8)', '', '| token | medida | mais próxima em P | ΔE |', '|---|---|---|---:|',
    ...missing.map(t => `| \`${t.path}\` | ${t.resolved.hex} | \`${e(t).nearestRuntime.token}\` ${tokens.get(e(t).nearestRuntime.token).resolved.hex} | ${br(e(t).nearestRuntime.dE2000)} |`), '');
  const prop = tokens.get('number.scale.runtimeToReferenceProportion'), per = e(prop).perObject;
  lines.push('### Proporção dos sprites em relação ao personagem', '', '1,00 = mesma proporção da referência; 1,30 = 30% maior no runtime.', '',
    '| sprite | largura | altura |', '|---|---:|---:|', ...Object.entries(per).map(([k, [w, h]]) => `| ${k} | ${br(w)} | ${br(h)} |`), '',
    `Mediana: ${br(prop.resolved)}.`, '');
  const sc = tokens.get('number.scale.runtimePxPerReferenceArtPx');
  const fig = tokens.get('dimension.character.figure.height'), vil = meta.referenceVillagerArtPx;
  const proposed = all.filter(t => e(t).source === 'proposed').length, aliases = all.filter(t => isAlias(t.token.$value)).length;
  lines.push('### Escala e contagem', '',
    `- 1 pixel de arte da referência = ${br(sc.resolved, 3)} px no runtime: personagem do runtime com ${br(e(fig).median, 1)} px de altura (mediana dos ${e(fig).frames} quadros, sem sombra) e pescador da referência com ${br(vil[0], 1)} × ${br(vil[1], 1)} px de arte.`,
    `- ${tokens.size} tokens: ${all.filter(t => t.type === 'color').length} cores (${meta.runtimeDeclaredColors.named} nomeadas em P e ${meta.runtimeDeclaredColors.inline} literais do runtime), ${proposed} cores propostas e ${aliases} aliases.`,
    `- Variação de altura dos moradores no conceito de temporada: ${br(meta.seasonVillagerHeightSpread * 100, 1)}% (por isso os tamanhos vindos dele têm faixa).`, '');
  return lines.join('\n');
}

function spliceReadme(text, block) {
  const i = text.indexOf(BEGIN), j = text.indexOf(END);
  if (i < 0 || j < i) throw new Error('tokens/README.md sem os marcadores do bloco gerado');
  return text.slice(0, i + BEGIN.length) + '\n' + block + text.slice(j);
}

function main() {
  const check = process.argv.includes('--check');
  const doc = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  const files = render(doc);
  const stale = [];
  for (const [name, text] of Object.entries(files)) {
    const file = path.join(DIST, name);
    if (check) { if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) stale.push(name); }
    else { fs.mkdirSync(DIST, { recursive: true }); fs.writeFileSync(file, text); }
  }
  const current = fs.readFileSync(README, 'utf8'), next = spliceReadme(current, readmeBlock(doc));
  if (check) { if (current !== next) stale.push('README.md'); } else fs.writeFileSync(README, next);
  if (check && stale.length) { console.error(`tokens/dist desatualizado: ${stale.join(', ')}. Rode node tools/tokens/build.cjs`); process.exit(1); }
  console.log(check ? 'tokens/dist em dia' : `tokens/dist: ${Object.keys(files).join(', ')}`);
}

if (require.main === module) main();
module.exports = { validate, render, collect, isAlias, NS, readmeBlock, spliceReadme };
