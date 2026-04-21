#!/usr/bin/env bash
# rebuild-public-template.sh — publish (or re-publish) this private repo as the
# public GitHub template students clone via `gh repo create --template ...`.
#
# Run it after merging doc / script improvements into this repo's main, and the
# public template gets force-pushed to match HEAD. Existing students' repos
# were already independent copies when they created them, so they're unaffected;
# future `gh repo create --template` calls get the new content.
#
# What it does:
#   1. git archive HEAD → staging dir (tracked files only, no worktree pollution)
#   2. Strip packager-only content (source/ — private resume workbooks)
#   3. Retarget PRIVATE_SLUG → PUBLIC_SLUG across READMEs, claim.py TEMPLATE_SLUG,
#      and config/project-setup.json's github.owner/repo
#   4. Seed a fresh "Initial commit" by resume-cicd-lab-bootstrap
#   5. If public repo exists: force-push main. Else: gh repo create --public --push.
#   6. gh api PATCH /repos/$PUBLIC_SLUG -f is_template=true
#
# Usage:
#   ./scripts/rebuild-public-template.sh                 # publish
#   ./scripts/rebuild-public-template.sh --dry-run       # stage + show diff, skip publish
#
# Env overrides (for forks or testing):
#   PUBLIC_SLUG   — default: shiicho/resume-cicd-lab-goushuukai-template
#   PRIVATE_SLUG  — default: shiicho/resume-cicd-lab
#
# Prereqs:
#   - `gh` authenticated with admin rights on the public repo (create + push + patch)
#   - `jq`, `python3` on PATH
#   - clean-ish working tree (HEAD is what gets published; uncommitted changes ignored)

set -euo pipefail

PUBLIC_SLUG="${PUBLIC_SLUG:-shiicho/resume-cicd-lab-goushuukai-template}"
PRIVATE_SLUG="${PRIVATE_SLUG:-shiicho/resume-cicd-lab}"
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    --dry-run|-n) DRY_RUN=1 ;;
    -h|--help)
      sed -n '2,30p' "$0"; exit 0 ;;
    *) echo "unknown arg: $arg (try --help)"; exit 2 ;;
  esac
done

# ── Preflight ──────────────────────────────────────────────────────────────
command -v gh       >/dev/null || { echo "✘ gh not found on PATH"; exit 1; }
command -v jq       >/dev/null || { echo "✘ jq not found on PATH"; exit 1; }
command -v python3  >/dev/null || { echo "✘ python3 not found on PATH"; exit 1; }
gh auth status -h github.com >/dev/null 2>&1 \
  || { echo "✘ gh not authenticated (run: gh auth login)"; exit 1; }

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

if ! git diff-index --quiet HEAD --; then
  echo "▲ WARN: working tree has uncommitted changes — publish will use HEAD, not your in-progress edits." >&2
fi

HEAD_SHA="$(git rev-parse --short HEAD)"
HEAD_MSG="$(git log -1 --pretty=%s HEAD)"

echo "◆ Rebuild public template"
echo "  Source:  $(git remote get-url origin 2>/dev/null || echo '(no origin)') @ $HEAD_SHA"
echo "           $HEAD_MSG"
echo "  Target:  https://github.com/$PUBLIC_SLUG"
echo "  Slug:    $PRIVATE_SLUG → $PUBLIC_SLUG"
[ "$DRY_RUN" = "1" ] && echo "  Mode:    DRY RUN (will stage and stop before pushing)"
echo ""

# ── Stage ──────────────────────────────────────────────────────────────────
STAGING="$(mktemp -d)"
if [ "$DRY_RUN" = "1" ]; then
  # Keep staging for inspection
  echo "◆ Staging at $STAGING (kept on dry run)"
else
  trap "rm -rf '$STAGING'" EXIT
  echo "◆ Staging at $STAGING (removed on exit)"
fi

echo "◆ git archive HEAD → staging"
git archive HEAD | tar -x -C "$STAGING"

