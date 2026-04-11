#!/usr/bin/env sh
# Usage: ./scripts/apply-blog-json.sh /path/to/downloaded-blog-posts.json
# Copies into repo and stages for commit.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:?Pass path to blog-posts.json (e.g. ~/Downloads/blog-posts.json)}"
DEST="$ROOT/data/blog-posts.json"
cp "$SRC" "$DEST"
echo "Updated: $DEST"
echo "Next: git add data/blog-posts.json && git commit -m \"Update blog\" && git push"
