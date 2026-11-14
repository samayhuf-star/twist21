# Twist 21 — Apple pre-submission report

**Date:** 14 November 2026
**Packet:** branch `cursor/app-store-submission-422d` @ `09588c154a027b9c518ee6a78004833785406af5` (plus the screenshot and notes commit that follows this file)
**App:** Twist 21 · bundle `com.samay.twist21` · ASC app `6833334755` · Expo owner `@krosz/twist21` · version `1.0.0`
**Previous binary:** iOS build 4 was produced from `main` @ `a5da64ce`. That build is not this packet. EAS `appVersionSource` is `remote` and the production profile uses `autoIncrement`.
**Decision: DO NOT SUBMIT.**

**Summary:** `PASS 44 · FAIL 7 · N/A 32 · NEEDS DEVICE 9 · NEEDS ASC 13 · Decision: DO NOT SUBMIT`

The seven FAILs are one cause: GitHub Pages is not enabled, so the privacy, terms, and support URLs return **404**. The `gh-pages` branch is already pushed (`adcaab4c0d3bbb97df01334bc00ab2c96fac412a`) with the right files at the root. Enabling Pages from that branch, folder `/`, clears B7, B8, D7, F1, H1, H2, and H3 with no further code change. This run cannot turn Pages on: `POST /repos/samayhuf-star/twist21/pages` returned **403** `Resource not accessible by integration`.

Checklist source: `/cursor/stores/bot/apple-presubmission-checklist.md` (105 checks). A row is PASS only with evidence from this packet. NEEDS DEVICE and NEEDS ASC are not PASS.

## Legal URL HTTP codes

Polled every 15s for 3 minutes (13 attempts) on 14 November 2026. Every attempt was the same.

| URL | HTTP | Body |
| --- | --- | --- |
| https://samayhuf-star.github.io/twist21/ | **404** | GitHub Pages “Site not found” |
| https://samayhuf-star.github.io/twist21/privacy/ | **404** | GitHub Pages “Site not found” |
| https://samayhuf-star.github.io/twist21/terms/ | **404** | GitHub Pages “Site not found” |
| https://samayhuf-star.github.io/twist21/support/ | **404** | GitHub Pages “Site not found” |

`GET /repos/samayhuf-star/twist21/pages` → **404** (no Pages site). Repo is public. `gh-pages` is on the remote.

## Checks

