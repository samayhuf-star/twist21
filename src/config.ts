// The only product this version sells. It already exists in App Store Connect.
export const PRODUCT_ID = 'twist21_premium';

export const PRIVACY_URL = 'https://samayhuf-star.github.io/app-legal/twist21/privacy/';
export const TERMS_URL = 'https://samayhuf-star.github.io/app-legal/twist21/terms/';
export const SUPPORT_URL = 'https://samayhuf-star.github.io/app-legal/twist21/support/';

// One-time non-consumable. The paywall shows StoreKit's localized price when the product loads.
// A non-consumable cannot include a free trial, so this version does not offer one.
export const PRICING = {
  lifetimePrice: 39.99,
  productId: PRODUCT_ID,
};

export function lifetimePriceLabel(): string {
  return `$${PRICING.lifetimePrice.toFixed(2)}`;
}
