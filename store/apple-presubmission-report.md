# Twist 21 — Apple pre-submission report

**Date:** 14 November 2026
**Packet:** branch `cursor/app-store-submission-422d`
**App:** Twist 21 · bundle `com.samay.twist21` · ASC app `6833334755` · version `1.0.0` · iOS build number **5** (`app.json`)
**Version source:** `eas.json` `appVersionSource` is `local`. The production profile does not auto-increment.
**Purchase:** one non-consumable, `twist21_premium`, display name Twist 21 Premium, US $39.99, StoreKit via `expo-iap`. No other product id is referenced by this version’s code, listing, or review notes.
**Decision: DO NOT SUBMIT** until the NEEDS ASC and NEEDS DEVICE rows are cleared. There is no remaining code FAIL.

**Summary:** `PASS 52 · FAIL 0 · N/A 32 · NEEDS DEVICE 9 · NEEDS ASC 12 · Decision: DO NOT SUBMIT`

`npx tsc --noEmit` passes. `npx expo-doctor` is 20/20. `npx expo export --platform ios` bundled `index.ts` (644 modules).

## Legal URL HTTP codes

`curl -sL` on 14 November 2026:

| URL | HTTP |
| --- | --- |
| https://samayhuf-star.github.io/app-legal/twist21/privacy/ | **200** |
| https://samayhuf-star.github.io/app-legal/twist21/terms/ | **200** |
| https://samayhuf-star.github.io/app-legal/twist21/support/ | **200** |
| https://samayhuf-star.github.io/app-legal/twist21/ | **200** (marketing) |

The terms page still says product ID `twist21_lifetime`. This version sells `twist21_premium`. A one-line fix was committed locally and **could not be pushed** (`app-legal` returned 403). Whoever can write that repo should change that one id.

## Checks

