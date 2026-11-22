import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, type PurchasesPackage } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { CHIP_PACKS, OFFERING_ID } from './config';

const IOS_KEY = process.env.EXPO_PUBLIC_RC_IOS_KEY ?? '';
let configured = false;

export function initPurchases(): boolean {
  if (configured) return true;
  if (Platform.OS !== 'ios' || !IOS_KEY) return false;
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
  Purchases.configure({ apiKey: IOS_KEY });
  configured = true;
  return true;
}

export type Offer = { id: string; price: string };

async function packages(): Promise<PurchasesPackage[]> {
  const offerings = await Purchases.getOfferings();
  const o = offerings.all[OFFERING_ID] ?? offerings.current;
  return o?.availablePackages ?? [];
}

/** The chip packs the App Store currently offers. The shop only opens the paywall once this is non-empty. */
export async function loadOffers(): Promise<Offer[]> {
  if (!configured) return [];
  const list = await packages();
  return list
    .filter((p) => CHIP_PACKS[p.product.identifier])
    .map((p) => ({ id: p.product.identifier, price: p.product.priceString }));
}

async function chipTransactionIds(): Promise<Map<string, string>> {
  const info = await Purchases.getCustomerInfo();
  const out = new Map<string, string>();
  for (const tx of info.nonSubscriptionTransactions) {
    if (CHIP_PACKS[tx.productIdentifier]) out.set(tx.transactionIdentifier, tx.productIdentifier);
  }
  return out;
}

/**
 * RevenueCat's own paywall for the chip offering. Chip packs are consumables, so each purchase is granted
 * once: every chip transaction that exists after the paywall closes and did not exist before it opened is
 * reported back by product id. Returns false when there was nothing to show.
 */
export async function showChipPaywall(onPurchased: (id: string) => void): Promise<boolean> {
  if (!configured) return false;
  const offerings = await Purchases.getOfferings();
  const offering = offerings.all[OFFERING_ID] ?? offerings.current;
  if (!offering || !offering.availablePackages.length) return false;
  const before = await chipTransactionIds();
  const result = await RevenueCatUI.presentPaywall({ offering });
  if (result === PAYWALL_RESULT.NOT_PRESENTED || result === PAYWALL_RESULT.ERROR) return false;
  // Compare on every close, not only on PURCHASED, so a pack that was paid for is never left ungranted.
  const after = await chipTransactionIds();
  after.forEach((productId, txId) => {
    if (!before.has(txId)) onPurchased(productId);
  });
  return true;
}

export async function restore(): Promise<void> {
  if (!configured) return;
  await Purchases.restorePurchases();
}
