# Data Organization — Current Layout

> Last updated: April 13, 2026

This document maps every data directory and explains the flow of data through the system.

---

## 1. Data Flow Overview

```
  Wasabi Bucket (bbvision)            Local Machine
  ========================           ===============

  datasets/                    -+
    gen_ai_detector_dataset/    |    01.wasabi_sync.ipynb
    gen_ai_detector_dataset_    |--> (download) -------->  data/wasabi/
      scaled_224/               |                          (archives + raw dirs)
    GenAI_Image_Database/      -+
                                                               |
                                                               | 02.file_manager.ipynb
                                                               | batch_extract.py
                                                               | (extract)
                                                               v
                                                         data/processed/
                                                           (extracted images)
                                                               |
                                                               | 03.csv_editors.ipynb
                                                               | (scan, compare, audit)
                                                               v
                                                         data/processed/<PROJECT>/csv/
                                                         data/processed/<PROJECT>/charts/
```

---

## 2. Directory Tree

### 2.1 Source CSVs (`data/csv/`)

Canonical GAID dataset manifests — the ground truth for train/val splits.

```
data/csv/
  GAID_Dataset_v9_full_Train.csv        68 MB   704,779 rows
  GAID_Dataset_v9_full_Val.csv           6 MB    63,582 rows
  GAID_Dataset_v10_full_Train.csv       69 MB   714,801 rows
  GAID_Dataset_v10_full_Val.csv          6 MB    63,582 rows
  train_fold_5.csv                      61 MB   634,301 rows
```

---

### 2.2 Wasabi Downloads (`data/wasabi/`)

Local mirror of objects downloaded from the `bbvision` Wasabi bucket. Contains compressed archives and some raw directories.

```
data/wasabi/                                        298 GB total
|
+-- gen_ai_detector_dataset/                        238 GB
|   +-- PubDB_Fake/                                  Fake images from public databases
|   |   +-- Shutterstock_Fake.tar.lz4                  1.7 GB
|   |   +-- dalle_rec_Fake.tar.lz4                     4.1 GB
|   |   +-- tristanzhang32_Fake.tar.lz4                3.5 GB
|   |   +-- pixelpulse_1800.tar.lz4                    497 MB
|   |   +-- ai_shoes.tar.lz4                            21 MB
|   |
|   +-- PubDB_Real/                                  Real images from public databases
|   |   +-- tristanzhang32_Real.tar.lz4               17.9 GB
|   |   +-- ulid25k.tar.lz4                            2.7 GB
|   |   +-- dalle_rec_Real.tar.lz4                      1.2 GB
|   |   +-- Shutterstock_Real.tar.lz4                   1.2 GB
|   |   +-- mit_adobe_5k_Real.tar.lz4                   935 MB
|   |   +-- pht30k_Real.tar.lz4                         771 MB
|   |   +-- environmental_scenes.tar.lz4                922 MB
|   |   +-- SupRes_aditya.tar.lz4                       151 MB
|   |   +-- birdclef.tar.lz4                            121 MB
|   |   +-- LandscapeRec12K.tar.lz4                      62 MB
|   |   +-- image20.tar.lz4                               56 MB
|   |   +-- real_shoes.tar.lz4                             15 MB
|   |
|   +-- genAI/                                       Split zip (data.z01..z28 + data.zip)
|   +-- genAI_2/                                     Split zip
|   +-- genAI_3/                                     Split zip
|   +-- genAI_4/                                     Split zip
|   +-- genAI_5/                                     Split zip
|   +-- genAI_6.zip                                  87 MB single zip
|   +-- human/                                       Split zip (data.z01..z56 + data.zip)
|   +-- human_2/                                     Split zip
|   +-- human_3.zip                                  261 MB single zip
|   +-- ai_image_x_collection_feb25_cleaned.tar.lz4  11.0 GB
|   +-- real_faces_multinational_130325.tar.lz4       3.6 GB
|   +-- testset/                                     Test set directory
|   +-- dataset_iterations_snapshots/
|       +-- gen_ai_database_09_09_2024.parquet        45 MB
|
+-- gen_ai_detector_dataset_scaled_224/              44 GB
|   +-- genAI.tar.lz4                                12.2 GB
|   +-- human.tar.lz4                                17.8 GB
|   +-- genAI_2.tar.lz4                               7.2 GB
|   +-- ai_image_x_collection_feb25_cleaned.tar.lz4   5.2 GB
|   +-- human_2.tar.lz4                               1.1 GB
|   +-- genAI_3.tar.lz4                               254 MB
|   +-- human_3.tar.lz4                                79 MB
|   +-- genAI_4.tar.lz4                                55 MB
|   +-- genAI_6.tar.lz4                                35 MB
|   +-- genAI_5.tar.lz4                                 5 MB
|
+-- GenAI_Image_Database/                            16 GB
    +-- Generated_Data_2025/
        +-- Gen_samples_DALLE_2_300325.tar.lz4        4.5 GB
        +-- Gen_samples_DALLE_3_300325.tar.lz4        4.1 GB
        +-- Gen_samples_Grok3_160325.tar.lz4          1.1 GB
        +-- Gen_samples_Grok3_180325.tar.gz           1.1 GB
        +-- selected_real_samples.tar.gz              977 MB
        +-- Gen_samples_Grok3_220325.tar.gz           658 MB
        +-- Gen_samples_Gemini_280325.tar.lz4         658 MB
        +-- Gen_samples_Gemini_270325.tar.lz4         515 MB
        +-- Gen_samples_GPT_IMAGE_1_070525.tar.lz4    470 MB
        +-- Gen_samples_Gemini_100325.tar.lz4         453 MB
        +-- Gen_samples_Grok2_200325.tar.gz           386 MB
        +-- Gen_samples_Gemini_190325.tar.gz          357 MB
        +-- Gen_samples_Gemini_150325.tar.lz4         329 MB
        +-- selected_Real_Samples_phase_2.tar.lz4     212 MB
        +-- Image_generation_prompts_...Gemini_100325.csv
        +-- Image_generation_prompts_...Gemini_160325.csv
```

