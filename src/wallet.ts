// Pure Chips Pass and chip wallet logic. No React Native imports, so it runs under node --test.
// Chips are virtual game currency with no cash value.

export const PASS_MONTHLY_ID = 'twist21_chipspass_monthly';
export const PASS_YEARLY_ID = 'twist21_chipspass_yearly';
export const PASS_IDS: readonly string[] = [PASS_YEARLY_ID, PASS_MONTHLY_ID];
/** The retired one-time Premium product. Anyone who owns it keeps the Pass perks. */
export const LEGACY_PREMIUM_ID = 'twist21_premium';

export const PACK_CHIPS: Readonly<Record<string, number>> = {
  twist21_chips_5k: 5_000,
  twist21_chips_18k: 18_000,
  twist21_chips_35k: 35_000,
  twist21_chips_80k: 80_000,
  twist21_chips_200k: 200_000,
};
export const PACK_IDS: readonly string[] = Object.keys(PACK_CHIPS);

export const START_CHIPS = 10_000;
/**
 * Daily bonus by streak day (day 1 first). Day 7 and later stay on the last value while the
 * streak continues. Missing a local calendar day starts again at day 1. Change the numbers here.
 */
export const DAILY_RAMP: readonly number[] = [1_000, 1_350, 1_650, 2_000, 2_350, 2_650, 3_000];
export const PASS_DAILY_MULTIPLIER = 2;
export const PASS_MONTHLY_CHIPS = 10_000;
const MAX_REMEMBERED = 500;
/** How long a cached Pass stays trusted offline when the store gave no expiry. */
export const PASS_OFFLINE_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

export type PassState = {
  active: boolean;
  productId: string | null;
  /** Stable id for the subscription chain (original transaction id). */
  anchor: string | null;
  /** Verified transaction id of the current billing period (the purchase or the latest renewal). */
  periodTx: string | null;
  /** Purchase date of the current billing period, ms. The yearly monthly drip counts from here. */
  periodStart: number | null;
  /** Expiry of the current billing period, ms. */
  expiresAt: number | null;
  checkedAt: number;
};

export type Wallet = {
  v: 1;
  chips: number;
  /** Consumable transaction ids that were already credited. Guards against double credit. */
  processed: string[];
  /**
   * Pass grant keys already paid. Each grant writes two keys, one on the period's verified
   * transaction id and one on product plus expiry, so a record that only carries one still matches.
   */
  passGrants: string[];
  /** Local day (YYYY-MM-DD) the daily bonus was last claimed. */
  lastDaily: string | null;
  /** Streak day of the last claim (1 = first day). 0 before the first claim. */
  streakDay: number;
  legacyPremium: boolean;
  pass: PassState;
};

export type Perks = {
  noAds: boolean;
  dailyMultiplier: number;
  monthlyChips: number;
  fullDeck: boolean;
  unlimitedMatches: boolean;
};

export function emptyPass(): PassState {
  return { active: false, productId: null, anchor: null, periodTx: null, periodStart: null, expiresAt: null, checkedAt: 0 };
}

export function emptyWallet(): Wallet {
  return { v: 1, chips: START_CHIPS, processed: [], passGrants: [], lastDaily: null, streakDay: 0, legacyPremium: false, pass: emptyPass() };
}

const num = (x: unknown, d: number): number => (typeof x === 'number' && Number.isFinite(x) ? x : d);
const strs = (x: unknown): string[] => (Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string') : []);
const strOrNull = (x: unknown): string | null => (typeof x === 'string' ? x : null);
const numOrNull = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);

/** Tolerant parse of whatever was stored. Unknown or broken data starts a fresh wallet. */
export function normalizeWallet(raw: unknown): Wallet {
  if (!raw || typeof raw !== 'object') return emptyWallet();
  const r = raw as Record<string, unknown>;
  const p = (r.pass && typeof r.pass === 'object' ? r.pass : {}) as Record<string, unknown>;
  return {
    v: 1,
    chips: Math.max(0, Math.floor(num(r.chips, START_CHIPS))),
    processed: strs(r.processed).slice(-MAX_REMEMBERED),
    passGrants: strs(r.passGrants).slice(-MAX_REMEMBERED),
    lastDaily: strOrNull(r.lastDaily),
    streakDay: Math.max(0, Math.floor(num(r.streakDay, 0))),
    legacyPremium: r.legacyPremium === true,
    pass: {
      active: p.active === true,
      productId: strOrNull(p.productId),
      anchor: strOrNull(p.anchor),
      periodTx: strOrNull(p.periodTx),
      periodStart: numOrNull(p.periodStart),
      expiresAt: numOrNull(p.expiresAt),
      checkedAt: num(p.checkedAt, 0),
    },
  };
}

