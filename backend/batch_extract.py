#!/usr/bin/env python3
"""
Standalone batch extract script — runs independently of the notebook.

Usage:
    # Basic (uses defaults in the CONFIG section below):
    python3 backend/batch_extract.py

    # With nohup (keeps running after disconnect):
    nohup python3 backend/batch_extract.py > extract.log 2>&1 &

    # With screen/tmux:
    screen -S extract python3 backend/batch_extract.py

Edit the CONFIG section below before running.
"""

import os
import sys
import json
import gzip
import bz2
import lzma
import shutil
import subprocess
import tarfile
import time
import zipfile
from datetime import datetime
from pathlib import Path

from tqdm import tqdm

# ── Optional backends ──────────────────────────────────────────────────────
_lz4_ok = _zstd_ok = _7z_ok = _7z_cli_ok = False
try:
    import lz4.frame as lz4frame
    _lz4_ok = True
except ImportError:
    pass
try:
    import zstandard as zstd
    _zstd_ok = True
except ImportError:
    pass
try:
    import py7zr
    _7z_ok = True
except ImportError:
    pass
_7z_cli_ok = shutil.which("7z") is not None


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  CONFIG — edit these before running                                     ║
# ╚══════════════════════════════════════════════════════════════════════════╝

SOURCE_FOLDER  = "/home/taiaburrahman/dataset_manager_pro/data/wasabi/gen_ai_detector_dataset"
EXTRACT_TO     = "/home/taiaburrahman/dataset_manager_pro/data/processed/gen_ai_detector_dataset"
SAME_STRUCTURE = True
OVERWRITE      = True
SAVE_REPORT    = True

ARCHIVE_EXTS = {".lz4", ".zst", ".gz", ".bz2", ".xz", ".zip", ".7z", ".tar"}


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS (same as notebook)
# ══════════════════════════════════════════════════════════════════════════════

def _human_size(n: int) -> str:
    for u in ("B", "KB", "MB", "GB", "TB"):
        if n < 1024:
            return f"{n:.1f} {u}"
        n /= 1024
    return f"{n:.1f} PB"


def _box(lines: list[str], width: int = 70) -> str:
    sep = "─" * (width - 2)
    def row(s):
        return f"║  {s:<{width-4}}║"
    out = [f"╔{sep}╗"]
    for l in lines:
        out.append(f"╠{sep}╣" if l == "---" else row(l))
    out.append(f"╚{sep}╝")
    return "\n".join(out)


def _archive_type(path: Path) -> str:
    name = path.name.lower()
    for ext in (".tar.lz4", ".tar.zst", ".tar.gz", ".tar.bz2",
                ".tar.xz", ".tar.lzma", ".tgz", ".tbz2",
                ".zip", ".7z", ".rar",
                ".gz", ".bz2", ".xz", ".lzma", ".lz4", ".zst", ".tar"):
        if name.endswith(ext):
            return ext.lstrip(".")
    return "unknown"


def _is_archive(p: Path) -> bool:
    name = p.name.lower()
    for ext in ARCHIVE_EXTS:
        if name.endswith(ext):
            return True
    return False


def _fmt_time(sec):
    if sec < 60:
        return f"{sec:.0f}s"
    m, s = divmod(int(sec), 60)
    if m < 60:
        return f"{m}m{s:02d}s"
    h, m = divmod(m, 60)
    return f"{h}h{m:02d}m"


# ── Extraction functions ───────────────────────────────────────────────────

def _extract_tar_lz4(src: Path, dest: Path):
    if not _lz4_ok:
        raise RuntimeError("lz4 not installed. Run: pip install lz4")
    file_size = src.stat().st_size
    dest.mkdir(parents=True, exist_ok=True)
    print(f"  Decompressing (LZ4) and extracting …")
    with open(src, "rb") as raw, lz4frame.open(raw, mode="rb") as lz4_stream:
        with tqdm(total=file_size, unit="B", unit_scale=True,
                  unit_divisor=1024, desc="  Reading") as bar:
            class _TrackedStream:
                def read(self, n=-1):
                    chunk = lz4_stream.read(n)
                    bar.update(raw.tell() - bar.n)
                    return chunk
                def readinto(self, b):
                    n = lz4_stream.readinto(b)
                    bar.update(raw.tell() - bar.n)
                    return n
                readable = lambda s: True
                writable = lambda s: False
                seekable = lambda s: False
                tell     = lambda s: lz4_stream.tell()
            with tarfile.open(fileobj=_TrackedStream(), mode="r|") as tf:
                tf.extractall(path=dest)


