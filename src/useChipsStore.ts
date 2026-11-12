import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import {
  deepLinkToSubscriptions,
  endConnection,
  fetchProducts,
  finishTransaction,
  getActiveSubscriptions,
  getAvailablePurchases,
  initConnection,
  isTransactionVerifiedIOS,
  isUserCancelledError,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  restorePurchases,
  type Product,
  type ProductSubscription,
  type Purchase,
} from 'expo-iap';
import { loadWallet, saveWallet } from './storage';
import {
  applyStoreState,
  claimDaily,
  dailyPreview,
  creditPack,
  emptyWallet,
  grantPassMonth,
  hasPassPerks,
  isPackId,
  isPassId,
  perksFor,
  wasProcessed,
  LEGACY_PREMIUM_ID,
  PACK_IDS,
  PASS_IDS,
  type StoreRecord,
  type Wallet,
} from './wallet';

export type CatalogItem = Product | ProductSubscription;

const FETCH_ATTEMPTS = 3;
const FETCH_RETRY_MS = 800;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function describeStoreError(err: unknown): string {
  if (!err) return 'none';
  const e = err as { code?: unknown; message?: unknown };
  const code = e?.code != null ? String(e.code) : 'no-code';
  const msg = e?.message != null ? String(e.message) : String(err);
  return `${code} ${msg}`.slice(0, 160);
}

function describeFetch(label: string, items: CatalogItem[] | null | undefined, err: unknown): string {
  if (err) return `${label}: error ${describeStoreError(err)}`;
  const list = items ?? [];
  const ids = list.map((i) => i?.id).filter(Boolean).join(',');
  return `${label}: ${list.length}${ids ? ` [${ids}]` : ''}`;
}

function isCancel(err: unknown): boolean {
  try {
    if (isUserCancelledError(err)) return true;
  } catch {
    // fall through
  }
  const code = String((err as { code?: unknown })?.code ?? '').toLowerCase();
  return code.includes('cancel');
}

const transactionKey = (p: Purchase): string => p.transactionId || p.id || '';

/**
 * On-device check before granting anything. StoreKit 2 only hands expo-iap transactions whose
 * signature verified on device; we also require the signed JWS to be present and ask StoreKit
 * again for the product. No server is involved.
 */
async function verifyOnDevice(p: Purchase): Promise<{ ok: boolean; note: string }> {
  if (p.purchaseState === 'pending') return { ok: false, note: 'pending' };
  if (Platform.OS === 'ios') {
    if (!p.purchaseToken) return { ok: false, note: 'missing signed transaction' };
    try {
      const verified = await isTransactionVerifiedIOS(p.productId);
      return verified ? { ok: true, note: 'verified' } : { ok: false, note: 'StoreKit verification failed' };
    } catch (err) {
      // The signed transaction was already verified by StoreKit 2 before it reached us.
      return { ok: true, note: `jws present, recheck error ${describeStoreError(err)}` };
    }
  }
  return { ok: p.purchaseState === 'purchased', note: p.purchaseState };
}

export type ChipsStore = {
  ready: boolean;
  wallet: Wallet;
  hasPass: boolean;
  passActive: boolean;
  connected: boolean;
  catalog: CatalogItem[];
  catalogBusy: boolean;
  busy: string | null;
  message: string | null;
  setMessage: (m: string | null) => void;
  priceOf: (id: string) => string | null;
  passPricesLoaded: boolean;
  packPricesLoaded: boolean;
  refreshProducts: () => Promise<void>;
  buy: (id: string) => Promise<void>;
  restore: () => Promise<void>;
  manage: () => Promise<void>;
  debugLine: string;
  /** Daily streak for the UI: current streak day and tomorrow's amount if the streak holds. */
  daily: { streakDay: number; claimedToday: boolean; today: number; tomorrow: number };
  /** Last chips credit, for a small toast in the UI. */
  lastCredit: { amount: number; reason: string; at: number } | null;
};

