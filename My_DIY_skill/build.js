const fs = require('fs');
const path = require('path');

const BASE = __dirname;
const OUTPUT = path.join(BASE, 'multi-ai-workflow.html');

// ── Load shared sections ──────────────────────────────
const SECTIONS = JSON.parse(fs.readFileSync(path.join(BASE, 'sections.json'), 'utf8'));
const sectionsJSON = JSON.stringify(SECTIONS);

// ── Scan ──────────────────────────────────────────────
function scan(dir, relative = '') {
    const results = [];
    for (const item of fs.readdirSync(dir).sort()) {
        const full = path.join(dir, item);
        const rel = relative ? relative + '/' + item : item;
        if (fs.statSync(full).isDirectory()) {
            results.push(...scan(full, rel));
        } else if (/\.(md|txt|html)$/i.test(item) && item !== 'multi-ai-workflow.html' && item !== 'index.html' && item !== 'viewer.js' && item !== 'build.js') {
            results.push({ path: rel, name: item, ext: path.extname(item).toLowerCase(), content: fs.readFileSync(full, 'utf8') });
        }
    }
    return results;
}

// ── Escape for JS template literal ────────────────────
function esc(str) {
    return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

// ── Escape for HTML ───────────────────────────────────
function htmlEscape(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Build sidebar tree from sections ──────────────────
function countFiles(items) {
    let n = 0;
    for (const it of items) {
        if (typeof it === 'string') n++;
        else n += countFiles(it.children);
    }
    return n;
}

function renderSectionFiles(items, fileMap, depth) {
    let html = '';
    for (const it of items) {
        if (typeof it === 'string') {
            const f = fileMap[it];
            if (!f) continue;
            const icon = f.ext === '.html' ? '◇' : f.ext === '.txt' ? '▤' : '◆';
            const cls = f.ext === '.html' ? 'icon-html' : f.ext === '.txt' ? 'icon-txt' : 'icon-md';
            html += `<li class="file-item" data-file="${htmlEscape(it)}" style="padding-left:${16 + depth * 14}px">`;
            html += `<span class="file-icon ${cls}">${icon}</span>`;
            html += `<span class="file-name">${htmlEscape(f.name)}</span>`;
            html += '</li>';
        } else {
            html += `<li class="folder subfolder">`;
            html += `<div class="folder-toggle" style="padding-left:${16 + depth * 14}px">`;
            html += `<svg class="folder-arrow" width="14" height="14" viewBox="0 0 14 14"><path d="M5 3l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
            html += `<span class="folder-name">📁 ${htmlEscape(it.name)}</span>`;
            html += '</div>';
            html += `<div class="folder-children"><ul class="tree">`;
            html += renderSectionFiles(it.children, fileMap, depth + 1);
            html += '</ul></div></li>';
        }
    }
    return html;
}

function renderSectionTree(files) {
    const fileMap = {};
    for (const f of files) fileMap[f.path] = f;
    let html = '<ul class="tree">';
    for (const sec of SECTIONS) {
        html += `<li class="folder" data-path="${htmlEscape(sec.id)}">`;
        html += `<div class="folder-toggle">`;
        html += `<svg class="folder-arrow" width="14" height="14" viewBox="0 0 14 14"><path d="M5 3l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
        html += `<span class="folder-name">${sec.icon} ${htmlEscape(sec.name)}</span>`;
        html += `</div>`;
        html += `<div class="folder-children"><ul class="tree">`;
        html += renderSectionFiles(sec.files, fileMap, 1);
        html += `</ul></div></li>`;
    }
    html += '</ul>';
    return html;
}

// ── Main ──────────────────────────────────────────────
console.log('Scanning files...');
const files = scan(BASE);
console.log(`Found ${files.length} files.`);

const treeHTML = renderSectionTree(files);

// Build file content JS object
let fileData = 'const FILE_DATA = {\n';
for (const f of files) {
    fileData += `  "${esc(f.path)}": { ext: "${f.ext}", content: \`${esc(f.content)}\` },\n`;
}
fileData += '};\n';

// Read viewer.js
const viewerJsPath = path.join(BASE, 'viewer.js');
let viewerJs = '';
if (fs.existsSync(viewerJsPath)) {
    viewerJs = fs.readFileSync(viewerJsPath, 'utf8');
    console.log('Loaded viewer.js (' + viewerJs.length + ' chars)');
}

// Build the HTML
const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="author" content="MQTT">
<meta name="copyright" content="Copyright (c) 2026 MQTT. All rights reserved.">
<meta name="creator-contact" content="QQ:3388589706 E-mail:071021mqtt@gmail.com">
<title>multi-ai-workflow v2.1 · 文档中心</title>
<style>
/* ══════════════════════════════════════════════════════
   RESET & BASE
   ══════════════════════════════════════════════════════ */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg-page: #fafbfc;
  --bg-sidebar: #f7f8fa;
  --bg-content: #ffffff;
  --border: #f1f5f9;
  --text-title: #1e293b;
  --text-body: #475569;
  --text-muted: #64748b;
  --text-faint: #94a3b8;
  --accent: #3b82f6;
  --accent-light: #eff6ff;
  --accent-select: #e0f2fe;
  --tag-md: #10b981;
  --tag-md-bg: #ecfdf5;
  --tag-txt: #94a3b8;
  --tag-txt-bg: #f8fafc;
  --tag-html: #3b82f6;
  --tag-html-bg: #eff6ff;
  --shadow-sm: 0 1px 2px rgba(0,0,0,.04);
  --shadow-md: 0 4px 12px rgba(0,0,0,.06);
  --radius: 8px;
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
}

html { font-size: 16px; -webkit-text-size-adjust: 100%; }

body {
  font-family: 'Inter', 'PingFang SC', 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
  background: var(--bg-page);
  color: var(--text-body);
  line-height: 1.7;
  display: flex;
  min-height: 100vh;
}

/* Copyright watermark — visible in dev tools inspection */
body::after {
  content: 'multi-ai-workflow v2.1 by MQTT | QQ:3388589706 | 071021mqtt@gmail.com | Copyright (c) 2026';
  display: none; position: fixed; bottom: 0; left: 0; right: 0;
  font-size: 10px; color: #94a3b8; text-align: center; padding: 4px;
  background: #f8fafc; border-top: 1px solid #e2e8f0; z-index: 9999;
  pointer-events: none;
}
@media print { body::after { display: block; } }

a { color: var(--accent); text-decoration: none; transition: color 150ms var(--ease); }
a:hover { text-decoration: underline; }

/* ══════════════════════════════════════════════════════
   SIDEBAR
   ══════════════════════════════════════════════════════ */
.sidebar {
  width: 280px;
  min-width: 280px;
  height: 100vh;
  position: sticky;
  top: 0;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  z-index: 100;
  transition: transform 250ms var(--ease);
}

.sidebar-header {
  padding: 24px 20px 16px;
  border-bottom: 1px solid var(--border);
}

.sidebar-header h1 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-title);
  letter-spacing: -0.01em;
}