def _extract_tar_zst(src: Path, dest: Path):
    if not _zstd_ok:
        raise RuntimeError("zstandard not installed. Run: pip install zstandard")
    file_size = src.stat().st_size
    dest.mkdir(parents=True, exist_ok=True)
    dctx = zstd.ZstdDecompressor()
    with open(src, "rb") as fh:
        with tqdm(total=file_size, unit="B", unit_scale=True,
                  unit_divisor=1024, desc="  Reading") as bar:
            stream = dctx.stream_reader(fh)
            with tarfile.open(fileobj=stream, mode="r|") as tf:
                for member in tf:
                    tf.extract(member, path=dest)
                    bar.update(fh.tell() - bar.n)


def _7z_archive_info(src: Path) -> dict:
    info = {"files": 0, "uncompressed": 0, "volumes": 1}
    try:
        out = subprocess.run(
            ["7z", "l", str(src)], capture_output=True, text=True, timeout=30,
        )
        for line in out.stdout.splitlines():
            if "files" in line and line.strip()[0].isdigit():
                parts = line.split()
                if len(parts) >= 3:
                    try:
                        info["uncompressed"] = int(parts[0])
                    except ValueError:
                        pass
                    for p in parts:
                        if p.isdigit():
                            info["files"] = int(p)
            if "Volumes:" in line:
                try:
                    info["volumes"] = int(line.split(":")[-1].strip())
                except ValueError:
                    pass
    except Exception:
        pass
    return info


def _extract_zip_7z_cli(src: Path, dest: Path):
    if not _7z_cli_ok and not shutil.which("7z"):
        raise RuntimeError("7z CLI not found. Install with: sudo apt-get install p7zip-full")
    dest.mkdir(parents=True, exist_ok=True)

    info = _7z_archive_info(src)
    vol_str = f" ({info['volumes']} volumes)" if info["volumes"] > 1 else ""
    total_files = info["files"]
    total_size  = info["uncompressed"]
    if total_size:
        print(f"  ↳ Multi-disk zip{vol_str} — {_human_size(total_size)} "
              f"uncompressed, {total_files:,} files")
    else:
        print(f"  ↳ Multi-disk zip detected{vol_str}")
    print(f"  ↳ Using 7z CLI …")

    cmd = ["7z", "x", str(src), f"-o{dest}", "-y", "-bsp1", "-bb0"]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    buf = b""
    files_seen = 0
    last_pct_num = 0
    t0 = time.time()

    while True:
        chunk = proc.stdout.read(1)
        if not chunk:
            break
        if chunk in (b"\r", b"\n"):
            line = buf.decode("utf-8", errors="replace").strip()
            buf = b""
            if not line:
                continue
            if line and line[0].isdigit() and "%" in line[:5]:
                try:
                    pct_num = int(line.split("%")[0].strip())
                except ValueError:
                    continue
                if pct_num != last_pct_num and pct_num > 0:
                    last_pct_num = pct_num
                    elapsed = time.time() - t0
                    eta = (elapsed / pct_num) * (100 - pct_num) if pct_num > 0 else 0
                    # Build progress bar
                    bar_len = 30
                    filled  = int(bar_len * pct_num / 100)
                    bar_str = "█" * filled + "░" * (bar_len - filled)
                    status  = (f"\r  7z: {pct_num:>3}% |{bar_str}| "
                               f"elapsed {_fmt_time(elapsed)}  "
                               f"ETA {_fmt_time(eta)}  "
                               f"({files_seen:,} files)")
                    print(status, end="", flush=True)
            elif line.startswith("- "):
                files_seen += 1
            elif ("Everything is Ok" in line or "Extracting archive" in line
                  or "Scanning" in line):
                print(f"\n  {line}")
        else:
            buf += chunk
    proc.wait()
    elapsed = round(time.time() - t0, 1)
    if last_pct_num:
        print()
    print(f"  7z done — {files_seen:,} files in {_fmt_time(elapsed)}")
    if proc.returncode != 0:
        raise RuntimeError(f"7z exited with code {proc.returncode} for {src.name}")


