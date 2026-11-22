#!/usr/bin/env python3
"""Copy a finished reel into reels/NN-<slug>/ — the one folder of postable reels.

    python scripts/publish_reel.py <slug> [--video out/...mp4] [--tiktok out/...mp4]
                                          [--cover out/...png] [--title "..."]

Defaults: video out/<slug>-final.mp4, TikTok/YT version
out/<slug>-final-tiktok-yt.mp4 and cover out/<slug>-cover.png when they exist,
captions jobs/<slug>/captions.md. Re-running replaces the files in place and
keeps the reel's number. reels/README.md is rebuilt as the index each time.
out/ stays the build folder (raw renders, lint sheets, old versions).
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
from pathlib import Path

ENGINE = Path(__file__).resolve().parent.parent
REELS = ENGINE / "reels"


def probe(path: Path) -> dict[str, str]:
    result = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration,bit_rate:stream=codec_type,pix_fmt,color_space,sample_rate",
            "-of", "default=noprint_wrappers=1", str(path),
        ],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    out: dict[str, str] = {}
    for line in result.stdout.splitlines():
        key, _, value = line.partition("=")
        if value and value != "unknown" and key not in out:
            out[key] = value
    return out


def folder_for(slug: str) -> Path:
    REELS.mkdir(exist_ok=True)
    for existing in REELS.iterdir():
        if existing.is_dir() and re.fullmatch(rf"\d+-{re.escape(slug)}", existing.name):
            return existing
    numbers = [int(p.name.split("-", 1)[0]) for p in REELS.iterdir() if p.is_dir() and p.name[:2].isdigit()]
    return REELS / f"{max(numbers, default=0) + 1:02d}-{slug}"


def title_for(slug: str, folder: Path) -> str:
    meta = folder / "reel.json"
    if meta.exists():
        return json.loads(meta.read_text(encoding="utf-8")).get("title", slug)
    brief = ENGINE / f"jobs/{slug}/brief.json"
    if brief.exists():
        return json.loads(brief.read_text(encoding="utf-8")).get("topic", slug)
    return slug


def copy(src: Path, dst: Path) -> None:
    if not src.exists():
        raise SystemExit(f"missing: {src}")
    shutil.copy2(src, dst)
    print(f"  {dst.relative_to(ENGINE)}  ({dst.stat().st_size / 1e6:.1f} MB)")


def write_index() -> None:
    rows = []
    for folder in sorted(p for p in REELS.iterdir() if p.is_dir()):
        meta_path = folder / "reel.json"
        meta = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}
        files = ", ".join(f"`{f.name}`" for f in sorted(folder.iterdir()) if f.name != "reel.json")
        rows.append(f"| {folder.name[:2]} | {meta.get('title', folder.name)} | {meta.get('length', '')} | {files} |")
    (REELS / "README.md").write_text(
        "# Finished reels\n\n"
        "One folder per reel, ready to post. Upload these files, not the ones in `out/`\n"
        "(that's the build folder). Captions for Instagram, TikTok and YouTube are in\n"
        "each folder's `captions.md`. Added with `python scripts/publish_reel.py <slug>`.\n\n"
        "Getting a file to your phone without losing quality: download the file itself\n"
        "(Drive / MediaFire \"Download\", Quick Share, AirDrop, USB). Never send it\n"
        "through WhatsApp, Telegram or DMs as a video — they recompress it.\n\n"
        "| # | Reel | Length | Files |\n|---|---|---|---|\n" + "\n".join(rows) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("slug")
    parser.add_argument("--video", type=Path)
    parser.add_argument("--tiktok", type=Path, help="TikTok/YT Shorts cut (e.g. opens on the cover)")
    parser.add_argument("--cover", type=Path)
    parser.add_argument("--title")
    args = parser.parse_args()
    slug = args.slug
    out = ENGINE / "out"

    video = (args.video or out / f"{slug}-final.mp4").resolve()
    tiktok = (args.tiktok or out / f"{slug}-final-tiktok-yt.mp4").resolve()
    cover = (args.cover or out / f"{slug}-cover.png").resolve()
    captions = ENGINE / f"jobs/{slug}/captions.md"

    folder = folder_for(slug)
    folder.mkdir(parents=True, exist_ok=True)
    num = folder.name[:2]
    title = args.title or title_for(slug, folder)
    print(f"publishing {slug} -> {folder.relative_to(ENGINE)}")

    info = probe(video)
    has_tiktok = tiktok.exists()
    copy(video, folder / f"{num}-{slug}{'-instagram' if has_tiktok else ''}.mp4")
    if has_tiktok:
        copy(tiktok, folder / f"{num}-{slug}-tiktok-yt.mp4")
    if cover.exists():
        copy(cover, folder / f"{num}-{slug}-cover{cover.suffix}")
    if captions.exists():
        copy(captions, folder / "captions.md")
    else:
        print(f"  (no captions yet: {captions.relative_to(ENGINE)})")

    seconds = float(info.get("duration", 0) or 0)
    source = video.relative_to(ENGINE) if video.is_relative_to(ENGINE) else video
    meta = {"slug": slug, "title": title, "length": f"{seconds:.1f} s", "source": source.as_posix()}
    (folder / "reel.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    write_index()

    # upload-quality check (see render_job.py): yuv420p + bt709 + 48 kHz
    issues = []
    if info.get("pix_fmt") != "yuv420p":
        issues.append(f"pixel format {info.get('pix_fmt')} (want yuv420p)")
    if info.get("color_space") != "bt709":
        issues.append(f"colour space {info.get('color_space')} (want bt709)")
    if info.get("sample_rate") != "48000":
        issues.append(f"audio {info.get('sample_rate')} Hz (want 48000)")
    if issues:
        print("WARNING: not an upload-quality render — re-render with render_job.py (no --draft): " + "; ".join(issues))
    else:
        print(f"upload quality OK ({int(info.get('bit_rate', 0)) / 1e6:.1f} Mbps, yuv420p, bt709, 48 kHz)")


if __name__ == "__main__":
    main()
