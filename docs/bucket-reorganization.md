# Wasabi Bucket Reorganization Plan

> Last updated: April 13, 2026

---

## 1. Why Reorganize?

The current `bbvision` bucket has a flat structure where all datasets live directly under `datasets/` with no project namespacing. This causes:

- No logical grouping by project
- No version separation (v9, v10 data mixed together)
- Hard to onboard new datasets or team members
- Archives, metadata, and processed data not clearly separated
- No conventions for scaling to future projects

---

## 2. Proposed Bucket Structures (3 Options)

All three options share:
- **Project-first:** everything lives under `bbvision/datasets/projects/GAID/`
- **Label split:** `real/` vs `fake/` separates data by class
- **`csv/`** and **`docs/`** sit at the project root for easy access

---

### Option A — Simple & Flat (Recommended)

One `data/` folder holds all archives, split only by label. No raw/processed distinction
in the bucket — the bucket stores archives, local machines handle extraction.

```
bbvision/datasets/projects/GAID/
│
├── data/
│   ├── fake/                                          ← All AI-generated / fake archives
│   │   ├── genAI/                                        (split zips)
│   │   ├── Shutterstock_Fake.tar.lz4
│   │   ├── Gen_samples_Gemini_100325.tar.lz4
│   │   └── …                                            (all fake archives)
│   │
│   └── real/                                          ← All real / human-captured archives
│       ├── human/                                        (split zips)
│       ├── Shutterstock_Real.tar.lz4
│       ├── selected_real_samples.tar.gz
│       └── …                                            (all real archives)
│
├── csv/
│   ├── GAID_Dataset_v9_full_Train.csv
│   ├── GAID_Dataset_v10_full_Train.csv
│   ├── train_fold_5.csv
│   └── prompts/
│       └── …
│
└── docs/
    ├── README.md
    └── CHANGELOG.md
```

**Path pattern:** `GAID/data/<real|fake>/<archive>`

**Pros:**
- Simplest structure — only 3 top-level folders (`data/`, `csv/`, `docs/`)
- Flat listing per label makes bulk downloads trivial
- `aws s3 cp …/data/fake/ local/fake/ --recursive` grabs everything

**Cons:**
- No distinction between original and processed data in the bucket
- As archives grow into hundreds, the flat list can be hard to scan

---

### Option B — Pipeline Stages (Raw → Processing → Processed)

Separates data by pipeline stage. `raw/` holds immutable original archives, `processing/`
holds intermediate work (e.g. scaled/resized archives), and `processed/` holds final
ready-to-train data. Each stage is split by label.

```
bbvision/datasets/projects/GAID/
│
├── raw/                                               ← Original archives (immutable, never modified)
│   ├── fake/
│   │   ├── genAI/                                        (split zips)
│   │   ├── Shutterstock_Fake.tar.lz4
│   │   ├── Gen_samples_Gemini_100325.tar.lz4
│   │   └── …
│   └── real/
│       ├── human/                                        (split zips)
│       ├── Shutterstock_Real.tar.lz4
│       └── …
│
├── processing/                                        ← Intermediate / resized archives
│   ├── fake/
│   │   ├── genAI_scaled_224.tar.lz4
│   │   └── …
│   └── real/
│       ├── human_scaled_224.tar.lz4
│       └── …
│
├── processed/                                         ← Final, ready-to-train data
│   ├── fake/
│   │   └── (cleaned & validated archives)
│   └── real/
│       └── (cleaned & validated archives)
│
├── csv/
│   ├── GAID_Dataset_v9_full_Train.csv
│   ├── GAID_Dataset_v10_full_Train.csv
│   ├── train_fold_5.csv
│   └── prompts/
│       └── …
│
└── docs/
    ├── README.md
    └── CHANGELOG.md
```

**Path pattern:** `GAID/<raw|processing|processed>/<real|fake>/<archive>`

**Pros:**
- Clear data lineage: you always know where an archive sits in the pipeline
- `raw/` is immutable — safe to re-derive everything from it
- `processing/` gives a home for intermediate transforms (resizing, augmentation)
- Teams can set different lifecycle/retention policies per stage

