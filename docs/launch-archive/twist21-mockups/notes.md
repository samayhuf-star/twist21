# Twist 21 v2 — layout and component notes

For the code bot. Mockups are HTML renders (not the live WebView), 1206×2622, labelled SAMPLE DATA.

Repo: `samayhuf-star/twist21`, branch `7apps/launch-fixes` @ `0c2990b`. Source of truth is `game/index.html`. After editing it, run `npm run build:html` to regenerate `src/gameHtml.ts`. Do not edit `gameHtml.ts` by hand. Do not commit secrets. No review submission in this pass.

Samay's build 3 screenshots were not on the box at the hashed paths COO sent. The diagnosis below is from a live render of this branch at iPhone 16 size (402×874 @3x): the play screen is 1230 CSS px tall in a 874 px viewport, so Hit and Stand sit below the fold. The intro rules overlay also scrolls.

## 1. One-screen table (no page scroll)

Build 3 stacks full-width opponent seats, a score bar, a feed, then your seat, action cards, and Hit/Stand. On a 6.1" phone the action buttons are off-screen, and scrolling hides the other players.

Implement:

- Compact header: `Twist 21` wordmark (Unbounded, gold on "21"), Rules, PRO, target ring (existing conic gold/orange ring, number, "target" label).
- Meta row: chip balance, round, turn order. Keep it to one line.
- Opponent seats in a **single row** at the top (2 or 3 compact seats). Each seat shows: bot/human avatar, name (never truncated), personality or "Human", visible total (`9+?` until revealed), mini face-up cards plus a back for the hole card, card count, action count, and 5 score pips. The current player gets the existing gold `is-turn` ring and a "Your turn" / "Playing" chip.
- Pin a **bottom dock** for the current human: name, turn/standing/bust/shield chips, full total (hole card visible to them, dashed "mine" outline), their number cards, action cards, then **Hit and Stand always visible**. Premium bust-chance line can sit under the buttons. Keep a safe-area pad above the home indicator.
- Replace the multi-line feed with one status line (e.g. "Your turn. Play one action if you like, then Hit or Stand.").
- During play: no page scroll (`overflow: hidden`, dock pinned). A short chooser row (Swap/Peek/Force/Freeze/Steal target) can replace the status line when needed.

Split `seatHTML`: compact opponent vs self dock. Do not render the human as a tall seat plus a second hand.

Keep the existing palette and type: `--ink #100e26`, `--table #1a1840`, `--edge #2f2c66`, `--paper #f3eee4`, `--hot #ff5a3c`, `--twist #ffd23f`, `--mint #3ddc97`, `--rose #ff4d6d`, `--muted #a29fd0`, `--lo / --mid / --hi` card bands, Unbounded + Figtree.

Card polish: use proper corner indices (top-left upright, bottom-right rotated). The current bottom-left 180° `i` makes "10" look like "OL". Hide corner indices on the smallest mini cards if they get muddy.

## 2. Local multiplayer (2–4, pass-and-play, mix in AI)

Stop hardcoding `NAMES = ['You', 'Ava', 'Rex']` and treating `S.players[0]` as the only human.

New **setup** screen (see `setup.png`):

- Player count 2 / 3 / 4.
- Per seat: name field, Human / AI toggle.
- If AI: pick a house bot — Ava, Rex or Shark — and auto-fill the name. Personality caption: Cautious / Reckless / Hard.
- First to 5, exact target = 2, ties score nothing (unchanged). New players start with 10,000 chips.
- "Start match".

When the next actor is a different human, show the **handoff** (see `game-2p-passplay.png`): "Pass to {Name}", short copy to flip the phone away, "{Name} — continue". Hide the previous human's hole card and action hand before the next person sees the table. The dock always belongs to the person whose turn it is. Online multiplayer is out of scope unless Samay asks.

Bots already run through `p.human` and `botTurn`. Extend that to 1–3 AI seats and any seat index, not only 1 and 2.

