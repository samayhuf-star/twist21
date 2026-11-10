import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { ENTITLEMENT_ID, PRODUCT_ID, RC_API_KEY_ANDROID, RC_API_KEY_IOS } from './config';

let configured = false;

export function initPurchases(): boolean {
  if (configured) return true;
  const key = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
  if (!key || key.includes('REPLACE_ME')) return false; // keys not set in this build
  Purchases.configure({ apiKey: key });
  configured = true;
  return true;
}

export function hasPremium(info: CustomerInfo | null | undefined): boolean {
  return !!info?.entitlements.active[ENTITLEMENT_ID];
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!configured) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export function onCustomerInfo(cb: (info: CustomerInfo) => void) {
  if (!configured) return () => {};
  Purchases.addCustomerInfoUpdateListener(cb);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(cb);
  };
}

/** The one-time Premium package from the current offering. */
export async function getPremiumPackage(): Promise<PurchasesPackage | null> {
  if (!configured) return null;
  try {
    const cur = (await Purchases.getOfferings()).current;
    if (!cur) return null;
    return (
      cur.lifetime ??
      cur.availablePackages.find((p) => p.product.identifier.startsWith(PRODUCT_ID)) ??
      cur.availablePackages[0] ??
      null
    );
  } catch {
    return null;
  }
}

export async function purchase(pkg: PurchasesPackage): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return hasPremium(customerInfo);
  } catch (e: any) {
    if (e?.userCancelled) return false;
    throw e;
  }
}

export async function restore(): Promise<boolean> {
  if (!configured) return false;
  return hasPremium(await Purchases.restorePurchases());
}