**Cons:**
- More folders to manage — 3 data prefixes instead of 1
- Must decide which stage each archive belongs to

---

### Option C — Version-First

Top level is the dataset version (`v9/`, `v10/`, …). Each version contains its own
`real/` and `fake/` split. New versions copy only what changed (or start fresh).
Shared CSVs and docs live at the project root.

```
bbvision/datasets/projects/GAID/
│
├── v9/                                                ← Dataset version 9
│   ├── fake/
│   │   ├── genAI/                                        (split zips)
│   │   ├── Shutterstock_Fake.tar.lz4
│   │   ├── Gen_samples_Gemini_100325.tar.lz4
│   │   └── …
│   └── real/
│       ├── human/                                        (split zips)
│       ├── Shutterstock_Real.tar.lz4
│       └── …
│
├── v10/                                               ← Dataset version 10 (adds new sources)
│   ├── fake/
│   │   ├── (all v9 fake archives)
│   │   ├── Gen_samples_Flux_050425.tar.lz4            ← new in v10
│   │   └── Gen_samples_Midjourney_120425.tar.lz4      ← new in v10
│   └── real/
│       ├── (all v9 real archives)
│       └── selected_Real_Samples_phase_3.tar.lz4      ← new in v10
│
├── csv/
│   ├── v9/
│   │   ├── GAID_Dataset_v9_full_Train.csv
│   │   └── GAID_Dataset_v9_full_Val.csv
│   ├── v10/
│   │   ├── GAID_Dataset_v10_full_Train.csv
│   │   └── GAID_Dataset_v10_full_Val.csv
│   ├── folds/
│   │   └── train_fold_5.csv
│   └── prompts/
│       └── …
│
└── docs/
    ├── README.md
    └── CHANGELOG.md
```

**Path pattern:** `GAID/<v9|v10>/<real|fake>/<archive>`

**Pros:**
- Each version is a complete, self-contained snapshot
- Easy to compare versions: diff the file lists between `v9/fake/` and `v10/fake/`
- Rolling back is trivial — just point training at the previous version folder
- New team members immediately see which version they should use

**Cons:**
- Data duplication: archives shared between versions are stored twice
- Storage cost grows linearly with versions (mitigated if Wasabi supports object-level dedup or you use symlinks/manifests instead of copying)

---

### Option D — Pipeline Stages + Versioned Output (B + C Combined)

Pipeline stages (`raw/`, `processing/`, `processed/`) at the top level like Option B, but
`processed/` is versioned (`processed/v9/`, `processed/v10/`) like Option C. The key difference:
`raw/` and `processing/` are **shared** (one copy), so there is **no duplication** of the
238 GB of source archives. Only the final curated output under `processed/` is versioned.

```
bbvision/datasets/projects/GAID/
│
├── raw/                                               ← Original archives (immutable, ONE shared copy)
│   ├── fake/
│   │   ├── genAI/                                        (split zips)
│   │   ├── Shutterstock_Fake.tar.lz4
│   │   ├── Gen_samples_Gemini_100325.tar.lz4
│   │   └── …                                            (all fake archives)
│   └── real/
│       ├── human/                                        (split zips)
│       ├── Shutterstock_Real.tar.lz4
│       ├── selected_real_samples.tar.gz
│       └── …                                            (all real archives)
│
├── processing/                                        ← Intermediate / resized (ONE shared copy)
│   ├── fake/
│   │   ├── genAI_scaled_224.tar.lz4
│   │   └── …
│   └── real/
│       ├── human_scaled_224.tar.lz4
│       └── …
│
├── processed/                                         ← Final ready-to-train data (VERSIONED)
│   ├── v9/
│   │   ├── fake/
│   │   │   └── (all v9 cleaned & validated fake archives)
│   │   └── real/
│   │       └── (all v9 cleaned & validated real archives)
│   └── v10/
│       ├── fake/
│       │   ├── (all v9 processed fake)
│       │   └── Gen_samples_Flux_050425.tar.lz4        ← new in v10
│       └── real/
│           ├── (all v9 processed real)
│           └── selected_Real_Samples_phase_3.tar.lz4  ← new in v10
│
├── csv/
│   ├── GAID_Dataset_v9_full_Train.csv
│   ├── GAID_Dataset_v10_full_Train.csv
│   ├── train_fold_5.csv
│   └── prompts/
│       └── …
│
└── docs/
    ├── README.md
    └── CHANGELOG.md
```

