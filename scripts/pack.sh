#!/usr/bin/env bash
# pack.sh — build a handoff tarball of this repo.
#
# Uses `git archive HEAD` so only tracked files land (no node_modules,
# .worktrees, build output, etc.). Strips instructor-only tracked
# directories from the staged copy (currently just `source/` — the raw
# workbooks). A fresh `Initial commit` by `resume-cicd-lab-bootstrap`
# is seeded inside the staged folder so the recipient's
# `gh repo create --source=. --push` works first try.
#
# Usage:
#   ./scripts/pack.sh                                        # writes ./handoff.tar.gz
#   ./scripts/pack.sh ~/Downloads/handoff.tar.gz             # custom output path
set -euo pipefail

OUT_DEFAULT="$(pwd)/handoff.tar.gz"
OUT="${1:-$OUT_DEFAULT}"
OUT="$(python3 -c "import os,sys; print(os.path.abspath(os.path.expanduser(sys.argv[1])))" "$OUT")"

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

if ! git diff-index --quiet HEAD --; then
  echo "▲ WARN: working tree has uncommitted changes; tar will reflect HEAD, not your in-progress edits." >&2
fi

STAGING="$(mktemp -d)"
trap "rm -rf '$STAGING'" EXIT

STAGE_NAME="resume-cicd-lab"
STAGE_PATH="$STAGING/$STAGE_NAME"
mkdir -p "$STAGE_PATH"

echo "◆ Exporting tracked files via git archive HEAD"
git archive --format=tar HEAD | tar -xf - -C "$STAGE_PATH"

echo "◆ Stripping instructor-only tracked dirs"
rm -rf "$STAGE_PATH/source"

echo "◆ Seeding a fresh initial commit inside the staged copy"
GIT_AUTHOR_NAME=resume-cicd-lab-bootstrap \
GIT_AUTHOR_EMAIL=bootstrap@resume-cicd-lab.local \
GIT_COMMITTER_NAME=resume-cicd-lab-bootstrap \
GIT_COMMITTER_EMAIL=bootstrap@resume-cicd-lab.local \
git -C "$STAGE_PATH" -c init.defaultBranch=main init -b main > /dev/null
git -C "$STAGE_PATH" add . > /dev/null
GIT_AUTHOR_NAME=resume-cicd-lab-bootstrap \
GIT_AUTHOR_EMAIL=bootstrap@resume-cicd-lab.local \
GIT_COMMITTER_NAME=resume-cicd-lab-bootstrap \
GIT_COMMITTER_EMAIL=bootstrap@resume-cicd-lab.local \
git -C "$STAGE_PATH" commit -m "Initial commit" > /dev/null

echo "◆ Taring up"
mkdir -p "$(dirname "$OUT")"
tar -czf "$OUT" -C "$STAGING" "$STAGE_NAME"

SIZE_KB=$(du -k "$OUT" | awk '{print $1}')
echo ""
echo "◇ Handoff tarball ready:"
echo "    $OUT  (${SIZE_KB} KB)"
echo ""
echo "  Ship it to the recipient. Their steps:"
echo "    mkdir -p ~/Projects && tar -xzf $OUT -C ~/Projects"
echo "    cd ~/Projects/$STAGE_NAME"
echo "    gh repo create <owner>/<name> --public --source=. --push"
echo "    pip install --user -r scripts/requirements.txt"
echo "    # Then open docs/en/lab-00-preview.md (or ja / cn-zh)."
echo "    # Lab 3 folds the github.owner/github.repo retarget into its normal config edits."
echo ""
