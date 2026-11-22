#!/usr/bin/env python3
"""Voiceover hand-off for faceless reels.

The voiceover is generated through the ElevenLabs MCP connector (voice + model
from config.json -> "voice"), or by the user on the ElevenLabs site and saved
as public/assets/<slug>/vo-raw.mp3. This script takes it from there:

  fetch    <slug> --url URL      download the generated take (signed URL)
                                 -> public/assets/<slug>/vo-raw.mp3
  prepare  <slug> [--source F]   (optional) stretch sentence pauses,
           [--sentence-pause S]  (optional) tempo change, write
           [--tempo T]           public/assets/<slug>/vo.mp3, then Whisper word
                                 timings -> public/assets/<slug>/vo.json
  stats    <slug>                pace / pauses of the prepared VO

Target pace comes from your style pack (most short-form narration sits
around 160-175 words per minute).
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import urllib.request
from pathlib import Path

DEFAULT_ENGINE = Path(__file__).resolve().parent.parent  # repo root
SR = 48000
SENTENCE_END = (".", "?", "!")


def asset_dir(engine: Path, slug: str) -> Path:
    return engine / "public" / "assets" / slug


def probe_audio(path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries",
         "stream=codec_name:format=duration", "-of", "json", str(path)],
        capture_output=True, text=True, check=False,
    )
    data = json.loads(result.stdout or "{}")
    if not data.get("streams"):
        raise SystemExit(f"not a valid audio file: {path}")
    return float(data["format"]["duration"])


def decode(path: Path):
    import numpy as np

    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def encode(samples, path: Path) -> None:
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
         "-c:a", "libmp3lame", "-b:a", "192k", str(path)],
        input=samples.astype("float32").tobytes(), check=True,
    )


def transcribe(path: Path) -> dict:
    import whisper

    model = whisper.load_model(os.environ.get("WHISPER_MODEL", "small"))
    result = model.transcribe(str(path), word_timestamps=True, language="en", fp16=False)
    words = [
        {"word": w["word"].strip(), "start": round(w["start"], 3), "end": round(w["end"], 3)}
        for seg in result["segments"]
        for w in seg.get("words", [])
        if w["word"].strip()
    ]
    return {"text": result["text"].strip(), "words": words}


def stats(words: list[dict], duration: float, samples=None) -> str:
    if not words:
        return "no words"
    span = words[-1]["end"] - words[0]["start"]
    if samples is not None:
        gaps = sentence_silences(samples, words)
    else:
        gaps = [
            (b["start"] - a["end"])
            for a, b in zip(words, words[1:])
            if a["word"].endswith(SENTENCE_END)
        ]
    avg = sum(gaps) / len(gaps) if gaps else 0.0
    return (
        f"{len(words)} words in {span:.1f}s -> {len(words) / span * 60:.0f} wpm | "
        f"sentence pauses avg {avg:.2f}s ({len(gaps)}) | file {duration:.2f}s"
    )


def quiet_run(samples, start_s: float, end_s: float) -> tuple[float, float]:
    """Longest near-silent stretch (10 ms frames below -42 dBFS) in a window.

    Whisper word edges bleed into silence, so the real pause is measured from
    the waveform. Returns (centre_seconds, length_seconds)."""
    import numpy as np

    hop = SR // 100
    a = max(0, int(start_s * SR))
    b = min(len(samples), int(end_s * SR))
    if b - a < hop:
        return (start_s + end_s) / 2, 0.0
    seg = samples[a:b]
    n = len(seg) // hop
    rms = np.sqrt((seg[: n * hop].reshape(n, hop) ** 2).mean(1) + 1e-12)
    quiet = 20 * np.log10(rms) < -42
    best_len, best_end, run = 0, 0, 0
    for i, q in enumerate(quiet):
        run = run + 1 if q else 0
        if run > best_len:
            best_len, best_end = run, i + 1
    if best_len == 0:
        return (start_s + end_s) / 2, 0.0
    centre = start_s + (best_end - best_len / 2) * hop / SR
    return centre, best_len * hop / SR


def stretch_pauses(samples, words: list[dict], target: float):
    """Insert silence after sentence-final words so the real pause reaches `target` s."""
    import numpy as np

    pieces = []
    cursor = 0
    added = 0.0
    for a, b in zip(words, words[1:]):
        if not a["word"].endswith(SENTENCE_END):
            continue
        centre, silence = quiet_run(samples, a["end"] - 0.25, b["start"] + 0.25)
        if silence >= target:
            continue
        cut = int(centre * SR)
        pieces.append(samples[cursor:cut])
        pieces.append(np.zeros(int((target - silence) * SR), dtype=np.float32))
        added += target - silence
        cursor = cut
    pieces.append(samples[cursor:])
    return np.concatenate(pieces), added


def sentence_silences(samples, words: list[dict]) -> list[float]:
    return [
        quiet_run(samples, a["end"] - 0.25, b["start"] + 0.25)[1]
        for a, b in zip(words, words[1:])
        if a["word"].endswith(SENTENCE_END)
    ]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("fetch", "prepare", "stats"))
    parser.add_argument("slug")
    parser.add_argument("--url", help="fetch: signed ElevenLabs content URL")
    parser.add_argument("--source", type=Path, help="prepare: use this file instead of vo-raw.mp3")
    parser.add_argument("--sentence-pause", type=float, default=0.0,
                        help="prepare: stretch sentence gaps to at least this many seconds (house: 0.5)")
    parser.add_argument("--tempo", type=float, default=1.0,
                        help="prepare: playback speed, e.g. 0.92 to slow a fast take (0.8-1.2)")
    parser.add_argument("--engine", type=Path,
                        default=Path(os.environ.get("REEL_ENGINE", DEFAULT_ENGINE)))
    args = parser.parse_args()
    engine = args.engine.expanduser().resolve()
    out_dir = asset_dir(engine, args.slug)
    raw_path = out_dir / "vo-raw.mp3"
    vo_path = out_dir / "vo.mp3"
    json_path = out_dir / "vo.json"

    if args.action == "fetch":
        if not args.url:
            raise SystemExit("fetch needs --url (the content_url of the finished ElevenLabs take)")
        out_dir.mkdir(parents=True, exist_ok=True)
        partial = out_dir / ".vo-raw.partial"
        request = urllib.request.Request(args.url, headers={"User-Agent": "kit-reel/1"})
        try:
            with urllib.request.urlopen(request, timeout=120) as response, partial.open("wb") as handle:
                shutil.copyfileobj(response, handle, length=1024 * 1024)
            probe_audio(partial)
            partial.replace(raw_path)
        finally:
            partial.unlink(missing_ok=True)
        print(f"fetched {raw_path} ({probe_audio(raw_path):.2f}s)")
        return

    if args.action == "stats":
        if not json_path.exists():
            raise SystemExit(f"missing {json_path}; run prepare first")
        data = json.loads(json_path.read_text(encoding="utf-8"))
        print(stats(data["words"], probe_audio(vo_path), decode(vo_path)))
        return

    source = (args.source or raw_path).expanduser().resolve()
    if not source.exists():
        raise SystemExit(f"voiceover source missing: {source} (run fetch first or pass --source)")
    if not 0.8 <= args.tempo <= 1.2:
        raise SystemExit("--tempo must be between 0.8 and 1.2")
    out_dir.mkdir(parents=True, exist_ok=True)

    samples = decode(source)
    if args.tempo != 1.0:
        tmp = out_dir / ".vo-tempo.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(source), "-af",
                        f"atempo={args.tempo}", "-ac", "1", "-ar", str(SR), str(tmp)], check=True)
        samples = decode(tmp)
        tmp.unlink(missing_ok=True)
    if args.sentence_pause > 0:
        first = out_dir / ".vo-pass1.mp3"
        encode(samples, first)
        timing = transcribe(first)
        first.unlink(missing_ok=True)
        samples, added = stretch_pauses(samples, timing["words"], args.sentence_pause)
        print(f"stretched sentence pauses to >= {args.sentence_pause:.2f}s (+{added:.2f}s)")
    encode(samples, vo_path)
    data = transcribe(vo_path)
    json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {vo_path} and {json_path}")
    print(stats(data["words"], probe_audio(vo_path), decode(vo_path)))


if __name__ == "__main__":
    main()