**Path patterns:**
- Raw archives: `GAID/raw/<real|fake>/<archive>`
- Scaled/resized: `GAID/processing/<real|fake>/<archive>`
- Versioned output: `GAID/processed/<v9|v10>/<real|fake>/<archive>`
- CSVs: `GAID/csv/<manifest.csv>`

**Pros:**
- Pipeline stages at top level (like B) — clear data lineage: `raw/` → `processing/` → `processed/`
- `raw/` and `processing/` are **shared** — no duplication of the 238 GB source archives
- Only `processed/` is versioned — duplication only where it matters (final curated output)
- "Get all raw fake data" is just `…/raw/fake/` — no version needed
- Adding new raw data: drop in `raw/fake/` — it feeds into all future versions
- Version rollback: point training at `processed/v9/` or `processed/v10/`
- Clean separation: `raw` (immutable source) → `processing` (transforms) → `processed/vN` (releases)

**Cons:**
- `processed/` still has per-version duplication for archives shared between versions
- Must track which raw archives map to which processed version via CSV manifests
- 4 levels deep for `raw/`/`processing/`, 5 levels for `processed/`

---

### Option E — Full Lifecycle (D + Models + Benchmarks + Monitoring)

Extends Option D with three new top-level folders: `models/` for trained model checkpoints
(`.pt`, `.pth`, `.onnx`, configs), `benchmarks/` for curated test sets and evaluation results,
and `monitoring/` for production inference logs, misclassified samples (with actual images),
drift detection, and retraining candidates. This closes the full MLOps loop:
**data → train → checkpoint → evaluate → deploy → monitor → retrain**.

```
bbvision/datasets/projects/GAID/
│
├── raw/                                               ← Same as Option D (shared, immutable)
│   ├── fake/
│   │   └── (all fake archives …)
│   └── real/
│       └── (all real archives …)
│
├── processing/                                        ← Same as Option D (shared intermediates)
│   ├── fake/
│   │   └── (scaled/resized archives …)
│   └── real/
│       └── (scaled/resized archives …)
│
├── processed/                                         ← Same as Option D (versioned output)
│   ├── v9/
│   │   ├── fake/
│   │   └── real/
│   └── v10/
│       ├── fake/
│       └── real/
│
├── models/                                            ← NEW: trained model checkpoints & configs
│   ├── v9/                                            models trained on processed/v9/ data
│   │   ├── gaid_v9_resnet50_epoch120.pt                  best checkpoint
│   │   ├── gaid_v9_resnet50_last.pt                      last epoch checkpoint
│   │   ├── gaid_v9_efficientnet_epoch85.pth              alternative architecture
│   │   ├── gaid_v9_resnet50.onnx                         exported for inference
│   │   ├── train_config.yaml                             hyperparams, augmentations, schedule
│   │   └── training_log.csv                              epoch, loss, acc, val_acc, lr
│   │
│   ├── v10/                                           models trained on processed/v10/ data
│   │   ├── gaid_v10_resnet50_epoch150.pt
│   │   ├── gaid_v10_resnet50.onnx
│   │   ├── train_config.yaml
│   │   └── training_log.csv
│   │
│   └── experimental/                                  one-off experiments, ablations
│       ├── v10_vit_large_epoch80.pt
│       └── train_config.yaml
│
├── benchmarks/                                        ← NEW: model evaluation test sets
│   ├── testset_v1/                                    fixed benchmark (never changes)
│   │   ├── images/
│   │   │   ├── fake/
│   │   │   │   ├── dalle3_bench_001.jpg
│   │   │   │   └── …
│   │   │   └── real/
│   │   │       ├── photo_bench_001.jpg
│   │   │       └── …
│   │   └── ground_truth.csv
│   │
│   ├── testset_v2/                                    newer benchmark (emerging AI models)
│   │   ├── images/  (fake/ + real/)
│   │   └── ground_truth.csv
│   │
│   ├── adversarial/                                   hard cases (upscaled, post-processed)
│   │   ├── images/  (fake/ + real/)
│   │   └── ground_truth.csv
│   │
│   └── results/                                       model evaluation outputs
│       ├── v9_testset_v1_results.csv
│       ├── v10_testset_v1_results.csv
│       └── comparison_v9_vs_v10.csv
│
├── monitoring/                                        ← NEW: production model monitoring
│   ├── predictions/                                   inference logs from production
│   │   ├── 2026-04/
│   │   │   ├── predictions_20260401.csv
│   │   │   └── …
│   │   └── 2026-05/
│   │       └── …
│   │
│   ├── flagged/                                       misclassified / low-confidence samples
│   │   ├── false_positives/
│   │   │   ├── images/  (fp_20260401_001.jpg, …)
│   │   │   └── false_positives_log.csv
│   │   └── false_negatives/
│   │       ├── images/  (fn_20260401_001.jpg, …)
│   │       └── false_negatives_log.csv
│   │
│   ├── drift/                                         data drift detection
│   │   ├── drift_report_2026-04.csv
│   │   └── feature_distributions/
│   │       └── distribution_2026-04.parquet
│   │
│   └── retraining_candidates/                         queued for next training round
│       ├── images/  (candidate_001.jpg, …)
│       └── retraining_queue.csv
│
├── csv/
│   ├── GAID_Dataset_v9_full_Train.csv
│   ├── GAID_Dataset_v10_full_Train.csv
│   ├── train_fold_5.csv
│   └── prompts/
│       └── …
│
└── docs/
    ├── README.md
    └── CHANGELOG.md
```

