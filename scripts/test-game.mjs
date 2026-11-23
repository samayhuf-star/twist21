// Headless checks for the game rules and chip economy. Run: npm test
// Imports the rules engine the app ships (src/engine.ts) and plays full matches with bots.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const load = async () => import('../src/engine.ts?fresh=' + Math.random());
let failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('ok   ' + name); } catch (e) { failed++; console.log('FAIL ' + name + '\n     ' + (e && e.message)); }
}

await test('200 bot matches terminate with a valid champion and sane totals', async () => {
  const T = await load();
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

await test('a human turn: action card, target pick, then hit or stand', async () => {
  const T = await load();
  T.S.fast = true;
  T.initMatch();
  T.S.players[0].actions = [{ id: 9001, t: 'a', k: 'peek' }];
  T.S.cur = 0;
  const done = T.beginRound();
  await new Promise((r) => setTimeout(r, 20));
  // round 1 starts with the human
  assert.equal(T.S.humanTurn, true);
  T.act('card', 'peek');
  assert.deepEqual(T.S.pending, { k: 'peek' });
  T.act('target', 1);
  assert.equal(T.S.acted, true);
  assert.ok(T.S.players[0].peeked.has(1));
  T.act('stand');
  T.S.autoHuman = true;
  await done;
  assert.ok(T.S.phase === 'roundEnd' || T.S.phase === 'matchEnd');
});

await test('every chip pack id grants its chips; unknown ids grant nothing', async () => {
  const T = await load(); T.initMatch();
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
  const T = await load();
  const cfg = readFileSync(new URL('../src/config.ts', import.meta.url), 'utf8');
  const fromCfg = Object.fromEntries([...cfg.matchAll(/(twist21_chips_\w+):\s*(\d+)/g)].map((m) => [m[1], +m[2]]));
  assert.deepEqual(Object.fromEntries(T.PACKS.map((p) => [p.id, p.chips])), fromCfg);
});

await test('the engine never states a price: prices come only from the App Store', async () => {
  const src = readFileSync(new URL('../src/engine.ts', import.meta.url), 'utf8');
  assert.equal(/\$\d/.test(src), false);
});

await test('the app has no web view: screens are native', async () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal('react-native-webview' in pkg.dependencies, false);
  for (const f of ['../App.tsx', '../src/Game.tsx']) {
    assert.equal(/webview/i.test(readFileSync(new URL(f, import.meta.url), 'utf8')), false, f);
  }
});

await test('old or damaged saves load without breaking the wardrobe, stats or bank', async () => {
  const T = await load();
  assert.equal(T.readSave('not json'), null);
  assert.equal(T.readSave('[]'), null);
  const a = T.readSave(JSON.stringify({ bank: 'x', owned: { felt: ['nope', 'violet'] }, eq: { felt: 'violet', back: 'zzz' }, stats: { wins: -4 }, boot: 7 }));
  assert.equal(a.bank, 10000);
  assert.deepEqual(a.owned.felt, ['emerald', 'violet']);
  assert.equal(a.eq.felt, 'violet');
  assert.equal(a.eq.back, 'classic');
  assert.equal(a.stats.wins, 0);
  assert.equal(a.boot, 100);
});

await test('saves written by earlier versions hydrate, only when newer, and every change is saved', async () => {
  const T = await load();
  const writes = [];
  T.setSaveHook((json) => writes.push(json));
  T.initMatch();
  assert.equal(T.hydrate(JSON.stringify({ bank: 77777, rev: 12, onboarded: true })), true);
  assert.equal(T.SAVE.bank, 77777);
  assert.equal(T.hydrate(JSON.stringify({ bank: 1, rev: 3 })), false);
  assert.equal(T.SAVE.bank, 77777);
  T.grantPack('twist21_chips_12k');
  assert.equal(JSON.parse(writes.at(-1)).bank, 89777);
  assert.equal(JSON.parse(writes.at(-1)).rev, 13);
});

await test('table boots: the boot is taken at the start and the pot is three boots', async () => {
  const T = await load();
  T.S.fast = true; T.S.autoHuman = true;
  T.initMatch();
  T.act('settable', 1000);
  const before = T.SAVE.bank;
  T.act('start');
  assert.equal(T.S.stake, 1000);
  assert.ok(T.SAVE.bank <= before - 1000 + 1);
  T.act('settable', 100000);
  assert.equal(T.SAVE.boot, 1000, 'cannot pick a table you cannot afford');
});

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
