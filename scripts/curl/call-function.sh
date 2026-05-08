#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "usage: $0 <functionName> <jsonBody> [authUid]"
  echo "example: $0 startProject '{\"category\":\"deck-building\",\"title\":\"T\",\"description\":\"test\",\"zipCode\":\"30303\"}' smoke-user"
  exit 1
fi

FN="$1"
BODY="$2"
UID_ARG="${3:-smoke-user}"

PROJECT="${GCLOUD_PROJECT:-home-helper-706a8}"
REGION="${FUNCTIONS_REGION:-us-central1}"
PORT="${FUNCTIONS_PORT:-5402}"

URL="http://127.0.0.1:${PORT}/${PROJECT}/${REGION}/${FN}"

# Emulator accepts an unsigned JWT with a sub claim as the auth surrogate.
# Header: { alg: "none" } payload: { sub: <uid>, uid: <uid>, ... }
ENC() { printf '%s' "$1" | openssl base64 -A | tr '/+' '_-' | tr -d '='; }

HEADER="$(ENC '{"alg":"none","typ":"JWT"}')"
PAYLOAD="$(ENC "{\"sub\":\"${UID_ARG}\",\"uid\":\"${UID_ARG}\",\"user_id\":\"${UID_ARG}\",\"email\":\"${UID_ARG}@example.com\",\"firebase\":{\"identities\":{},\"sign_in_provider\":\"custom\"}}")"
TOKEN="${HEADER}.${PAYLOAD}."

curl -sS -X POST "${URL}" \
  -H "content-type: application/json" \
  -H "authorization: Bearer ${TOKEN}" \
  -d "{\"data\": ${BODY}}"
echo