**Path patterns:**
- Raw archives: `GAID/raw/<real|fake>/<archive>`
- Scaled/resized: `GAID/processing/<real|fake>/<archive>`
- Versioned output: `GAID/processed/<v9|v10>/<real|fake>/<archive>`
- Model checkpoints: `GAID/models/<v9|v10>/<model_name>.<pt|pth|onnx>`
- Model configs: `GAID/models/<v9|v10>/train_config.yaml`
- Benchmark images: `GAID/benchmarks/<testset_name>/images/<real|fake>/<image>`
- Benchmark results: `GAID/benchmarks/results/<model>_<testset>_results.csv`
- Prediction logs: `GAID/monitoring/predictions/<YYYY-MM>/predictions_<YYYYMMDD>.csv`
- Flagged samples: `GAID/monitoring/flagged/<false_positives|false_negatives>/images/<image>`
- Drift reports: `GAID/monitoring/drift/drift_report_<YYYY-MM>.csv`
- Retraining queue: `GAID/monitoring/retraining_candidates/retraining_queue.csv`

#### Model Checkpoint Details

| Extension | Framework | Description |
|---|---|---|
| `.pt` | PyTorch | Full model or `state_dict` checkpoint |
| `.pth` | PyTorch | Same as `.pt` (convention varies) |
| `.onnx` | ONNX Runtime | Exported for cross-framework inference |
| `.safetensors` | HuggingFace | Safe serialization (no pickle risk) |
| `.tflite` | TF Lite | Mobile / edge deployment |
| `.yaml`/`.json` | — | Training config, hyperparams, augmentation settings |

Each `models/<version>/` directory contains:
- **Best checkpoint** — the model weights with highest validation accuracy
- **Last checkpoint** — the final epoch weights (for resuming training)
- **Exported model** — ONNX or other inference-ready format
- **Config** — exact hyperparameters, augmentation pipeline, learning rate schedule
- **Training log** — per-epoch metrics CSV for plotting loss/accuracy curves

#### Benchmark & Monitoring CSV Schemas

**`models/v9/training_log.csv`** — per-epoch training metrics:

