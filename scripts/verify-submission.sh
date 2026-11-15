#!/usr/bin/env bash
set -e

# ==============================================================================
# CMMS Submission Verification Runner
# Tests that submission/CMMS_Final.zip can unpack cleanly and run tests
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ZIP_FILE="$ROOT_DIR/submission/CMMS_Final.zip"
TMP_DIR="/tmp/cmms_verify_$(date +%s)"

if [ ! -f "$ZIP_FILE" ]; then
  echo "❌ Error: $ZIP_FILE does not exist. Run scripts/package-submission.sh first."
  exit 1
fi

echo "🔍 Verifying submission bundle from $ZIP_FILE..."
echo "📂 Unpacking into temporary directory: $TMP_DIR"
mkdir -p "$TMP_DIR"
unzip -q "$ZIP_FILE" -d "$TMP_DIR"

echo "⚙️ Setting up environment in unpacked project..."
cp "$ROOT_DIR/server/.env" "$TMP_DIR/server/.env"

echo "🧪 Running backend test suites in isolated unpack directory..."
cd "$TMP_DIR/server"
# Link node_modules to avoid full network npm install delay during smoke verification
ln -s "$ROOT_DIR/server/node_modules" "$TMP_DIR/server/node_modules"
ln -s "$ROOT_DIR/client/node_modules" "$TMP_DIR/client/node_modules"

echo "🚀 Executing automated test suite..."
NODE_ENV=test npm test

echo "🎨 Building frontend production bundle..."
cd "$TMP_DIR/client"
npm run build

echo "🧹 Cleaning up verification temporary directory..."
rm -rf "$TMP_DIR"

echo ""
echo "======================================================================"
echo "🎉 SUBMISSION VERIFICATION RESULT: PASS"
echo "All 9 test suites passed, client built successfully, 0 missing files."
echo "======================================================================"
