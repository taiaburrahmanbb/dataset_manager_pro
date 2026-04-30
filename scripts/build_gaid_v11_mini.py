#!/usr/bin/env python3
"""
Read a GAID comparison CSV (old image_path + labels), copy images from
source_data_path into v11_mini_save_path preserving subfolder structure,
and write a new CSV whose image_path column lists the real destination paths.

Source files are resolved by their basename (only the final filename component),
since the folder structure in the CSV differs from the current source tree.
The destination keeps the relative layout from the CSV's `filename` column
(e.g. Gen_samples_Grok3_160325/image_5114.jpg) so the mini-dataset mirrors the
original intent.
"""

from __future__ import annotations

import argparse
import csv
import os
import shutil
import sys
from pathlib import Path


def build_filename_index(root: Path) -> dict[str, list[Path]]:
    """Walk *root* and return {basename: [full_path, ...]}."""
    idx: dict[str, list[Path]] = {}
    for dirpath, _, filenames in os.walk(root):
        for fname in filenames:
            idx.setdefault(fname, []).append(Path(dirpath) / fname)
    return idx


def rel_key_from_row(image_path: str, filename_col: str) -> str:
    """Derive the relative destination path for one CSV row.

    Uses the `filename` CSV column when present (e.g.
    'Gen_samples_Grok3_160325/image_5114.jpg'), otherwise strips the
    well-known old prefix from `image_path`.
    """
    fn = (filename_col or "").strip().replace("\\", "/").lstrip("/")
    if fn:
        return fn

    ip = image_path.replace("\\", "/")
    lower = ip.lower()
    needle = "gen_samples/fake/"
    i = lower.find(needle)
    if i != -1:
        rest = ip[i + len(needle) :].lstrip("/")
        if rest:
            return rest

    raise ValueError(
        f"Cannot derive relative path (empty filename column and "
        f"no Gen_samples/fake/ in image_path): {image_path!r}"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input-csv",
        type=Path,
        default=Path(
            "/home/taiaburrahman/dataset_manager_pro/data/processed/GAID-v11/csv/"
            "03.compare_only_in_source.csv"
        ),
    )
    parser.add_argument(
        "--source-root",
        type=Path,
        default=Path(
            "/home/taiaburrahman/dataset_manager_pro/data/projects/GAID/"
            "02.processing/gen_ai_detector_dataset"
        ),
    )
    parser.add_argument(
        "--dest-root",
        type=Path,
        default=Path(
            "/home/taiaburrahman/dataset_manager_pro/data/processed/v11_mini"
        ),
    )
    parser.add_argument(
        "--output-csv",
        type=Path,
        default=None,
        help="Defaults to <dest-root>/manifest.csv",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print actions without copying or writing output CSV.",
    )
    args = parser.parse_args()

    input_csv: Path = args.input_csv
    source_root: Path = args.source_root.resolve()
    dest_root: Path = args.dest_root.resolve()
    output_csv: Path = (
        args.output_csv
        if args.output_csv is not None
        else (dest_root / "manifest.csv")
    )

    if not input_csv.is_file():
        print(f"Input CSV not found: {input_csv}", file=sys.stderr)
        return 1

    print(f"Building filename index under {source_root} …", flush=True)
    idx = build_filename_index(source_root)
    print(f"  Indexed {len(idx):,} unique filenames.", flush=True)

    dest_root.mkdir(parents=True, exist_ok=True)

    rows_out: list[dict[str, str]] = []
    n_ok = n_miss = n_dup = 0

    with input_csv.open(newline="", encoding="utf-8") as f_in:
        reader = csv.DictReader(f_in)
        if not reader.fieldnames or "image_path" not in reader.fieldnames:
            print("CSV must include at least the 'image_path' column.", file=sys.stderr)
            return 1

        for row in reader:
            old_img = (row.get("image_path") or "").strip()
            labels = row.get("labels", "")
            filename_col = (row.get("filename") or "").strip()

            try:
                rel_key = rel_key_from_row(old_img, filename_col)
            except ValueError as e:
                print(e, file=sys.stderr)
                return 1

            basename = Path(rel_key).name
            matches = idx.get(basename, [])

            if not matches:
                n_miss += 1
                print(f"MISSING: {basename} (rel: {rel_key})", file=sys.stderr)
                continue

            if len(matches) > 1:
                n_dup += 1
                print(
                    f"DUPLICATE ({len(matches)}): {basename} — using first match",
                    file=sys.stderr,
                )

            src = matches[0]
            dest_file = dest_root / rel_key

            if not args.dry_run:
                dest_file.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dest_file)

            n_ok += 1
            rows_out.append(
                {
                    "image_path": str(dest_file),
                    "labels": str(labels),
                    "directory": "",
                    "filename": rel_key.replace("\\", "/"),
                }
            )

    if not args.dry_run:
        output_csv.parent.mkdir(parents=True, exist_ok=True)
        with output_csv.open("w", newline="", encoding="utf-8") as f_out:
            w = csv.DictWriter(
                f_out,
                fieldnames=["image_path", "labels", "directory", "filename"],
            )
            w.writeheader()
            w.writerows(rows_out)

    action = "Would copy" if args.dry_run else "Copied"
    print(
        f"\n{action} {n_ok:,} file(s) → {dest_root}\n"
        f"  Missing source:  {n_miss:,}\n"
        f"  Duplicate names: {n_dup:,}\n"
        f"  Output CSV ({len(rows_out):,} rows): {output_csv}"
    )
    return 2 if (n_miss or n_dup) else 0


if __name__ == "__main__":
    raise SystemExit(main())
