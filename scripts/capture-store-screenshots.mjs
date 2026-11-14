// Renders game/index.html at iPhone 15/16 Plus pixels: 430×932 CSS × 3 = 1290×2796.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'store', 'screenshots');
const iapPath = path.join(root, 'store', 'iap-review-paywall-1290x2796.png');

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 430, height: 932 },
  deviceScaleFactor: 3,
  colorScheme: 'dark',
  reducedMotion: 'reduce',
});
const page = await context.newPage();
await page.addInitScript(() => {
  window.ReactNativeWebView = { postMessage() {} };
});
await mkdir(outDir, { recursive: true });
await page.goto(pathToFileURL(path.join(root, 'game', 'index.html')).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.addStyleTag({
  content: 'html,body{background:#100e26}body{padding-top:59px;padding-bottom:34px}',
});

async function scene(spec) {
  await page.evaluate((spec) => {
    const T = window.T21;
    const S = T.S;
    const num = (v) => ({ id: ++S.uid, t: 'n', v });
    const act = (k) => ({ id: ++S.uid, t: 'a', k });
    const seats = { you: S.players[0], ava: S.players[1], rex: S.players[2] };
    S.rules = false;
    S.paywall = spec.paywall ? { reason: spec.paywall } : null;
    S.premium = false;
    S.phase = spec.phase || 'play';
    S.roundEnded = spec.phase === 'roundEnd';
    S.flipped = false;
    S.humanTurn = spec.phase !== 'roundEnd';
    S.acted = false;
    S.pending = spec.pending ? { k: spec.pending } : null;
    S.target = spec.target || 21;
    S.dir = 1;
    S.cur = 0;
    S.round = spec.round || 3;
    S.champ = null;
    S.log = spec.log || [];
    for (const key of ['you', 'ava', 'rex']) {
      const p = seats[key];
      const row = spec[key];
      p.cards = row.cards.map(num);
      p.actions = row.actions.map(act);
      p.points = row.points;
      p.bust = !!row.bust;
      p.stood = !!row.stood;
      p.shield = !!row.shield;
      p.skip = !!row.skip;
      p.peeked = new Set();
    }
    if (spec.phase === 'roundEnd') {
      S.result = {
        rows: S.players.map((p) => ({ p, total: T.total(p), bust: p.bust })),
        winner: spec.winner ? seats[spec.winner] : null,
        pts: spec.pts || 1,
        msg: spec.msg,
        target: S.target,
      };
      S.humanTurn = false;
    } else {
      S.result = null;
    }
    T.setStoreReady(true);
    T.setPrice('$39.99');
    const scroller = spec.scroll === 'hit'
      ? document.querySelector('.btn.hit')
      : spec.scroll === 'chooser'
        ? document.querySelector('.chooser')
        : null;
    if (scroller) scroller.scrollIntoView({ block: spec.scroll === 'hit' ? 'end' : 'center' });
    else window.scrollTo(0, 0);
  }, spec);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

const youHand = { cards: [8, 6, 3], actions: ['skip', 'peek', 'shield'], points: 2 };
const avaLive = { cards: [9, 7, 2], actions: ['trim', 'reverse'], points: 1, shield: true };
const rexStand = { cards: [10, 5], actions: ['skip'], points: 1, stood: true };

await scene({
  scroll: 'top',
  target: 21,
  round: 3,
  you: youHand,
  ava: avaLive,
  rex: rexStand,
  log: ['Round 3. Target 21. You go first.', 'Ava plays Shield.', 'Rex stands on 15 (5 showing).'],
});
await page.screenshot({ path: path.join(outDir, '01-rivals.png') });

await scene({
  scroll: 'hit',
  target: 21,
  round: 3,
  you: youHand,
  ava: avaLive,
  rex: rexStand,
  log: ['Ava plays Shield.', 'Rex stands on 15 (5 showing).'],
});
await page.screenshot({ path: path.join(outDir, '02-your-turn.png') });

await scene({
  scroll: 'chooser',
  pending: 'peek',
  target: 21,
  round: 3,
  you: { cards: [8, 6, 3], actions: ['peek', 'skip', 'shield'], points: 2 },
  ava: avaLive,
  rex: rexStand,
  log: ['Pick a target for Peek.'],
});
await page.screenshot({ path: path.join(outDir, '03-peek.png') });

await scene({
  phase: 'roundEnd',
  scroll: 'top',
  target: 21,
  round: 3,
  winner: 'you',
  pts: 1,
  msg: 'You win with 20: 1 point.',
  you: { cards: [8, 7, 5], actions: [], points: 3 },
  ava: { cards: [10, 9, 6], actions: [], points: 1, bust: true },
  rex: { cards: [9, 5], actions: [], points: 1 },
  log: ['Round over. You win with 20: 1 point.'],
});
await page.screenshot({ path: path.join(outDir, '04-round-result.png') });

await scene({
  scroll: 'top',
  target: 21,
  round: 4,
  you: { cards: [7, 6, 4], actions: ['trim', 'reverse', 'shield'], points: 3 },
  ava: { cards: [8, 5, 3], actions: ['peek'], points: 2, skip: true },
  rex: { cards: [9, 4], actions: ['shield'], points: 1 },
  log: ['You play Skip. Ava misses a turn.'],
});
await page.screenshot({ path: path.join(outDir, '05-skip.png') });

await scene({
  paywall: 'upsell',
  scroll: 'top',
  target: 21,
  round: 2,
  you: youHand,
  ava: avaLive,
  rex: rexStand,
  log: ['Free play has 5 of the 9 action cards and 3 matches a day.'],
});
const fit = await page.evaluate(() => {
  const overlay = document.querySelector('.overlay');
  const price = document.querySelector('.priceamount');
  const legal = document.querySelector('.legal a');
  const restore = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Restore'));
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), text: el.textContent.slice(0, 80) };
  };
  return {
    overlayScrollHeight: overlay ? overlay.scrollHeight : 0,
    overlayClient: overlay ? overlay.clientHeight : 0,
    price: box(price),
    legal: box(legal),
    restore: box(restore),
  };
});
console.log(JSON.stringify(fit, null, 2));
await page.screenshot({ path: iapPath });

await browser.close();
console.log('wrote screenshots');
