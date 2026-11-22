#!/usr/bin/env python3
"""Measure your reference reels so the agent can write your style pack.

    python tools/analyze_reference.py            # every video in reference/
    python tools/analyze_reference.py --no-transcribe

For each video in reference/ it writes reference/_analysis/<name>/:
  contact.jpg   one frame per second, tiled (what the reel looks like)
  cuts.json     detected cut times + shot lengths
  words.json    Whisper word timings (unless --no-transcribe)
  stats.json    duration, cuts per minute, median shot, words per minute
and a reference/_analysis/summary.md table across all reels. The agent reads
these plus the contact sheets to fill in styles/<name>.md (see AGENTS.md).
Only analyse videos you have the right to keep and study.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import statistics
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VIDEO = {".mp4", ".mov", ".webm", ".m4v", ".mkv"}


def probe_duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True,
    )
    return float(out.stdout.strip() or 0)


def detect_cuts(path: Path, threshold: float) -> list[float]:
    out = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(path), "-vf", f"select='gt(scene,{threshold})',showinfo", "-an", "-f", "null", "-"],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    return [round(float(m), 3) for m in re.findall(r"pts_time:([0-9.]+)", out.stderr)]


def contact_sheet(path: Path, dest: Path, seconds: float) -> None:
    n = max(1, int(seconds))
    cols = 8
    rows = (n + cols - 1) // cols
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(path),
         "-vf", f"fps=1,scale=240:-2,tile={cols}x{rows}", "-frames:v", "1", "-q:v", "4", str(dest)],
        check=False,
    )


def transcribe(path: Path) -> list[dict]:
    import whisper  # openai-whisper

    model = whisper.load_model(os.environ.get("WHISPER_MODEL", "small"))
    result = model.transcribe(str(path), word_timestamps=True, fp16=False)
    return [
        {"word": w["word"].strip(), "start": round(w["start"], 3), "end": round(w["end"], 3)}
        for seg in result.get("segments", []) for w in seg.get("words", [])
    ]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dir", type=Path, default=ROOT / "reference")
    parser.add_argument("--threshold", type=float, default=0.3, help="scene-change sensitivity (lower = more cuts)")
    parser.add_argument("--no-transcribe", action="store_true")
    args = parser.parse_args()
    if not shutil.which("ffmpeg"):
        raise SystemExit("ffmpeg is required (see scripts/doctor.py)")
    videos = sorted(p for p in args.dir.iterdir() if p.suffix.lower() in VIDEO)
    if not videos:
        raise SystemExit(f"no videos in {args.dir} — add 5-10 reference reels first")
    out_root = args.dir / "_analysis"
    rows = []
    for video in videos:
        name = re.sub(r"[^a-z0-9]+", "-", video.stem.lower()).strip("-")[:48] or "reel"
        dest = out_root / name
        dest.mkdir(parents=True, exist_ok=True)
        seconds = probe_duration(video)
        cuts = detect_cuts(video, args.threshold)
        bounds = [0.0, *cuts, seconds]
        shots = [round(b - a, 3) for a, b in zip(bounds, bounds[1:]) if b - a > 0.05]
        contact_sheet(video, dest / "contact.jpg", seconds)
        stats = {
            "file": video.name,
            "duration_s": round(seconds, 2),
            "cuts": len(cuts),
            "cuts_per_min": round(len(cuts) / seconds * 60, 1) if seconds else 0,
            "median_shot_s": round(statistics.median(shots), 2) if shots else seconds,
            "longest_shot_s": round(max(shots), 2) if shots else seconds,
        }
        (dest / "cuts.json").write_text(json.dumps({"cuts": cuts, "shots": shots}, indent=2), encoding="utf-8")
        if not args.no_transcribe:
            words = transcribe(video)
            (dest / "words.json").write_text(json.dumps(words, indent=2, ensure_ascii=False), encoding="utf-8")
            spoken = (words[-1]["end"] - words[0]["start"]) if words else 0
            stats["words"] = len(words)
            stats["wpm"] = round(len(words) / spoken * 60) if spoken else 0
            stats["first_line"] = " ".join(w["word"] for w in words[:14])
        (dest / "stats.json").write_text(json.dumps(stats, indent=2, ensure_ascii=False), encoding="utf-8")
        rows.append(stats)
        print(f"{video.name}: {stats['duration_s']}s, {stats['cuts_per_min']} cuts/min, median shot {stats['median_shot_s']}s"
              + (f", {stats.get('wpm')} wpm" if "wpm" in stats else ""))

    lines = ["# Reference analysis", "", "| Reel | Length | Cuts/min | Median shot | WPM | Opening words |", "|---|---|---|---|---|---|"]
    for r in rows:
        lines.append(f"| {r['file']} | {r['duration_s']} s | {r['cuts_per_min']} | {r['median_shot_s']} s | {r.get('wpm', '')} | {r.get('first_line', '')} |")
    if rows:
        lines += ["", f"Averages: length {statistics.mean(r['duration_s'] for r in rows):.1f} s, "
                  f"{statistics.mean(r['cuts_per_min'] for r in rows):.1f} cuts/min, "
                  f"median shot {statistics.mean(r['median_shot_s'] for r in rows):.2f} s"
                  + (f", {statistics.mean(r['wpm'] for r in rows if r.get('wpm')):.0f} wpm" if any(r.get("wpm") for r in rows) else "")]
    (out_root / "summary.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\nwrote {out_root / 'summary.md'} and a contact sheet per reel")


if __name__ == "__main__":
    main()