.sidebar-header .version {
  font-size: 0.75rem;
  color: var(--text-faint);
  font-weight: 400;
  margin-top: 2px;
}

.search-wrap {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  position: relative;
}

.search-input {
  width: 100%;
  padding: 8px 12px 8px 32px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.82rem;
  font-family: inherit;
  color: var(--text-body);
  background: var(--bg-content);
  transition: border-color 200ms var(--ease), box-shadow 200ms var(--ease);
  outline: none;
}

.search-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(59,130,246,.12);
}

.search-input::placeholder { color: var(--text-faint); }

.search-clear {
  position: absolute; right: 24px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer; padding: 2px 6px;
  font-size: 1rem; color: var(--text-faint); border-radius: 3px;
  opacity: 0; pointer-events: none; transition: opacity 150ms var(--ease);
  line-height: 1;
}

.search-clear.visible { opacity: 1; pointer-events: auto; }
.search-clear:hover { color: var(--text-body); background: var(--border); }

.search-icon {
  position: absolute;
  left: 28px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-faint);
  pointer-events: none;
}

.tree-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  scroll-behavior: smooth;
}

.tree-container::-webkit-scrollbar { width: 4px; }
.tree-container::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
.tree-container::-webkit-scrollbar-track { background: transparent; }

/* ── Tree ─────────────────────────────────────────── */
ul.tree { list-style: none; }

