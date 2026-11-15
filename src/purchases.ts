import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesStoreTransaction } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { CHIP_PACKS, REVENUECAT_IOS_KEY } from './config';

export type ChipGrant = { productId: string; txId: string };

export type PaywallOutcome = 'purchased' | 'cancelled' | 'unavailable' | 'failed';

let configured = false;

function ensureConfigured(): boolean {
  if (Platform.OS !== 'ios' || !REVENUECAT_IOS_KEY || REVENUECAT_IOS_KEY.startsWith('test_')) return false;
  if (!configured) {
    Purchases.configure({ apiKey: REVENUECAT_IOS_KEY });
    configured = true;
  }
  return true;
}

function grantsFrom(info: CustomerInfo): ChipGrant[] {
  return info.nonSubscriptionTransactions
    .filter((t: PurchasesStoreTransaction) => t.productIdentifier in CHIP_PACKS)
    .map((t: PurchasesStoreTransaction) => ({ productId: t.productIdentifier, txId: t.transactionIdentifier }));
}

/**
 * RevenueCat for the five consumable chip packs. The game keeps the chip balance;
 * every RevenueCat transaction id is sent to it and de-duplicated there, so a pack
 * is credited exactly once even if the app is killed mid-purchase.
 */
export function useChipPurchases(onGrants: (grants: ChipGrant[]) => void, onPrices: (prices: Record<string, string>) => void) {
  const [ready, setReady] = useState(false);
  const cb = useRef({ onGrants, onPrices });
  cb.current = { onGrants, onPrices };

  useEffect(() => {
    if (!ensureConfigured()) return;
    setReady(true);
    const listener = (info: CustomerInfo) => cb.current.onGrants(grantsFrom(info));
    Purchases.addCustomerInfoUpdateListener(listener);
    void (async () => {
      try {
        cb.current.onGrants(grantsFrom(await Purchases.getCustomerInfo()));
        const offerings = await Purchases.getOfferings();
        const prices: Record<string, string> = {};
        for (const pkg of offerings.current?.availablePackages ?? []) {
          prices[pkg.product.identifier] = pkg.product.priceString;
        }
        cb.current.onPrices(prices);
      } catch {
        // Offline: the game still works; the shop shows default prices.
      }
    })();
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  const showPaywall = useCallback(async (): Promise<PaywallOutcome> => {
    if (!ready) return 'unavailable';
    try {
      // Only show a paywall that actually sells chip packs. If the current offering holds anything
      // else (for example the retired Premium), do not let anyone pay for something the game ignores.
      const offerings = await Purchases.getOfferings();
      const sellsChips = (offerings.current?.availablePackages ?? []).some((p) => p.product.identifier in CHIP_PACKS);
      if (!sellsChips) return 'unavailable';
      const result = await RevenueCatUI.presentPaywall();
      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        cb.current.onGrants(grantsFrom(await Purchases.getCustomerInfo()));
        return 'purchased';
      }
      if (result === PAYWALL_RESULT.ERROR) return 'failed';
      return 'cancelled';
    } catch {
      return 'failed';
    }
  }, [ready]);

  return { ready, showPaywall };
}
