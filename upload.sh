#!/usr/bin/env bash

set -e

# directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SOURCE_DIR="$SCRIPT_DIR/public"
TARGET_DIR="$SCRIPT_DIR/../squanGo/public/draw"

echo "======================================"
echo " Syncing draw-a-squan/public"
echo " -> squanGo/public/draw"
echo "======================================"

# sanity check
if [ ! -d "$SOURCE_DIR" ]; then
    echo "ERROR: Source directory not found:"
    echo "  $SOURCE_DIR"
    exit 1
fi

echo ""
echo "[1/3] Removing old target directory..."
rm -rf "$TARGET_DIR"

echo "[2/3] Recreating target directory..."
mkdir -p "$TARGET_DIR"

echo "[3/3] Copying files..."
cp -r "$SOURCE_DIR"/. "$TARGET_DIR"/

echo ""
echo "Done."