#!/usr/bin/env bash
# Vendors the API's agentconfig conformance file (pkg/agentconfig/testdata/conformance.json)
# as the UI's fixture, byte for byte. See src/utils/agent-config/__tests__/fixtures/README.md.
#
#   scripts/sync-agentconfig-conformance.sh [ref]          copy api@<ref> (default main) over the fixture
#   scripts/sync-agentconfig-conformance.sh --check [ref]  fail when the fixture differs from api@<ref>;
#                                                         passes with a notice while <ref> has no file (404)
set -euo pipefail

check=false
if [ "${1:-}" = "--check" ]; then
  check=true
  shift
fi
ref="${1:-main}"
url="https://raw.githubusercontent.com/compliance-framework/api/${ref}/pkg/agentconfig/testdata/conformance.json"
fixture="src/utils/agent-config/__tests__/fixtures/agentconfig-conformance.json"
cd "$(dirname "$0")/.."

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
status="$(curl -sSL -o "$tmp" -w '%{http_code}' "$url")"

if [ "$status" = "404" ]; then
  if $check; then
    echo "::notice title=agentconfig conformance::api@${ref} has no pkg/agentconfig/testdata/conformance.json yet; nothing to compare."
    exit 0
  fi
  echo "error: api@${ref} has no pkg/agentconfig/testdata/conformance.json ($url)" >&2
  exit 1
fi
if [ "$status" != "200" ]; then
  echo "error: HTTP $status for $url" >&2
  exit 1
fi

if $check; then
  if cmp -s "$tmp" "$fixture"; then
    echo "$fixture matches api@${ref}."
    exit 0
  fi
  echo "::error file=${fixture}::The vendored conformance file differs from api@${ref}. Run scripts/sync-agentconfig-conformance.sh ${ref}, then fix the conformance cases that fail."
  diff -u "$fixture" "$tmp" || true
  exit 1
fi

cp "$tmp" "$fixture"
echo "Copied api@${ref} to $fixture."
echo "Record the API commit in src/utils/agent-config/__tests__/fixtures/README.md, then run:"
echo "  npx vitest run src/utils/agent-config/__tests__/agentconfig-conformance.spec.ts"
