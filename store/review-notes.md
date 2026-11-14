# App Review notes — Twist 21 (Guideline 2.1)

Paste the block below into App Review Information. No demo account exists. Do not invent one.

---

Twist 21 is a solo card game (bundle com.samay.twist21, version 1.0.0). There is no account and no login. Nothing is locked behind a sign-in.

Concept: get close to a target (usually 21) without going over, against two on-device opponents, Ava and Rex. First to 5 points wins. On your turn you may play one action card, then Hit or Stand. Your first card is face-down to the opponents. Some action cards change the target to 18 or 24.

Business model: free with 3 matches a day and 5 action cards (Skip, Peek, Trim, Shield, Reverse). Twist 21 Premium is a one-time non-consumable, product ID twist21_lifetime, US $39.99. It is not a subscription and it has no trial. Premium unlocks Swap, Force Hit, Target 18, Target 24, unlimited matches, and the bust-chance meter. Payment is Apple In-App Purchase through RevenueCat (entitlement id: premium). There is no other way to pay inside the iOS app.

How to play:
1. Open the app. On the intro, tap Deal me in. You do not sign in.
2. Play a turn: tap an action card if you want one, then tap Hit or Stand.
3. Rules stay on the Rules button. That screen also links to Terms of Use (Apple Standard EULA), the Privacy Policy, and Support. Those links open in the browser and do not require a purchase.

How to test the in-app purchase (Sandbox Apple ID; the app itself has no login):
1. Tap Go Premium. The paywall appears before the Apple payment sheet.
2. Confirm it shows: the name Twist 21 Premium, the full price, the words one-time / does not renew, the list of what Premium unlocks, Restore purchases, Terms of Use (Apple Standard EULA), and Privacy Policy.
3. Tap Unlock and complete the Sandbox purchase. Premium action cards, unlimited matches, and the bust-chance meter unlock immediately. The button changes to Manage Premium.
4. Delete the app, reinstall, tap Go Premium, then Restore purchases. Premium returns without paying again.
5. Play 3 free matches in one day only if you want to see the daily-limit paywall. It is the same screen.

External services the reviewer will reach: Apple StoreKit, and RevenueCat to validate the receipt. The game itself is bundled in the app and plays with no network. Support contact: samayhuf@gmail.com (Samay Vashsht).

Devices and OS tested: fill this in after the TestFlight pass on a physical iPhone. iPad is not a target (iPhone only); please still launch it in iPhone compatibility mode.

---