---

### 2.3 Extracted Images (`data/processed/`)

Archives from `data/wasabi/` are extracted here. This is where the actual image files live.

```
data/processed/                                     242 GB total
|
+-- gen_ai_detector_dataset/                        194 GB  (full-resolution)
|   +-- genAI/                  ~148K AI-generated images
|   +-- genAI_2/                ~92K AI-generated images
|   +-- genAI_3/                AI-generated batch 3
|   +-- genAI_4/                AI-generated batch 4
|   +-- genAI_5/                AI-generated batch 5
|   +-- genAI_6/                AI-generated batch 6
|   +-- human/                  ~295K real photos
|   +-- human_2/                ~16K real photos
|   +-- human_3/                ~1K real photos
|   +-- PubDB_Fake/
|   |   +-- Shutterstock_Fake/
|   |   +-- dalle_rec_Fake/
|   |   +-- tristanzhang32_Fake/
|   |   +-- pixelpulse_1800/
|   |   +-- ai_shoes/
|   +-- PubDB_Real/
|   |   +-- tristanzhang32_Real/
|   |   +-- ulid25k/
|   |   +-- dalle_rec_Real/
|   |   +-- Shutterstock_Real/
|   |   +-- mit_adobe_5k_Real/
|   |   +-- pht30k_Real/
|   |   +-- environmental_scenes/
|   |   +-- SupRes_aditya/
|   |   +-- birdclef/
|   |   +-- LandscapeRec12K/
|   |   +-- image20/
|   |   +-- real_shoes/
|   +-- ai_image_x_collection_feb25_cleaned/
|   +-- real_faces_multinational_130325/
|   +-- testset/
|   +-- GenAI_Image_Database/
|   |   +-- Generated_Data_2025/
|   |       +-- Gen_samples_DALLE_2_300325/
|   |       +-- Gen_samples_DALLE_3_300325/
|   |       +-- Gen_samples_Gemini_100325/
|   |       +-- Gen_samples_Gemini_150325/
|   |       +-- Gen_samples_Gemini_190325/
|   |       +-- Gen_samples_Gemini_270325/
|   |       +-- Gen_samples_Gemini_280325/
|   |       +-- Gen_samples_Grok2_200325/
|   |       +-- Gen_samples_Grok3_160325/
|   |       +-- Gen_samples_Grok3_180325/
|   |       +-- Gen_samples_Grok3_220325/
|   |       +-- Gen_samples_GPT_IMAGE_1_070525/
|   |       +-- selected_real_samples/
|   |       +-- selected_Real_Samples_phase_2/
|   +-- __MACOSX/               (macOS metadata — safe to delete)
|
+-- gen_ai_detector_dataset_scaled_224/              46 GB  (224px resized)
|   +-- genAI/ ... genAI_6/
|   +-- human/ ... human_3/
|   +-- ai_image_x_collection_feb25_cleaned/
|
+-- GAID-v9/                                        559 MB  (v9 QA outputs)
|   +-- csv/
|   |   +-- 01.GAID_Dataset_v9_full_Train_with_filename.csv   704,779 rows
|   |   +-- 02.GAID-v9_local_scanned.csv                      942,769 rows
|   |   +-- 03.compare_common.csv                             704,377 rows
|   |   +-- 03.compare_only_in_source.csv                         402 rows
|   |   +-- 03.compare_only_in_scanned.csv                   205,845 rows
|   |   +-- 04.compare_common.csv                             63,564 rows
|   |   +-- 04.compare_only_in_source.csv                         18 rows
|   |   +-- 04.compare_only_in_scanned.csv                   876,231 rows
|   |   +-- missing_images_train.csv                              402 rows
|   |   +-- missing_images_val.csv                                 18 rows
|   |   +-- folder_summary_train.csv                               23 rows
|   |   +-- folder_summary_val.csv                                 23 rows
|   +-- charts/
|       +-- 03.compare_charts.png
|       +-- 03.compare_label_breakdown.png
|       +-- 04.compare_charts.png
|       +-- 04.compare_label_breakdown.png
|       +-- 05.*.png  (analysis charts)
|
+-- GAID-v10/                                       513 MB  (v10 QA outputs)
|   +-- csv/    (same structure as GAID-v9)
|   +-- charts/
|
+-- GAID-v9-gen_ai/                                 222 MB  (v9 GenAI subset)
|   +-- csv/
|   +-- charts/
|
+-- GAID-v10-gen_ai/                                223 MB  (v10 GenAI subset)
|   +-- csv/
|   +-- charts/
|
+-- GAID-v9-scaled_224/                             512 MB  (v9 scaled 224px)
|   +-- csv/
|   +-- charts/
|
+-- csv/                                            360 MB  (legacy aggregates)
    +-- train_fold_5_with_filename.csv
    +-- gen_ai_detector_scanned.csv
    +-- wasabi_scanned.csv
    +-- compare_common.csv
    +-- compare_only_in_scanned.csv
    +-- compare_only_in_source.csv
    +-- compare_charts.png
    +-- compare_label_breakdown.png
```

