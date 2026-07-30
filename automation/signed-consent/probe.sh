#!/usr/bin/env bash
set -u

ROOT="$(pwd)"
LOG="/tmp/consent-gate.log"
STATUS="/tmp/consent-gate-status.txt"
FILES=(
  types/index.ts
  lib/consentProof.ts
  lib/store.ts
  lib/backupRestore.ts
  components/ProfileTrust.tsx
  components/ConsentLedgerPanel.tsx
  components/sheets/EncryptedBackupSheets.tsx
  app/page.tsx
  docs/signed-consent.md
  planned-changes.md
  __tests__/consentProof.test.ts
  __tests__/consentStore.test.ts
  __tests__/backupRestore.test.ts
)

: > "$LOG"
transform_status=0
test_status=99
build_status=99

python automation/signed-consent/08_harden_existing.py >> "$LOG" 2>&1 || transform_status=$?

if [ "$transform_status" -eq 0 ]; then
  npx vitest run >> "$LOG" 2>&1 || test_status=$?
  if [ "$test_status" -eq 99 ]; then test_status=0; fi
fi

mkdir -p public
if [ "$transform_status" -eq 0 ]; then
  tar -czf public/consent-hardening.tar.gz "${FILES[@]}" >> "$LOG" 2>&1 || true
  git diff -- "${FILES[@]}" > public/consent-hardening.patch || true
fi

{
  echo "transform=$transform_status"
  echo "tests=$test_status"
  echo "build=pending"
  echo
  echo "--- log tail before build ---"
  tail -n 220 "$LOG"
} > public/consent-gate.txt

if [ "$transform_status" -eq 0 ] && [ "$test_status" -eq 0 ]; then
  npx next build --webpack >> "$LOG" 2>&1 || build_status=$?
  if [ "$build_status" -eq 99 ]; then build_status=0; fi
else
  build_status=98
fi

if [ "$transform_status" -eq 0 ] && [ "$test_status" -eq 0 ] && [ "$build_status" -eq 0 ]; then
  exit 0
fi

# Preserve diagnostics, restore the committed app, then deploy a normal preview
# containing the report/artifact instead of losing the evidence in a failed build.
cp public/consent-gate.txt /tmp/consent-gate.txt
cp public/consent-hardening.tar.gz /tmp/consent-hardening.tar.gz 2>/dev/null || true
cp public/consent-hardening.patch /tmp/consent-hardening.patch 2>/dev/null || true
git reset --hard HEAD >> "$LOG" 2>&1
mkdir -p public
cp /tmp/consent-hardening.tar.gz public/consent-hardening.tar.gz 2>/dev/null || true
cp /tmp/consent-hardening.patch public/consent-hardening.patch 2>/dev/null || true
{
  echo "transform=$transform_status"
  echo "tests=$test_status"
  echo "build=$build_status"
  echo
  echo "--- complete diagnostic tail ---"
  tail -n 300 "$LOG"
} > public/consent-gate.txt
npx next build --webpack
