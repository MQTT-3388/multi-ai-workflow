// ══════════════════════════════════════════════════════
// APP STATE
// ══════════════════════════════════════════════════════
var state = {
  currentFile: null,
  sidebarOpen: false,
  sidebarCollapsed: false,
  sidebarPinned: false,
  currentSection: null,
  navHistory: []
};

// ══════════════════════════════════════════════════════
// CSS Escape polyfill (for attribute selectors)
// ══════════════════════════════════════════════════════
function cssEscape(str) {
  return str.replace(/[^\w一-鿿㐀-䶿-]/g, function(ch) {
    return '\\' + ch.charCodeAt(0).toString(16).padStart(6, '0') + ' ';
  });
}

// ══════════════════════════════════════════════════════
// RENDER
// ══════════════════════════════════════════════════════
function renderFile(filePath, addToHistory) {
  var data = FILE_DATA[filePath];
  if (!data) { console.warn('File not found:', filePath); return; }

  if (addToHistory !== false) {
    state.navHistory.push({ type: 'file', path: filePath });
    if (state.navHistory.length > 50) state.navHistory.shift();
  }

  // Fix #3: set currentFile immediately, not inside setTimeout
  state.currentFile = filePath;

  // Fix #7: update mobile title
  updateMobileTitle(filePath);

  var area = document.getElementById('contentArea');
  area.classList.add('switching');

  setTimeout(function() {
    var html = '';

    updateNavBar();
    autoCollapseSidebar(true);

    if (data.ext === '.html') {
      // Modify embedded HTML for mobile: add user-scalable and fix container
      var embedContent = data.content;
      embedContent = embedContent.replace(
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes">'
      );
      html = '<div class="html-embed">';
      html += '<div class="html-embed-header">';
      html += '<span class="html-embed-title">' + esc(getFileName(filePath)) + '</span>';
      html += '<span class="html-embed-hint">可双指缩放</span>';
      html += '</div>';
      html += '<iframe srcdoc="' + escAttr(embedContent) + '" class="embed-iframe" sandbox="allow-scripts allow-same-origin" scrolling="yes"></iframe>';
      html += '</div>';
    } else if (data.ext === '.txt') {
      html = '<pre class="txt-content">' + esc(data.content) + '</pre>';
    } else {
      var rawContent = stripFrontmatter(data.content);
      // Fix #2: use div placeholder instead of HTML comment
      var mermaidBlocks = [];
      var processed = rawContent.replace(/```mermaid\s*([\s\S]*?)```/g, function(_, code) {
        var id = mermaidBlocks.length;
        mermaidBlocks.push(code.trim());
        return '<div data-mermaid="' + id + '"></div>';
      });
      var rendered = '';
      try {
        if (typeof marked !== 'undefined' && marked.parse) {
          rendered = marked.parse(processed);
        } else {
          rendered = basicRender(processed);
        }
      } catch(e) {
        rendered = basicRender(processed);
      }
      for (var mi = 0; mi < mermaidBlocks.length; mi++) {
        rendered = rendered.replace('<div data-mermaid="' + mi + '"></div>',
          '<div class="mermaid">' + mermaidBlocks[mi] + '</div>');
      }
      html = '<div class="markdown-body">' + rendered + '</div>';
    }

    area.innerHTML = html;
    area.classList.remove('switching');

    addCopyButtons();
    renderMermaid();

    document.getElementById('main').scrollTop = 0;
    window.scrollTo(0, 0);

    // Fix #1: update sidebar highlight after rendering
    updateSidebarHighlight(filePath);
  }, 120);
}

// ── Fix #1: sidebar highlight helper ──
function updateSidebarHighlight(filePath) {
  var items = document.querySelectorAll('.file-item');
  for (var i = 0; i < items.length; i++) items[i].classList.remove('active');
  if (filePath) {
    var el = document.querySelector('[data-file="' + cssEscape(filePath) + '"]');
    if (el) { el.classList.add('active'); }
  }
}

// ── Fix #7: update mobile hamburger title ──
function updateMobileTitle(filePath) {
  var title = document.querySelector('.hamburger-title');
  if (title && filePath) {
    title.textContent = getFileName(filePath);
  } else if (title) {
    title.textContent = '文档中心';
  }
}

// ── Strip YAML frontmatter ──
function stripFrontmatter(text) {
  if (text.indexOf('---') === 0) {
    var idx = text.indexOf('---', 3);
    if (idx !== -1) return text.slice(idx + 3).trim();
  }
  return text;
}

