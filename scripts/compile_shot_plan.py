#!/usr/bin/env python3
"""Compile a phrase-anchored shot plan into a Remotion beat sheet.

The voiceover is the master clock: each shot starts on a phrase as Whisper
heard it (assets/<slug>/vo.json) and runs until the next shot starts.
Inputs: jobs/<slug>/shot-plan.json + public/assets/<slug>/manifest.json.
Output: src/beats/<slug>.json (register it with scripts/register_beats.py).
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


def normalize(value: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", value.lower().replace("’", "'"))


def load_words(path: Path) -> list[dict[str, Any]]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(raw, dict) and isinstance(raw.get("words"), list):
        words = raw["words"]
    elif isinstance(raw, dict) and isinstance(raw.get("segments"), list):
        words = [
            word
            for segment in raw["segments"]
            for word in segment.get("words", [])
        ]
    else:
        raise SystemExit(f"unsupported Whisper JSON shape: {path}")

    out: list[dict[str, Any]] = []
    for index, word in enumerate(words):
        text = str(word.get("word", word.get("text", ""))).strip()
        if not text:
            continue
        try:
            start = float(word["start"])
            end = float(word["end"])
        except (KeyError, TypeError, ValueError):
            raise SystemExit(f"invalid word timing at index {index}: {word!r}")
        tokens = normalize(text)
        if not tokens:
            continue
        # Whisper occasionally returns ".8" or punctuation as a separate word.
        if text.startswith(".") and out and tokens[0].isdigit():
            out[-1]["text"] = f'{out[-1]["text"]}.{tokens[0]}'
            out[-1]["norm"] = normalize(out[-1]["text"])[-1]
            out[-1]["end"] = end
            continue
        for token_index, token in enumerate(tokens):
            out.append(
                {
                    "text": text if len(tokens) == 1 else token,
                    "norm": token,
                    "start": start,
                    "end": end,
                    "source_index": index,
                    "sub_index": token_index,
                }
            )
    if not out:
        raise SystemExit(f"no timed words found in {path}")
    return out


def find_phrase(
    words: list[dict[str, Any]], phrase: str, cursor: int, label: str
) -> tuple[int, int]:
    needle = normalize(phrase)
    if not needle:
        raise SystemExit(f"{label} cannot be empty")
    haystack = [word["norm"] for word in words]
    for start in range(cursor, len(haystack) - len(needle) + 1):
        if haystack[start : start + len(needle)] == needle:
            return start, start + len(needle) - 1
    preview = " ".join(haystack[cursor : cursor + 24])
    raise SystemExit(
        f"could not resolve {label} {phrase!r} after word {cursor}; "
        f"next transcript words: {preview!r}"
    )


def substitute(value: Any, tokens: dict[str, Any]) -> Any:
    if isinstance(value, dict):
        return {key: substitute(child, tokens) for key, child in value.items()}
    if isinstance(value, list):
        return [substitute(child, tokens) for child in value]
    if isinstance(value, str) and value in tokens:
        return tokens[value]
    return value


SCALE_WORDS = {
    "hundred", "thousand", "million", "billion", "trillion", "quadrillion",
    "percent", "x", "times", "k", "m", "b", "t",
}
NUMBER_RE = re.compile(r"^[$€£]?\d[\d,.]*[%xkmbtKMBT]?[.,!?;:]*$")


def raw_words(path: Path) -> list[dict[str, Any]]:
    """Whisper words exactly as spoken (no token splitting) for captions."""
    raw = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(raw, dict) and isinstance(raw.get("words"), list):
        words = raw["words"]
    else:
        words = [w for s in raw.get("segments", []) for w in s.get("words", [])]
    out = []
    for word in words:
        text = str(word.get("word", word.get("text", ""))).strip()
        if text:
            out.append({"text": text, "start": float(word["start"]), "end": float(word["end"])})
    return out


def single_word_captions(
    words: list[dict[str, Any]], corrections: dict[str, str]
) -> list[dict[str, Any]]:
    """One caption per spoken word; numbers stay grouped ("6 billion", "$15 trillion")."""
    out: list[dict[str, Any]] = []
    i = 0
    while i < len(words):
        word = dict(words[i])
        key = re.sub(r"[^a-z0-9]", "", word["text"].lower())
        if key in corrections:
            fixed = corrections[key]
            if fixed == "":
                # dropped token (Whisper split one name into two words): extend previous caption
                if out:
                    out[-1]["end"] = round(word["end"], 3)
                i += 1
                continue
            word["text"] = fixed
        # Whisper splits "$2,000" / "$5.2" into "$2" + ",000" / "$5" + ".2"
        while i + 1 < len(words) and re.match(r"^[.,]\d", words[i + 1]["text"]) and NUMBER_RE.match(word["text"].rstrip(".,")):
            word = {
                "text": word["text"].rstrip(".,") + words[i + 1]["text"],
                "start": word["start"],
                "end": words[i + 1]["end"],
            }
            i += 1
        if NUMBER_RE.match(word["text"]) and i + 1 < len(words):
            nxt = words[i + 1]
            nxt_key = re.sub(r"[^a-z]", "", nxt["text"].lower())
            if nxt["text"].startswith("%"):
                # Whisper often splits "938%" into "938" + "%"
                word = {"text": word["text"] + nxt["text"], "start": word["start"], "end": nxt["end"]}
                i += 1
            elif nxt_key in SCALE_WORDS and nxt["start"] - word["end"] < 0.35:
                word = {
                    "text": f'{word["text"].rstrip(".,!?;:")} {nxt["text"]}',
                    "start": word["start"],
                    "end": nxt["end"],
                }
                i += 1
        out.append(
            {
                "start": round(word["start"], 3),
                "end": round(word["end"], 3),
                "text": word["text"].strip(),
            }
        )
        i += 1
    return out


def audio_duration(path: Path) -> float | None:
    if not path.exists() or not shutil.which("ffprobe"):
        return None
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True,
        text=True,
        check=False,
    )
    try:
        return float(result.stdout.strip())
    except ValueError:
        return None


def measure_lufs(path: Path, start: float = 0.0, length: float | None = None) -> float | None:
    """Integrated loudness (LUFS) of an audio file / segment via ffmpeg loudnorm."""
    if not path.exists() or not shutil.which("ffmpeg"):
        return None
    cmd = ["ffmpeg", "-hide_banner", "-nostats"]
    if start:
        cmd += ["-ss", f"{start:.3f}"]
    if length:
        cmd += ["-t", f"{length:.3f}"]
    cmd += ["-i", str(path), "-vn", "-af", "loudnorm=print_format=json", "-f", "null", "-"]
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    err = result.stderr
    try:
        data = json.loads(err[err.rindex("{"): err.rindex("}") + 1])
        value = float(data["input_i"])
        return value if value > -70 else None
    except (ValueError, KeyError):
        return None


def resolve_shots(
    shots: list[dict[str, Any]], words: list[dict[str, Any]], audio_end: float
) -> list[dict[str, Any]]:
    resolved: list[dict[str, Any]] = []
    cursor = 0
    for index, shot in enumerate(shots):
        start_i, _ = find_phrase(
            words, str(shot.get("start_phrase", "")), cursor, f"shot {index} start_phrase"
        )
        end_i = start_i
        if shot.get("end_phrase"):
            _, end_i = find_phrase(
                words, str(shot["end_phrase"]), start_i, f"shot {index} end_phrase"
            )
        start = float(words[start_i]["start"]) + float(shot.get("start_offset", 0))
        end = float(words[end_i]["end"]) + float(shot.get("end_offset", 0))
        if index == 0:
            start = 0.0
        resolved.append({"start": max(0.0, start), "end": min(audio_end, end), **shot})
        cursor = max(start_i + 1, end_i)
    return resolved



# Every scene type the kit can render (src/types.ts).
KIT_SCENES = {
    "statement", "stage", "chart", "bars", "number", "footage",
    "browser", "logos", "story", "end", "follow",
}
# Accent presets (src/kit/tokens.ts); a shot plan may also give any "#rrggbb".
ACCENTS = {
    "silver": "#DADDE2", "blue": "#8EC5FF", "green": "#34D399",
    "violet": "#A78BFA", "pink": "#F472B6", "orange": "#FB923C",
}
WHOOSH = "sfx/whoosh-soft.mp3"


def resolve_accent(value: Any) -> str:
    text = str(value or "blue").strip()
    if re.fullmatch(r"#[0-9a-fA-F]{6}", text):
        return text.upper()
    if text.lower() in ACCENTS:
        return ACCENTS[text.lower()]
    raise SystemExit(f"accent must be #rrggbb or one of {sorted(ACCENTS)} (got {text!r})")


def compile_faceless(
    slug: str, engine: Path, plan: dict[str, Any], manifest: dict[str, Any]
) -> None:
    """Faceless reel: the voiceover is the master clock, no presenter."""
    public = engine / "public"
    audio_rel = f"assets/{slug}/vo.mp3"
    vo_json = public / f"assets/{slug}/vo.json"
    if not (public / audio_rel).exists():
        raise SystemExit(
            f"missing voiceover: {public / audio_rel} (run scripts/voiceover.py prepare {slug})"
        )
    if not vo_json.exists():
        raise SystemExit(f"missing word timings: {vo_json} (run scripts/voiceover.py prepare {slug})")
    words = load_words(vo_json)
    duration = audio_duration(public / audio_rel)
    audio_end = duration if duration is not None else float(words[-1]["end"]) + 0.6

    manifest_items = {
        str(item.get("id")): item for item in manifest.get("items", []) if item.get("id")
    }
    shots = plan.get("shots")
    if not isinstance(shots, list) or not shots:
        raise SystemExit("shot plan contains no shots")
    resolved = resolve_shots(shots, words, audio_end)

    # A soft whoosh on each cut, if the file exists in public/sfx/.
    auto_sfx = plan.get("auto_sfx", True) and (public / WHOOSH).exists()
    scenes: list[dict[str, Any]] = []
    for index, shot in enumerate(resolved):
        start = float(shot["start"])
        end = float(resolved[index + 1]["start"]) if index + 1 < len(resolved) else audio_end
        if end <= start:
            raise SystemExit(f"shot {index} has non-positive resolved duration")
        scene = substitute(shot.get("scene", {}), {"$START": round(start, 3)})
        if not isinstance(scene, dict) or scene.get("type") not in KIT_SCENES:
            raise SystemExit(f"shot {index}: scene type must be one of {sorted(KIT_SCENES)}")
        scene["durationSec"] = round(end - start, 3)
        asset_id = shot.get("asset_id")
        asset = manifest_items.get(str(asset_id)) if asset_id else None
        if asset_id and asset is None:
            raise SystemExit(f"shot {index} references unknown manifest asset {asset_id!r}")
        if asset:
            scene.setdefault("assetId", str(asset_id))
            scene.setdefault("claimId", str(shot.get("claim_id", asset_id)))
            if asset.get("source_url"):
                scene.setdefault("sourceUrl", asset["source_url"])
            if asset.get("credit") and scene["type"] == "footage":
                scene.setdefault("credit", asset["credit"])
        if auto_sfx and index > 0 and not any(
            float(c.get("at", 0)) < 0.15 for c in scene.get("sfx", [])
        ):
            scene.setdefault("sfx", []).insert(0, {"src": WHOOSH, "at": 0, "vol": 0.08})
        scenes.append(scene)

    corrections = {
        re.sub(r"[^a-z0-9]", "", str(key).lower()): str(value)
        for key, value in plan.get("caption_corrections", {}).items()
    }
    caption_style = str(plan.get("caption_style", "dynamic"))
    if caption_style not in ("single-word-top", "dynamic"):
        raise SystemExit(f"caption_style must be single-word-top or dynamic (got {caption_style!r})")

    # Music bed: measured and set a fixed loudness gap under the voice (default
    # 13 LU) so it never fights the narration. Optional: no music_src, no bed.
    music = plan.get("music")
    bed_src = plan.get("music_src")
    if music is None and bed_src:
        bed_src = str(bed_src)
        if not (public / bed_src).exists():
            raise SystemExit(f"music_src not found: {public / bed_src}")
        bed_from = float(plan.get("music_from", 0))
        gap_lu = float(plan.get("music_gap_lu", 13.0))
        if "music_volume" in plan and plan.get("music_volume_forced"):
            bed_vol = float(plan["music_volume"])
        else:
            vo_lufs = measure_lufs(public / audio_rel)
            bed_lufs = measure_lufs(public / bed_src, start=bed_from, length=audio_end)
            if vo_lufs is None or bed_lufs is None:
                bed_vol = 0.07
                print("WARNING: could not measure loudness; music volume defaulted to 0.07")
            else:
                bed_vol = round(10 ** (((vo_lufs - gap_lu) - bed_lufs) / 20), 4)
                print(f"music: VO {vo_lufs:.1f} LUFS, bed {bed_lufs:.1f} LUFS -> vol {bed_vol} ({gap_lu:.0f} LU under voice)")
        end_vol = round(bed_vol * float(plan.get("music_end_boost", 1.6)), 4)
        music = {
            "src": bed_src,
            "from": bed_from,
            "points": [
                {"t": 0, "vol": bed_vol},
                {"t": round(max(0, audio_end - 2.8), 3), "vol": bed_vol},
                {"t": round(max(0, audio_end - 1.6), 3), "vol": end_vol},
                {"t": round(max(0, audio_end - 0.4), 3), "vol": end_vol},
                {"t": round(audio_end, 3), "vol": 0.0},
            ],
        }
    beats: dict[str, Any] = {
        "id": slug,
        "fps": 30,
        "width": 1080,
        "height": 1920,
        "style": "kit",
        "accent": resolve_accent(plan.get("accent")),
        "audio": audio_rel,
        "captionStyle": caption_style,
        "emphasis": plan.get("emphasis", []),
        "scenes": scenes,
        "captions": single_word_captions(raw_words(vo_json), corrections),
    }
    if music:
        beats["music"] = music
    output = engine / f"src/beats/{slug}.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(beats, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"compiled {len(scenes)} shots, {audio_end:.3f}s: {output}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("slug")
    parser.add_argument(
        "--engine",
        type=Path,
        default=Path(os.environ.get("REEL_ENGINE", DEFAULT_ENGINE)),
    )
    args = parser.parse_args()
    slug = args.slug
    if not re.fullmatch(r"[a-z0-9-]+", slug):
        raise SystemExit("slug must use lowercase letters, numbers, and hyphens")
    engine = args.engine.expanduser().resolve()
    plan_path = engine / "jobs" / slug / "shot-plan.json"
    manifest_path = engine / "public" / f"assets/{slug}/manifest.json"
    for path in (plan_path, manifest_path):
        if not path.exists():
            raise SystemExit(f"missing required input: {path}")
    compile_faceless(
        slug,
        engine,
        json.loads(plan_path.read_text(encoding="utf-8")),
        json.loads(manifest_path.read_text(encoding="utf-8")),
    )


if __name__ == "__main__":
    main()
