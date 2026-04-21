#!/usr/bin/env bash
# resume-cicd-lab — pipeline traffic watcher.
#
# Renders a "release travel" view that pulls together the pieces scattered
# across git, GitHub, and AWS manifests:
#
#   1. per-environment release state (deploy/static/<env>/site.json and
#      deploy/ecs/<env>/task-definition.json)
#   2. shared artifact bucket + ECR repo (deploy/shared/delivery.json)
#   3. open PRs relevant to the lab (gh pr list)
#   4. recent workflow runs with pass/fail glyphs (gh run list)
#
# Auto-refreshes every ${REFRESH_SECONDS:-30} seconds. Pass --once for a
# single snapshot. Ctrl-C to exit the loop.
#
# Hard dependencies: bash, gh (authenticated), jq, git.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

REFRESH_SECONDS="${REFRESH_SECONDS:-30}"
ENVIRONMENTS=("development" "staging" "production")

# ---------------------------------------------------------------------------
# Color palette — auto-disables when stdout isn't a TTY (CI, piped output).
# ---------------------------------------------------------------------------

if [[ -t 1 ]]; then
  BOLD=$'\033[1m'
  DIM=$'\033[2m'
  RED=$'\033[31m'
  GREEN=$'\033[32m'
  YELLOW=$'\033[33m'
  CYAN=$'\033[36m'
  RESET=$'\033[0m'
else
  BOLD=""; DIM=""; RED=""; GREEN=""; YELLOW=""; CYAN=""; RESET=""
fi

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

die() {
  printf '%s■%s %s\n' "${RED}" "${RESET}" "$1" >&2
  exit "${2:-2}"
}

require_tool() {
  local name="$1"
  if ! command -v "${name}" >/dev/null 2>&1; then
    die "${name} not on PATH. Install it (see Lab 2) and try again."
  fi
}

# Return first matching jq query on a file, or the fallback if the file
# doesn't exist or the query returns null / empty.
jq_or() {
  local file="$1" query="$2" fallback="$3"
  if [[ ! -f "${file}" ]]; then
    printf '%s' "${fallback}"
    return
  fi
  local value
  value="$(jq -r "${query} // empty" "${file}" 2>/dev/null || true)"
  if [[ -z "${value}" ]]; then
    printf '%s' "${fallback}"
  else
    printf '%s' "${value}"
  fi
}

# ---------------------------------------------------------------------------
# Sections
# ---------------------------------------------------------------------------

render_header() {
  local now
  now="$(date '+%Y-%m-%d %H:%M:%S')"
  printf '%s┌%s  resume-cicd-lab — release travel\n' "${BOLD}" "${RESET}"
  printf '%s│%s  last refresh: %s · auto-refresh every %ss · ^C to exit\n' \
    "${DIM}" "${RESET}" "${now}" "${REFRESH_SECONDS}"
  printf '%s└%s\n\n' "${DIM}" "${RESET}"
}

render_environments() {
  printf '%s◆  Environments%s\n' "${BOLD}${CYAN}" "${RESET}"
  local env site_path task_path version git_sha artifact_key image_digest short_digest
  for env in "${ENVIRONMENTS[@]}"; do
    site_path="${ROOT}/deploy/static/${env}/site.json"
    task_path="${ROOT}/deploy/ecs/${env}/task-definition.json"
    if [[ ! -f "${site_path}" ]]; then
      printf '   %s%-12s%s  %s(not configured — no deploy/static/%s/site.json)%s\n' \
        "${BOLD}" "${env}" "${RESET}" "${DIM}" "${env}" "${RESET}"
      continue
    fi
    version="$(jq_or "${site_path}" '.release.version' '?')"
    git_sha="$(jq_or "${site_path}" '.release.gitSha' '?')"
    artifact_key="$(jq_or "${site_path}" '.artifactKey' '?')"
    image_digest="$(jq_or "${task_path}" '.containerDefinitions[0].image' '?')"
    if [[ "${image_digest}" == *"@sha256:"* ]]; then
      short_digest="${image_digest##*@}"
      short_digest="${short_digest:0:19}…"
    else
      short_digest="${DIM}(no-digest)${RESET}"
    fi
    printf '   %s%-12s%s  v%-8s  %s%-12s%s  %s\n' \
      "${BOLD}" "${env}" "${RESET}" \
      "${version}" \
      "${DIM}" "${git_sha:0:12}" "${RESET}" \
      "${short_digest}"
    printf '   %s  %s↳ artifactKey:%s %s\n' \
      " "  \
      "${DIM}" "${RESET}" \
      "${artifact_key}"
  done
  printf '\n'
}

render_shared_artifacts() {
  local delivery="${ROOT}/deploy/shared/delivery.json"
  printf '%s◆  Shared artifacts%s\n' "${BOLD}${CYAN}" "${RESET}"
  if [[ ! -f "${delivery}" ]]; then
    printf '   %s(not configured — run setup_repo.py apply in Lab 3)%s\n\n' "${DIM}" "${RESET}"
    return 0
  fi
  local bucket ecr
  bucket="$(jq_or "${delivery}" '.artifactBucket' '?')"
  ecr="$(jq_or "${delivery}" '.ecrRepositoryUri' '?')"
  printf '   S3 bucket:  %s\n' "${bucket}"
  printf '   ECR repo:   %s\n\n' "${ecr}"
}

