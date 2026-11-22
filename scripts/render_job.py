#!/usr/bin/env python3
"""Validate, render (upload quality unless --draft), loudness-master, and frame-lint a reel."""

from __future__ import annotations

import argparse
import os
import shlex
import shutil
import subprocess
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
DEFAULT_ENGINE = Path(__file__).resolve().parent.parent  # repo root


def run(command: list[str], cwd: Path, dry_run: bool) -> None:
    print("+", " ".join(shlex.quote(part) for part in command))
    if not dry_run:
        # Resolve e.g. "npx" -> "npx.cmd" on Windows.
        command = [shutil.which(command[0]) or command[0], *command[1:]]
        subprocess.run(command, cwd=cwd, check=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("slug")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--skip-render", action="store_true")
    parser.add_argument(
        "--engine",
        type=Path,
        default=Path(os.environ.get("REEL_ENGINE", DEFAULT_ENGINE)),
    )
    parser.add_argument(
        "--tag",
        default="",
        help="variant name, e.g. 'dynamic' -> out/<slug>-dynamic-final.mp4 (keeps the other cut)",
    )
    parser.add_argument(
        "--draft",
        action="store_true",
        help="fast preview render (JPEG frames, CRF 18) - never post a draft",
    )
    args = parser.parse_args()
    engine = args.engine.expanduser().resolve()
    name = f"{args.slug}-{args.tag}" if args.tag else args.slug
    raw = engine / f"out/{name}-raw.mp4"
    final = engine / f"out/{name}-final.mp4"

    run(
        [
            sys.executable,
            str(SKILL / "scripts/register_beats.py"),
            "--engine",
            str(engine),
        ],
        engine,
        args.dry_run,
    )
    run(
        [
            sys.executable,
            str(SKILL / "scripts/validate_job.py"),
            args.slug,
            "--engine",
            str(engine),
        ],
        engine,
        args.dry_run,
    )
    run(["npx", "tsc", "--noEmit", "-p", "."], engine, args.dry_run)
    if not args.skip_render:
        raw.parent.mkdir(parents=True, exist_ok=True)
        # Upload quality. JPEG frames at a few Mbps in full-range BT.601
        # ("yuvj420p") look soft and washed out on phones once Instagram
        # re-encodes them. So: lossless PNG frames, CRF 12 with the slow x264
        # preset, standard yuv420p tagged BT.709. The platforms re-encode on
        # upload, so start from the cleanest possible source.
        quality = (
            ["--image-format=jpeg", "--crf=18"]
            if args.draft
            else [
                "--image-format=png",
                "--crf=12",
                "--x264-preset=slow",
                "--pixel-format=yuv420p",
                "--color-space=bt709",
            ]
        )
        run(
            [
                "npx",
                "remotion",
                "render",
                "src/index.ts",
                args.slug,
                str(raw),
                "--concurrency=2",
                "--timeout=120000",
                *quality,
            ],
            engine,
            args.dry_run,
        )
    elif not raw.exists() and not args.dry_run:
        raise SystemExit(f"--skip-render requested but raw render is missing: {raw}")

    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(raw),
            "-c:v",
            "copy",
            # tag primaries/transfer as BT.709 too (Remotion only sets the
            # matrix); metadata only, no re-encode
            "-bsf:v",
            "h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1",
            "-af",
            "loudnorm=I=-14:TP=-1.2:LRA=7",
            # loudnorm resamples internally; without -ar the file came out at
            # 96 kHz, which the apps resample again. 48 kHz is the video standard.
            "-ar",
            "48000",
            "-c:a",
            "aac",
            "-b:a",
            "320k",
            "-movflags",
            "+faststart",
            str(final),
        ],
        engine,
        args.dry_run,
    )
    run(
        [
            sys.executable,
            "tools/lint_frames.py",
            args.slug,
            "--video",
            str(final),
        ],
        engine,
        args.dry_run,
    )
    run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration:stream=codec_name,width,height,avg_frame_rate",
            "-of",
            "default=noprint_wrappers=1",
            str(final),
        ],
        engine,
        args.dry_run,
    )
    print(f"final: {final}")


if __name__ == "__main__":
    main()
