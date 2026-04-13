# CSV Reference — All Files, Schemas & Pipeline Outputs

> Last updated: April 13, 2026

---

## 1. Source CSVs (`data/csv/`)

These are the canonical GAID dataset manifests. They define which images belong to train/val splits and their labels. These files are inputs to the notebook 03 pipeline.

### GAID v9

| File | Rows | Size | Split |
|---|---|---|---|
| `GAID_Dataset_v9_full_Train.csv` | 704,779 | 68 MB | Training |
| `GAID_Dataset_v9_full_Val.csv` | 63,582 | 6 MB | Validation |

### GAID v10

| File | Rows | Size | Split |
|---|---|---|---|
| `GAID_Dataset_v10_full_Train.csv` | 714,801 | 69 MB | Training |
| `GAID_Dataset_v10_full_Val.csv` | 63,582 | 6 MB | Validation |

### Cross-Validation

| File | Rows | Size |
|---|---|---|
| `train_fold_5.csv` | 634,301 | 61 MB |

### Schema: Source CSVs

```
image_path,labels,directory
```

| Column | Type | Description |
|---|---|---|
| `image_path` | string | Absolute path on the original training server (e.g., `/home/ubuntu/vision/data/...`) |
| `labels` | int (0 or 1) | `0` = AI-generated (fake), `1` = real (human) |
| `directory` | string | Usually empty in source CSVs |

**Note:** The `image_path` values reference the original Ubuntu training server. They don't map directly to local paths — that's why notebook 03 extracts the `filename` and does local/Wasabi scanning.

---

## 2. Pipeline Outputs — Per-Project (`data/processed/<PROJECT>/csv/`)

Each project run of notebook 03 produces a standardized set of CSV files. The `PROJECT_NAME` determines the output folder.

### Active Projects

| PROJECT_NAME | Image Source | Description |
|---|---|---|
| `GAID-v9` | `data/processed/gen_ai_detector_dataset` | v9 manifests vs full-res extracted images |
| `GAID-v10` | `data/processed/gen_ai_detector_dataset` | v10 manifests vs full-res extracted images |
| `GAID-v9-gen_ai` | `data/processed/gen_ai_detector_dataset` | v9 vs GenAI subset images |
| `GAID-v10-gen_ai` | `data/processed/gen_ai_detector_dataset` | v10 vs GenAI subset images |
| `GAID-v9-scaled_224` | `data/processed/gen_ai_detector_dataset_scaled_224` | v9 vs 224px-scaled images |

---

## 3. Step-by-Step CSV Outputs

### Step 1 — Add Filename Column (`01.*`)

**File:** `01.<source_stem>_with_filename.csv`
**Example:** `01.GAID_Dataset_v9_full_Train_with_filename.csv` (704,779 rows)

```
image_path,labels,directory,filename
/home/ubuntu/vision/data/.../0e35d3c7.jpg,1,,0e35d3c7.jpg
```

| Column | Type | Description |
|---|---|---|
| `image_path` | string | Original path from source CSV |
| `labels` | int | 0 (fake) or 1 (real) |
| `directory` | string | From source (usually empty) |
| `filename` | string | **NEW** — extracted basename from `image_path` |

**Purpose:** Extracts the filename from the full path so images can be matched by name regardless of where they're stored.

---

### Step 2a — Local Image Scan (`02.*`)

**File:** `02.<PROJECT_NAME>_local_scanned.csv`
**Example:** `02.GAID-v9_local_scanned.csv` (942,769 rows)

```
image_path,labels,directory,filename
/home/taiaburrahman/.../selected_Real_Samples_phase_2/1a104c22.jpg,0.0,GenAI_Image_Database,1a104c22.jpg
```

| Column | Type | Description |
|---|---|---|
| `image_path` | string | **Local** absolute path to the image file |
| `labels` | float | Label inferred from the top-level folder name |
| `directory` | string | Top-level folder name (e.g., `genAI`, `human`, `PubDB_Fake`) |
| `filename` | string | Image filename |

