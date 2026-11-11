import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { ENTITLEMENT_ID, PRODUCT_ID, RC_API_KEY_ANDROID, RC_API_KEY_IOS } from './config';

let configured = false;

export function initPurchases(): boolean {
  if (configured) return true;
  const key = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
  if (!key || key.includes('REPLACE_ME')) return false; // keys not set in this build
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

/**
 * Presents the RevenueCat-hosted paywall (designed in the dashboard, attached to the current offering).
 * Falls back to a direct package purchase if the dashboard paywall is not available yet.
 * Resolves true when the user now owns Premium.
 */
export async function presentPaywall(): Promise<boolean> {
  if (!configured) return false;
  try {
    const result = await RevenueCatUI.presentPaywallIfNeeded({ requiredEntitlementIdentifier: ENTITLEMENT_ID });
    if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) return true;
    if (result === PAYWALL_RESULT.NOT_PRESENTED) return hasPremium(await getCustomerInfo());
    if (result === PAYWALL_RESULT.ERROR) {
      const pkg = await getPremiumPackage();
      return pkg ? await purchase(pkg) : false;
    }
    return false;
  } catch {
    const pkg = await getPremiumPackage();
    return pkg ? await purchase(pkg) : false;
  }
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
