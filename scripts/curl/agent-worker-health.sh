#!/usr/bin/env bash
set -euo pipefail

HOST="${AGENT_WORKER_URL:-http://127.0.0.1:8787}"
curl -sS -o - "${HOST}/health"
echo
