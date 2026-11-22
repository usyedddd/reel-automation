# Reel automation: guide for the coding agent

You (Claude Code, Codex, Cursor or any coding agent) run this repo for a
creator. It turns a story into a finished vertical reel (1080×1920, 30 fps)
with a voiceover, real receipts (news pages, Google searches, company sites,
the people's own photos), motion-graphic scenes, captions, music and a
loudness-mastered render. Everything is code: Remotion (React) for the
picture, Python scripts for the pipeline.

The creator makes the calls; you do the work. Three gates are theirs:
**they pick the story, they approve the script (and the credit cost), they
review the cut.**

Read this whole file before acting. Then:

- **No `config.json` or no style pack in `styles/`** → run [Onboarding](#onboarding-first-run).
- **Set up already** → read `config.json`, the style pack named in
  `config.json → defaults.styleName`, and `docs/SCENES.md`, then wait for the
  creator to ask for a reel.

---

## Ground rules (always)

1. **Never start a reel until the creator asks for one.**
2. **Ask before anything that costs money, downloads files, installs
   software or posts publicly.** Say what it is and what it costs first
   (ElevenLabs bills roughly one credit per character of script).
3. **Never invent people, numbers or quotes.** Every number on screen traces
   to the job's fact ledger with a real source. No anonymous "case studies".
4. **Never get around a bot wall, CAPTCHA, paywall or login** when capturing.
   Use another source, e.g. a Google result that quotes the page.
   Decline non-essential cookies.
5. **Only use media the creator may use**: real public material about the
   story, credited on screen; royalty-free audio (check it isn't Content ID
   registered); company logos in their true colours.
6. **Learn techniques from reference creators, never their identity**: no
   names, logos, watermarks, catchphrases or wording.
7. **Keep the creator's private files private**: `config.json`, the style
   pack, jobs, references and renders are git-ignored. Don't commit them.

---

## Onboarding (first run)

Go step by step, one or two questions at a time. Save answers as you go.

### 1. Check the machine
Run `python scripts/doctor.py`. For anything missing, tell the creator what
you'd install and get a yes first:
- `npm install` (Remotion, Playwright)
- `pip install -r requirements.txt` (Whisper for word timings)
- `npx playwright install chromium` (page captures)
- ffmpeg on PATH (their OS package manager, or ffmpeg.org)

On Windows use `python`, not `python3`, and read/write files as UTF-8.

### 2. Learn about the channel
Ask: channel name, handle, niche, who it's for, which platforms (Instagram,
TikTok, YouTube Shorts), and the call to action they want (follow, or
"comment KEYWORD" when giving something away). Copy `config.example.json` to
`config.json` and fill in `channel` and `defaults`.

### 3. Reference reels: learn their style
Ask for **5 to 10 reference reels** in the style they want: their own past
reels, or creators they admire. They save the video files into `reference/`
(only videos they're allowed to keep for study; don't pull from sites that
forbid it). Then:

1. `python tools/analyze_reference.py` measures every reel: length, cuts per
   minute, median shot length, words per minute, opening words, plus a
   contact sheet (one frame per second) per reel in `reference/_analysis/`.
2. Look at every contact sheet and read the transcripts. Note the look
   (backgrounds, colours, fonts, caption style and position), the scene mix
   (real footage, screenshots, faces, motion graphics), motion (cuts,
   zooms, transitions), sound (music, SFX on cuts), and the script shape
   (hook, re-hooks, payoff, call to action).
3. Write `styles/<name>.md` from `styles/_template.md`: the measured numbers
   and the observed rules, specific enough that two different agents would
   make the same reel.
4. Show it to the creator and adjust until they say it's right. Put the
   style name in `config.json → defaults.styleName` and the checkable rules in
   `config.json → rules` (see the comments in `config.example.json`).

### 4. Make the engine look like the style
The kit ships with a neutral starter look. Match it to the style pack:
- `src/kit/tokens.ts`: fonts (any Google Font via `@remotion/google-fonts`),
  stage colours, neutrals.
- `src/theme/tokens.ts`: theme colours, radii, shadows.
- Accent per reel: the shot plan's `"accent"` (#hex or a preset name).
- Captions: `"caption_style"`: `dynamic` (1–3 bold words with a highlighter
  on the spoken word) or `single-word-top`. Change `src/kit/KitCaption.tsx` if
  their captions look different.
Preview with `npm run studio` (composition `kit-demo` shows every scene type)
and `node tools/stills.mjs kit-demo <dir> 2s 8s 14s --scale 0.5`. Get the
creator's OK on the look.

### 5. Voice
Ask the creator to **connect the ElevenLabs MCP connector** (Claude:
Settings → Connectors → ElevenLabs; other tools: add the ElevenLabs MCP server
to their MCP config) and sign in themselves. Then help them choose a voice: list
voices through the connector, or they paste a voice ID from elevenlabs.io.
Save `voiceId`, `voiceName`, `model` and their target pace in
`config.json → voice`.

If the connector isn't available, the fallback works just as well: they
generate the voiceover on elevenlabs.io with the same voice and save the MP3 as
`public/assets/<slug>/vo-raw.mp3`.

### 6. Music and sound effects
No audio ships with the repo (licences). Offer to find royalty-free music
beds and SFX that fit the style (e.g. Pixabay; skip tracks marked
"Content ID registered"). Show the list (name, source, length) before
downloading. Save to `public/music/` and `public/sfx/` using the names in
their READMEs, and record each one in `public/CREDITS.txt`.

### 7. Check and stop
Run `python scripts/smoke_test.py` and `python scripts/doctor.py`. Summarise
what's set up and what's missing, then wait for the creator to ask for a reel.

---

## Making a reel

Follow the style pack for every creative choice. The steps below are the
mechanics. The diagram is in `docs/workflow.png`.

### 1. Find the story (when asked)
Research fresh, credible reporting in the niche. Shortlist about five
ideas, each with a named person, the key numbers, a source link and a twist
or catch. Save them to `jobs/IDEAS.md` and **let the creator pick**.

### 2. Script, beat map and fact ledger
`python scripts/new_job.py <slug> --topic "..." [--target-seconds 40]`
creates `jobs/<slug>/`. In `jobs/<slug>/script.md` write:
- **Script:** sized to the target length at the voice's pace
  (words ≈ seconds × wpm / 60), shaped like the style pack's structure.
- **Beat map:** one row per scene: the phrase, the scene type, and the real
  media for it.
- **Fact ledger:** every claim and number, with source title, date and URL.
  Say exactly what the source says (e.g. "estimated annual revenue", not "profit").

Show the script, the beat map summary and the credit cost. **Wait for
approval** before generating any voice.

### 3. Voiceover
Generate one take through the ElevenLabs connector with the voice in
`config.json`, then:
```
python scripts/voiceover.py fetch <slug> --url "<audio url>"    # or the creator saves vo-raw.mp3
python scripts/voiceover.py prepare <slug> [--tempo 1.08]
```
`prepare` writes `vo.mp3` and Whisper word timings to `vo.json`, and reports
words per minute. Adjust `--tempo` (0.8–1.2) until the pace matches the style.
Pad about 1.2 s of silence after the last word if the reel ends on a follow card.

### 4. Real media
Capture receipts and the people's real material, and credit each item in
`public/assets/<slug>/manifest.json`:
- Pages: `node tools/capture.mjs screenshot "<url>" --out public/assets/<slug>/shots/x.png --width 480 --scale 3 --find "phrase|phrase"`
  (phone width keeps text big; `--find` gives highlight boxes).
- Google searches: add `&hl=en&gl=us` for English results. AI Overviews change
  on every search, so keep the capture you used.
- Screen recordings of real sites: `node tools/capture.mjs record "<url>" --out x.webm --duration 7`,
  then convert to MP4 (see `tools/CAPTURE.md`). Browser and story scenes play MP4s.
- Logos: `node tools/get_logo.mjs <name>` or `node tools/site_logo.mjs <name> <url>`,
  then `node tools/trim_svg.mjs public/assets/logos`.

### 5. Shot plan → beat sheet
Write `jobs/<slug>/shot-plan.json`: one shot per beat, each starting on a
`start_phrase` **spelled the way Whisper heard it** (check `vo.json`). Scene
types and props are in `docs/SCENES.md`. Fix misheard names on screen with
`caption_corrections` (an empty string drops a token). Then:
```
python scripts/compile_shot_plan.py <slug>   # also levels the music ~13 LU under the voice
python scripts/validate_job.py <slug>
python scripts/register_beats.py
```

### 6. Preview
`node tools/stills.mjs <slug> <dir> 1s 5s 9s ... --scale 0.5` renders a
handful of frames from one bundle. Look for text that's too small,
collisions, highlights that miss their words, anything that breaks the
style pack. Fix, then render.

### 7. Render
`python scripts/render_job.py <slug>` type-checks, renders at upload quality
(PNG frames, CRF 12, BT.709), masters to −14 LUFS and frame-lints. Renders
take a few minutes: run it in the background and **post progress (frames,
%) to the creator while it runs**.

### 8. Review
Send the video. Apply the creator's notes. Notes that apply to every reel
("music too loud", "less dark", "no boxes") go into the style pack and
`config.json → rules` too, so the next reel starts right.

### 9. Ship
Write `jobs/<slug>/captions.md` (Instagram caption, TikTok caption, YouTube
title options + description + tags, every number matching the ledger).
Optional cover: `StoryCover` in `src/kit/Cover.tsx`. Then
`python scripts/publish_reel.py <slug>` copies the video, cover and captions to
`reels/NN-<slug>/`, the folder they post from. Posting tip: switch on
"Upload at highest quality" in Instagram.

---

## Where things are

| What | Where |
|---|---|
| Scene types and props | `docs/SCENES.md`, `src/kit/types.ts` |
| Scene components | `src/kit/` (`scenes.tsx`, `KitBrowser.tsx`, `KitBrand.tsx`, `KitCaption.tsx`, `Cover.tsx`) |
| Look (fonts, colours) | `src/kit/tokens.ts`, `src/theme/tokens.ts` |
| Pipeline scripts | `scripts/` |
| Capture + helper tools | `tools/` (`capture.mjs`, `stills.mjs`, `get_logo.mjs`, `site_logo.mjs`, `trim_svg.mjs`, `lint_frames.py`, `analyze_reference.py`) |
| Creator settings (private) | `config.json` |
| Style pack (private) | `styles/<name>.md` |
| A reel in progress (private) | `jobs/<slug>/`, `public/assets/<slug>/` |
| Finished reels (private) | `reels/NN-<slug>/` |

## Gotchas
- Whisper mishears names. Shot anchors must use the misheard spelling, and
  `caption_corrections` fixes what's shown.
- Multiply-blended highlights vanish on dark websites: give those browser
  scenes `"pageTone": "dark"`.
- `node tools/stills.mjs` is much faster than `npx remotion still` for checking
  several frames.
- Keep commands cross-platform. On Windows PowerShell, put multi-line Python in
  a file instead of `python -c`.