**Purpose:** Recursively scans `IMAGE_SCAN_DIR` and builds an inventory of all image files actually present on disk.

**Label inference rules (from folder name):**
- Folders containing `human`, `Real`, `real` → label `1` (real)
- Folders containing `genAI`, `Fake`, `fake`, `Gen_samples` → label `0` (AI-generated)
- Unknown → label `-1`

---

### Step 2b — Wasabi Scan (`02.*_wasabi_scanned.csv`)

Same schema as 2a, but built from `list_objects_v2` against the Wasabi bucket instead of local filesystem.

| Column | Type | Description |
|---|---|---|
| `image_path` | string | `s3://bbvision/<key>` |
| `labels` | float | Label inferred from S3 key path |
| `directory` | string | Derived from key structure |
| `filename` | string | Object key basename |
| `s3_key` | string | Full S3 key |
| `size_bytes` | int | Object size |
| `last_modified` | datetime | S3 last-modified timestamp |

---

### Step 3 — Compare Train Source vs Scanned (`03.*`)

Compares the source CSV filenames against the scanned inventory to find overlaps and gaps.

| File | Description | Example Rows |
|---|---|---|
| `03.compare_common.csv` | Files in **both** source CSV and scanned inventory | 704,377 |
| `03.compare_only_in_source.csv` | Files in source CSV but **not found** locally | 402 |
| `03.compare_only_in_scanned.csv` | Files found locally but **not in** source CSV | 205,845 |

**Schema (common):**
```
image_path,labels,directory,filename
```

Both sides' columns are preserved. `compare_common.csv` contains merged rows.

---

### Step 3b — Compare Val Source vs Scanned (`04.*`)

Same logic as Step 3, but compares the **validation** CSV against the scanned inventory.

| File | Description | Example Rows |
|---|---|---|
| `04.compare_common.csv` | Val files found locally | 63,564 |
| `04.compare_only_in_source.csv` | Val files missing locally | 18 |
| `04.compare_only_in_scanned.csv` | Extra files not in val CSV | 876,231 |

---

### Missing Images Audit (`missing_images_*.csv`)

**File:** `missing_images_train.csv`, `missing_images_val.csv`

```
image_path,labels,filename,source_folder
/home/ubuntu/.../Gen_samples_Gemini_100325/humangen_nature.../481926019.jpg,0,481926019.jpg,Gen_samples_Gemini_100325
```

| Column | Type | Description |
|---|---|---|
| `image_path` | string | Original path from source CSV |
| `labels` | int | 0 or 1 |
| `filename` | string | Image filename that was not found locally |
| `source_folder` | string | The folder the file was expected to be in |

**Purpose:** Lists every image referenced in the source CSV that could not be found in the local extracted dataset.

---

### Folder Summary (`folder_summary_*.csv`)

**File:** `folder_summary_train.csv`, `folder_summary_val.csv`

```
status,source_folder,folder_path,total,available,missing,coverage_pct
⚠,Gen_samples_Gemini_100325,Gen_samples/fake/Gen_samples_Gemini_100325/code_gen_100325,4316,3914,402,90.7
✓,Shutterstock_Fake,NewDB/NewDB_Fake/Shutterstock_Fake/fake,29742,29742,0,100.0
```

| Column | Type | Description |
|---|---|---|
| `status` | string | `✓` (100% coverage) or `⚠` (some missing) |
| `source_folder` | string | Top-level source folder |
| `folder_path` | string | Relative path within the dataset structure |
| `total` | int | Total images expected (from source CSV) |
| `available` | int | Images found locally |
| `missing` | int | Images not found |
| `coverage_pct` | float | `available / total * 100` |

**Purpose:** Per-folder breakdown of data completeness. Quickly identifies which source folders have gaps.

---

## 4. Legacy / Aggregate CSVs (`data/processed/csv/`)

These were produced during earlier iterations before the per-project output structure was adopted.