| ID | Area | Result | Evidence | Notes |
| --- | --- | --- | --- | --- |
| A1 | Binary matches this commit, version, and build | NEEDS ASC | `app.json` version `1.0.0`, bundle `com.samay.twist21`. `eas.json` `appVersionSource: remote`, production `autoIncrement`. Build 4 is `a5da64ce`, not this commit. | Make a new production iOS build from this commit and attach it. Do not submit build 4. |
| A2 | Clean install does not crash | NEEDS DEVICE | No TestFlight install was run in this session. | Cold-launch three times on a physical iPhone after deleting the app. |
| A3 | Core journeys work | NEEDS DEVICE | Code paths: Deal me in, Hit/Stand, paywall, restore, Rules. `App.tsx`, `game/index.html`. | Walk play, paywall, restore, and legal links on device. |
| A4 | No placeholder UI | PASS | `rg` on `game/`, `src/`, `App.tsx`, `store/listing.md`, `store/review-notes.md`, `docs/` (excluding the launch archive): no “coming soon”, lorem, “TO ADD”, or “Checkout opens soon”. | The stand-in key string is not in the tree. `src/config.ts` rejects blank and stand-in keys. |
| A5 | No hidden production features | PASS | `eas.json` production profile has no `developmentClient`. iOS UI hides the web unlock-code box (`inApp()` in `game/index.html`). `PRODUCT_ID_MONTHLY` is not purchased. | Hosted RevenueCat paywall is not the purchase screen. The in-game paywall is. |
| A6 | Background modes match real use | PASS | `npx expo config --type public`: no `UIBackgroundModes`. | The game does not use VoIP, audio, or location. |
| A7 | IPv6 | N/A | Game HTML is bundled in `src/gameHtml.ts`. No app server. | StoreKit and RevenueCat are Apple / RevenueCat. Gameplay does not need the network. |
| A8 | Capture indicator | N/A | No camera, microphone, or screen-recording API. Expo config has no capture usage keys. | |
| A9 | Export compliance matches the binary | NEEDS ASC | `app.json` `ITSAppUsesNonExemptEncryption: false`, confirmed by `npx expo config --type public`. | Answer the ASC export questions as exempt (HTTPS only) so they match the flag. |
| A10 | Minimum iOS actually runs | NEEDS DEVICE | `app.json` does not set `deploymentTarget`. React Native 0.88 in this install reports pod minimum 15.1 (`node_modules/react-native/scripts/cocoapods/helpers.rb`). | Not launched on the minimum OS. |
| A11 | No “restart the device / turn off Wi-Fi” copy | PASS | Intro, rules, paywall, `docs/support/index.html`, `store/review-notes.md`. | Support asks for the device model and what happened. |
| A12 | Release build, not Expo Go or a dev client | PASS | `eas.json` production has no `developmentClient`. The `development` profile does. | `expo-dev-client` stays installed for local dev. Submit only a production build. IPA not unzipped here. |
| B1 | Demo account if login exists | N/A | No account creation. Intro action is “Deal me in”. | |
| B2 | Expired-subscription demo | N/A | No auto-renewable subscription. One non-consumable. | |
| B3 | Credentials per role | N/A | No roles. | |
| B4 | Backends live from a clean install | NEEDS ASC | `eas whoami` → not logged in. `RC_API_KEY_IOS` length 0 in this tree. `isRealRcKey` rejects a blank key (`src/config.ts`). | Game plays offline. Purchases work only if production EAS has a real `EXPO_PUBLIC_RC_IOS_KEY` and the new build includes it. |
| B5 | Review notes are a test script | PASS | `store/review-notes.md`: how to play, how to open the paywall, what the paywall must show, restore, legal links, product id, RevenueCat, no login. | Device line is explicitly “not recorded yet”. Fill it before pasting (B10). |
| B6 | Every IAP complete and visible | NEEDS ASC | Binary sells only `twist21_lifetime` (`src/purchases.ts` exact product match). 12 Nov ASC readout: `twist21_premium` $2.99 `MISSING_METADATA`. | Create `twist21_lifetime`. Do not attach `twist21_premium` or the chips-pass products. |
| B7 | Metadata URLs return 200 | FAIL | Curl table above. All four URLs **404** after 3 minutes. | Enable Pages from `gh-pages` `/`. Content is already on that branch. |
| B8 | Support contact is real and monitored | FAIL | `docs/support/index.html` and `gh-pages` `support/index.html` name Samay Vashsht and `samayhuf@gmail.com`. The live URL is **404**. | Same Pages switch as B7. ASC review phone was blank on 12 Nov (I3). |
| B9 | External services named in notes | PASS | `store/review-notes.md`: Apple StoreKit and RevenueCat. No account server. | |
| B10 | Notes list devices actually tested | NEEDS DEVICE | `store/review-notes.md` says the device line is not recorded yet. | Add the iPhone model, iOS version, and iPad compatibility-mode result. |
| C1 | Metadata matches the binary | PASS | `store/listing.md` matches the game: Ava and Rex, 5 free cards, 3 matches a day, lifetime Premium, no chips. | Paste it into ASC. Fields were empty on 12 Nov. |
| C2 | No false capabilities | PASS | Listing, paywall, and docs do not claim a trial, a subscription, medical outcomes, or a model. Price is a one-time US $39.99. | The 7-day trial line was removed because a non-consumable cannot carry a StoreKit trial. The price was not changed. |
| C3 | Premium features are labeled as a purchase | PASS | Description states Premium is a purchase. Listing screenshots show free-play actions (Skip, Peek, Shield, Trim, Reverse) and do not show the premium cards. | IAP review image is separate and is not a listing screenshot. |
| C4 | iPhone screenshot size, PNG, no alpha | PASS | `store/screenshots/01`–`05` and the IAP image: PNG IHDR 1290×2796, bit depth 8, color type 2 (RGB, no alpha). | 1290×2796 is an accepted 6.7-inch size. |
| C5 | iPad 13-inch screenshots | N/A | `supportsTablet: false` in `app.json` and expo config. | |
| C6 | More than half of screenshots show the app in use | PASS | 5 of 5: rivals at the table, your turn with Hit/Stand, Peek target chooser, round result, Skip in play. No splash, login, permission, or settings shot. | |
| C7 | Screenshots match this version | NEEDS DEVICE | Shots were rendered from this commit’s `game/index.html` at 430×932 @3x. | Compare with the new TestFlight build before upload. Build 4’s UI is the old paywall. |
| C8 | No other-platform imagery | PASS | Screenshots inspected. No Play badge, no Android status bar. iOS UI does not name another store. | `app.json` still has an Android package for a later Play build. It is not shown in the iOS UI. |
| C9 | No prices in name, subtitle, keywords, or listing screenshots | PASS | Name “Twist 21” (8). Subtitle “Blackjack with action cards” (27). Keywords 74 characters, no `$`. The five listing PNGs do not show a price. | `store/iap-review-paywall-1290x2796.png` shows $39.99 on purpose. Upload it on the IAP, not as a listing shot. |
| C10 | Name length and keywords | PASS | Name 8 ≤ 30. Subtitle 27 ≤ 30. Keywords 74 ≤ 100. No other app’s name. | |
| C11 | Assets appropriate at 4+; not “for kids” | PASS | Card table and fictional opponents. Listing does not say “for kids” or “for children”. Age rating field is 17+. | |
| C12 | What’s New is specific | PASS | `store/listing.md` What’s New describes the first release: play to 21, Ava and Rex, action cards. | |
| C13 | Category fits | PASS | Games → Card. The app is a card game. | |
| C14 | Previews are screen captures | N/A | No preview videos. | |
| C15 | Creative assets | N/A | No extra creative assets. Icon is drawn by `scripts/make-icons.py`. | |
| C16 | Fictional screenshot data | PASS | Names on screen are You, Ava, and Rex. No photo of a real person. | |
| D1 | Unlocks go through In-App Purchase | PASS | `purchase()` calls `Purchases.purchasePackage`. In the app the code box is replaced by Restore. | Web redeem codes stay in the page for the browser build and are not shown when `ReactNativeWebView` is present. |
| D2 | Restore exists and works | NEEDS DEVICE | Paywall screenshot shows “Restore purchases” above the fold, reachable without paying. `App.tsx` calls `Purchases.restorePurchases`. | Not executed against a Sandbox account that already bought. |
| D3 | Subscription length and value | N/A | No auto-renewable subscription. | |
| D4 | One subscription group | N/A | This version does not sell a subscription. Do not submit the Chips Pass group with it. | |
| D5 | Price, term, and contents before purchase | PASS | `store/iap-review-paywall-1290x2796.png`: “Twist 21 Premium”, “$39.99” (top 127–179 of 932), “Charged once by Apple. Does not renew.”, unlock list, then Unlock. | StoreKit’s sheet is second. The in-game paywall is first. |
| D6 | Trial length and post-trial price | N/A | No trial and no introductory offer. Paywall and terms say it does not renew and there is no trial. | |
| D7 | Privacy and Terms links on the purchase flow | FAIL | Links are visible on the paywall screenshot and in Rules and the intro (`game/index.html` `legalHTML()`). URLs are the Pages URLs, which return **404**. | Placement is done. They are not live until Pages is enabled (H1, H3). |
| D8 | Metadata points at Privacy and Terms | NEEDS ASC | `store/listing.md` includes both URLs and says to keep Apple’s standard EULA. | Select the standard EULA in ASC. Do not paste a custom license. ASC fields were empty on 12 Nov. |
| D9 | Paywall price matches ASC and the listing | NEEDS ASC | App and listing: US $39.99, id `twist21_lifetime`. ASC on 12 Nov: `twist21_premium` at $2.99. | Create the new product at $39.99 so the paywall, listing, and ASC match. The app replaces $39.99 with StoreKit’s localized price when the offering loads. |
| D10 | No unfinished paywall benefits | PASS | Unlock list is Swap, Force Hit, Target 18, Target 24, unlimited matches, bust-chance meter. All exist in `game/index.html`. | |
| D11 | IAP submitted with this version | NEEDS ASC | Product id in code is `twist21_lifetime`. It is not in the 12 Nov ASC readout. | Add it to the version with a display name, description, price, and `store/iap-review-paywall-1290x2796.png`. |
| D12 | Paid Applications Agreement | NEEDS ASC | 12 Nov readout: Paid Apps agreement not signed, so products will not load. | Re-check Agreements, Tax, and Banking. |
| D13 | Sandbox purchase unlocks and survives relaunch | NEEDS DEVICE | Not run. Also blocked if the RevenueCat key is missing from the build (B4). | Buy, kill the app, relaunch, confirm Premium. |
| D14 | Manage or cancel a subscription | N/A | No subscription. After purchase the header can open RevenueCat Customer Center. | |
| D15 | Prior paid users keep what they bought | N/A | `twist21_premium` was never on a submitted build (12 Nov: no build attached, product missing metadata). | |
| D16 | Notes explain how to reach the paywall | PASS | `store/review-notes.md`: Go Premium, or the fourth match of the day. No login. | |
| E1 | Lasting use without paying | PASS | Free play is a full match: 3 a day, 5 action cards, two opponents. Screenshots 01–05. | |
| E2 | Not a white-label template | PASS | Original game in this repo. Developer Samay Vashsht. | |
| E3 | Not a duplicate bundle of the same app | NEEDS ASC | This repo has one bundle id. Sibling apps in the account were not inventoried. | |
| E4 | Meaningfully distinct | PASS | Action cards change turn order, information, and the target (18 or 24). No wagering. | Card games are common; the action-card rules are the difference to state if asked. |
| E5 | Related apps are distinct | N/A | One app in this repo. See E3 for the account. | |
| E6 | Does not copy another app’s brand | PASS | Name “Twist 21”. Icon generated by `scripts/make-icons.py`. | |
| E7 | No forced rating or cross-download | PASS | No rating prompt and no “install our other app” gate in `game/index.html` or `App.tsx`. | |
| E8 | Works without another app | PASS | First screen is the game. No companion app. | |
| F1 | Privacy policy discloses collection and deletion | FAIL | Policy text in `docs/privacy/index.html` (also on `gh-pages`): on-device progress, RevenueCat anonymous id, purchase status, Search Ads attribution token, retention, email deletion request, no ads. Live URL **404**. | Content is ready. The URL is not. |
| F2 | Nutrition labels match the SDKs | NEEDS ASC | Suggested answers in `store/listing.md`: purchases and RevenueCat anonymous id, not linked, app functionality. No tracking. | Not entered. 12 Nov readout had no privacy URL and no visible nutrition label. |
| F3 | Privacy manifest and required-reason APIs | PASS | `app.json` `ios.privacyManifests`: `NSPrivacyTracking` false, UserDefaults `CA92.1`. Confirmed via `npx expo config --type public`. | IPA not unzipped. Confirm `PrivacyInfo.xcprivacy` in the EAS build if App Store Connect warns ITMS-91053. |
| F4 | Third-party SDK manifests | PASS | `react-native-purchases` 11.0.1 and Expo SDK 58.0.25. `npx expo-doctor` 20/20 after the patch bump. | Confirm SDK manifests inside the uploaded IPA if Apple emails a missing-manifest warning. |
| F5 | Purpose strings for every permission | PASS | Expo config: no camera, photo, microphone, location, tracking, contacts, Bluetooth, or HealthKit usage keys. | None are requested. |
| F6 | Permissions in context, denial still works | N/A | No permission prompts. | |
| F7 | In-app account deletion | N/A | The app does not create an account. Privacy policy tells the user to email for the RevenueCat anonymous id. | |
| F8 | Usable without sign-in | PASS | No login UI. `store/review-notes.md`. | |
| F9 | Equivalent login beside social login | N/A | No Google, Facebook, or other social login. | |
| F10 | Tracking and ATT | PASS | No ATT prompt. No `NSUserTrackingUsageDescription`. Manifest tracking flag false. | `enableAdServicesAttributionTokenCollection` runs only after a real RevenueCat key is configured. It is disclosed in the privacy policy. It is not IDFA. |
| F11 | Tracking flag matches behavior | PASS | App manifest `NSPrivacyTracking: false`. No tracking domains set. | |
| F12 | Third-party model consent | N/A | No prompts, photos, or account content are sent to a model. | |
| F13 | Health data not used for ads | N/A | No health, fitness, or motion collection. | |
| F14 | Health data not in iCloud | N/A | No health data and no iCloud entitlement in `app.json`. | |
| F15 | Name and email are optional | PASS | The app never asks for a name or email. | |
| F16 | Location only when relevant | N/A | No location API. | |
| G1 | No diagnosis, treatment, or cure claims | PASS | Listing, paywall, terms, privacy, support, and review notes. | It is a card game. |
| G2 | Health-measurement accuracy | N/A | No measurements. | |
| G3 | Consult-a-doctor reminder | N/A | No medical decisions. | |
| G4 | Age-rating answers | NEEDS ASC | Not filed. `store/listing.md` suggests simulated gambling, no real-money prize, no unrestricted web, no user content, expect 17+. | |
| G5 | Notes do not over-claim | PASS | `store/review-notes.md` describes a card game and a one-time purchase. | |
| H1 | Privacy URL returns 200 | FAIL | `curl -sL` → **404** `https://samayhuf-star.github.io/twist21/privacy/`. Page file: `gh-pages` `privacy/index.html`. | |
| H2 | Support URL returns 200 and a contact | FAIL | `curl -sL` → **404** `https://samayhuf-star.github.io/twist21/support/`. File includes `mailto:samayhuf@gmail.com`. | |
| H3 | Terms URL returns 200 | FAIL | `curl -sL` → **404** `https://samayhuf-star.github.io/twist21/terms/`. The page adopts Apple’s Standard EULA and links to `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`. | Use the standard EULA field in ASC, not a custom paste. |
| H4 | Legal links on the paywall and in the info screen, without paying | PASS | Paywall screenshot: Terms of Use (Apple Standard EULA), Privacy Policy, Support, above the Unlock button. Same links on the intro and under Legal on Rules. | Rules is the always-available info screen. There is no separate Settings tab. |
| H5 | No placeholder URLs in the listing or notes | PASS | `store/listing.md` and `store/review-notes.md`. Real GitHub Pages URLs and `samayhuf@gmail.com`. | The URLs 404 because Pages is off, not because the text is a placeholder. |
| I1 | Extra review material already in notes | N/A | No OTP, QR, sample file, or invite code. | Sandbox Apple ID is Apple’s, not an in-app password. |
| I2 | Hardware video | N/A | No accessory. | |
| I3 | Review contact is monitored | NEEDS ASC | 12 Nov readout: review contact blank. Support address is `samayhuf@gmail.com`. | Put a monitored phone and email on the version. |
| J1 | Age-rating questionnaire | NEEDS ASC | Not submitted. Guidance in `store/listing.md`. | |
| J2 | Metadata does not imply a child audience | PASS | Name, subtitle, and description. No “for kids” or “for children”. | |
| J3 | Kids Category rules | N/A | Not a Kids Category app. | |
| J4 | UGC moderation | N/A | No user-generated content and no generated-content feed. | |
| J5 | Age gate for chat or UGC | N/A | No chat. | |
| K1 | Real iPad layout and 13-inch shots | N/A | `supportsTablet: false`. | |
| K2 | iPhone-only app in iPad compatibility mode | NEEDS DEVICE | Not launched on iPad. | Required even though the app is iPhone-only. |
| K3 | Small phone and large phone | NEEDS DEVICE | Paywall measured at 430×932 CSS (iPhone 15/16 Plus): price, terms link, and Restore all inside the viewport (`scripts/capture-store-screenshots.mjs` log). | Not checked at iPhone SE width, and not on a physical phone. |
| K4 | Missing hardware does not crash | N/A | No camera or Bluetooth accessory. | |
| L1 | Artwork is licensed | PASS | Icon is original (`scripts/make-icons.py`). Screenshots are the game’s own UI. | |
| L2 | Audio is licensed | N/A | No audio or music in `game/index.html`. | |
| L3 | No Apple endorsement or Apple-app look | PASS | Icon is a “21” ring. In-game icons are custom SVG, not Apple emoji. | |
| L4 | Third-party trademarks | N/A | No celebrity, sports, or other-brand imagery. | |
| L5 | Screenshots do not expose a real person | PASS | Fictional opponents only. Same pass as C16. | |

