#!/usr/bin/env python3
"""Start a new reel job without overwriting existing work.

    python scripts/new_job.py <slug> --topic "..." [--target-seconds 40] [--cta follow|keyword --cta-keyword GUIDE]

Creates jobs/<slug>/ (brief.json, shot-plan.json, script.md) and
public/assets/<slug>/manifest.json. Defaults (accent, captions, music,
length, handle) come from config.json -> "defaults".
"""

from __future__ import annotations

import argparse
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_ENGINE = Path(__file__).resolve().parent.parent  # repo root


def slugify(value: str) -> str:
    value = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return value[:64]


def write_new(path: Path, content: str) -> None:
    if path.exists():
        raise SystemExit(f"refusing to overwrite existing file: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("slug", nargs="?")
    parser.add_argument("--topic", required=True)
    parser.add_argument("--details", default="")
    parser.add_argument("--target-seconds", type=int)
    parser.add_argument("--cta", choices=("follow", "keyword"), help="follow (default) or comment-keyword CTA")
    parser.add_argument("--cta-keyword", default="")
    parser.add_argument("--engine", type=Path, default=Path(os.environ.get("REEL_ENGINE", DEFAULT_ENGINE)))
    args = parser.parse_args()

    slug = slugify(args.slug or args.topic)
    if not slug:
        raise SystemExit("could not derive a safe slug")
    engine = args.engine.expanduser().resolve()
    if not (engine / "package.json").exists():
        raise SystemExit(f"reel engine not found: {engine}")

    config_path = engine / "config.json"
    config = json.loads(config_path.read_text(encoding="utf-8")) if config_path.exists() else {}
    defaults = config.get("defaults", {})
    target = args.target_seconds or int(defaults.get("targetSeconds", 40))
    if not 15 <= target <= 180:
        raise SystemExit("--target-seconds must be between 15 and 180")
    cta = args.cta or ("keyword" if args.cta_keyword else "follow")
    keyword = re.sub(r"[^A-Z0-9]", "", args.cta_keyword.upper())
    if cta == "keyword" and not keyword:
        raise SystemExit("--cta keyword needs --cta-keyword (e.g. GUIDE, PROMPT, REPO)")

    brief = {
        "slug": slug,
        "topic": args.topic,
        "details": args.details,
        "channel": config.get("channel", {}).get("handle", ""),
        "target_seconds": target,
        "cta_mode": cta,
        "cta_keyword": keyword if cta == "keyword" else "",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "initialized",
    }
    shot_plan = {
        "accent": defaults.get("accent", "blue"),
        "caption_style": defaults.get("captionStyle", "dynamic"),
        "auto_sfx": True,
        "music_gap_lu": 13,
        "emphasis": [],
        "caption_corrections": {},
        "shots": [],
    }
    if defaults.get("musicBed"):
        shot_plan["music_src"] = defaults["musicBed"]

    write_new(engine / f"jobs/{slug}/brief.json", json.dumps(brief, indent=2, ensure_ascii=False) + "\n")
    write_new(engine / f"jobs/{slug}/shot-plan.json", json.dumps(shot_plan, indent=2) + "\n")
    if cta == "keyword":
        write_new(engine / f"jobs/{slug}/giveaway.md", f"# {args.topic}\n\nResource promised for comment keyword **{keyword}**.\n")
    write_new(
        engine / f"public/assets/{slug}/manifest.json",
        json.dumps({"slug": slug, "items": []}, indent=2, ensure_ascii=False) + "\n",
    )
    write_new(
        engine / f"jobs/{slug}/script.md",
        (
            f"# {args.topic}\n\n"
            "## Final spoken script\n\n"
            "<the script, for approval before any voiceover credits are spent>\n\n"
            "## Beat map\n\n"
            "| # | VO phrase | Scene | Real media / visual |\n"
            "|---|---|---|---|\n\n"
            "## Fact ledger\n\n"
            "- [F1] claim — source title, date — URL\n"
        ),
    )
    print(f"initialized {slug} ({target}s, cta={cta})")
    print(f"job: {engine / f'jobs/{slug}/'}")
    print(f"assets: {engine / f'public/assets/{slug}/'}")


if __name__ == "__main__":
    main()
