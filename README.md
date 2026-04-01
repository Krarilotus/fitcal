# FitCal

Next.js-App fuer die FitCal-Challenge. Deployment-Ziel ist `fitcal.hisqu.de` hinter Nginx, in Docker, mit SQLite, Uploads auf Disk und Passwort-Reset ueber Resend.

## Lokal starten

Voraussetzungen:
- Node.js 22 LTS
- npm 10+

```bash
git clone <repo-url>
cd fitcal
npm ci
cp .env.example .env
npx prisma db push
npm run dev
```

Danach:
- App: `http://localhost:3000`

## Wichtige Dateien

- lokale Vorlage: [`.env.example`](/c:/Users/Johannes/Documents/DanielMotz/fitcal/.env.example)
- Server-Vorlage: [`.env.server`](/c:/Users/Johannes/Documents/DanielMotz/fitcal/.env.server)
- Docker: [`docker-compose.yml`](/c:/Users/Johannes/Documents/DanielMotz/fitcal/docker-compose.yml)
- Nginx fertig: [`deploy/nginx-fitcal.conf`](/c:/Users/Johannes/Documents/DanielMotz/fitcal/deploy/nginx-fitcal.conf)

## Resend + STRATO

Ziel:
- Versand ueber Resend
- Absender: `fitcal@mail.hisqu.de`
- Antworten an `fitcal@hisqu.de`
- Empfang der Antworten ueber STRATO-Postfach/Alias

Wichtig:
- Resend macht den Versand.
- STRATO macht das echte Postfach bzw. den Alias.
- In deinem Fall reicht es, wenn `fitcal@hisqu.de` als Alias auf das vorhandene `webmaster@[Alle Domains]`-Postfach zeigt.
- Die Sending-Domain in Resend ist `mail.hisqu.de`.

### 1. STRATO Mail vorbereiten

In STRATO:
- `E-Mail`
- bestehendes Postfach `webmaster@[Alle Domains]`
- unter `Weitere Namen (Aliasse) zum Postfach anlegen`
- Alias `fitcal` hinzufuegen
- speichern

Nicht noetig:
- Catchall aktivieren

### 2. Resend vorbereiten

Im neuen Resend-Account:
1. `Domains`
2. `Add Domain`
3. `mail.hisqu.de` eintragen
4. speichern
5. die angezeigten DNS-Records offen lassen

### 3. DNS in STRATO setzen

In STRATO:
- `Domains`
- `hisqu.de`
- `Subdomains`
- Subdomain `mail`
- `DNS-Verwaltung`

Dann:
- alle von Resend angezeigten Records 1:1 eintragen
- speichern
- in Resend `Verify` / `Refresh`

Wichtig:
- die Resend-Records werden auf der Subdomain `mail` gesetzt
- keine eigenen TXT-Werte erfinden

### 4. API Key in Resend erzeugen

In Resend:
1. `API Keys`
2. `Create API Key`
3. Name: `fitcal-production`
4. Permission: `Sending`
5. Key kopieren

## `.env.server`

Die vorbereitete Datei [`.env.server`](/c:/Users/Johannes/Documents/DanielMotz/fitcal/.env.server) ist fuer deinen lokalen Rechner gedacht, damit du sie spaeter einfach auf den Server kopieren kannst. Auf dem Server selbst benennst du sie in `.env.production` um.

Alternativ kannst du direkt [`.env.production.example`](/c:/Users/Johannes/Documents/DanielMotz/fitcal/.env.production.example) als Vorlage benutzen.

Inhalt fuer `.env.production`:

```env
NODE_ENV=production
PORT=3000

FITCAL_BIND_IP=127.0.0.1
FITCAL_HOST_PORT=3107
FITCAL_DATA_DIR=/opt/fitcal/data
FITCAL_UPLOAD_DIR=/opt/fitcal/uploads

DATABASE_URL=file:/app/data/fitcal.db
UPLOAD_BASE_DIR=/app/uploads
APP_TIMEZONE=Europe/Berlin

AUTH_URL=https://fitcal.hisqu.de

RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
RESEND_FROM="FitCal <fitcal@mail.hisqu.de>"
RESEND_REPLY_TO="fitcal@hisqu.de"
```