def _extract_zip(src: Path, dest: Path):
    dest.mkdir(parents=True, exist_ok=True)
    try:
        with zipfile.ZipFile(src) as zf:
            members = zf.infolist()
            total = sum(m.file_size for m in members)
            with tqdm(total=total, unit="B", unit_scale=True,
                      unit_divisor=1024, desc="  Extracting") as bar:
                for member in members:
                    zf.extract(member, path=dest)
                    bar.update(member.file_size)
    except zipfile.BadZipFile as e:
        if "span multiple disks" in str(e):
            _extract_zip_7z_cli(src, dest)
        else:
            raise


def _extract_7z(src: Path, dest: Path):
    if not _7z_ok:
        raise RuntimeError("py7zr not installed. Run: pip install py7zr")
    dest.mkdir(parents=True, exist_ok=True)
    with py7zr.SevenZipFile(src, mode="r") as archive:
        file_list = archive.getnames()
        print(f"  Extracting {len(file_list)} items …")
        archive.extractall(path=dest)


def _extract_single(src: Path, dest_file: Path, open_fn):
    file_size = src.stat().st_size
    dest_file.parent.mkdir(parents=True, exist_ok=True)
    with open_fn(src, "rb") as f_in, open(dest_file, "wb") as f_out:
        with tqdm(total=file_size, unit="B", unit_scale=True,
                  unit_divisor=1024, desc="  Decompressing") as bar:
            while chunk := f_in.read(1 << 20):
                f_out.write(chunk)
                bar.update(len(chunk))