render_open_prs() {
  printf '%s◆  Open PRs%s\n' "${BOLD}${CYAN}" "${RESET}"
  local prs_json
  if ! prs_json="$(gh pr list --state open --limit 10 \
    --json number,title,isDraft,headRefName,labels 2>/dev/null)"; then
    printf '   %s(gh pr list failed — is this a GitHub repo and `gh auth` ok?)%s\n\n' \
      "${DIM}" "${RESET}"
    return 0
  fi
  local count
  count="$(jq 'length' <<<"${prs_json}")"
  if [[ "${count}" == "0" ]]; then
    printf '   %s(no open PRs)%s\n\n' "${DIM}" "${RESET}"
    return 0
  fi
  local line
  while IFS= read -r line; do
    local num draft branch title labels draft_tag labels_tag
    num="$(jq -r '.number' <<<"${line}")"
    draft="$(jq -r '.isDraft' <<<"${line}")"
    branch="$(jq -r '.headRefName' <<<"${line}")"
    title="$(jq -r '.title' <<<"${line}")"
    labels="$(jq -r '[.labels[].name] | join(",")' <<<"${line}")"
    draft_tag=""
    [[ "${draft}" == "true" ]] && draft_tag=" ${YELLOW}[DRAFT]${RESET}"
    labels_tag=""
    if [[ -n "${labels}" ]]; then
      labels_tag="  ${DIM}(${labels})${RESET}"
    fi
    printf '   #%s%s  %s%-32s%s  %s%s\n' \
      "${num}" "${draft_tag}" "${DIM}" "${branch:0:32}" "${RESET}" "${title}" "${labels_tag}"
  done < <(jq -c '.[]' <<<"${prs_json}")
  printf '\n'
}

render_recent_runs() {
  printf '%s◆  Recent workflow runs%s\n' "${BOLD}${CYAN}" "${RESET}"
  local runs_json
  if ! runs_json="$(gh run list --limit 8 \
    --json status,conclusion,workflowName,headBranch,createdAt 2>/dev/null)"; then
    printf '   %s(gh run list failed)%s\n\n' "${DIM}" "${RESET}"
    return 0
  fi
  local count
  count="$(jq 'length' <<<"${runs_json}")"
  if [[ "${count}" == "0" ]]; then
    printf '   %s(no runs yet)%s\n\n' "${DIM}" "${RESET}"
    return 0
  fi
  local line
  while IFS= read -r line; do
    local status conclusion workflow branch created short_date glyph
    status="$(jq -r '.status' <<<"${line}")"
    conclusion="$(jq -r '.conclusion // "-"' <<<"${line}")"
    workflow="$(jq -r '.workflowName' <<<"${line}")"
    branch="$(jq -r '.headBranch' <<<"${line}")"
    created="$(jq -r '.createdAt' <<<"${line}")"
    short_date="${created:0:10} ${created:11:5}"
    case "${status}:${conclusion}" in
      completed:success)     glyph="${GREEN}✓${RESET}" ;;
      completed:failure)     glyph="${RED}✗${RESET}" ;;
      completed:cancelled)   glyph="${DIM}⊘${RESET}" ;;
      completed:*)           glyph="${DIM}?${RESET}" ;;
      in_progress:*)         glyph="${CYAN}●${RESET}" ;;
      queued:*|requested:*)  glyph="${YELLOW}○${RESET}" ;;
      *)                     glyph=" " ;;
    esac
    printf '   %s  %s%-16s%s  %-24s  %s%s%s\n' \
      "${glyph}" \
      "${DIM}" "${short_date}" "${RESET}" \
      "${workflow:0:24}" \
      "${DIM}" "${branch:0:32}" "${RESET}"
  done < <(jq -c '.[]' <<<"${runs_json}")
  printf '\n'
}

render_footer() {
  printf '%s(Ctrl-C to quit · pass --once to render without the refresh loop)%s\n' \
    "${DIM}" "${RESET}"
}

render_once() {
  render_header
  render_environments
  render_shared_artifacts
  render_open_prs
  render_recent_runs
  render_footer
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

usage() {
  cat <<EOF
Usage: ./scripts/watch-pipeline.sh [--once]

Render a "release travel" view joining per-environment manifests, open PRs,
and recent workflow runs. Loops with a ${REFRESH_SECONDS}s refresh by default
(override with REFRESH_SECONDS=<n>); pass --once to render a single snapshot.

Requires: bash, gh (authenticated), jq, git.
EOF
}

main() {
  local once="false"
  for arg in "$@"; do
    case "${arg}" in
      --once)    once="true" ;;
      -h|--help) usage; exit 0 ;;
      *)         printf 'unknown argument: %s\n\n' "${arg}" >&2; usage >&2; exit 2 ;;
    esac
  done

  require_tool git
  require_tool gh
  require_tool jq

  if [[ "${once}" == "true" ]]; then
    render_once
    return 0
  fi

  trap 'printf "\n"; exit 0' INT TERM
  while true; do
    clear
    render_once
    sleep "${REFRESH_SECONDS}"
  done
}

main "$@"
