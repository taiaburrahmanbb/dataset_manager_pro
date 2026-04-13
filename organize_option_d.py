#!/usr/bin/env python3
"""
Organize gen_ai_detector_dataset into Option E format
(Full Lifecycle: D + Models + Benchmarks + Monitoring)
and compress each dataset folder as .tar.lz4 archives.

Option E structure:
    data/
    ├── raw/                     (original archives — immutable, ONE copy)
    │   ├── fake/
    │   └── real/
    ├── processing/              (intermediate — resized/augmented, SHARED)
    │   ├── fake/
    │   └── real/
    ├── processed/               (final — ready to train, VERSIONED)
    │   └── v10/
    │       ├── fake/
    │       └── real/
    ├── models/                  (trained checkpoints & configs, VERSIONED)
    │   ├── v10/
    │   └── experimental/
    ├── benchmarks/              (curated test sets + evaluation results)
    │   ├── testset_v1/
    │   ├── adversarial/
    │   └── results/
    └── monitoring/              (production logs, drift, flagged samples)
        ├── predictions/
        ├── flagged/
        ├── drift/
        └── retraining_candidates/

Compression: tar + lz4   (tar cf - <dir> | lz4 > <name>.tar.lz4)
"""

import argparse
import json
import logging
import os
import subprocess
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

# ──────────────────────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────────────────────

SOURCE_ROOT = Path("/home/taiaburrahman/dataset_manager_pro/data/processed/gen_ai_detector_dataset")
DEST_ROOT = Path("/home/taiaburrahman/dataset_manager_pro/data/projects/GAID")

# Each entry: (source_path_relative_to_SOURCE_ROOT, dest_dir_relative_to_DEST_ROOT, archive_name)
# If source_path contains a wildcard marker "/*", each subfolder is archived separately.

ARCHIVE_PLAN: list[tuple[str, str, str | None]] = [
    # ─── raw/fake/ — PubDB collections ───────────────────────────────────
    ("PubDB_Fake/Shutterstock_Fake",           "raw/fake", "Shutterstock_Fake"),
    ("PubDB_Fake/ai_shoes",                    "raw/fake", "ai_shoes"),
    ("PubDB_Fake/dalle_rec_Fake",              "raw/fake", "dalle_rec_Fake"),
    ("PubDB_Fake/pixelpulse_1800",             "raw/fake", "pixelpulse_1800"),
    ("PubDB_Fake/tristanzhang32_Fake",         "raw/fake", "tristanzhang32_Fake"),

    # ─── raw/fake/ — other AI-generated collections ──────────────────────
    ("ai_image_x_collection_feb25_cleaned",    "raw/fake", "ai_image_x_collection_feb25_cleaned"),
    ("genAI",                                  "raw/fake", "genAI"),
    ("genAI_2",                                "raw/fake", "genAI_2"),
    ("genAI_3",                                "raw/fake", "genAI_3"),
    ("genAI_4",                                "raw/fake", "genAI_4"),
    ("genAI_5",                                "raw/fake", "genAI_5"),
    ("genAI_6",                                "raw/fake", "genAI_6"),

    # ─── raw/fake/ — Generated Data 2025 ─────────────────────────────────
    ("GenAI_Image_Database/Generated_Data_2025/Gen_samples_DALLE_2_300325",     "raw/fake", "Gen_samples_DALLE_2_300325"),
    ("GenAI_Image_Database/Generated_Data_2025/Gen_samples_DALLE_3_300325",     "raw/fake", "Gen_samples_DALLE_3_300325"),
    ("GenAI_Image_Database/Generated_Data_2025/Gen_samples_GPT_IMAGE_1_070525", "raw/fake", "Gen_samples_GPT_IMAGE_1_070525"),
    ("GenAI_Image_Database/Generated_Data_2025/Gen_samples_Gemini_100325",      "raw/fake", "Gen_samples_Gemini_100325"),
    ("GenAI_Image_Database/Generated_Data_2025/Gen_samples_Gemini_150325",      "raw/fake", "Gen_samples_Gemini_150325"),
    ("GenAI_Image_Database/Generated_Data_2025/Gen_samples_Gemini_190325",      "raw/fake", "Gen_samples_Gemini_190325"),
    ("GenAI_Image_Database/Generated_Data_2025/Gen_samples_Gemini_270325",      "raw/fake", "Gen_samples_Gemini_270325"),
    ("GenAI_Image_Database/Generated_Data_2025/Gen_samples_Gemini_280325",      "raw/fake", "Gen_samples_Gemini_280325"),
    ("GenAI_Image_Database/Generated_Data_2025/Gen_samples_Grok2_200325",       "raw/fake", "Gen_samples_Grok2_200325"),
    ("GenAI_Image_Database/Generated_Data_2025/Gen_samples_Grok3_160325",       "raw/fake", "Gen_samples_Grok3_160325"),
    ("GenAI_Image_Database/Generated_Data_2025/Gen_samples_Grok3_180325",       "raw/fake", "Gen_samples_Grok3_180325"),
    ("GenAI_Image_Database/Generated_Data_2025/Gen_samples_Grok3_220325",       "raw/fake", "Gen_samples_Grok3_220325"),

    # ─── raw/real/ — PubDB collections ───────────────────────────────────
    ("PubDB_Real/LandscapeRec12K",             "raw/real", "LandscapeRec12K"),
    ("PubDB_Real/Shutterstock_Real",           "raw/real", "Shutterstock_Real"),
    ("PubDB_Real/SupRes_aditya",               "raw/real", "SupRes_aditya"),
    ("PubDB_Real/birdclef",                    "raw/real", "birdclef"),
    ("PubDB_Real/dalle_rec_Real",              "raw/real", "dalle_rec_Real"),
    ("PubDB_Real/environmental_scenes",        "raw/real", "environmental_scenes"),
    ("PubDB_Real/image20",                     "raw/real", "image20"),
    ("PubDB_Real/mit_adobe_5k_Real",           "raw/real", "mit_adobe_5k_Real"),
    ("PubDB_Real/pht30k_Real",                 "raw/real", "pht30k_Real"),
    ("PubDB_Real/real_shoes",                  "raw/real", "real_shoes"),
    ("PubDB_Real/tristanzhang32_Real",         "raw/real", "tristanzhang32_Real"),
    ("PubDB_Real/ulid25k",                     "raw/real", "ulid25k"),

    # ─── raw/real/ — other authentic collections ─────────────────────────
    ("real_faces_multinational_130325",         "raw/real", "real_faces_multinational_130325"),
    ("human",                                  "raw/real", "human"),
    ("human_2",                                "raw/real", "human_2"),
    ("human_3",                                "raw/real", "human_3"),
    ("GenAI_Image_Database/Generated_Data_2025/selected_real_samples",           "raw/real", "selected_real_samples"),
    ("GenAI_Image_Database/Generated_Data_2025/selected_Real_Samples_phase_2",   "raw/real", "selected_Real_Samples_phase_2"),

    # ─── raw/testset/ ────────────────────────────────────────────────────
    ("testset/testset_1",                      "raw/testset", "testset_1"),
]


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class ArchiveResult:
    archive_name: str
    source_path: str
    dest_path: str
    source_size_mb: float = 0.0
    archive_size_mb: float = 0.0
    compression_ratio: float = 0.0
    elapsed_seconds: float = 0.0
    status: str = "pending"
    error: str = ""


