#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$SCRIPT_DIR}"
APP_USER="${APP_USER:-fitcal}"
APP_BRANCH="${APP_BRANCH:-main}"
ENV_FILE="${ENV_FILE:-.env.production}"
NGINX_SOURCE_FILE="${NGINX_SOURCE_FILE:-$APP_DIR/deploy/nginx-fitcal.conf}"
NGINX_TARGET_FILE="${NGINX_TARGET_FILE:-/etc/nginx/sites-available/fitcal.hisqu.de.conf}"
SYNC_NGINX="${SYNC_NGINX:-1}"

run_git_as_app_user() {
  if [ "$(id -u)" -eq 0 ] && id -u "${APP_USER}" >/dev/null 2>&1; then
    sudo -u "${APP_USER}" "$@"
  else
    "$@"
  fi
}

echo "==> FitCal update starting"
echo "App dir: ${APP_DIR}"
echo "Branch: ${APP_BRANCH}"

cd "${APP_DIR}"

if [ ! -f "${ENV_FILE}" ]; then
  echo "Missing env file: ${APP_DIR}/${ENV_FILE}" >&2
  exit 1
fi

run_git_as_app_user git fetch origin
run_git_as_app_user git checkout "${APP_BRANCH}"
run_git_as_app_user git pull --ff-only origin "${APP_BRANCH}"

echo "==> Current revision"
run_git_as_app_user git rev-parse --short HEAD

echo "==> Rebuilding container"
docker compose --env-file "${ENV_FILE}" up -d --build

if [ "${SYNC_NGINX}" = "1" ] && [ -f "${NGINX_SOURCE_FILE}" ]; then
  if [ "$(id -u)" -eq 0 ]; then
    echo "==> Syncing nginx config"
    cp "${NGINX_SOURCE_FILE}" "${NGINX_TARGET_FILE}"
    nginx -t
    systemctl reload nginx
  else
    echo "==> Skipping nginx sync (not running as root)"
  fi
fi

echo "==> Container status"
docker compose ps