.folder-toggle, .file-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background 150ms var(--ease), transform 150ms var(--ease);
  user-select: none;
  font-size: 0.82rem;
  border-left: 3px solid transparent;
}

.folder-toggle:hover, .file-item:hover {
  background: var(--accent-light);
}

.file-item:hover { transform: translateX(2px); }

.file-item.active {
  background: var(--accent-select);
  border-left-color: var(--accent);
  font-weight: 500;
  color: var(--text-title);
}

.folder-arrow {
  transition: transform 200ms var(--ease);
  flex-shrink: 0;
  color: var(--text-faint);
}

.folder.open > .folder-toggle .folder-arrow { transform: rotate(90deg); }
.folder:not(.open) > .folder-children { display: none; }

.folder-name {
  color: var(--text-title);
  font-weight: 500;
  font-size: 0.83rem;
}

.subfolder .folder-name {
  font-size: 0.78rem; color: var(--text-body); font-weight: 500;
}

.file-icon { font-size: 0.75rem; flex-shrink: 0; }
.icon-md { color: var(--tag-md); }
.icon-txt { color: var(--tag-txt); }
.icon-html { color: var(--tag-html); }

.file-name { color: var(--text-body); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.file-item.hidden { display: none; }
.folder.hidden-all { display: none; }

/* ══════════════════════════════════════════════════════
   MAIN CONTENT
   ══════════════════════════════════════════════════════ */
.main {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 40px 32px 80px;
  min-width: 0;
}

.content-wrapper {
  width: 100%;
  max-width: 780px;
}

.content-area {
  background: var(--bg-content);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  padding: 40px 44px;
  min-height: 60vh;
  transition: opacity 100ms var(--ease);
}

.content-area.switching { opacity: 0; }

/* ── Welcome page ─────────────────────────────────── */
.welcome { text-align: center; padding: 60px 20px; }
.welcome-icon { font-size: 3rem; margin-bottom: 16px; }
.welcome h2 { font-size: 1.4rem; color: var(--text-title); font-weight: 600; margin-bottom: 8px; }
.welcome p { color: var(--text-muted); font-size: 0.9rem; max-width: 400px; margin: 0 auto 16px; }
.welcome .file-count {
  display: inline-block;
  padding: 4px 12px;
  background: var(--accent-light);
  color: var(--accent);
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
}

/* ══════════════════════════════════════════════════════
   MARKDOWN RENDERED CONTENT
   ══════════════════════════════════════════════════════ */
.markdown-body { animation: fadeSlideIn 250ms var(--ease); }

@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4 {
  color: var(--text-title);
  font-weight: 600;
  line-height: 1.35;
  margin-top: 1.6em;
  margin-bottom: 0.5em;
}

.markdown-body h1 { font-size: 1.55rem; border-bottom: 2px solid var(--border); padding-bottom: 10px; margin-top: 0; }
.markdown-body h2 { font-size: 1.25rem; }
.markdown-body h3 { font-size: 1.05rem; }
.markdown-body h4 { font-size: 0.95rem; color: var(--text-body); }

.markdown-body p { margin-bottom: 0.9em; }
.markdown-body strong { color: var(--text-title); font-weight: 600; }

.markdown-body ul, .markdown-body ol { padding-left: 1.5em; margin-bottom: 0.9em; }
.markdown-body li { margin-bottom: 0.25em; }

.markdown-body blockquote {
  border-left: 3px solid var(--accent);
  padding: 8px 16px;
  margin: 1em 0;
  background: var(--accent-light);
  border-radius: 0 6px 6px 0;
  color: var(--text-muted);
}

.markdown-body table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.2em 0;
  font-size: 0.88rem;
}

.markdown-body th {
  background: var(--bg-sidebar);
  color: var(--text-title);
  font-weight: 600;
  padding: 9px 14px;
  text-align: left;
  border: 1px solid var(--border);
}

.markdown-body td {
  padding: 8px 14px;
  border: 1px solid var(--border);
  color: var(--text-body);
}

