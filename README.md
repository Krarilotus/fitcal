# FitCal

Fitness-Challenge Web App (Next.js + TypeScript), ausgelegt fuer lokalen Dev-Start und Docker-Deployment auf einem bestehenden Linux-Server.

## 1) Lokales Ausprobieren (Git Bash)

Voraussetzungen:
- Node.js 22 LTS
- npm 10+

```bash
git clone <repo-url>
cd fitcal
npm ci
cp .env.example .env
npm run db:push
npm run dev
```

App danach unter `http://localhost:3000`.

Build-Test lokal:

```bash
npm run build
npm run start
```

## 2) Umgebungsvariablen

Lege im Projekt eine `.env` (lokal) bzw. `.env.production` (Server) an. Lokal kannst du direkt `.env.example` kopieren.

Beispiel:

```env
NODE_ENV=production
PORT=3000
FITCAL_BIND_IP=127.0.0.1
FITCAL_HOST_PORT=3107
FITCAL_DATA_DIR=/opt/fitcal/data
FITCAL_UPLOAD_DIR=/opt/fitcal/uploads

# In-Container persistente Daten
DATABASE_URL=file:/app/data/fitcal.db
UPLOAD_BASE_DIR=/app/uploads
APP_TIMEZONE=Europe/Berlin

# Auth
AUTH_URL=https://fitcal.hisqu.de

# SMTP (Passwort-Reset)
SMTP_HOST=smtp.example.tld
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=fitcal@example.tld
SMTP_PASS=replace-with-smtp-password
SMTP_FROM="FitCal <fitcal@hisqu.de>"
```

Lokal minimal ausreichend:

```env
DATABASE_URL=file:./dev.db
FITCAL_UPLOAD_DIR=./data/uploads
AUTH_URL=http://localhost:3000
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM="FitCal <fitcal@example.test>"
```

Hinweis: Ohne SMTP-Konfiguration schreibt die App Reset-Links ins Server-Log.

## 3) Docker lokal/Server

### Build

```bash
docker build -t fitcal:latest .
```

### Start mit Docker Compose

```bash
docker compose up -d --build
```

Die Compose-Datei mappt standardmaessig auf `127.0.0.1:3107 -> container:3000`.
Beim Container-Start wird `prisma db push` automatisch ausgefuehrt, sodass die SQLite-Datei bei Bedarf initialisiert wird.

Health/Logs:

```bash
docker compose ps
docker compose logs -f fitcal
```

Stop:

```bash
docker compose down
```

## 4) Deployment auf Linux-Server (PuTTY + Git Bash Workflow)

### 4.1 Server-User und Verzeichnisse (least privileged)

In PuTTY als Root oder sudo-User:

```bash
sudo adduser --system --group --home /opt/fitcal --shell /usr/sbin/nologin fitcal
sudo mkdir -p /opt/fitcal/app
sudo mkdir -p /opt/fitcal/data
sudo mkdir -p /opt/fitcal/uploads
sudo chown -R fitcal:fitcal /opt/fitcal
sudo chmod 750 /opt/fitcal /opt/fitcal/data /opt/fitcal/uploads
sudo usermod -aG docker fitcal
```

`fitcal` besitzt nur App, DB und Upload-Pfade und kann Docker ohne Root nutzen.

### 4.2 Code auf den Server bringen

Option A (empfohlen): Pull direkt auf dem Server

```bash
cd /opt/fitcal/app
sudo -u fitcal git clone <repo-url> .
sudo -u fitcal cp .env.production.example .env.production
sudo -u fitcal nano .env.production
```

Option B: Aus Git Bash pushen, dann auf Server `git pull`.

### 4.3 Starten/Updaten

```bash
cd /opt/fitcal/app
sudo -u fitcal docker compose --env-file .env.production up -d --build
```

Update:

```bash
cd /opt/fitcal/app
sudo -u fitcal git pull
sudo -u fitcal docker compose --env-file .env.production up -d --build
```

Pruefen:

```bash
sudo -u fitcal docker compose ps
sudo -u fitcal docker compose logs -f fitcal
curl -I http://127.0.0.1:3107
```

## 5) Reverse Proxy fuer `fitcal.hisqu.de`

Beispiel-Nginx-Konfiguration: siehe `deploy/nginx-fitcal.conf.example`.

Kurzprinzip:
- TLS endet am Reverse Proxy (`443`)
- Proxy leitet intern auf `127.0.0.1:3107`
- WebSocket-Header werden durchgereicht

Reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 6) DNS/Strato (Annahmen klar markiert)

Annahme:
- Deine Server-IP ist statisch und erreichbar.
- Die Domain `hisqu.de` wird bei Strato DNS-verwaltet.
- Der Reverse Proxy auf dem Server terminiert HTTPS.

Dann in Strato DNS:
- `A`-Record: Host `fitcal` -> `<SERVER_IPV4>`
- Optional `AAAA`-Record: Host `fitcal` -> `<SERVER_IPV6>`
- TTL z. B. 300 Sekunden waehrend Setup

Nach DNS-Propagation sollte `https://fitcal.hisqu.de` auf den Reverse Proxy zeigen.

## 7) Persistenz, Sicherheit, Betrieb

- SQLite liegt in `/opt/fitcal/data` (per Volume in Container als `/app/data`).
- User-Uploads liegen in `/opt/fitcal/uploads` (im Container `/app/uploads`).
- Container laeuft ohne Root-User (UID/GID 10001 in Dockerfile).
- Nur lokaler Host-Port wird gebunden (`127.0.0.1:3107`), kein direkter Internet-Port.
- Logs via `docker compose logs`; optional spaeter mit zentralem Logging (Loki/ELK).

## 8) Git Bash / PuTTY Quick Commands

Lokal (Git Bash):

```bash
npm ci
npm run dev
docker build -t fitcal:latest .
docker compose up -d --build
```

Server (PuTTY):

```bash
cd /opt/fitcal/app
sudo -u fitcal git pull
sudo -u fitcal docker compose --env-file .env.production up -d --build
sudo -u fitcal docker compose logs -f fitcal
```