echo "◆ Curate source/ — keep example resume assets, drop everything else"
# git archive only brings TRACKED files; we also want the gitignored Icon-package
# zip to ride along with the public template so students have the example assets.
# Easiest path: wipe the staged source/ and re-copy a whitelist from the working
# tree (which has the gitignored binaries).
rm -rf "$STAGING/source"
mkdir -p "$STAGING/source"
for pattern in "職務経歴書_吴秋海.xlsx" "20.面试常见问题.xlsx" "Icon-package_*.zip"; do
  for f in source/$pattern; do
    if [ -e "$f" ]; then
      cp "$f" "$STAGING/source/" && echo "  kept: source/$(basename "$f")"
    fi
  done
done
# Strip macOS metadata that may have tagged along on cp.
find "$STAGING/source" -name '.DS_Store' -delete 2>/dev/null || true
if [ -z "$(ls -A "$STAGING/source" 2>/dev/null)" ]; then
  echo "  (no source/ files matched the keep-list — public template ships without source/)"
  rmdir "$STAGING/source"
fi

echo "◆ Strip private diagram sources — ship rendered PNGs only"
# Drop every editable file at the top of docs/diagrams/ (drawio, mmd,
# render.sh, README.md, and anything else added later). The images/
# subdir survives because -maxdepth 1 limits to files directly in
# docs/diagrams/, not recursing into images/. Attribution lines that
# referenced these sources are stripped from the concept/lab docs by
# the Python block below.
if [ -d "$STAGING/docs/diagrams" ]; then
  count=$(find "$STAGING/docs/diagrams" -maxdepth 1 -type f | wc -l | tr -d ' ')
  if [ "$count" != "0" ]; then
    find "$STAGING/docs/diagrams" -maxdepth 1 -type f -print -delete | sed 's|^|  dropped: |'
  else
    echo "  (no source files to strip — already clean?)"
  fi
fi

echo "◆ Strip private webapp design docs (app/docs/ is instructor-only)"
# The app/docs/ dir holds the redesign plan, design-decisions notes, and
# other internal planning material. These are useful for maintainers of
# this private repo but shouldn't leak into the public student template.
if [ -d "$STAGING/app/docs" ]; then
  count=$(find "$STAGING/app/docs" -type f | wc -l | tr -d ' ')
  rm -rf "$STAGING/app/docs"
  echo "  dropped: app/docs/ ($count file(s))"
fi

echo "◆ Retarget slug references ($PRIVATE_SLUG → $PUBLIC_SLUG)"
python3 - "$STAGING" "$PRIVATE_SLUG" "$PUBLIC_SLUG" <<'PYEOF'
import json, pathlib, re, sys
staging = pathlib.Path(sys.argv[1])
private = sys.argv[2]
public = sys.argv[3]
new_owner, new_repo = public.split("/", 1)

touched = []

# Strip the "> **Source**: ..." attribution line from any doc that
# references an editable diagram source. The private template ships
# with editable diagram sources + a pointer line; the public template
# ships the PNG only, so the pointer would dangle. Three locales
# (en / ja / cn-zh) use localized bold markers (Source / ソース / 源文件).
# The regex requires the line to also reference `diagrams/` so it only
# matches diagram-attribution lines (not generic "Source:" blockquotes).
source_line_re = re.compile(
    r'^\s*> \*\*(?:Source|ソース|源文件)\*\*[^\n]*diagrams/[^\n]*\n',
    re.MULTILINE,
)
for md_path in sorted(staging.glob("docs/**/*.md")):
    original = md_path.read_text(encoding="utf-8")
    updated = source_line_re.sub("", original)
    if updated != original:
        md_path.write_text(updated, encoding="utf-8")
        rel = md_path.relative_to(staging)
        touched.append(f"  - {rel}: stripped diagram Source line")