## 3. Bot personalities, avatars, taunts

| Bot   | Style     | Behaviour (lean on the existing bot, then bias) |
|-------|-----------|--------------------------------------------------|
| Ava   | Cautious  | Stands earlier, prefers Shield/Trim, rare Force Hit |
| Rex   | Reckless  | Hits later, happier to Force Hit / Raise / skip safety |
| Shark | Hard (new)| Tighter `estTotal`, better action timing, values Peek |

Each needs a unique avatar (SVG portraits in the mockups; export assets into `assets/` or inline SVG) and short taunts on play, stand, bust, and exact 21. In `game-4p.png` Shark's bubble is "I'll wait. You'll bust." Keep lines short. Respect `prefers-reduced-motion`.

The 4-player mockup is You vs Ava, Rex and Shark so all three faces show on one screen. Setup can still swap a seat to a human friend (Priya in the 2-player mockup).

## 4. Action cards and animations

Existing cards, same rules as today:

- Free: Skip, Peek, Trim, Shield, Reverse
- Premium: Swap, Force Hit, Target 18 (`lower`), Target 24 (`raise`)

New cards (mechanics used in the mockups — confirm if Samay wants different wording):

- **Double** — Draw exactly one more card, then you must stand.
- **Freeze** — Chosen player misses their next turn and cannot be Force Hit until after that missed turn. Stronger than Skip, and distinct from it.
- **Steal** — Take one action card from another player's hand. Distinct from Swap (which trades a face-up number card).

Add to `ACTIONS`, `ORDER`, `ICON_PATHS`, `valid` / `targetsFor` / `doAction`, the deck builder, rules table, and the bot chooser. Hand limit is still 3; if Steal would push over 3, drop the oldest as today.

Animations (Swap, Peek, and the three new cards): Swap slides the two face-up cards; Peek flips the hole card for a beat; Double stamps/pulses the new card; Freeze gets a short ice overlay on the seat; Steal snatches an action pip across. Skip reduced motion.

**Unlock path for Double / Freeze / Steal is not decided.** Do not invent it. Options: add to Premium, gate with Chips Pass, or make them free. The rules mockup marks them "New" and calls this out in the footnote.

## 5. Tutorial and Rules

First-launch guided tutorial (flag in `localStorage`, e.g. `twist21.tutorialDone`). Interactive steps through a **sample** round, not a lecture. Mockup `tutorial.png` is step 3 of 6, coach-mark on **Hit**. Suggested steps: (1) seats and target ring, (2) your hole card is face-down to others, (3) Hit or Stand, (4) play one action, (5) opponents and whose turn, (6) scoring — 1 point, 2 if exact, first to 5. Skip control. After skip or finish, go to setup or a default match.

Rules is a dedicated screen (`rules.png`), not the current scrolling intro dump. Intro should be short: one line of flavour plus "Deal me in" and a How to play / Tutorial link. The 6.1" rules mockup fits without scroll, including all 12 actions. If a smaller phone cannot fit, internal scroll on the action list only — the play table itself must still not scroll.

## 6. Juice

- Haptics: deal, hit, stand, bust, exact 21, action play (use `expo-haptics`; bridge from the WebView if the game stays in HTML).
- Card flip sounds.
- Confetti when someone lands exactly on the target.
- A clear bust reveal (shake / flip), not just a "Bust" chip.

Add sound files under `assets/` and a mute/reduced-motion path. `App.tsx` / `package.json` only need changes if you add Expo modules (`expo-haptics`, `expo-av` or similar). The WebView wrapper can otherwise stay as it is.

## 7. Stats screen

New screen (`stats.png`), reachable from setup (and later from a post-match or header control):

Required: win rate, best streak, most-used card, biggest win.

The mockup also shows matches played, busts, perfect 21s, a vs-Shark count, daily-bonus progress, and a Chips Pass row. Persist locally (`localStorage` is enough inside the game page). Sample numbers in the PNG are fictional.

