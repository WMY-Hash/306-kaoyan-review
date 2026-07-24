/**
 * 306 考研复习系统 — 主应用逻辑
 * 渲染 / 搜索 / 翻卡 / 进度 / 统计
 */

(function () {
  'use strict';

  // ===== 状态 =====
  let currentSubject = null;
  let currentChapter = null;
  let currentPoint = null;
  let reviewQueue = [];
  let reviewIndex = 0;
  let isSearchMode = false;
  let isWrongBookMode = false;
  let isDashboardMode = false;
  let isResourcesMode = false;
  let isPlanMode = false;
  let isStarMode = false;
  let starGraph = null;            // ForceGraph3D 实例
  let starHighlight = new Set();   // 搜索高亮的节点 id
  let starClickReveal = true;      // 点击连线时，在该线上显示关系说明
  let starClickedLinkId = null;    // 当前被点击、需要显示说明的连线 id
  let starLinkSprites = {};         // linkId -> SpriteText 实例（用于即时切换可见性）
  let reviewSource = 'point'; // 'point' | 'wrong' | 'queue'

  // ===== 致命错误可视化（避免静默白屏）=====
  function showFatal(err) {
    const area = document.getElementById('content-area');
    if (!area) return;
    const msg = (err && err.message) ? err.message : String(err);
    area.innerHTML = '<div class="no-results" style="text-align:left;line-height:1.9;padding:36px 28px">'
      + '<p style="font-size:1.15rem;color:var(--red);font-weight:700">⚠️ 页面脚本未能正常运行</p>'
      + '<p>最可能的原因：用「不支持 JS 的预览器 / 沙箱」打开了本文件，或浏览器拦截了本地脚本。</p>'
      + '<p>请用以下任一方式打开（任选其一即可）：</p>'
      + '<p>① 直接双击 <b>index.html</b>，用 <b>Chrome / Edge / Firefox</b> 打开；</p>'
      + '<p>② 在 <b>kaoyan-review</b> 目录运行 <b style="color:var(--accent)">python3 -m http.server 8080</b>，再浏览器访问 <b>http://localhost:8080/</b>（最稳）；</p>'
      + '<p>③ 若仍报错，按 <b>F12</b> 打开控制台把红色报错发我。</p>'
      + '<p style="margin-top:10px;color:var(--text-muted);font-size:.8rem">错误信息：<code>' + msg.replace(/</g, '&lt;') + '</code></p>'
      + '</div>';
  }
  // 全局错误兜底：任何运行时异常都显示出来，而不是白屏
  window.addEventListener('error', function (e) {
    if (e && (e.error || e.message)) showFatal(e.error || e.message);
  });

  // ===== 安全存储：localStorage 被拦截（如 file:// 某些浏览器/隐私模式）时降级为内存，避免整页崩溃 =====
  const _memStore = {};
  const safeStore = {
    get(k) {
      try { return localStorage.getItem(k); }
      catch (e) { return (k in _memStore) ? _memStore[k] : null; }
    },
    set(k, v) {
      try { localStorage.setItem(k, v); }
      catch (e) { _memStore[k] = String(v); }
    },
    remove(k) {
      try { localStorage.removeItem(k); }
      catch (e) { delete _memStore[k]; }
    },
    keys() {
      try { return Object.keys(localStorage); }
      catch (e) { return Object.keys(_memStore); }
    }
  };

  // ===== 初始化 =====
  function init() {
    if (!window.KB_DATA || !window.KB_DATA.subjects) {
      showFatal('考点数据未加载，请确认 data/kb.js 与 index.html 在同一目录');
      return;
    }
    bindEvents();
    renderSidebar();
    updateStats();
  }

  // ===== 事件绑定 =====
  function bindEvents() {
    document.getElementById('btn-close-detail').addEventListener('click', closeDetail);
    document.getElementById('btn-close-modal').addEventListener('click', closeCardModal);
    document.getElementById('btn-review-point').addEventListener('click', startPointReview);
    document.getElementById('search-input').addEventListener('input', debounce(handleSearch, 300));
    document.getElementById('btn-wrong-book').addEventListener('click', toggleWrongBook);
    document.getElementById('btn-dashboard').addEventListener('click', renderDashboard);
    document.getElementById('btn-resources').addEventListener('click', renderResourcesView);
    document.getElementById('btn-plan').addEventListener('click', renderPlanView);
    document.getElementById('btn-star').addEventListener('click', toggleStarGraph);
    document.getElementById('btn-forgot').addEventListener('click', () => markCard(false));
    document.getElementById('btn-knew').addEventListener('click', () => markCard(true));
    document.getElementById('card-container').addEventListener('click', flipCard);
    document.getElementById('btn-export').addEventListener('click', exportProgress);
    document.getElementById('btn-import').addEventListener('click', () => {
      document.getElementById('import-file').click();
    });
    document.getElementById('import-file').addEventListener('change', importProgress);

    // 键盘快捷键
    document.addEventListener('keydown', handleKeyboard);
  }

  // ===== 进度读写 =====
  function getProgress(pointId) {
    const def = { status: 'new', wrong: false, reviews: 0, last: null, ef: 2.5, interval: 0, repetitions: 0, due: null };
    try {
      const raw = safeStore.get('kr_' + pointId);
      if (!raw) return def;
      return Object.assign({}, def, JSON.parse(raw));
    } catch (e) {
      return def;
    }
  }

  function setProgress(pointId, data) {
    try {
      safeStore.set('kr_' + pointId, JSON.stringify(data));
    } catch (e) {
      console.warn('进度写入失败', e);
    }
  }

  function getAllProgress() {
    const result = {};
    const subjects = window.KB_DATA.subjects;
    for (const subj of subjects) {
      for (const ch of subj.chapters) {
        for (const pt of ch.points) {
          result[pt.id] = getProgress(pt.id);
        }
      }
    }
    return result;
  }

  // ===== 统计更新 =====
  function updateStats() {
    const all = getAllPoints();
    const total = all.length;
    let known = 0, review = 0;
    let weightedKnown = 0, weightedTotal = 0;

    const subjects = window.KB_DATA.subjects;
    for (const subj of subjects) {
      const w = subj.weight;
      let subjKnown = 0, subjTotal = 0;
      for (const ch of subj.chapters) {
        for (const pt of ch.points) {
          subjTotal++;
          const p = getProgress(pt.id);
          if (p.status === 'known') { known++; subjKnown++; }
          if (p.status === 'learning' || p.wrong) review++;
        }
      }
      weightedKnown += subjKnown * w;
      weightedTotal += subjTotal * w;
    }

    const coverage = weightedTotal > 0 ? Math.round((weightedKnown / weightedTotal) * 100) : 0;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-known').textContent = known;
    document.getElementById('stat-review').textContent = review;
    document.getElementById('stat-coverage').textContent = coverage + '%';
  }

  // ===== 工具函数 =====
  function getAllPoints() {
    const result = [];
    const subjects = window.KB_DATA.subjects;
    for (const subj of subjects) {
      for (const ch of subj.chapters) {
        for (const pt of ch.points) {
          result.push(pt);
        }
      }
    }
    return result;
  }

  function findPointById(id) {
    const subjects = window.KB_DATA.subjects;
    for (const subj of subjects) {
      for (const ch of subj.chapters) {
        for (const pt of ch.points) {
          if (pt.id === id) return { point: pt, chapter: ch, subject: subj };
        }
      }
    }
    return null;
  }

  function findSubjectById(id) {
    return window.KB_DATA.subjects.find(s => s.id === id) || null;
  }

  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function statusLabel(p) {
    if (p.status === 'known') return { text: '已掌握', cls: 'status-known' };
    if (p.status === 'learning' || p.wrong) return { text: '学习中', cls: 'status-learning' };
    return { text: '', cls: 'status-new' };
  }

  function levelClass(level) {
    if (level === '高频') return 'level-high';
    if (level === '中频') return 'level-mid';
    return 'level-low';
  }

  // ===== 渲染侧栏 =====
  const SUBJECT_ICONS = {
    physio: "🧬", biochem: "🧪", pathol: "🔬",
    internal: "🫀", surgery: "⚕️", humanity: "💬"
  };

  function renderSidebar() {
    const list = document.getElementById('subject-list');
    const subjects = window.KB_DATA.subjects;
    list.innerHTML = subjects.map(subj => {
      const pts = [];
      for (const ch of subj.chapters) {
        for (const pt of ch.points) pts.push(pt);
      }
      const known = pts.filter(p => getProgress(p.id).status === 'known').length;
      const pct = pts.length > 0 ? Math.round((known / pts.length) * 100) : 0;
      const icon = SUBJECT_ICONS[subj.id] || "📘";
      return `
        <li class="subject-item${currentSubject && currentSubject.id === subj.id ? ' active' : ''}"
            data-subject="${subj.id}">
          <span class="subject-icon">${icon}</span>
          <span class="subject-name">${subj.name}</span>
          <span class="subject-badge">${subj.weight}%</span>
        </li>
        <div class="subject-progress">
          <div class="subject-progress-bar" style="width:${pct}%"></div>
        </div>
      `;
    }).join('');

    // 绑定点击
    list.querySelectorAll('.subject-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.subject;
        navigateToSubject(id);
      });
    });
  }

  // ===== 导航 =====
  function navigateToSubject(subjectId) {
    isSearchMode = false;
    isWrongBookMode = false;
    exitDashboard();
    exitResources();
    exitPlan();
    document.getElementById('btn-wrong-book').textContent = '📕 错题本';
    document.getElementById('search-input').value = '';
    const subj = findSubjectById(subjectId);
    if (!subj) return;
    currentSubject = subj;
    currentChapter = null;
    closeDetail();
    renderSidebar();
    renderChapters(subj);
  }

  function renderChapters(subject) {
    const area = document.getElementById('content-area');
    const bc = document.getElementById('breadcrumb');
    bc.innerHTML = `<span>${subject.name}</span>`;
    area.innerHTML = `
      <div class="chapter-grid">
        ${subject.chapters.map(ch => {
          const total = ch.points.length;
          const known = ch.points.filter(p => getProgress(p.id).status === 'known').length;
          return `
            <div class="chapter-card" data-chapter="${ch.id}">
              <h4>${ch.name}</h4>
              <div class="ch-meta">${total} 考点 · ${known} 已掌握</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    area.querySelectorAll('.chapter-card').forEach(el => {
      el.addEventListener('click', () => {
        navigateToChapter(subject, el.dataset.chapter);
      });
    });
  }

  function navigateToChapter(subject, chapterId) {
    const ch = subject.chapters.find(c => c.id === chapterId);
    if (!ch) return;
    currentChapter = ch;
    closeDetail();
    renderPoints(subject, ch);
  }

  function renderPoints(subject, chapter) {
    const area = document.getElementById('content-area');
    const bc = document.getElementById('breadcrumb');
    bc.innerHTML = `
      <span data-nav="subject">${subject.name}</span>
      <span class="sep">/</span>
      <span>${chapter.name}</span>
    `;
    bc.querySelector('[data-nav="subject"]').addEventListener('click', () => {
      navigateToSubject(subject.id);
    });

    area.innerHTML = `
      <ul class="point-list">
        ${chapter.points.map(pt => {
          const p = getProgress(pt.id);
          const st = statusLabel(p);
          return `
            <li class="point-item" data-point="${pt.id}">
              <span class="point-level ${levelClass(pt.level)}">${pt.level}</span>
              <span class="point-title">${pt.title}</span>
              <span class="point-tags">${(pt.tags || []).map(t => `<span class="point-tag">${t}</span>`).join('')}</span>
              ${st.text ? `<span class="point-status ${st.cls}">${st.text}</span>` : ''}
            </li>
          `;
        }).join('')}
      </ul>
    `;

    area.querySelectorAll('.point-item').forEach(el => {
      el.addEventListener('click', () => {
        openDetail(el.dataset.point);
      });
    });
  }

  // ===== 详情面板 =====
  function openDetail(pointId) {
    const result = findPointById(pointId);
    if (!result) return;
    currentPoint = result.point;
    const { point, subject, chapter } = result;
    const p = getProgress(point.id);

    document.getElementById('detail-panel').classList.remove('hidden');
    document.getElementById('detail-title').textContent = point.title;

    const meta = document.getElementById('detail-meta');
    meta.innerHTML = `
      <span class="point-level ${levelClass(point.level)}">${point.level}</span>
      <span class="point-tag">${subject.name} · ${chapter.name}</span>
      ${(point.tags || []).map(t => `<span class="point-tag">${t}</span>`).join('')}
      ${p.status !== 'new' ? `<span class="point-status ${statusLabel(p).cls}">${statusLabel(p).text}</span>` : ''}
    `;

    const body = document.getElementById('detail-body');
    body.innerHTML = (point.body || '').split('\n').filter(Boolean).map(line => {
      if (/^[一二三四五六七八九十]+、/.test(line)) {
        return `<h5 class="body-h">${line}</h5>`;
      }
      return `<p>${line}</p>`;
    }).join('');

    const cardsDiv = document.getElementById('detail-cards');
    if (point.cards && point.cards.length > 0) {
      cardsDiv.innerHTML = `
        <h4>🃏 自测卡片 (${point.cards.length} 张)</h4>
        ${point.cards.map((card, i) => `
          <div class="detail-card-preview" data-card-idx="${i}">
            <div class="cp-q">Q: ${card.q}</div>
            <div class="cp-a">A: ${card.a}</div>
          </div>
        `).join('')}
      `;
      cardsDiv.querySelectorAll('.detail-card-preview').forEach(el => {
        el.addEventListener('click', () => el.classList.toggle('show-answer'));
      });
    } else {
      cardsDiv.innerHTML = '';
    }

    const resDiv = document.getElementById('detail-resources');
    resDiv.innerHTML = (point.resources && point.resources.length) ? buildResourcesHTML(point.resources) : '';
  }

  function closeDetail() {
    currentPoint = null;
    document.getElementById('detail-panel').classList.add('hidden');
  }

  // ===== 搜索 =====
  function handleSearch() {
    exitDashboard();
    exitResources();
    exitPlan();
    // 星图模式下，搜索框用于在星图中定位/高亮节点
    if (isStarMode) {
      const q = document.getElementById('search-input').value.trim().toLowerCase();
      starSearch(q);
      return;
    }
    const query = document.getElementById('search-input').value.trim().toLowerCase();
    if (!query) {
      isSearchMode = false;
      if (currentSubject) {
        if (currentChapter) renderPoints(currentSubject, currentChapter);
        else renderChapters(currentSubject);
      }
      return;
    }

    isSearchMode = true;
    isWrongBookMode = false;
    document.getElementById('btn-wrong-book').textContent = '📕 错题本';
    closeDetail();

    const results = [];
    const subjects = window.KB_DATA.subjects;
    for (const subj of subjects) {
      for (const ch of subj.chapters) {
        for (const pt of ch.points) {
          const haystack = (pt.title + ' ' + (pt.body || '') + ' ' + (pt.tags || []).join(' ')).toLowerCase();
          if (haystack.includes(query)) {
            results.push({ point: pt, chapter: ch, subject: subj });
          }
        }
      }
    }

    const area = document.getElementById('content-area');
    const bc = document.getElementById('breadcrumb');
    bc.innerHTML = '';

    if (results.length === 0) {
      area.innerHTML = '<div class="no-results">🔍 未找到匹配的考点，试试其他关键词</div>';
      return;
    }

    area.innerHTML = `
      <div class="search-results-header">搜索 "<strong>${escapeHtml(query)}</strong>" — 找到 ${results.length} 个考点</div>
      <ul class="point-list">
        ${results.map(({ point, subject, chapter }) => {
          const p = getProgress(point.id);
          const st = statusLabel(p);
          return `
            <li class="point-item" data-point="${point.id}">
              <span class="point-level ${levelClass(point.level)}">${point.level}</span>
              <span class="point-title">${highlightMatch(point.title, query)} <span style="color:var(--text-muted);font-size:0.75rem">— ${subject.name} · ${chapter.name}</span></span>
              <span class="point-tags">${(point.tags || []).map(t => `<span class="point-tag">${t}</span>`).join('')}</span>
              ${st.text ? `<span class="point-status ${st.cls}">${st.text}</span>` : ''}
            </li>
          `;
        }).join('')}
      </ul>
    `;

    area.querySelectorAll('.point-item').forEach(el => {
      el.addEventListener('click', () => openDetail(el.dataset.point));
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function highlightMatch(text, query) {
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escapeHtml(text).replace(regex, '<mark style="background:rgba(137,180,250,0.3);color:var(--accent);padding:0 2px;border-radius:2px">$1</mark>');
  }

  // ===== 卡片复习 =====
  function startPointReview() {
    if (!currentPoint) return;
    const cards = currentPoint.cards || [];
    if (cards.length === 0) return;
    reviewQueue = cards.map((card, i) => ({
      ...card,
      pointId: currentPoint.id,
      cardIdx: i
    }));
    reviewIndex = 0;
    reviewSource = 'point';
    showCardModal();
  }

  function startWrongBookReview(points) {
    reviewQueue = [];
    for (const { point } of points) {
      for (let i = 0; i < (point.cards || []).length; i++) {
        reviewQueue.push({ ...point.cards[i], pointId: point.id, cardIdx: i });
      }
    }
    reviewIndex = 0;
    reviewSource = 'wrong';
    if (reviewQueue.length > 0) showCardModal();
  }

  function showCardModal() {
    if (reviewQueue.length === 0) return;
    const modal = document.getElementById('card-modal');
    modal.classList.remove('hidden');
    document.getElementById('card-actions').classList.add('hidden');
    document.getElementById('card-inner').classList.remove('flipped');
    renderCurrentCard();
  }

  function renderCurrentCard() {
    if (reviewIndex >= reviewQueue.length) {
      finishReview();
      return;
    }
    const card = reviewQueue[reviewIndex];
    document.getElementById('card-progress').textContent =
      `${reviewIndex + 1} / ${reviewQueue.length}`;
    const fill = document.getElementById('card-progress-fill');
    if (fill) fill.style.width = ((reviewIndex + 1) / reviewQueue.length * 100) + '%';
    document.getElementById('card-front').innerHTML = `<span class="card-side-tag">提问</span>${card.q}`;
    document.getElementById('card-back').innerHTML = `<span class="card-side-tag">答案</span>${card.a}`;
    document.getElementById('card-inner').classList.remove('flipped');
    document.getElementById('card-actions').classList.add('hidden');
  }

  function flipCard() {
    const inner = document.getElementById('card-inner');
    const flipped = inner.classList.contains('flipped');
    if (flipped) {
      inner.classList.remove('flipped');
      document.getElementById('card-actions').classList.add('hidden');
    } else {
      inner.classList.add('flipped');
      document.getElementById('card-actions').classList.remove('hidden');
    }
  }

  function markCard(knew) {
    const card = reviewQueue[reviewIndex];
    const p = getProgress(card.pointId);
    p.reviews = (p.reviews || 0) + 1;
    p.last = todayStr();

    if (knew) {
      p.status = p.status === 'new' ? 'learning' : (p.reviews >= 2 ? 'known' : p.status);
      p.wrong = false;
    } else {
      p.status = 'learning';
      p.wrong = true;
    }

    if (isSM2Enabled()) {
      applySM2(p, knew);
    } else {
      p.ef = 2.5; p.interval = 0; p.repetitions = 0; p.due = null;
    }

    setProgress(card.pointId, p);

    // 如果当前在详情面板且是同一个考点，更新详情显示
    if (currentPoint && currentPoint.id === card.pointId) {
      openDetail(card.pointId);
    }

    reviewIndex++;
    renderCurrentCard();
    updateStats();
    renderSidebar();
  }

  function closeCardModal() {
    document.getElementById('card-modal').classList.add('hidden');
    reviewQueue = [];
    reviewIndex = 0;
    finishReview();
  }

  // ===== 错题本 =====
  function toggleWrongBook() {
    exitDashboard();
    exitResources();
    exitPlan();
    if (isWrongBookMode) {
      isWrongBookMode = false;
      document.getElementById('btn-wrong-book').textContent = '📕 错题本';
      document.getElementById('search-input').value = '';
      if (currentSubject) {
        if (currentChapter) renderPoints(currentSubject, currentChapter);
        else renderChapters(currentSubject);
      }
      return;
    }

    isWrongBookMode = true;
    isSearchMode = false;
    document.getElementById('search-input').value = '';
    document.getElementById('btn-wrong-book').textContent = '📖 返回浏览';
    closeDetail();
    renderWrongBook();
  }

  function renderWrongBook(filterSubject) {
    const subjects = window.KB_DATA.subjects;
    const wrongPoints = [];
    for (const subj of subjects) {
      if (filterSubject && subj.id !== filterSubject) continue;
      for (const ch of subj.chapters) {
        for (const pt of ch.points) {
          const p = getProgress(pt.id);
          if (p.wrong) {
            wrongPoints.push({ point: pt, chapter: ch, subject: subj });
          }
        }
      }
    }

    const area = document.getElementById('content-area');
    const bc = document.getElementById('breadcrumb');
    bc.innerHTML = '';

    const filterOptions = subjects.map(s =>
      `<option value="${s.id}" ${filterSubject === s.id ? 'selected' : ''}>${s.name}</option>`
    ).join('');

    if (wrongPoints.length === 0) {
      area.innerHTML = `
        <div class="wrong-header">
          <h3>📕 错题本</h3>
          <select id="wrong-filter">
            <option value="">全部科目</option>
            ${filterOptions}
          </select>
          <span style="color:var(--text-muted);font-size:0.8rem">(0 道错题)</span>
        </div>
        <div class="no-results">🎉 没有错题，继续保持！</div>
      `;
    } else {
      area.innerHTML = `
        <div class="wrong-header">
          <h3>📕 错题本</h3>
          <select id="wrong-filter">
            <option value="">全部科目</option>
            ${filterOptions}
          </select>
          <span style="color:var(--text-muted);font-size:0.8rem">(${wrongPoints.length} 道错题)</span>
          <button class="btn-known" style="margin-left:auto;padding:6px 14px;font-size:0.8rem" id="btn-review-wrong">🔄 重练全部错题</button>
        </div>
        <ul class="point-list">
          ${wrongPoints.map(({ point, subject, chapter }) => {
            const p = getProgress(point.id);
            return `
              <li class="point-item" data-point="${point.id}">
                <span class="point-level ${levelClass(point.level)}">${point.level}</span>
                <span class="point-title">${point.title} <span style="color:var(--text-muted);font-size:0.75rem">— ${subject.name} · ${chapter.name}</span></span>
                <span class="point-status status-learning">错题</span>
              </li>
            `;
          }).join('')}
        </ul>
      `;

      area.querySelectorAll('.point-item').forEach(el => {
        el.addEventListener('click', () => openDetail(el.dataset.point));
      });

      const filterEl = document.getElementById('wrong-filter');
      if (filterEl) {
        filterEl.addEventListener('change', () => {
          renderWrongBook(filterEl.value || null);
        });
      }

      const reviewBtn = document.getElementById('btn-review-wrong');
      if (reviewBtn) {
        reviewBtn.addEventListener('click', () => {
          startWrongBookReview(wrongPoints);
        });
      }
    }
  }

  // ===== 键盘快捷键 =====
  function handleKeyboard(e) {
    const modal = document.getElementById('card-modal');
    if (modal.classList.contains('hidden')) return;

    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      flipCard();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const inner = document.getElementById('card-inner');
      if (inner.classList.contains('flipped')) {
        markCard(false);
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const inner = document.getElementById('card-inner');
      if (inner.classList.contains('flipped')) {
        markCard(true);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeCardModal();
    }
  }

  // ===== 导出/导入 =====
  function exportProgress() {
    const data = getAllProgress();
    // 同时备份计划任务完成态（kp_ 前缀）
    for (const k of safeStore.keys()) {
      if (k.startsWith('kp_')) {
        const raw = safeStore.get(k);
        if (raw != null) { try { data[k] = JSON.parse(raw); } catch (e) {} }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kaoyan-progress-' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importProgress(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
      try {
        const data = JSON.parse(ev.target.result);
        let count = 0;
        for (const [key, val] of Object.entries(data)) {
          if (key.startsWith('kr_') || key.startsWith('kp_')) {
            safeStore.set(key, JSON.stringify(val));
            count++;
          }
        }
        alert('已导入 ' + count + ' 条进度记录');
        updateStats();
        renderSidebar();
        if (isWrongBookMode) renderWrongBook();
        if (isPlanMode) renderPlanView();
      } catch (err) {
        alert('导入失败：文件格式不正确');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // ===== M2：进度看板 / 复习队列 / SM-2 间隔重复 =====

  // 退出看板视图（回到科目浏览态）
  function exitDashboard() {
    isDashboardMode = false;
    const b = document.getElementById('btn-dashboard');
    if (b) b.classList.remove('active');
  }

  function exitResources() {
    isResourcesMode = false;
    const b = document.getElementById('btn-resources');
    if (b) b.classList.remove('active');
  }

  function exitPlan() {
    isPlanMode = false;
    const b = document.getElementById('btn-plan');
    if (b) b.classList.remove('active');
  }

  function isSM2Enabled() {
    return safeStore.get('kr_setting_sm2') === '1';
  }
  function setSM2Enabled(on) {
    try { safeStore.set('kr_setting_sm2', on ? '1' : '0'); } catch (e) {}
  }

  // 时区安全的日期工具（统一用本地年月日，避免 toISOString 的 UTC 偏移）
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function addDays(dateStr, n) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + n);
    return dt.getUTCFullYear() + '-' + String(dt.getUTCMonth() + 1).padStart(2, '0') + '-' + String(dt.getUTCDate()).padStart(2, '0');
  }

  // SuperMemo-2 算法：根据「认识/不认识」映射评分并更新排程
  function applySM2(p, knew) {
    const grade = knew ? 5 : 0; // 二元反馈映射：认识=5，不认识=0
    if (grade < 3) {
      p.repetitions = 0;
      p.interval = 1;
    } else {
      if (p.repetitions === 0) p.interval = 1;
      else if (p.repetitions === 1) p.interval = 6;
      else p.interval = Math.round(p.interval * p.ef);
      p.repetitions += 1;
    }
    p.ef = p.ef + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
    if (p.ef < 1.3) p.ef = 1.3;
    p.due = addDays(todayStr(), p.interval);
  }

  // 加权覆盖率（与顶部统计栏一致）
  function computeCoverage() {
    const subjects = window.KB_DATA.subjects;
    let wk = 0, wt = 0;
    for (const s of subjects) {
      let sk = 0, st = 0;
      for (const ch of s.chapters) {
        for (const pt of ch.points) {
          st++;
          if (getProgress(pt.id).status === 'known') sk++;
        }
      }
      wk += sk * s.weight;
      wt += st * s.weight;
    }
    return wt > 0 ? Math.round(wk / wt * 100) : 0;
  }

  // 计算复习队列：SM-2 模式按下次到期日推送；普通模式含「学习中」与「错题」
  function computeReviewQueue() {
    const sm2 = isSM2Enabled();
    const today = todayStr();
    const list = [];
    const subjects = window.KB_DATA.subjects;
    for (const subj of subjects) {
      for (const ch of subj.chapters) {
        for (const pt of ch.points) {
          const p = getProgress(pt.id);
          let due = false, overdue = false;
          if (sm2) {
            if (p.status !== 'new' && p.due) {
              if (p.due <= today) { due = true; if (p.due < today) overdue = true; }
            }
            if (p.wrong) { due = true; if (!p.due || p.due < today) overdue = true; }
          } else {
            if (p.status === 'learning' || p.wrong) { due = true; overdue = !!p.wrong; }
          }
          if (due) list.push({ point: pt, subject: subj, chapter: ch, p, overdue });
        }
      }
    }
    list.sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      const da = a.p.due || (a.overdue ? '0000-00-00' : today);
      const db = b.p.due || (b.overdue ? '0000-00-00' : today);
      return da < db ? -1 : 1;
    });
    return list;
  }

  // 雷达图（SVG）：n 个科目轴，values 为 0~1 的掌握度
  function buildRadarSVG(subjects, values) {
    const size = 320, cx = size / 2, cy = size / 2, R = 118;
    const n = subjects.length;
    const angle = i => (-Math.PI / 2) + i * (2 * Math.PI / n);
    const pt = (i, r) => [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];
    let rings = '';
    [0.25, 0.5, 0.75, 1].forEach(f => {
      const pts = subjects.map((_, i) => pt(i, R * f).map(v => v.toFixed(1)).join(',')).join(' ');
      rings += '<polygon class="radar-ring" points="' + pts + '"/>';
    });
    let spokes = '', labels = '';
    subjects.forEach((s, i) => {
      const [x, y] = pt(i, R);
      spokes += '<line class="radar-spoke" x1="' + cx + '" y1="' + cy + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '"/>';
      const [lx, ly] = pt(i, R + 22);
      const a = angle(i);
      let anchor = 'middle';
      if (Math.cos(a) > 0.3) anchor = 'start';
      else if (Math.cos(a) < -0.3) anchor = 'end';
      labels += '<text class="radar-axis-label" x="' + lx.toFixed(1) + '" y="' + (ly + 4).toFixed(1) + '" text-anchor="' + anchor + '">' + s.name + '</text>';
    });
    const dataPts = values.map((v, i) => pt(i, R * Math.max(0, Math.min(1, v))).map(x => x.toFixed(1)).join(',')).join(' ');
    let dots = values.map((v, i) => {
      const [x, y] = pt(i, R * Math.max(0, Math.min(1, v)));
      return '<circle class="radar-dot" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3"/>';
    }).join('');
    return '<svg class="radar-svg" viewBox="0 0 ' + size + ' ' + size + '">' + rings + spokes + '<polygon class="radar-poly" points="' + dataPts + '"/>' + dots + labels + '</svg>';
  }

  function renderDashboard() {
    isDashboardMode = true;
    isSearchMode = false;
    isWrongBookMode = false;
    exitPlan();
    const dashBtn = document.getElementById('btn-dashboard');
    if (dashBtn) dashBtn.classList.add('active');
    document.getElementById('btn-wrong-book').textContent = '📕 错题本';
    document.getElementById('search-input').value = '';
    closeDetail();

    const sm2 = isSM2Enabled();
    const subjects = window.KB_DATA.subjects;

    let total = 0, known = 0, learning = 0;
    const subjStats = subjects.map(subj => {
      let st = 0, sk = 0, sl = 0;
      for (const ch of subj.chapters) {
        for (const pt of ch.points) {
          st++; total++;
          const p = getProgress(pt.id);
          if (p.status === 'known') { sk++; known++; }
          if (p.status === 'learning' || p.wrong) { sl++; learning++; }
        }
      }
      return { subj, total: st, known: sk, learning: sl, pct: st > 0 ? Math.round(sk / st * 100) : 0 };
    });

    const coverage = computeCoverage();
    const queue = computeReviewQueue();

    const bc = document.getElementById('breadcrumb');
    bc.innerHTML = '<span>进度看板</span>';

    const area = document.getElementById('content-area');
    area.innerHTML = `
      <div class="dashboard">
        <div class="dash-header">
          <h2>📊 进度看板</h2>
          <label class="sm2-toggle">
            <input type="checkbox" id="sm2-toggle" ${sm2 ? 'checked' : ''}>
            <span>启用 SM-2 间隔重复</span>
          </label>
        </div>

        <div class="dash-kpis">
          <div class="kpi-card k-mauve">
            <span class="kpi-num">${coverage}%</span>
            <span class="kpi-label">加权掌握度</span>
          </div>
          <div class="kpi-card k-green">
            <span class="kpi-num">${known}<span style="font-size:.9rem;color:var(--text-muted)"> / ${total}</span></span>
            <span class="kpi-label">已掌握考点</span>
          </div>
          <div class="kpi-card k-yellow">
            <span class="kpi-num">${learning}</span>
            <span class="kpi-label">待复习</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-num">${queue.length}</span>
            <span class="kpi-label">${sm2 ? '今日待复习' : '复习队列'}</span>
          </div>
        </div>

        <div class="dash-grid">
          <div class="dash-panel">
            <h3>📈 各科掌握度</h3>
            <div class="bar-chart">
              ${subjStats.map(s => `
                <div class="bar-row">
                  <span class="bar-label"><span class="bar-ico">${SUBJECT_ICONS[s.subj.id] || '📘'}</span>${s.subj.name}<span class="bar-w">${s.subj.weight}%</span></span>
                  <div class="bar-track"><div class="bar-fill" style="width:${s.pct}%"></div></div>
                  <span class="bar-val">${s.pct}%</span>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="dash-panel">
            <h3>🕸️ 能力雷达</h3>
            <div class="radar-wrap">${buildRadarSVG(subjStats.map(s => s.subj), subjStats.map(s => s.pct / 100))}</div>
          </div>
        </div>

        <div class="dash-panel" style="margin-bottom:14px">
          <h3>🔁 复习队列 <span style="color:var(--text-muted);font-weight:400;font-size:.8rem">(${queue.length})</span></h3>
          ${queue.length === 0
            ? `<div class="queue-empty">🎉 ${sm2 ? '今天没有待复习的考点，规划得不错！' : '当前没有待复习考点。'}</div>`
            : `
              <div class="queue-actions" style="margin-bottom:14px">
                <button class="btn-known" id="btn-start-queue">🔄 开始复习 (${queue.length})</button>
                ${sm2 ? '<span style="color:var(--text-muted);font-size:.76rem">按 SM-2 计划推送，到期自动进入队列</span>' : '<span style="color:var(--text-muted);font-size:.76rem">含「学习中」与「错题」考点</span>'}
              </div>
              <ul class="queue-list">
                ${queue.map(q => `
                  <li class="queue-item" data-point="${q.point.id}">
                    <span class="q-title">${q.point.title}</span>
                    <span class="q-meta">${q.subject.name} · ${q.chapter.name}</span>
                    ${sm2
                      ? `<span class="q-due ${q.overdue ? 'overdue' : ''}">${q.overdue ? '逾期 ' + q.p.due : '到期 ' + q.p.due}</span>`
                      : `<span class="q-due ${q.overdue ? 'overdue' : ''}">${q.p.wrong ? '错题' : '学习中'}</span>`}
                  </li>
                `).join('')}
              </ul>
            `}
        </div>

        <div class="dash-panel">
          <h3>📋 各科明细</h3>
          <table class="mastery-table">
            <thead><tr><th>科目</th><th>权重</th><th>掌握度</th><th>已掌握 / 总数</th><th>待复习</th></tr></thead>
            <tbody>
              ${subjStats.map(s => `
                <tr>
                  <td class="mt-name">${SUBJECT_ICONS[s.subj.id] || '📘'} ${s.subj.name}</td>
                  <td>${s.subj.weight}%</td>
                  <td class="mt-bar"><span class="mt-track"><span class="mt-fill" style="width:${s.pct}%"></span></span><span class="mt-pct">${s.pct}%</span></td>
                  <td>${s.known} / ${s.total}</td>
                  <td>${s.learning}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // 绑定 SM-2 开关
    const toggle = document.getElementById('sm2-toggle');
    if (toggle) {
      toggle.addEventListener('change', (e) => {
        setSM2Enabled(e.target.checked);
        renderDashboard();
      });
    }
    // 绑定复习队列项 → 打开详情
    area.querySelectorAll('.queue-item').forEach(el => {
      el.addEventListener('click', () => openDetail(el.dataset.point));
    });
    // 绑定「开始复习」
    const startBtn = document.getElementById('btn-start-queue');
    if (startBtn) {
      startBtn.addEventListener('click', () => startQueueReview(queue));
    }
  }

  function startQueueReview(queue) {
    if (!queue || queue.length === 0) return;
    reviewQueue = [];
    for (const item of queue) {
      for (let i = 0; i < (item.point.cards || []).length; i++) {
        reviewQueue.push({ ...item.point.cards[i], pointId: item.point.id, cardIdx: i });
      }
    }
    if (reviewQueue.length === 0) return;
    reviewIndex = 0;
    reviewSource = 'queue';
    showCardModal();
  }

  function finishReview() {
    const modal = document.getElementById('card-modal');
    modal.classList.add('hidden');
    reviewQueue = [];
    reviewIndex = 0;
    const src = reviewSource;
    reviewSource = 'point';
    if (src === 'queue') {
      renderDashboard();
    } else if (src === 'wrong') {
      renderWrongBook();
    }
    updateStats();
    renderSidebar();
  }

  // ===== M3：资料索引 =====

  // 详情面板内的资料索引区块
  function buildResourcesHTML(resources) {
    return '<h4>📎 资料索引</h4>' + resources.map(r => {
      const inner = '<span class="res-type t-' + r.type + '">' + r.type + '</span>'
        + '<span class="res-label">' + escapeHtml(r.label) + '</span>'
        + (r.ref ? '<span class="res-ref">' + escapeHtml(r.ref) + '</span>' : '')
        + (r.url ? '<span class="res-go">↗</span>' : '');
      return r.url
        ? '<a class="res-item" href="' + r.url + '" target="_blank" rel="noopener noreferrer">' + inner + '</a>'
        : '<div class="res-item">' + inner + '</div>';
    }).join('');
  }

  function renderResourcesView() {
    exitDashboard();
    exitPlan();
    isResourcesMode = true;
    isSearchMode = false;
    isWrongBookMode = false;
    const resBtn = document.getElementById('btn-resources');
    if (resBtn) resBtn.classList.add('active');
    document.getElementById('btn-wrong-book').textContent = '📕 错题本';
    document.getElementById('search-input').value = '';
    closeDetail();

    const subjects = window.KB_DATA.subjects;
    const all = [];
    subjects.forEach(subj => subj.chapters.forEach(ch => ch.points.forEach(pt => {
      (pt.resources || []).forEach(r => all.push({ point: pt, subject: subj, chapter: ch, res: r }));
    })));

    const bc = document.getElementById('breadcrumb');
    bc.innerHTML = '<span>资料索引</span>';
    const area = document.getElementById('content-area');

    if (all.length === 0) {
      area.innerHTML = '<div class="no-results">📭 暂无资料索引。在 <b>data/kb.js</b> 为考点添加 <code>resources</code> 字段即可（见 README）。</div>';
      return;
    }

    const bySubject = {};
    all.forEach(x => { (bySubject[x.subject.id] = bySubject[x.subject.id] || []).push(x); });
    const subjectOptions = '<option value="">全部科目</option>' + subjects.map(s => '<option value="' + s.id + '">' + s.name + '</option>').join('');

    area.innerHTML = `
      <div class="dashboard">
        <div class="dash-header">
          <h2>📚 资料索引</h2>
          <div class="res-filter">
            <select id="res-filter-subject">${subjectOptions}</select>
            <span style="color:var(--text-muted);font-size:.78rem">共 ${all.length} 条资料 · 点 ↗ 在新标签打开外部链接</span>
          </div>
        </div>
        <div id="res-groups">
          ${subjects.map(s => {
            const items = bySubject[s.id] || [];
            if (items.length === 0) return '';
            return `
              <div class="res-group" data-subject="${s.id}">
                <h3>${SUBJECT_ICONS[s.id] || '📘'} ${s.name} <span class="res-count">(${items.length})</span></h3>
                <ul class="res-list">
                  ${items.map(x => `
                    <li class="res-row" data-point="${x.point.id}">
                      <span class="res-type t-${x.res.type}">${x.res.type}</span>
                      <span class="res-pt">${x.point.title}</span>
                      <span class="res-label">${escapeHtml(x.res.label)}</span>
                      ${x.res.ref ? '<span class="res-ref">' + escapeHtml(x.res.ref) + '</span>' : ''}
                      ${x.res.url ? '<a class="res-go" href="' + x.res.url + '" target="_blank" rel="noopener noreferrer" title="打开链接">↗</a>' : ''}
                    </li>
                  `).join('')}
                </ul>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // 点行打开对应考点详情（点链接则放行跳转）
    area.querySelectorAll('.res-row').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') return;
        openDetail(el.dataset.point);
      });
    });
    // 科目筛选
    const filter = document.getElementById('res-filter-subject');
    if (filter) {
      filter.addEventListener('change', () => {
        const v = filter.value;
        area.querySelectorAll('.res-group').forEach(g => {
          g.style.display = (!v || g.dataset.subject === v) ? '' : 'none';
        });
      });
    }
  }

  // ===== M4：计划闭环（逐周任务 + 完成度 + 跳章节） =====

  function getPlanTask(taskId) {
    const raw = safeStore.get('kp_' + taskId);
    if (!raw) return { done: false, at: null };
    try {
      const o = JSON.parse(raw);
      return { done: !!o.done, at: o.at || null };
    } catch (e) {
      return { done: false, at: null };
    }
  }

  function setPlanTask(taskId, done) {
    const rec = { done: !!done, at: done ? todayStr() : null };
    safeStore.set('kp_' + taskId, JSON.stringify(rec));
    return rec;
  }

  function computePlanProgress() {
    const plan = window.KB_PLAN;
    if (!plan || !plan.weeks) return { done: 0, total: 0, pct: 0 };
    let done = 0, total = 0;
    for (const w of plan.weeks) {
      for (const t of w.tasks) {
        total++;
        if (getPlanTask(t.id).done) done++;
      }
    }
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }

  function weekProgress(week) {
    let done = 0;
    for (const t of week.tasks) if (getPlanTask(t.id).done) done++;
    const total = week.tasks.length;
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }

  // 从计划任务跳到对应科目章节（复用既有导航）
  function openChapter(subjectId, chapterId) {
    exitPlan();
    navigateToSubject(subjectId);
    const subj = findSubjectById(subjectId);
    if (subj) navigateToChapter(subj, chapterId);
  }

  function renderPlanView() {
    const plan = window.KB_PLAN;
    if (!plan || !plan.weeks || plan.weeks.length === 0) {
      document.getElementById('content-area').innerHTML =
        '<div class="no-results">暂无计划数据。请在 data/plan.js 中填充 KB_PLAN.weeks。</div>';
      return;
    }
    isPlanMode = true;
    isSearchMode = false;
    isWrongBookMode = false;
    isDashboardMode = false;
    isResourcesMode = false;
    const planBtn = document.getElementById('btn-plan');
    if (planBtn) planBtn.classList.add('active');
    document.getElementById('btn-dashboard').classList.remove('active');
    document.getElementById('btn-resources').classList.remove('active');
    document.getElementById('btn-wrong-book').textContent = '📕 错题本';
    document.getElementById('search-input').value = '';
    closeDetail();

    const overall = computePlanProgress();
    const bc = document.getElementById('breadcrumb');
    bc.innerHTML = '<span>🗓 复习计划</span>';

    const weeksHtml = plan.weeks.map(w => {
      const wp = weekProgress(w);
      const books = (w.books && w.books.length)
        ? '<div class="plan-books">📚 书单：' + w.books.map(b => escapeHtml(b)).join(' / ') + '</div>'
        : '';
      const tasksHtml = w.tasks.map(t => {
        const rec = getPlanTask(t.id);
        const openBtn = (t.subject && t.chapter)
          ? '<button class="plan-open" data-subject="' + t.subject + '" data-chapter="' + t.chapter + '">打开章节 →</button>'
          : '';
        const pts = t.points ? '<span class="plan-task-pts">' + t.points + ' 考点</span>' : '';
        return `
          <li class="plan-task${rec.done ? ' done' : ''}" data-task="${t.id}">
            <label class="plan-check">
              <input type="checkbox" ${rec.done ? 'checked' : ''}>
              <span class="plan-task-title">${escapeHtml(t.title)}</span>
            </label>
            <div class="plan-task-meta">
              ${pts}
              <span class="plan-task-note">${escapeHtml(t.note || '')}</span>
            </div>
            ${openBtn}
          </li>`;
      }).join('');
      return `
        <div class="plan-week" data-week="${w.id}">
          <div class="plan-week-head">
            <div class="plan-week-title">
              <span class="plan-week-label">${escapeHtml(w.label)}</span>
              <span class="plan-week-range">${escapeHtml(w.range || '')}</span>
              <span class="plan-phase">${escapeHtml(w.phase || '')}</span>
            </div>
            <div class="plan-week-pct">${wp.pct}% · ${wp.done}/${wp.total}</div>
          </div>
          <div class="plan-week-bar"><div class="plan-week-fill" style="width:${wp.pct}%"></div></div>
          ${books}
          <ul class="plan-tasks">${tasksHtml}</ul>
        </div>`;
    }).join('');

    document.getElementById('content-area').innerHTML = `
      <div class="plan-view">
        <div class="plan-head">
          <div>
            <h2>🗓 ${escapeHtml(plan.meta && plan.meta.title ? plan.meta.title : '复习计划')}</h2>
            <p class="plan-sub">${escapeHtml((plan.meta && plan.meta.note) || '')} · 完成态自动存浏览器本地</p>
          </div>
          <div class="plan-overall">
            <div class="plan-overall-num">${overall.pct}%</div>
            <div class="plan-overall-label">总完成 ${overall.done}/${overall.total}</div>
          </div>
        </div>
        <div class="plan-overall-bar"><div class="plan-overall-fill" style="width:${overall.pct}%"></div></div>
        <div class="plan-weeks">${weeksHtml}</div>
      </div>`;

    // 勾选切换
    document.getElementById('content-area').querySelectorAll('.plan-task input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', function () {
        const li = cb.closest('.plan-task');
        const taskId = li.dataset.task;
        const rec = setPlanTask(taskId, cb.checked);
        li.classList.toggle('done', rec.done);
        // 更新本周围度 + 总完成度
        const weekEl = li.closest('.plan-week');
        const weekId = weekEl.dataset.week;
        const w = plan.weeks.find(x => x.id === weekId);
        const wp = weekProgress(w);
        weekEl.querySelector('.plan-week-pct').textContent = wp.pct + '% · ' + wp.done + '/' + wp.total;
        weekEl.querySelector('.plan-week-fill').style.width = wp.pct + '%';
        const ov = computePlanProgress();
        const ovNum = document.querySelector('.plan-overall-num');
        const ovBar = document.querySelector('.plan-overall-fill');
        if (ovNum) ovNum.textContent = ov.pct + '%';
        if (ovBar) ovBar.style.width = ov.pct + '%';
        document.querySelector('.plan-overall-label').textContent = '总完成 ' + ov.done + '/' + ov.total;
      });
    });

    // 跳章节
    document.getElementById('content-area').querySelectorAll('.plan-open').forEach(btn => {
      btn.addEventListener('click', function () {
        openChapter(btn.dataset.subject, btn.dataset.chapter);
      });
    });
  }

  // ===== M6：知识星图（网状知识点 + 页内自由编辑）=====

  // 6 科配色（Catppuccin 暗色系，与主题协调）
  const GROUP_COLORS = {
    physio:   '#89b4fa', // 蓝
    biochem:  '#a6e3a1', // 绿
    pathol:   '#f38ba8', // 红
    internal: '#fab387', // 橙
    surgery:  '#f9e2af', // 黄
    humanity: '#cba6f7'  // 紫
  };
  const GROUP_NAMES = {
    physio: '生理学', biochem: '生物化学', pathol: '病理学',
    internal: '内科学', surgery: '外科学', humanity: '人文医学'
  };
  const GROUP_IDS = ['physio', 'biochem', 'pathol', 'internal', 'surgery', 'humanity'];

  // 读取用户编辑覆盖层（localStorage，key=kg_user）
  function loadUserGraph() {
    try {
      const r = safeStore.get('kg_user');
      if (!r) return { nodes: [], links: [], deletedNodes: [], deletedLinks: [] };
      const o = JSON.parse(r);
      return {
        nodes: Array.isArray(o.nodes) ? o.nodes : [],
        links: Array.isArray(o.links) ? o.links : [],
        deletedNodes: Array.isArray(o.deletedNodes) ? o.deletedNodes : [],
        deletedLinks: Array.isArray(o.deletedLinks) ? o.deletedLinks : []
      };
    } catch (e) {
      return { nodes: [], links: [], deletedNodes: [], deletedLinks: [] };
    }
  }
  function saveUserGraph(o) {
    safeStore.set('kg_user', JSON.stringify(o));
  }

  // 合并种子库 + 用户覆盖，得到当前工作图；同时给每条 link 赋稳定 id
  function getRawGraph() {
    const seed = (window.KB_GRAPH && window.KB_GRAPH.nodes) ? window.KB_GRAPH : { nodes: [], links: [] };
    const user = loadUserGraph();
    const deletedNodes = new Set(user.deletedNodes);
    const deletedLinks = new Set(user.deletedLinks);

    const nodeMap = {};
    seed.nodes.forEach(n => { if (!deletedNodes.has(n.id)) nodeMap[n.id] = Object.assign({}, n); });
    user.nodes.forEach(n => { nodeMap[n.id] = Object.assign({}, n); }); // 用户覆盖/新增
    const nodes = Object.values(nodeMap);

    const links = [];
    seed.links.forEach((l, i) => {
      const id = 'seed_l' + i;
      if (deletedLinks.has(id) || deletedNodes.has(l.source) || deletedNodes.has(l.target)) return;
      links.push(Object.assign({}, l, { id: id }));
    });
    user.links.forEach(l => {
      if (deletedLinks.has(l.id) || deletedNodes.has(l.source) || deletedNodes.has(l.target)) return;
      links.push(Object.assign({}, l));
    });

    // 计算度数（用于节点大小与连接展示）
    const deg = {};
    links.forEach(l => { deg[l.source] = (deg[l.source] || 0) + 1; deg[l.target] = (deg[l.target] || 0) + 1; });
    nodes.forEach(n => { n.deg = deg[n.id] || 0; });
    return { nodes, links };
  }

  // 深拷贝，供 3d-force-graph 摄取（库会改动传入对象）
  function cloneGraph(raw) {
    return {
      nodes: raw.nodes.map(n => Object.assign({}, n)),
      links: raw.links.map(l => ({ source: l.source, target: l.target, type: l.type, label: l.label, id: l.id }))
    };
  }

  // 节点着色：搜索高亮时，命中亮、其余暗
  function starNodeColor(n) {
    if (starHighlight.size && !starHighlight.has(n.id)) return '#3a3f4b';
    return GROUP_COLORS[n.group] || '#89b4fa';
  }
  function starLinkColor(l) {
    const s = (typeof l.source === 'object' ? l.source.id : l.source);
    const t = (typeof l.target === 'object' ? l.target.id : l.target);
    // 当前选中的连线：暖黄高亮，便于看清
    if (starClickedLinkId && l.id === starClickedLinkId) return 'rgba(249,226,175,.95)';
    if (starHighlight.size) {
      if (starHighlight.has(s) && starHighlight.has(t)) return 'rgba(166,227,161,.95)';
      return 'rgba(120,126,140,.3)';
    }
    // 基础连线：加粗提亮，未点击时也清晰可见
    return 'rgba(137,180,250,.9)';
  }

  function toggleStarGraph() {
    if (isStarMode) exitStar();
    else renderStarGraph();
  }

  function renderStarGraph() {
    if (!window.KB_GRAPH) {
      document.getElementById('content-area').innerHTML =
        '<div class="no-results">知识星图数据未加载（data/graph.js 缺失）。</div>';
      return;
    }
    isStarMode = true;
    isSearchMode = false; isWrongBookMode = false;
    exitDashboard(); exitResources(); exitPlan();
    const b = document.getElementById('btn-star');
    if (b) b.classList.add('active');
    document.getElementById('btn-dashboard').classList.remove('active');
    document.getElementById('btn-resources').classList.remove('active');
    document.getElementById('btn-plan').classList.remove('active');
    document.getElementById('btn-wrong-book').textContent = '📕 错题本';
    document.getElementById('search-input').value = '';
    closeDetail();
    document.getElementById('app-container').classList.add('star-active');

    const bc = document.getElementById('breadcrumb');
    bc.innerHTML = '<span>🌌 知识星图</span>';

    const legend = GROUP_IDS.map(g =>
      `<span class="star-legend-item"><i style="background:${GROUP_COLORS[g]}"></i>${GROUP_NAMES[g]}</span>`
    ).join('');

    const area = document.getElementById('content-area');
    area.innerHTML = `
      <div id="star-graph"></div>
      <div class="star-toolbar">
        <button id="star-add-node" class="btn-pill" title="新增知识点">＋ 节点</button>
        <button id="star-add-link" class="btn-pill" title="连接两个知识点">＋ 连线</button>
        <button id="star-toggle-labels" class="btn-pill active" title="开启后，点击任意连线即可在该线上浮现关系说明">点击显说明</button>
        <button id="star-export" class="btn-pill" title="导出我的编辑">⬇ 导出</button>
        <button id="star-import" class="btn-pill" title="导入备份">⬆ 导入</button>
        <button id="star-reset-view" class="btn-pill" title="复位视角">⟳ 视角</button>
        <input type="file" id="star-import-file" accept=".json" style="display:none">
      </div>
      <div class="star-legend">${legend}</div>
      <div class="star-hint">拖拽旋转 · 滚轮缩放 · 点击节点查看/编辑 · 顶部搜索框可定位节点</div>
      <div class="star-info hidden" id="star-info"></div>
    `;

    document.getElementById('star-add-node').addEventListener('click', showAddNodeForm);
    document.getElementById('star-add-link').addEventListener('click', showAddLinkForm);
    document.getElementById('star-export').addEventListener('click', exportStar);
    document.getElementById('star-import').addEventListener('click', () => document.getElementById('star-import-file').click());
    document.getElementById('star-import-file').addEventListener('change', importStar);
    document.getElementById('star-reset-view').addEventListener('click', () => { if (starGraph) starGraph.zoomToFit(600, 40); });
    document.getElementById('star-toggle-labels').addEventListener('click', () => {
      starClickReveal = !starClickReveal;
      const btn = document.getElementById('star-toggle-labels');
      if (btn) btn.classList.toggle('active', starClickReveal);
      applyLinkLabelVisibility();
    });

    bindStarResize();

    const raw = getRawGraph();
    starLinkSprites = {};
    // 先探测 WebGL 是否可用；不可用则直接走可编辑列表降级，避免 3D 初始化抛错把界面冲掉
    const webglOk = (function () {
      try {
        const c = document.createElement('canvas');
        return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
      } catch (e) { return false; }
    })();
    if (typeof window.ForceGraph3D === 'function' && webglOk) {
      try {
        const mount = document.getElementById('star-graph');
        const w = area.clientWidth || window.innerWidth;
        const h = area.clientHeight || window.innerHeight;
        starGraph = window.ForceGraph3D()(mount)
          .width(w).height(h)
          .backgroundColor('#0d1117')
          .graphData(cloneGraph(raw))
          .nodeId('id')
          .nodeVal(n => 2 + (n.deg || 0) * 0.6)
          .nodeColor(starNodeColor)
          .nodeOpacity(0.95)
          .nodeLabel(n => `<div style="padding:4px 8px"><b>${escapeHtml(n.name)}</b><br><span style="color:#9aa0ac;font-size:11px">${GROUP_NAMES[n.group] || n.group}</span></div>`)
          .nodeThreeObjectExtend(false)
          .linkColor(starLinkColor)
          .linkWidth(1.2)
          .linkOpacity(0.9)
          .linkDirectionalArrowLength(2.2)
          .linkDirectionalArrowRelPos(1)
          .linkDirectionalArrowColor(starLinkColor)
          .linkLabel(l => {
            const s = nodeNameOf(raw, l.source), t = nodeNameOf(raw, l.target);
            return `<div style="padding:3px 7px">${escapeHtml(s)} → ${escapeHtml(t)}<br><span style="color:#9aa0ac;font-size:11px">${escapeHtml(l.type || '')}${l.label ? ' · ' + escapeHtml(l.label) : ''}</span></div>`;
          })
        .onNodeClick(n => { starHighlight.clear(); starClickedLinkId = null; applyLinkLabelVisibility(); if (starGraph) { starGraph.nodeColor(starGraph.nodeColor()); starGraph.linkColor(starGraph.linkColor()); } showNodeInfo(n.id); focusNode(n); })
        .onLinkClick(l => { starClickedLinkId = l.id; applyLinkLabelVisibility(); if (starGraph) starGraph.linkColor(starGraph.linkColor()); showLinkInfo(l); })
        .onBackgroundClick(() => { starClickedLinkId = null; applyLinkLabelVisibility(); if (starGraph) starGraph.linkColor(starGraph.linkColor()); });
        applyLinkLabelVisibility(); // 初始全部隐藏，仅点击的连线才显示
        // 引擎稳定后自动适配视角
        starGraph.onEngineStop(() => { try { starGraph.zoomToFit(500, 50); } catch (e) {} });
        // 在连线中点渲染关系说明文字（需 three-spritetext；缺失则跳过，仅显示普通连线）
        // 默认不显示；仅当用户点击某条连线（且开启「点击显说明」）时，该线才浮现说明
        if (typeof window.SpriteText === 'function') {
          starGraph
            .linkThreeObject(l => {
              const text = (l.type ? l.type + '：' : '') + (l.label || '');
              const sp = new window.SpriteText(text.length > 22 ? text.slice(0, 22) + '…' : text);
              sp.__linkId = l.id;
              starLinkSprites[l.id] = sp;
              sp.color = '#e8ecf4';             // 浅色文字
              sp.backgroundColor = false;        // 去掉白底框，避免覆盖节点
              sp.padding = 0;
              sp.borderRadius = 0;
              sp.fontSize = 2.2;                 // 小字号
              sp.fontWeight = 600;
              sp.sizeAttenuation = false;        // 文字大小不随相机距离缩放
              sp.strokeColor = 'rgba(13,17,23,.85)';  // 深色描边在暗色底上增加可读
              sp.strokeWidth = 0.18;
              return sp;
            })
            .linkPositionUpdate((obj, coords) => {
              if (!obj) return;
              const s = coords.start, e = coords.end;
              obj.position.set((s.x + e.x) / 2, (s.y + e.y) / 2, (s.z + e.z) / 2);
              obj.visible = starClickReveal && obj.__linkId === starClickedLinkId;
            });
        }
      } catch (e) {
        console.warn('3D 渲染初始化失败，降级为列表视图：', e);
        starGraph = null;
        renderStarFallback(raw);
      }
    } else {
      // CDN 未加载（离线/被拦截）：降级为可编辑的列表视图
      renderStarFallback(raw);
    }
  }

  function nodeNameOf(raw, ref) {
    const id = (typeof ref === 'object' && ref) ? ref.id : ref;
    const n = raw.nodes.find(x => x.id === id);
    return n ? n.name : String(id);
  }

  function focusNode(node) {
    if (!starGraph || node == null || node.x === undefined) return;
    const dist = 140;
    const r = Math.hypot(node.x, node.y, node.z || 1) || 1;
    const ratio = 1 + dist / r;
    starGraph.cameraPosition({ x: node.x * ratio, y: node.y * ratio, z: node.z * ratio }, node, 800);
  }

  function bindStarResize() {
    if (bindStarResize._bound) return;
    bindStarResize._bound = true;
    window.addEventListener('resize', function () {
      if (!isStarMode || !starGraph) return;
      const area = document.getElementById('content-area');
      if (area) starGraph.width(area.clientWidth).height(area.clientHeight);
    });
  }

  // 即时切换各连线说明的可见性（仅被点击的连线显示）
  function applyLinkLabelVisibility() {
    Object.keys(starLinkSprites).forEach(id => {
      const sp = starLinkSprites[id];
      if (sp) sp.visible = starClickReveal && id === starClickedLinkId;
    });
  }

  // —— 搜索：在星图中高亮并飞向命中节点 ——
  function starSearch(q) {
    starHighlight.clear();
    if (!q) { if (starGraph) starGraph.nodeColor(starGraph.nodeColor()); hideStarInfo(); return; }
    const raw = getRawGraph();
    const hits = raw.nodes.filter(n =>
      (n.name + ' ' + (n.tags || []).join(' ') + ' ' + (n.body || '')).toLowerCase().includes(q));
    hits.forEach(n => starHighlight.add(n.id));
    if (starGraph) {
      starGraph.nodeColor(starGraph.nodeColor());
      const gn = starGraph.graphData().nodes.find(x => x.id === (hits[0] && hits[0].id));
      focusNode(gn);
    }
  }

  // —— 节点信息 / 编辑面板 ——
  function showNodeInfo(id) {
    const raw = getRawGraph();
    const node = raw.nodes.find(n => n.id === id);
    if (!node) return;
    const info = document.getElementById('star-info');
    const conns = raw.links.filter(l => l.source === id || l.target === id);
    const connHtml = conns.map(l => {
      const isSrc = l.source === id;
      const otherId = isSrc ? l.target : l.source;
      const other = raw.nodes.find(n => n.id === otherId);
      const arrow = isSrc ? '→' : '←';
      return `<li class="star-conn">
        <span class="star-conn-type">${escapeHtml(l.type || '关联')}</span>
        <span class="star-conn-node">${arrow} ${escapeHtml(other ? other.name : otherId)}</span>
        <button class="star-conn-del" data-link="${escapeHtml(l.id)}" title="删除此连线">✕</button>
        ${l.label ? `<span class="star-conn-label">${escapeHtml(l.label)}</span>` : ''}
      </li>`;
    }).join('') || '<li class="star-conn-none">暂无连线，点「＋连线」建立关系</li>';

    const refsHtml = (node.refs && node.refs.length)
      ? node.refs.map(r => `<button class="star-ref-btn" data-ref="${escapeHtml(r)}">查看考点 →</button>`).join(' ')
      : '';

    info.innerHTML = `
      <div class="star-info-head">
        <span class="star-info-badge" style="background:${GROUP_COLORS[node.group] || '#89b4fa'}">${GROUP_NAMES[node.group] || node.group}</span>
        <button class="btn-icon" id="star-info-close">✕</button>
      </div>
      <h3 class="star-info-title">${escapeHtml(node.name)}</h3>
      <div class="star-info-tags">${(node.tags || []).map(t => `<span class="point-tag">${escapeHtml(t)}</span>`).join('')}</div>
      <div class="star-info-body">${(node.body || '').split('\n').filter(Boolean).map(l => `<p>${escapeHtml(l)}</p>`).join('')}</div>
      ${refsHtml ? `<div class="star-info-refs">${refsHtml}</div>` : ''}
      <div class="star-info-section-title">连接 (${conns.length})</div>
      <ul class="star-conns">${connHtml}</ul>
      <div class="star-info-actions">
        <button class="btn-pill" id="star-edit-node">✎ 编辑</button>
        <button class="btn-wrong" id="star-del-node">🗑 删除</button>
      </div>
    `;
    info.classList.remove('hidden');

    document.getElementById('star-info-close').addEventListener('click', hideStarInfo);
    info.querySelectorAll('.star-conn-del').forEach(btn =>
      btn.addEventListener('click', () => deleteLink(btn.dataset.link)));
    info.querySelectorAll('.star-ref-btn').forEach(btn =>
      btn.addEventListener('click', () => jumpToKbPoint(btn.dataset.ref)));
    document.getElementById('star-edit-node').addEventListener('click', () => showNodeEditForm(id));
    document.getElementById('star-del-node').addEventListener('click', () => {
      if (confirm('确定删除知识点「' + node.name + '」及其相关连线？')) deleteNode(id);
    });
  }

  function showLinkInfo(l) {
    const raw = getRawGraph();
    const sId = (typeof l.source === 'object' && l.source) ? l.source.id : l.source;
    const tId = (typeof l.target === 'object' && l.target) ? l.target.id : l.target;
    const info = document.getElementById('star-info');
    info.innerHTML = `
      <div class="star-info-head">
        <span class="star-info-badge" style="background:#45475a">连线</span>
        <button class="btn-icon" id="star-info-close">✕</button>
      </div>
      <h3 class="star-info-title">${escapeHtml(nodeNameOf(raw, sId))} → ${escapeHtml(nodeNameOf(raw, tId))}</h3>
      <div class="star-info-body"><p><b>关系：</b>${escapeHtml(l.type || '关联')}</p>${l.label ? '<p>' + escapeHtml(l.label) + '</p>' : ''}</div>
      <div class="star-info-actions">
        <button class="btn-wrong" id="star-del-link">🗑 删除连线</button>
      </div>
    `;
    info.classList.remove('hidden');
    document.getElementById('star-info-close').addEventListener('click', hideStarInfo);
    document.getElementById('star-del-link').addEventListener('click', () => deleteLink(l.id));
  }

  function hideStarInfo() {
    const info = document.getElementById('star-info');
    if (info) info.classList.add('hidden');
  }

  // —— 表单：新增/编辑节点 & 新增连线 ——
  function groupOptions(selected) {
    return GROUP_IDS.map(g =>
      `<option value="${g}"${g === selected ? ' selected' : ''}>${GROUP_NAMES[g]}</option>`).join('');
  }

  function showAddNodeForm() {
    const info = document.getElementById('star-info');
    info.innerHTML = `
      <div class="star-info-head">
        <span class="star-info-badge" style="background:#a6e3a1">新增节点</span>
        <button class="btn-icon" id="star-info-close">✕</button>
      </div>
      <div class="star-form">
        <label>名称<input type="text" id="f-node-name" placeholder="如：肝性脑病"></label>
        <label>科目<select id="f-node-group">${groupOptions('physio')}</select></label>
        <label>标签（逗号分隔）<input type="text" id="f-node-tags" placeholder="如：消化,神经"></label>
        <label>正文<textarea id="f-node-body" rows="4" placeholder="一句话讲清这个概念…"></textarea></label>
        <label>回链考点 id（可选，逗号分隔）<input type="text" id="f-node-refs" placeholder="如：p_internal_001"></label>
      </div>
      <div class="star-info-actions">
        <button class="btn-known" id="f-node-save">✓ 保存</button>
        <button class="btn-pill" id="f-node-cancel">取消</button>
      </div>
    `;
    info.classList.remove('hidden');
    document.getElementById('star-info-close').addEventListener('click', hideStarInfo);
    document.getElementById('f-node-cancel').addEventListener('click', hideStarInfo);
    document.getElementById('f-node-save').addEventListener('click', () => {
      const name = document.getElementById('f-node-name').value.trim();
      if (!name) { alert('请填写名称'); return; }
      const tags = document.getElementById('f-node-tags').value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
      const refs = document.getElementById('f-node-refs').value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
      const node = {
        id: 'u_' + Date.now().toString(36) + Math.floor(Math.random() * 1000),
        name,
        group: document.getElementById('f-node-group').value,
        tags,
        body: document.getElementById('f-node-body').value.trim(),
        refs
      };
      const user = loadUserGraph();
      user.nodes.push(node);
      saveUserGraph(user);
      hideStarInfo();
      refreshStar();
    });
  }

  function showNodeEditForm(id) {
    const raw = getRawGraph();
    const node = raw.nodes.find(n => n.id === id);
    if (!node) return;
    const info = document.getElementById('star-info');
    info.innerHTML = `
      <div class="star-info-head">
        <span class="star-info-badge" style="background:#89b4fa">编辑节点</span>
        <button class="btn-icon" id="star-info-close">✕</button>
      </div>
      <div class="star-form">
        <label>名称<input type="text" id="f-node-name" value="${escapeHtml(node.name)}"></label>
        <label>科目<select id="f-node-group">${groupOptions(node.group)}</select></label>
        <label>标签（逗号分隔）<input type="text" id="f-node-tags" value="${escapeHtml((node.tags || []).join(','))}"></label>
        <label>正文<textarea id="f-node-body" rows="4">${escapeHtml(node.body || '')}</textarea></label>
        <label>回链考点 id（可选，逗号分隔）<input type="text" id="f-node-refs" value="${escapeHtml((node.refs || []).join(','))}"></label>
      </div>
      <div class="star-info-actions">
        <button class="btn-known" id="f-node-save">✓ 保存</button>
        <button class="btn-pill" id="f-node-cancel">取消</button>
      </div>
    `;
    info.classList.remove('hidden');
    document.getElementById('star-info-close').addEventListener('click', hideStarInfo);
    document.getElementById('f-node-cancel').addEventListener('click', hideStarInfo);
    document.getElementById('f-node-save').addEventListener('click', () => {
      const name = document.getElementById('f-node-name').value.trim();
      if (!name) { alert('请填写名称'); return; }
      const tags = document.getElementById('f-node-tags').value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
      const refs = document.getElementById('f-node-refs').value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
      const updated = {
        id, name,
        group: document.getElementById('f-node-group').value,
        tags, body: document.getElementById('f-node-body').value.trim(), refs
      };
      const user = loadUserGraph();
      const idx = user.nodes.findIndex(n => n.id === id);
      if (idx >= 0) user.nodes[idx] = updated;
      else user.nodes.push(updated); // 覆盖种子节点
      saveUserGraph(user);
      hideStarInfo();
      refreshStar();
      showNodeInfo(id);
    });
  }

  function showAddLinkForm() {
    const raw = getRawGraph();
    const opts = raw.nodes.map(n => `<option value="${n.id}">${escapeHtml(n.name)}</option>`).join('');
    const info = document.getElementById('star-info');
    info.innerHTML = `
      <div class="star-info-head">
        <span class="star-info-badge" style="background:#f9e2af">新增连线</span>
        <button class="btn-icon" id="star-info-close">✕</button>
      </div>
      <div class="star-form">
        <label>起点（源）<select id="f-link-src">${opts}</select></label>
        <label>终点（目标）<select id="f-link-tgt">${opts}</select></label>
        <label>关系类型<input type="text" id="f-link-type" placeholder="如：病因 / 机制 / 先修"></label>
        <label>说明（可选）<input type="text" id="f-link-label" placeholder="一句话描述关系"></label>
      </div>
      <div class="star-info-actions">
        <button class="btn-known" id="f-link-save">✓ 保存</button>
        <button class="btn-pill" id="f-link-cancel">取消</button>
      </div>
    `;
    info.classList.remove('hidden');
    document.getElementById('star-info-close').addEventListener('click', hideStarInfo);
    document.getElementById('f-link-cancel').addEventListener('click', hideStarInfo);
    document.getElementById('f-link-save').addEventListener('click', () => {
      const source = document.getElementById('f-link-src').value;
      const target = document.getElementById('f-link-tgt').value;
      if (!source || !target) { alert('请选择两端节点'); return; }
      if (source === target) { alert('起点和终点不能相同'); return; }
      const user = loadUserGraph();
      user.links.push({
        id: 'ul_' + Date.now().toString(36) + Math.floor(Math.random() * 1000),
        source, target,
        type: document.getElementById('f-link-type').value.trim() || '关联',
        label: document.getElementById('f-link-label').value.trim()
      });
      saveUserGraph(user);
      hideStarInfo();
      refreshStar();
    });
  }

  // —— 删除 ——
  function deleteNode(id) {
    const user = loadUserGraph();
    if (id.indexOf('u_') === 0) {
      user.nodes = user.nodes.filter(n => n.id !== id);
      user.links = user.links.filter(l => l.source !== id && l.target !== id);
    } else {
      user.deletedNodes.push(id);
      // 删除种子节点的同时，去掉引用它的用户连线
      user.links = user.links.filter(l => l.source !== id && l.target !== id);
    }
    saveUserGraph(user);
    hideStarInfo();
    refreshStar();
  }
  function deleteLink(linkId) {
    const user = loadUserGraph();
    if (linkId.indexOf('seed_l') === 0) user.deletedLinks.push(linkId);
    else user.links = user.links.filter(l => l.id !== linkId);
    saveUserGraph(user);
    hideStarInfo();
    refreshStar();
  }

  // —— 刷新（根据当前是否 3D 渲染决定更新方式）——
  function refreshStar() {
    const raw = getRawGraph();
    if (starGraph) {
      starGraph.graphData(cloneGraph(raw));
    } else {
      renderStarFallback(raw);
    }
  }

  // —— 从星图跳转到 M1 考点详情 ——
  function jumpToKbPoint(refId) {
    exitStar();
    document.getElementById('search-input').value = '';
    openDetail(refId);
  }

  // —— 导出 / 导入 我的编辑 ——
  function exportStar() {
    const user = loadUserGraph();
    const data = JSON.stringify(user, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '星图编辑_' + todayStr() + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function importStar(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.links)) {
          throw new Error('格式不正确');
        }
        const merged = {
          nodes: data.nodes,
          links: data.links,
          deletedNodes: Array.isArray(data.deletedNodes) ? data.deletedNodes : [],
          deletedLinks: Array.isArray(data.deletedLinks) ? data.deletedLinks : []
        };
        saveUserGraph(merged);
        alert('已导入 ' + merged.nodes.length + ' 个节点、' + merged.links.length + ' 条连线');
        refreshStar();
      } catch (err) {
        alert('导入失败：' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // —— 降级列表视图（CDN 不可用时仍可编辑）——
  function renderStarFallback(raw) {
    const mount = document.getElementById('star-graph');
    if (!mount) return;
    const nodeItems = raw.nodes.map(n =>
      `<li class="star-li" data-node="${n.id}">
        <i class="star-dot" style="background:${GROUP_COLORS[n.group] || '#89b4fa'}"></i>
        <span class="star-li-name">${escapeHtml(n.name)}</span>
        <span class="star-li-grp">${GROUP_NAMES[n.group] || n.group}</span>
        <span class="star-li-deg">${n.deg || 0} 连</span>
      </li>`).join('');
    mount.innerHTML = `
      <div class="star-fallback">
        <div class="star-fallback-note">⚠️ 3D 星图未能启用（可能离线、网络拦截，或当前浏览器未开启 WebGL）。已切换为可编辑列表视图，新增/连线/编辑功能完全可用；换用支持 WebGL 的浏览器并联网即可看到星河可视化。</div>
        <ul class="star-list">${nodeItems}</ul>
      </div>`;
    mount.querySelectorAll('.star-li').forEach(li =>
      li.addEventListener('click', () => showNodeInfo(li.dataset.node)));
  }

  function exitStar() {
    isStarMode = false;
    starHighlight.clear();
    const b = document.getElementById('btn-star');
    if (b) b.classList.remove('active');
    document.getElementById('app-container').classList.remove('star-active');
    if (starGraph) {
      try { if (typeof starGraph.pauseAnimation === 'function') starGraph.pauseAnimation(); } catch (e) {}
      starGraph = null;
    }
    document.getElementById('search-input').value = '';
    // 回到默认浏览态（欢迎页）
    const bc = document.getElementById('breadcrumb');
    if (bc) bc.innerHTML = '';
    const area = document.getElementById('content-area');
    if (area) area.innerHTML = `
      <div class="welcome">
        <h2>👋 欢迎使用 306 考研复习系统</h2>
        <p>点击左侧科目开始浏览考点，或使用上方搜索框查找内容。</p>
        <p>目标：天津医科大学 精神病与精神卫生学 专硕 (105105)</p>
      </div>`;
  }

  // ===== 启动 =====
  function boot() {
    try {
      init();
    } catch (err) {
      console.error(err);
      showFatal(err);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
