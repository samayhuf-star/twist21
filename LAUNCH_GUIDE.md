# Twist 21: Launch Guide (iOS + Android)

Model: free with 3 matches/day and 5 of 9 action cards; **Twist 21 Premium** one-time purchase (US $39.99, product `twist21_lifetime`) unlocks everything. No subscription and no free trial.
Stack: Expo (React Native) + a WebView running the game page + RevenueCat. Bundle ID / package: `com.samay.twist21`. Expo owner: `krosz` (same as Lulla).

## How it fits together
- `game/index.html` is the whole game. `npm run build:html` embeds it into `src/gameHtml.ts`.
- The paywall lives in the game page. In the app, its Unlock button messages the native side, which runs the RevenueCat purchase (`src/purchases.ts`) and pushes the result back with `window.T21.setPremium(true)` and the store's real price with `window.T21.setPrice(...)`.
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
2. In-App Purchases > new **Non-Consumable**, product ID `twist21_lifetime`, price $39.99, add localization and a review screenshot of the paywall. Do not attach the old `twist21_premium` ($2.99) product; this build does not sell it. License agreement: Apple’s standard EULA.
3. Paid Apps agreement active. Privacy: "Data Not Collected" (RevenueCat anonymous ID: declare Purchases, not linked to user, if prompted).

### 3. Google Play Console
1. New app, package `com.samay.twist21`, free with in-app products.
2. Monetize > In-app products > `twist21_lifetime`, $39.99.
3. Data safety, content rating, target audience 13+. First upload goes to Internal testing by hand once.

### 4. RevenueCat
1. Add iOS and Android apps with the IDs above and connect store credentials.
2. Entitlement **`premium`**, attach the `twist21_lifetime` product on each store.
3. Offering `default` with the **Lifetime** package (`$rc_lifetime`).
4. Set the two public SDK keys as EAS env vars:
```bash
eas env:create --name EXPO_PUBLIC_RC_IOS_KEY --value <ios public sdk key> --environment production --visibility sensitive
eas env:create --name EXPO_PUBLIC_RC_ANDROID_KEY --value <android public sdk key> --environment production --visibility sensitive
```

### 5. Build and submit
```bash
eas build --platform all --profile production
eas submit --platform ios --latest      # set ascAppId in eas.json first
eas submit --platform android --latest
```
Test with TestFlight / Play internal testing and sandbox accounts: free matches stop at 3, paywall appears, purchase unlocks, restore works.

## Known limits
- The free-match count is stored in the WebView and can be cleared by reinstalling. Acceptable at this price; real enforcement would need accounts.
- Web purchases cannot be verified without a backend; the web version uses unlock codes (`CODES.txt` is kept out of this repo).