```
epoch,train_loss,train_acc,val_loss,val_acc,lr,timestamp
1,0.693,0.512,0.681,0.534,0.001,2026-03-15T10:00:00Z
120,0.041,0.987,0.089,0.961,0.0001,2026-03-17T06:45:00Z
```

**`benchmarks/testset_v1/ground_truth.csv`** — ground truth for each benchmark image:

```
filename,label,source_model,category,difficulty,notes
dalle3_bench_001.jpg,0,dalle_3,portrait,easy,clean studio output
photo_bench_001.jpg,1,,landscape,easy,DSLR outdoor shot
```

**`benchmarks/results/comparison_v9_vs_v10.csv`** — cross-version metrics:

```
metric,testset,v9_score,v10_score,delta
accuracy,testset_v1,0.943,0.961,+0.018
f1_fake,testset_v1,0.941,0.961,+0.020
accuracy,adversarial,0.871,0.912,+0.041
```

**`monitoring/predictions/2026-04/predictions_20260401.csv`** — daily inference log:

```
image_id,pred_label,confidence,model_version,timestamp,source
img_abc123,0,0.89,v10,2026-04-01T08:12:33Z,api_upload
```

**`monitoring/flagged/false_positives/false_positives_log.csv`** — misclassification log:

```
filename,true_label,pred_label,confidence,model_version,flagged_date,reviewed
fp_20260401_001.jpg,1,0,0.72,v10,2026-04-01,false
```

**`monitoring/drift/drift_report_2026-04.csv`** — monthly distribution drift:

```
metric,baseline_v10_train,current_month,drift_pct,alert
mean_confidence,0.934,0.891,-4.6%,warning
fake_ratio,0.48,0.62,+29.2%,critical
```

**`monitoring/retraining_candidates/retraining_queue.csv`** — samples queued for retraining:

```
filename,source,reason,flagged_date,priority,assigned_label
candidate_001.jpg,api_upload,false_negative,2026-04-02,high,
```

**Pros:**
- Everything from Option D (pipeline lineage + versioned releases, no raw duplication)
- `models/` backs up trained checkpoints alongside the data they were trained on
- Model versions match data versions (`models/v9/` ↔ `processed/v9/`) — full traceability
- Configs + training logs stored with checkpoints — fully reproducible training
- `experimental/` folder for ablations without cluttering production model versions
- `benchmarks/` gives fixed, immutable test sets for reproducible model evaluation
- `benchmarks/results/` tracks model scores across versions and test sets
- `monitoring/` closes the feedback loop: production → flagged errors → retraining → raw/
- Full MLOps lifecycle: data → train → checkpoint → evaluate → deploy → monitor → retrain

**Cons:**
- Most complex structure — 8 top-level folders under GAID/
- Model checkpoints can be large (100 MB–2 GB each) — consider retention policies
- `monitoring/` grows indefinitely and needs lifecycle rules (e.g. delete logs after 6 months)
- Overkill if not running models in production yet

---

### Quick Comparison

| Aspect | Option A (Flat) | Option B (Pipeline) | Option C (Version) | Option D (Pipeline+Ver) | Option E (Full Lifecycle) |
|---|---|---|---|---|---|
| Top-level under GAID/ | `data/` | `raw/` `processing/` `processed/` | `v9/` `v10/` | `raw/` `processing/` `processed/` | `raw/` `processing/` `processed/` `models/` `benchmarks/` `monitoring/` |
| Max depth | 3 | 4 | 3 | 4-5 | 5-6 |
| Data duplication | None | None | All per ver | Minimal | Minimal |
| Pipeline stages | No | Yes | No | Yes | Yes |
| Versioning | No | No | Yes (all) | Yes (processed) | Yes (processed + models) |
| Model backups | No | No | No | No | Yes (.pt .pth .onnx + configs) |
| Benchmarks | No | No | No | No | Yes |
| Model monitoring | No | No | No | No | Yes |
| Best for | Quick setup | Data lineage | Reproducibility | Pipeline + releases | Full MLOps lifecycle |

---

## 3. Key Design Principles

### 3.1 Project-First Hierarchy