# READMEs — every badge URL + callout reference
for name in ("README.md", "README.ja.md", "README.cn-zh.md"):
    p = staging / name
    if p.exists():
        original = p.read_text(encoding="utf-8")
        updated = original.replace(private, public)
        if updated != original:
            p.write_text(updated, encoding="utf-8")
            n = original.count(private)
            touched.append(f"  - {name}: {n} occurrence(s)")

# claim.py TEMPLATE_SLUG constant
p = staging / "scripts" / "claim.py"
if p.exists():
    original = p.read_text(encoding="utf-8")
    updated = original.replace(
        f'TEMPLATE_SLUG = "{private}"',
        f'TEMPLATE_SLUG = "{public}"',
    )
    if updated != original:
        p.write_text(updated, encoding="utf-8")
        touched.append("  - scripts/claim.py: TEMPLATE_SLUG constant")

# config/project-setup.json github.owner + github.repo
p = staging / "config" / "project-setup.json"
if p.exists():
    d = json.loads(p.read_text(encoding="utf-8"))
    gh = d.get("github", {})
    if f"{gh.get('owner','')}/{gh.get('repo','')}" == private:
        gh["owner"] = new_owner
        gh["repo"] = new_repo
        p.write_text(json.dumps(d, indent=2) + "\n", encoding="utf-8")
        touched.append("  - config/project-setup.json: github.owner + github.repo")

print("\n".join(touched) if touched else "  (nothing matched — slug already retargeted?)")
PYEOF

echo "◆ Seed fresh Initial commit by resume-cicd-lab-bootstrap"
cd "$STAGING"
export GIT_AUTHOR_NAME=resume-cicd-lab-bootstrap
export GIT_AUTHOR_EMAIL=bootstrap@resume-cicd-lab.local
export GIT_COMMITTER_NAME=resume-cicd-lab-bootstrap
export GIT_COMMITTER_EMAIL=bootstrap@resume-cicd-lab.local
git -c init.defaultBranch=main init -b main >/dev/null
git add .
git commit -q -m "Initial commit"
cd "$REPO_ROOT"
unset GIT_AUTHOR_NAME GIT_AUTHOR_EMAIL GIT_COMMITTER_NAME GIT_COMMITTER_EMAIL

TOTAL_FILES=$(find "$STAGING" -type f ! -path '*/.git/*' | wc -l | tr -d ' ')
echo "  Staged: $TOTAL_FILES files"

# ── Dry run stops here ─────────────────────────────────────────────────────
if [ "$DRY_RUN" = "1" ]; then
  echo ""
  echo "◇ Dry run complete."
  echo "  Staged at:   $STAGING"
  echo "  Inspect:     ls -la $STAGING ; cd $STAGING && git log --stat"
  echo "  Clean up:    rm -rf $STAGING"
  exit 0
fi

# ── Publish ────────────────────────────────────────────────────────────────
cd "$STAGING"

if gh api "/repos/$PUBLIC_SLUG" >/dev/null 2>&1; then
  echo "◆ $PUBLIC_SLUG exists — force-push main"
  git remote add origin "https://github.com/$PUBLIC_SLUG.git"
  git push -f origin main
  echo "◆ Ensure is_template flag is set"
  gh api -X PATCH "/repos/$PUBLIC_SLUG" -f is_template=true >/dev/null
else
  echo "◆ $PUBLIC_SLUG does not exist — create + push"
  gh repo create "$PUBLIC_SLUG" --public \
    --description "Public GitHub template for the resume-cicd-lab teaching course. Create your own copy via 'gh repo create <name> --template $PUBLIC_SLUG --public --clone'." \
    --source=. --push >/dev/null
  echo "◆ Set is_template flag"
  gh api -X PATCH "/repos/$PUBLIC_SLUG" -f is_template=true >/dev/null
fi

cd "$REPO_ROOT"

echo ""
echo "◇ Public template published:"
echo "  https://github.com/$PUBLIC_SLUG"
echo ""
echo "  Students clone via:"
echo "    gh repo create <owner>/<name> --template $PUBLIC_SLUG --public --clone"
