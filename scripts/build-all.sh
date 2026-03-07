#!/bin/bash
set -e

VERSION=$(node -p "require('./package.json').version")
OUT_DIR="./dist"

echo "🐙 Octo CLI — Build v$VERSION"
echo "================================"
echo ""

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

TARGETS=(
  "bun-darwin-arm64:octo-macos-arm64"
  "bun-darwin-x64:octo-macos-x64"
  "bun-linux-x64:octo-linux-x64"
  "bun-linux-arm64:octo-linux-arm64"
  "bun-windows-x64:octo-windows-x64.exe"
)

for entry in "${TARGETS[@]}"; do
  TARGET="${entry%%:*}"
  OUTFILE="${entry##*:}"

  echo "⚙️  Building $OUTFILE ($TARGET)..."
  bun build ./src/index.ts --compile --target="$TARGET" --outfile "$OUT_DIR/$OUTFILE" 2>&1 || {
    echo "⚠️  Failed: $TARGET (skipping)"
    continue
  }
  echo "✅ $OUTFILE"
done

echo ""
echo "🎉 Build complete! Binaries in $OUT_DIR/"
ls -lh "$OUT_DIR/"
