#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 3 ]; then
  echo "usage: $0 <runId> <projectId> <userId> [mode]"
  exit 1
fi

RUN_ID="$1"
PROJECT_ID="$2"
USER_ID="$3"
MODE="${4:-full}"

HOST="${AGENT_WORKER_URL:-http://127.0.0.1:8787}"

curl -sS -X POST "${HOST}/agent-run" \
  -H "content-type: application/json" \
  -d "{\"runId\":\"${RUN_ID}\",\"projectId\":\"${PROJECT_ID}\",\"userId\":\"${USER_ID}\",\"mode\":\"${MODE}\"}"
echo
