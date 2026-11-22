# Sound effects

No sound effects ship with this repo (licences). Add royalty-free ones here.
The compiler adds a soft whoosh on every cut if this file exists:

- `whoosh-soft.mp3`: short, quiet air whoosh (transition)

Shot plans can cue any other file with `"sfx": [{ "src": "sfx/<file>.mp3", "at": 0.4, "vol": 0.08 }]`.
Useful names to collect: `tick.mp3` (highlight lands), `pop-soft.mp3` (element
appears), `impact-boom.mp3` (big number), `glass-hit.mp3` (card lands),
`mouse-click.mp3` (follow click).

Record each file in `public/CREDITS.txt`. Audio files here are git-ignored.