Everything for a project lives under `datasets/projects/<PROJECT_NAME>/`. This makes it trivial to:
- Add new projects without polluting existing paths
- Set per-project IAM policies or lifecycle rules
- List all assets for a single project with one `list_objects_v2(prefix=...)`

### 3.2 Label-First Data Split

Data is always split by `real/` vs `fake/` directly under the data folder. This means:
- A single `list_objects_v2(prefix="…/fake/")` returns all fake archives
- The folder name itself is the label — no need to parse filenames or CSVs to know the class
- Training pipelines can download only the label they need

### 3.3 CSVs & Docs at Project Root

Manifests (`csv/`) and documentation (`docs/`) sit at the project root, not buried inside
data folders. Any team member can find them without knowing the data layout.

### 3.4 Immutable Archives

Original archives are never modified after upload. If data needs to be corrected,
upload a new archive with a clear name (e.g. `_v2` suffix or new date stamp).

---

## 4. Migration Plan

### Phase 1: Create New Structure (Non-Destructive)

Copy existing objects to the new key paths. The old keys remain untouched until verified.
Examples below use **Option A** paths; adjust for Option B/C/D as needed.

```bash
EP="--endpoint-url https://s3.us-east-2.wasabisys.com"
NEW="s3://bbvision/datasets/projects/GAID"

# ── Fake archives ──────────────────────────────────────────────────────────
aws s3 cp s3://bbvision/datasets/gen_ai_detector_dataset/genAI/   $NEW/data/fake/genAI/   --recursive $EP
aws s3 cp s3://bbvision/datasets/gen_ai_detector_dataset/genAI_2/ $NEW/data/fake/genAI_2/ --recursive $EP
aws s3 cp s3://bbvision/datasets/gen_ai_detector_dataset/genAI_3/ $NEW/data/fake/genAI_3/ --recursive $EP
aws s3 cp s3://bbvision/datasets/gen_ai_detector_dataset/genAI_4/ $NEW/data/fake/genAI_4/ --recursive $EP
aws s3 cp s3://bbvision/datasets/gen_ai_detector_dataset/genAI_5/ $NEW/data/fake/genAI_5/ --recursive $EP
aws s3 cp s3://bbvision/datasets/gen_ai_detector_dataset/genAI_6.zip $NEW/data/fake/ $EP

aws s3 cp s3://bbvision/datasets/gen_ai_detector_dataset/PubDB_Fake/ \
          $NEW/data/fake/ --recursive $EP

aws s3 cp s3://bbvision/datasets/gen_ai_detector_dataset/ai_image_x_collection_feb25_cleaned.tar.lz4 \
          $NEW/data/fake/ $EP

# Generated samples (fake)
for f in Gen_samples_DALLE_2_300325.tar.lz4 Gen_samples_DALLE_3_300325.tar.lz4 \
         Gen_samples_Gemini_100325.tar.lz4 Gen_samples_Gemini_150325.tar.lz4 \
         Gen_samples_Gemini_190325.tar.gz Gen_samples_Gemini_270325.tar.lz4 \
         Gen_samples_Gemini_280325.tar.lz4 Gen_samples_Grok2_200325.tar.gz \
         Gen_samples_Grok3_160325.tar.lz4 Gen_samples_Grok3_180325.tar.gz \
         Gen_samples_Grok3_220325.tar.gz Gen_samples_GPT_IMAGE_1_070525.tar.lz4; do
  aws s3 cp "s3://bbvision/datasets/GenAI_Image_Database/Generated_Data_2025/$f" \
            "$NEW/data/fake/" $EP
done

# ── Real archives ──────────────────────────────────────────────────────────
aws s3 cp s3://bbvision/datasets/gen_ai_detector_dataset/human/   $NEW/data/real/human/   --recursive $EP
aws s3 cp s3://bbvision/datasets/gen_ai_detector_dataset/human_2/ $NEW/data/real/human_2/ --recursive $EP
aws s3 cp s3://bbvision/datasets/gen_ai_detector_dataset/human_3.zip $NEW/data/real/ $EP

aws s3 cp s3://bbvision/datasets/gen_ai_detector_dataset/PubDB_Real/ \
          $NEW/data/real/ --recursive $EP

aws s3 cp s3://bbvision/datasets/gen_ai_detector_dataset/real_faces_multinational_130325.tar.lz4 \
          $NEW/data/real/ $EP
aws s3 cp s3://bbvision/datasets/gen_ai_detector_dataset/testset/ \
          $NEW/data/real/testset/ --recursive $EP

aws s3 cp s3://bbvision/datasets/GenAI_Image_Database/Generated_Data_2025/selected_real_samples.tar.gz \
          $NEW/data/real/ $EP
aws s3 cp s3://bbvision/datasets/GenAI_Image_Database/Generated_Data_2025/selected_Real_Samples_phase_2.tar.lz4 \
          $NEW/data/real/ $EP

# ── CSVs ───────────────────────────────────────────────────────────────────
aws s3 cp s3://bbvision/datasets/gen_ai_detector_dataset/GAID_Dataset_v9_full_Train.csv $NEW/csv/ $EP
aws s3 cp s3://bbvision/datasets/gen_ai_detector_dataset/GAID_Dataset_v9_full_Val.csv   $NEW/csv/ $EP
```

