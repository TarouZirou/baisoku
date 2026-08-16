#!/bin/sh
# Build distributable packages for baisoku.
#   dist/baisoku-<ver>.zip       -> Chrome Web Store / AMO upload, Vivaldi "load unpacked"
#   dist/baisoku-<ver>.crx       -> Vivaldi / Edge / Chromium drag&drop install
#   dist/updates.xml             -> enterprise update manifest (self-hosted CRX)
set -eu

cd "$(dirname "$0")/.."

VERSION=$(python3 -c "import json; print(json.load(open('manifest.json'))['version'])")
BASE_URL=${BASE_URL:-"https://github.com/TarouZirou/baisoku/releases/download/v${VERSION}"}
rm -rf dist
mkdir -p dist .keys

# ---- stage extension files from git (respects repo, excludes dev files) ----
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
git archive --format=tar HEAD | tar -xf - -C "$STAGE"
rm -rf "$STAGE/tools" "$STAGE/.gitignore"

# ---- store zip ----
ZIP="dist/baisoku-${VERSION}.zip"
(cd "$STAGE" && zip -r -q "../$ZIP" .)
echo "built $ZIP"

# ---- CRX3 (self-signed, for Vivaldi/Edge/Chromium drag&drop) ----
if npx -y crx3 --help >/dev/null 2>&1; then
  KEY=".keys/crx3.pem"
  [ -f "$KEY" ] || openssl genrsa -out "$KEY" 2048
  npx -y crx3 -o "dist/baisoku-${VERSION}.crx" -x dist/updates.xml \
      --crx-url "${BASE_URL}/baisoku-${VERSION}.crx" -p "$KEY" "$STAGE"
  echo "built dist/baisoku-${VERSION}.crx + dist/updates.xml"
else
  echo "warning: crx3 unavailable, skipped CRX build" >&2
fi

ls -la dist
