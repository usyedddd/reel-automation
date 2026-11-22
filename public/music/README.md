# Music beds

No music ships with this repo (licences). Add your own royalty-free tracks
here: the agent can suggest some during onboarding and will show you the list
before downloading anything.

- Point a reel at a track with `"music_src": "music/<file>.mp3"` in its shot
  plan, or set a default in `config.json → defaults.musicBed`.
- The compiler measures the track and sets it about 13 LU under the voice
  (`music_gap_lu` in the shot plan), so you never hand-set the volume.
- On Pixabay, skip tracks marked "Content ID registered": they can trigger
  claims on YouTube and Instagram.
- Record each track (title, author, link, licence) in `public/CREDITS.txt`.

Audio files here are git-ignored.
