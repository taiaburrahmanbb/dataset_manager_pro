# Notebook Guide — Usage & Workflow Documentation

> Last updated: April 13, 2026

---

## Overview

The three Jupyter notebooks form the core data operations pipeline. They are designed to be run **in sequence**, each building on the output of the previous.

```
01.wasabi_sync.ipynb  ──►  02.file_manager.ipynb  ──►  03.csv_editors.ipynb
    (Download)                 (Extract)                  (QA & Audit)
```

All notebooks load credentials from `../.env` (the project root `.env` file).

---

## Notebook 01 — Wasabi Sync (Download)

**File:** `notebook/01.wasabi_sync.ipynb`
**Purpose:** Download files, folders, or batches of objects from the Wasabi S3 bucket to the local filesystem.

### Prerequisites

```bash
pip install boto3 tqdm ipywidgets python-dotenv
```

### Configuration (Cell 2)

Set these in the `.env` file or override in the notebook:

| Variable | Description | Example |
|---|---|---|
| `WASABI_ENDPOINT` | Wasabi regional endpoint | `https://s3.us-east-2.wasabisys.com` |
| `WASABI_REGION` | Wasabi region | `us-east-2` |
| `WASABI_ACCESS_KEY_ID` | Access key | `3Q1D0PJT...` |
| `WASABI_SECRET_ACCESS_KEY` | Secret key | `WhBJTee...` |
| `WASABI_BUCKET` | Bucket name | `bbvision` |
| `MAX_WORKERS` | Parallel download threads | `8` |

### Available Functions

| Function | Parameters | Description |
|---|---|---|
| `test_connection()` | — | Verify bucket access; returns bool |
| `list_bucket(prefix)` | `prefix=""` | List all objects under a prefix |
| `download_file(source_key, save_path, overwrite)` | key, local path, bool | Download a single object with progress |
| `download_folder(source_prefix, save_path, overwrite, strip_prefix)` | prefix, local path, bool, bool | Download all objects under a prefix (parallel) |
| `batch_download(source_keys, save_path, overwrite)` | list of keys, local path, bool | Download specific keys (parallel) |

### Usage Examples

**Download a single file:**
```python
SOURCE_KEY = "datasets/gen_ai_detector_dataset/genAI_6.zip"
SAVE_PATH  = "../data/wasabi/gen_ai_detector_dataset/genAI_6.zip"
OVERWRITE  = False

download_file(SOURCE_KEY, SAVE_PATH, overwrite=OVERWRITE)
```

**Download an entire folder:**
```python
SOURCE_FOLDER = "datasets/GenAI_Image_Database/Generated_Data_2025/"
SAVE_PATH     = "../data/wasabi/GenAI_Image_Database/Generated_Data_2025/"
OVERWRITE     = False
STRIP_PREFIX  = True

download_folder(SOURCE_FOLDER, SAVE_PATH, overwrite=OVERWRITE, strip_prefix=STRIP_PREFIX)
```

**Batch download specific keys:**
```python
SOURCE_KEYS = [
    "Image_Features_DBs/GAID_Image/GAID_Dataset_v9_Val_features.parquet",
    "backup/video_infer_results.tar.gz",
]
SAVE_PATH = "../data/wasabi/"
OVERWRITE = False

batch_download(SOURCE_KEYS, SAVE_PATH, overwrite=OVERWRITE)
```

**Browse bucket contents:**
```python
BROWSE_PREFIX = "datasets/"
items = list_bucket(BROWSE_PREFIX)
for item in items:
    print(f"{item['key']}  ({_human_size(item['size'])})")
```

### Cell Reference

| Cell | Section | Action |
|---|---|---|
| 0 | Title | Index table |
| 1–3 | Install & Imports | pip install, load `.env` |
| 4–5 | Configuration | Set credentials and region |
| 6–7 | Auto-detect Region | Probe all Wasabi endpoints (if 400 errors) |
| 8–9 | Helper Functions | All download/listing functions + `test_connection()` |
| 10–11 | Download Single File | `download_file(...)` |
| 12–13 | Download Folder | `download_folder(...)` |
| 14–15 | Batch Download | `batch_download(...)` |
| 16–17 | Appendix | `list_bucket(...)` browser |

### Typical Workflow

