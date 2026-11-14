import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';
import {
  ENTITLEMENT_ID,
  isRealRcKey,
  PRODUCT_ID_LIFETIME,
  RC_API_KEY_ANDROID,
  RC_API_KEY_IOS,
} from './config';

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3, baseDelay = 1000): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e: unknown) {
      lastError = e;
      const err = e as { userCancelled?: boolean; code?: string };
      // Don't retry user cancellations or permanent errors
      if (err?.userCancelled || err?.code === 'PURCHASE_CANCELLED' || err?.code === 'PRODUCT_NOT_AVAILABLE') {
        throw e;
      }
      if (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

let configured = false;

export function purchasesReady(): boolean {
  return configured;
}

export function initPurchases(): boolean {
  if (configured) return true;
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;
  const platform = Platform.OS;
  const key = platform === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
  if (!isRealRcKey(key, platform)) return false;
  if (__DEV__) Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey: key });
  configured = true;
  // Attribution + app attributes for RevenueCat charts, integrations and targeting.
  if (Platform.OS === 'ios') Purchases.enableAdServicesAttributionTokenCollection();
  Purchases.setAttributes({ app: 'twist21', platform: Platform.OS });
  return true;
}

export function hasPremium(info: CustomerInfo | null | undefined): boolean {
  return !!info?.entitlements.active[ENTITLEMENT_ID];
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!configured) return null;
  try {
    return await withRetry(() => Purchases.getCustomerInfo());
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

function isLifetimeProduct(pkg: PurchasesPackage): boolean {
  return pkg.product.identifier === PRODUCT_ID_LIFETIME;
}

/** The lifetime Premium package. Never falls through to a different product. */
export async function getPremiumPackage(): Promise<PurchasesPackage | null> {
  if (!configured) return null;
  try {
    const cur = (await withRetry(() => Purchases.getOfferings())).current;
    if (!cur) return null;
    const match = cur.availablePackages.find(isLifetimeProduct);
    if (match) return match;
    if (cur.lifetime && isLifetimeProduct(cur.lifetime)) return cur.lifetime;
    return null;
  } catch {
    return null;
  }
}

export async function purchase(pkg: PurchasesPackage): Promise<boolean> {
  try {
    const { customerInfo } = await withRetry(() => Purchases.purchasePackage(pkg));
    return hasPremium(customerInfo);
  } catch (e: unknown) {
    const err = e as { userCancelled?: boolean; code?: string };
    if (err?.userCancelled || err?.code === 'PURCHASE_CANCELLED') return false;
    throw e;
  }
}

export async function restore(): Promise<boolean> {
  if (!configured) return false;
  return hasPremium(await Purchases.restorePurchases());
}

/** RevenueCat Customer Center: restore, support, purchase management. */
export async function presentCustomerCenter(): Promise<void> {
  if (!configured) return;
  await RevenueCatUI.presentCustomerCenter();
}

/** Record game progress as subscriber attributes (feeds RevenueCat targeting and integrations). */
export function trackProgress(attrs: Record<string, string | null>) {
  if (!configured) return;
  Purchases.setAttributes(attrs);
}