## What was fixed in this packet

- `src/purchases.ts` imported `PRODUCT_ID`, which `src/config.ts` no longer exports. It now buys `twist21_lifetime` only, and it will not fall through to another package.
- RevenueCat keys come only from `EXPO_PUBLIC_RC_IOS_KEY` and `EXPO_PUBLIC_RC_ANDROID_KEY`. A missing or stand-in key does not call `Purchases.configure`. The paywall still shows the price, the unlock list, Restore, and the legal links, and it says purchases are not available in that build.
- Paywall shows Twist 21 Premium, **$39.99** (replaced by StoreKit’s localized price when the offering loads), one-time / does not renew, what is unlocked, Restore purchases, Terms of Use (Apple Standard EULA), Privacy Policy, and Support.
- The 7-day trial was removed from the paywall, listing, and privacy policy. A non-consumable cannot include one. The lifetime price is still US $39.99. Chips Pass was not merged.
- `npx tsc --noEmit` passes. `npx expo-doctor` was 19/20 on the old patch set and **20/20** after `npx expo install --fix` (`expo` ~58.0.25, `expo-dev-client` ~58.0.20, `expo-splash-screen` ~58.0.14, `expo-status-bar` ~58.0.5).
- There is no ESLint script in `package.json`. The typecheck is the lint gate that was run.