const remember = (list: string[], key: string): string[] => [...list, key].slice(-MAX_REMEMBERED);

export function isPackId(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(PACK_CHIPS, id);
}
export function isPassId(id: string): boolean {
  return PASS_IDS.includes(id);
}

export function wasProcessed(w: Wallet, transactionId: string): boolean {
  return w.processed.includes(transactionId);
}

/**
 * Credit a consumable chip pack exactly once per transaction id.
 * Call this, persist the wallet, and only then finish the transaction.
 */
export function creditPack(w: Wallet, transactionId: string, productId: string): { wallet: Wallet; credited: number } {
  if (!transactionId || !isPackId(productId) || wasProcessed(w, transactionId)) return { wallet: w, credited: 0 };
  const credited = PACK_CHIPS[productId];
  return { wallet: { ...w, chips: w.chips + credited, processed: remember(w.processed, transactionId) }, credited };
}

/** Whole subscription months elapsed since `startMs` (0 during the first month). */
export function monthIndex(startMs: number, nowMs: number): number {
  if (!(nowMs > startMs)) return 0;
  const a = new Date(startMs);
  const b = new Date(nowMs);
  let m = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  const aRest = ((a.getUTCDate() * 24 + a.getUTCHours()) * 60 + a.getUTCMinutes()) * 60_000 + a.getUTCSeconds() * 1000 + a.getUTCMilliseconds();
  const bRest = ((b.getUTCDate() * 24 + b.getUTCHours()) * 60 + b.getUTCMinutes()) * 60_000 + b.getUTCSeconds() * 1000 + b.getUTCMilliseconds();
  if (bRest < aRest) m -= 1;
  return Math.max(0, m);
}

/**
 * Grant keys for the current verified billing period and month slot.
 * Monthly plan: one slot per period. Yearly plan: one slot per month of the year (12 slots),
 * still tied to the verified yearly period, so each slot is paid exactly once.
 */
export function passGrantKeys(p: PassState, nowMs: number): string[] {
  // Keys use the period's own transaction id and its product+expiry, never the chain anchor,
  // because some store records (active subscriptions) do not carry the original transaction id.
  if (!p.productId || (!p.periodTx && p.expiresAt == null)) return [];
  const slot = p.productId === PASS_YEARLY_ID && p.periodStart != null ? Math.min(11, monthIndex(p.periodStart, nowMs)) : 0;
  const keys: string[] = [];
  if (p.periodTx) keys.push(`tx:${p.periodTx}:m${slot}`);
  if (p.expiresAt != null) keys.push(`exp:${p.productId}:${p.expiresAt}:m${slot}`);
  return keys;
}

/** Pay the 10,000 Pass chips once for the current verified period (or yearly month slot). */
export function grantPassMonth(w: Wallet, nowMs: number): { wallet: Wallet; credited: number } {
  if (!passActiveAt(w, nowMs)) return { wallet: w, credited: 0 };
  const keys = passGrantKeys(w.pass, nowMs);
  if (!keys.length || keys.some((k) => w.passGrants.includes(k))) return { wallet: w, credited: 0 };
  let grants = w.passGrants;
  for (const k of keys) grants = remember(grants, k);
  return { wallet: { ...w, chips: w.chips + PASS_MONTHLY_CHIPS, passGrants: grants }, credited: PASS_MONTHLY_CHIPS };
}