export function useChipsStore(): ChipsStore {
  const [wallet, setWallet] = useState<Wallet>(emptyWallet());
  const walletRef = useRef<Wallet>(wallet);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [ready, setReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [catalogBusy, setCatalogBusy] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [fetchDebug, setFetchDebug] = useState('not fetched yet');
  const [lastError, setLastError] = useState('none');
  const [lastCredit, setLastCredit] = useState<ChipsStore['lastCredit']>(null);
  const fetching = useRef(false);
  const connectedRef = useRef(false);

  /** Serialised wallet update: apply, persist, then publish. Rejects if the save fails. */
  const mutate = useCallback(<T,>(fn: (w: Wallet) => { wallet: Wallet; result: T }): Promise<T> => {
    const run = queue.current.then(async () => {
      const { wallet: next, result } = fn(walletRef.current);
      if (next !== walletRef.current) {
        await saveWallet(next);
        walletRef.current = next;
        setWallet(next);
      }
      return result;
    });
    queue.current = run.catch(() => undefined);
    return run;
  }, []);

  const noteCredit = (amount: number, reason: string) => {
    if (amount > 0) setLastCredit({ amount, reason, at: Date.now() });
  };

  const syncOwnership = useCallback(async (): Promise<boolean> => {
    if (!connectedRef.current) return false;
    const records: StoreRecord[] = [];
    let anyOk = false;
    try {
      const subs = await getActiveSubscriptions([...PASS_IDS]);
      records.push(...(subs ?? []));
      anyOk = true;
    } catch (err) {
      setLastError(describeStoreError(err));
    }
    try {
      const owned = await getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
      // Packs are consumables and are never restored here.
      records.push(...(owned ?? []).filter((p) => isPassId(p.productId) || p.productId === LEGACY_PREMIUM_ID));
      anyOk = true;
    } catch (err) {
      setLastError(describeStoreError(err));
    }
    if (!anyOk) return hasPassPerks(walletRef.current, Date.now());
    const credited = await mutate((w) => {
      const r = applyStoreState(w, records, Date.now());
      return { wallet: r.wallet, result: r.credited };
    });
    noteCredit(credited, 'Chips Pass monthly chips');
    return hasPassPerks(walletRef.current, Date.now());
  }, [mutate]);

  const handlePurchase = useCallback(
    async (p: Purchase) => {
      try {
        const check = await verifyOnDevice(p);
        if (!check.ok) {
          if (check.note === 'pending') setMessage('The purchase is waiting for approval. Chips arrive once it goes through.');
          else {
            setLastError(`verify ${check.note}`);
            setMessage('The store could not verify this purchase, so nothing was charged to the game. Please try again.');
          }
          return;
        }
        if (isPackId(p.productId)) {
          const tx = transactionKey(p);
          // 1. Credit and persist first. 2. Only then finish the consumable.
          const credited = await mutate((w) => {
            if (!tx || wasProcessed(w, tx)) return { wallet: w, result: 0 };
            const r = creditPack(w, tx, p.productId);
            return { wallet: r.wallet, result: r.credited };
          });
          await finishTransaction({ purchase: p, isConsumable: true });
          if (credited > 0) {
            noteCredit(credited, 'Chip pack');
            setMessage(`${credited.toLocaleString()} chips added.`);
          }
          return;
        }
        if (isPassId(p.productId) || p.productId === LEGACY_PREMIUM_ID) {
          await finishTransaction({ purchase: p, isConsumable: false });
          const credited = await mutate((w) => {
            const r = applyStoreState(w, [p], Date.now());
            return { wallet: r.wallet, result: r.credited };
          });
          noteCredit(credited, 'Chips Pass monthly chips');
          setMessage('Chips Pass is active. No ads, 2x daily bonus and 10,000 chips every month.');
          void syncOwnership();
        }
      } catch (err) {
        setLastError(describeStoreError(err));
        setMessage('The purchase went through but could not be saved yet. It will finish next time the app opens.');
      } finally {
        setBusy(null);
      }
    },
    [mutate, syncOwnership],
  );

  const loadCatalogOnce = useCallback(async (): Promise<number> => {
    let subs: CatalogItem[] | null = null;
    let packs: CatalogItem[] | null = null;
    let subsErr: unknown;
    let packsErr: unknown;
    try {
      subs = ((await fetchProducts({ skus: [...PASS_IDS], type: 'subs' })) ?? []) as CatalogItem[];
    } catch (err) {
      subsErr = err;
    }
    try {
      packs = ((await fetchProducts({ skus: [...PACK_IDS], type: 'in-app' })) ?? []) as CatalogItem[];
    } catch (err) {
      packsErr = err;
    }
    setFetchDebug(`${describeFetch('subs', subs, subsErr)} | ${describeFetch('packs in-app', packs, packsErr)}`);
    if (subsErr) setLastError(describeStoreError(subsErr));
    else if (packsErr) setLastError(describeStoreError(packsErr));
    const merged = new Map<string, CatalogItem>();
    for (const item of [...(subs ?? []), ...(packs ?? [])]) if (item?.id) merged.set(item.id, item);
    if (merged.size) setCatalog([...merged.values()]);
    if (subsErr && packsErr) throw subsErr;
    return merged.size;
  }, []);

  const connect = useCallback(async (): Promise<boolean> => {
    if (connectedRef.current) return true;
    try {
      const ok = await initConnection();
      connectedRef.current = !!ok;
      setConnected(!!ok);
      return !!ok;
    } catch (err) {
      setLastError(describeStoreError(err));
      return false;
    }
  }, []);

  const refreshProducts = useCallback(async () => {
    if (Platform.OS === 'web' || fetching.current) return;
    fetching.current = true;
    setCatalogBusy(true);
    try {
      if (!(await connect())) return;
      const want = PASS_IDS.length + PACK_IDS.length;
      for (let attempt = 0; attempt < FETCH_ATTEMPTS; attempt += 1) {
        try {
          if ((await loadCatalogOnce()) >= want) break;
        } catch {
          // recorded in the debug line
        }
        if (attempt < FETCH_ATTEMPTS - 1) await wait(FETCH_RETRY_MS * (attempt + 1));
      }
    } finally {
      fetching.current = false;
      setCatalogBusy(false);
    }
  }, [connect, loadCatalogOnce]);

  // Startup: wallet, store connection, listeners, prices, Pass state, daily bonus.
  useEffect(() => {
    let alive = true;
    const subs: { remove: () => void }[] = [];
    (async () => {
      const w = await loadWallet();
      if (!alive) return;
      walletRef.current = w;
      setWallet(w);
      setReady(true);
      if (Platform.OS === 'web') return;
      subs.push(purchaseUpdatedListener((p) => void handlePurchase(p)));
      subs.push(
        purchaseErrorListener((err) => {
          setBusy(null);
          if (isCancel(err)) return;
          setLastError(describeStoreError(err));
          setMessage('The purchase did not go through. Please try again.');
        }),
      );
      if (await connect()) {
        await syncOwnership();
        void refreshProducts();
      }
      await claimToday();
      // A new local day while the app stays open (or comes back from the background).
      subs.push(AppState.addEventListener('change', (st) => {
        if (st === 'active') void claimToday();
      }));
    })();
    async function claimToday() {
      const credited = await mutate((x) => {
        const g = grantPassMonth(x, Date.now());
        const d = claimDaily(g.wallet, Date.now());
        return { wallet: d.wallet, result: d.credited + g.credited };
      }).catch(() => 0);
      noteCredit(credited, 'Daily bonus');
    }
    return () => {
      alive = false;
      subs.forEach((s) => s.remove());
      void endConnection().catch(() => undefined);
      connectedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const priceOf = useCallback((id: string) => catalog.find((c) => c.id === id)?.displayPrice ?? null, [catalog]);

  const buy = useCallback(
    async (id: string) => {
      setMessage(null);
      if (!(await connect())) {
        setMessage('The store is not available on this device yet.');
        return;
      }
      if (!catalog.some((c) => c.id === id)) {
        setMessage('This item is unavailable from the store right now. Tap Retry to load prices.');
        return;
      }
      setBusy(id);
      try {
        await requestPurchase({
          request: { apple: { sku: id }, google: { skus: [id] } },
          type: isPassId(id) ? 'subs' : 'in-app',
        });
      } catch (err) {
        setBusy(null);
        if (isCancel(err)) return;
        setLastError(describeStoreError(err));
        setMessage('The purchase did not go through. Please try again.');
      }
    },
    [catalog, connect],
  );

  const restore = useCallback(async () => {
    setMessage(null);
    setBusy('restore');
    try {
      if (!(await connect())) {
        setMessage('The store is not available on this device yet.');
        return;
      }
      try {
        await restorePurchases();
      } catch (err) {
        // A cancelled sign-in sheet is silent.
        if (isCancel(err)) return;
        setLastError(describeStoreError(err));
      }
      const has = await syncOwnership();
      setMessage(has ? 'Chips Pass restored on this device.' : 'No active Chips Pass was found for this store account.');
    } finally {
      setBusy(null);
    }
  }, [connect, syncOwnership]);

  const manage = useCallback(async () => {
    try {
      await deepLinkToSubscriptions({ packageNameAndroid: 'com.samay.twist21', skuAndroid: walletRef.current.pass.productId });
    } catch (err) {
      setLastError(describeStoreError(err));
    }
  }, []);

  const now = Date.now();
  const hasPass = hasPassPerks(wallet, now);
  const passActive = perksFor(wallet, now).monthlyChips > 0;
  const passPricesLoaded = PASS_IDS.some((id) => catalog.some((c) => c.id === id));
  const packPricesLoaded = PACK_IDS.some((id) => catalog.some((c) => c.id === id));
  const daily = dailyPreview(wallet, now);
  const debugLine = `Store debug: ${Platform.OS} connected=${connected ? 'yes' : 'no'} | ${fetchDebug} | catalog ${catalog.length} | last error ${lastError}`;

  return useMemo(
    () => ({
      ready, wallet, hasPass, passActive, connected, catalog, catalogBusy, busy, message, setMessage,
      priceOf, passPricesLoaded, packPricesLoaded, refreshProducts, buy, restore, manage, debugLine, lastCredit, daily,
    }),
    [ready, wallet, hasPass, passActive, connected, catalog, catalogBusy, busy, message, priceOf,
      passPricesLoaded, packPricesLoaded, refreshProducts, buy, restore, manage, debugLine, lastCredit, daily.streakDay,
      daily.claimedToday, daily.today, daily.tomorrow],
  );
}