### Phase 2: Verify Completeness

```python
old_keys = set(k["key"] for k in list_bucket("datasets/gen_ai_detector_dataset/"))
new_keys = set(k["key"] for k in list_bucket("datasets/projects/GAID/"))

print(f"Old: {len(old_keys)} objects")
print(f"New: {len(new_keys)} objects")
print(f"Missing: {old_keys - new_keys}")
```

### Phase 3: Update Notebook Prefixes

Update the download prefixes in `01.wasabi_sync.ipynb`:

```python
# OLD
SOURCE_FOLDER = "datasets/gen_ai_detector_dataset/"

# NEW (Option A — all fake)
SOURCE_FOLDER = "datasets/projects/GAID/data/fake/"

# NEW (Option A — all real)
SOURCE_FOLDER = "datasets/projects/GAID/data/real/"

# NEW (Option B — raw fake)
SOURCE_FOLDER = "datasets/projects/GAID/raw/fake/"

# NEW (Option C — version 9 fake)
SOURCE_FOLDER = "datasets/projects/GAID/v9/fake/"

# NEW (Option D — raw fake, shared)
SOURCE_FOLDER = "datasets/projects/GAID/raw/fake/"

# NEW (Option D — v9 processed fake)
SOURCE_FOLDER = "datasets/projects/GAID/processed/v9/fake/"

# NEW (Option E — same data paths as D, plus benchmark/monitoring prefixes)
SOURCE_FOLDER = "datasets/projects/GAID/raw/fake/"                    # raw data
SOURCE_FOLDER = "datasets/projects/GAID/processed/v10/fake/"          # versioned output
SOURCE_FOLDER = "datasets/projects/GAID/benchmarks/testset_v1/"       # benchmark test set
SOURCE_FOLDER = "datasets/projects/GAID/monitoring/flagged/"          # flagged samples
```

### Phase 4: Delete Old Keys (After Full Verification)

```bash
aws s3 rm s3://bbvision/datasets/gen_ai_detector_dataset/ \
          --recursive --endpoint-url https://s3.us-east-2.wasabisys.com
```

---

## 5. Corresponding Local Structure

After reorganizing the bucket, the local download structure mirrors it.

```
data/
├── csv/                          # Source CSVs (keep as-is)
│
├── wasabi/                       # Downloaded from bucket (mirrors bucket layout)
│   └── projects/
│       └── GAID/
│           ├── data/             # Option A: data/fake/, data/real/
│           │   ├── fake/         # Option B: raw/fake/, processing/fake/, processed/fake/
│           │   └── real/         # Option C: v9/fake/, v9/real/, v10/fake/, v10/real/
│           │                     # Option D: raw/fake/, processing/fake/, processed/v9/fake/
│           │                     # Option E: same as D + benchmarks/ + monitoring/
│           ├── csv/
│           └── docs/
│
└── processed/                    # Locally extracted images (keep existing structure)
    ├── GAID-v9/
    │   ├── csv/
    │   └── charts/
    ├── GAID-v10/
    └── GAID-v9-gen_ai/
```

