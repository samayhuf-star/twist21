import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyStoreState, claimDaily, creditPack, emptyWallet, grantPassMonth, monthIndex, normalizeWallet,
  passActiveAt, passFromStore, perksFor, dailyPreview, rampAmount, DAILY_RAMP, PASS_MONTHLY_CHIPS, START_CHIPS,
} from '../src/wallet.ts';

const NOW = Date.UTC(2026, 10, 12, 14, 0, 0);
const DAY = 86_400_000;

test('a pack credits once per transaction id', () => {
  const a = creditPack(emptyWallet(), 'tx1', 'twist21_chips_18k');
  assert.equal(a.credited, 18_000);
  assert.equal(a.wallet.chips, START_CHIPS + 18_000);
  const b = creditPack(a.wallet, 'tx1', 'twist21_chips_18k');
  assert.equal(b.credited, 0);
  assert.equal(b.wallet.chips, a.wallet.chips);
});

test('double-credit guard survives a save and reload (relaunch)', () => {
  const a = creditPack(emptyWallet(), 'tx-relaunch', 'twist21_chips_200k');
  const reloaded = normalizeWallet(JSON.parse(JSON.stringify(a.wallet)));
  const b = creditPack(reloaded, 'tx-relaunch', 'twist21_chips_200k');
  assert.equal(b.credited, 0);
  assert.equal(b.wallet.chips, START_CHIPS + 200_000);
});

test('replayed transactions on restore never double-credit, new ones still do', () => {
  let w = emptyWallet();
  for (const id of ['t1', 't2', 't1', 't2', 't1']) w = creditPack(w, id, 'twist21_chips_5k').wallet;
  assert.equal(w.chips, START_CHIPS + 10_000);
  w = creditPack(w, 't3', 'twist21_chips_5k').wallet;
  assert.equal(w.chips, START_CHIPS + 15_000);
});

test('unknown products and empty ids are ignored', () => {
  assert.equal(creditPack(emptyWallet(), 'tx', 'twist21_chipspass_monthly').credited, 0);
  assert.equal(creditPack(emptyWallet(), '', 'twist21_chips_5k').credited, 0);
});

test('every pack size credits the right chips', () => {
  const sizes: Record<string, number> = { twist21_chips_5k: 5000, twist21_chips_18k: 18000, twist21_chips_35k: 35000, twist21_chips_80k: 80000, twist21_chips_200k: 200000 };
  for (const [id, n] of Object.entries(sizes)) assert.equal(creditPack(emptyWallet(), 'x' + id, id).credited, n);
});

test('monthIndex counts whole months', () => {
  const s = Date.UTC(2026, 0, 31, 10);
  assert.equal(monthIndex(s, s), 0);
  assert.equal(monthIndex(s, Date.UTC(2026, 1, 28, 10)), 0);
  assert.equal(monthIndex(s, Date.UTC(2026, 2, 31, 10)), 2);
  assert.equal(monthIndex(s, s - 1000), 0);
});

const passRecord = (over: Record<string, unknown> = {}) => ({
  productId: 'twist21_chipspass_monthly', transactionId: 'r1', originalTransactionIdentifierIOS: 'orig1',
  originalTransactionDateIOS: NOW - 5 * DAY, expirationDateIOS: NOW + 25 * DAY, purchaseState: 'purchased', ...over,
});

test('monthly Pass grants 10,000 chips once per verified period', () => {
  const a = applyStoreState(emptyWallet(), [passRecord()], NOW);
  assert.equal(a.credited, PASS_MONTHLY_CHIPS);
  // Same period seen again: relaunch read, restore, listener replay, or the active-subscription
  // record that has no original transaction id.
  const replays = [
    passRecord(),
    { productId: 'twist21_chipspass_monthly', transactionId: 'r1', expirationDateIOS: NOW + 25 * DAY, isActive: true },
    { productId: 'twist21_chipspass_monthly', transactionId: 'r1-dup', expirationDateIOS: NOW + 25 * DAY, isActive: true },
  ];
  let w = a.wallet;
  for (const r of replays) {
    const again = applyStoreState(w, [r], NOW + DAY);
    assert.equal(again.credited, 0);
    w = normalizeWallet(JSON.parse(JSON.stringify(again.wallet)));
  }
  assert.equal(w.chips, START_CHIPS + PASS_MONTHLY_CHIPS);
  // No renewal yet: a cached Pass gives nothing more in the same period.
  assert.equal(grantPassMonth(w, NOW + 20 * DAY).credited, 0);
  // Verified renewal: new transaction id and expiry, credited once.
  const renewal = passRecord({ transactionId: 'r2', transactionDate: NOW + 25 * DAY, expirationDateIOS: NOW + 55 * DAY });
  const next = applyStoreState(w, [renewal], NOW + 26 * DAY);
  assert.equal(next.credited, PASS_MONTHLY_CHIPS);
  assert.equal(applyStoreState(next.wallet, [renewal], NOW + 27 * DAY).credited, 0);
});

test('yearly Pass drips 10,000 once per month of the verified year', () => {
  const start = NOW;
  const yearly = (over: Record<string, unknown> = {}) => passRecord({
    productId: 'twist21_chipspass_yearly', transactionId: 'y1', originalTransactionIdentifierIOS: 'oy',
    transactionDate: start, expirationDateIOS: start + 365 * DAY, ...over,
  });
  let w = emptyWallet();
  let total = 0;
  for (let d = 0; d < 365; d += 5) {
    const r = applyStoreState(w, [yearly()], start + d * DAY);
    total += r.credited;
    w = r.wallet;
  }
  assert.equal(total, 12 * PASS_MONTHLY_CHIPS);
  // Replays inside the year never add more.
  assert.equal(applyStoreState(w, [yearly()], start + 364 * DAY).credited, 0);
});

