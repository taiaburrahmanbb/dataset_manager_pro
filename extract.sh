#!/usr/bin/env bash
set -euo pipefail

usage() {
    echo "Usage: $0 <source_dir> <dest_dir> [--dry-run]"
    echo
    echo "Extract all archives (.zip, .tar.gz, .tar.bz2, .tar.xz, .tar.lz4, .gz, .7z)"
    echo "found in <source_dir> into <dest_dir>."
    echo
    echo "Options:"
    echo "  --dry-run    Show what would be extracted without doing it"
    exit 1
}

[[ $# -lt 2 ]] && usage

SRC_DIR="$1"
DEST_DIR="$2"
DRY_RUN=false
[[ "${3:-}" == "--dry-run" ]] && DRY_RUN=true

if [[ ! -d "$SRC_DIR" ]]; then
    echo "Error: source directory '$SRC_DIR' does not exist."
    exit 1
fi

mkdir -p "$DEST_DIR"

TOTAL=0
SUCCESS=0
FAILED=0

extract_file() {
    local file="$1"
    local name
    name="$(basename "$file")"
    local stem="$name"
    stem="${stem%.lz4}"
    stem="${stem%.gz}"
    stem="${stem%.bz2}"
    stem="${stem%.xz}"
    stem="${stem%.tar}"
    stem="${stem%.tgz}"
    stem="${stem%.tbz2}"
    stem="${stem%.txz}"
    stem="${stem%.zip}"
    stem="${stem%.7z}"
    local out_dir="$DEST_DIR/$stem"

    echo "----------------------------------------"
    echo "Extracting: $name"

    if $DRY_RUN; then
        echo "  [dry-run] Would extract to: $out_dir"
        return 0
    fi

    mkdir -p "$out_dir"

    case "$file" in
        *.zip)
            unzip -qo "$file" -d "$out_dir"
            ;;
        *.tar.gz|*.tgz)
            tar -xzf "$file" -C "$out_dir"
            ;;
        *.tar.bz2|*.tbz2)
            tar -xjf "$file" -C "$out_dir"
            ;;
        *.tar.xz|*.txz)
            tar -xJf "$file" -C "$out_dir"
            ;;
        *.tar.lz4)
            lz4 -dc "$file" | tar -xf - -C "$out_dir"
            ;;
        *.gz)
            gunzip -ck "$file" > "$out_dir/$name"
            ;;
        *.7z)
            7z x "$file" -o"$out_dir" -y > /dev/null
            ;;
        *)
            echo "  Skipping unknown format: $name"
            return 1
            ;;
    esac
}

for file in "$SRC_DIR"/*; do
    [[ -d "$file" ]] && continue

    case "$file" in
        *.zip|*.tar.gz|*.tgz|*.tar.bz2|*.tbz2|*.tar.xz|*.txz|*.tar.lz4|*.gz|*.7z)
            TOTAL=$((TOTAL + 1))
            if extract_file "$file"; then
                echo "  Done."
                SUCCESS=$((SUCCESS + 1))
            else
                echo "  FAILED."
                FAILED=$((FAILED + 1))
            fi
            ;;
    esac
done

echo "========================================"
echo "Extraction complete."
echo "  Total archives: $TOTAL"
echo "  Succeeded:      $SUCCESS"
echo "  Failed:         $FAILED"
