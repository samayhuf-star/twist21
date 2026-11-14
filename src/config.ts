// Central product config. Change here only.
export const ENTITLEMENT_ID = 'premium';

// Product IDs — must match App Store Connect and Google Play.
// Lifetime is the only product this version sells. Monthly is not offered.
export const PRODUCT_ID_LIFETIME = 'twist21_lifetime';
export const PRODUCT_ID_MONTHLY = 'twist21_monthly';

// RevenueCat public SDK keys. Expo inlines EXPO_PUBLIC_* at build time from EAS env.
// No placeholder is shipped: a missing or stand-in key leaves purchases unconfigured.
export const RC_API_KEY_IOS = (process.env.EXPO_PUBLIC_RC_IOS_KEY ?? '').trim();
export const RC_API_KEY_ANDROID = (process.env.EXPO_PUBLIC_RC_ANDROID_KEY ?? '').trim();

const STAND_IN = /replace|changeme|xxxx|todo|placeholder|your[_-]?key/i;

/** True only for a real store SDK key, never a blank or stand-in value. */
export function isRealRcKey(key: string, platform: 'ios' | 'android'): boolean {
  if (!key || STAND_IN.test(key)) return false;
  if (platform === 'ios') return /^appl_[A-Za-z0-9]{16,}$/.test(key);
  return /^goog_[A-Za-z0-9]{16,}$/.test(key);
}

// The game page is hosted by GitHub Pages as well, so WebView storage gets a stable https origin.
export const GAME_BASE_URL = 'https://samayhuf-star.github.io/twist21/';

export const PRIVACY_URL = 'https://samayhuf-star.github.io/twist21/privacy/';
export const TERMS_URL = 'https://samayhuf-star.github.io/twist21/terms/';
export const SUPPORT_URL = 'https://samayhuf-star.github.io/twist21/support/';

// One-time non-consumable. US price the listing uses; the paywall prefers StoreKit's localized price.
// A non-consumable cannot include a free trial, so this version does not offer one.
export const PRICING = {
  lifetimePrice: 39.99,
  lifetimeProductId: PRODUCT_ID_LIFETIME,
};

export function lifetimePriceLabel(): string {
  return `$${PRICING.lifetimePrice.toFixed(2)}`;
}
