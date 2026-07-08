#!/usr/bin/env bash

set -euo pipefail

launcher="${1:-$HOME/.local/bin/claude}"
binary="$(python3 -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "$launcher")"
version="$($binary --version | awk '{print $1}')"
platform="darwin-arm64"
manifest_url="https://downloads.claude.ai/claude-code-releases/$version/manifest.json"

printf 'launcher\t%s\n' "$launcher"
printf 'binary\t%s\n' "$binary"
printf 'version\t%s\n' "$($binary --version)"
printf 'file\t%s\n' "$(file "$binary")"
printf 'size\t%s\n' "$(stat -f '%z' "$binary")"

actual_sha="$(shasum -a 256 "$binary" | awk '{print $1}')"
manifest="$(curl -fsSL "$manifest_url")"
expected_sha="$(jq -r ".platforms[\"$platform\"].checksum" <<<"$manifest")"
expected_size="$(jq -r ".platforms[\"$platform\"].size" <<<"$manifest")"

printf 'sha256\t%s\n' "$actual_sha"
printf 'manifest_url\t%s\n' "$manifest_url"
printf 'manifest_sha256\t%s\n' "$expected_sha"
printf 'manifest_size\t%s\n' "$expected_size"

if [[ "$actual_sha" != "$expected_sha" ]]; then
  printf 'manifest_match\tfalse\n' >&2
  exit 1
fi
if [[ "$(stat -f '%z' "$binary")" != "$expected_size" ]]; then
  printf 'size_match\tfalse\n' >&2
  exit 1
fi

codesign --verify --deep --strict "$binary"
printf 'codesign_verify\ttrue\n'
codesign -dvv --entitlements - "$binary" 2>&1
