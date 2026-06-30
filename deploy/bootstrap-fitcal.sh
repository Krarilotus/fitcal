#!/usr/bin/env bash
set -euo pipefail

APP_USER="fitcal"
APP_GROUP="fitcal"
APP_HOME="/home/fitcal"
APP_DIR="${APP_HOME}/app"
OPERATIONAL_DIR="/opt/fitcal"
SSH_DIR="${OPERATIONAL_DIR}/.ssh"
REPO_SSH="git@github.com:Krarilotus/fitcal.git"
GIT_SSH_COMMAND="ssh -i ${SSH_DIR}/id_ed25519 -o IdentitiesOnly=yes"

if [ "${EUID}" -ne 0 ]; then
  echo "Please run this script as root."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"${SCRIPT_DIR}/setup-fitcal-server.sh"

if [ ! -f "${SSH_DIR}/id_ed25519.pub" ]; then
  echo "Deploy key not found at ${SSH_DIR}/id_ed25519.pub"
  exit 1
fi

if [ ! -d "${APP_DIR}/.git" ]; then
  rm -rf "${APP_DIR}"
  install -d -o "${APP_USER}" -g "${APP_GROUP}" -m 750 "${APP_DIR}"
  sudo -u "${APP_USER}" env GIT_SSH_COMMAND="${GIT_SSH_COMMAND}" git clone "${REPO_SSH}" "${APP_DIR}"
else
  chown -R "${APP_USER}:${APP_GROUP}" "${APP_DIR}"
  sudo -u "${APP_USER}" env GIT_SSH_COMMAND="${GIT_SSH_COMMAND}" git -C "${APP_DIR}" fetch origin
  sudo -u "${APP_USER}" git -C "${APP_DIR}" checkout main
  sudo -u "${APP_USER}" env GIT_SSH_COMMAND="${GIT_SSH_COMMAND}" git -C "${APP_DIR}" pull --ff-only origin main
fi

if [ ! -f "${APP_DIR}/.env.production" ] && [ -f "${APP_DIR}/.env.production.example" ]; then
  cp "${APP_DIR}/.env.production.example" "${APP_DIR}/.env.production"
  chown "${APP_USER}:${APP_GROUP}" "${APP_DIR}/.env.production"
  chmod 640 "${APP_DIR}/.env.production"
fi

cat <<EOF

FitCal bootstrap finished.

Current repo:
  ${APP_DIR}

Environment file:
  ${APP_DIR}/.env.production

Next steps:
1. Edit ${APP_DIR}/.env.production
2. Run: ${SCRIPT_DIR}/install-fitcal-service.sh

EOF
