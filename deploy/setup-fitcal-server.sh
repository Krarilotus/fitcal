#!/usr/bin/env bash
set -euo pipefail

APP_USER="fitcal"
APP_GROUP="fitcal"
APP_HOME="/opt/fitcal"
APP_DIR="${APP_HOME}/app"
DATA_DIR="${APP_HOME}/data"
UPLOAD_DIR="${APP_HOME}/uploads"
SSH_DIR="${APP_HOME}/.ssh"
REPO_SSH="git@github.com:Krarilotus/fitcal.git"

if [ "${EUID}" -ne 0 ]; then
  echo "Please run this script as root."
  exit 1
fi

if ! id "${APP_USER}" >/dev/null 2>&1; then
  useradd \
    --system \
    --create-home \
    --home-dir "${APP_HOME}" \
    --shell /usr/sbin/nologin \
    --user-group \
    "${APP_USER}"
fi

passwd -l "${APP_USER}" >/dev/null 2>&1 || true
usermod -s /usr/sbin/nologin "${APP_USER}"
if getent group docker >/dev/null 2>&1; then
  usermod -aG docker "${APP_USER}"
fi

install -d -o "${APP_USER}" -g "${APP_GROUP}" -m 750 "${APP_HOME}"
install -d -o "${APP_USER}" -g "${APP_GROUP}" -m 750 "${DATA_DIR}"
install -d -o "${APP_USER}" -g "${APP_GROUP}" -m 750 "${UPLOAD_DIR}"
install -d -o "${APP_USER}" -g "${APP_GROUP}" -m 700 "${SSH_DIR}"

if [ ! -f "${SSH_DIR}/id_ed25519" ]; then
  sudo -u "${APP_USER}" ssh-keygen -t ed25519 -f "${SSH_DIR}/id_ed25519" -N "" -C "fitcal deploy key"
fi

sudo -u "${APP_USER}" touch "${SSH_DIR}/known_hosts"
if ! sudo -u "${APP_USER}" ssh-keygen -F github.com >/dev/null 2>&1; then
  sudo -u "${APP_USER}" ssh-keyscan github.com >> "${SSH_DIR}/known_hosts"
fi
chown "${APP_USER}:${APP_GROUP}" "${SSH_DIR}/known_hosts"
chmod 600 "${SSH_DIR}/known_hosts"

cat <<EOF

FitCal system user is ready.

Next steps:
1. Add this public key as a read-only Deploy Key in GitHub:
   ${SSH_DIR}/id_ed25519.pub

2. Clone the repository as ${APP_USER}:
   sudo -u ${APP_USER} git clone ${REPO_SSH} ${APP_DIR}

3. Copy your .env.production into:
   ${APP_DIR}/.env.production

EOF
