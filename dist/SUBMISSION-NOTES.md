# Merge Dungeon — GamePix submission kit

## Files
- `merge-dungeon-gamepix.zip` — upload this as the game build (Game Engine: **HTML5-JS**). 36 KB, 17 files, `index.html` at the root.
- `cover-1280x720.png` — landscape cover / banner
- `thumb-512.png` — square thumbnail
- `icon-1024.png` — large square icon (resize if the form asks for other sizes)

## Checks run before packaging (all passed)
- Zero external requests: every network call is `file://` / relative. No CDN, fonts, analytics, or images fetched.
- Plays a full run keyboard-only with no console errors.
- Runs with `localStorage` blocked (private mode): no errors, progress just isn't saved.
- Opens from `file://` directly (classic scripts, no module/CORS issues), so it also works inside an iframe.
- Zip 36 KB; first paint is instant (no assets to load — sprites, font, sounds and music are all code).

## Facts for the listing form (write the description in your own words)
- Genre: Puzzle / Roguelite. Tags: merge, 2048, dungeon, roguelike, pixel art, casual, one-finger.
- Controls: swipe (mobile) or arrow keys / WASD (desktop). 1–3 pick a perk, Z rewind, M mute, R restart.
- Orientation: portrait-first; desktop shows a side legend.
- Default language English; Korean toggle in the title screen.
- Session length: a run is 3–5 minutes.
- Audio: yes (chiptune BGM + SFX), mutable in-game.
- No ads, no IAP, no login, no data collection.

## What is in the game (for your own reference)
- 4×4 slide-merge board. Weapons / monsters / potions / coins. Weapons and monsters merge up to Lv6.
- Combat: push a weapon into a monster. Higher level slays; equal slays and consumes the weapon; lower costs HP.
- Floors: slay enough monsters to fill the bar → pick 1 of 3 perks (13 perks, each with 3 levels). Boss every 5 floors.
- Potions heal on contact; coins bank automatically at value 4.
- Meta: coins buy 5 permanent relics in the title-screen shop. Save in `localStorage`.
