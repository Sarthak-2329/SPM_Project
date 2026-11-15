#!/usr/bin/env bash
set -e

# ==============================================================================
# CMMS Packaging Script for Evaluator Submission
# Excludes everything listed in _not_for_submission/EXCLUDE_MANIFEST.md
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="$ROOT_DIR/submission"
ZIP_FILE="$OUTPUT_DIR/CMMS_Final.zip"

echo "📦 Packaging Campus CMMS for Final Submission..."
mkdir -p "$OUTPUT_DIR"
rm -f "$ZIP_FILE"

cd "$ROOT_DIR"

# Build zip excluding regenerable, secret, and non-submission directories
zip -r "$ZIP_FILE" . \
  -x "node_modules/*" \
  -x "*/node_modules/*" \
  -x "client/dist/*" \
  -x "client/dist" \
  -x "server/dist/*" \
  -x "server/dist" \
  -x "server/uploads/assets/*" \
  -x "server/uploads/qrcodes/*" \
  -x "server/.env" \
  -x "client/.env" \
  -x ".env" \
  -x "_not_for_submission/*" \
  -x "_not_for_submission" \
  -x "submission/*" \
  -x "submission" \
  -x ".git/*" \
  -x ".git" \
  -x ".vscode/*" \
  -x ".idea/*" \
  -x "*.log" \
  -x "coverage/*" \
  -x ".DS_Store" \
  -x "Thumbs.db" \
  -x ".gemini/*" \
  -x ".agent/*" > /dev/null

echo "✅ Submission zip archive created: $ZIP_FILE"
echo "📊 Archive Size: $(du -h "$ZIP_FILE" | cut -f1)"
echo ""
echo "🗂️ Archive Contents Overview:"
unzip -l "$ZIP_FILE" | head -n 40
echo "... (archive contains $(unzip -l "$ZIP_FILE" | wc -l) files/entries)"
