const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../plex/Plex Chinese MAL Helper.user.js');

function entry({ title = '葬送のフリーレン', chinese = ['葬送的芙莉莲'], traditional = ['葬送的芙莉蓮'],
  english = ['Frieren: Beyond the Journey\'s End'], mal = '52991', year = 2023, type = 'tv' } = {}) {
  return core.makeEntry({ title, titleTranslate: { 'zh-Hans': chinese, 'zh-Hant': traditional, en: english },
    begin: `${year}-09-29T14:00:00Z`, type,
    sites: [{ site: 'mal', id: mal }, { site: 'bangumi', id: '400602' }] });
}

test('MAL ID accepts only positive safe integers', () => {
  assert.equal(core.positiveId('52991'), 52991);
  for (const value of [0, -1, '1.2', '1e3', '001', 'Infinity', '', null, '9007199254740992']) {
    assert.equal(core.positiveId(value), null, String(value));
  }
});

test('MAL URLs reject other sites, manga, credentials and misleading hostnames', () => {
  for (const value of ['52991', 'https://myanimelist.net/anime/52991',
    'https://www.myanimelist.net/anime/52991/Sousou_no_Frieren?x=1']) {
    assert.equal(core.parseMalId(value), 52991);
  }
  for (const value of ['https://myanimelist.net.evil.test/anime/52991',
    'https://evil.test/?url=https://myanimelist.net/anime/52991',
    'http://myanimelist.net/anime/52991', 'https://myanimelist.net/manga/52991',
    'https://user@myanimelist.net/anime/52991', 'https://myanimelist.net:8443/anime/52991',
    'https://myanimelist.net/anime/52991evil', 'javascript:alert(1)', '0']) {
    assert.equal(core.parseMalId(value), null, value);
  }
});

test('title cleanup removes episode and quality suffixes, preserving seasons and meaningful brackets', () => {
  assert.equal(core.cleanTitle(' 葬送的芙莉莲 [1080p HEVC] S01E03 '), '葬送的芙莉莲');
  assert.equal(core.cleanTitle('药师少女的独语 第二季 第12话'), '药师少女的独语 第二季');
  assert.equal(core.cleanTitle('【我推的孩子】'), '【我推的孩子】');
  assert.equal(core.cleanTitle('Fate/stay night [Unlimited Blade Works]'), 'Fate/stay night [Unlimited Blade Works]');
  assert.equal(core.cleanTitle('动画 (2023)'), '动画');
});

test('Chinese season numbering agrees with English season numbering', () => {
  for (const suffix of ['第二季', '第二期', 'Season 2', 'S02', '2nd Season']) {
    assert.equal(core.titleParts(`动画 ${suffix}`).key, '动画season2', suffix);
  }
  assert.equal(core.titleParts('动画 第十二季').season, 12);
  assert.equal(core.titleParts('动画 第两季').season, 2);
  assert.notEqual(core.titleParts('动画').key, core.titleParts('动画 第二季').key);
  assert.notEqual(core.titleParts('动画 剧场版').key, core.titleParts('动画').key);
  assert.notEqual(core.titleParts('动画 OVA').key, core.titleParts('动画').key);
});

test('similarity counts repeated bigrams without exceeding one', () => {
  assert.equal(core.similarity('aaaa', 'aa'), 0.5);
  assert.equal(core.similarity('a', 'b'), 0);
  assert.equal(core.similarity('a', 'a'), 1);
  assert.equal(core.similarity('', ''), 0);
});

test('simplified, traditional, Japanese and English aliases reach the same MAL ID', () => {
  const entries = [entry()];
  for (const query of ['葬送的芙莉莲', '葬送的芙莉蓮', '葬送のフリーレン',
    'Frieren: Beyond the Journey\'s End']) {
    const result = core.rankEntries(entries, query);
    assert.equal(result[0].malId, 52991);
    assert.equal(result[0].exact, true, query);
    assert.equal(core.autoCandidate(result, {}).malId, 52991);
  }
});

