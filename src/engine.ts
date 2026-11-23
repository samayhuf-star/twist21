// @ts-nocheck
// Twist 21 rules engine, chip economy and save format. Pure logic, no UI: the React Native screens in
// src/Game.tsx read this state and call act(). Ported from the original single-page game so saves, rules
// and bot behaviour are unchanged. Typed access for the UI is in src/engineTypes.ts.

var WIN_POINTS = 5;
var NAMES = ['You', 'Ava', 'Rex'];
var ORDER = ['skip', 'swap', 'force', 'trim', 'shield', 'lower', 'raise', 'peek', 'reverse'];

// ---- economy: pick a table; each player puts the boot in, the match winner takes the pot. Practice is always free. ----
var START_CHIPS = 10000;
var ODDS_COST = 50;
var TABLES = [100, 1000, 10000, 100000];
var SEATS = 3;
var REWARD = { round: 100, exact: 100, match: 500, played: 50 };
var PACKS = [
  { id: 'twist21_chips_12k', chips: 12000, tag: '' },
  { id: 'twist21_chips_50k', chips: 50000, tag: 'Popular' },
  { id: 'twist21_chips_100k', chips: 100000, tag: '' },
  { id: 'twist21_chips_250k', chips: 250000, tag: 'Best value' },
  { id: 'twist21_chips_600k', chips: 600000, tag: '' }
];
var CATALOG = {
  felt: [
    { id: 'emerald', name: 'Emerald', cost: 0, sw: '#12583b' }, { id: 'midnight', name: 'Midnight', cost: 6000, sw: '#17306a' },
    { id: 'crimson', name: 'Crimson', cost: 8000, sw: '#7b1f2e' }, { id: 'violet', name: 'Violet', cost: 10000, sw: '#4b2a7a' }
  ],
  back: [
    { id: 'classic', name: 'Classic', cost: 0, sw: '#7a1230' }, { id: 'gold', name: 'Gold', cost: 5000, sw: '#c99a3b' },
    { id: 'ink', name: 'Ink', cost: 7000, sw: '#1d2430' }, { id: 'neon', name: 'Neon', cost: 9000, sw: '#0fb5a0' }
  ],
  dealer: [
    { id: 'dee', name: 'Dealer Dee', cost: 0, sw: '#7a1230' }, { id: 'marco', name: 'Marco', cost: 12000, sw: '#14416b' },
    { id: 'nova', name: 'Nova', cost: 15000, sw: '#6a1fb0' }
  ]
};
var PRIVACY_URL = 'https://samayhuf-star.github.io/app-legal/twist21/privacy/';
var TERMS_URL = 'https://samayhuf-star.github.io/app-legal/twist21/terms/';
var SUPPORT_URL = 'https://samayhuf-star.github.io/app-legal/twist21/support/';
function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function yesterday() { var d = new Date(); d.setDate(d.getDate() - 1); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
var SAVE = {
  bank: START_CHIPS, owned: { felt: ['emerald'], back: ['classic'], dealer: ['dee'] }, eq: { felt: 'emerald', back: 'classic', dealer: 'dee' },
  boot: 100, stats: { matches: 0, wins: 0, rounds: 0, roundWins: 0, streak: 0, best: 0, earned: 0 }, daily: { last: '', streak: 0 }, onboarded: false
};
SAVE.rev = 0;
function count(v) { v = Math.floor(Number(v)); return isFinite(v) && v > 0 ? v : 0; }
// Turns a stored save into a complete, valid one. Old or damaged saves must never break the game or wipe the bank.
function readSave(raw) {
  var o;
  try { o = JSON.parse(raw); } catch (e) { return null; }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
  var out = { bank: o.bank == null || !isFinite(Number(o.bank)) ? START_CHIPS : count(o.bank), owned: {}, eq: {}, stats: {}, rev: count(o.rev), onboarded: !!o.onboarded };
  ['felt', 'back', 'dealer'].forEach(function (kind) {
    var ids = CATALOG[kind].map(function (x) { return x.id; });
    var have = o.owned && Array.isArray(o.owned[kind]) ? o.owned[kind].filter(function (id) { return ids.indexOf(id) >= 0; }) : [];
    if (have.indexOf(ids[0]) < 0) have.unshift(ids[0]);
    out.owned[kind] = have;
    out.eq[kind] = o.eq && have.indexOf(o.eq[kind]) >= 0 ? o.eq[kind] : ids[0];
  });
  ['matches', 'wins', 'rounds', 'roundWins', 'streak', 'best', 'earned'].forEach(function (k) { out.stats[k] = count(o.stats && o.stats[k]); });
  out.boot = TABLES.indexOf(Number(o.boot)) >= 0 ? Number(o.boot) : (o.boot === 0 ? 0 : 100);
  out.daily = { last: o.daily && typeof o.daily.last === 'string' ? o.daily.last : '', streak: count(o.daily && o.daily.streak) };
  return out;
}
function applySave(o) { for (var k in o) if (o.hasOwnProperty(k)) SAVE[k] = o[k]; }

var saveHook = null;
function setSaveHook(fn) { saveHook = fn; }
function persist() {
  SAVE.rev = count(SAVE.rev) + 1;
  if (saveHook) { try { saveHook(JSON.stringify(SAVE)); } catch (e) { /* storage unavailable */ } }
}
// Loads a stored save (the same JSON the earlier versions wrote). Returns false when it is missing or not newer.
function hydrate(raw) {
  var o = typeof raw === 'string' ? readSave(raw) : null;
  if (!o || o.rev <= count(SAVE.rev)) return false;
  applySave(o); render(); return true;
}
function gain(n, why) {
  SAVE.bank += n; if (n > 0 && why !== 'buy') SAVE.stats.earned += n; persist();
}

var SAYS = {
  start: ['Cards are out. Good luck.', 'Place your focus. Dealing now.', 'Fresh deck, fresh round.'],
  bust: ['Ooh, over the line.', 'That one hurts.', 'Busted. It happens.'],
  win: ['Nicely played.', 'The table is yours.', 'Clean win.'],
  lose: ['Next round is yours.', 'Close one.', 'The table says not this time.'],
  twist: ['The target moved!', 'Plot twist.'],
  exact: ['Right on the number!', 'Exactly on target. Beautiful.']
};


var ACTIONS = {
  skip:   { name: 'Skip',      desc: 'The next player loses their turn.' },
  swap:    { name: 'Swap',      desc: 'Trade your last face-up card with another player’s.' },
  force:   { name: 'Force Hit', desc: 'A player still in the round draws a card now.' },
  trim:    { name: 'Trim',      desc: 'Discard your highest face-up card.' },
  shield:  { name: 'Shield',    desc: 'Your next bust is cancelled and the card is discarded.' },
  lower:   { name: 'Target 18', desc: 'Target drops to 18. Everyone above it busts, you too.' },
  raise:   { name: 'Target 24', desc: 'Target rises to 24. Nobody busts.' },
  peek:    { name: 'Peek',      desc: 'Look at one player’s face-down card.' },
  reverse: { name: 'Reverse',   desc: 'Turn order flips direction.' }
};
var S = {
  players: [], deck: [], discards: [], target: 21, dir: 1, cur: 0, round: 0,
  phase: 'intro', humanTurn: false, acted: false, pending: null, log: [],
  seen: new Set(), roundEnded: false, flipped: false, uid: 0,
  result: null, champ: null, finish: null, fast: false, autoHuman: false, overlayKey: '', lastOverlay: null
};
function kinds() { return ORDER; }
function sleep(ms) {
  return S.fast ? Promise.resolve() : new Promise(function (r) { setTimeout(r, ms); });
}
function log(m) { S.log.push(m); if (S.log.length > 40) S.log.shift(); }


// ---------- helpers ----------
function total(p) { var t = 0; for (var i = 0; i < p.cards.length; i++) t += p.cards[i].v; return t; }
function visTotal(p) { var t = 0; for (var i = 1; i < p.cards.length; i++) t += p.cards[i].v; return t; }
function active(p) { return !p.stood && !p.bust; }
function idxOf(p) { return S.players.indexOf(p); }
function nextIdx(from) { var n = S.players.length; return (from + S.dir + n) % n; }
function roundOver() { return !S.players.some(active); }
function nextActiveFrom(from) {
  var i = from;
  for (var n = 0; n < S.players.length; n++) {
    i = nextIdx(i);
    if (i === from) break;
    if (active(S.players[i])) return i;
  }
  return -1;
}
function V(p, a, b) { return p.human ? a : b; }
function obj(p) { return p.human ? 'you' : p.name; }

// ---------- deck ----------
function makeDeck() {
  var d = [], v, n;
  for (v = 1; v <= 10; v++) for (n = 0; n < 4; n++) d.push({ id: ++S.uid, t: 'n', v: v });
  kinds().forEach(function (k) { for (var j = 0; j < 2; j++) d.push({ id: ++S.uid, t: 'a', k: k }); });
  for (var i = d.length - 1; i > 0; i--) {
    var j2 = Math.floor(Math.random() * (i + 1));
    var tmp = d[i]; d[i] = d[j2]; d[j2] = tmp;
  }
  return d;
}
function drawNumber() { var i = S.deck.findIndex(function (c) { return c.t === 'n'; }); return S.deck.splice(i, 1)[0]; }
function drawAction() { var i = S.deck.findIndex(function (c) { return c.t === 'a'; }); return S.deck.splice(i, 1)[0]; }
function drawAny() {
  if (!S.deck.length) { S.deck = makeDeck(); S.discards = []; }
  return S.deck.shift();
}

// ---------- rules engine ----------
function giveCard(p, c) {
  if (c.t === 'a') {
    p.actions.push(c);
    if (p.actions.length > 3) {
      var d = p.actions.shift();
      log(p.name + ' ' + V(p, 'drop', 'drops') + ' ' + ACTIONS[d.k].name + ' (hand limit is 3).');
    }
    log(p.name + ' ' + V(p, 'draw', 'draws') + ' an action card' + (p.human ? ': ' + ACTIONS[c.k].name + '.' : '.'));
    return;
  }
  p.cards.push(c);
  if (total(p) > S.target) {
    if (p.shield) {
      p.shield = false;
      p.cards.pop();
      S.discards.push(c.v);
      log(p.name + V(p, 'r', '’s') + ' Shield absorbs a ' + c.v + '.');
    } else {
      p.bust = true;
      log(p.name + ' ' + V(p, 'draw', 'draws') + ' ' + c.v + ' and ' + V(p, 'bust', 'busts') + ' with ' + total(p) + '.');
    }
  } else {
    log(p.name + ' ' + V(p, 'draw', 'draws') + ' ' + c.v + '.');
  }
}

function settleAll() {
  S.players.forEach(function (p) {
    if (p.bust) return;
    var t = total(p);
    if (t > S.target) {
      p.bust = true;
      log(p.name + ' ' + V(p, 'go', 'goes') + ' over ' + S.target + ' and ' + V(p, 'bust', 'busts') + '.');
    } else if (t === S.target && !p.stood) {
      p.stood = true;
      log(p.name + ' ' + V(p, 'hit', 'hits') + ' ' + S.target + ' on the nose.');
    }
  });
}

function targetsFor(p, k) {
  var others = S.players.filter(function (o) { return o !== p && !o.bust; });
  if (k === 'swap') return p.cards.length >= 2 ? others.filter(function (o) { return o.cards.length >= 2; }) : [];
  if (k === 'force') return others.filter(function (o) { return !o.stood; });
  if (k === 'peek') return others.filter(function (o) { return !p.peeked.has(idxOf(o)); });
  return null;
}
function valid(p, k) {
  var t = targetsFor(p, k);
  if (t) return t.length > 0;
  if (k === 'skip') return nextActiveFrom(idxOf(p)) !== -1;
  if (k === 'trim') return p.cards.length >= 2;
  if (k === 'shield') return !p.shield;
  if (k === 'lower') return S.target > 18;
  if (k === 'raise') return S.target < 24;
  return true;
}

function doAction(p, k, ti) {
  var i = p.actions.findIndex(function (a) { return a.k === k; });
  if (i < 0) return;
  p.actions.splice(i, 1);
  var t = ti != null ? S.players[ti] : null;
  var P = p.name + ' ' + V(p, 'play', 'plays') + ' ';
  if (k === 'skip') {
    var n = nextActiveFrom(idxOf(p));
    if (n >= 0) { S.players[n].skip = true; log(P + 'Skip. ' + (S.players[n].human ? 'You miss' : S.players[n].name + ' misses') + ' a turn.'); }
  } else if (k === 'swap') {
    var a = p.cards.length - 1, b = t.cards.length - 1;
    var mine = p.cards[a], theirs = t.cards[b];
    p.cards[a] = theirs; t.cards[b] = mine;
    log(P + 'Swap with ' + obj(t) + ': a ' + mine.v + ' for a ' + theirs.v + '.');
  } else if (k === 'force') {
    log(P + 'Force Hit on ' + obj(t) + '.');
    giveCard(t, drawAny());
  } else if (k === 'trim') {
    var hi = 1;
    for (var x = 2; x < p.cards.length; x++) if (p.cards[x].v > p.cards[hi].v) hi = x;
    var gone = p.cards.splice(hi, 1)[0];
    S.discards.push(gone.v);
    log(P + 'Trim and ' + V(p, 'discard', 'discards') + ' a ' + gone.v + '.');
  } else if (k === 'shield') {
    p.shield = true;
    log(P + 'Shield.');
  } else if (k === 'lower') {
    S.target = 18;
    log(P + 'Target 18. The target is now 18.');
  } else if (k === 'raise') {
    S.target = 24;
    log(P + 'Target 24. The target is now 24.');
  } else if (k === 'peek') {
    p.peeked.add(ti);
    log(P + 'Peek at ' + (t.human ? 'your' : t.name + '’s') + ' face-down card' + (p.human ? ': it is a ' + t.cards[0].v + '.' : '.'));
  } else if (k === 'reverse') {
    S.dir *= -1;
    log(P + 'Reverse. Turn order flips.');
  }
  settleAll();
}

function doHit(p) { giveCard(p, drawAny()); settleAll(); }
function doStand(p) { p.stood = true; log(p.name + ' ' + V(p, 'stand', 'stands') + ' on ' + total(p) + (p.human ? '.' : ' (' + visTotal(p) + ' showing).')); }

// ---------- bots ----------
function botKnows(p, o) { return o === p || p.peeked.has(idxOf(o)); }
function estTotal(p, o) {
  if (!o.cards.length) return 0;
  return visTotal(o) + (botKnows(p, o) ? o.cards[0].v : 5.5);
}

function botChooseAction(p) {
  var has = function (k) { return p.actions.some(function (a) { return a.k === k; }) && valid(p, k); };
  var T = total(p), tgt = S.target;
  var opps = S.players.filter(function (o) { return o !== p && !o.bust; });
  var r = Math.random;

  if (has('lower') && T <= 18) {
    var victims = opps.filter(function (o) { return estTotal(p, o) > 18; }).length;
    if (victims >= 1 && r() < 0.7) return { k: 'lower' };
  }
  if (has('raise') && T >= tgt - 2 && T < 24 && T !== tgt && r() < 0.6) return { k: 'raise' };
  if (has('peek')) {
    var pt = targetsFor(p, 'peek')[0];
    return { k: 'peek', target: idxOf(pt) };
  }
  if (has('shield') && T >= 9) return { k: 'shield' };
  if (has('force')) {
    var cands = targetsFor(p, 'force').slice().sort(function (a, b) { return estTotal(p, b) - estTotal(p, a); });
    if (cands.length && estTotal(p, cands[0]) >= tgt - 6 && r() < 0.75) return { k: 'force', target: idxOf(cands[0]) };
  }
  if (has('swap')) {
    var myLast = p.cards[p.cards.length - 1].v;
    var sc = targetsFor(p, 'swap');
    for (var i = 0; i < sc.length; i++) {
      var o = sc[i], oLast = o.cards[o.cards.length - 1].v;
      var myNew = T - myLast + oLast;
      var oNew = estTotal(p, o) - oLast + myLast;
      if (myNew <= tgt && ((oNew > tgt && r() < 0.8) || (myNew - T >= 3 && T < tgt - 4 && r() < 0.5))) {
        return { k: 'swap', target: idxOf(o) };
      }
    }
  }
  if (has('trim') && T >= tgt - 3 && T < tgt && r() < 0.5) return { k: 'trim' };
  if (has('skip') && T < tgt - 5 && r() < 0.5) return { k: 'skip' };
  if (has('reverse') && r() < 0.2) return { k: 'reverse' };
  return null;
}

function botShouldHit(p) {
  var T = total(p), tgt = S.target;
  if (T >= tgt) return false;
  var others = S.players.filter(function (o) { return o !== p; });
  if (others.every(function (o) { return o.bust; })) return false;
  if (T < tgt - 4) return true;
  var best = 0;
  others.forEach(function (o) { if (!o.bust) best = Math.max(best, estTotal(p, o)); });
  if (best > T && T < tgt - 1) return Math.random() < (p.shield ? 0.9 : 0.55);
  if (p.shield && T < tgt - 1) return true;
  return false;
}

async function botTurn(p) {
  render();
  await sleep(900);
  var ch = botChooseAction(p);
  if (ch) {
    doAction(p, ch.k, ch.target);
    render();
    await sleep(1000);
    if (!active(p) || roundOver()) return;
  }
  if (botShouldHit(p)) doHit(p); else doStand(p);
  render();
  await sleep(700);
}

// ---------- human turn ----------
function humanTurn() {
  return new Promise(function (res) {
    S.humanTurn = true; S.acted = false; S.pending = null;
    S.finish = function () { S.humanTurn = false; S.pending = null; S.finish = null; res(); };
    render();
  });
}
function playHuman(k, ti) {
  var me = S.players[0];
  if (!S.humanTurn || S.acted || !valid(me, k) || !me.actions.some(function (a) { return a.k === k; })) return;
  S.acted = true; S.pending = null;
  doAction(me, k, ti);
  render();
  if (!active(me) || roundOver()) { if (S.finish) S.finish(); }
}
function humanHit() {
  if (!S.humanTurn || S.pending) return;
  var me = S.players[0];
  S.humanTurn = false;
  doHit(me); render();
  if (S.finish) S.finish();
}
function humanStand() {
  if (!S.humanTurn || S.pending) return;
  var me = S.players[0];
  S.humanTurn = false;
  doStand(me); render();
  if (S.finish) S.finish();
}

// ---------- flow ----------
function initMatch() {
  S.players = NAMES.map(function (n, i) {
    return { name: n, human: i === 0, points: 0, cards: [], actions: [], stood: false, bust: false, skip: false, shield: false, peeked: new Set() };
  });
  S.round = 0; S.log = []; S.champ = null; S.result = null; S.seen = new Set();
  startRound();
  S.phase = 'intro';
  render();
}

function startRound() {
  S.round++;
  S.deck = makeDeck(); S.discards = [];
  S.target = 21; S.dir = 1; S.roundEnded = false; S.flipped = false;
  S.pending = null; S.humanTurn = false; S.acted = false; S.result = null;
  S.players.forEach(function (p) {
    p.cards = []; p.actions = []; p.stood = false; p.bust = false; p.skip = false; p.shield = false; p.peeked = new Set();
  });
  S.players.forEach(function (p) { p.actions.push(drawAction()); });
  for (var pass = 0; pass < 2; pass++) S.players.forEach(function (p) { p.cards.push(drawNumber()); });
  S.cur = (S.round - 1) % S.players.length;
  log('Round ' + S.round + '. Target 21. ' + S.players[S.cur].name + (S.players[S.cur].human ? ' go' : ' goes') + ' first.');
  settleAll();
}

async function runRound() {
  var guard = 0;
  while (!roundOver()) {
    if (++guard > 600) throw new Error('round did not terminate');
    var p = S.players[S.cur];
    if (!active(p)) { S.cur = nextIdx(S.cur); continue; }
    if (p.skip) {
      p.skip = false;
      log(p.name + ' ' + V(p, 'miss', 'misses') + ' the turn.');
      render(); await sleep(800);
      S.cur = nextIdx(S.cur);
      continue;
    }
    S.acted = false;
    render();
    if (p.human && !S.autoHuman) await humanTurn(); else await botTurn(p);
    if (roundOver()) break;
    S.cur = nextIdx(S.cur);
  }
  await endRound();
}

async function endRound() {
  S.roundEnded = true;
  S.phase = 'reveal';
  var rows = S.players.map(function (p) { return { p: p, total: total(p), bust: p.bust }; });
  var elig = rows.filter(function (r) { return !r.bust; });
  var winner = null, pts = 0, msg;
  if (!elig.length) {
    msg = 'Everyone busted. No points.';
  } else {
    var best = Math.max.apply(null, elig.map(function (r) { return r.total; }));
    var w = elig.filter(function (r) { return r.total === best; });
    if (w.length === 1) {
      winner = w[0].p;
      pts = best === S.target ? 2 : 1;
      winner.points += pts;
      msg = winner.name + ' ' + V(winner, 'win', 'wins') + ' with ' + best + (pts === 2 ? ', exactly on target: 2 points.' : ': 1 point.');
    } else {
      msg = 'Tie at ' + best + '. No points.';
    }
  }
  S.result = { rows: rows, winner: winner, pts: pts, msg: msg, target: S.target };
  log('Round over. ' + msg);
  awardRound(winner, pts);
  render();
  await sleep(1800);
  S.champ = S.players.find(function (p) { return p.points >= WIN_POINTS; }) || null;
  if (S.champ) awardMatch();
  S.phase = S.champ ? 'matchEnd' : 'roundEnd';
  render();
}

async function beginRound() {
  S.phase = 'play';
  render();
  await sleep(500);
  await runRound();
}
function nextRound() {
  startRound();
  return beginRound();
}

// ---------- risk hint ----------
function bustRisk(me) {
  var seen = [], v;
  for (v = 0; v <= 10; v++) seen[v] = 0;
  me.cards.forEach(function (c) { seen[c.v]++; });
  S.players.forEach(function (o, i) {
    if (o === me) return;
    o.cards.forEach(function (c, ci) { if (ci > 0 || me.peeked.has(i)) seen[c.v]++; });
  });
  S.discards.forEach(function (d) { seen[d]++; });
  var un = 0, bad = 0, gap = S.target - total(me);
  for (v = 1; v <= 10; v++) {
    var n = Math.max(0, 4 - seen[v]);
    un += n;
    if (v > gap) bad += n;
  }
  if (!un) return 0;
  return Math.round((bad / un) * 0.69 * 20) * 5;
}


// ---------- state additions ----------
S.say = ''; S.screen = null; S.stake = 0; S.potWon = 0; S.oddsOn = false; S.offers = {}; S.storeReady = false; S.storeState = 'loading'; S.buying = ''; S.onb = 0; S.reward = null;
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function say(k) { var l = SAYS[k]; if (!l) return; S.say = pick(l); }
function fmt(n) { return Number(n).toLocaleString('en-US'); }
function toast(m) { S.toast = { m: String(m), id: ++S.toastId }; }


// ---------- rewards ----------
function awardRound(winner, pts) {
  SAVE.stats.rounds++;
  var n = REWARD.played;
  if (winner && winner.human) { SAVE.stats.roundWins++; n += REWARD.round + (pts === 2 ? REWARD.exact : 0); }
  S.reward = { chips: n, match: 0 };
  gain(n);
  if (winner && winner.human && pts === 2) say('exact'); else if (S.players[0].bust) say('bust'); else if (winner) say(winner.human ? 'win' : 'lose');
}
function takeBoot() {
  var b = SAVE.boot | 0; S.stake = 0; S.potWon = 0;
  if (b <= 0) return;
  if (SAVE.bank < b) { SAVE.boot = 0; persist(); toast('Not enough chips for that table. Playing free practice.'); return; }
  gain(-b); S.stake = b;
}
function awardMatch() {
  SAVE.stats.matches++;
  if (S.stake > 0 && S.champ && S.champ.human) { S.potWon = S.stake * SEATS; gain(S.potWon); }
  if (S.champ && S.champ.human) { SAVE.stats.wins++; SAVE.stats.streak++; SAVE.stats.best = Math.max(SAVE.stats.best, SAVE.stats.streak); gain(REWARD.match); S.reward.match = REWARD.match; }
  else SAVE.stats.streak = 0;
  persist();
}
function dailyAmount() { var s = (SAVE.daily.last === yesterday() ? SAVE.daily.streak : 0) + 1; return { amount: 1000 + 250 * Math.min(s - 1, 4), streak: s }; }
function dailyReady() { return SAVE.daily.last !== today(); }
function claimDaily() {
  var d = dailyAmount(); SAVE.daily = { last: today(), streak: d.streak }; gain(d.amount); toast('+' + fmt(d.amount) + ' chips. See you tomorrow.');
}
function buyItem(kind, id) {
  var it = CATALOG[kind].filter(function (x) { return x.id === id; })[0]; if (!it) return;
  if (SAVE.owned[kind].indexOf(id) < 0) {
    if (SAVE.bank < it.cost) { toast('Not enough chips yet. Play a round or open the shop.'); return; }
    gain(-it.cost); SAVE.owned[kind].push(id); toast(it.name + ' unlocked.');
  }
  SAVE.eq[kind] = id; persist();
}
function useOdds() {
  if (!S.humanTurn || S.pending || S.oddsOn) return;
  if (SAVE.bank < ODDS_COST) { toast('Odds cost ' + ODDS_COST + ' chips. Open the shop for more.'); return; }
  gain(-ODDS_COST); S.oddsOn = true;
}
function statusText() {
  if (S.phase === 'intro') return 'Ready when you are.';
  if (S.roundEnded) return 'Cards revealed.';
  if (S.pending) return 'Pick a target for ' + ACTIONS[S.pending.k].name + '.';
  if (S.humanTurn) return S.acted ? 'Action played. Now Hit or Stand.' : 'Your turn. Play an action card if you like, then Hit or Stand.';
  var p = S.players[S.cur]; return p && !p.human ? p.name + ' is playing…' : '';
}
function tableLine() { return SAVE.boot > 0 ? 'Table: ' + fmt(SAVE.boot) + ' boot · pot ' + fmt(SAVE.boot * SEATS) : 'Table: free practice'; }

// ---------- change notification ----------
S.v = 0; S.toast = null; S.toastId = 0; S.twistN = 0; S.onbLen = 3;
var listeners = new Set(), lastTarget = 21;
function subscribe(fn) { listeners.add(fn); return function () { listeners.delete(fn); }; }
function version() { return S.v; }
function render() {
  if (S.target !== lastTarget) { lastTarget = S.target; if (S.target !== 21) { say('twist'); S.twistN++; } }
  S.v++;
  listeners.forEach(function (fn) { fn(); });
}

// ---------- player actions (everything the screens can do) ----------
function act(a, arg, arg2) {
  var me = S.players[0];
  if (a === 'card') {
    var k = arg; if (!S.humanTurn || S.acted || !valid(me, k)) return;
    if (targetsFor(me, k)) { S.pending = { k: k }; render(); } else playHuman(k);
  } else if (a === 'target') { if (S.pending) playHuman(S.pending.k, +arg); }
  else if (a === 'cancel') { S.pending = null; render(); }
  else if (a === 'hit') { humanHit(); }
  else if (a === 'stand') { humanStand(); }
  else if (a === 'odds') { useOdds(); render(); }
  else if (a === 'start') { takeBoot(); say('start'); beginRound(); }
  else if (a === 'next') { say('start'); nextRound(); }
  else if (a === 'newmatch') { initMatch(); takeBoot(); say('start'); beginRound(); }
  else if (a === 'open') { S.screen = arg; render(); }
  else if (a === 'close') { S.screen = null; render(); }
  else if (a === 'settable') { var v = +arg; if (v === 0 || SAVE.bank >= v) { SAVE.boot = v; persist(); S.screen = null; toast(v ? 'Table set: ' + fmt(v) + ' boot' : 'Free practice table'); } else toast('Not enough chips for that table yet.'); render(); }
  else if (a === 'daily') { claimDaily(); render(); }
  else if (a === 'item') { buyItem(arg, arg2); render(); }
  else if (a === 'onbnext') { S.onb++; render(); }
  else if (a === 'onbskip') { S.onb = S.onbLen; render(); }
  else if (a === 'onbdone') { SAVE.onboarded = true; persist(); if (dailyReady()) claimDaily(); render(); }
  else if (a === 'buying') { S.buying = 'paywall'; render(); }
}
function grantPack(id) {
  var p = PACKS.filter(function (x) { return x.id === id; })[0]; if (!p) return false;
  S.buying = ''; gain(p.chips, 'buy'); toast('+' + fmt(p.chips) + ' chips added'); render(); return true;
}
function setOffers(list) {
  S.offers = {}; (list || []).forEach(function (o) { if (o && o.id && o.price) S.offers[o.id] = o; });
  S.storeReady = Object.keys(S.offers).length > 0; S.storeState = S.storeReady ? 'ready' : 'unavailable'; render();
}
function setStoreReady(on) { S.storeReady = !!on; S.storeState = on ? 'ready' : 'unavailable'; render(); }
function buyDone() { S.buying = ''; render(); }

export {
S, SAVE, PACKS, CATALOG, REWARD, TABLES, SEATS, ODDS_COST, ACTIONS, ORDER, WIN_POINTS, NAMES,
PRIVACY_URL, TERMS_URL, SUPPORT_URL,
subscribe, version, act, grantPack, setOffers, setStoreReady, buyDone, hydrate, readSave, setSaveHook,
initMatch, beginRound, nextRound, total, visTotal, active, idxOf, valid, targetsFor, bustRisk, fmt,
statusText, tableLine, dailyReady, dailyAmount, buyItem, claimDaily,
};
