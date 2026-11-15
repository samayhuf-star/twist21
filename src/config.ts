export const PRIVACY_URL = 'https://samayhuf-star.github.io/app-legal/twist21/privacy/';
export const TERMS_URL = 'https://samayhuf-star.github.io/app-legal/twist21/terms/';
export const SUPPORT_URL = 'https://samayhuf-star.github.io/app-legal/twist21/support/';

// RevenueCat public SDK key for iOS (starts with appl_). Set EXPO_PUBLIC_RC_IOS_KEY
// in EAS env. A test_ key must never ship in a store build.
export const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_RC_IOS_KEY ?? '';

// Five consumable chip packs. Twist 21 is free to play; chips are the only purchase.
export const CHIP_PACKS: Record<string, number> = {
  twist21_chips_5k: 5000,
  twist21_chips_18k: 18000,
  twist21_chips_35k: 35000,
  twist21_chips_80k: 80000,
  twist21_chips_200k: 200000,
};
