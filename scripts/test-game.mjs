// Headless checks for the game rules and chip economy. Run: npm test
// Loads the <script> from game/index.html in Node (no DOM) and plays full matches with bots.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../game/index.html', import.meta.url), 'utf8');
const src = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));

function load(win) {
  const mod = { exports: {} };
  new Function('module', 'window', 'document', src)(mod, win, undefined);
  return mod.exports;
}
let failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('ok   ' + name); } catch (e) { failed++; console.log('FAIL ' + name + '\n     ' + (e && e.message)); }
}

await test('200 bot matches terminate with a valid champion and sane totals', async () => {
  const T = load(undefined);
  T.S.fast = true; T.S.autoHuman = true;
  for (let m = 0; m < 200; m++) {
    T.initMatch();
    let rounds = 0;
    await T.beginRound();
    while (T.S.phase !== 'matchEnd') {
      assert.equal(T.S.phase, 'roundEnd');
      assert.ok(++rounds < 200, 'match did not finish');
      for (const p of T.S.players) {
        assert.ok(p.actions.length <= 3, 'hand limit');
        assert.ok(p.bust || T.total(p) <= T.S.target, 'non-bust player over target');
      }
      await T.nextRound();
    }
    assert.ok(T.S.champ && T.S.champ.points >= T.WIN_POINTS);
  }
  assert.ok(Number.isFinite(T.SAVE.bank) && T.SAVE.bank >= 0, 'bank is a non-negative number');
});

await test('every chip pack id grants its chips; unknown ids grant nothing', async () => {
  const T = load(undefined); T.initMatch();
  for (const p of T.PACKS) {
    const before = T.SAVE.bank;
    assert.equal(T.grantPack(p.id), true);
    assert.equal(T.SAVE.bank - before, p.chips);
  }
  const b = T.SAVE.bank;
  assert.equal(T.grantPack('nope'), false);
  assert.equal(T.SAVE.bank, b);
});

await test('pack ids and chip amounts match src/config.ts', async () => {
  const T = load(undefined);
  const cfg = readFileSync(new URL('../src/config.ts', import.meta.url), 'utf8');
  const fromCfg = Object.fromEntries([...cfg.matchAll(/(twist21_chips_\w+):\s*(\d+)/g)].map((m) => [m[1], +m[2]]));
  assert.deepEqual(Object.fromEntries(T.PACKS.map((p) => [p.id, p.chips])), fromCfg);
});

await test('src/gameHtml.ts is in sync with game/index.html', async () => {
  const require = createRequire(import.meta.url);
  const gen = readFileSync(new URL('../src/gameHtml.ts', import.meta.url), 'utf8');
  assert.ok(gen.includes(JSON.stringify(html)), 'run: npm run build:html');
  void require;
});

// ---- save handling (functions added by the audit fixes; skipped if absent) ----
function fakeWindow(saved, native) {
  const ls = {}; if (saved != null) ls['twist21.save'] = saved;
  const posted = [];
  const win = { localStorage: { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); } }, ReactNativeWebView: { postMessage: (m) => posted.push(JSON.parse(m)) } };
  if (native != null) win.__T21_SAVE__ = native;
  return { win, ls, posted };
}
await test('old or damaged saves load without breaking the wardrobe, stats or bank', async () => {
  const T = load(undefined);
  if (!T.readSave) throw new Error('readSave not exported');
  const cases = ['{"bank":"abc"}', '{"bank":5000,"owned":{"felt":["emerald"]},"stats":{"matches":3}}', '{"eq":{"felt":"nope"}}', 'not json', '[]', '{"bank":-50,"boot":777,"daily":null}'];
  for (const raw of cases) {
    const s = T.readSave(raw);
    if (!s) continue;
    assert.ok(Number.isFinite(s.bank) && s.bank >= 0, raw);
    for (const k of ['felt', 'back', 'dealer']) { assert.ok(Array.isArray(s.owned[k]) && s.owned[k].length, raw); assert.ok(s.owned[k].includes(s.eq[k]), raw); }
    for (const k of ['matches', 'wins', 'rounds', 'roundWins', 'streak', 'best', 'earned']) assert.ok(Number.isFinite(s.stats[k]), raw + ' stats.' + k);
    assert.ok([0, 100, 1000, 10000, 100000].includes(s.boot), raw);
    assert.equal(typeof s.daily.last, 'string');
  }
});
await test('the newer of the WebView save and the native copy wins, and every save is sent to the app', async () => {
  const a = JSON.stringify({ bank: 111, rev: 5 }), b = JSON.stringify({ bank: 999, rev: 9 });
  let f = fakeWindow(a, b); let T = load(f.win); T.loadSave();
  assert.equal(T.SAVE.bank, 999);
  f = fakeWindow(b, a); T = load(f.win); T.loadSave();
  assert.equal(T.SAVE.bank, 999);
  f = fakeWindow(null, a); T = load(f.win); T.loadSave();
  assert.equal(T.SAVE.bank, 111);
  T.initMatch(); T.grantPack('twist21_chips_12k');
  const last = f.posted.filter((m) => m.type === 'save').pop();
  assert.ok(last, 'save message posted');
  assert.equal(JSON.parse(last.data).bank, 12111);
  assert.equal(JSON.parse(f.ls['twist21.save']).bank, 12111);
});
await test('in the app the shop opens the RevenueCat paywall, once, and never shows a made-up price', async () => {
  const f = fakeWindow(null, null); const T = load(f.win);
  if (!T.shopHTML) throw new Error('shopHTML not exported');
  T.initMatch();
  assert.ok(!/\$\d/.test(T.shopHTML()), 'placeholder $ price shown before the store answered');
  T.setStoreReady(false);
  assert.ok(/unavailable/i.test(T.shopHTML()) && !/\$\d/.test(T.shopHTML()));
  const opens = () => f.posted.filter((m) => m.type === 'paywall').length;
  const tap = (act, id) => T.onClick({ target: { closest: () => ({ dataset: { act, id } }) } });
  tap('paywall');
  assert.equal(opens(), 0, 'paywall must not open before the store is ready');
  T.setOffers([{ id: 'twist21_chips_12k', price: '₹99' }]);
  assert.ok(/data-act="paywall">/.test(T.shopHTML()) && !/\$\d/.test(T.shopHTML()) && !/data-act="buy"/.test(T.shopHTML()));
  tap('paywall'); tap('paywall');
  assert.equal(opens(), 1, 'a second tap while the paywall is open must not open another');
  assert.ok(/data-act="paywall" disabled/.test(T.shopHTML()));
  const bank = T.SAVE.bank; tap('buy', 'twist21_chips_600k');
  assert.equal(T.SAVE.bank, bank, 'in the app, chips are only granted by the native side');
  T.buyDone(); tap('paywall');
  assert.equal(opens(), 2);
});

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