## What you must do before submission

1. **GitHub Pages.** Repo → Settings → Pages → Deploy from a branch → `gh-pages` → `/ (root)` → Save. Wait until the four URLs above return 200. No code change is required.
2. **RevenueCat and EAS.** Set a real `EXPO_PUBLIC_RC_IOS_KEY` on the production EAS environment (this session was not logged into EAS, and the tree contains no key). Entitlement `premium`. Current offering’s lifetime package must be the App Store product `twist21_lifetime`.
3. **App Store Connect**
   - New non-consumable `twist21_lifetime`, display name “Twist 21 Premium”, US **$39.99**, no introductory offer. Upload `store/iap-review-paywall-1290x2796.png` as the IAP review screenshot.
   - Do not submit `twist21_premium` ($2.99) or any Chips Pass product with this version.
   - Paid Applications Agreement, tax, and banking must be active.
   - Paste `store/listing.md` (name, subtitle, keywords, description, What’s New, URLs). License agreement: **Apple’s standard EULA**, not a custom paste.
   - Upload `store/screenshots/01` through `05` only. Do not upload the paywall image as a listing screenshot.
   - Paste `store/review-notes.md` after you add the real device and iOS version.
   - App Privacy: purchases and the RevenueCat anonymous id, not linked to identity, app functionality. No tracking.
   - Age rating: simulated gambling, no real-money prize. Expect 17+.
   - Export compliance: exempt, matching `ITSAppUsesNonExemptEncryption` false.
   - Review contact phone and email.
4. **New production build** from this commit (`eas build --profile production --platform ios`), then TestFlight on a physical iPhone: cold launch, play, buy in Sandbox, relaunch, restore, tap Terms and Privacy. Also launch in iPad compatibility mode. Attach that build, not build 4.
