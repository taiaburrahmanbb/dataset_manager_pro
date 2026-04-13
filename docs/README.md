# Documentation Index

> Dataset Manager Pro — Complete System Documentation
> Last updated: April 13, 2026

---

## Documents

| # | Document | Description |
|---|---|---|
| 1 | [System Overview](system-overview.md) | Architecture, tech stack, project structure, quick start |
| 2 | [Data Organization](data-organization.md) | Current folder layout: `data/wasabi/`, `data/processed/`, `data/csv/` with sizes and file counts |
| 3 | [Bucket Reorganization](bucket-reorganization.md) | Proposed new Wasabi structure: `bbvision/datasets/projects/GAID/` with migration plan |
| 4 | [CSV Reference](csv-reference.md) | All CSV files, schemas, column definitions, pipeline output descriptions |
| 5 | [Notebook Guide](notebook-guide.md) | Usage guide for all 3 notebooks: Wasabi Sync, File Manager, CSV Editors |
| 6 | [Batch Extract Commands](info.txt) | Shell commands for running `batch_extract.py` in background |

---

## Quick Navigation

**Getting started?** Start with [System Overview](system-overview.md).

**Looking for data?** Check [Data Organization](data-organization.md) for where everything lives.

**Planning a restructure?** See [Bucket Reorganization](bucket-reorganization.md) for the proposed `bbvision/datasets/projects/GAID/` layout.

**Working with CSVs?** The [CSV Reference](csv-reference.md) has every file, schema, and column definition.

**Running notebooks?** The [Notebook Guide](notebook-guide.md) has step-by-step instructions for all three notebooks.

---

## Current Storage Summary

| Location | Size |
|---|---|
| Wasabi downloads (`data/wasabi/`) | ~298 GB |
| Extracted images (`data/processed/`) | ~242 GB |
| CSV reports & source manifests | ~1.8 GB |
| **Total local data** | **~540 GB** |
