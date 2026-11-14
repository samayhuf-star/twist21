// Central product config. Change here only.
export const ENTITLEMENT_ID = 'premium';

// Product IDs — must match App Store Connect and Google Play
export const PRODUCT_ID_LIFETIME = 'twist21_lifetime';
export const PRODUCT_ID_MONTHLY = 'twist21_monthly'; // optional monthly if added later

// RevenueCat PUBLIC SDK keys (safe to ship in the app). Set as EAS env vars before building.
export const RC_API_KEY_IOS = process.env.EXPO_PUBLIC_RC_IOS_KEY ?? 'appl_REPLACE_ME';
export const RC_API_KEY_ANDROID = process.env.EXPO_PUBLIC_RC_ANDROID_KEY ?? 'goog_REPLACE_ME';

// The game page is hosted by GitHub Pages as well, so WebView storage gets a stable https origin.
export const GAME_BASE_URL = 'https://samayhuf-star.github.io/twist21/';

// Standard pricing
export const PRICING = {
  trialDays: 7,
  lifetimePrice: 39.99,
  lifetimeProductId: PRODUCT_ID_LIFETIME,
};