| File | Size | Rows | Description |
|---|---|---|---|
| `train_fold_5_with_filename.csv` | 83 MB | ~634K | Fold-5 CSV with added `filename` column |
| `gen_ai_detector_scanned.csv` | 146 MB | ~942K | Full local scan of `gen_ai_detector_dataset` |
| `wasabi_scanned.csv` | 2 KB | ~20 | Wasabi bucket top-level listing |
| `compare_common.csv` | 65 MB | ~633K | fold-5 ∩ scanned |
| `compare_only_in_source.csv` | 18 MB | ~88K | In fold-5 but not scanned |
| `compare_only_in_scanned.csv` | 47 MB | ~290K | Scanned but not in fold-5 |

**Note:** These are superseded by the per-project outputs (`GAID-v9/csv/`, etc.) and can be considered legacy.

---

## 5. Charts (`data/processed/<PROJECT>/charts/`)

Each project also produces visualization charts as PNG files:

| Chart | File Pattern | Description |
|---|---|---|
| Comparison overview | `03.compare_charts.png` | Bar chart: common, only-in-source, only-in-scanned |
| Label breakdown | `03.compare_label_breakdown.png` | Stacked bar by label (fake/real) |
| Val comparison | `04.compare_charts.png` | Same for validation split |
| Val label breakdown | `04.compare_label_breakdown.png` | Same for validation split |
| Label distribution | `05.label_distribution.png` | Train/val label counts |
| Source distribution | `05.source_distribution.png` | Top-N source folders |
| Source by label | `05.source_by_label.png` | Source folders colored by label |
| Extension distribution | `05.extension_distribution.png` | File format breakdown |
| Train/val overlap | `05.train_val_overlap.png` | Venn-style overlap check |

---

## 6. Wasabi Prompt CSVs

Located in the Wasabi bucket and downloaded to `data/wasabi/GenAI_Image_Database/Generated_Data_2025/`:

| File | Description |
|---|---|
| `Image_generation_prompts_for_Gen_samples_Gemini_100325.csv` | Prompts used to generate Gemini batch 100325 |
| `Image_generation_prompts_for_Gen_samples_Gemini_160325.csv` | Prompts used to generate Gemini batch 160325 |

These contain the text prompts fed to AI models to produce the generated image samples.

---

## 7. Label Convention

Throughout all CSVs:

| Label Value | Meaning |
|---|---|
| `0` | AI-generated / fake image |
| `1` | Real / human photograph |
| `-1` | Unknown / unclassified |

The label is inferred from folder structure during scanning. The mapping used in notebook 03:

| Folder Name Contains | Assigned Label |
|---|---|
| `human`, `Real`, `real` | `1` (real) |
| `genAI`, `Fake`, `fake`, `Gen_samples` | `0` (fake) |
| (anything else) | `-1` (unknown) |

---

## 8. CSV Pipeline Summary Diagram

```
data/csv/GAID_Dataset_v9_full_Train.csv           data/processed/gen_ai_detector_dataset/
         (source manifest)                                  (extracted images)
              │                                                    │
              ▼                                                    ▼
     ┌─── Step 1 ───┐                                    ┌─── Step 2a ───┐
     │ add_filename  │                                    │ scan_image_dir│
     └──────┬───────┘                                    └──────┬────────┘
            │                                                    │
    01.*_with_filename.csv                              02.*_local_scanned.csv
            │                                                    │
            └───────────────┬────────────────────────────────────┘
                            │
                   ┌─── Step 3 ───┐
                   │ compare_csvs │
                   └──────┬───────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
        03.compare   03.compare   03.compare
        _common.csv  _only_in_   _only_in_
                     source.csv  scanned.csv
                          │
                 ┌─── Step 3b ──┐
                 │ compare val  │
                 └──────┬───────┘
                        │
            ┌───────────┼───────────┐
            │           │           │
      04.compare   04.compare   04.compare
      _common.csv  _only_in_   _only_in_
                   source.csv  scanned.csv
                        │
              ┌─── Section 9 ──┐
              │ missing audit  │
              └──────┬─────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
  missing_images  missing_images  folder_summary
  _train.csv      _val.csv        _train/_val.csv
```
