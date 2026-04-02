#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/fitcal/app"
APP_USER="fitcal"

cd "${APP_DIR}"

sudo -u "${APP_USER}" git pull --ff-only
sudo -u "${APP_USER}" docker compose --env-file .env.production up -d --build
sudo -u "${APP_USER}" docker compose ps