## 8. Chips economy (structure approved; prices not set)

Approved:

- Starting balance: **10,000** chips.
- Daily bonus: **1,000**, ramping to **3,000** over 7 days. The mockup uses a rounded linear ladder: 1,000 / 1,300 / 1,600 / 2,000 / 2,300 / 2,600 / 3,000 (day 4 collected, tomorrow 2,300). Confirm the exact steps.
- Chip packs (consumable IAPs).
- Chips Pass (subscription).

Do **not** invent pack prices, the Pass price, or product IDs. Do **not** add table wagering or betting unless Samay explicitly asks. Today's store listing says "No betting, no chips, no real-money play. No ads." That copy has to be rewritten before a store build. If chips are ever staked on a match, check Apple's simulated-gambling questions before submission.

Show the balance in the meta row (mockups use 12,400 as sample data). Confirm the spend sink with COO/Samay before coding it: cosmetics, unlocks, or match entry are safer than staking.

Existing **Premium** (one-time `twist21_premium`, $2.99, RevenueCat) stays. Clarify how it relates to Chips Pass (stack, or Pass includes some Premium perks). Leave the current Premium / paywall / `FREE_KINDS` flow working. New products need the RevenueCat dashboard later. Never ship a `test_` SDK key.

## 9. Files to touch

| File | Why |
|------|-----|
| `game/index.html` | Almost all UI, CSS, rules, match flow, new screens |
| `scripts/build-html.mjs` | Only if the copy step needs a change |
| `src/gameHtml.ts` | Regenerated, do not hand-edit |
| `App.tsx` | Only if haptics/audio need a native bridge |
| `package.json`, `app.json` | New Expo modules, if any |
| `assets/` | Bot portraits, sounds, optional chip token |
| `store/listing.md` | Chips / no-betting copy, new IAP/subscription once prices exist |

Do not change RevenueCat keys or legal URLs in this pass. `App.tsx` already hosts the HTML game in a WebView; keep that architecture.

## 10. Effort and queue

Rough split:

- One-screen layout rewrite, dock, compact seats: 1–1.5 days
- Setup, 2–4 players, pass-and-play handoff, mixed AI: 1.5–2 days
- Tutorial + rules screen: 1 day
- Bot personalities, avatars, taunts: 0.5–1 day
- Double / Freeze / Steal plus animations on Swap, Peek, and the new cards: 1–1.5 days
- Juice (haptics, flips, confetti, bust reveal): 0.5–1 day
- Stats: 0.5 day
- Chips balance, daily bonus, pack/pass UI hooks (after prices): 1.5–2 days
- Polish and 6.1" QA: 0.5 day

**About 8–10 days in total**, then **one EAS iOS build**, TestFlight for Samay, then QA. No App Review submission in this pass. Build 3 stays unsubmitted if it is still in the queue.

Queue: after Klenzer v2, Playsz, and Lulla sound replacements.

## 11. Open questions for COO / Samay

1. What chips are actually spent on (not betting unless he asks).
2. Chip pack prices and the Chips Pass price.
3. How Double, Freeze and Steal unlock (Premium, Pass, or free).
4. Exact daily-bonus ladder.
5. How the existing Premium IAP and Chips Pass should coexist.

## Mockup index

All at `/home/box/shared/app-monitor/reports/twist21-mockups/` (1206×2622):

- `game-4p.png` — You vs Ava, Rex and Shark; your turn; Shark taunt; Hit/Stand on screen
- `game-2p-passplay.png` — Samay vs Priya with the "Pass to Priya" handoff
- `setup.png` — 2–4 players, names, Human/AI, Ava/Rex/Shark picker
- `tutorial.png` — Step 3 of 6, coach-mark on Hit
- `rules.png` — Full rules plus all 12 actions
- `stats.png` — Win rate, best streak, most-used card, biggest win, daily bonus, Chips Pass
- `notes.md` — this file
- `html/` — the HTML/CSS sources for these renders
