# Scene types

A reel is a list of scenes cut on the voiceover. In `jobs/<slug>/shot-plan.json`
each shot names the phrase it starts on and the scene to show:

```json
{
  "accent": "#8EC5FF",
  "caption_style": "dynamic",
  "music_src": "music/bed.mp3",
  "caption_corrections": { "eleven": "ElevenLabs", "labs": "" },
  "shots": [
    {
      "start_phrase": "he says ai",
      "claim_id": "F1", "asset_id": "quote",
      "scene": {
        "type": "browser", "src": "assets/my-reel/shots/quote.png", "srcWidth": 1440, "srcHeight": 620,
        "url": "example.com/article", "focus": { "x": 30, "y": 30, "w": 1380, "h": 180 },
        "highlights": [{ "x": 1083, "y": 55, "w": 250, "h": 66, "at": 0.45 }],
        "credit": "Example News · Apr 2026"
      }
    }
  ]
}
```

Each scene runs until the next shot's phrase. Positions are pixels on the
1080×1920 frame; times (`at`, `strikeAt`, …) are seconds into the scene.
Every scene also takes `sfx: [{ src, at, vol }]`, `disclaimer`,
`hideCaptions` and `captionTheme`. The full prop types are in
`src/kit/types.ts`; open `kit-demo` in Remotion Studio to see each one move.

| Type | What it shows | Key props |
|---|---|---|
| `browser` | A real page (screenshot **or screen-recording .mp4**) in a clean browser window. The camera zooms to `focus` on entry, and highlighter strokes sweep over phrases on cue. | `src`, `srcWidth`, `srcHeight`, `url`, `focus {x,y,w,h}`, `highlights[] {x,y,w,h,at}` (from `capture.mjs --find`), `maxZoom`, `from` (video offset), `pageTone: "dark"` for dark sites, `label`, `credit` |
| `story` | A real person's card: face, name, role, a photo or video, story beats revealed on cue, source line. | `face`, `name`, `role`, `media` (image or .mp4), `mediaAspect`, `mediaTag`, `beats[] {text, at, big}`, `logos[]`, `source` |
| `footage` | Full-bleed photo or video with a slow push. | `src`, `from`, `grade: "none" \| "bw"`, `caption` (hook text mid-frame), `serifTitle`, `nameplate {name, title}`, `credit`, `focusX`, `zoomDir` |
| `logos` | Real brand logos locking up ("A × B"), true colours, in white chips. | `logos[] {src, label, at}`, `joiner: "×" \| "+" \| "→"`, `title`, `sub`, `bgSrc` (faded site behind) |
| `statement` | Text that builds word by word; `**bold**` inside a line. | `lines[] {text, size xs–xl, font sans/display/serif, at, accent, muted}`, `bg`, `kicker`, `spotlightAt`, `y`, `align` |
| `number` | One big number or word, optional count-up. | `value` or `countTo` + `prefix`/`suffix`/`decimals`, `label`, `sub`, `font`, `at` |
| `stage` | A composed graphic: robots (AI agents), people, cards, badges, pills, text, images, numbers, with links between them. | `elements[] {kind, x, y, size, at, label, sub, src, variant, glow, strikeAt}`, `links[] {from, to, at, style, flow, bend}`, `title`, `camera` |
| `chart` | A growth curve that re-scales as bigger values arrive. | `points[] {value, label, at}`, `brackets[] {from, to, text}`, `title` |
| `bars` | Horizontal bars, one lit in the accent. | `bars[] {label, value, display, accent, at}`, `title` |
| `follow` | Call to action: a profile card and a cursor clicking Follow, or "comment KEYWORD". | `handle`, `mode: "follow" \| "keyword"`, `keyword`, `bio`, `line`, `clickAt` |
| `end` | Sign-off disc with the handle. | `handle`, `mark`, `line`, `bg` |

`bg` is `"light"` (default), `"dark"` or `"black"` on every scene except footage.

## Captions

`caption_style` in the shot plan:
- `dynamic`: 1–3 bold words at the top, popping in as they're spoken, with
  a highlighter stroke hopping to the spoken word.
- `single-word-top`: one small word at a time.

Scenes that show their own text (`statement`, `follow`, `end`, footage with a
caption) hide the captions automatically. Numbers stay grouped ("$30 million").
`caption_corrections` fixes misheard words on screen.

## Assets and credits

Everything a scene shows lives under `public/` and is listed in
`public/assets/<slug>/manifest.json` with its `source_url` and on-screen
`credit`. A shot's `asset_id` links it to the manifest, and `claim_id` to the
fact ledger in `jobs/<slug>/script.md`.
