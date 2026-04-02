#!/usr/bin/env bash
set -euo pipefail

APP_USER="fitcal"
APP_GROUP="fitcal"
APP_DIR="/opt/fitcal/app"
NGINX_SOURCE="${APP_DIR}/deploy/nginx-fitcal.conf"
NGINX_TARGET="/etc/nginx/sites-available/fitcal.hisqu.de.conf"
NGINX_LINK="/etc/nginx/sites-enabled/fitcal.hisqu.de.conf"

if [ "${EUID}" -ne 0 ]; then
  echo "Please run this script as root."
  exit 1
fi

if [ ! -d "${APP_DIR}" ]; then
  echo "App directory not found: ${APP_DIR}"
  exit 1
fi

if [ ! -f "${APP_DIR}/.env.production" ]; then
  echo "Missing ${APP_DIR}/.env.production"
  exit 1
fi

cp "${NGINX_SOURCE}" "${NGINX_TARGET}"

if [ ! -L "${NGINX_LINK}" ]; then
  ln -s "${NGINX_TARGET}" "${NGINX_LINK}"
fi

mkdir -p /var/www/certbot

if command -v nginx >/dev/null 2>&1; then
  nginx -t
  systemctl reload nginx || true
fi

chown -R "${APP_USER}:${APP_GROUP}" /opt/fitcal

sudo -u "${APP_USER}" docker compose -f "${APP_DIR}/docker-compose.yml" --env-file "${APP_DIR}/.env.production" up -d --build
sudo -u "${APP_USER}" docker compose -f "${APP_DIR}/docker-compose.yml" --env-file "${APP_DIR}/.env.production" ps

HOST_PORT="$(grep -E '^FITCAL_HOST_PORT=' "${APP_DIR}/.env.production" | tail -n1 | cut -d'=' -f2- || true)"
HOST_PORT="${HOST_PORT:-3107}"

echo
echo "FitCal service installed."
echo "Container should now be reachable on http://127.0.0.1:${HOST_PORT}"
echo "If DNS is ready, request TLS with:"
echo "  certbot --nginx -d fitcal.hisqu.de"
