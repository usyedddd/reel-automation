#!/usr/bin/env python3
"""Check that everything the pipeline needs is installed.

    python scripts/doctor.py

Prints one line per requirement with OK / MISSING and how to fix it.
"""

from __future__ import annotations

import importlib.util
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def version(cmd: list[str]) -> str | None:
    exe = shutil.which(cmd[0])
    if not exe:
        return None
    try:
        out = subprocess.run([exe, *cmd[1:]], capture_output=True, text=True, timeout=30)
        return (out.stdout or out.stderr).strip().splitlines()[0]
    except Exception:  # noqa: BLE001
        return None


def main() -> None:
    checks: list[tuple[str, bool, str, str]] = []
    node = version(["node", "--version"])
    checks.append(("Node.js 18+", bool(node), node or "", "install from https://nodejs.org"))
    checks.append(("Python 3.10+", sys.version_info >= (3, 10), sys.version.split()[0], "install from https://python.org"))
    ff = version(["ffmpeg", "-version"])
    checks.append(("ffmpeg + ffprobe", bool(ff) and bool(shutil.which("ffprobe")), (ff or "")[:40], "install ffmpeg and put it on PATH"))
    checks.append(("openai-whisper", importlib.util.find_spec("whisper") is not None, "", "pip install -r requirements.txt"))
    checks.append(("numpy", importlib.util.find_spec("numpy") is not None, "", "pip install -r requirements.txt"))
    checks.append(("node_modules", (ROOT / "node_modules").exists(), "", "npm install"))
    pw = list((Path.home() / "AppData/Local/ms-playwright").glob("chromium*")) + list((Path.home() / ".cache/ms-playwright").glob("chromium*")) + list((Path.home() / "Library/Caches/ms-playwright").glob("chromium*"))
    checks.append(("Playwright Chromium", bool(pw), "", "npx playwright install chromium"))
    config = ROOT / "config.json"
    checks.append(("config.json", config.exists(), "", "run onboarding (AGENTS.md) or copy config.example.json"))
    if config.exists():
        cfg = json.loads(config.read_text(encoding="utf-8"))
        voice = cfg.get("voice", {}).get("voiceId", "")
        checks.append(("voice chosen", bool(voice) and "YOUR_" not in voice, voice, "pick an ElevenLabs voice during onboarding"))
    style_packs = [p for p in (ROOT / "styles").glob("*.md") if p.name not in {"README.md", "_template.md"}]
    checks.append(("style pack", bool(style_packs), ", ".join(p.name for p in style_packs), "onboarding writes styles/<name>.md from your reference reels"))
    music = [p for p in (ROOT / "public/music").glob("*") if p.suffix in {".mp3", ".wav"}]
    checks.append(("music library", bool(music), f"{len(music)} tracks", "add royalty-free tracks to public/music (optional)"))
    sfx = ROOT / "public/sfx/whoosh-soft.mp3"
    checks.append(("transition whoosh", sfx.exists(), "", "add public/sfx/whoosh-soft.mp3 (optional)"))

    width = max(len(c[0]) for c in checks)
    bad = 0
    for name, ok, detail, fix in checks:
        mark = "OK     " if ok else "MISSING"
        bad += not ok
        print(f"{mark}  {name.ljust(width)}  {detail if ok else '-> ' + fix}")
    print("\nall set" if not bad else f"\n{bad} item(s) to sort out")


if __name__ == "__main__":
    main()