.markdown-body tr:hover td { background: #fafcff; }

.markdown-body code {
  font-family: 'JetBrains Mono', 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
  font-size: 0.83em;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  color: #1e293b;
}

.markdown-body pre {
  background: #f8fafc;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px 20px;
  overflow-x: auto;
  margin: 1em 0;
  position: relative;
  transition: box-shadow 150ms var(--ease);
}

.markdown-body pre:hover { box-shadow: var(--shadow-md); }

.markdown-body pre code {
  background: none;
  padding: 0;
  font-size: 0.8rem;
  color: var(--text-body);
  line-height: 1.6;
}

.markdown-body pre::-webkit-scrollbar { height: 5px; }
.markdown-body pre::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

.markdown-body hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 2em 0;
}

.markdown-body img { max-width: 100%; border-radius: 6px; }

/* ── Copy button on code blocks ── */
.copy-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 10px;
  font-size: 0.7rem;
  background: var(--bg-content);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-muted);
  cursor: pointer;
  opacity: 0;
  transition: opacity 150ms var(--ease), background 150ms var(--ease);
}

.markdown-body pre:hover .copy-btn { opacity: 1; }
.copy-btn:hover { background: var(--accent-light); color: var(--accent); }

.code-lang {
  position: absolute; top: 6px; left: 14px;
  font-size: 0.68rem; color: var(--text-faint);
}

/* ══════════════════════════════════════════════════════
   TXT CONTENT (monospace pre)
   ══════════════════════════════════════════════════════ */
.txt-content {
  font-family: 'JetBrains Mono', 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
  font-size: 0.82rem;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--text-body);
  background: #fafbfc;
  padding: 24px 28px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  animation: fadeSlideIn 250ms var(--ease);
}

/* ══════════════════════════════════════════════════════
   MERMAID CONTAINER
   ══════════════════════════════════════════════════════ */
.mermaid-block {
  background: #fafcfe;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  margin: 1em 0;
  text-align: center;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.mermaid-block svg {
  max-width: 100%; height: auto;
}

.mermaid-loading {
  font-size: 0.8rem; color: var(--text-faint); text-align: center;
  padding: 16px;
}

.mermaid-fallback {
  font-family: 'JetBrains Mono', 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
  font-size: 0.8rem;
  text-align: left;
  white-space: pre-wrap;
  color: var(--text-muted);
  background: #f8fafc;
  padding: 16px;
  border-radius: 6px;
}

/* ══════════════════════════════════════════════════════
   BACK TO TOP
   ══════════════════════════════════════════════════════ */
.back-to-top {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-content);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 250ms var(--ease), transform 250ms var(--ease), box-shadow 150ms var(--ease);
  pointer-events: none;
  z-index: 200;
}

.back-to-top.visible { opacity: 1; transform: translateY(0); pointer-events: auto; }
.back-to-top:hover { box-shadow: var(--shadow-md); }
.back-to-top svg { color: var(--text-muted); }

/* ══════════════════════════════════════════════════════
   HAMBURGER (mobile)
   ══════════════════════════════════════════════════════ */
.hamburger {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 52px;
  background: var(--bg-content);
  border-bottom: 1px solid var(--border);
  z-index: 300;
  align-items: center;
  padding: 0 16px;
  gap: 10px;
}

.hamburger button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  color: var(--text-title);
  display: flex;
  align-items: center;
}

.hamburger-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-title);
}

/* Overlay */
.overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.2);
  z-index: 90;
  transition: opacity 250ms var(--ease);
}

/* ══════════════════════════════════════════════════════
   RESPONSIVE
   ══════════════════════════════════════════════════════ */
@media (max-width: 768px) {
  body { display: block; padding-top: 52px; }

  .hamburger { display: flex; }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh; height: 100dvh;
    width: 280px;
    transform: translateX(-100%);
    box-shadow: var(--shadow-md);
    padding-top: 52px;
    padding-bottom: env(safe-area-inset-bottom, 16px);
  }

  .sidebar.open { transform: translateX(0); }
  .overlay.open { display: block; }

  .main { padding: 16px 12px 48px; }

  .content-area { padding: 20px 16px; border-radius: 6px; }

  .markdown-body h1 { font-size: 1.3rem; }
  .markdown-body h2 { font-size: 1.1rem; }
  .markdown-body table { font-size: 0.78rem; }
  .markdown-body th, .markdown-body td { padding: 6px 8px; }

  .markdown-body pre { padding: 12px 14px; }

  .txt-content {
    font-size: 0.72rem; padding: 14px 16px;
    white-space: pre; overflow-x: auto; word-break: normal;
  }

  .back-to-top { bottom: 16px; right: 16px; width: 36px; height: 36px; }
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
  .sidebar { width: 240px; min-width: 240px; }
  .main { padding: 32px 20px 64px; }
}