| ID | Area | Result | Evidence | Notes |
| --- | --- | --- | --- | --- |
| A1 | Binary matches this commit, version, and build | NEEDS ASC | `app.json` version `1.0.0`, `ios.buildNumber` `5`, bundle `com.samay.twist21`. `eas.json` `appVersionSource: local`. Production profile has no `autoIncrement`. | Upload a production build of this commit as build 5. Build 4 is the older `main` commit. |
| A2 | Clean install does not crash | NEEDS DEVICE | No TestFlight install in this session. | Cold-launch three times on a physical iPhone after deleting the app. |
| A3 | Core journeys work | NEEDS DEVICE | Play, paywall, purchase, and restore are wired in `App.tsx` and `src/purchases.ts`. | Walk them on device. |
| A4 | No placeholder UI | PASS | Shipping sources have no “coming soon”, lorem, or “purchases unavailable”. If the product has not loaded, the paywall still shows the US price, Restore, and the legal links, and says the App Store price is not available yet. | `game/index.html` paywall. |
| A5 | No hidden production features | PASS | `eas.json` production has no `developmentClient`. The iOS UI hides the web unlock-code box. This version’s code sells only `twist21_premium`. | `docs/launch-archive/` is a historical record. It is not in the bundle. |
| A6 | Background modes match real use | PASS | `npx expo config --type public`: no `UIBackgroundModes`. | |
| A7 | IPv6 | N/A | The game is the bundled string in `src/gameHtml.ts`. `App.tsx` loads `source={{ html: gameHtml }}` with no network base URL. | Purchases are StoreKit on the device. |
| A8 | Capture indicator | N/A | No camera, microphone, or screen recording. | |
| A9 | Export compliance matches the binary | NEEDS ASC | `ITSAppUsesNonExemptEncryption: false` in `app.json`. | Answer ASC as exempt (HTTPS only). |
| A10 | Minimum iOS actually runs | NEEDS DEVICE | `deploymentTarget` is not overridden. React Native 0.88 in this install reports a pod minimum of 15.1. | Not launched on that OS. |
| A11 | No “restart the device” copy | PASS | Intro, rules, paywall, support page, review notes. | |
| A12 | Release build, not Expo Go or a dev client | PASS | Production profile has no `developmentClient`. `expo export --platform ios` produced a release bundle, not a dev client. | Submit that production profile. `expo-dev-client` stays for local development. |
| B1 | Demo account if login exists | N/A | No account. The intro action is Deal me in. | |
| B2 | Expired-subscription demo | N/A | No subscription. | |
| B3 | Credentials per role | N/A | No roles. | |
| B4 | Backends live from a clean install | PASS | No app server. The game HTML is inside the binary. Purchases call StoreKit through `expo-iap` (`src/purchases.ts`). | If `twist21_premium` is not available from the store, the paywall keeps the US price and tells the player to try again. |
| B5 | Review notes are a test script | PASS | `store/review-notes.md`: how to play, how to open the paywall, what it must show, restore, legal links, product id `twist21_premium`, StoreKit, no login. | Fill the device line before pasting (B10). |
| B6 | Every IAP is complete and visible | NEEDS ASC | Code requests only `twist21_premium`. The 12 Nov readout had that product at $2.99 and `MISSING_METADATA`. | Set the price to US $39.99, display name Twist 21 Premium, add the review screenshot, and submit it with build 5. |
| B7 | Metadata URLs return 200 | PASS | Privacy, terms, support, and marketing URLs in the curl table all returned **200**. | |
| B8 | Support contact is real | PASS | Support page **200** and names Samay Vashsht, `samayhuf@gmail.com`. | ASC review phone is still I3. |
| B9 | External services named in notes | PASS | `store/review-notes.md`: Apple StoreKit only. | |
| B10 | Notes list devices actually tested | NEEDS DEVICE | The notes say the device line is not recorded yet. | Add the iPhone model, iOS version, and iPad compatibility-mode result. |
| C1 | Metadata matches the binary | PASS | `store/listing.md` matches the game: Ava and Rex, 5 free cards, 3 matches a day, one-time Premium. | Paste it into ASC. |
| C2 | No false capabilities | PASS | Listing, paywall, and notes: one-time US $39.99, no trial, no subscription. No medical claims. | |
| C3 | Premium features are labeled as a purchase | PASS | The description says Premium is a purchase. Listing screenshots show free-play actions. | |
| C4 | iPhone screenshot size, PNG, no alpha | PASS | `store/screenshots/01`–`05` and the IAP image: PNG 1290×2796, color type 2 (no alpha). | Accepted 6.7-inch size. |
| C5 | iPad 13-inch screenshots | N/A | `supportsTablet: false`. | |
| C6 | More than half of screenshots show the app in use | PASS | All five are the game in play: rivals, your turn with Hit/Stand, Peek, round result, Skip. | |
| C7 | Screenshots match this version | NEEDS DEVICE | Shots are this game’s UI. The paywall image shows Twist 21 Premium, $39.99, the unlock list, Restore, and the legal links. | Compare with TestFlight before upload. The paywall text is unchanged when the product has loaded. |
| C8 | No other-platform imagery | PASS | Screenshots and the iOS UI do not name another store. | `app.json` still has an Android package for a later build. It is not shown in the iOS UI. |
| C9 | No prices in name, subtitle, keywords, or listing screenshots | PASS | Name 8 characters. Subtitle 27. Keywords 74. The five listing PNGs do not show a price. | `store/iap-review-paywall-1290x2796.png` shows $39.99 for the IAP review slot only. |
| C10 | Name length and keywords | PASS | “Twist 21” ≤ 30. Subtitle ≤ 30. Keywords ≤ 100. | |
| C11 | Assets appropriate; not “for kids” | PASS | Card table, fictional opponents. Age rating field is 17+. | |
| C12 | What’s New is specific | PASS | `store/listing.md` describes the first release. | |
| C13 | Category fits | PASS | Games → Card. | |
| C14 | Previews are screen captures | N/A | No preview videos. | |
| C15 | Creative assets | N/A | No extra creative assets. The icon is drawn by `scripts/make-icons.py`. | |
| C16 | Fictional screenshot data | PASS | On-screen names are You, Ava, and Rex. | |
| D1 | Unlocks go through In-App Purchase | PASS | `requestPurchase` with `apple.sku` `twist21_premium`, `type: 'in-app'`. The web code box is not shown in the app. | |
| D2 | Restore exists and works | NEEDS DEVICE | The paywall shows Restore purchases. `restore()` calls `restorePurchases` and `getAvailablePurchases`, then saves the unlock. | Not run on a Sandbox account that already bought. |
| D3 | Subscription length and value | N/A | No auto-renewable subscription. | |
| D4 | One subscription group | N/A | This version does not sell a subscription. | |
| D5 | Price, term, and contents before purchase | PASS | IAP screenshot: Twist 21 Premium, $39.99, “Charged once by Apple. Does not renew.”, the unlock list, then Unlock. | StoreKit’s sheet comes after that screen. The US price is the fallback until StoreKit returns `displayPrice`. |
| D6 | Trial length and post-trial price | N/A | No trial and no introductory offer. | |
| D7 | Privacy and Terms on the purchase flow | PASS | Paywall screenshot shows Terms of Use (Apple Standard EULA), Privacy Policy, and Support above Unlock. URLs returned **200**. Same links on the intro and on Rules. | |
| D8 | Metadata points at Privacy and Terms | NEEDS ASC | `store/listing.md` includes both URLs and says to keep Apple’s standard EULA. | Select the standard EULA in ASC. Do not paste a custom license. |
| D9 | Paywall price matches ASC and the listing | NEEDS ASC | App and listing: `twist21_premium`, display name Twist 21 Premium, US $39.99. The 12 Nov ASC price for that id was $2.99. | Change the existing product’s price to $39.99. Do not create a second product id. |
| D10 | No unfinished paywall benefits | PASS | The unlock list is Swap, Force Hit, Target 18, Target 24, unlimited matches, and the bust-chance meter. All exist in `game/index.html`. | |
| D11 | IAP submitted with this version | NEEDS ASC | The binary’s only product id is `twist21_premium`. It already exists and still needs metadata, the $39.99 price, and the review screenshot. | Upload `store/iap-review-paywall-1290x2796.png`. |
| D12 | Paid Applications Agreement | NEEDS ASC | 12 Nov readout: the Paid Apps agreement was not signed. | Re-check Agreements, Tax, and Banking. |
| D13 | Sandbox purchase unlocks and survives relaunch | NEEDS DEVICE | Not run. A verified purchase calls `finishTransaction` and `saveOwned()` (`src/entitlement.ts`, AsyncStorage). | Buy, force-quit, relaunch. Then delete, reinstall, and restore. |
| D14 | Manage or cancel a subscription | N/A | No subscription. After purchase the header says Premium unlocked. | |
| D15 | Prior paid users keep what they bought | N/A | `twist21_premium` was never on a submitted build. | |
| D16 | Notes explain how to reach the paywall | PASS | `store/review-notes.md`: Go Premium, or the fourth match of the day. No login. | |
| E1 | Lasting use without paying | PASS | Free play is a full match: 3 a day, 5 action cards, two opponents. Screenshots 01–05. | |
| E2 | Not a white-label template | PASS | Original game in this repo. Developer Samay Vashsht. | |
| E3 | Not a duplicate bundle | NEEDS ASC | This repo has one bundle id. Other apps on the account were not inventoried. | |
| E4 | Meaningfully distinct | PASS | Action cards change turn order, information, and the target. No wagering. | |
| E5 | Related apps are distinct | N/A | One app in this repo. See E3. | |
| E6 | Does not copy another app’s brand | PASS | Name Twist 21. Icon from `scripts/make-icons.py`. | |
| E7 | No forced rating or cross-download | PASS | No rating prompt and no install-another-app gate. | |
| E8 | Works without another app | PASS | First screen is the game. | |
| F1 | Privacy policy discloses collection and deletion | PASS | Live privacy page **200**. It names Samay Vashsht, on-device progress, Apple In-App Purchase, no third-party payment processor, no ads or tracking, retention until delete, and `samayhuf@gmail.com`. | The page also says the game uses virtual chips. This build scores points and does not sell a chip balance. |
| F2 | Nutrition labels match the SDKs | NEEDS ASC | Suggested label in `store/listing.md`: Data Not Collected. Apple processes the payment. The unlock flag stays on the device. | Not entered in ASC. |
| F3 | Privacy manifest and required-reason APIs | PASS | `app.json` `ios.privacyManifests`: tracking false, UserDefaults `CA92.1`. | Confirm `PrivacyInfo.xcprivacy` in the uploaded IPA if Apple sends ITMS-91053. |
| F4 | Third-party SDK manifests | PASS | `expo-iap` ^6.4.3 and Expo SDK 58.0.25. `expo-doctor` 20/20. The export logged the expo-iap config plugin. | |
| F5 | Purpose strings for every permission | PASS | Expo config has no camera, photo, microphone, location, tracking, contacts, or HealthKit keys. | |
| F6 | Permissions in context | N/A | No permission prompts. | |
| F7 | In-app account deletion | N/A | The app does not create an account. | |
| F8 | Usable without sign-in | PASS | No login UI. | |
| F9 | Equivalent login beside social login | N/A | No social login. | |
| F10 | Tracking and ATT | PASS | No ATT prompt. No `NSUserTrackingUsageDescription`. Manifest tracking flag is false. | |
| F11 | Tracking flag matches behavior | PASS | `NSPrivacyTracking: false`. No tracking domains. | |
| F12 | Third-party model consent | N/A | Nothing is sent to a model. | |
| F13 | Health data not used for ads | N/A | No health data. | |
| F14 | Health data not in iCloud | N/A | No health data and no iCloud entitlement. | |
| F15 | Name and email are optional | PASS | The app never asks for a name or email. | |
| F16 | Location only when relevant | N/A | No location API. | |
| G1 | No diagnosis or treatment claims | PASS | Listing, paywall, legal pages, and review notes. | It is a card game. |
| G2 | Health-measurement accuracy | N/A | No measurements. | |
| G3 | Consult-a-doctor reminder | N/A | No medical decisions. | |
| G4 | Age-rating answers | NEEDS ASC | Not filed. `store/listing.md` suggests simulated gambling, no real-money prize, expect 17+. | |
| G5 | Notes do not over-claim | PASS | `store/review-notes.md` describes a card game and a one-time purchase. | |
| H1 | Privacy URL returns 200 | PASS | `curl` **200** `https://samayhuf-star.github.io/app-legal/twist21/privacy/`. | |
| H2 | Support URL returns 200 and a contact | PASS | `curl` **200**. The page includes `mailto:samayhuf@gmail.com`. | |
| H3 | Terms URL returns 200 | PASS | `curl` **200** `https://samayhuf-star.github.io/app-legal/twist21/terms/`. The page adopts Apple’s Standard EULA and links to it. | Change the product id on that page from `twist21_lifetime` to `twist21_premium`. Push to `app-legal` was denied (403). |
| H4 | Legal links on the paywall and in Rules, without paying | PASS | Paywall screenshot, intro, and the Rules screen. | Rules is the always-available info screen. |
| H5 | No placeholder URLs | PASS | Listing and review notes use the app-legal URLs and `samayhuf@gmail.com`. | |
| I1 | Extra review material already in notes | N/A | No OTP, QR, or invite code. | The Sandbox Apple ID is Apple’s. |
| I2 | Hardware video | N/A | No accessory. | |
| I3 | Review contact is monitored | NEEDS ASC | 12 Nov readout: review contact was blank. Support address is `samayhuf@gmail.com`. | Put a monitored phone and email on the version. |
| J1 | Age-rating questionnaire | NEEDS ASC | Not submitted. Guidance is in `store/listing.md`. | |
| J2 | Metadata does not imply a child audience | PASS | No “for kids” or “for children”. | |
| J3 | Kids Category rules | N/A | Not a Kids Category app. | |
| J4 | UGC moderation | N/A | No user-generated content. | |
| J5 | Age gate for chat or UGC | N/A | No chat. | |
| K1 | Real iPad layout and 13-inch shots | N/A | `supportsTablet: false`. | |
| K2 | iPhone-only app in iPad compatibility mode | NEEDS DEVICE | Not launched on iPad. | |
| K3 | Small phone and large phone | NEEDS DEVICE | Paywall measured at 430×932 CSS: price, terms, and Restore fit. | Not checked at iPhone SE width, and not on a physical phone. |
| K4 | Missing hardware does not crash | N/A | No camera or Bluetooth accessory. | |
| L1 | Artwork is licensed | PASS | Icon is original. Screenshots are the game’s own UI. | |
| L2 | Audio is licensed | N/A | No audio in `game/index.html`. | |
| L3 | No Apple endorsement or Apple-app look | PASS | Icon is a “21” ring. In-game icons are custom SVG. | |
| L4 | Third-party trademarks | N/A | No celebrity or sports imagery. | |
| L5 | Screenshots do not expose a real person | PASS | Fictional opponents only. | |