1. Run cells 1–9 (install, configure, load helpers)
2. Test connection (auto-runs at end of cell 9)
3. Use cell 11 (single file), cell 13 (folder), or cell 15 (batch) as needed
4. Downloaded files land in `data/wasabi/`

---

## Notebook 02 — File Manager (Extract & Organize)

**File:** `notebook/02.file_manager.ipynb`
**Purpose:** Extract downloaded archives, move/copy/rename/delete files, browse and check disk usage. No cloud operations — purely local.

### Prerequisites

```bash
pip install lz4 py7zr zstandard tqdm
apt install p7zip-full    # for split zip support
```

### Supported Archive Formats

| Format | Extension(s) | Method |
|---|---|---|
| LZ4-compressed tar | `.tar.lz4` | Streaming LZ4 + tar |
| Zstandard-compressed tar | `.tar.zst`, `.tar.zstd` | Streaming zstd + tar |
| Gzip-compressed tar | `.tar.gz`, `.tgz` | Python `tarfile` |
| Bzip2-compressed tar | `.tar.bz2` | Python `tarfile` |
| XZ-compressed tar | `.tar.xz` | Python `tarfile` |
| ZIP | `.zip` | Python `zipfile` |
| Split ZIP | `.z01`, `.z02`, ... | `7z` CLI |
| 7-Zip | `.7z` | `py7zr` or `7z` CLI |

### Available Functions

| Function | Parameters | Description |
|---|---|---|
| `extract(source_path, extract_to, overwrite)` | path, dest dir, bool | Extract a single archive |
| `move(source_path, dest_path, overwrite)` | src, dest, bool | Move file or directory |
| `copy(source_path, dest_path, overwrite)` | src, dest, bool | Copy with progress |
| `rename(source_path, new_name)` | path, new basename | Rename in-place |
| `delete(target_path, confirm)` | path, bool | Permanently delete |
| `browse(path, max_depth, show_hidden)` | path, int, bool | ASCII tree view |
| `disk_usage(path)` | path | Per-child size table |

### Usage Examples

**Extract a single archive:**
```python
SOURCE_ARCHIVE = "../data/wasabi/gen_ai_detector_dataset/genAI_6.zip"
EXTRACT_TO     = "../data/processed/gen_ai_detector_dataset/"
OVERWRITE      = False

extract(SOURCE_ARCHIVE, EXTRACT_TO, overwrite=OVERWRITE)
```

**Batch extract all archives in a folder:**
```python
SOURCE_FOLDER  = "../data/wasabi/GenAI_Image_Database/Generated_Data_2025/"
EXTRACT_TO     = "../data/processed/gen_ai_detector_dataset/GenAI_Image_Database/Generated_Data_2025/"
SAME_STRUCTURE = True      # preserve subdirectory layout
OVERWRITE      = False
SAVE_REPORT    = True      # write batch_extract_report_*.json and .txt
```

**Browse and check disk usage:**
```python
browse("../data/processed/gen_ai_detector_dataset/", max_depth=2)
disk_usage("../data/processed/")
```

### Batch Extract Report

When `SAVE_REPORT = True`, two files are created:

| File | Format | Content |
|---|---|---|
| `batch_extract_report_<timestamp>.json` | JSON | Per-archive results: path, status, output dir, duration |
| `batch_extract_report_<timestamp>.txt` | Text | Human-readable summary table |

### Cell Reference

| Cell | Section | Action |
|---|---|---|
| 0 | Title | Index table |
| 1–3 | Install & Imports | pip install, detect backends |
| 4–5 | Helper Functions | All file operations loaded |
| 6–7 | Extract / Unzip | Single archive extraction |
| 8–9 | Batch Extract | Batch extract entire folder |
| 10–11 | Move | `move(...)` |
| 12–13 | Copy | `copy(...)` |
| 14–15 | Rename | `rename(...)` |
| 16–17 | Delete | `delete(...)` |
| 18–19 | Browse | `browse(...)` ASCII tree |
| 20 | Disk Usage | `disk_usage(...)` |

### CLI Alternative: `batch_extract.py`

For unattended server extraction, use the standalone script:

```bash
cd ~/dataset_manager_pro
nohup .venv/bin/python backend/batch_extract.py > extract.log 2>&1 &
tail -f extract.log
```

Configuration is at the top of `batch_extract.py`:
```python
SOURCE_FOLDER  = "data/wasabi/gen_ai_detector_dataset"
EXTRACT_TO     = "data/processed/gen_ai_detector_dataset"
SAME_STRUCTURE = True
OVERWRITE      = False
SAVE_REPORT    = True
```

