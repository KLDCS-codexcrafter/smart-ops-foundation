#!/usr/bin/env bash
# preflight-head-sync.sh
# Sprint T-Phase-3.PROD-1.T1 · Pass 2 Cleanup pre-flight guard.
#
# Purpose: Abort ST6–ST11 re-execution when the local HEAD SHA does not
# match origin/main. Prevents the "Lovable sandbox vs GitHub mirror drift"
# failure mode that caused the previous PROD-1.T1 sync gap (local
# d2d25fdb vs origin dd1c3a3).
#
# Usage:
#   bash scripts/preflight-head-sync.sh <EXPECTED_SHA>
#   EXPECTED_SHA=dd1c3a3 bash scripts/preflight-head-sync.sh
#
# Exit codes:
#   0  HEADs match expected SHA · safe to proceed
#   1  Mismatch · ABORT execution
#   2  Misuse / git unavailable

set -euo pipefail

EXPECTED_SHA="${1:-${EXPECTED_SHA:-}}"

if ! command -v git >/dev/null 2>&1; then
  echo "[preflight] FATAL: git not available" >&2
  exit 2
fi

if [[ -z "${EXPECTED_SHA}" ]]; then
  echo "[preflight] FATAL: expected SHA not provided" >&2
  echo "  usage: bash scripts/preflight-head-sync.sh <EXPECTED_SHA>" >&2
  exit 2
fi

# Refresh remote refs (best-effort · offline sandbox tolerated)
git fetch origin main --quiet 2>/dev/null || \
  echo "[preflight] WARN: git fetch failed · using cached remote refs" >&2

LOCAL_SHA="$(git rev-parse HEAD 2>/dev/null || echo 'unknown')"
REMOTE_SHA="$(git rev-parse origin/main 2>/dev/null || echo 'unknown')"
SHORT_LOCAL="${LOCAL_SHA:0:7}"
SHORT_REMOTE="${REMOTE_SHA:0:7}"
SHORT_EXPECT="${EXPECTED_SHA:0:7}"

echo "[preflight] expected origin/main : ${SHORT_EXPECT}"
echo "[preflight] actual   origin/main : ${SHORT_REMOTE}"
echo "[preflight] actual   local HEAD  : ${SHORT_LOCAL}"

fail=0
if [[ "${SHORT_LOCAL}" != "${SHORT_EXPECT}" ]]; then
  echo "[preflight] ❌ local HEAD ${SHORT_LOCAL} != expected ${SHORT_EXPECT}" >&2
  fail=1
fi
if [[ "${SHORT_REMOTE}" != "${SHORT_EXPECT}" ]]; then
  echo "[preflight] ❌ origin/main ${SHORT_REMOTE} != expected ${SHORT_EXPECT}" >&2
  fail=1
fi
if [[ "${SHORT_LOCAL}" != "${SHORT_REMOTE}" ]]; then
  echo "[preflight] ❌ local HEAD and origin/main are out of sync" >&2
  echo "[preflight]    this is the Lovable→GitHub mirror drift failure mode" >&2
  fail=1
fi

if [[ ${fail} -ne 0 ]]; then
  echo "[preflight] ABORT ST6–ST11 execution · resolve sync before retrying" >&2
  exit 1
fi

echo "[preflight] ✅ HEAD sync verified · safe to proceed with ST6–ST11"
exit 0
