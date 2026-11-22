#!/usr/bin/env python3
"""No-network, no-credit smoke test of the job pipeline: new_job -> compile ->
validate, on a synthetic voiceover (ffmpeg sine tones + hand-written timings).

    python scripts/smoke_test.py
"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent


def run(command: list[str], cwd: Path | None = None) -> None:
    subprocess.run(command, cwd=cwd, check=True)


def tone(path: Path, seconds: float, freq: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    run([
        "ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi", "-i",
        f"sine=frequency={freq}:sample_rate=48000:duration={seconds}", "-c:a", "libmp3lame", str(path),
    ])


def smoke() -> None:
    with tempfile.TemporaryDirectory(prefix="reel-smoke-") as temporary:
        engine = Path(temporary)
        (engine / "package.json").write_text('{"name":"reel-smoke"}\n', encoding="utf-8")
        (engine / "config.json").write_text(json.dumps({"rules": {"avoid_hues": [[15, 55]]}}), encoding="utf-8")
        run([sys.executable, str(SCRIPTS / "new_job.py"), "smoke", "--topic", "A synthetic test", "--target-seconds", "20", "--engine", str(engine)])
        asset_dir = engine / "public/assets/smoke"
        tone(engine / "public/music/bed.mp3", 8, 110)
        tone(engine / "public/sfx/whoosh-soft.mp3", 1, 880)
        tone(asset_dir / "vo.mp3", 6, 220)
        words = [
            {"start": 0.0, "end": 0.4, "word": "One"},
            {"start": 0.4, "end": 0.8, "word": "team"},
            {"start": 0.8, "end": 1.1, "word": "made"},
            {"start": 1.12, "end": 1.4, "word": "$30"},
            {"start": 1.42, "end": 1.8, "word": "million"},
            {"start": 1.8, "end": 2.5, "word": "online."},
            {"start": 3.0, "end": 3.4, "word": "Here's"},
            {"start": 3.4, "end": 3.8, "word": "who"},
            {"start": 3.8, "end": 4.3, "word": "gets"},
            {"start": 4.3, "end": 5.4, "word": "paid."},
        ]
        (asset_dir / "vo.json").write_text(json.dumps({"words": words}, indent=2), encoding="utf-8")
        plan_path = engine / "jobs/smoke/shot-plan.json"
        plan = json.loads(plan_path.read_text(encoding="utf-8"))
        plan["accent"] = "#8EC5FF"
        plan["music_src"] = "music/bed.mp3"
        plan["shots"] = [
            {"start_phrase": "one team", "scene": {"type": "number", "countTo": 30, "prefix": "$", "suffix": "M"}},
            {"start_phrase": "here's who", "scene": {"type": "stage", "bg": "light", "elements": [{"kind": "robot", "x": 540, "y": 960}]}},
            {"start_phrase": "gets paid", "scene": {"type": "follow", "handle": "@yourhandle"}},
        ]
        plan_path.write_text(json.dumps(plan, indent=2), encoding="utf-8")
        run([sys.executable, str(SCRIPTS / "compile_shot_plan.py"), "smoke", "--engine", str(engine)])
        run([sys.executable, str(SCRIPTS / "validate_job.py"), "smoke", "--engine", str(engine)])
        beats = json.loads((engine / "src/beats/smoke.json").read_text(encoding="utf-8"))
        assert beats["style"] == "kit"
        assert beats["captionStyle"] == "dynamic"
        assert beats["accent"] == "#8EC5FF"
        assert any(c["text"] == "$30 million" for c in beats["captions"]), beats["captions"]
        assert abs(sum(s["durationSec"] for s in beats["scenes"]) - 6) < 0.05
        assert beats["scenes"][1]["sfx"][0]["src"] == "sfx/whoosh-soft.mp3"
        assert beats["music"]["points"], beats.get("music")

        # optional brand rule from config.json: a colour in an avoided hue range fails
        beats["scenes"][0]["fg"] = "#E8845B"
        (engine / "src/beats/smoke.json").write_text(json.dumps(beats), encoding="utf-8")
        bad = subprocess.run(
            [sys.executable, str(SCRIPTS / "validate_job.py"), "smoke", "--engine", str(engine)],
            capture_output=True, text=True,
        )
        assert bad.returncode != 0 and "hue range" in bad.stdout, bad.stdout
        print("smoke test passed")


if __name__ == "__main__":
    smoke()
