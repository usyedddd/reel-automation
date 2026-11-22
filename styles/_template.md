# Style pack: <name>

Written during onboarding from the creator's reference reels
(`reference/_analysis/`). Be specific enough that two different agents would
make the same reel. Learn techniques only: no other creator's name, logo,
watermark, catchphrases or wording.

## 1. Measurements (from tools/analyze_reference.py)

| | Average | Range |
|---|---|---|
| Length | s | |
| Words per minute | | |
| Cuts per minute | | |
| Median shot | s | |
| Longest hold | s | |

## 2. Script shape
- Hook (first 1–3 s): formula, with an example in our own words.
- Structure: e.g. hook → who → how → re-hook ("here's the catch") → payoff → call to action.
- Re-hooks: how often, and what they sound like.
- Sentence length, person ("we" / "you"), tone.
- Call to action: follow / comment KEYWORD, and the exact line.

## 3. Look
- Stage: light / dark / colour, and the share of each.
- Colours: neutrals, accent(s) per reel, hues to avoid (→ `config.json rules.avoid_hues`).
- Type: display font, body font, sizes, case.
- Captions: `dynamic` or `single-word-top` (or what to change in `KitCaption.tsx`), position, colour.
- Highlights on pages: highlighter stroke / underline / box.
- Logos: chips, true colours.

## 4. Scene mix
- Real media share (pages, Google, site recordings, the people's photos): % of scenes.
- Faces: how often a real person is on screen.
- Motion graphics: which kit scenes (`stage`, `number`, `statement`, …) and how often.
- Screenshots per reel (→ `rules.min_screenshots`).
- Stock footage: allowed or not.

## 5. Motion
- Cut rhythm (→ `rules.max_scene_seconds`), transitions, zoom behaviour, camera drift.
- What never happens (e.g. static holds over 2 s).

## 6. Sound
- Music: genre, energy, level under the voice (default 13 LU under).
- SFX: on cuts? on reveals? which ones.

## 7. Do / don't
- Do:
- Don't:

## 8. Change log
Notes from the creator's reviews that now apply to every reel (newest first).
