# Twist 21: Launch Guide (iOS + Android)

Model: free with 3 matches/day and 5 of 9 action cards. **Chips Pass** subscription ($2.99/month or $19.99/year, no trial) gives no ads, a 2x daily chip bonus, 10,000 chips each subscription month and the full deck. Chip packs (consumable): 5k $0.99, 18k $2.99, 35k $4.99, 80k $9.99, 200k $19.99. Chips are virtual with no cash value. The old one-time `twist21_premium` is retired; anyone who owns it keeps the Pass perks (without the monthly chips).
Stack: Expo (React Native) + a WebView running the game page + expo-iap (StoreKit 2), no server. Bundle ID / package: `com.samay.twist21`. Expo owner: `krosz` (same as Lulla).

## How it fits together
- `game/index.html` is the whole game. `npm run build:html` embeds it into `src/gameHtml.ts`.
- In the app the paywall is native (`src/Paywall.tsx`). The game's Chips Pass button messages the native side, which opens it. `src/useChipsStore.ts` runs expo-iap; `src/wallet.ts` is the pure entitlement and chip ledger (tested in `tests/`). Results go back to the game with `window.T21.setPremium(...)` and `window.T21.setChips(...)`.
- Packs: chips are credited and saved first, then the transaction is finished with `isConsumable: true`. Processed transaction ids are kept so a relaunch or replay never double-credits. Packs are not restored.
- The paywall shows a small grey store debug line (connection, per-fetch count and SKUs or error, catalog size, last error).
- The unlock-code box is hidden inside the app (store rules); it exists only on the web version.

## Steps only you can do

### 1. Expo project (the one step that needs your Expo login)
```bash
npm i -g eas-cli && eas login
cd twist21 && npm install
eas init            # creates @krosz/twist21 and writes extra.eas.projectId into app.json
```
Then link the GitHub repo `samayhuf-star/twist21` under the project settings on expo.dev (so builds can run from the dashboard / MCP).

### 2. App Store Connect
1. New app: **Twist 21**, bundle ID `com.samay.twist21`, SKU `twist21`.
2. Subscription group **Chips Pass** with `twist21_chipspass_yearly` and `twist21_chipspass_monthly`; consumables `twist21_chips_5k`, `_18k`, `_35k`, `_80k`, `_200k`. Set up by API on 12 Nov 2026.
3. Paid Apps agreement active. Privacy: "Data Not Collected".

### 3. Google Play Console
1. New app, package `com.samay.twist21`, free with in-app products.
2. Monetize > In-app products > `twist21_premium`, $2.99.
3. Data safety, content rating, target audience 13+. First upload goes to Internal testing by hand once.

### 4. Build and submit
```bash
eas build --platform all --profile production
eas submit --platform ios --latest      # set ascAppId in eas.json first
eas submit --platform android --latest
```
Test with TestFlight / Play internal testing and sandbox accounts: free matches stop at 3, paywall appears, purchase unlocks, restore works.

## Known limits
- The free-match count is stored in the WebView and can be cleared by reinstalling. Acceptable at this price; real enforcement would need accounts.
- Web purchases cannot be verified without a backend; the web version uses unlock codes (`CODES.txt` is kept out of this repo).
