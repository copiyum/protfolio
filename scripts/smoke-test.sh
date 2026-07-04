#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-https://sarang.dev}"
MAX_RETRIES=12
RETRY_DELAY=10

echo "=== Smoke Testing ${BASE_URL} ==="

# Wait for site to be up
echo "Waiting for site to come up..."
for i in $(seq 1 "${MAX_RETRIES}"); do
  status=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/" 2>/dev/null || true)
  if [ "${status}" = "200" ]; then
    echo "Site is up (200) after ~$((i * RETRY_DELAY))s"
    break
  fi
  if [ "${i}" = "${MAX_RETRIES}" ]; then
    echo "ERROR: Site did not come up after ${MAX_RETRIES} attempts"
    exit 1
  fi
  echo "  Attempt ${i}: got ${status}, waiting ${RETRY_DELAY}s..."
  sleep "${RETRY_DELAY}"
done

failures=0

check_page() {
  local path="$1"
  local label="$2"
  local expected="$3"
  local url="${BASE_URL}${path}"
  local body
  body=$(curl -sf "${url}" 2>/dev/null || true)
  if [ -z "${body}" ]; then
    echo "  FAIL: ${path} (${label}) — no response"
    failures=$((failures + 1))
    return
  fi
  if ! echo "${body}" | grep -i "${expected}" > /dev/null; then
    echo "  FAIL: ${path} (${label}) — missing expected content"
    failures=$((failures + 1))
    return
  fi
  echo "  OK:   ${path} (${label})"
}

check_json() {
  local path="$1"
  local url="${BASE_URL}${path}"
  local body
  body=$(curl -sf "${url}" 2>/dev/null || true)
  if [ -z "${body}" ]; then
    echo "  WARN: ${path} — no response (external dependency)"
    return
  fi
  if ! echo "${body}" | python3 -c "import json,sys; json.load(sys.stdin)" 2>/dev/null; then
    echo "  WARN: ${path} — invalid JSON (external dependency)"
    return
  fi
  echo "  OK:   ${path} (valid JSON)"
}

# Public pages
check_page "/" "Home" "Sarang"
check_page "/projects" "Projects" "project"
check_page "/blog" "Blog" "blog"
check_page "/privacy" "Privacy" "privacy"
check_page "/visitors" "Visitors" "visitor"

# API endpoints
check_json "/api/now-playing"
check_json "/api/visitor-notes"

echo ""
if [ "${failures}" -gt 0 ]; then
  echo "=== SMOKE TEST FAILED: ${failures} failure(s) ==="
  exit 1
fi
echo "=== SMOKE TEST PASSED ==="