export function localDay(nowMs: number): string {
  const d = new Date(nowMs);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function previousLocalDay(nowMs: number): string {
  const d = new Date(nowMs);
  d.setDate(d.getDate() - 1);
  return localDay(d.getTime());
}

/** Base bonus for a streak day (1-based); day 7 and later use the last ramp value. */
export function rampAmount(streakDay: number): number {
  const i = Math.min(Math.max(1, Math.floor(streakDay)), DAILY_RAMP.length) - 1;
  return DAILY_RAMP[i];
}

/** The streak day a claim made now would land on. */
export function nextStreakDay(w: Wallet, nowMs: number): number {
  const today = localDay(nowMs);
  if (w.lastDaily === today) return w.streakDay;
  return w.lastDaily === previousLocalDay(nowMs) ? w.streakDay + 1 : 1;
}

/** Daily chip bonus, once per local day, on the 7-day ramp. Doubled for Chips Pass members. */
export function claimDaily(w: Wallet, nowMs: number): { wallet: Wallet; credited: number } {
  const day = localDay(nowMs);
  if (w.lastDaily === day) return { wallet: w, credited: 0 };
  const streakDay = nextStreakDay(w, nowMs);
  const credited = rampAmount(streakDay) * perksFor(w, nowMs).dailyMultiplier;
  return { wallet: { ...w, chips: w.chips + credited, lastDaily: day, streakDay }, credited };
}

/** For the UI: today's streak day, whether it is claimed, and tomorrow's amount if the streak holds. */
export function dailyPreview(w: Wallet, nowMs: number): { streakDay: number; claimedToday: boolean; today: number; tomorrow: number } {
  const mult = perksFor(w, nowMs).dailyMultiplier;
  const claimedToday = w.lastDaily === localDay(nowMs);
  const streakDay = nextStreakDay(w, nowMs);
  return { streakDay, claimedToday, today: rampAmount(streakDay) * mult, tomorrow: rampAmount(streakDay + 1) * mult };
}

/** Is the Pass usable right now, from the cached store state (works offline for a short grace). */
export function passActiveAt(w: Wallet, nowMs: number): boolean {
  const p = w.pass;
  if (!p.active) return false;
  if (p.expiresAt != null) return p.expiresAt > nowMs;
  return nowMs - p.checkedAt < PASS_OFFLINE_GRACE_MS;
}

export function hasPassPerks(w: Wallet, nowMs: number): boolean {
  return w.legacyPremium || passActiveAt(w, nowMs);
}

export function perksFor(w: Wallet, nowMs: number): Perks {
  const pass = passActiveAt(w, nowMs);
  const any = pass || w.legacyPremium;
  return {
    noAds: any,
    dailyMultiplier: any ? PASS_DAILY_MULTIPLIER : 1,
    monthlyChips: pass ? PASS_MONTHLY_CHIPS : 0,
    fullDeck: any,
    unlimitedMatches: any,
  };
}

/** Minimal shape of a store transaction or active-subscription record. */
export type StoreRecord = {
  productId: string;
  transactionId?: string | null;
  id?: string | null;
  purchaseState?: string | null;
  isActive?: boolean | null;
  transactionDate?: number | null;
  originalTransactionIdentifierIOS?: string | null;
  originalTransactionDateIOS?: number | null;
  expirationDateIOS?: number | null;
  revocationDateIOS?: number | null;
};

/**
 * Work out the Pass from store records (available purchases plus active subscriptions).
 * Prefers yearly over monthly. A revoked or expired record never counts.
 */
export function passFromStore(records: StoreRecord[], nowMs: number): PassState {
  const live = records.filter((r) => {
    if (!isPassId(r.productId)) return false;
    if (r.revocationDateIOS) return false;
    if (r.purchaseState === 'pending') return false;
    if (r.isActive === false) return false;
    if (r.expirationDateIOS != null && r.expirationDateIOS <= nowMs) return false;
    return true;
  });
  if (!live.length) return { ...emptyPass(), checkedAt: nowMs };
  // Yearly before monthly, then the newest period (latest renewal) first.
  live.sort(
    (a, b) =>
      PASS_IDS.indexOf(a.productId) - PASS_IDS.indexOf(b.productId) ||
      (b.expirationDateIOS ?? b.transactionDate ?? 0) - (a.expirationDateIOS ?? a.transactionDate ?? 0),
  );
  const best = live[0];
  const anchor = best.originalTransactionIdentifierIOS || best.transactionId || best.id || best.productId;
  const periodTx = best.transactionId || best.id || null;
  const periodStart = best.transactionDate ?? best.originalTransactionDateIOS ?? nowMs;
  const expiresAt = best.expirationDateIOS ?? null;
  return { active: true, productId: best.productId, anchor, periodTx, periodStart, expiresAt, checkedAt: nowMs };
}

export function ownsLegacyPremium(records: StoreRecord[]): boolean {
  return records.some((r) => r.productId === LEGACY_PREMIUM_ID && r.purchaseState !== 'pending' && !r.revocationDateIOS);
}

/** Apply a fresh store read: new Pass state, legacy Premium, then any due monthly grant. */
export function applyStoreState(w: Wallet, records: StoreRecord[], nowMs: number): { wallet: Wallet; credited: number } {
  const next: Wallet = { ...w, pass: passFromStore(records, nowMs), legacyPremium: w.legacyPremium || ownsLegacyPremium(records) };
  return grantPassMonth(next, nowMs);
}
