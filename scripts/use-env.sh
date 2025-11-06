#!/usr/bin/env bash
set -euo pipefail

ENV_NAME="${NODE_ENV:-development}"

if [[ "${1:-}" == "--env" ]]; then
  if [[ $# -lt 2 ]]; then
    echo "Missing value for --env flag" >&2
    exit 1
  fi
  ENV_NAME="$2"
  shift 2
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: use-env.sh [--env <environment>] <command> [args...]" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

SELECTED_ENV_FILE="${ENV_FILE:-}"

if [[ -z "${SELECTED_ENV_FILE}" ]]; then
  CANDIDATES=(
    "${REPO_ROOT}/.env.${ENV_NAME}.local"
    "${REPO_ROOT}/.env.${ENV_NAME}"
    "${REPO_ROOT}/.env.local"
    "${REPO_ROOT}/.env"
  )

  for candidate in "${CANDIDATES[@]}"; do
    if [[ -f "${candidate}" ]]; then
      SELECTED_ENV_FILE="${candidate}"
      break
    fi
  done
fi

if [[ -z "${SELECTED_ENV_FILE}" ]]; then
  echo "No env file found for environment '${ENV_NAME}'." >&2
  exit 1
fi

if [[ "${USE_ENV_VERBOSE:-0}" == "1" ]]; then
  echo "Using env file: ${SELECTED_ENV_FILE}" >&2
fi

export ENV_FILE="${SELECTED_ENV_FILE}"
export NODE_ENV="${ENV_NAME}"

set -a
# shellcheck disable=SC1090
source "${SELECTED_ENV_FILE}"
set +a

exec "$@"