/* ══════════════════════════════════════════════════════
   HOME PAGE
   ══════════════════════════════════════════════════════ */
.home-page { animation: fadeSlideIn 250ms var(--ease); }

/* ── Hero ─────────────────────────────────────────── */
.hero { text-align: center; padding: 20px 0 10px; }

.hero-title {
  font-size: 2rem; font-weight: 700; color: var(--text-title);
  letter-spacing: -0.02em; margin-bottom: 4px;
}

.hero-version {
  display: inline-block; font-size: 0.85rem; font-weight: 500;
  background: var(--accent-light); color: var(--accent);
  padding: 2px 10px; border-radius: 12px; vertical-align: middle;
  margin-left: 6px;
}

.hero-subtitle {
  font-size: 1.05rem; color: var(--text-body); font-weight: 500;
  margin-bottom: 6px;
}

.hero-tagline {
  font-size: 0.88rem; color: var(--text-muted); margin-bottom: 20px;
}

.hero-background {
  max-width: 620px; margin: 0 auto 20px;
  padding: 16px 22px; background: var(--accent-light);
  border-radius: 8px; border-left: 3px solid var(--accent);
  text-align: left;
}

.hero-background {
  cursor: pointer; transition: border-color 150ms var(--ease), box-shadow 150ms var(--ease);
}
.hero-background:hover { border-color: var(--accent); box-shadow: var(--shadow-sm); }

.hero-background-title {
  font-size: 0.78rem; font-weight: 600; color: var(--accent);
  margin-bottom: 6px; letter-spacing: 0.02em;
}

.hero-background p {
  font-size: 0.84rem; color: var(--text-body); line-height: 1.7; margin: 0;
}

.hero-background-hint {
  display: block; font-size: 0.72rem; color: var(--accent);
  margin-top: 8px; opacity: 0; transition: opacity 150ms var(--ease);
}

.hero-background:hover .hero-background-hint { opacity: 1; }

.hero-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 8px; }

.hero-btn {
  padding: 9px 22px; border-radius: 6px; font-size: 0.85rem;
  font-family: inherit; cursor: pointer; border: 1px solid var(--border);
  background: var(--bg-content); color: var(--text-body);
  transition: all 150ms var(--ease);
}

.hero-btn:hover { border-color: var(--accent); color: var(--accent); }

.hero-btn.primary {
  background: var(--accent); color: #fff; border-color: var(--accent);
}

.hero-btn.primary:hover { background: #2563eb; }

/* ── Features grid ─────────────────────────────────── */
.features { padding: 16px 0; }

.section-title {
  font-size: 1.05rem; font-weight: 600; color: var(--text-title);
  margin-bottom: 14px; text-align: center;
}

.feature-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
}

.feature-card {
  background: var(--bg-content); border: 1px solid var(--border);
  border-radius: 8px; padding: 14px 12px; text-align: center;
  transition: box-shadow 150ms var(--ease), transform 150ms var(--ease);
  cursor: pointer;
}

.feature-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); border-color: var(--accent); }

.feature-icon { font-size: 1.3rem; display: block; margin-bottom: 6px; }

.feature-name {
  display: block; font-size: 0.82rem; font-weight: 600;
  color: var(--text-title); margin-bottom: 3px;
}

.feature-desc {
  display: block; font-size: 0.73rem; color: var(--text-muted); line-height: 1.4;
}

.feature-hint {
  display: block; font-size: 0.68rem; color: var(--accent);
  margin-top: 6px; opacity: 0; transition: opacity 150ms var(--ease);
}

.feature-card:hover .feature-hint { opacity: 1; }

/* ── Document sections ─────────────────────────────── */
.doc-sections { padding: 16px 0 10px; }

.section-card {
  background: var(--bg-content); border: 1px solid var(--border);
  border-radius: 8px; margin-bottom: 8px;
  transition: box-shadow 150ms var(--ease);
  overflow: hidden;
}