Wenn `3107` belegt ist, nimm einen anderen freien Port und passe dann auch Nginx an.

## Server vorbereiten

Als Root oder sudo-User:

```bash
sudo adduser --system --group --home /opt/fitcal --shell /usr/sbin/nologin fitcal
sudo mkdir -p /opt/fitcal/app
sudo mkdir -p /opt/fitcal/data
sudo mkdir -p /opt/fitcal/uploads
sudo chown -R fitcal:fitcal /opt/fitcal
sudo chmod 750 /opt/fitcal /opt/fitcal/data /opt/fitcal/uploads
sudo usermod -aG docker fitcal
```

Freien Port pruefen:

```bash
ss -ltn
ss -ltn | grep ':3107 '
```

## Code auf den Server

```bash
cd /opt/fitcal/app
sudo -u fitcal git clone <repo-url> .
```

Dann entweder:

Option A:
- deine lokale [`.env.server`](/c:/Users/Johannes/Documents/DanielMotz/fitcal/.env.server) per SCP/WinSCP nach `/opt/fitcal/app/.env.production` hochladen

Option B:

```bash
cd /opt/fitcal/app
sudo -u fitcal cp .env.production.example .env.production
sudo -u fitcal nano .env.production
```

## Docker starten

```bash
cd /opt/fitcal/app
sudo -u fitcal docker compose --env-file .env.production up -d --build
```

Pruefen:

```bash
sudo -u fitcal docker compose ps
sudo -u fitcal docker compose logs -f fitcal
curl -I http://127.0.0.1:3107
```

## Nginx fuer `fitcal.hisqu.de`

Die fertige Datei liegt hier:
- [`deploy/nginx-fitcal.conf`](/c:/Users/Johannes/Documents/DanielMotz/fitcal/deploy/nginx-fitcal.conf)

Wenn dein Host-Port nicht `3107` ist, in der Datei `proxy_pass` anpassen.

Auf dem Server:

```bash
sudo mkdir -p /var/www/certbot
sudo cp /opt/fitcal/app/deploy/nginx-fitcal.conf /etc/nginx/sites-available/fitcal.hisqu.de.conf
sudo ln -s /etc/nginx/sites-available/fitcal.hisqu.de.conf /etc/nginx/sites-enabled/fitcal.hisqu.de.conf
sudo nginx -t
sudo systemctl reload nginx
```

## DNS fuer die App

In STRATO:
- `A`-Record: `fitcal` -> `<SERVER_IPV4>`
- optional `AAAA`-Record: `fitcal` -> `<SERVER_IPV6>`

Dann zeigt `fitcal.hisqu.de` auf deinen Server.

## TLS / HTTPS

Wenn Nginx steht und DNS aufloest:

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d fitcal.hisqu.de
```

Danach:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Live-Test

1. `https://fitcal.hisqu.de` im Browser oeffnen
2. Account registrieren
3. Passwort-Reset anfordern
4. prüfen:
- kommt die Mail an?
- ist der Absender `fitcal@mail.hisqu.de`?
- kommen Antworten im STRATO-Postfach an?

## Update spaeter

```bash
cd /opt/fitcal/app
sudo -u fitcal git pull
sudo -u fitcal docker compose --env-file .env.production up -d --build
sudo -u fitcal docker compose logs -f fitcal
```

## Hinweise

- Der Container bindet nur lokal an `127.0.0.1`.
- Oeffentlich geht alles ueber Nginx.
- Uploads liegen in `/opt/fitcal/uploads`.
- SQLite liegt in `/opt/fitcal/data`.
- Ohne Resend-Konfiguration schreibt die App Reset-Links nur ins Log.
