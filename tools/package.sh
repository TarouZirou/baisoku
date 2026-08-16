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
(cd "$STAGE" && zip -r -q "${OLDPWD}/$ZIP" .)
echo "built $ZIP"

# ---- CRX3 (self-signed, for Vivaldi/Edge/Chromium drag&drop) ----
KEY=".keys/crx3.pem"
[ -f "$KEY" ] || openssl genrsa -out "$KEY" 2048
if cat "$ZIP" | npx -y crx3 -o "dist/baisoku-${VERSION}.crx" -x dist/updates.xml \
    --crxURL "${BASE_URL}/baisoku-${VERSION}.crx" --appVersion "${VERSION}" \
    -p "$KEY"; then
  echo "built dist/baisoku-${VERSION}.crx + dist/updates.xml"
else
  echo "warning: crx3 build failed, skipped CRX" >&2
fi

ls -la dist