---

## 3. Storage Summary

| Location | Size | Description |
|---|---|---|
| `data/wasabi/gen_ai_detector_dataset/` | **238 GB** | Full-res archives from Wasabi |
| `data/wasabi/gen_ai_detector_dataset_scaled_224/` | **44 GB** | Scaled 224px archives |
| `data/wasabi/GenAI_Image_Database/` | **16 GB** | Per-model generated samples |
| `data/processed/gen_ai_detector_dataset/` | **194 GB** | Extracted full-res images |
| `data/processed/gen_ai_detector_dataset_scaled_224/` | **46 GB** | Extracted scaled images |
| `data/processed/GAID-v9/` | **559 MB** | v9 CSV reports + charts |
| `data/processed/GAID-v10/` | **513 MB** | v10 CSV reports + charts |
| `data/processed/GAID-v9-gen_ai/` | **222 MB** | v9 GenAI subset reports |
| `data/processed/GAID-v10-gen_ai/` | **223 MB** | v10 GenAI subset reports |
| `data/processed/GAID-v9-scaled_224/` | **512 MB** | v9 scaled 224px reports |
| `data/csv/` | **211 MB** | Source GAID CSVs |
| `data/processed/csv/` | **360 MB** | Legacy aggregate CSVs |
| **TOTAL LOCAL** | **~540 GB** | |

