# App Review notes — Twist 21 (Guideline 2.1)

Paste the block below into App Review Information. No demo account exists. Do not invent one.

---

Twist 21 is a solo card game (bundle com.samay.twist21, version 1.0.0). There is no account and no login. Nothing is locked behind a sign-in.

Concept: get close to a target (usually 21) without going over, against two on-device opponents, Ava and Rex. First to 5 points wins. On your turn you may play one action card, then Hit or Stand. Your first card is face-down to the opponents. Some action cards change the target to 18 or 24.

Business model: free to play with every action card and unlimited matches. Players start with 10,000 chips, get a daily bonus, and earn chips by winning rounds and matches. Chips are only spent on cosmetics (card backs, table themes), three bonus cards (Double, Freeze, Steal) and a bust-odds meter. Chips are never staked on a result, cannot be cashed out and have no real-world value, so there is no gambling. Optional consumable chip packs (twist21_chips_5k, 18k, 35k, 80k, 200k) are sold through Apple In-App Purchase using RevenueCat. There is no subscription.

How to play:
1. Open the app. On the intro, tap Deal me in. You do not sign in.
2. Play a turn: tap an action card if you want one, then tap Hit or Stand.
3. How to play, Stats and Shop are under Menu, which also links to Terms of Use (Apple Standard EULA), the Privacy Policy and Support.

How to test the in-app purchase (Sandbox Apple ID; the app itself has no login):
1. Tap the chip balance at the top, then Get chips. The RevenueCat paywall lists the five chip packs with prices.
2. Pick a pack and complete the Sandbox purchase. The chip balance increases immediately.
3. Force-quit and reopen: the chips are still there.

External services the reviewer will reach: Apple StoreKit and RevenueCat (purchase verification only). The game itself is bundled in the app and plays with no network. Support contact: samayhuf@gmail.com (Samay Vashsht).

Devices and OS tested: not recorded yet. This line must name the physical iPhone model and iOS version from the TestFlight pass, and note the iPad compatibility-mode check, before submission. iPad is not a target (iPhone only).

---
