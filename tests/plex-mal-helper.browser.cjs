/* 使用独立浏览器上下文和模拟 GM API，所有 HTTP 请求在本地拦截。 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const script = fs.readFileSync(path.join(__dirname, '../plex/Plex Chinese MAL Helper.user.js'), 'utf8');
const prefix = 'plex-chinese-mal:v1:';
const baseUrl = 'https://app.plex.tv/desktop/';
const route = (id, server = 'server-a') => `${baseUrl}#!/server/${server}/details?key=%2Flibrary%2Fmetadata%2F${id}`;
const dataset = { items: [
  { title: '葬送のフリーレン', titleTranslate: { 'zh-Hans': ['葬送的芙莉莲'], 'zh-Hant': ['葬送的芙莉蓮'],
    en: ['Frieren: Beyond the Journey\'s End'] }, type: 'tv', begin: '2023-09-29',
    sites: [{ site: 'mal', id: '52991' }, { site: 'bangumi', id: '400602' }] },
  { title: '葬送のフリーレン 第2期', titleTranslate: { 'zh-Hans': ['葬送的芙莉莲 第二季'],
    en: ['Frieren Season 2'] }, type: 'tv', begin: '2026-01-01', sites: [{ site: 'mal', id: '100' }] },
] };
const first = { type: 'season', ratingKey: '2', parentRatingKey: '1', index: 1,
  title: '第1季', parentTitle: '葬送的芙莉莲', year: 2023, librarySectionTitle: 'Anime' };
const second = { ...first, ratingKey: '3', title: '第2季', index: 2, year: 2026 };
const episode = { type: 'episode', ratingKey: '10', grandparentRatingKey: '1', parentRatingKey: '2',
  parentIndex: 1, index: 4, title: '单集中文标题', parentTitle: '第1季', grandparentTitle: '葬送的芙莉莲',
  year: 2023, librarySectionTitle: 'Anime' };

function initialize(config) {
  const prefix = 'plex-chinese-mal:v1:';
  window.__storage = {
    [prefix + 'auto']: config.auto,
    [prefix + 'assist']: true,
  };
  if (typeof config.collapsed === 'boolean') window.__storage[prefix + 'collapsed'] = config.collapsed;
  if (config.cached) window.__storage[prefix + 'dataset'] = { time: Date.now() - config.cacheAge, items: config.dataset.items };
  window.__requests = [];
  window.__received = [];
  window.__clips = [];
  window.__responses = config.responses;
  window.__errors = [];
  window.addEventListener('error', event => window.__errors.push(event.message));
  window.addEventListener('unhandledrejection', event => window.__errors.push(String(event.reason)));
  const clone = value => JSON.parse(JSON.stringify(value));
  window.GM_getValue = (key, fallback) => key in window.__storage ? clone(window.__storage[key]) : fallback;
  window.GM_setValue = (key, value) => { window.__storage[key] = clone(value); };
  window.GM_deleteValue = key => { delete window.__storage[key]; };
  window.GM_setClipboard = text => window.__clips.push(text);
  window.GM_registerMenuCommand = () => {};
  window.GM_xmlhttpRequest = options => {
    window.__requests.push({ url: options.url, anonymous: options.anonymous });
    const response = window.__responses.find(item => options.url.includes(item.match));
    setTimeout(() => {
      if (response?.error) { options.onerror(); return; }
      if (response?.timeout) { options.ontimeout(); return; }
      const id = Number(options.url.match(/\/anime\/(\d+)/)?.[1]);
      const data = response?.data || (options.url.includes('dist/data.json') ? config.dataset
        : { data: { mal_id: id, title: id === 52991 ? 'Sousou no Frieren' : 'Sousou no Frieren Season 2' } });
      options.onload({ status: response?.status || 200, responseText: response?.raw || JSON.stringify(data) });
    }, response?.delay || 10);
  };
  // 故意先注册 MAL-Sync 模拟监听，验证助手不依赖注册顺序。
  window.addEventListener('malsync-xhr', event => window.__received.push(clone(event.detail)));
}

async function fixture(browser, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  await context.route('**/*', request => request.fulfill({ contentType: 'text/html',
    body: '<!doctype html><html><head><meta charset="utf-8"></head><body style="background:#15171b;color:#ddd"><h2>Plex 测试页面</h2></body></html>' }));
  const config = { dataset, auto: true, cached: true, cacheAge: 0, responses: [], collapsed: false, ...options };
  await context.addInitScript({ content: `(${initialize.toString()})(${JSON.stringify(config)});\n${script}` });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  await page.goto(route(2));
  await page.locator('#plex-chinese-mal-helper').waitFor();
  return { context, page, helper: page.locator('#plex-chinese-mal-helper'), config };
}

