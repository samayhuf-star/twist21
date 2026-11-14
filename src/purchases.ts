import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  getAvailablePurchases,
  isUserCancelledError,
  useIAP,
  type Purchase,
} from 'expo-iap';

import { lifetimePriceLabel, PRODUCT_ID } from './config';
import { loadOwned, saveOwned } from './entitlement';

export type PurchaseOutcome = 'purchased' | 'cancelled' | 'unavailable' | 'failed';

export type PurchaseResult = {
  outcome: PurchaseOutcome;
  message: string | null;
};

function ownsPremium(purchase: Purchase): boolean {
  return purchase.productId === PRODUCT_ID && purchase.purchaseState !== 'pending';
}

/**
 * StoreKit 2 via expo-iap. One non-consumable, twist21_premium.
 * The same purchase / restore shape as the abs-challenge app: useIAP, finish the
 * transaction, then keep the unlock in local storage.
 */
export function usePremiumPurchases() {
  const [owned, setOwned] = useState(false);
  const [price, setPrice] = useState(lifetimePriceLabel);
  const [productReady, setProductReady] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const errorRef = useRef<string | null>(null);
  const pending = useRef<((result: PurchaseResult) => void) | null>(null);

  const note = useCallback((message: string | null) => {
    errorRef.current = message;
    setLastError(message);
  }, []);

  const settle = useCallback((outcome: PurchaseOutcome) => {
    const resolve = pending.current;
    pending.current = null;
    resolve?.({ outcome, message: errorRef.current });
  }, []);

  const grant = useCallback(async () => {
    await saveOwned();
    setOwned(true);
  }, []);

  const {
    connected,
    products,
    fetchProducts,
    requestPurchase,
    finishTransaction,
    restorePurchases,
    getAvailablePurchases: refreshOwned,
  } = useIAP({
    onPurchaseSuccess: (purchase) => {
      void (async () => {
        try {
          if (!ownsPremium(purchase)) {
            note('The store returned a different product.');
            settle('failed');
            return;
          }
          await finishTransaction({ purchase, isConsumable: false });
          await grant();
          settle('purchased');
        } catch (err) {
          note(
            err instanceof Error
              ? err.message
              : 'The purchase finished in the store but could not be saved on this device. Try Restore.'
          );
          settle('failed');
        }
      })();
    },
    onPurchaseError: (error) => {
      if (isUserCancelledError(error)) {
        settle('cancelled');
        return;
      }
      note(error.message || 'Purchase failed. Please try again.');
      settle('failed');
    },
    onError: (error) => {
      note(error.message || 'The App Store could not be reached.');
    },
  });

  useEffect(() => {
    void loadOwned().then((on) => {
      if (on) setOwned(true);
    });
  }, []);

  useEffect(() => {
    if (!connected || Platform.OS === 'web') return;
    void (async () => {
      try {
        await fetchProducts({ skus: [PRODUCT_ID], type: 'in-app' });
        await refreshOwned();
      } catch (err) {
        setProductReady(false);
        note(
          err instanceof Error
            ? err.message
            : 'Twist 21 Premium could not be loaded from the App Store.'
        );
      }
    })();
  }, [connected, fetchProducts, refreshOwned]);

  useEffect(() => {
    const item = products.find((product) => product.id === PRODUCT_ID);
    if (!item) return;
    setProductReady(true);
    if (item.displayPrice) setPrice(item.displayPrice);
  }, [products]);

  const purchase = useCallback(async (): Promise<PurchaseResult> => {
    note(null);
    if (Platform.OS === 'web' || !connected || !productReady) {
      return { outcome: 'unavailable', message: null };
    }
    return new Promise((resolve) => {
      pending.current = resolve;
      void requestPurchase({
        request: {
          apple: { sku: PRODUCT_ID },
          google: { skus: [PRODUCT_ID] },
        },
        type: 'in-app',
      }).catch((err: unknown) => {
        if (isUserCancelledError(err)) {
          settle('cancelled');
          return;
        }
        note(err instanceof Error ? err.message : 'Purchase failed. Please try again.');
        settle('failed');
      });
    });
  }, [connected, note, productReady, requestPurchase, settle]);

  const restore = useCallback(async (): Promise<boolean> => {
    note(null);
    if (Platform.OS === 'web' || !connected) {
      throw new Error('The App Store could not be reached. Please try again in a moment.');
    }
    await restorePurchases();
    const purchases = await getAvailablePurchases();
    if (!purchases.some(ownsPremium)) return false;
    await grant();
    return true;
  }, [connected, grant, restorePurchases]);

  return { owned, price, productReady, lastError, purchase, restore };
}