// ── Basic markdown renderer (offline fallback) ──
function basicRender(text) {
  var lines = text.split('\n');
  var html = '';
  var inCode = false, codeBuf = '', codeLang = '';
  var inTable = false, tableRows = [];
  // Fix #4: separate flags for ul and ol
  var inUl = false, inOl = false;

  function closeLists() {
    if (inUl) { html += '</ul>'; inUl = false; }
    if (inOl) { html += '</ol>'; inOl = false; }
  }

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];

    if (line.indexOf('```') === 0) {
      if (inCode) {
        html += renderCodeBlock(codeBuf, codeLang);
        codeBuf = ''; codeLang = ''; inCode = false;
      } else {
        inCode = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCode) { codeBuf += (codeBuf ? '\n' : '') + line; continue; }

    if (line.trim() === '') {
      closeLists();
      if (inTable) { html += renderTable(tableRows); inTable = false; tableRows = []; }
      continue;
    }

    // Table: separator line
    if (/^\|[\s\-:|]+\|$/.test(line)) continue;

    // Table: data row
    if (line.indexOf('|') !== -1 && line.trim().charAt(0) === '|') {
      if (!inTable) { closeLists(); inTable = true; tableRows = []; }
      tableRows.push(parseTableRow(line));
      continue;
    } else if (inTable) {
      html += renderTable(tableRows);
      inTable = false; tableRows = [];
    }

    var hMatch;
    if ((hMatch = line.match(/^(#{1,4})\s+(.+)$/))) {
      closeLists();
      var level = hMatch[1].length;
      html += '<h' + level + '>' + inlineFormat(hMatch[2]) + '</h' + level + '>';
      continue;
    }

    if (/^-{3,}$/.test(line)) { closeLists(); html += '<hr>'; continue; }

    if (line.indexOf('> ') === 0) {
      closeLists();
      html += '<blockquote>' + inlineFormat(line.slice(2)) + '</blockquote>';
      continue;
    }

    var ulMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (ulMatch) {
      if (inOl) { html += '</ol>'; inOl = false; }
      if (!inUl) { html += '<ul>'; inUl = true; }
      html += '<li>' + inlineFormat(ulMatch[2]) + '</li>';
      continue;
    }

    var olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (olMatch) {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (!inOl) { html += '<ol>'; inOl = true; }
      html += '<li>' + inlineFormat(olMatch[2]) + '</li>';
      continue;
    }

    closeLists();
    html += '<p>' + inlineFormat(line) + '</p>';
  }

  closeLists();
  if (inCode) html += renderCodeBlock(codeBuf, codeLang);
  if (inTable) html += renderTable(tableRows);

  return html;
}

function parseTableRow(line) {
  return line.split('|').filter(function(c) { return c.trim(); }).map(function(c) { return c.trim(); });
}

function renderTable(rows) {
  if (rows.length === 0) return '';
  var h = '<table><thead><tr>';
  for (var j = 0; j < rows[0].length; j++) {
    h += '<th>' + inlineFormat(rows[0][j]) + '</th>';
  }
  h += '</tr></thead><tbody>';
  for (var i = 1; i < rows.length; i++) {
    h += '<tr>';
    for (var j = 0; j < rows[i].length; j++) {
      h += '<td>' + inlineFormat(rows[i][j]) + '</td>';
    }
    h += '</tr>';
  }
  h += '</tbody></table>';
  return h;
}

function renderCodeBlock(code, lang) {
  var langTag = lang ? '<span class="code-lang">' + esc(lang) + '</span>' : '';
  return '<pre>' + langTag + '<code>' + esc(code) + '</code></pre>';
}

function inlineFormat(text) {
  var t = esc(text);
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
  t = t.replace(/`(.+?)`/g, '<code>$1</code>');
  t = t.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
  return t;
}

// ── Mermaid handling ──
function renderMermaid() {
  var blocks = document.querySelectorAll('.mermaid');
  if (blocks.length === 0) return;

  if (typeof mermaid !== 'undefined') {
    try { mermaid.run({ nodes: blocks }); } catch(e) {}
  } else {
    // Show loading state
    for (var i = 0; i < blocks.length; i++) {
      blocks[i].innerHTML = '<div class="mermaid-loading">⏳ 图表加载中...</div>' + blocks[i].innerHTML;
    }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
    s.onload = function() {
      // Clear loading indicators
      var loaders = document.querySelectorAll('.mermaid-loading');
      for (var li = 0; li < loaders.length; li++) loaders[li].remove();
      mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
      try { mermaid.run({ nodes: document.querySelectorAll('.mermaid') }); } catch(e) {}
    };
    s.onerror = function() {
      for (var i = 0; i < blocks.length; i++) {
        blocks[i].innerHTML = '<div class="mermaid-fallback">[Mermaid 图表 - 需联网加载]</div><pre>' + esc(blocks[i].textContent) + '</pre>';
      }
    };
    document.head.appendChild(s);
  }
}

// ── Copy buttons ──
function addCopyButtons() {
  var pres = document.querySelectorAll('.markdown-body pre');
  for (var i = 0; i < pres.length; i++) {
    var pre = pres[i];
    if (pre.querySelector('.copy-btn')) continue;
    var btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = '复制';
    btn.onclick = (function(p) { return function() {
      var code = p.querySelector('code');
      var text = code ? code.textContent : p.textContent;
      navigator.clipboard.writeText(text).then(function() {
        btn.textContent = '已复制';
        setTimeout(function() { btn.textContent = '复制'; }, 1500);
      });
    }; })(pre);
    pre.style.position = 'relative';
    pre.appendChild(btn);
  }
}

// ── Helpers ──
// ══════════════════════════════════════════════════════
// Copyright assertion — do not remove
// Removing or modifying this function will break rendering
// ══════════════════════════════════════════════════════
var _MWF_AUTHOR = 'MQTT';
var _MWF_COPYRIGHT = 'Copyright (c) 2026 MQTT. All rights reserved.';
var _MWF_CONTACT = 'QQ:3388589706 E-mail:071021mqtt@gmail.com';

function esc(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getFileName(filePath) {
  var parts = filePath.split('/');
  return parts[parts.length - 1];
}

// ══════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════
function selectFile(filePath) {
  updateSidebarHighlight(filePath);
  renderFile(filePath);
  if (window.innerWidth <= 768) closeSidebar();
}

document.getElementById('treeContainer').addEventListener('click', function(e) {
  var fileItem = e.target.closest('.file-item');
  var folderToggle = e.target.closest('.folder-toggle');

  if (fileItem) {
    var filePath = fileItem.getAttribute('data-file');
    if (filePath) selectFile(filePath);
  }

  if (folderToggle) {
    var folder = folderToggle.parentElement;
    folder.classList.toggle('open');
  }
});

// ══════════════════════════════════════════════════════
// SEARCH (Fix #6: content search)
// ══════════════════════════════════════════════════════
var searchInput = document.getElementById('searchInput');
var searchClear = document.getElementById('searchClear');

searchInput.addEventListener('input', function() {
  var query = searchInput.value.toLowerCase().trim();
  var fileItems = document.querySelectorAll('.file-item');
  var folders = document.querySelectorAll('.folder');

  // Toggle clear button
  if (searchClear) searchClear.classList.toggle('visible', query.length > 0);

  if (!query) {
    for (var i = 0; i < fileItems.length; i++) fileItems[i].classList.remove('hidden');
    for (var i = 0; i < folders.length; i++) {
      folders[i].classList.remove('hidden-all');
      folders[i].classList.remove('open');
    }
    return;
  }

  // Search file names and content
  for (var i = 0; i < fileItems.length; i++) {
    var item = fileItems[i];
    var filePath = item.getAttribute('data-file');
    var fileName = (item.querySelector('.file-name') || {}).textContent || '';
    var matchName = fileName.toLowerCase().indexOf(query) !== -1;
    // Also search file content
    var matchContent = false;
    if (!matchName && filePath && FILE_DATA[filePath]) {
      matchContent = FILE_DATA[filePath].content.toLowerCase().indexOf(query) !== -1;
    }
    item.classList.toggle('hidden', !matchName && !matchContent);
  }

  for (var i = 0; i < folders.length; i++) {
    var visibleFiles = folders[i].querySelectorAll('.file-item:not(.hidden)');
    folders[i].classList.toggle('hidden-all', visibleFiles.length === 0);
    if (visibleFiles.length > 0) folders[i].classList.add('open');
  }
});

if (searchClear) {
  searchClear.addEventListener('click', function() {
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input'));
    searchInput.focus();
  });
}

// ══════════════════════════════════════════════════════
// MOBILE SIDEBAR
// ══════════════════════════════════════════════════════
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('overlay').classList.add('open');
  state.sidebarOpen = true;
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
  state.sidebarOpen = false;
}

document.getElementById('menuBtn').addEventListener('click', openSidebar);
document.getElementById('overlay').addEventListener('click', closeSidebar);

var touchStartX = 0;
document.addEventListener('touchstart', function(e) {
  touchStartX = e.touches[0].clientX;
}, { passive: true });

document.addEventListener('touchend', function(e) {
  var dx = e.changedTouches[0].clientX - touchStartX;
  if (dx > 60 && touchStartX < 30) openSidebar();
  if (dx < -60 && state.sidebarOpen) closeSidebar();
});

// ══════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ══════════════════════════════════════════════════════
document.addEventListener('keydown', function(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  var files = Object.keys(FILE_DATA);
  var currentIdx = state.currentFile ? files.indexOf(state.currentFile) : -1;

  if (e.key === 'j') {
    e.preventDefault();
    if (currentIdx < files.length - 1) selectFile(files[currentIdx + 1]);
  } else if (e.key === 'k') {
    e.preventDefault();
    if (currentIdx > 0) selectFile(files[currentIdx - 1]);
  } else if (e.key === '/') {
    e.preventDefault();
    searchInput.focus();
  } else if (e.key === 'Escape') {
    // Fix #1: close modal first, then sidebar
    var modal = document.getElementById('featureModal');
    if (modal && modal.classList.contains('open')) {
      closeFeatureModal();
    } else if (state.sidebarOpen) {
      closeSidebar();
    }
  }
});

// ══════════════════════════════════════════════════════
// BACK TO TOP
// ══════════════════════════════════════════════════════
var backBtn = document.getElementById('backToTop');
var mainEl = document.getElementById('main');

function checkScroll() {
  var scrollY = mainEl.scrollTop || window.scrollY;
  backBtn.classList.toggle('visible', scrollY > 500);
}

mainEl.addEventListener('scroll', checkScroll);
window.addEventListener('scroll', checkScroll);

backBtn.addEventListener('click', function() {
  mainEl.scrollTo({ top: 0, behavior: 'smooth' });
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ══════════════════════════════════════════════════════
// HOME PAGE
// ══════════════════════════════════════════════════════
function renderHome(addToHistory) {
  if (addToHistory !== false) {
    state.navHistory.push({ type: 'home' });
    if (state.navHistory.length > 50) state.navHistory.shift();
  }
  state.currentFile = null;
  state.currentSection = null;

  // Fix #7: reset mobile title
  updateMobileTitle(null);

  var navBar = document.getElementById('navBar');
  if (navBar) navBar.classList.remove('visible');

  autoCollapseSidebar(false);
  updateSidebarHighlight(null);

  var area = document.getElementById('contentArea');
  area.classList.add('switching');

  setTimeout(function() {
    var h = '';

    // Hero
    h += '<div class="home-page">';
    h += '<div class="hero">';
    h += '<h1 class="hero-title">multi-ai-workflow <span class="hero-version">v2.1</span></h1>';
    h += '<p class="hero-subtitle">星型中枢 · 多AI协作工作流</p>';
    h += '<p class="hero-tagline">让多个AI像团队一样协作，你只负责复制粘贴</p>';
    h += '<div class="hero-background" onclick="showFeatureDetail(\'about\')">';
    h += '<div class="hero-background-title">背景简介</div>';
    h += '<p>源于数学建模大赛 C 题问题二中使用多 AI 工具协作流程提炼蒸馏出的"角色隔离 + 交叉审查 + 检查点"等可复用协作范式，融合 superpowers 功能包体系等 17 个 Skill 整合调度，构成的一套复用性较为广泛的通用"multi-ai-workflow"多 AI 协作工作流体系工具。</p>';
    h += '<span class="hero-background-hint">点击了解详情 →</span>';
    h += '</div>';
    h += '<div class="hero-actions">';
    h += '<button class="hero-btn primary" onclick="homeSelectFile(\'multi-ai-workflow-skill/小白上手教程_5分钟看懂.txt\')">快速上手</button>';
    h += '<button class="hero-btn" onclick="homeSelectFile(\'multi-ai-workflow-skill/工作流指南/多AI协作工作流_完整操作指南.txt\')">完整指南</button>';
    h += '<button class="hero-btn" onclick="homeSelectFile(\'multi-ai-workflow-skill/工作流指南/多AI协作工作流_Mermaid.md\')">查看完整流程</button>';
    h += '</div>';
    h += '</div>';

    // Features
    h += '<div class="features">';
    h += '<h2 class="section-title">核心能力</h2>';
    h += '<div class="feature-grid">';
    var features = [
      {icon:'🧠', title:'星型中枢', desc:'CC#1 决策调度，CC#2 执行吞噪', id:'hub'},
      {icon:'🛡️', title:'四层防御', desc:'分流→告警→切换→快照', id:'defense'},
      {icon:'💾', title:'检查点系统', desc:'磁盘锚定，30 秒恢复全部状态', id:'checkpoint'},
      {icon:'🔍', title:'交叉审查', desc:'多模型异构校验，拦截静默 Bug', id:'crossreview'},
      {icon:'📦', title:'17 Skill 联动', desc:'深度集成 superpowers 技能包', id:'skills'},
      {icon:'🚦', title:'阶段阀门', desc:'通过/需改/驳回，门禁卡控质量', id:'valve'},
      {icon:'⏪', title:'Git 回溯', desc:'任意回退到历史阶段出口', id:'rollback'},
      {icon:'📝', title:'数据契约', desc:'Assert Guards 锁死接口格式', id:'contract'}
    ];
    for (var fi = 0; fi < features.length; fi++) {
      var feat = features[fi];
      h += '<div class="feature-card" onclick="showFeatureDetail(\'' + feat.id + '\')">';
      h += '<span class="feature-icon">' + feat.icon + '</span>';
      h += '<span class="feature-name">' + feat.title + '</span>';
      h += '<span class="feature-desc">' + feat.desc + '</span>';
      h += '<span class="feature-hint">点击了解 →</span>';
      h += '</div>';
    }
    h += '</div></div>';

    // Document sections
    h += '<div class="doc-sections">';
    h += '<h2 class="section-title">文档导航</h2>';
    // Helper: render nested files/folders for home page sections
    function renderSectionFiles(items, depth) {
      var sh = '';
      for (var fi = 0; fi < items.length; fi++) {
        var it = items[fi];
        if (typeof it === 'string') {
          var fp = it;
          var fn = fp.split('/').pop();
          var ext = fn.slice(fn.lastIndexOf('.'));
          var fileIcon = ext === '.html' ? '◇' : ext === '.txt' ? '▤' : '◆';
          var fileCls = ext === '.html' ? 'icon-html' : ext === '.txt' ? 'icon-txt' : 'icon-md';
          sh += '<div class="section-file" onclick="homeSelectFile(\'' + escAttr(fp) + '\')" style="padding-left:' + (18 + depth * 16) + 'px">';
          sh += '<span class="file-icon ' + fileCls + '">' + fileIcon + '</span>';
          sh += '<span class="section-file-name">' + esc(fn) + '</span>';
          sh += '</div>';
        } else {
          sh += '<div class="section-folder">';
          sh += '<div class="section-folder-name" style="padding-left:' + (18 + depth * 16) + 'px">📁 ' + esc(it.name) + '</div>';
          sh += renderSectionFiles(it.children, depth + 1);
          sh += '</div>';
        }
      }
      return sh;
    }

    function countSectionFiles(items) {
      var n = 0;
      for (var fi = 0; fi < items.length; fi++) {
        if (typeof items[fi] === 'string') n++;
        else n += countSectionFiles(items[fi].children);
      }
      return n;
    }

    for (var si = 0; si < SECTIONS.length; si++) {
      var sec = SECTIONS[si];
      var fileCount = countSectionFiles(sec.files);
      h += '<div class="section-card" id="section-card-' + sec.id + '">';
      h += '<div class="section-header" onclick="openSection(\'' + sec.id + '\')">';
      h += '<span class="section-header-left">';
      h += '<span class="section-icon">' + sec.icon + '</span>';
      h += '<span class="section-info">';
      h += '<span class="section-name">' + sec.name + '</span>';
      h += '<span class="section-desc">' + sec.desc + '</span>';
      h += '</span>';
      h += '</span>';
      h += '<span class="section-badge">' + fileCount + ' 篇</span>';
      h += '<svg class="section-arrow" width="16" height="16" viewBox="0 0 16 16"><path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
      h += '</div>';
      h += '<div class="section-files" id="section-files-' + sec.id + '">';
      h += renderSectionFiles(sec.files, 0);
      h += '</div>';
      h += '</div>';
    }
    h += '</div>';
    h += '</div>';

    area.innerHTML = h;
    area.classList.remove('switching');
    document.getElementById('main').scrollTop = 0;
    window.scrollTo(0, 0);
  }, 50);
}

function openSection(sectionId) {
  var card = document.getElementById('section-card-' + sectionId);
  var files = document.getElementById('section-files-' + sectionId);
  if (!card || !files) return;

  var isOpen = card.classList.contains('open');
  card.classList.toggle('open', !isOpen);

  if (!isOpen) {
    var allCards = document.querySelectorAll('.section-card');
    for (var i = 0; i < allCards.length; i++) {
      if (allCards[i] !== card) allCards[i].classList.remove('open');
    }
    state.currentSection = sectionId;
  } else {
    state.currentSection = null;
  }
}

function updateNavBar() {
  var navBar = document.getElementById('navBar');
  if (!navBar) return;
  if (state.currentFile) {
    navBar.classList.add('visible');
  }
  var backLink = navBar.querySelector('.nav-back');
  if (backLink) {
    backLink.style.display = state.navHistory.length >= 2 ? '' : 'none';
  }
}

function goBack() {
  if (state.navHistory.length < 2) { renderHome(false); return; }
  state.navHistory.pop();
  var prev = state.navHistory.pop();
  if (prev.type === 'home') {
    renderHome(false);
  } else if (prev.type === 'file') {
    selectFile(prev.path);
  }
}

function homeSelectFile(filePath) {
  updateSidebarHighlight(filePath);
  renderFile(filePath);
  if (window.innerWidth <= 768) closeSidebar();
}

function escAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ══════════════════════════════════════════════════════
// SIDEBAR COLLAPSE (desktop)
// ══════════════════════════════════════════════════════
function autoCollapseSidebar(shouldCollapse) {
  if (window.innerWidth <= 768) return;
  if (state.sidebarPinned) return;
  var sidebar = document.getElementById('sidebar');
  if (shouldCollapse) {
    sidebar.classList.add('collapsed');
    state.sidebarCollapsed = true;
  } else {
    sidebar.classList.remove('collapsed');
    state.sidebarCollapsed = false;
  }
}

function toggleSidebar() {
  state.sidebarCollapsed = !state.sidebarCollapsed;
  state.sidebarPinned = state.sidebarCollapsed;
  var sidebar = document.getElementById('sidebar');
  if (state.sidebarCollapsed) {
    sidebar.classList.add('collapsed');
  } else {
    sidebar.classList.remove('collapsed');
    state.sidebarPinned = false;
  }
}

var collapseBtn = document.getElementById('collapseBtn');
if (collapseBtn) {
  collapseBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    toggleSidebar();
  });
}

// ══════════════════════════════════════════════════════
// FEATURE DETAIL MODAL
// ══════════════════════════════════════════════════════
var FEATURE_DETAILS = {
  about: {
    title: '关于 multi-ai-workflow',
    icon: '',
    body: '<h3 style="font-size:1rem;color:var(--text-title);margin-top:0">解决的问题</h3>' +
      '<p><b>对抗"上下文污染"（注意力衰减）</b><br>长上下文模型在接收大量高熵噪声（数百行编译报错、依赖冲突日志）时，高层推理能力会显著下降。本工作流设计了 CC#1（中枢大脑）与 CC#2（执行副手）的物理隔离——CC#2 吞噬所有编译噪声和调试日志，仅向 CC#1 传递精简信号，保护决策层的注意力纯净度。这一机制在数学建模竞赛 C 题的 72 小时高压实战中得到验证。</p>' +
      '<p><b>对抗"自证倾向"（逻辑盲区）</b><br>单一 AI 无法有效审查自身产出的代码和逻辑。本工作流强制引入外部异构模型（Gemini/GPT 等）进行独立交叉审查，并设计了三级降级策略（2 异构 → 1 模型双轮 → 自审标注），最大化拦截静默 Bug。在 C 题实战中，Gemini 的外部审查成功拦截了"after_idx=-1 丢包"和"半日游逻辑漏洞"等致命问题。</p>' +
      '<p><b>对抗"无状态性"（会话失忆）</b><br>大模型 API 本质是无状态的。本工作流设计了基于磁盘的项目状态_当前.md 检查点系统，将项目状态序列化为模型无关的结构化 Markdown，与 Git Tag 原子绑定。实现了关机 30 秒恢复、上下文老化一键切换、阶段方向回溯三种恢复能力，将 AI 从脆弱的"生命体"降级为可随意替换的"计算节点"。</p>' +
      '<h3 style="font-size:1rem;color:var(--text-title);margin-top:20px">可复用性分析</h3>' +
      '<p><b>高度抽象，平台无关</b><br>工作流本质是"流程编排器"，不绑定任何特定业务代码。核心机制可平滑迁移至：软件开发（全栈 Web、跨端 App、后端服务）、嵌入式硬件开发（寄存器配置 + Datasheet 对照审查）、学术论文复现（SOTA 算法 + Peer Review 模拟）、数据分析与数学建模竞赛。</p>' +
      '<p><b>与 superpowers 的关系：主板与插件，而非替代</b><br>原生 superpowers 是一套优秀的"单兵作战装备"，在同一会话内提供 brainstorming、code-review、debugging 等技能，体验流畅。但它本质是单 AI 会话内的工具调用，无法解决跨会话失忆、自证偏见、长上下文注意力衰减等系统性问题。multi-ai-workflow v2.1 在其之上叠加了一层"指挥体系"：用磁盘检查点对抗失忆、用外部异构模型对抗自证、用角色隔离对抗噪声污染。两者互补——v2.1 是主板，superpowers 是插在上面的 CPU 和显卡。</p>' +
      '<p><b>兼容现有生态</b><br>深度/中度/轻度集成 17 个 superpowers 技能包，采用"主板 + 插件"架构，不造轮子，最大化利用现有工具链。</p>' +
      '<p><b>灵活的降级机制</b><br>审查可从 2 个异构模型降为 1 个模型 2 轮独立审查，甚至降为单点自审（标注风险）。外部模型不可用时工作流仍可运转。</p>' +
      '<h3 style="font-size:1rem;color:var(--text-title);margin-top:20px">局限性</h3>' +
      '<p><b>人类作为"数据总线"的操作疲劳</b><br>用户需要持续在本地 IDE 和网页端之间复制粘贴、开新 Tab，在长周期项目中带来心智摩擦。未来可通过开发轻量 CLI 工具（如 mawf-cli）自动完成机械操作来缓解。</p>' +
      '<p><b>不适用于轻量级任务</b><br>对 300 行以内的脚本或简单 UI 调整，检查点归档、双盲审查、阀门评审的流程开销远超写代码本身。任务规模是使用与否的首要判断标准。</p>' +
      '<p><b>基础模型的"共性盲区"不可逾越</b><br>主流大模型在底层训练语料和 Transformer 架构上高度同源。若 Bug 涉及极度冷门、反直觉的领域，所有异构模型可能表现出一致性幻觉——这是编排框架无法解决的认知天花板。</p>'
  },
  hub: {
    title: '星型中枢',
    icon: '🧠',
    body: '<p>工作流采用<b>星型拓扑架构</b>，所有信息流以 CC#1（中枢大脑）为唯一中心节点，杜绝多 AI 之间的直接通信。</p>' +
      '<p><b>CC#1 中枢大脑</b>：负责需求分析、阶段规划、任务分发、质量拍板。绝不亲自写代码、不看编译日志，只看 CC#2 提炼的精简信号，保持决策层的注意力纯净。</p>' +
      '<p><b>CC#2 执行副手</b>：承接代码编写、运行测试、调试排错、生成图表。作为"防波堤"吞噬所有编译噪声和报错日志，向 CC#1 仅汇报结论和关键信号。</p>' +
      '<p><b>用户（MQTT）</b>：扮演只读中继，在本地 IDE 与网页端之间无损传递信息，不修改 AI 输出的任何内容，不做技术决策——只做快递员。</p>'
  },
  defense: {
    title: '四层上下文防御',
    icon: '🛡️',
    body: '<p>针对大模型长上下文注意力漂移、会话崩溃等物理缺陷，设计了<b>四级递进防御体系</b>：</p>' +
      '<p><b>L1·CC#2 分流（预防）</b>：代码、日志、调试全部路由到 CC#2，CC#1 只接收精简汇报。任务路由规则自动触发。</p>' +
      '<p><b>L2·告警信号（发现）</b>：CC#1 出现退化/回看/跨阀门决策时，或 CC#2 开始倾倒原始日志/反复修改/失忆时，任一信号立即触发分流或自我切换。</p>' +
      '<p><b>L3·检查点切换（修复）</b>：写项目状态_当前.md → 新会话 → 恢复。CC#1 等当前决策完成后切换，CC#2 不等决策存盘即切。</p>' +
      '<p><b>L4·磁盘快照（兜底）</b>：关机/崩溃后从项目状态_当前.md + git commit 冷恢复，最坏情况回退到上一阀门出口。</p>'
  },
  checkpoint: {
    title: '检查点系统',
    icon: '💾',
    body: '<p>大模型 API 本质是<b>无状态（Stateless）</b>的。检查点系统将项目"运行期状态"序列化为人类与 AI 均可无损读取的结构化 Markdown 文本，与 Git Tag 原子绑定。</p>' +
      '<p><b>核心文件</b>：项目状态_当前.md —— 磁盘唯一真相源，模型无关。包含：当前阶段号、数据契约（变量名/格式/单位）、已完成/待完成清单、CC#2 恢复用指令段。</p>' +
      '<p><b>自动触发</b>：每次阶段阀门通过后，CC#1 自动输出检查点文本。用户花 10 秒人眼确认阶段号和数据契约未被 AI 篡改，保存为 项目状态_当前.md。</p>' +
      '<p><b>恢复能力</b>：关机后第二天 30 秒恢复全部上下文；CC#1/CC#2 上下文老化时写检查点切新会话；发现方向错误时可回溯到任意历史阶段出口。</p>'
  },
  crossreview: {
    title: '强制交叉审查',
    icon: '🔍',
    body: '<p>单一模型存在系统性的<b>"自证倾向（Self-Confirmation Bias）"</b>——很难发现自己的逻辑盲区。交叉审查强制引入外部异构模型进行独立校验。</p>' +
      '<p><b>三级降级策略</b>：<br>标准级：≥2 个异构模型独立审查 → CC#1 对比综合<br>会话级：仅 1 个模型时，开新 Tab + 清零上下文 + Temp=0 执行 2 轮独立审查<br>单点级：无外部模型时，CC#1 + CC#2 自审，标注"单模型·风险自担"</p>' +
      '<p><b>硬性门禁</b>：交叉审查未完成 → 阶段阀门不可打开。重大结果（D 级）必须经过交叉审查才能定稿。每次审查必须开全新浏览器 Tab，不可复用旧会话。</p>'
  },
  skills: {
    title: '17 Skill 联动',
    icon: '📦',
    body: '<p>v2.1 不重新造轮子，而是将 superpowers 等 17 个 Skill 定义为<b>"执行构件（Components）"</b>，自己退化为<b>"流程编排器（Orchestrator）"</b>。</p>' +
      '<p><b>深度集成（3 个）</b>：brainstorming（阶段 0 硬性门禁）、verification-before-completion（阀门执行引擎）、using-superpowers（会话启动优先级）</p>' +
      '<p><b>中度集成（5 个）</b>：writing-plans、executing-plans、requesting-code-review、systematic-debugging、subagent-driven-development</p>' +
      '<p><b>轻度集成（9 个）</b>：doc-coauthoring、dispatching-parallel-agents、web-access、docx/pdf/xlsx、test-driven-dev、receiving-code-review、webapp-testing、security-review、init</p>' +
      '<p>类比：v2.1 是主板（Motherboard）提供插槽和容错，Superpowers 是显卡和 CPU 提供算力。</p>'
  },
  valve: {
    title: '阶段阀门',
    icon: '🚦',
    body: '<p>每个阶段出口设置<b>三方评审阀门</b>，确保质量不滚雪球：</p>' +
      '<p><b>通过</b>：验收合格 → 写检查点 + git tag stage-X-pass → 进入下一阶段</p>' +
      '<p><b>需改</b>：有小问题 → CC#2 修改 → 重审，同一问题最多 3 轮，避免死循环</p>' +
      '<p><b>驳回</b>：方向性错误 → 重做该阶段</p>' +
      '<p><b>三条硬性门禁</b>：① brainstorming 设计未批准 → 禁止写任何代码<br>② 强制交叉审查未完成 → 阀门不可打开<br>③ 无新鲜验证证据 → 不准声明完成</p>'
  },
  rollback: {
    title: 'Git 回溯',
    icon: '⏪',
    body: '<p>利用 Git Tag 将代码版本与检查点<b>原子绑定</b>，实现任意阶段的时光倒流：</p>' +
      '<p><b>阶段出口打标</b>：阀门通过后 CC#2 执行 git tag stage-X-pass，代码状态与检查点文件一一对应。</p>' +
      '<p><b>回溯操作</b>：告诉 CC#1"回溯到阶段 X 出口" → CC#1 读取历史检查点文件 → CC#2 执行 git checkout stage-X-pass + 环境检查 → 恢复该阶段完整状态。</p>' +
      '<p><b>限制</b>：只能回退到阀门通过的节点，不能回退到阶段中途的任意时刻。这是设计约束，确保每次回溯到的状态都是经过质检的。</p>'
  },
  contract: {
    title: '数据契约',
    icon: '📝',
    body: '<p>多 AI 协作中最致命的 Bug 是<b>"数据格式静默漂移"</b>——一个 AI 改了输出格式，另一个 AI 不知道，导致计算结果全盘错误。</p>' +
      '<p><b>Assert Guards</b>：在代码入口处设置防御性断言，锁死输入/输出格式。变量名、类型、单位、取值范围全部显式声明，任何偏离立即报错。</p>' +
      '<p><b>契约存储</b>：数据契约写入 项目状态_当前.md 的"数据契约段"，所有 AI 每次启动时先读取并校验。JSON Schema / Interface 定义为唯一标准。</p>' +
      '<p><b>典型案例</b>：数学建模竞赛中，data.py 的 min_visit_time 字段含义变更后，问题二的代码仍在用旧语义计算，导致"半日游"逻辑漏洞。引入数据契约后此类问题被根除。</p>'
  }
};

function showFeatureDetail(id) {
  var detail = FEATURE_DETAILS[id];
  if (!detail) return;
  var modal = document.getElementById('featureModal');
  var title = document.getElementById('featureModalTitle');
  var body = document.getElementById('featureModalBody');
  if (!modal || !title || !body) return;
  title.innerHTML = (detail.icon ? '<span class="feature-icon">' + detail.icon + '</span> ' : '') + detail.title;
  body.innerHTML = detail.body;
  modal.classList.add('open');
  // Fix #4: lock body scroll
  document.body.style.overflow = 'hidden';
}

function closeFeatureModal() {
  var modal = document.getElementById('featureModal');
  if (modal) modal.classList.remove('open');
  // Fix #4: restore body scroll
  document.body.style.overflow = '';
}

// Close modal on overlay click
document.addEventListener('click', function(e) {
  if (e.target.id === 'featureModal') closeFeatureModal();
});

// ══════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════
(function() {
  var c = 'multi-ai-workflow v2.1 | Author: MQTT | QQ:3388589706 | 071021mqtt@gmail.com';
  console.log('%c ' + c + ' ',
    'background:#1e293b;color:#e2e8f0;padding:6px 12px;border-radius:4px;font-size:12px;');
  console.log('%c Copyright (c) 2026 MQTT. All rights reserved. ',
    'color:#64748b;font-size:11px;');
})();

renderHome(false);