async function send(page, meta) {
  return page.evaluate(meta => {
    window.__originalMeta = structuredClone(meta);
    window.dispatchEvent(new CustomEvent('malsync-xhr', { detail: {
      source: 'xhr', url: `https://private.plex.direct/library/metadata/${meta.ratingKey}?X-Plex-Token=test-secret`,
      data: { MediaContainer: { Metadata: [meta] } },
    } }));
    return meta;
  }, meta);
}

async function mappings(page) {
  return page.evaluate(() => Object.entries(window.__storage).filter(([key]) => key.includes('mapping:')));
}

async function waitMapping(page, malId) {
  await page.waitForFunction(id => Object.values(window.__storage).some(value => value?.malId === id), malId);
}

async function runCase(browser, name, options, callback) {
  console.log(`RUN ${name}`);
  const value = await fixture(browser, options);
  try {
    await callback(value);
    assert.deepEqual(await value.page.evaluate(() => window.__errors), [], 'browser errors');
    console.log(`PASS ${name}`);
  } finally { await value.context.close(); }
}

async function runUiCases(browser) {
  await runCase(browser, '默认收起为单个半透明小按钮，展开收起和 Escape 可用', { collapsed: null }, async ({ page, helper }) => {
    const launcher = helper.getByRole('button', { name: '打开中文番剧 MAL 助手', exact: true, includeHidden: true });
    await launcher.waitFor();
    assert.equal(await helper.locator('button:visible').count(), 1);
    const bounds = await helper.boundingBox();
    assert.ok(bounds.width <= 44 && bounds.height <= 44);
    assert.ok(await launcher.evaluate(node => Number(getComputedStyle(node).opacity) < 1));
    await launcher.click();
    await helper.getByRole('dialog').waitFor();
    assert.equal(await launcher.getAttribute('aria-expanded'), 'true');
    assert.equal(await helper.getByLabel('番剧标题').evaluate(node => node === node.getRootNode().activeElement), true);
    await helper.getByLabel('番剧标题').press('Escape');
    await launcher.waitFor();
    assert.equal(await helper.locator('button:visible').count(), 1);
    assert.equal(await page.evaluate(prefix => window.__storage[prefix + 'collapsed'], prefix), true);
    await launcher.click();
    await helper.getByRole('button', { name: '收起中文番剧 MAL 助手' }).click();
    assert.equal(await helper.locator('button:visible').count(), 1);
  });

  await runCase(browser, '跟随 MAL-Sync 按钮上方定位，左右换位和窄屏均不越界', { collapsed: true }, async ({ page, helper }) => {
    await page.evaluate(() => {
      const anchor = document.createElement('button');
      anchor.className = 'open-info-popup floatbutton';
      anchor.textContent = 'MAL';
      anchor.style.cssText = 'position:fixed;right:40px;bottom:40px;width:56px;height:56px;border-radius:50%';
      document.body.append(anchor);
    });
    await page.waitForFunction(() => {
      const a = document.querySelector('.floatbutton').getBoundingClientRect();
      const b = document.querySelector('#plex-chinese-mal-helper').getBoundingClientRect();
      return Math.abs(a.left + a.width / 2 - (b.left + b.width / 2)) < 1 && b.bottom < a.top;
    });
    await page.locator('.floatbutton').evaluate(node => { node.style.left = '24px'; node.style.right = 'auto'; });
    await page.waitForFunction(() => document.querySelector('#plex-chinese-mal-helper').getBoundingClientRect().left < 50);
    await helper.getByRole('button', { name: '打开中文番剧 MAL 助手' }).click();
    let bounds = await helper.getByRole('dialog').boundingBox();
    assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= 1200);
    await page.setViewportSize({ width: 360, height: 640 });
    await page.waitForFunction(() => {
      const panel = document.querySelector('#plex-chinese-mal-helper').shadowRoot.querySelector('.panel').getBoundingClientRect();
      return panel.left >= 0 && panel.right <= innerWidth && panel.top >= 0 && panel.bottom <= innerHeight;
    });
    await helper.getByRole('button', { name: '收起中文番剧 MAL 助手' }).click();
    await page.locator('.floatbutton').evaluate(node => { node.style.display = 'none'; });
    bounds = await helper.boundingBox();
    assert.ok(bounds.x < 50, 'MAL-Sync 暂时隐藏时保持最近的按钮位置');
    if (process.env.PLEX_HELPER_COMPACT_SCREENSHOT) {
      await page.setViewportSize({ width: 1200, height: 900 });
      await page.locator('.floatbutton').evaluate(node => {
        node.style.cssText = 'position:fixed;right:40px;bottom:40px;width:56px;height:56px;border-radius:50%;background:rgba(158,158,158,.2);color:white;border:0';
      });
      await page.waitForFunction(() => document.querySelector('#plex-chinese-mal-helper').getBoundingClientRect().left > 1000);
      await page.mouse.move(0, 0);
      await page.screenshot({ path: process.env.PLEX_HELPER_COMPACT_SCREENSHOT });
    }
  });

  await runCase(browser, '浏览器全屏时隐藏整个助手，退出后恢复原展开状态', { collapsed: false }, async ({ page, helper }) => {
    await page.evaluate(() => {
      const enter = document.createElement('button'); enter.textContent = '进入测试全屏';
      enter.onclick = () => document.documentElement.requestFullscreen();
      document.body.append(enter);
    });
    await page.getByRole('button', { name: '进入测试全屏', exact: true }).click();
    await page.waitForFunction(() => Boolean(document.fullscreenElement));
    await helper.waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(prefix => window.__storage[prefix + 'collapsed'], prefix), false);
    await page.evaluate(() => document.exitFullscreen());
    await helper.getByRole('dialog').waitFor();
  });

  await runCase(browser, 'Plex 满窗口隐藏，迷你播放器恢复；旧版大视频尺寸变化也可识别', { collapsed: true }, async ({ page, helper }) => {
    await page.evaluate(() => {
      const player = document.createElement('div');
      player.id = 'test-player'; player.className = 'Player-fullPlayerContainer-example';
      player.style.cssText = 'position:fixed;inset:0';
      const video = document.createElement('video'); video.style.cssText = 'width:100%;height:100%';
      player.append(video); document.body.append(player);
    });
    await helper.waitFor({ state: 'hidden' });
    await page.locator('#test-player').evaluate(node => {
      node.className = 'Player-miniPlayerContainer-example';
      node.style.cssText = 'position:fixed;right:0;bottom:0;width:320px;height:180px';
    });
    await helper.getByRole('button', { name: '打开中文番剧 MAL 助手' }).waitFor();
    await helper.getByRole('button', { name: '打开中文番剧 MAL 助手' }).click();
    await page.locator('#test-player').evaluate(node => {
      node.className = 'legacy-player'; node.style.cssText = 'position:fixed;inset:0';
    });
    await helper.waitFor({ state: 'hidden' });
    await page.locator('#test-player').evaluate(node => { node.style.cssText = 'position:fixed;left:0;top:0;width:320px;height:180px'; });
    await helper.getByRole('dialog').waitFor();
    await page.locator('#test-player').evaluate(node => node.remove());
    assert.equal(await helper.getByRole('dialog').isVisible(), true);
  });

}

