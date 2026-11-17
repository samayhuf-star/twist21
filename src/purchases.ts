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

/** Localized prices for the chip packs, for the in-game shop. */
export async function loadOffers(): Promise<Offer[]> {
  if (!configured) return [];
  const list = await packages();
  return list
    .filter((p) => CHIP_PACKS[p.product.identifier])
    .map((p) => ({ id: p.product.identifier, price: p.product.priceString }));
}

export type BuyResult =
  | { ok: true; id: string }
  | { ok: false; cancelled: boolean; message?: string };

export async function buyPack(id: string): Promise<BuyResult> {
  if (!configured) return { ok: false, cancelled: false, message: 'Purchases are not available in this build.' };
  try {
    const pkg = (await packages()).find((p) => p.product.identifier === id);
    if (!pkg) return { ok: false, cancelled: false, message: 'That chip pack is not available right now.' };
    await Purchases.purchasePackage(pkg);
    return { ok: true, id };
  } catch (e: any) {
    if (e?.userCancelled) return { ok: false, cancelled: true };
    return { ok: false, cancelled: false, message: e?.message ?? 'Purchase failed. Please try again.' };
  }
}

/** RevenueCat's own paywall for the chip offering. Purchases made inside it are reported back by id. */
export async function showChipPaywall(onPurchased: (id: string) => void): Promise<void> {
  if (!configured) return;
  const offerings = await Purchases.getOfferings();
  const offering = offerings.all[OFFERING_ID] ?? offerings.current;
  if (!offering) return;
  const r = await RevenueCatUI.presentPaywall({
    offering,
    // consumable purchases: grant by the product that was bought
  } as any);
  if (r === PAYWALL_RESULT.PURCHASED) {
    const info = await Purchases.getCustomerInfo();
    // newest non-subscription transaction is the pack just bought
    const tx = [...info.nonSubscriptionTransactions].sort(
      (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
    )[0];
    if (tx && CHIP_PACKS[tx.productIdentifier]) onPurchased(tx.productIdentifier);
  }
}

export async function restore(): Promise<void> {
  if (!configured) return;
  await Purchases.restorePurchases();
}
