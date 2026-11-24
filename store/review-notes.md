# App Review notes — Twist 21 v1.1.0 (DRAFT, not submitted)

Twist 21 is a solo card game (com.samay.twist21). No account or login. Nothing is locked behind sign-in.

Concept: get close to a target (usually 21) without going over, against two on-device opponents, Ava and Rex. First to 5 points wins the match. On your turn you may play one action card, then Hit or Stand.

Chips and tables: chips are virtual game currency with no cash value. They cannot be withdrawn, sold, transferred or exchanged for money, goods or prizes. The user starts with 10,000 free chips and a daily bonus. Menu > Table lets the user pick a boot of 100, 1,000, 10,000 or 100,000 chips; each player puts the boot in and the match winner takes the pot. Free practice (no boot) is always available. All gameplay and action cards are free. This is why the age rating is 17+ (simulated gambling).

In-app purchases: five consumable chip packs (twist21_chips_12k, _50k, _100k, _250k, _600k) bought through Apple In-App Purchase via RevenueCat. Restore Purchases is in the chip shop. No subscription, no trial, no external payment links.

How to test: 1) Open the app, tap Deal me in. 2) Menu (top right) > Table to choose a boot. 3) Tap the chip balance (top left) to open the chip shop, then tap See chip packs to open the purchase screen; buy a pack with a Sandbox Apple ID; chips are added immediately. 4) Terms (Apple Standard EULA), Privacy and Support links are on the shop and menu screens.

Built with native React Native screens (no web view, no remote content); the whole game is in the binary.

External services: Apple StoreKit and RevenueCat (purchase handling). The game itself plays offline. Support: samayhuf@gmail.com (Samay Vashsht).