(async () => {
  const browser = await chromium.launch({ headless: true,
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
  try {
    await runUiCases(browser);
    await runCase(browser, '自动匹配、标准标题事件、原始数据与同季复用', {}, async ({ page, helper }) => {
      const original = await send(page, first);
      assert.equal(original.parentTitle, first.parentTitle);
      await waitMapping(page, 52991);
      assert.equal((await mappings(page))[0][1].searchTitle, 'Sousou no Frieren');
      assert.ok(await helper.getByText('已关联：Sousou no Frieren', { exact: true }).isVisible());
      const events = await page.evaluate(() => window.__received);
      assert.equal(events.at(-1).data.MediaContainer.Metadata[0].parentTitle, 'Sousou no Frieren');
      assert.equal(events.at(-1).url, '/library/metadata/2');
      assert.equal(JSON.stringify((await mappings(page))).includes('test-secret'), false);
      assert.equal((await page.evaluate(() => window.__requests)).some(item => item.url.includes('dist/data.json')), false);
      const originalEpisode = await send(page, episode);
      assert.equal(originalEpisode.grandparentTitle, episode.grandparentTitle);
      const playerEvent = await page.evaluate(() => window.__received.at(-1).data.MediaContainer.Metadata[0]);
      assert.equal(playerEvent.parentTitle, 'Sousou no Frieren');
      assert.equal(playerEvent.grandparentTitle, '');
      assert.equal(playerEvent.index, 4);
      assert.equal((await mappings(page)).length, 1);
      await helper.getByText('复制 MAL 地址', { exact: true }).click();
      assert.equal((await page.evaluate(() => window.__clips)).at(-1), 'https://myanimelist.net/anime/52991');
      if (process.env.PLEX_HELPER_SCREENSHOT) await page.screenshot({ path: process.env.PLEX_HELPER_SCREENSHOT });
    });

    await runCase(browser, '首次下载成功只缓存必要字段，所有 API 请求匿名', { cached: false,
      dataset: { items: [{ ...dataset.items[0], officialSite: 'https://unneeded.test',
        sites: [...dataset.items[0].sites, { site: 'unneeded', id: '123' }] }] } }, async ({ page }) => {
      await send(page, first); await waitMapping(page, 52991);
      const cached = await page.evaluate(prefix => window.__storage[prefix + 'dataset'], prefix);
      assert.equal(cached.items[0].officialSite, undefined);
      assert.deepEqual(cached.items[0].sites.map(item => item.site), ['mal', 'bangumi']);
      const requests = await page.evaluate(() => window.__requests);
      assert.equal(requests.filter(item => item.url.includes('dist/data.json')).length, 1);
      assert.ok(requests.every(item => item.anonymous));
    });

    await runCase(browser, '缺少季数不自动关联，也不与剧集总览共用映射', {}, async ({ page, helper }) => {
      const unknownSeason = { ...first }; delete unknownSeason.index;
      await send(page, unknownSeason);
      await helper.locator('.candidate').first().waitFor();
      assert.equal((await mappings(page)).length, 0);
      await helper.locator('.candidate').first().getByText('关联此条目', { exact: true }).click();
      await waitMapping(page, 52991);
      assert.ok((await mappings(page))[0][0].includes('seasonKey'));
      await page.evaluate(({ url, prefix }) => { window.__storage[prefix + 'auto'] = false; location.href = url; },
        { url: route(1), prefix });
      await send(page, { type: 'show', ratingKey: '1', title: '葬送的芙莉莲', librarySectionTitle: 'Anime' });
      await helper.getByText('已识别番剧标题，点击搜索查看候选。', { exact: true }).waitFor();
      assert.equal(await helper.locator('.selected a').count(), 0);
    });

    await runCase(browser, '跨季不继承、第二季手动关联、跨服务器隔离', {}, async ({ page, helper }) => {
      await send(page, first);
      await waitMapping(page, 52991);
      await page.evaluate(url => { location.href = url; }, route(3));
      await send(page, second);
      await helper.getByText('葬送的芙莉莲 · Plex 第 2 季', { exact: true }).waitFor();
      await helper.locator('.candidate').first().waitFor();
      assert.equal(await helper.locator('.selected a').count(), 0);
      assert.equal((await mappings(page)).length, 1);
      await helper.locator('.candidate').first().getByText('关联此条目', { exact: true }).click();
      await waitMapping(page, 100);
      assert.equal((await mappings(page)).length, 2);
      await page.evaluate(({ url, prefix }) => { window.__storage[prefix + 'auto'] = false; location.href = url; },
        { url: route(2, 'server-b'), prefix });
      await send(page, first);
      await helper.getByText('葬送的芙莉莲 · Plex 第 1 季', { exact: true }).waitFor();
      await helper.getByText('已识别番剧标题，点击搜索查看候选。', { exact: true }).waitFor();
      assert.equal(await helper.locator('.selected a').count(), 0);
    });

    await runCase(browser, '开放 Shadow DOM 纠正窗口只填写 URL', {}, async ({ page, helper }) => {
      await send(page, first);
      await waitMapping(page, 52991);
      await page.evaluate(() => {
        const flash = document.createElement('div');
        flash.className = 'type-correction';
        const host = document.createElement('div'); host.className = 'ms-shadow';
        const root = host.attachShadow({ mode: 'open' });
        root.innerHTML = '<div class="inputButton"><div class="group"><input id="url"><label>URL</label></div><button>Update</button></div>'
          + '<div class="inputButton"><div class="group"><input id="offset" type="number" value="7"><label>Offset</label></div></div>';
        window.__updates = 0;
        window.__inputEvents = 0;
        root.querySelector('button').onclick = () => { window.__updates++; };
        root.querySelector('#url').oninput = () => { window.__inputEvents++; };
        flash.append(host); document.body.append(flash);
      });
      await helper.getByText('填入 MAL-Sync', { exact: true }).click();
      assert.equal(await page.locator('.type-correction #url').inputValue(), 'https://myanimelist.net/anime/52991');
      assert.equal(await page.locator('.type-correction #offset').inputValue(), '7');
      assert.equal(await page.evaluate(() => window.__updates), 0);
      assert.equal(await page.evaluate(() => window.__inputEvents), 1);
      await page.locator('.type-correction').evaluate(node => node.remove());
      await helper.getByText('填入 MAL-Sync', { exact: true }).click();
      assert.equal((await page.evaluate(() => window.__clips)).at(-1), 'https://myanimelist.net/anime/52991');
    });

    await runCase(browser, '关闭标题辅助和取消关联恢复事件中的原始标题', {}, async ({ page, helper }) => {
      await send(page, first); await waitMapping(page, 52991);
      await helper.getByLabel('为 MAL-Sync 提供匹配标题', { exact: true }).uncheck();
      assert.equal(await page.evaluate(() => window.__received.at(-1).data.MediaContainer.Metadata[0].parentTitle), first.parentTitle);
      await helper.getByLabel('为 MAL-Sync 提供匹配标题', { exact: true }).check();
      assert.equal(await page.evaluate(() => window.__received.at(-1).data.MediaContainer.Metadata[0].parentTitle), 'Sousou no Frieren');
      await helper.getByText('取消关联', { exact: true }).click();
      assert.equal((await mappings(page)).length, 0);
      assert.equal(await page.evaluate(() => window.__received.at(-1).data.MediaContainer.Metadata[0].parentTitle), first.parentTitle);
    });

    await runCase(browser, '切页后旧页面的慢请求不能保存映射', { responses: [{ match: '/anime/52991', delay: 900 }] }, async ({ page, helper }) => {
      await send(page, first);
      await page.waitForFunction(() => window.__requests.some(item => item.url.endsWith('/anime/52991')));
      await page.evaluate(url => { location.href = url; }, route(99));
      await send(page, { ...first, ratingKey: '99', parentRatingKey: '98', parentTitle: '完全不同的番剧' });
      await helper.getByText('完全不同的番剧 · Plex 第 1 季', { exact: true }).waitFor();
      await page.waitForTimeout(1000);
      assert.equal((await mappings(page)).length, 0);
      assert.equal(await helper.locator('.selected a').count(), 0);
    });

    await runCase(browser, '首次下载失败有可读错误且不保存映射', { cached: false,
      responses: [{ match: 'dist/data.json', error: true }] }, async ({ page, helper }) => {
      await send(page, first);
      await helper.getByText('网络请求失败，请检查数据源是否可以访问', { exact: true }).waitFor();
      assert.equal((await mappings(page)).length, 0);
    });

    await runCase(browser, '过期缓存更新失败仍可匹配，并提示旧缓存', { cacheAge: 8 * 24 * 60 * 60 * 1000,
      responses: [{ match: 'dist/data.json', error: true }] }, async ({ page, helper }) => {
      await send(page, first); await waitMapping(page, 52991);
      await helper.getByText(/数据更新失败，使用旧缓存/).waitFor();
    });

    await runCase(browser, '标准标题获取失败保留数据集 MAL 地址', {
      responses: [{ match: '/anime/52991', error: true }] }, async ({ page, helper }) => {
      await send(page, first); await waitMapping(page, 52991);
      assert.equal((await mappings(page))[0][1].searchTitle, "Frieren: Beyond the Journey's End");
      await helper.getByText(/MAL 标准标题查询失败/).waitFor();
    });

    await runCase(browser, '手动 ID 验证、429 错误和重试', { auto: false,
      responses: [{ match: '/anime/52991', status: 429 }] }, async ({ page, helper }) => {
      await send(page, first);
      await helper.getByText('葬送的芙莉莲 · Plex 第 1 季', { exact: true }).waitFor();
      await helper.getByLabel('MAL ID 或网址').fill('https://evil.test/anime/52991');
      await helper.getByText('手动关联', { exact: true }).click();
      await helper.getByText('请输入正整数 MAL ID 或合法的 HTTPS MAL 动画地址。', { exact: true }).waitFor();
      assert.equal((await page.evaluate(() => window.__requests)).length, 0);
      await helper.getByLabel('MAL ID 或网址').fill('52991');
      await helper.getByText('手动关联', { exact: true }).click();
      await helper.getByText('请求过于频繁，请稍后重试', { exact: true }).waitFor();
      assert.equal((await mappings(page)).length, 0);
      await page.evaluate(() => { window.__responses = []; });
      await helper.getByText('手动关联', { exact: true }).click();
      await waitMapping(page, 52991);
      assert.equal((await mappings(page))[0][1].source, 'manual');
    });

    await runCase(browser, '连续选择候选时以最后一次选择为准', { auto: false,
      responses: [{ match: '/anime/52991', delay: 900 }, { match: '/anime/100', delay: 10 }] }, async ({ page, helper }) => {
      await send(page, first);
      await helper.getByText('葬送的芙莉莲 · Plex 第 1 季', { exact: true }).waitFor();
      await helper.getByLabel('番剧标题').fill('葬送的芙莉莲');
      await helper.getByText('搜索', { exact: true }).click();
      await helper.locator('.candidate').nth(1).waitFor();
      await helper.locator('.candidate').nth(0).getByText('关联此条目', { exact: true }).click();
      await helper.locator('.candidate').nth(1).getByText('关联此条目', { exact: true }).click();
      await waitMapping(page, 100);
      await page.waitForTimeout(1000);
      assert.equal((await mappings(page)).length, 1);
      assert.equal((await mappings(page))[0][1].malId, 100);
    });

    await runCase(browser, '外部标题以文本节点显示', { auto: false, dataset: { items: [
      { title: '<img src=x onerror="window.pwned=1">', titleTranslate: { 'zh-Hans': ['葬送的芙莉莲'] },
        sites: [{ site: 'mal', id: '52991' }], type: 'tv', begin: '2023-01-01' },
    ] } }, async ({ page, helper }) => {
      await send(page, first);
      await helper.getByText('葬送的芙莉莲 · Plex 第 1 季', { exact: true }).waitFor();
      await helper.getByLabel('番剧标题').fill('葬送的芙莉莲');
      await helper.getByText('搜索', { exact: true }).click();
      await helper.locator('.candidate').waitFor();
      assert.equal(await helper.locator('img').count(), 0);
      assert.equal(await page.evaluate(() => window.pwned), undefined);
      assert.ok((await helper.locator('.candidate').textContent()).includes('<img src=x'));
    });
    console.log('17 browser regression scenarios passed. All API responses were mocked.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