def get_dir_size(path: Path) -> int:
    total = 0
    for entry in path.rglob("*"):
        if entry.is_file():
            total += entry.stat().st_size
    return total


def format_size(size_bytes: int) -> str:
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} PB"


def compress_tar_lz4(source_dir: Path, output_file: Path, lz4_level: int = 1) -> None:
    """Create a .tar.lz4 archive: tar cf - <dir> | lz4 -<level> > <output>"""
    parent = source_dir.parent
    name = source_dir.name

    tar_cmd = ["tar", "cf", "-", "-C", str(parent), name]
    lz4_cmd = ["lz4", f"-{lz4_level}", "-", str(output_file)]

    tar_proc = subprocess.Popen(tar_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    lz4_proc = subprocess.Popen(lz4_cmd, stdin=tar_proc.stdout, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    tar_proc.stdout.close()

    _, lz4_stderr = lz4_proc.communicate()
    tar_proc.wait()

    if tar_proc.returncode != 0:
        raise RuntimeError(f"tar failed (exit {tar_proc.returncode})")
    if lz4_proc.returncode != 0:
        raise RuntimeError(f"lz4 failed (exit {lz4_proc.returncode}): {lz4_stderr.decode().strip()}")


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def run(dry_run: bool = False, lz4_level: int = 1, skip_existing: bool = True):
    DEST_ROOT.mkdir(parents=True, exist_ok=True)
    log_file = DEST_ROOT / "organize_option_e.log"
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-8s  %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(log_file, mode="a"),
        ],
    )
    log = logging.getLogger("organize")

    log.info("=" * 72)
    log.info("Option E Organizer — tar + lz4 compression")
    log.info("=" * 72)
    log.info(f"Source root : {SOURCE_ROOT}")
    log.info(f"Dest root   : {DEST_ROOT}")
    log.info(f"LZ4 level   : {lz4_level}")
    log.info(f"Dry run     : {dry_run}")
    log.info(f"Skip exist  : {skip_existing}")
    log.info(f"Total jobs  : {len(ARCHIVE_PLAN)}")
    log.info("-" * 72)

    results: list[ArchiveResult] = []
    total_source = 0
    total_archive = 0
    skipped = 0
    failed = 0

    for idx, (src_rel, dest_rel, archive_name) in enumerate(ARCHIVE_PLAN, 1):
        source_path = SOURCE_ROOT / src_rel
        dest_dir = DEST_ROOT / dest_rel
        output_file = dest_dir / f"{archive_name}.tar.lz4"

        result = ArchiveResult(
            archive_name=archive_name,
            source_path=str(source_path),
            dest_path=str(output_file),
        )

        log.info(f"[{idx}/{len(ARCHIVE_PLAN)}] {archive_name}")
        log.info(f"  src  : {source_path}")
        log.info(f"  dest : {output_file}")

        if not source_path.exists():
            log.warning(f"  SKIP — source not found: {source_path}")
            result.status = "skipped_missing"
            results.append(result)
            skipped += 1
            continue

        if skip_existing and output_file.exists():
            existing_size = output_file.stat().st_size
            log.info(f"  SKIP — already exists ({format_size(existing_size)})")
            result.status = "skipped_exists"
            result.archive_size_mb = existing_size / (1024 * 1024)
            results.append(result)
            skipped += 1
            continue

        log.info("  Calculating source size...")
        src_size = get_dir_size(source_path)
        result.source_size_mb = src_size / (1024 * 1024)
        total_source += src_size
        log.info(f"  Source size: {format_size(src_size)}")

        if dry_run:
            log.info("  DRY RUN — skipping compression")
            result.status = "dry_run"
            results.append(result)
            continue

        dest_dir.mkdir(parents=True, exist_ok=True)

        try:
            t0 = time.time()
            compress_tar_lz4(source_path, output_file, lz4_level=lz4_level)
            elapsed = time.time() - t0

            archive_size = output_file.stat().st_size
            result.archive_size_mb = archive_size / (1024 * 1024)
            result.elapsed_seconds = elapsed
            result.compression_ratio = (archive_size / src_size * 100) if src_size > 0 else 0
            result.status = "success"
            total_archive += archive_size

            log.info(f"  Archive size: {format_size(archive_size)}  "
                     f"({result.compression_ratio:.1f}%)  "
                     f"in {elapsed:.1f}s")
        except Exception as e:
            result.status = "failed"
            result.error = str(e)
            failed += 1
            log.error(f"  FAILED: {e}")
            if output_file.exists():
                output_file.unlink()
                log.info("  Cleaned up partial archive")

        results.append(result)

    # ── Summary ───────────────────────────────────────────────────────────
    log.info("")
    log.info("=" * 72)
    log.info("SUMMARY")
    log.info("=" * 72)

    succeeded = sum(1 for r in results if r.status == "success")
    log.info(f"  Succeeded : {succeeded}")
    log.info(f"  Skipped   : {skipped}")
    log.info(f"  Failed    : {failed}")
    log.info(f"  Total src : {format_size(total_source)}")
    log.info(f"  Total arch: {format_size(total_archive)}")
    if total_source > 0:
        log.info(f"  Overall   : {total_archive / total_source * 100:.1f}% of original")

    if failed > 0:
        log.info("")
        log.info("FAILURES:")
        for r in results:
            if r.status == "failed":
                log.info(f"  - {r.archive_name}: {r.error}")

    report_path = DEST_ROOT / "organize_option_e_report.json"
    report = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "source_root": str(SOURCE_ROOT),
        "dest_root": str(DEST_ROOT),
        "lz4_level": lz4_level,
        "dry_run": dry_run,
        "summary": {
            "total_jobs": len(ARCHIVE_PLAN),
            "succeeded": succeeded,
            "skipped": skipped,
            "failed": failed,
            "total_source_mb": total_source / (1024 * 1024),
            "total_archive_mb": total_archive / (1024 * 1024),
        },
        "archives": [
            {
                "name": r.archive_name,
                "source": r.source_path,
                "dest": r.dest_path,
                "source_mb": round(r.source_size_mb, 2),
                "archive_mb": round(r.archive_size_mb, 2),
                "ratio_pct": round(r.compression_ratio, 1),
                "elapsed_s": round(r.elapsed_seconds, 1),
                "status": r.status,
                "error": r.error,
            }
            for r in results
        ],
    }
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    log.info(f"\nReport saved: {report_path}")
    log.info(f"Log saved:    {log_file}")

    # Print the final directory tree
    log.info("")
    log.info("Option E directory structure created:")
    tree_dirs = sorted({str(DEST_ROOT / entry[1]) for entry in ARCHIVE_PLAN})
    for d in tree_dirs:
        log.info(f"  {d}/")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Organize dataset into Option E format with lz4 compression",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Preview what will be done (no compression)
  python organize_option_d.py --dry-run

  # Run full compression with default lz4 level 1 (fastest)
  python organize_option_d.py

  # Higher compression (slower but smaller archives)
  python organize_option_d.py --lz4-level 9

  # Force re-compress existing archives
  python organize_option_d.py --no-skip-existing
        """,
    )
    parser.add_argument("--dry-run", action="store_true", help="Preview only, no compression")
    parser.add_argument("--lz4-level", type=int, default=1, choices=range(1, 13),
                        help="LZ4 compression level 1-12 (default: 1, fastest)")
    parser.add_argument("--no-skip-existing", action="store_true",
                        help="Re-compress even if archive already exists")

    args = parser.parse_args()
    sys.exit(run(
        dry_run=args.dry_run,
        lz4_level=args.lz4_level,
        skip_existing=not args.no_skip_existing,
    ))
