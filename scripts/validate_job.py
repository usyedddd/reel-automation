#!/usr/bin/env python3
"""Validate a reel job and its compiled beat sheet before rendering.

Hard errors: missing files, wrong canvas, unknown scene types, missing media,
scenes that don't add up to the voiceover, unsourced manifest items, a CTA
that breaks its own rule. Style checks (light share, screenshots, colours to
avoid) come from config.json -> "rules", which onboarding fills from your
style pack; without it they are skipped.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any

DEFAULT_ENGINE = Path(__file__).resolve().parent.parent  # repo root
MEDIA_KEYS = {"src", "bgSrc", "media", "face", "audio"}
KIT_SCENES = {
    "statement", "stage", "chart", "bars", "number", "footage",
    "browser", "logos", "story", "end", "follow",
}
OPENERS = {"footage", "statement", "stage", "number", "browser", "story"}
CLOSERS = {"follow", "end"}
HEX_RE = re.compile(r"#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b")


def iter_media(value: Any):
    if isinstance(value, dict):
        for key, child in value.items():
            if key in MEDIA_KEYS and isinstance(child, str):
                yield child
            if key == "logos" and isinstance(child, list):
                for logo in child:
                    if isinstance(logo, str):
                        yield logo
                    elif isinstance(logo, dict) and isinstance(logo.get("src"), str):
                        yield logo["src"]
                continue
            yield from iter_media(child)
    elif isinstance(value, list):
        for child in value:
            yield from iter_media(child)


def duration(path: Path) -> float | None:
    if not path.exists() or not shutil.which("ffprobe"):
        return None
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True,
        text=True,
    )
    try:
        return float(result.stdout.strip())
    except ValueError:
        return None


def hue_sat_light(hex_color: str) -> tuple[float, float, float]:
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    r, g, b = (int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))
    mx, mn = max(r, g, b), min(r, g, b)
    light = (mx + mn) / 2
    d = mx - mn
    if d == 0:
        return 0.0, 0.0, light
    sat = d / (1 - abs(2 * light - 1))
    if mx == r:
        hue = ((g - b) / d) % 6
    elif mx == g:
        hue = (b - r) / d + 2
    else:
        hue = (r - g) / d + 4
    return hue * 60, sat, light


def load_rules(engine: Path) -> dict[str, Any]:
    config = engine / "config.json"
    if not config.exists():
        return {}
    return json.loads(config.read_text(encoding="utf-8")).get("rules", {}) or {}


def validate(slug: str, engine: Path) -> None:
    public = engine / "public"
    errors: list[str] = []
    warnings: list[str] = []
    rules = load_rules(engine)
    brief = json.loads((engine / f"jobs/{slug}/brief.json").read_text(encoding="utf-8"))
    cta_mode = brief.get("cta_mode", "follow")
    required = {
        "script": engine / f"jobs/{slug}/script.md",
        "manifest": public / f"assets/{slug}/manifest.json",
        "beats": engine / f"src/beats/{slug}.json",
        "voiceover": public / f"assets/{slug}/vo.mp3",
    }
    if cta_mode == "keyword":
        required["giveaway"] = engine / f"jobs/{slug}/giveaway.md"
    for label, path in required.items():
        if not path.exists():
            errors.append(f"missing {label}: {path}")
    if errors:
        print("\n".join(f"ERROR: {e}" for e in errors))
        raise SystemExit(1)

    manifest = json.loads(required["manifest"].read_text(encoding="utf-8"))
    beats_text = required["beats"].read_text(encoding="utf-8")
    beats = json.loads(beats_text)

    if beats.get("id") != slug:
        errors.append(f"beat id must equal slug {slug!r}")
    for key, expected in (("fps", 30), ("width", 1080), ("height", 1920)):
        if beats.get(key) != expected:
            errors.append(f"{key} must be {expected}")
    if beats.get("captionStyle") not in ("single-word-top", "dynamic"):
        errors.append("captionStyle must be single-word-top or dynamic")
    if not re.fullmatch(r"#[0-9a-fA-F]{6}", str(beats.get("accent", ""))):
        errors.append(f"accent must be a #rrggbb colour (got {beats.get('accent')!r})")

    # Optional brand rule from config.json: hue ranges your brand never uses.
    for lo, hi in rules.get("avoid_hues", []):
        for colour in sorted(set(HEX_RE.findall(beats_text))):
            hue, sat, light = hue_sat_light(colour)
            if lo <= hue <= hi and sat >= 0.18 and light > 0.08:
                errors.append(f"colour {colour} is in a hue range your style avoids ({lo}-{hi} deg)")

    scenes = beats.get("scenes") or []
    if not scenes:
        errors.append("scenes must be a non-empty list")
    if not beats.get("captions"):
        errors.append("captions must be a non-empty list")

    max_scene = float(rules.get("max_scene_seconds", 5.0))
    total = 0.0
    for index, scene in enumerate(scenes):
        scene_type = scene.get("type", "")
        dur = scene.get("durationSec")
        if not isinstance(dur, (int, float)) or dur <= 0:
            errors.append(f"scene {index}: invalid durationSec")
            continue
        total += float(dur)
        if scene_type not in KIT_SCENES:
            errors.append(f"scene {index}: unknown scene type {scene_type!r}")
        if dur > max_scene:
            warnings.append(f"scene {index} ({scene_type}) is {dur:.2f}s; check it keeps changing")
        if scene_type == "stage" and len(scene.get("elements", [])) == 0:
            errors.append(f"scene {index}: stage has no elements")
    if scenes:
        if scenes[0].get("type") not in OPENERS:
            warnings.append("opening scene should be a hook (footage / statement / stage / number / browser / story)")
        if scenes[-1].get("type") not in CLOSERS:
            warnings.append("last scene should be follow or end")
        average = total / len(scenes)
        if average > 4.0:
            warnings.append(f"average scene duration {average:.2f}s exceeds 4.0s")
        follow = [s for s in scenes if s.get("type") == "follow"]
        if cta_mode == "keyword" and not any(s.get("mode") == "keyword" for s in follow):
            errors.append("keyword CTA job needs a follow scene with mode keyword")
        if cta_mode == "follow" and any(s.get("mode") == "keyword" for s in follow):
            errors.append("follow-only job must not show a keyword CTA (never both)")
        if "min_light_share" in rules and total:
            light = sum(
                float(s.get("durationSec", 0))
                for s in scenes
                if s.get("type") != "footage" and s.get("bg", "light") == "light"
            )
            if light / total < float(rules["min_light_share"]):
                warnings.append(f"only {light / total:.0%} light stage (style pack asks for {rules['min_light_share']:.0%})")
        if "min_screenshots" in rules:
            shots = sum(1 for s in scenes if s.get("type") == "browser")
            if shots < int(rules["min_screenshots"]):
                warnings.append(f"{shots} browser screenshots (style pack asks for {rules['min_screenshots']})")

    missing_media: set[str] = set()
    for media_path in iter_media(beats):
        if re.match(r"^https?://", media_path):
            continue
        if not (public / media_path).exists():
            missing_media.add(media_path)
    for cue_src in {c.get("src") for s in scenes for c in s.get("sfx", [])}:
        if cue_src and not (public / cue_src).exists():
            missing_media.add(cue_src)
    music_src = (beats.get("music") or {}).get("src")
    if music_src and not (public / music_src).exists():
        missing_media.add(music_src)
    for media_path in sorted(missing_media):
        errors.append(f"missing public asset: {media_path}")

    audio_duration = duration(public / f"assets/{slug}/vo.mp3")
    if audio_duration is not None and abs(audio_duration - total) > 0.20:
        errors.append(f"scene duration {total:.2f}s differs from voiceover {audio_duration:.2f}s by more than 0.20s")
    target = brief.get("target_seconds")
    if isinstance(target, (int, float)) and total and abs(total - target) > 25:
        warnings.append(f"reel is {total:.0f}s vs target {target}s")

    for index, item in enumerate(manifest.get("items", [])):
        if item.get("kind") not in {"coded-graphic", "generated-illustration"}:
            if not item.get("source_url"):
                errors.append(f"manifest item {index} lacks source_url")
            if not item.get("credit"):
                warnings.append(f"manifest item {index} lacks on-screen credit")

    script_text = required["script"].read_text(encoding="utf-8")
    if cta_mode == "keyword":
        keyword = str(brief.get("cta_keyword", ""))
        if not keyword or keyword.lower() not in script_text.lower():
            errors.append(f"CTA keyword {keyword!r} is missing from the final script")
        if required["giveaway"].stat().st_size < 80:
            errors.append("giveaway resource is still a placeholder")

    print(f"job: {slug}")
    print(f"scenes: {len(scenes)}, total: {total:.2f}s")
    for warning in warnings:
        print(f"WARNING: {warning}")
    for error in errors:
        print(f"ERROR: {error}")
    if errors:
        raise SystemExit(1)
    print("validation passed")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("slug")
    parser.add_argument("--engine", type=Path, default=Path(os.environ.get("REEL_ENGINE", DEFAULT_ENGINE)))
    args = parser.parse_args()
    if not re.fullmatch(r"[a-z0-9-]+", args.slug):
        raise SystemExit("slug must use lowercase letters, numbers, and hyphens")
    validate(args.slug, args.engine.expanduser().resolve())


if __name__ == "__main__":
    main()
