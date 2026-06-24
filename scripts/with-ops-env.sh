#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="${OPS_ENV_FILE:-$repo_root/.env.ops.local}"

if [[ ! -f "$env_file" ]]; then
  echo "Missing ops env file: $env_file" >&2
  echo "Create it with local-only secrets such as RAILWAY_TOKEN." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$env_file"
set +a

if [[ $# -eq 0 ]]; then
  exec "${SHELL:-/bin/bash}"
fi

exec "$@"