test('yearly Pass also pays monthly and wins over monthly', () => {
  const recs = [passRecord(), passRecord({ productId: 'twist21_chipspass_yearly', originalTransactionIdentifierIOS: 'origY', expirationDateIOS: NOW + 300 * DAY })];
  const p = passFromStore(recs, NOW);
  assert.equal(p.productId, 'twist21_chipspass_yearly');
  assert.equal(p.anchor, 'origY');
  assert.equal(p.periodTx, 'r1');
});

test('expired, revoked or pending Pass gives no perks', () => {
  for (const over of [{ expirationDateIOS: NOW - 1 }, { revocationDateIOS: NOW - DAY }, { purchaseState: 'pending' }, { isActive: false }]) {
    const a = applyStoreState(emptyWallet(), [passRecord(over)], NOW);
    assert.equal(a.wallet.pass.active, false);
    assert.equal(a.credited, 0);
    assert.equal(perksFor(a.wallet, NOW).noAds, false);
  }
});

test('Pass perks: no ads, 2x daily bonus, full deck', () => {
  const w = applyStoreState(emptyWallet(), [passRecord()], NOW).wallet;
  const p = perksFor(w, NOW);
  assert.deepEqual(p, { noAds: true, dailyMultiplier: 2, monthlyChips: PASS_MONTHLY_CHIPS, fullDeck: true, unlimitedMatches: true });
  const d = claimDaily(w, NOW);
  assert.equal(d.credited, DAILY_RAMP[0] * 2);
  assert.equal(claimDaily(d.wallet, NOW + 1000).credited, 0);
});

test('daily ramp: 1,000 to 3,000 over 7 consecutive days, then stays at 3,000', () => {
  assert.deepEqual([...DAILY_RAMP], [1000, 1350, 1650, 2000, 2350, 2650, 3000]);
  let w = emptyWallet();
  const got: number[] = [];
  for (let i = 0; i < 10; i++) {
    const r = claimDaily(w, NOW + i * DAY);
    got.push(r.credited);
    w = r.wallet;
  }
  assert.deepEqual(got, [1000, 1350, 1650, 2000, 2350, 2650, 3000, 3000, 3000, 3000]);
  assert.equal(w.streakDay, 10);
  assert.equal(rampAmount(0), 1000);
  assert.equal(rampAmount(99), 3000);
});

test('daily bonus only once per local day', () => {
  const d = claimDaily(emptyWallet(), NOW);
  assert.equal(d.credited, 1000);
  assert.equal(claimDaily(d.wallet, NOW + 60_000).credited, 0);
});

test('missing a calendar day resets the streak to day 1', () => {
  let w = emptyWallet();
  for (let i = 0; i < 4; i++) w = claimDaily(w, NOW + i * DAY).wallet;
  assert.equal(w.streakDay, 4);
  const r = claimDaily(w, NOW + 5 * DAY); // day index 4 skipped
  assert.equal(r.credited, 1000);
  assert.equal(r.wallet.streakDay, 1);
  assert.equal(claimDaily(r.wallet, NOW + 6 * DAY).credited, 1350);
});

test('Chips Pass doubles every step of the ramp', () => {
  const rec = passRecord({ expirationDateIOS: NOW + 400 * DAY });
  let w = applyStoreState(emptyWallet(), [rec], NOW).wallet;
  const got: number[] = [];
  for (let i = 0; i < 8; i++) {
    const r = claimDaily(w, NOW + i * DAY);
    got.push(r.credited);
    w = r.wallet;
  }
  assert.deepEqual(got, [2000, 2700, 3300, 4000, 4700, 5300, 6000, 6000]);
});

test('preview shows the streak day and tomorrow amount', () => {
  let w = claimDaily(emptyWallet(), NOW).wallet;
  w = claimDaily(w, NOW + DAY).wallet;
  assert.deepEqual(dailyPreview(w, NOW + DAY), { streakDay: 2, claimedToday: true, today: 1350, tomorrow: 1650 });
  assert.deepEqual(dailyPreview(w, NOW + 3 * DAY), { streakDay: 1, claimedToday: false, today: 1000, tomorrow: 1350 });
  const pass = applyStoreState(w, [passRecord()], NOW + DAY).wallet;
  assert.equal(dailyPreview(pass, NOW + DAY).tomorrow, 3300);
});

test('Pass lapses at its expiry even without a fresh store read', () => {
  const w = applyStoreState(emptyWallet(), [passRecord()], NOW).wallet;
  assert.equal(passActiveAt(w, NOW + 24 * DAY), true);
  assert.equal(passActiveAt(w, NOW + 26 * DAY), false);
  assert.equal(grantPassMonth(w, NOW + 40 * DAY).credited, 0);
});

test('old one-time Premium maps to the Pass perks but not the monthly chips', () => {
  const w = applyStoreState(emptyWallet(), [{ productId: 'twist21_premium', transactionId: 'p1', purchaseState: 'purchased' }], NOW).wallet;
  const p = perksFor(w, NOW);
  assert.equal(p.fullDeck, true);
  assert.equal(p.noAds, true);
  assert.equal(p.dailyMultiplier, 2);
  assert.equal(p.monthlyChips, 0);
});

test('broken storage starts a fresh wallet', () => {
  assert.equal(normalizeWallet(null).chips, START_CHIPS);
  assert.equal(normalizeWallet({ chips: 'x', processed: [1, 'a'] }).processed.length, 1);
});