test('fuzzy titles are candidates and never auto-selected', () => {
  const result = core.rankEntries([entry()], '葬送的芙丽莲');
  assert.equal(result.length, 1);
  assert.equal(result[0].exact, false);
  assert.equal(core.autoCandidate(result, {}), null);
});

test('homonyms remain ambiguous until a trustworthy year distinguishes them', () => {
  const old = entry({ title: 'Old', mal: '1', year: 2000 });
  const remake = entry({ title: 'New', mal: '2', year: 2023 });
  const result = core.rankEntries([old, remake], '葬送的芙莉莲', 2023);
  assert.equal(core.autoCandidate(result, {}), null);
  assert.equal(core.autoCandidate(result, { year: 2023 }).malId, 2);
  assert.equal(core.autoCandidate(result, { year: 2024 }), null);
});

test('an exact match without a MAL ID prevents automatic selection', () => {
  const result = core.rankEntries([entry(), entry({ title: 'Different', mal: '' })], '葬送的芙莉莲');
  assert.equal(core.autoCandidate(result, {}), null);
});

test('duplicate aliases pointing to the same MAL ID do not introduce ambiguity', () => {
  const result = core.rankEntries([entry(), entry({ title: 'Other name' })], '葬送的芙莉莲');
  assert.equal(core.autoCandidate(result, {}).malId, 52991);
});

test('candidate display limits cannot hide an exact matching ambiguity', () => {
  const entries = Array.from({ length: 12 }, () => entry());
  entries.push(entry({ mal: '2', year: 1999 }));
  const result = core.rankEntries(entries, '葬送的芙莉莲');
  assert.equal(result.length, 13);
  assert.equal(core.autoCandidate(result, {}), null);
});

test('Plex special and later seasons always require manual confirmation', () => {
  const result = core.rankEntries([entry()], '葬送的芙莉莲');
  assert.equal(core.autoCandidate(result, { season: 0 }), null);
  assert.equal(core.autoCandidate(result, { season: 2 }), null);
  assert.equal(core.autoCandidate(result, { season: 1 }).malId, 52991);
});

test('season differences rank below actual matching seasons', () => {
  const first = entry({ chinese: ['动画'], traditional: [], english: [], mal: '1' });
  const second = entry({ chinese: ['动画 第二季'], traditional: [], english: [], mal: '2' });
  const result = core.rankEntries([first, second], '动画 Season 2');
  assert.equal(result[0].malId, 2);
  assert.equal(result[0].exact, true);
  assert.equal(result.find(item => item.malId === 1)?.exact || false, false);
});

test('empty and malformed datasets do not produce matches', () => {
  assert.equal(core.makeEntry(null), null);
  assert.equal(core.makeEntry({ title: 42 }), null);
  assert.deepEqual(core.rankEntries([entry()], ''), []);
  const malformed = core.makeEntry({ title: 'Title', titleTranslate: { en: 123, 'zh-Hans': [null, '译名'] }, sites: [null] });
  assert.deepEqual(malformed.aliases, ['Title', '译名']);
  assert.equal(malformed.malId, null);
});

test('metadata paths remove query tokens and reject unrelated API responses', () => {
  assert.equal(core.metadataPath('https://server.test/library/metadata/123?X-Plex-Token=secret'), '/library/metadata/123');
  assert.equal(core.metadataPath('/library/metadata/123/grandchildren?x=1'), '/library/metadata/123/grandchildren');
  for (const value of ['/library/sections/1', '/library/metadata/1/children', '/library/metadata/not-a-number']) {
    assert.equal(core.metadataPath(value), null);
  }
});

test('metadata is whitelisted and cannot retain access tokens or unrelated private fields', () => {
  const meta = core.sanitizeMetadata({ type: 'episode', ratingKey: '10', title: '第1集',
    grandparentTitle: '葬送的芙莉莲', grandparentRatingKey: '1', parentRatingKey: '2', parentIndex: 1,
    index: 1, year: 2023, thumb: '/secret', token: 'secret', user: 'private', Media: [{ token: 'secret' }] });
  assert.deepEqual(Object.keys(meta).sort(), ['grandparentRatingKey', 'grandparentTitle', 'index',
    'parentIndex', 'parentRatingKey', 'ratingKey', 'title', 'type', 'year'].sort());
  assert.equal(core.sanitizeMetadata({ type: 'track', ratingKey: '1' }), null);
  assert.equal(core.sanitizeMetadata({ type: 'episode', ratingKey: 'bad' }), null);
});