Other background execution methods:

```bash
# Using screen
screen -S extract .venv/bin/python backend/batch_extract.py
# Detach: Ctrl+A, D    Re-attach: screen -r extract

# Using tmux
tmux new -s extract ".venv/bin/python backend/batch_extract.py"
# Detach: Ctrl+B, D    Re-attach: tmux attach -t extract
```

---

## Notebook 03 — CSV Editors (QA & Analysis)

**File:** `notebook/03.csv_editors.ipynb`
**Purpose:** End-to-end CSV pipeline for dataset quality assurance — add filenames, scan local/Wasabi inventories, compare against manifests, run analysis, and audit for missing files.

### Prerequisites

```bash
pip install pandas matplotlib seaborn tqdm boto3 python-dotenv
```

### Configuration (Cell 5)

| Variable | Description | Example |
|---|---|---|
| `PROJECT_NAME` | Output folder name under `data/processed/` | `GAID-v9` |
| `SOURCE_CSV` | Path to canonical train CSV | `data/csv/GAID_Dataset_v9_full_Train.csv` |
| `VAL_CSV` | Path to canonical val CSV | `data/csv/GAID_Dataset_v9_full_Val.csv` |
| `IMAGE_SCAN_DIR` | Local directory with extracted images | `data/processed/gen_ai_detector_dataset` |
| `WASABI_SCAN_PREFIX` | Wasabi prefix for remote scan (optional) | `datasets/gen_ai_detector_dataset/` |
| `LABEL_MAP` | Dict mapping folder substrings to labels | `{"human": 1, "genAI": 0, ...}` |
| `IMAGE_EXTS` | Recognized image extensions | `{".jpg", ".png", ".jpeg", ...}` |

**Output directories (auto-created):**
- `data/processed/<PROJECT_NAME>/csv/` — CSV reports
- `data/processed/<PROJECT_NAME>/charts/` — PNG charts

### Available Functions

| Function | Description |
|---|---|
| `add_filename_column(source_csv, ...)` | Add `filename` column to source CSV → `01.*_with_filename.csv` |
| `scan_image_dir(scan_dir, ...)` | Recursively scan local dir for images → `02.*_local_scanned.csv` |
| `scan_wasabi_bucket(prefix, ...)` | List Wasabi objects → `02.*_wasabi_scanned.csv` |
| `compare_csvs(df_source, df_scanned, ...)` | Set comparison → `03.compare_*.csv` + charts |
| `run_analysis(train_csv, val_csv, ...)` | EDA: label/source/format distributions → `05.*.png` |

### Pipeline Steps

#### Step 1 — Add Filename Column
```python
df_source = add_filename_column(SOURCE_CSV, output_dir=CSV_DIR, prefix="01")
# Output: 01.GAID_Dataset_v9_full_Train_with_filename.csv
```

#### Step 2a — Local Image Scan
```python
df_scanned = scan_image_dir(IMAGE_SCAN_DIR, output_dir=CSV_DIR, 
                            output_name=f"{PROJECT_NAME}_local_scanned", prefix="02")
# Output: 02.GAID-v9_local_scanned.csv
```

#### Step 2b — Wasabi Scan (Optional)
```python
df_wasabi = scan_wasabi_bucket(WASABI_SCAN_PREFIX, output_dir=CSV_DIR,
                               output_name=f"{PROJECT_NAME}_wasabi_scanned", 
                               ext_filter=IMAGE_EXTS, file_prefix="02")
# Output: 02.GAID-v9_wasabi_scanned.csv
```

#### Step 3 — Compare Train vs Scanned
```python
compare_csvs(df_source, df_scanned, output_dir=CSV_DIR, charts_dir=CHARTS_DIR, 
             compare_col="filename", prefix="03")
# Output: 03.compare_common.csv, 03.compare_only_in_source.csv, 03.compare_only_in_scanned.csv
# Charts: 03.compare_charts.png, 03.compare_label_breakdown.png
```

#### Step 3b — Compare Val vs Scanned
```python
compare_csvs(df_val, df_scanned, output_dir=CSV_DIR, charts_dir=CHARTS_DIR,
             compare_col="filename", prefix="04")
# Output: 04.compare_*.csv + charts
```