---

## 4. Current Wasabi Bucket Structure (`bbvision`)

The current bucket has a flat top-level layout with no project namespacing:

```
bbvision/                                     (Wasabi bucket)
+-- datasets/
|   +-- gen_ai_detector_dataset/              flat dump of all archives
|   |   +-- PubDB_Fake/                      compressed tar.lz4 archives
|   |   +-- PubDB_Real/                      compressed tar.lz4 archives
|   |   +-- genAI/                           split zips (data.z01..z28, data.zip)
|   |   +-- genAI_2/ ... genAI_5/            split zips
|   |   +-- genAI_6.zip
|   |   +-- human/                           split zips (data.z01..z56, data.zip)
|   |   +-- human_2/                         split zips
|   |   +-- human_3.zip
|   |   +-- ai_image_x_collection_feb25_cleaned.tar.lz4
|   |   +-- real_faces_multinational_130325.tar.lz4
|   |   +-- testset/
|   |   +-- dataset_iterations_snapshots/
|   |
|   +-- gen_ai_detector_dataset_scaled_224/   single-file lz4 archives
|   |
|   +-- GenAI_Image_Database/
|       +-- Generated_Data_2025/              per-model tar archives + prompt CSVs
|
+-- Image_Features_DBs/                      precomputed feature parquets
|   +-- GAID_Image/
|
+-- backup/                                  miscellaneous backups
```

### Problems with Current Structure

1. **No project namespace** — everything directly under `datasets/`
2. **No version tracking** in bucket paths (v9 vs v10 not reflected)
3. **Inconsistent naming** — `GenAI_Image_Database` vs `gen_ai_detector_dataset`
4. **Archives mixed with directories** — split zips next to metadata files
5. **No raw vs processed separation** in bucket
6. **Hard to scale** — new projects pollute the same top-level namespace

See [bucket-reorganization.md](bucket-reorganization.md) for the proposed new structure.

---

## 5. Dataset Image Categories

### AI-Generated Images (label = 0)

| Source Folder | Origin |
|---|---|
| `genAI/` | Primary AI-generated collection (~148K images) |
| `genAI_2/` through `genAI_6/` | Additional batches |
| `PubDB_Fake/` | Public database fakes (Shutterstock, DALL-E recreations, etc.) |
| `ai_image_x_collection_feb25_cleaned/` | Cleaned AI image collection |
| `GenAI_Image_Database/Generated_Data_2025/Gen_samples_*` | Per-model samples |

### Real Photographs (label = 1)

| Source Folder | Origin |
|---|---|
| `human/` | Primary real photos (~295K images) |
| `human_2/`, `human_3/` | Additional batches |
| `PubDB_Real/` | Public database reals (12 sub-sources) |
| `real_faces_multinational_130325/` | Multinational face photos |
| `selected_real_samples/`, `selected_Real_Samples_phase_2/` | Curated samples |

---

## 6. How Data Moves Through the System

### Step 1: Download (Notebook 01)

```python
download_file("datasets/gen_ai_detector_dataset/genAI_6.zip",
              "data/wasabi/gen_ai_detector_dataset/genAI_6.zip")

download_folder("datasets/gen_ai_detector_dataset/PubDB_Fake/",
                "data/wasabi/gen_ai_detector_dataset/PubDB_Fake/")
```

### Step 2: Extract (Notebook 02 or batch_extract.py)

```python
extract("data/wasabi/gen_ai_detector_dataset/genAI_6.zip",
        "data/processed/gen_ai_detector_dataset/")
```

### Step 3: CSV QA (Notebook 03)

```python
PROJECT_NAME   = "GAID-v9"
SOURCE_CSV     = "data/csv/GAID_Dataset_v9_full_Train.csv"
IMAGE_SCAN_DIR = "data/processed/gen_ai_detector_dataset"

# Produces under data/processed/GAID-v9/:
#   csv/01.GAID_Dataset_v9_full_Train_with_filename.csv
#   csv/02.GAID-v9_local_scanned.csv
#   csv/03.compare_common.csv
#   csv/03.compare_only_in_source.csv
#   csv/03.compare_only_in_scanned.csv
#   charts/*.png
```