## What changed in this pass

- Purchases use `expo-iap` ^6.4.3 and StoreKit directly. `react-native-purchases` and `react-native-purchases-ui` are gone. There is no SDK key.
- The only product id in code is `twist21_premium`. A verified purchase or restore is finished with `finishTransaction` and saved with AsyncStorage (`src/entitlement.ts`).
- If the product has not loaded, the paywall still shows the US $39.99 price, Restore, and the legal links, and says the App Store price is not available yet.
- The game is the bundled HTML. `GAME_BASE_URL` is gone, so the WebView does not use the missing twist21 Pages site.
- Legal links are the app-legal URLs above. `ios.buildNumber` is 5. `appVersionSource` is local. Production does not auto-increment.
- `app.json` plugins: `expo-splash-screen`, `expo-status-bar`, `expo-iap`.

## Before you submit

1. On `samayhuf-star/app-legal`, change the terms page product id from `twist21_lifetime` to `twist21_premium`. This session could not push (403).
2. In App Store Connect, set the existing `twist21_premium` price to **US $39.99**, display name **Twist 21 Premium**, complete its metadata, and upload `store/iap-review-paywall-1290x2796.png`. Submit that product with build 5. Do not add another product id.
3. Paid Applications Agreement, tax, and banking must be active.
4. Paste `store/listing.md` and, after the device line is filled in, `store/review-notes.md`. License agreement: Apple’s standard EULA. Privacy label: Data Not Collected. Age rating: simulated gambling, no real-money prize. Export: exempt.
5. Build this commit with the production profile and upload it as build 5. On a physical iPhone: cold launch, play, buy in Sandbox, force-quit, relaunch, delete, restore. Also launch in iPad compatibility mode.