def extract(source_path, extract_to, overwrite=False):
    src = Path(source_path)
    dest = Path(extract_to)

    if not src.exists():
        raise FileNotFoundError(f"Archive not found: {src}")

    atype = _archive_type(src)
    if atype == "unknown":
        raise ValueError(f"Unsupported archive type: {src.name}")

    if dest.exists() and not overwrite:
        print(f"  ⏭ Skipped (exists): {dest}")
        return None

    t0 = time.time()
    print(f"  Archive  : {src.name}  ({_human_size(src.stat().st_size)})")
    print(f"  Format   : {atype}")
    print(f"  Dest     : {dest}")

    if atype == "tar.lz4":
        _extract_tar_lz4(src, dest)
    elif atype == "tar.zst":
        _extract_tar_zst(src, dest)
    elif atype in ("tar.gz", "tgz", "tar.bz2", "tbz2", "tar.xz", "tar.lzma", "tar"):
        dest.mkdir(parents=True, exist_ok=True)
        with tarfile.open(src) as tf:
            members = tf.getmembers()
            with tqdm(total=len(members), unit="file", desc="  Extracting") as bar:
                for m in members:
                    tf.extract(m, path=dest)
                    bar.update(1)
    elif atype == "zip":
        _extract_zip(src, dest)
    elif atype == "7z":
        _extract_7z(src, dest)
    elif atype == "gz":
        _extract_single(src, dest / src.stem, gzip.open)
    elif atype == "bz2":
        _extract_single(src, dest / src.stem, bz2.open)
    elif atype in ("xz", "lzma"):
        _extract_single(src, dest / src.stem, lzma.open)
    elif atype == "lz4":
        if not _lz4_ok:
            raise RuntimeError("pip install lz4")
        _extract_single(src, dest / src.stem, lz4frame.open)
    elif atype == "zst":
        if not _zstd_ok:
            raise RuntimeError("pip install zstandard")
        dctx = zstd.ZstdDecompressor()
        _extract_single(src, dest / src.stem,
                        lambda p, m: dctx.stream_reader(open(p, "rb")))

    elapsed = time.time() - t0
    print(f"  Done in {_fmt_time(elapsed)}")
    return dest


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    root = Path(SOURCE_FOLDER)
    archives = sorted([f for f in root.rglob("*") if f.is_file() and _is_archive(f)])

    archive_sizes = [a.stat().st_size for a in archives]
    total_size = sum(archive_sizes)

    print(f"{'═'*80}")
    print(f"  BATCH EXTRACT")
    print(f"{'═'*80}")
    print(f"  Source   : {root}")
    print(f"  Dest     : {EXTRACT_TO or '(beside each archive)'}")
    print(f"  Archives : {len(archives)}  ({_human_size(total_size)})")
    print(f"  Overwrite: {OVERWRITE}")
    print(f"  Started  : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'═'*80}\n")

    print(f"{'#':>3}  {'Archive':<50}  {'Size':>10}")
    print(f"{'─'*70}")
    for i, a in enumerate(archives, 1):
        print(f"{i:>3}  {str(a.relative_to(root)):<50}  {_human_size(a.stat().st_size):>10}")
    print(f"{'─'*70}\n")

    # ── Process ────────────────────────────────────────────────────────────
    results_log = []
    t_start_all = time.time()
    bytes_done = 0

    for idx, archive in enumerate(archives, 1):
        arc_size = archive_sizes[idx - 1]

        # Size-weighted progress display
        pct = (bytes_done / total_size * 100) if total_size else 0
        elapsed_all = time.time() - t_start_all
        if bytes_done > 0 and total_size > 0:
            eta = elapsed_all * (total_size - bytes_done) / bytes_done
        else:
            eta = 0
        bar_len = 30
        filled  = int(bar_len * pct / 100)
        bar_str = "█" * filled + "░" * (bar_len - filled)
        print(f"\n{'─'*80}")
        print(f"  Progress: {pct:5.1f}% |{bar_str}| "
              f"{idx}/{len(archives)} files  "
              f"({_human_size(bytes_done)}/{_human_size(total_size)})  "
              f"elapsed {_fmt_time(elapsed_all)}  ETA {_fmt_time(eta)}")
        print(f"{'─'*80}")
        print(f"  [{idx}/{len(archives)}] {archive.relative_to(root)}  ({_human_size(arc_size)})")

        if EXTRACT_TO is None:
            out_dir = archive.parent
        elif SAME_STRUCTURE:
            rel = archive.parent.relative_to(root)
            out_dir = Path(EXTRACT_TO) / rel
        else:
            out_dir = Path(EXTRACT_TO)

        entry = {
            "index":          idx,
            "archive":        str(archive.relative_to(root)),
            "archive_name":   archive.name,
            "archive_size":   arc_size,
            "extract_to":     str(out_dir),
            "status":         "",
            "elapsed_sec":    0,
            "files_extracted": 0,
            "extracted_size":  0,
            "error":          "",
        }

        t0 = time.time()
        try:
            result = extract(archive, out_dir, overwrite=OVERWRITE)
            entry["elapsed_sec"] = round(time.time() - t0, 1)
            if result is None:
                entry["status"] = "skipped"
            else:
                entry["status"] = "done"
                if result.is_dir():
                    entry["files_extracted"] = sum(1 for f in result.rglob("*") if f.is_file())
                    entry["extracted_size"] = sum(f.stat().st_size for f in result.rglob("*") if f.is_file())
        except Exception as e:
            entry["elapsed_sec"] = round(time.time() - t0, 1)
            entry["status"] = "failed"
            entry["error"] = str(e)
            print(f"  ✗ FAILED: {e}")

        bytes_done += arc_size
        results_log.append(entry)

        sym = {"done": "✓", "skipped": "⏭", "failed": "✗"}.get(entry["status"], "?")
        print(f"  {sym} {entry['status']}  |  "
              f"{_human_size(entry['archive_size'])} → "
              f"{entry['files_extracted']:,} files  |  "
              f"{_fmt_time(entry['elapsed_sec'])}")

    total_elapsed = round(time.time() - t_start_all, 1)

    # Final 100% progress line
    print(f"\n{'─'*80}")
    print(f"  Progress: 100.0% |{'█'*30}| "
          f"{len(archives)}/{len(archives)} files  "
          f"({_human_size(total_size)}/{_human_size(total_size)})  "
          f"elapsed {_fmt_time(total_elapsed)}  DONE")
    print(f"{'─'*80}")

    # ── Count stats ────────────────────────────────────────────────────────
    n_done    = sum(1 for r in results_log if r["status"] == "done")
    n_skipped = sum(1 for r in results_log if r["status"] == "skipped")
    n_failed  = sum(1 for r in results_log if r["status"] == "failed")

    # ── Final table ────────────────────────────────────────────────────────
    print(f"\n{'═'*100}")
    print(f" {'#':>3}  {'St':^4}  {'Archive':<42}  {'Arch Size':>10}  {'Extracted':>10}  {'Files':>8}  {'Time':>8}")
    print(f"{'─'*100}")
    for r in results_log:
        sym = {"done": "✓", "skipped": "⏭", "failed": "✗"}.get(r["status"], "?")
        sz = _human_size(r["archive_size"])
        exsz = _human_size(r.get("extracted_size", 0)) if r.get("extracted_size") else "—"
        tm = _fmt_time(r["elapsed_sec"]) if r["elapsed_sec"] else "—"
        fc = f"{r.get('files_extracted', 0):,}" if r.get("files_extracted") else "—"
        print(f" {r['index']:>3}  {sym:^4}  {r['archive']:<42}  {sz:>10}  {exsz:>10}  {fc:>8}  {tm:>8}")
        if r["error"]:
            print(f"      └─ {r['error'][:85]}")
    print(f"{'─'*100}")

    # ── Summary ────────────────────────────────────────────────────────────
    print(f"\n{_box(['BATCH EXTRACT COMPLETE', '---', f'Source   : {root}', f'Dest     : {EXTRACT_TO}', f'Total    : {len(archives)}', f'✓ Done   : {n_done}', f'⏭ Skipped: {n_skipped}', f'✗ Failed : {n_failed}', f'Time     : {_fmt_time(total_elapsed)}'])}")

    # ── Save report ────────────────────────────────────────────────────────
    if SAVE_REPORT:
        report_dir = Path(EXTRACT_TO) if EXTRACT_TO else root
        report_dir.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")

        report = {
            "timestamp":      datetime.now().isoformat(),
            "source_folder":  str(root),
            "extract_to":     str(EXTRACT_TO),
            "overwrite":      OVERWRITE,
            "same_structure": SAME_STRUCTURE,
            "total_archives": len(archives),
            "done":           n_done,
            "skipped":        n_skipped,
            "failed":         n_failed,
            "total_elapsed_sec": total_elapsed,
            "files":          results_log,
        }

        json_path = report_dir / f"batch_extract_report_{ts}.json"
        with open(json_path, "w") as f:
            json.dump(report, f, indent=2, default=str)

        txt_path = report_dir / f"batch_extract_report_{ts}.txt"
        with open(txt_path, "w") as f:
            f.write(f"BATCH EXTRACT REPORT — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"{'='*80}\n\n")
            f.write(f"Source    : {root}\n")
            f.write(f"Extract to: {EXTRACT_TO}\n")
            f.write(f"Overwrite : {OVERWRITE}\n")
            f.write(f"Archives  : {len(archives)}\n")
            f.write(f"Done: {n_done}  |  Skipped: {n_skipped}  |  Failed: {n_failed}\n")
            f.write(f"Time      : {_fmt_time(total_elapsed)}\n\n")

            f.write(f"{'#':>3}  {'Status':<8}  {'Archive':<45}  {'Size':>10}  {'Time':>8}  {'Files':>8}\n")
            f.write(f"{'-'*90}\n")
            sym_map = {"done": "✓", "skipped": "⏭", "failed": "✗"}
            for r in results_log:
                sym = sym_map.get(r["status"], "?")
                sz  = _human_size(r["archive_size"])
                tm  = _fmt_time(r["elapsed_sec"]) if r["elapsed_sec"] else "—"
                fc  = f"{r.get('files_extracted', 0):,}" if r.get("files_extracted") else "—"
                f.write(f"{r['index']:>3}  {sym:<8}  {r['archive']:<45}  {sz:>10}  {tm:>8}  {fc:>8}\n")
                if r["error"]:
                    f.write(f"     └─ Error: {r['error']}\n")

            if n_failed:
                f.write(f"\n{'='*80}\nFAILED ARCHIVES:\n")
                for r in results_log:
                    if r["status"] == "failed":
                        f.write(f"  {r['archive']}: {r['error']}\n")

        print(f"\n  📄 JSON report → {json_path}")
        print(f"  📄 TXT report  → {txt_path}")

    print(f"\n✓ Finished at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    main()