.section-card:hover { box-shadow: var(--shadow-sm); }

.section-header {
  display: flex; align-items: center; padding: 14px 18px;
  cursor: pointer; user-select: none; gap: 10px;
  transition: background 150ms var(--ease);
}

.section-header:hover { background: #fafcfe; }

.section-header-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }

.section-icon { font-size: 1.3rem; flex-shrink: 0; }

.section-info { display: flex; flex-direction: column; min-width: 0; }

.section-name { font-size: 0.9rem; font-weight: 600; color: var(--text-title); }

.section-desc { font-size: 0.78rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.section-badge {
  font-size: 0.75rem; color: var(--text-faint); background: var(--bg-sidebar);
  padding: 3px 10px; border-radius: 12px; flex-shrink: 0;
}

.section-arrow {
  flex-shrink: 0; color: var(--text-faint);
  transition: transform 200ms var(--ease);
}

.section-card.open .section-arrow { transform: rotate(90deg); }

.section-files { display: none; border-top: 1px solid var(--border); }

.section-card.open .section-files { display: block; }

.section-file {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 18px 9px 46px; cursor: pointer;
  transition: background 150ms var(--ease), transform 150ms var(--ease);
  font-size: 0.83rem; color: var(--text-body);
}

.section-file:hover { background: var(--accent-light); transform: translateX(3px); }

.section-folder { }
.section-folder-name {
  font-size: 0.78rem; color: var(--text-title); font-weight: 500;
  padding: 6px 18px; opacity: 0.8;
}

/* ══════════════════════════════════════════════════════
   FEATURE DETAIL MODAL
   ══════════════════════════════════════════════════════ */
.feature-modal {
  display: none; position: fixed; inset: 0;
  background: rgba(0,0,0,.3); z-index: 500;
  align-items: center; justify-content: center;
  animation: fadeIn 200ms var(--ease);
}
.feature-modal.open { display: flex; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.feature-modal-content {
  background: var(--bg-content); border-radius: 12px;
  max-width: 600px; width: 90%; max-height: 80vh;
  overflow-y: auto; padding: 32px 36px;
  position: relative; box-shadow: 0 8px 32px rgba(0,0,0,.12);
  animation: slideUp 250ms var(--ease);
}

@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

.feature-modal-close {
  position: absolute; top: 12px; right: 12px;
  background: none; border: none; cursor: pointer;
  color: var(--text-faint); padding: 4px; border-radius: 4px;
  transition: color 150ms var(--ease), background 150ms var(--ease);
}
.feature-modal-close:hover { color: var(--text-body); background: var(--bg-sidebar); }

.feature-modal-title {
  font-size: 1.2rem; font-weight: 600; color: var(--text-title);
  margin-bottom: 20px; display: flex; align-items: center; gap: 8px;
}

.feature-modal-body p {
  font-size: 0.88rem; color: var(--text-body); line-height: 1.75;
  margin-bottom: 12px;
}

.section-file .file-icon { font-size: 0.75rem; flex-shrink: 0; }

.section-file-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── Sidebar header ── */
.sidebar-header { position: relative; }
.sidebar-title { padding: 4px 8px; margin: -4px -8px; }

/* ── Sidebar collapse toggle ── */
.collapse-btn {
  position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer; padding: 6px;
  color: var(--text-faint); border-radius: 4px;
  transition: color 150ms var(--ease), background 150ms var(--ease);
  display: flex; align-items: center;
}

.collapse-btn:hover { color: var(--text-body); background: var(--border); }

/* Collapsed sidebar state */
.sidebar.collapsed {
  width: 52px; min-width: 52px;
  overflow: hidden;
}

.sidebar.collapsed .sidebar-header { padding: 16px 8px; text-align: center; }
.sidebar.collapsed .sidebar-header h1 { font-size: 0.7rem; }
.sidebar.collapsed .sidebar-title,
.sidebar.collapsed .version,
.sidebar.collapsed .search-wrap,
.sidebar.collapsed .folder-name,
.sidebar.collapsed .file-name,
.sidebar.collapsed .folder-arrow,
.sidebar.collapsed .section-badge { display: none !important; }

.sidebar.collapsed .tree-container { overflow: hidden; }
.sidebar.collapsed .tree { padding: 4px 0; }
.sidebar.collapsed .folder-toggle,
.sidebar.collapsed .file-item { padding: 8px !important; justify-content: center; }
.sidebar.collapsed .folder-children { display: none !important; }
.sidebar.collapsed .collapse-btn svg { transform: rotate(180deg); }
.sidebar.collapsed .tree-container::-webkit-scrollbar { width: 0; }
.sidebar { transition: width 300ms var(--ease), min-width 300ms var(--ease); }

/* ── Sidebar footer ── */
.sidebar-footer {
  padding: 12px 14px; border-top: 1px solid var(--border);
  text-align: center; line-height: 1.6;
  padding-bottom: calc(14px + env(safe-area-inset-bottom, 20px));
}
.footer-brand {
  font-size: 0.75rem; color: var(--text-muted); font-weight: 500;
  letter-spacing: 0.03em; margin-bottom: 6px;
}
.footer-text {
  font-size: 0.68rem; color: var(--text-faint);
  margin-bottom: 2px;
}
.footer-contact {
  margin-top: 6px; display: flex; flex-direction: column; gap: 1px;
}
.footer-contact span {
  font-size: 0.68rem; color: var(--text-faint);
}
.sidebar.collapsed .sidebar-footer { display: none; }

/* ── Embedded iframe (全景图 etc) ── */
.html-embed {
  margin: -40px -44px;
}

.html-embed-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 44px; border-bottom: 1px solid var(--border);
  background: var(--bg-sidebar);
}

.html-embed-title {
  font-size: 0.9rem; font-weight: 600; color: var(--text-title);
}

.html-embed-hint {
  font-size: 0.72rem; color: var(--text-faint);
}

.embed-iframe {
  width: 100%; height: calc(100vh - 120px); min-height: 500px;
  border: none; display: block;
}

@media (max-width: 768px) {
  .html-embed { margin: -16px -12px; }
  .html-embed-header { padding: 8px 16px; }
  .html-embed-title { font-size: 0.82rem; }
  .embed-iframe { height: calc(100vh - 100px); min-height: 400px; }
}

/* ── Persistent nav bar ── */
.nav-bar {
  opacity: 0; visibility: hidden; align-items: center; gap: 8px;
  padding: 0 0 14px 0; transition: opacity 200ms var(--ease);
}
.nav-bar.visible { opacity: 1; visibility: visible; display: flex; }
.nav-btn {
  display: inline-block; padding: 5px 14px;
  font-size: 0.8rem; border-radius: 5px;
  color: var(--text-muted); background: var(--bg-sidebar);
  border: 1px solid var(--border);
  transition: all 150ms var(--ease);
  cursor: pointer; user-select: none;
}
.nav-btn:hover { background: var(--accent-light); color: var(--accent); border-color: var(--accent); }
.nav-btn.nav-back { font-weight: 500; }

@media (max-width: 768px) {
  .collapse-btn { display: none; }
  .sidebar.collapsed { width: 280px; min-width: 280px; }
  .sidebar.collapsed .folder-name { display: inline; }
  .sidebar.collapsed .file-name { display: inline; }
  .sidebar.collapsed .search-wrap { display: block; }
  .sidebar.collapsed .sidebar-header .version { display: block; }
  .sidebar.collapsed .folder-arrow { display: block; }
  .nav-bar.visible { padding: 0 0 10px 0; }
}

/* ── Mobile home page ── */
@media (max-width: 768px) {
  .hero { padding: 8px 0; }
  .hero-title { font-size: 1.4rem; }
  .hero-version { font-size: 0.75rem; padding: 2px 8px; }
  .hero-subtitle { font-size: 0.9rem; }
  .hero-tagline { font-size: 0.8rem; }
  .hero-background { padding: 12px 14px; }
  .hero-background p { font-size: 0.78rem; }
  .hero-btn { padding: 8px 16px; font-size: 0.8rem; }

  .feature-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .feature-card { padding: 10px 8px; }
  .feature-icon { font-size: 1.1rem; }
  .feature-name { font-size: 0.76rem; }
  .feature-desc { font-size: 0.7rem; }

  .section-title { font-size: 0.95rem; }
  .section-header { padding: 12px 14px; }
  .section-icon { font-size: 1.1rem; }
  .section-name { font-size: 0.84rem; }
  .section-desc { font-size: 0.73rem; }
  .section-badge { font-size: 0.7rem; padding: 2px 8px; }
  .section-file { padding: 8px 14px 8px 36px; font-size: 0.78rem; }
}
</style>
</head>
<body data-creator="MQTT" data-project="multi-ai-workflow" data-version="v2.1">
<!--
  ╔══════════════════════════════════════════════════════════╗
  ║  multi-ai-workflow v2.1                                  ║
  ║  Author: MQTT                                            ║
  ║  Copyright (c) 2026 MQTT. All rights reserved.          ║
  ║  QQ: 3388589706  E-mail: 071021mqtt@gmail.com            ║
  ║                                                          ║
  ║  This work is protected by copyright law.                ║
  ║  Unauthorized reproduction, distribution, or use of      ║
  ║  this work, in whole or in part, is strictly prohibited. ║
  ║  If you use this workflow in your project, please        ║
  ║  provide feedback to the creator.                        ║
  ╚══════════════════════════════════════════════════════════╝
-->

<div class="hamburger">
  <button id="menuBtn" aria-label="菜单">
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M3 6h16M3 11h16M3 16h16"/>
    </svg>
  </button>
  <span class="hamburger-title">文档中心</span>
</div>

<div class="overlay" id="overlay"></div>

<aside class="sidebar" id="sidebar">
  <div class="sidebar-header">
    <div class="sidebar-title">
      <h1>multi-ai-workflow</h1>
      <div class="version">v2.1 · 文档中心</div>
    </div>
    <button class="collapse-btn" id="collapseBtn" title="折叠侧边栏">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M10 3L5 8l5 5"/>
      </svg>
    </button>
  </div>
  <div class="search-wrap">
    <svg class="search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
      <circle cx="6" cy="6" r="4.5"/><path d="M9.5 9.5L13 13"/>
    </svg>
    <input type="text" class="search-input" id="searchInput" placeholder="搜索文档... (按 / 聚焦)">
    <button class="search-clear" id="searchClear" title="清除搜索">×</button>
  </div>
  <nav class="tree-container" id="treeContainer">
    ${treeHTML}
  </nav>
  <div class="sidebar-footer">
    <div class="footer-brand">Created by MQTT</div>
    <div class="footer-text">如需"multi-ai-workflow"工作流 Skill 源文件请 Q</div>
    <div class="footer-text">如果你在实际项目推进过程中完整/部分使用了该工作流，希望得到你的反馈及指导意见</div>
    <div class="footer-contact">
      <span>QQ：3388589706</span>
      <span>E-mail：071021mqtt@gmail.com</span>
    </div>
  </div>
</aside>

<main class="main" id="main">
  <div class="content-wrapper">
    <div class="nav-bar" id="navBar">
      <span class="nav-btn nav-back" onclick="goBack()">← 返回</span>
      <span class="nav-btn" onclick="renderHome()">⌂ 首页</span>
    </div>
    <div class="content-area" id="contentArea">
      <div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
        <p>加载中...</p>
      </div>
    </div>
  </div>
</main>

<button class="back-to-top" id="backToTop" aria-label="回到顶部">
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M9 15V3M4 8l5-5 5 5"/>
  </svg>
</button>

<!-- marked.js CDN -->
<script src="https://cdn.jsdelivr.net/npm/marked@11/marked.min.js"
  onerror="console.warn('marked.js CDN failed, using offline fallback')"></script>

<script>
${fileData}
</script>

<script>const SECTIONS = ${sectionsJSON};</script>

<script>
${viewerJs}
</script>

<!-- Feature Detail Modal -->
<div class="feature-modal" id="featureModal">
  <div class="feature-modal-content">
    <button class="feature-modal-close" onclick="closeFeatureModal()">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 5l10 10M15 5L5 15"/></svg>
    </button>
    <h2 class="feature-modal-title" id="featureModalTitle"></h2>
    <div class="feature-modal-body" id="featureModalBody"></div>
  </div>
</div>

</body>
</html>`;

fs.writeFileSync(OUTPUT, html, 'utf8');
console.log(`Generated multi-ai-workflow.html (${(fs.statSync(OUTPUT).size / 1024).toFixed(0)} KB)`);
