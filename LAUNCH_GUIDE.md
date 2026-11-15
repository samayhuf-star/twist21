# Twist 21 launch guide

Model: free to play (all 9 action cards, unlimited matches). Chips are the only purchase: five consumable packs (twist21_chips_5k, 18k, 35k, 80k, 200k). No subscription. Premium ($39.99) and Chips Pass are retired.

## How it is wired
- The game is one HTML file (`game/index.html`), built into `src/gameHtml.ts` with `npm run build:html`. Never edit gameHtml.ts by hand.
- Chip balance, daily bonus, stats and cosmetics live in the game's local storage.
- "Get chips" posts `paywall` to the app, which presents the RevenueCat paywall (`src/purchases.ts`). New RevenueCat transactions are sent back with `window.T21.chipsPurchased(productId, txId)`; the game de-duplicates by transaction id.
- Haptics: the game posts `haptic`, the app plays them with expo-haptics.
- RevenueCat key: `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (must start with `appl_`, never `test_`).

## Before a store build
1. RevenueCat: add the five products, one offering marked current, a paywall on it.
2. App Store Connect: attach the five consumables with review screenshots; remove Premium and Chips Pass from sale.
3. Paste `store/listing.md` and `store/review-notes.md`; confirm App Privacy (Purchases + anonymous ID via RevenueCat).
4. Publish the `docs/` pages (privacy, terms, support) before submitting.
5. Nothing is submitted to TestFlight or the store until Samay writes "submit".