const season = { type: 'season', ratingKey: '2', parentRatingKey: '1', index: 1,
  title: '第1季', parentTitle: '葬送的芙莉莲', year: 2023 };
const episode = { type: 'episode', ratingKey: '10', grandparentRatingKey: '1', parentRatingKey: '2',
  parentIndex: 1, index: 1, title: '单集标题', parentTitle: '第1季', grandparentTitle: '葬送的芙莉莲', year: 2023 };

test('season and episode context reuse a season mapping, not the individual episode title', () => {
  const a = core.contextFromMetadata(season, 'serverA');
  const b = core.contextFromMetadata(episode, 'serverA');
  assert.equal(a.scope, b.scope);
  assert.equal(a.title, '葬送的芙莉莲');
  assert.equal(b.title, '葬送的芙莉莲');
  assert.equal(b.query, a.query);
});

test('servers, seasons and show overviews have independent mapping scopes', () => {
  const first = core.contextFromMetadata(season, 'serverA');
  const second = core.contextFromMetadata({ ...season, ratingKey: '3', index: 2 }, 'serverA');
  const anotherServer = core.contextFromMetadata(season, 'serverB');
  const show = core.contextFromMetadata({ type: 'show', ratingKey: '1', title: '葬送的芙莉莲' }, 'serverA');
  assert.equal(new Set([first.scope, second.scope, anotherServer.scope, show.scope]).size, 4);
  assert.equal(second.query, '葬送的芙莉莲 第2季');
});

test('unknown season indexes remain unknown and missing series titles are rejected', () => {
  const unknown = core.contextFromMetadata({ ...season, index: undefined }, 'serverA');
  const anotherUnknown = core.contextFromMetadata({ ...season, ratingKey: '3', index: undefined }, 'serverA');
  const show = core.contextFromMetadata({ type: 'show', ratingKey: '1', title: '葬送的芙莉莲' }, 'serverA');
  assert.equal(unknown.season, null);
  assert.equal(unknown.uncertainSeason, true);
  assert.equal(new Set([unknown.scope, anotherUnknown.scope, show.scope]).size, 3);
  assert.equal(core.autoCandidate(core.rankEntries([entry()], '葬送的芙莉莲'), unknown), null);
  assert.equal(core.contextFromMetadata({ type: 'episode', ratingKey: '10', title: '单集标题' }), null);
});

test('translated metadata changes only titles, preserving identifiers and episode progress', () => {
  const mapping = { searchTitle: 'Sousou no Frieren' };
  const a = core.translateMetadata(season, mapping);
  const b = core.translateMetadata(episode, mapping);
  assert.equal(`${a.parentTitle} ${a.title}`.trim(), mapping.searchTitle);
  assert.equal((b.grandparentTitle ? `${b.grandparentTitle} ${b.parentTitle}` : b.parentTitle), mapping.searchTitle);
  assert.equal(b.title, '单集标题');
  assert.equal(b.ratingKey, episode.ratingKey);
  assert.equal(b.parentRatingKey, episode.parentRatingKey);
  assert.equal(b.index, episode.index);
  assert.equal(episode.grandparentTitle, '葬送的芙莉莲');
  assert.equal(season.title, '第1季');
  assert.equal(core.translateMetadata(episode, null), episode);
});

test('invalid persisted mappings cannot reach the bridge or URL input', () => {
  assert.ok(core.validMapping({ malId: 52991, searchTitle: 'Sousou no Frieren' }));
  for (const value of [null, { malId: 0, searchTitle: 'a' }, { malId: 1, searchTitle: ' ' },
    { malId: 1, searchTitle: 'a'.repeat(501) }]) assert.ok(!core.validMapping(value));
});