#### Dataset Analysis (Section 7–8)
```python
run_analysis(TRAIN_CSV, VAL_CSV, save_dir=CHARTS_DIR, top_n=15, prefix="05")
# Output: 05.*.png charts (label distribution, source breakdown, etc.)
```

#### Missing Image Audit (Section 9)
```python
# Builds local filename index, checks each source CSV entry
# Output: missing_images_train.csv, missing_images_val.csv
#          folder_summary_train.csv, folder_summary_val.csv
```

### Cell Reference

| Cell | Section | Action |
|---|---|---|
| 0 | Title | Index table |
| 1–3 | Install & Imports | pip install, load `.env`, pandas settings |
| 4–5 | Configuration | All project variables |
| 6–7 | Helper Functions | All pipeline functions loaded |
| 8–9 | Step 1 | `add_filename_column(...)` |
| 10–11 | Step 2a | `scan_image_dir(...)` — local scan |
| 12–13 | Step 2b | `scan_wasabi_bucket(...)` — Wasabi scan (commented by default) |
| 14–15 | Step 3 | `compare_csvs(...)` — train vs scanned |
| 16–17 | Step 3b | `compare_csvs(...)` — val vs scanned |
| 18–19 | Appendix | Re-run comparison from saved CSVs |
| 20–24 | Analysis | Dataset EDA and `run_analysis(...)` |
| 25–27 | Section 9 | Missing image audit + folder summaries |

### Running for a Different Project

To run the pipeline for a different dataset version or image set, only change the configuration cell:

```python
# Example: Run for v10 against full-resolution images
PROJECT_NAME   = "GAID-v10"
SOURCE_CSV     = "../data/csv/GAID_Dataset_v10_full_Train.csv"
VAL_CSV        = "../data/csv/GAID_Dataset_v10_full_Val.csv"
IMAGE_SCAN_DIR = "../data/processed/gen_ai_detector_dataset"

# Example: Run for v9 against 224px-scaled images
PROJECT_NAME   = "GAID-v9-scaled_224"
SOURCE_CSV     = "../data/csv/GAID_Dataset_v9_full_Train.csv"
VAL_CSV        = "../data/csv/GAID_Dataset_v9_full_Val.csv"
IMAGE_SCAN_DIR = "../data/processed/gen_ai_detector_dataset_scaled_224"

# Example: Run for v9 against GenAI Image Database only
PROJECT_NAME   = "GAID-v9-gen_ai"
SOURCE_CSV     = "../data/csv/GAID_Dataset_v9_full_Train.csv"
VAL_CSV        = "../data/csv/GAID_Dataset_v9_full_Val.csv"
IMAGE_SCAN_DIR = "../data/processed/gen_ai_detector_dataset/GenAI_Image_Database"
```

Then re-run all cells from Step 1 onward. Outputs go to `data/processed/<PROJECT_NAME>/csv/` and `charts/`.

---

## End-to-End Workflow Example

Here's a complete workflow for adding a new batch of AI-generated images:

### 1. Download from Wasabi

```python
# In notebook 01
SOURCE_FOLDER = "datasets/GenAI_Image_Database/Generated_Data_2025/"
SAVE_PATH     = "../data/wasabi/GenAI_Image_Database/Generated_Data_2025/"
download_folder(SOURCE_FOLDER, SAVE_PATH)
```

### 2. Extract Archives

```python
# In notebook 02
SOURCE_FOLDER = "../data/wasabi/GenAI_Image_Database/Generated_Data_2025/"
EXTRACT_TO    = "../data/processed/gen_ai_detector_dataset/GenAI_Image_Database/Generated_Data_2025/"
# Run batch extract cell
```

### 3. QA the Dataset

```python
# In notebook 03
PROJECT_NAME   = "GAID-v9-gen_ai"
SOURCE_CSV     = "../data/csv/GAID_Dataset_v9_full_Train.csv"
IMAGE_SCAN_DIR = "../data/processed/gen_ai_detector_dataset"
# Run Steps 1 → 3 → 3b → Analysis → Missing audit
```

### 4. Check Results

- Open `data/processed/GAID-v9-gen_ai/csv/03.compare_only_in_source.csv` → files still missing
- Open `data/processed/GAID-v9-gen_ai/csv/folder_summary_train.csv` → per-folder coverage
- Check `data/processed/GAID-v9-gen_ai/charts/` → visual summary
