import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyStoreState, claimDaily, creditPack, emptyWallet, grantPassMonth, monthIndex, normalizeWallet,
  passActiveAt, passFromStore, perksFor, DAILY_BONUS, PASS_MONTHLY_CHIPS, START_CHIPS,
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

test('Pass grants 10,000 chips once per subscription month', () => {
  const a = applyStoreState(emptyWallet(), [passRecord()], NOW);
  assert.equal(a.credited, PASS_MONTHLY_CHIPS);
  const again = applyStoreState(a.wallet, [passRecord({ transactionId: 'r2' })], NOW + DAY);
  assert.equal(again.credited, 0);
  const nextMonth = applyStoreState(again.wallet, [passRecord({ expirationDateIOS: NOW + 60 * DAY })], NOW + 30 * DAY);
  assert.equal(nextMonth.credited, PASS_MONTHLY_CHIPS);
});

test('yearly Pass also pays monthly and wins over monthly', () => {
  const recs = [passRecord(), passRecord({ productId: 'twist21_chipspass_yearly', originalTransactionIdentifierIOS: 'origY', expirationDateIOS: NOW + 300 * DAY })];
  const p = passFromStore(recs, NOW);
  assert.equal(p.productId, 'twist21_chipspass_yearly');
  assert.equal(p.anchor, 'origY');
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
  assert.equal(d.credited, DAILY_BONUS * 2);
  assert.equal(claimDaily(d.wallet, NOW + 1000).credited, 0);
});

test('free players get the plain daily bonus once a day', () => {
  const d = claimDaily(emptyWallet(), NOW);
  assert.equal(d.credited, DAILY_BONUS);
  assert.equal(claimDaily(d.wallet, NOW + 2 * DAY).credited, DAILY_BONUS);
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
