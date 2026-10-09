// ==UserScript==
// @name         Plex 中文番剧 MAL 匹配助手
// @namespace    https://github.com/haomingz/userscripts
// @version      1.1.0
// @description  匹配 Plex 中文番剧标题，展示 MAL 地址，并辅助 MAL-Sync 关联。
// @author       haomingz
// @match        https://app.plex.tv/*
// @match        http://localhost:32400/web/*
// @match        http://127.0.0.1:32400/web/*
// @run-at       document-start
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @connect      raw.githubusercontent.com
// @connect      api.jikan.moe
// @homepageURL  https://github.com/haomingz/userscripts/tree/master/plex
// @supportURL   https://github.com/haomingz/userscripts/issues
// ==/UserScript==

/*
 * 中文别名及站点映射来自 bangumi-data（CC BY 4.0）。
 * 独立脚本，不访问 MAL-Sync 的私有存储，不修改 Plex 媒体库。
 */
(function () {
  'use strict';

  const DATA_URL = 'https://raw.githubusercontent.com/bangumi-data/bangumi-data/master/dist/data.json';
  const JIKAN_URL = 'https://api.jikan.moe/v4';
  const PREFIX = 'plex-chinese-mal:v1:';
  const WEEK = 7 * 24 * 60 * 60 * 1000;

  function positiveId(value) {
    const text = String(value ?? '').trim();
    if (!/^[1-9]\d*$/.test(text)) return null;
    const id = Number(text);
    return Number.isSafeInteger(id) ? id : null;
  }

  function parseMalId(value) {
    const text = String(value ?? '').trim();
    if (/^[1-9]\d*$/.test(text)) return positiveId(text);
    try {
      const url = new URL(text);
      if (url.protocol !== 'https:' || !['myanimelist.net', 'www.myanimelist.net'].includes(url.hostname)) return null;
      if (url.username || url.password || url.port) return null;
      return positiveId(url.pathname.match(/^\/anime\/([1-9]\d*)(?:\/|$)/)?.[1]);
    } catch {
      return null;
    }
  }

  function chineseNumber(text) {
    if (/^\d+$/.test(text)) return Number(text);
    const digits = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
    if (text === '十') return 10;
    if (text.includes('十')) {
      const [tens, ones] = text.split('十');
      return (digits[tens] || 1) * 10 + (digits[ones] || 0);
    }
    return digits[text] || null;
  }

  function cleanTitle(value) {
    return String(value ?? '').normalize('NFKC')
      .replace(/\[(?:[^\]]*(?:\d{3,4}p|HEVC|AVC|x26[45]|WEB-DL|BluRay|字幕|简繁|中字)[^\]]*)\]/gi, ' ')
      .replace(/\s+(?:S\d{1,2}E\d{1,3}|E(?:P)?\s*\d{1,3})\s*$/i, '')
      .replace(/\s*第[\d一二三四五六七八九十百]+[集话話]\s*$/, '')
      .replace(/\s*\((?:19|20)\d{2}\)\s*$/, '')
      .replace(/\s+/g, ' ').trim();
  }

  function titleParts(value) {
    let title = cleanTitle(value);
    let season = null;
    const match = title.match(/\s*(?:第([\d一二两三四五六七八九十]+)[季期]|(?:season\s*|s)(\d{1,2})|(\d{1,2})(?:st|nd|rd|th)\s+season)\s*$/i);
    if (match) {
      season = chineseNumber(match[1] || match[2] || match[3]);
      title = title.slice(0, match.index).trim();
    }
    const normalize = text => text.toLowerCase().replace(/[\p{P}\p{Z}\p{S}\s]/gu, '');
    const base = normalize(title);
    return { base, season, key: base + (season ? `season${season}` : '') };
  }

  function similarity(left, right) {
    if (!left || !right) return 0;
    if (left === right) return 1;
    if (left.length < 2 || right.length < 2) return 0;
    const pairs = new Map();
    for (let i = 0; i < left.length - 1; i++) {
      const pair = left.slice(i, i + 2);
      pairs.set(pair, (pairs.get(pair) || 0) + 1);
    }
    let intersection = 0;
    for (let i = 0; i < right.length - 1; i++) {
      const pair = right.slice(i, i + 2);
      const count = pairs.get(pair) || 0;
      if (count) { intersection++; pairs.set(pair, count - 1); }
    }
    return 2 * intersection / (left.length + right.length - 2);
  }

  function makeEntry(item) {
    if (!item || typeof item.title !== 'string') return null;
    const translations = item.titleTranslate || {};
    const strings = values => Array.isArray(values) ? values.filter(value => typeof value === 'string' && value.trim()) : [];
    const aliases = [...new Set([item.title, ...Object.values(translations).flatMap(strings)])];
    const sites = Array.isArray(item.sites) ? item.sites : [];
    const malId = positiveId(sites.find(site => site?.site === 'mal')?.id);
    const bgmId = positiveId(sites.find(site => site?.site === 'bangumi')?.id);
    const year = Number(String(item.begin || '').slice(0, 4)) || null;
    return {
      title: item.title,
      chinese: strings(translations['zh-Hans'])[0] || strings(translations['zh-Hant'])[0] || item.title,
      searchTitle: strings(translations.en)[0] || item.title,
      aliases, parts: aliases.map(titleParts), malId, bgmId, year,
      type: String(item.type || ''), source: 'bangumi-data',
    };
  }

  function rankEntries(entries, query, year = null) {
    const wanted = titleParts(query);
    if (!wanted.base) return [];
    const ranked = [];
    for (const entry of entries) {
      let score = 0;
      let exact = false;
      for (const part of entry.parts) {
        // 保留季数、剧场版、OVA 等信息；相似标题只作为候选。
        const equal = part.key === wanted.key;
        let value = similarity(part.key, wanted.key);
        if (wanted.season && part.season !== wanted.season) value *= 0.65;
        if (equal) exact = true;
        score = Math.max(score, value);
      }
      if (score < 0.35) continue;
      const yearMatch = Boolean(year && entry.year === Number(year));
      ranked.push({ ...entry, score, exact, yearMatch });
    }
    return ranked.sort((a, b) => Number(b.exact) - Number(a.exact)
      || Number(b.yearMatch) - Number(a.yearMatch) || b.score - a.score
      || (b.year || 0) - (a.year || 0));
  }

  function autoCandidate(candidates, context) {
    if (context?.season === 0 || context?.uncertainSeason) return null; // 特别篇、未知季不能按正篇推断。
    // Plex 的 Season 2 可能代表后半篇，必须手动核对 MAL 的分季。
    if (context?.season > 1) return null;
    const exact = candidates.filter(item => item.exact);
    const eligible = context?.year ? exact.filter(item => item.year === Number(context.year)) : exact;
    if (!eligible.length || eligible.some(item => !item.malId)) return null;
    if (new Set(eligible.map(item => item.malId)).size !== 1) return null;
    return eligible[0];
  }

  function metadataPath(value) {
    try {
      const url = new URL(String(value), 'https://app.plex.tv');
      return url.pathname.match(/^\/library\/metadata\/\d+(?:\/grandchildren)?$/) ? url.pathname : null;
    } catch { return null; }
  }

  function sanitizeMetadata(value) {
    if (!value || !['show', 'season', 'episode', 'movie'].includes(value.type)) return null;
    if (!positiveId(value.ratingKey)) return null;
    const result = { type: value.type, ratingKey: String(value.ratingKey) };
    for (const key of ['title', 'parentTitle', 'grandparentTitle', 'librarySectionTitle']) {
      if (typeof value[key] === 'string') result[key] = value[key].slice(0, 500);
    }
    for (const key of ['parentRatingKey', 'grandparentRatingKey']) {
      if (positiveId(value[key])) result[key] = String(value[key]);
    }
    for (const key of ['index', 'parentIndex', 'year']) {
      if (Number.isSafeInteger(value[key]) && value[key] >= 0) result[key] = value[key];
    }
    if (typeof value.skipParent === 'boolean') result.skipParent = value.skipParent;
    return result;
  }

  function contextFromMetadata(meta, server = '') {
    if (!meta) return null;
    let title = meta.title || '';
    let series = meta.ratingKey;
    let season = null;
    if (meta.type === 'season') {
      title = meta.parentTitle || title;
      series = meta.parentRatingKey || meta.ratingKey;
      season = Number.isSafeInteger(meta.index) ? meta.index : null;
    } else if (meta.type === 'episode') {
      title = meta.grandparentTitle || meta.parentTitle || '';
      series = meta.grandparentRatingKey || meta.parentRatingKey || meta.ratingKey;
      season = Number.isSafeInteger(meta.parentIndex) ? meta.parentIndex : null;
    }
    title = cleanTitle(title);
    if (!title) return null;
    const query = season > 1 && !titleParts(title).season ? `${title} 第${season}季` : title;
    const uncertainSeason = ['season', 'episode'].includes(meta.type) && season === null;
    const seasonScope = uncertainSeason
      ? ['seasonKey', meta.type === 'season' ? meta.ratingKey : (meta.parentRatingKey || meta.ratingKey)]
      : (season ?? 'show');
    return {
      title, query, year: meta.year || null, season, uncertainSeason, ratingKey: meta.ratingKey,
      scope: JSON.stringify([server, series, meta.type === 'movie' ? 'movie' : seasonScope]),
    };
  }

  function translateMetadata(meta, mapping) {
    if (!mapping?.searchTitle) return meta;
    const copy = { ...meta };
    if (meta.type === 'season') {
      copy.parentTitle = mapping.searchTitle;
      // MAL-Sync 拼接 parentTitle + title；完整季名已经包含在匹配标题中。
      copy.title = '';
    } else if (meta.type === 'episode') {
      copy.parentTitle = mapping.searchTitle;
      copy.grandparentTitle = '';
    }
    return copy;
  }

  function validMapping(value) {
    return value && positiveId(value.malId) && typeof value.searchTitle === 'string'
      && value.searchTitle.trim() && value.searchTitle.length <= 500;
  }

  const core = { positiveId, parseMalId, cleanTitle, titleParts, similarity, makeEntry, rankEntries,
    autoCandidate, metadataPath, sanitizeMetadata, contextFromMetadata, translateMetadata, validMapping };
  // Node 内置测试直接加载同一份实现；浏览器中不导出全局变量。
  if (typeof module === 'object' && module.exports && typeof window === 'undefined') {
    module.exports = core;
    return;
  }

  const state = {
    context: null, signature: '', mapping: null, candidates: [], records: new Map(),
    generation: 0, bridgeSeen: false, replaying: false, datasetPromise: null,
    entries: null, dataTime: 0, lastFetch: 0, stale: false, timer: null, ui: null,
    layoutFrame: null, anchor: null, anchorRect: null, observedLayout: new Set(),
  };

  const setting = name => GM_getValue(PREFIX + name, true);
  const mappingKey = context => PREFIX + 'mapping:' + context.scope;
  function getMapping(context) {
    const mapping = GM_getValue(mappingKey(context), null);
    return validMapping(mapping) ? mapping : null;
  }
  function currentServer() {
    return `${location.origin}:${location.hash.match(/\/server\/([^/?]+)/)?.[1] || 'local'}`;
  }
  function keyFromUrl(value) {
    try { return decodeURIComponent(value).match(/\/library\/metadata\/(\d+)/)?.[1] || ''; }
    catch { return ''; }
  }

  function requestJson(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET', url, anonymous: true, timeout: 25000,
        headers: { Accept: 'application/json' },
        onload(response) {
          if (response.status < 200 || response.status >= 300) {
            reject(new Error(response.status === 429 ? '请求过于频繁，请稍后重试' : `数据请求失败（HTTP ${response.status}）`));
            return;
          }
          try { resolve(JSON.parse(response.responseText)); }
          catch { reject(new Error('数据源返回了无效 JSON')); }
        },
        onerror: () => reject(new Error('网络请求失败，请检查数据源是否可以访问')),
        ontimeout: () => reject(new Error('数据请求超时，请稍后重试')),
      });
    });
  }

  async function loadDataset(force = false) {
    if (!force && state.entries && (Date.now() - state.dataTime < WEEK
      || (state.stale && Date.now() - state.lastFetch < 5 * 60 * 1000))) return state.entries;
    if (state.datasetPromise) return state.datasetPromise;
    state.datasetPromise = (async () => {
      const cached = GM_getValue(PREFIX + 'dataset', null);
      const valid = value => value && Array.isArray(value.items) && value.items.length > 0
        && Number.isFinite(value.time) && value.items.every(item => typeof item?.title === 'string');
      let data = cached;
      state.stale = false;
      if (force || !valid(cached) || Date.now() - cached.time >= WEEK) {
        state.lastFetch = Date.now();
        try {
          const remote = await requestJson(DATA_URL);
          // 只缓存匹配所需字段，避免把放送站点、简介等大体积数据重复写入存储。
          const items = Array.isArray(remote?.items) ? remote.items.map(item => ({
            title: item?.title, titleTranslate: item?.titleTranslate,
            begin: item?.begin, type: item?.type,
            sites: Array.isArray(item?.sites) ? item.sites.filter(site => ['mal', 'bangumi'].includes(site?.site)) : [],
          })) : null;
          data = { time: Date.now(), items };
          if (!valid(data)) throw new Error('番剧数据结构异常');
          GM_setValue(PREFIX + 'dataset', data);
        } catch (error) {
          if (!valid(cached)) throw error;
          data = cached;
          state.stale = true;
        }
      }
      state.entries = data.items.map(makeEntry).filter(Boolean);
      state.dataTime = data.time;
      return state.entries;
    })();
    try { return await state.datasetPromise; }
    finally { state.datasetPromise = null; }
  }

  // MAL-Sync 的事件携带 Plex 返回数据。原始事件处理后再发送标题副本，
  // 避免依赖同一 Window 上监听器的注册顺序或跨脚本对象的可写性。
  // 丢弃请求 URL 中的 token，记录中仅保留识别所需字段。
  window.addEventListener('malsync-xhr', event => {
    if (state.replaying) return;
    try {
      const detail = event.detail;
      const path = metadataPath(detail?.url);
      const metadata = detail?.data?.MediaContainer?.Metadata;
      if (!path || !Array.isArray(metadata)) return;
      state.bridgeSeen = true;
      for (const raw of metadata) {
        const meta = sanitizeMetadata(raw);
        if (!meta) continue;
        const recordKey = JSON.stringify([currentServer(), meta.ratingKey]);
        state.records.delete(recordKey);
        state.records.set(recordKey, { meta, path });
      }
      while (state.records.size > 100) state.records.delete(state.records.keys().next().value);
      const first = sanitizeMetadata(metadata[0]);
      const server = currentServer();
      const context = first && contextFromMetadata(first, server);
      if (context && setting('assist') && getMapping(context)) queueMicrotask(() => {
        if (currentServer() === server) {
          const mapping = getMapping(context);
          if (mapping) replayMetadata(context, mapping);
        }
      });
      scheduleRefresh();
    } catch {
      // 部分浏览器隔离脚本事件，仍可使用手动搜索、复制和纠正窗口。
    }
  }, true);

  function readContext() {
    const playerLink = document.querySelector('[class*="MetadataPosterTitle-isSecondary"] [data-testid="metadataTitleLink"]');
    const ratingKey = keyFromUrl(playerLink?.getAttribute('href') || location.hash);
    if (!ratingKey) return null;
    const record = state.records.get(JSON.stringify([currentServer(), ratingKey]));
    if (record) {
      const context = contextFromMetadata(record.meta, currentServer());
      return context ? { ...context, pageUrl: location.href } : null;
    }
    // 元数据事件尚未到达时只读取详情区域，避免把卡片或单集标题当作番剧名。
    if (playerLink) return null;
    const heading = document.querySelector('[data-testid="metadata-title"], [class*="PrePlay"] h1, h1[data-testid="metadataTitle"]');
    const title = cleanTitle(heading?.textContent || '');
    if (!title) return null;
    return { title, query: title, year: null, season: null, ratingKey, pageUrl: location.href,
      scope: JSON.stringify([currentServer(), ratingKey, 'dom']) };
  }

  function sameContext(context, generation) {
    return generation === state.generation && state.context?.scope === context.scope
      && context.pageUrl === location.href
      && (!readContext() || readContext().scope === context.scope);
  }

  function replayMetadata(context, mapping, force = false) {
    if (!force && !setting('assist')) return;
    const record = state.records.get(JSON.stringify([currentServer(), context.ratingKey]));
    if (!record) return;
    state.replaying = true;
    try {
      window.dispatchEvent(new CustomEvent('malsync-xhr', {
        detail: { source: 'fetch', url: record.path,
          data: { MediaContainer: { Metadata: [translateMetadata(record.meta, mapping)] } } },
      }));
    } finally { state.replaying = false; }
  }

  function element(tag, text, attributes = {}) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    return node;
  }
  function button(text, callback) {
    const node = element('button', text, { type: 'button' });
    node.addEventListener('click', () => Promise.resolve().then(callback).catch(error => status(error.message, true)));
    return node;
  }
  function status(text, error = false) {
    if (!state.ui) return;
    state.ui.status.textContent = text;
    state.ui.status.classList.toggle('error', error);
  }

  const FLOAT_SIZE = 40;
  const FLOAT_GAP = 8;
  const PLAYER_SELECTOR = '[class*="Player-fullPlayerContainer-"], [class*="VideoPlayerContainer-videoPlayerContainer"], video';
  const layoutObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(scheduleLayout) : null;

  function visibleRect(node) {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none'
      && style.visibility !== 'hidden' ? rect : null;
  }

  function playerExpanded(players) {
    if (document.fullscreenElement || document.webkitFullscreenElement) return true;
    return players.some(node => {
      if (node.webkitDisplayingFullscreen) return true;
      const rect = visibleRect(node);
      if (!rect) return false;
      // Plex 4 的 fullPlayerContainer 区分满窗口播放器与 miniPlayerContainer。
      if (String(node.className).includes('Player-fullPlayerContainer-')) return true;
      const width = Math.max(0, Math.min(rect.right, innerWidth) - Math.max(rect.left, 0));
      const height = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0));
      return width >= innerWidth * 0.85 && height >= innerHeight * 0.85;
    });
  }

  function scheduleLayout() {
    if (state.layoutFrame !== null) return;
    state.layoutFrame = requestAnimationFrame(() => {
      state.layoutFrame = null;
      updateLayout();
    });
  }

  function updateLayout() {
    if (!state.ui) return;
    const { host, panel } = state.ui;
    const anchor = document.querySelector('button.open-info-popup.floatbutton');
    const players = [...document.querySelectorAll(PLAYER_SELECTOR)];
    if (layoutObserver) {
      const watched = new Set([anchor, ...players].filter(Boolean));
      for (const node of state.observedLayout) if (!watched.has(node)) layoutObserver.unobserve(node);
      for (const node of watched) if (!state.observedLayout.has(node)) layoutObserver.observe(node);
      state.observedLayout = watched;
    }
    if (anchor !== state.anchor) { state.anchor = anchor; state.anchorRect = null; }
    if (anchor) {
      const rect = visibleRect(anchor);
      if (rect) state.anchorRect = { left: rect.left, top: rect.top, width: rect.width };
    }
    const reference = state.anchorRect;
    const clamp = (value, min, max) => Math.max(min, Math.min(value, Math.max(min, max)));
    // MAL-Sync 尚未显示时按其默认 56px 按钮的位置预留同样的间距。
    const x = clamp(reference ? reference.left + (reference.width - FLOAT_SIZE) / 2 : innerWidth - 88,
      FLOAT_GAP, innerWidth - FLOAT_SIZE - FLOAT_GAP);
    const y = clamp(reference ? reference.top - FLOAT_GAP - FLOAT_SIZE : innerHeight - 144,
      FLOAT_GAP, innerHeight - FLOAT_SIZE - FLOAT_GAP);
    host.style.left = `${Math.round(x)}px`;
    host.style.top = `${Math.round(y)}px`;
    const panelWidth = Math.min(390, innerWidth - 32);
    panel.style.left = `${clamp(x + FLOAT_SIZE - panelWidth, FLOAT_GAP, innerWidth - panelWidth - FLOAT_GAP) - x}px`;
    // 锚点靠近顶部时向下展开，确保面板仍有可操作的高度。
    const bottom = y + FLOAT_SIZE < 200 ? Math.min(innerHeight - FLOAT_GAP, y + FLOAT_SIZE + innerHeight * 0.7) : y + FLOAT_SIZE;
    panel.style.bottom = `${y + FLOAT_SIZE - bottom}px`;
    panel.style.setProperty('--panel-max-height', `${bottom - FLOAT_GAP}px`);
    host.hidden = playerExpanded(players);
  }

  function setPanelOpen(open, focus = false) {
    if (!state.ui) return;
    const { panel, launcher, input, host } = state.ui;
    state.ui.open = open;
    panel.hidden = !open;
    launcher.hidden = open;
    launcher.setAttribute('aria-expanded', String(open));
    GM_setValue(PREFIX + 'collapsed', !open);
    updateLayout();
    if (focus && !host.hidden) (open ? input : launcher).focus({ preventScroll: true });
  }

  function mount() {
    if (!document.body || state.ui) return;
    const host = element('div', '', { id: 'plex-chinese-mal-helper' });
    const shadow = host.attachShadow({ mode: 'open' });
    const style = element('style');
    style.textContent = `
      :host { all: initial; position: fixed; left: calc(100vw - 88px); top: calc(100vh - 144px);
        width: 40px; height: 40px; z-index: 2147483000;
        font: 13px/1.5 system-ui, sans-serif; color: #eee; color-scheme: dark; }
      :host([hidden]) { display: none !important; }
      * { box-sizing: border-box; } [hidden] { display: none !important; }
      .panel { position: absolute; bottom: 0; right: 0; display: flex; flex-direction: column;
        width: min(390px, calc(100vw - 32px)); max-height: min(70vh, 650px, var(--panel-max-height, 70vh));
        background: #202126; border: 1px solid #5c5e65; border-radius: 10px; box-shadow: 0 4px 24px #0008; }
      header { display: flex; align-items: center; justify-content: space-between; flex: none; padding: 8px 10px 8px 14px; }
      h2 { margin: 0; font: inherit; font-weight: 600; }
      main { padding: 0 14px 14px; overflow: auto; min-height: 0; }
      p { margin: 8px 0; overflow-wrap: anywhere; } form, .actions { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
      input[type=text] { min-width: 130px; flex: 1; padding: 7px; border: 1px solid #777; border-radius: 4px; background: #141519; color: #fff; }
      button { cursor: pointer; border: 1px solid #6d6f76; border-radius: 4px; background: #34363d; color: #fff; padding: 6px 9px; font: inherit; }
      button:hover { background: #494c56; } a { color: #8fc7ff; } .muted { color: #bbb; font-size: 12px; }
      .launcher { width: 40px; height: 40px; padding: 0; display: grid; place-items: center; border-radius: 50%;
        background: rgba(32, 33, 38, .5); border-color: rgba(220, 224, 235, .35); opacity: .55;
        font-size: 18px; font-weight: 600; backdrop-filter: blur(4px); transition: opacity .15s, background .15s; }
      .launcher:hover, .launcher:focus-visible { opacity: 1; background: rgba(52, 54, 61, .9); }
      button:focus-visible { outline: 2px solid #8fc7ff; outline-offset: 3px; }
      .close { border: none; background: transparent; width: 28px; height: 28px; padding: 0; font-size: 22px; }
      @media (prefers-reduced-motion: reduce) { .launcher { transition: none; } }
      .error { color: #ffb0a3; } .candidate { border-top: 1px solid #505159; padding: 8px 0; }
      label { display: block; margin-top: 6px; } .selected { border-left: 3px solid #e5a934; padding-left: 8px; }
    `;
    shadow.append(style);
    const panel = element('section', '', { class: 'panel', id: 'plex-mal-panel', role: 'dialog', 'aria-labelledby': 'plex-mal-heading' });
    const header = element('header');
    const heading = element('h2', '中文番剧 → MAL', { id: 'plex-mal-heading' });
    const close = button('×', () => setPanelOpen(false, true));
    close.className = 'close';
    close.setAttribute('aria-label', '收起中文番剧 MAL 助手');
    header.append(heading, close);
    const launcher = button('中', () => setPanelOpen(true, true));
    launcher.className = 'launcher';
    launcher.setAttribute('title', '中文番剧 → MAL');
    launcher.setAttribute('aria-label', '打开中文番剧 MAL 助手');
    launcher.setAttribute('aria-controls', 'plex-mal-panel');
    const main = element('main');
    const title = element('p', '打开番剧详情，或输入番剧标题搜索。');
    const form = element('form');
    const input = element('input', '', { type: 'text', placeholder: '中文、日文或英文番剧标题', 'aria-label': '番剧标题' });
    const search = element('button', '搜索', { type: 'submit' });
    form.append(input, search);
    form.addEventListener('submit', event => { event.preventDefault(); searchCurrent(input.value); });
    const message = element('p', '', { role: 'status', 'aria-live': 'polite', class: 'muted' });
    const selected = element('div');
    const candidates = element('div');
    const manualForm = element('form');
    const malInput = element('input', '', { type: 'text', placeholder: 'MAL ID 或 https://myanimelist.net/anime/…', 'aria-label': 'MAL ID 或网址' });
    const manualButton = element('button', '手动关联', { type: 'submit' });
    manualForm.append(malInput, manualButton);
    manualForm.addEventListener('submit', event => { event.preventDefault(); manualMapping(malInput.value); });
    main.append(title, form, message, selected, candidates, manualForm);
    for (const [key, text] of [['auto', '唯一精确匹配时自动关联'], ['assist', '为 MAL-Sync 提供匹配标题']]) {
      const label = element('label');
      const checkbox = element('input', '', { type: 'checkbox' });
      checkbox.checked = setting(key);
      checkbox.addEventListener('change', () => {
        GM_setValue(PREFIX + key, checkbox.checked);
        if (key === 'assist' && state.mapping && state.context) {
          replayMetadata(state.context, checkbox.checked ? state.mapping : null, true);
        }
      });
      label.append(checkbox, document.createTextNode(` ${text}`));
      main.append(label);
    }
    const actions = element('div', '', { class: 'actions' });
    actions.append(button('更新番剧数据', async () => {
      status('正在更新番剧数据…');
      await loadDataset(true);
      if (state.context) await searchCurrent(input.value || state.context.query);
      else status(state.stale ? '更新失败，继续使用已缓存数据。' : '番剧数据已更新。');
    }));
    main.append(actions, element('p', '标题数据：bangumi-data（CC BY 4.0）。候选请核对季数；观看进度由 MAL-Sync 处理。', { class: 'muted' }));
    panel.append(header, main);
    shadow.append(launcher, panel);
    document.body.append(host);
    state.ui = { host, panel, launcher, open: false, input, title, status: message, selected, candidates, malInput };
    shadow.addEventListener('keydown', event => {
      if (event.key === 'Escape' && state.ui.open) {
        event.preventDefault();
        event.stopPropagation();
        setPanelOpen(false, true);
      }
    });
    setPanelOpen(!GM_getValue(PREFIX + 'collapsed', true));
  }

  function renderMapping() {
    const container = state.ui.selected;
    container.replaceChildren();
    const mapping = state.mapping;
    if (!mapping) return;
    container.className = 'selected';
    const malUrl = `https://myanimelist.net/anime/${mapping.malId}`;
    container.append(element('p', `已关联：${mapping.searchTitle}`));
    container.append(element('a', `MAL #${mapping.malId}`, { href: malUrl, target: '_blank', rel: 'noopener noreferrer' }));
    const actions = element('div', '', { class: 'actions' });
    actions.append(
      button('复制 MAL 地址', () => { GM_setClipboard(malUrl, 'text'); status('MAL 地址已复制。'); }),
      button('复制匹配标题', () => { GM_setClipboard(mapping.searchTitle, 'text'); status('匹配标题已复制。'); }),
      button('填入 MAL-Sync', () => fillMalSync(mapping)),
      button('取消关联', () => {
        GM_deleteValue(mappingKey(state.context));
        state.mapping = null;
        replayMetadata(state.context, null);
        renderMapping();
        status('本助手的关联已清除；MAL-Sync 内已有的关联需要在其纠正窗口修改。');
      }),
    );
    container.append(actions);
  }

  function fillMalSync(mapping) {
    // 只操作 MAL-Sync 的纠正组件，不猜测 Plex 输入框，也不点击 Update。
    const roots = [...document.querySelectorAll('.type-correction .ms-shadow')]
      .map(host => host.shadowRoot || host);
    const inputs = roots.flatMap(root => [...root.querySelectorAll('.inputButton .group input')]);
    const input = inputs.find(node => node.parentElement.querySelector('label')?.textContent.trim() === 'URL');
    if (!input) {
      GM_setClipboard(`https://myanimelist.net/anime/${mapping.malId}`, 'text');
      status('请先打开 MAL-Sync 的纠正/关联窗口，再点“填入 MAL-Sync”。地址已复制，也可粘贴到 URL 后点击 Update。');
      return;
    }
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, `https://myanimelist.net/anime/${mapping.malId}`);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.focus();
    status('已填入 MAL-Sync 的 URL，请核对后点击其 Update 按钮完成关联。');
  }

  async function selectMapping(candidate, context, generation, automatic = false) {
    if (!sameContext(context, generation)) return;
    if (!positiveId(candidate.malId)) return;
    generation = ++state.generation;
    let canonicalTitle = candidate.searchTitle || candidate.title;
    let titleFallback = false;
    if (candidate.source === 'bangumi-data') {
      status('正在获取 MAL 的标准标题…');
      try {
        const result = await requestJson(`${JIKAN_URL}/anime/${candidate.malId}`);
        if (result.data?.mal_id !== candidate.malId || !result.data?.title) throw new Error('MAL 标题不可用');
        canonicalTitle = result.data.title;
      } catch { titleFallback = true; }
      if (!sameContext(context, generation)) return;
    }
    const mapping = {
      malId: candidate.malId, searchTitle: canonicalTitle,
      chinese: candidate.chinese || context.title, source: candidate.source,
      automatic, updatedAt: Date.now(),
    };
    if (!validMapping(mapping)) throw new Error('候选条目信息无效');
    GM_setValue(mappingKey(context), mapping);
    state.mapping = mapping;
    replayMetadata(context, mapping);
    renderMapping();
    status(`${state.stale ? '数据更新失败，使用旧缓存。' : ''}${automatic ? '唯一精确匹配已关联' : '关联已保存'}。${titleFallback ? 'MAL 标准标题查询失败，暂用数据集标题。' : ''}${state.bridgeSeen ? '已为 MAL-Sync 提供匹配标题；若已有旧关联，请用“填入 MAL-Sync”纠正。' : '可复制 MAL 地址，或填入 MAL-Sync 的纠正窗口。'}`);
  }

  function renderCandidates(candidates, context, generation) {
    state.ui.candidates.replaceChildren();
    for (const candidate of candidates.slice(0, 12)) {
      const row = element('div', '', { class: 'candidate' });
      row.append(element('p', candidate.chinese || candidate.title));
      row.append(element('p', `${candidate.searchTitle} · ${candidate.year || '年份未知'} · ${candidate.type || '类型未知'} · ${candidate.exact ? '精确匹配' : '相似候选'}`, { class: 'muted' }));
      const actions = element('div', '', { class: 'actions' });
      if (candidate.malId) {
        actions.append(element('a', `MAL #${candidate.malId}`, {
          href: `https://myanimelist.net/anime/${candidate.malId}`, target: '_blank', rel: 'noopener noreferrer',
        }));
        actions.append(button('关联此条目', () => selectMapping(candidate, context, state.generation)));
      } else {
        actions.append(button('查找 MAL 候选', () => searchJikan(candidate.searchTitle, context, state.generation)));
      }
      if (candidate.bgmId) actions.append(element('a', 'Bangumi', {
        href: `https://bgm.tv/subject/${candidate.bgmId}`, target: '_blank', rel: 'noopener noreferrer',
      }));
      row.append(actions);
      state.ui.candidates.append(row);
    }
  }

  async function searchJikan(query, context, generation) {
    if (!sameContext(context, generation)) return;
    generation = ++state.generation;
    status('正在查询 MAL 候选…');
    try {
      const result = await requestJson(`${JIKAN_URL}/anime?q=${encodeURIComponent(query)}&limit=8`);
      if (!sameContext(context, generation)) return;
      const candidates = (Array.isArray(result.data) ? result.data : []).filter(item => positiveId(item.mal_id))
        .map(item => ({ malId: item.mal_id, title: item.title,
          searchTitle: item.title || item.title_english || item.title_japanese,
          year: item.year, type: item.type, exact: false, source: 'Jikan' }));
      renderCandidates(candidates, context, generation);
      status(candidates.length ? '请核对 MAL 的季数和年份后关联。' : '没有找到 MAL 候选，请尝试手动输入 MAL ID。');
    } catch (error) { if (sameContext(context, generation)) status(error.message, true); }
  }

  async function searchCurrent(query) {
    mount();
    query = cleanTitle(query);
    if (!query) { status('请输入番剧标题。', true); return; }
    let context = readContext();
    if (!context) {
      // 没有 Plex 元数据时仅按本次页面和查询保存，不能覆盖其他番剧。
      context = { title: query, query, year: null, season: null, ratingKey: keyFromUrl(location.hash), pageUrl: location.href,
        scope: JSON.stringify([currentServer(), keyFromUrl(location.hash) || 'manual', 'query', titleParts(query).key]) };
    }
    state.context = context;
    state.mapping = getMapping(context);
    renderMapping();
    const generation = ++state.generation;
    state.ui.input.value = query;
    status('正在加载番剧数据并匹配…');
    state.ui.candidates.replaceChildren();
    try {
      const entries = await loadDataset();
      if (!sameContext(context, generation)) return;
      const candidates = rankEntries(entries, query, context.year);
      state.candidates = candidates;
      renderCandidates(candidates, context, generation);
      const match = setting('auto') && !state.mapping && query === context.query ? autoCandidate(candidates, context) : null;
      if (match) { await selectMapping(match, context, generation, true); return; }
      const stale = state.stale ? '更新失败，使用旧缓存。' : '';
      status(stale + (candidates.length ? '请核对候选的年份和季数后关联。' : '未找到候选；可更换译名或手动关联 MAL ID。'));
    } catch (error) { if (sameContext(context, generation)) status(error.message, true); }
  }

  async function manualMapping(value) {
    const id = parseMalId(value);
    if (!id) { status('请输入正整数 MAL ID 或合法的 HTTPS MAL 动画地址。', true); return; }
    if (!state.context) {
      await searchCurrent(state.ui.input.value);
      if (!state.context) return;
    }
    const context = state.context;
    const generation = ++state.generation;
    status('正在核对 MAL ID 并获取匹配标题…');
    try {
      const result = await requestJson(`${JIKAN_URL}/anime/${id}`);
      if (!sameContext(context, generation)) return;
      if (result.data?.mal_id !== id || !result.data?.title) throw new Error('未找到该 MAL 动画条目');
      await selectMapping({ malId: id, searchTitle: result.data.title, source: 'manual' }, context, generation);
    } catch (error) { if (sameContext(context, generation)) status(error.message, true); }
  }

  function refresh() {
    mount();
    if (!state.ui) return;
    const context = readContext();
    const signature = context ? JSON.stringify([context.scope, context.query, context.year]) : location.href;
    if (signature === state.signature) return;
    state.signature = signature;
    state.generation++;
    state.context = context;
    state.mapping = context ? getMapping(context) : null;
    state.ui.candidates.replaceChildren();
    state.ui.malInput.value = '';
    state.ui.input.value = context?.query || '';
    state.ui.title.textContent = context
      ? `${context.title}${context.season !== null ? ` · Plex 第 ${context.season} 季` : ''}`
      : '打开番剧详情，或输入番剧标题搜索。';
    renderMapping();
    if (!context) { status('等待 Plex 番剧元数据；也可手动输入标题。'); return; }
    if (state.mapping) {
      replayMetadata(context, state.mapping);
      status('已加载保存的关联。需要纠正 MAL-Sync 的旧结果时，使用“填入 MAL-Sync”。');
    } else if (setting('auto')) searchCurrent(context.query);
    else status('已识别番剧标题，点击搜索查看候选。');
  }

  function scheduleRefresh() {
    clearTimeout(state.timer);
    state.timer = setTimeout(refresh, 200);
  }
  window.addEventListener('hashchange', scheduleRefresh);
  window.addEventListener('popstate', scheduleRefresh);
  window.addEventListener('resize', scheduleLayout);
  document.addEventListener('fullscreenchange', updateLayout);
  document.addEventListener('webkitfullscreenchange', updateLayout);
  document.addEventListener('webkitbeginfullscreen', scheduleLayout, true);
  document.addEventListener('webkitendfullscreen', scheduleLayout, true);
  const observer = new MutationObserver(mutations => {
    const external = mutations.filter(mutation => !state.ui?.host.contains(mutation.target));
    if (external.length) scheduleLayout();
    if (external.some(mutation => mutation.type !== 'attributes' || mutation.attributeName === 'href')) scheduleRefresh();
  });
  function observeDocument() {
    if (document.documentElement) observer.observe(document.documentElement, {
      childList: true, subtree: true, characterData: true, attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'href'],
    });
  }
  observeDocument();
  document.addEventListener('DOMContentLoaded', observeDocument, { once: true });
  document.addEventListener('DOMContentLoaded', scheduleRefresh, { once: true });
  GM_registerMenuCommand('显示/收起中文番剧 MAL 助手', () => {
    mount();
    if (state.ui) setPanelOpen(!state.ui.open, true);
  });
  scheduleRefresh();
})();