---

## 6. Mapping: Old Path → New Path

| Old Key | Option A | Option B | Option C | Option D |
|---|---|---|---|---|
| `datasets/gen_ai_detector_dataset/genAI/` | `…/GAID/data/fake/genAI/` | `…/GAID/raw/fake/genAI/` | `…/GAID/v9/fake/genAI/` | `…/GAID/raw/fake/genAI/` |
| `datasets/gen_ai_detector_dataset/human/` | `…/GAID/data/real/human/` | `…/GAID/raw/real/human/` | `…/GAID/v9/real/human/` | `…/GAID/raw/real/human/` |
| `datasets/gen_ai_detector_dataset/PubDB_Fake/` | `…/GAID/data/fake/` | `…/GAID/raw/fake/` | `…/GAID/v9/fake/` | `…/GAID/raw/fake/` |
| `datasets/gen_ai_detector_dataset/PubDB_Real/` | `…/GAID/data/real/` | `…/GAID/raw/real/` | `…/GAID/v9/real/` | `…/GAID/raw/real/` |
| `…/GenAI_Image_Database/…/Gen_samples_Gemini_*.tar.lz4` | `…/GAID/data/fake/` | `…/GAID/raw/fake/` | `…/GAID/v9/fake/` | `…/GAID/raw/fake/` |
| `…/GenAI_Image_Database/…/selected_real_samples.tar.gz` | `…/GAID/data/real/` | `…/GAID/raw/real/` | `…/GAID/v9/real/` | `…/GAID/raw/real/` |
| `datasets/gen_ai_detector_dataset_scaled_224/` | `…/GAID/data/fake/` + `…/data/real/` | `…/GAID/processing/fake/` + `…/processing/real/` | `…/GAID/v9/fake/` + `…/v9/real/` | `…/GAID/processing/fake/` + `…/processing/real/` |
| `Image_Features_DBs/GAID_Image/` | `…/GAID/data/` (or `features/`) | `…/GAID/processed/` | `…/GAID/v9/` | `…/GAID/processed/v9/` |

---

## 7. Future Projects

The `datasets/projects/` structure is designed to grow:

```
bbvision/
└── datasets/
    └── projects/
        ├── GAID/                   ← GenAI Image Detector (current)
        ├── face-recognition/       ← future project
        ├── object-detection-v2/    ← future project
        └── medical-imaging/        ← future project
```

Each new project follows the same convention:

```
# Option A (Simple & Flat)
projects/<PROJECT_NAME>/
├── data/
│   ├── real/
│   └── fake/
├── csv/
└── docs/

# Option B (Pipeline Stages)
projects/<PROJECT_NAME>/
├── raw/
│   ├── real/
│   └── fake/
├── processing/
├── processed/
├── csv/
└── docs/

# Option C (Version-First)
projects/<PROJECT_NAME>/
├── v1/
│   ├── real/
│   └── fake/
├── csv/
└── docs/

# Option D (Pipeline + Versioned Output)
projects/<PROJECT_NAME>/
├── raw/
│   ├── real/
│   └── fake/
├── processing/
│   ├── real/
│   └── fake/
├── processed/
│   ├── v1/
│   │   ├── real/
│   │   └── fake/
│   └── v2/
│       ├── real/
│       └── fake/
├── csv/
└── docs/

# Option E (Full Lifecycle — D + Benchmarks + Monitoring)
projects/<PROJECT_NAME>/
├── raw/
│   ├── real/
│   └── fake/
├── processing/
├── processed/
│   ├── v1/
│   └── v2/
├── benchmarks/
│   ├── testset_v1/
│   │   ├── images/
│   │   └── ground_truth.csv
│   └── results/
├── monitoring/
│   ├── predictions/
│   ├── flagged/
│   ├── drift/
│   └── retraining_candidates/
├── csv/
└── docs/
```
