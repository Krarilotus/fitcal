# FitCal

Next.js-App fuer die FitCal-Challenge. Das Ziel-Setup ist `fitcal.hisqu.de` hinter Nginx, in Docker, mit SQLite, Uploads auf Disk und Passwort-Reset ueber Resend.

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

Dann:
- App: `http://localhost:3000`

## Lokale Checks vor Deployment

```bash
npm run lint
npm run build
npm run test:sim
npm run test:e2e
```

Aktueller bekannter Resthinweis:
- Turbopack traced `src/lib/storage.ts` in der Build-Ausgabe zu weit. Das ist aktuell nicht blockierend fuer das Deployment.

## Wichtige Dateien

- lokale Vorlage: [`.env.example`](/c:/Users/Johannes/Documents/DanielMotz/fitcal/.env.example)
- Server-Vorlage: [`.env.server`](/c:/Users/Johannes/Documents/DanielMotz/fitcal/.env.server)
- Produktionsvorlage: [`.env.production.example`](/c:/Users/Johannes/Documents/DanielMotz/fitcal/.env.production.example)
- Docker: [`docker-compose.yml`](/c:/Users/Johannes/Documents/DanielMotz/fitcal/docker-compose.yml)
- Nginx: [`deploy/nginx-fitcal.conf`](/c:/Users/Johannes/Documents/DanielMotz/fitcal/deploy/nginx-fitcal.conf)
- Server-Setup: [`deploy/setup-fitcal-server.sh`](/c:/Users/Johannes/Documents/DanielMotz/fitcal/deploy/setup-fitcal-server.sh)
- Bootstrap: [`deploy/bootstrap-fitcal.sh`](/c:/Users/Johannes/Documents/DanielMotz/fitcal/deploy/bootstrap-fitcal.sh)
- Install/Deploy: [`deploy/install-fitcal-service.sh`](/c:/Users/Johannes/Documents/DanielMotz/fitcal/deploy/install-fitcal-service.sh)
- Update-Skript: [`deploy/update-fitcal.sh`](/c:/Users/Johannes/Documents/DanielMotz/fitcal/deploy/update-fitcal.sh)
- Repo-Root-Updater: [`update.sh`](/c:/Users/Johannes/Documents/DanielMotz/fitcal/update.sh)

## Resend + STRATO

Ziel:
- Versand ueber Resend
- Absender: `fitcal@hisqu.de`
- Antworten an `fitcal@hisqu.de`
- Empfang der Antworten ueber STRATO-Postfach oder Alias

Wichtig:
- Resend macht den Versand.
- STRATO macht das echte Postfach bzw. den Alias.
- In deinem Fall reicht es, wenn `fitcal@hisqu.de` als Alias auf das vorhandene `webmaster@[Alle Domains]`-Postfach zeigt.
- Die Domain `hisqu.de` muss im Resend-Account bereits verifiziert sein.

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

Im Resend-Account:
1. `Domains`
2. pruefen, dass `hisqu.de` verifiziert ist
3. `API Keys`
4. `Create API Key`
5. Name: `fitcal-production`
6. Permission: `Sending`
7. Key kopieren

### 3. DNS fuer die App in STRATO setzen

In STRATO:
- `Domains`
- `hisqu.de`
- `DNS-Verwaltung`

Dann:
- `A`-Record fuer `fitcal` auf die Server-IPv4 setzen
- optional `AAAA`-Record fuer `fitcal` auf die Server-IPv6 setzen

Wichtig:
- nur `fitcal.hisqu.de` muss auf den Server zeigen
- bestehende funktionierende Resend-Eintraege fuer `hisqu.de` nicht ueberschreiben

## `.env.production`

Die Datei [`.env.server`](/c:/Users/Johannes/Documents/DanielMotz/fitcal/.env.server) ist fuer deinen lokalen Rechner gedacht. Auf dem Server benennst du sie in `.env.production` um.

Alternativ kannst du [`.env.production.example`](/c:/Users/Johannes/Documents/DanielMotz/fitcal/.env.production.example) als Vorlage nehmen.

Minimal:

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
RESEND_FROM="FitCal <fitcal@hisqu.de>"
RESEND_REPLY_TO="fitcal@hisqu.de"
```

Wenn `3107` belegt ist:
- freien Port suchen
- `FITCAL_HOST_PORT` anpassen
- in Nginx `proxy_pass` auf denselben Port setzen

## Server vorbereiten

Als Root oder sudo-User:

```bash
chmod +x deploy/setup-fitcal-server.sh
sudo ./deploy/setup-fitcal-server.sh
```

Schneller fuer den echten Erstlauf:

```bash
chmod +x deploy/setup-fitcal-server.sh deploy/bootstrap-fitcal.sh deploy/install-fitcal-service.sh deploy/update-fitcal.sh
sudo ./deploy/bootstrap-fitcal.sh
```

Das Setup sorgt fuer:
- eigenen System-User `fitcal`
- kein Passwort
- kein interaktiver Login (`/usr/sbin/nologin`)
- eigene Verzeichnisse unter `/opt/fitcal`
- eigenes SSH-Keypair nur fuer Repo-Zugriff
- Docker-Zugriff nur fuer diesen Dienst

Damit FitCal deine anderen Apps nicht stoert:
- eigener Host-Port
- eigener Nginx-VHost nur fuer `fitcal.hisqu.de`
- eigener Compose-Projektname `fitcal`
- eigener Containername `fitcal-app`
- eigene Daten- und Upload-Verzeichnisse

Freien Port pruefen:

```bash
ss -ltn
ss -ltn | grep ':3107 '
```

## Code auf den Server

### GitHub Deploy Key

Nach `sudo ./deploy/setup-fitcal-server.sh`:

```bash
sudo cat /opt/fitcal/.ssh/id_ed25519.pub
```

Dann in GitHub:
1. Repo `Krarilotus/fitcal`
2. `Settings`
3. `Deploy keys`
4. `Add deploy key`
5. Titel z. B. `fitcal-server`
6. Public Key einfuegen
7. `Allow write access` deaktiviert lassen

Damit zieht der Server den Code read-only per SSH.

### Clone

Einfachster Weg nach dem Deploy-Key:

```bash
sudo ./deploy/bootstrap-fitcal.sh
```

Das Skript:
- legt den `fitcal`-Systemuser an
- erzeugt das Deploy-Key-Paar
- klont oder updated `/opt/fitcal/app`
- legt bei Bedarf `.env.production` aus der Example-Datei an

Manuell geht auch:

```bash
sudo -u fitcal git clone git@github.com:Krarilotus/fitcal.git /opt/fitcal/app
```

Dann entweder:

Option A:
- deine lokale [`.env.server`](/c:/Users/Johannes/Documents/DanielMotz/fitcal/.env.server) per SCP/WinSCP nach `/opt/fitcal/app/.env.production` kopieren

Option B:

```bash
cd /opt/fitcal/app
sudo -u fitcal cp .env.production.example .env.production

## Updates auf dem Server

Wenn das Repo auf dem Server bereits unter `/home/fitcal/app` liegt, reicht kuenftig:

```bash
cd /home/fitcal/app
chmod +x update.sh
./update.sh
```

Das Skript macht:
- `git fetch`
- `git checkout main`
- `git pull --ff-only`
- `docker compose up -d --build`
- `docker compose ps`

Optional kannst du Branch/User/Env ueberschreiben:

```bash
APP_USER=fitcal APP_BRANCH=main ENV_FILE=.env.production ./update.sh
```
sudo -u fitcal nano .env.production
```

## Docker starten

Schnellster Weg:

```bash
sudo ./deploy/install-fitcal-service.sh
```

Das Skript:
- aktiviert die Nginx-Site
- testet/reloadet Nginx
- startet den Container via Docker Compose

Manuell:

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

Wenn dein Host-Port nicht `3107` ist, in [`deploy/nginx-fitcal.conf`](/c:/Users/Johannes/Documents/DanielMotz/fitcal/deploy/nginx-fitcal.conf) `proxy_pass` anpassen.

Auf dem Server:

```bash
sudo mkdir -p /var/www/certbot
sudo cp /opt/fitcal/app/deploy/nginx-fitcal.conf /etc/nginx/sites-available/fitcal.hisqu.de.conf
sudo ln -s /etc/nginx/sites-available/fitcal.hisqu.de.conf /etc/nginx/sites-enabled/fitcal.hisqu.de.conf
sudo nginx -t
sudo systemctl reload nginx
```

## TLS / HTTPS

Wenn Nginx steht und `fitcal.hisqu.de` schon aufloest:

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d fitcal.hisqu.de
sudo nginx -t
sudo systemctl reload nginx
```

## Live-Test

1. `https://fitcal.hisqu.de` im Browser oeffnen
2. Account registrieren
3. Passwort-Reset anfordern
4. pruefen:
- kommt die Mail an?
- ist der Absender `fitcal@hisqu.de`?
- kommen Antworten im STRATO-Postfach an?
5. Test-Upload und Review pruefen

## Update spaeter

```bash
chmod +x deploy/update-fitcal.sh
sudo ./deploy/update-fitcal.sh
```

## Schnellablauf fuer PuTTY

1. Repo auf den Server holen, z. B. in `/root/fitcal`
2. Im Repo:

```bash
chmod +x deploy/setup-fitcal-server.sh deploy/bootstrap-fitcal.sh deploy/install-fitcal-service.sh deploy/update-fitcal.sh
./deploy/setup-fitcal-server.sh
cat /opt/fitcal/.ssh/id_ed25519.pub
```

3. Deploy Key in GitHub als read-only Deploy Key hinterlegen
4. Danach:

```bash
./deploy/bootstrap-fitcal.sh
nano /opt/fitcal/app/.env.production
./deploy/install-fitcal-service.sh
certbot --nginx -d fitcal.hisqu.de
```

## Hinweise

- Der Container bindet nur lokal an `127.0.0.1`.
- Oeffentlich geht alles ueber Nginx.
- Uploads liegen in `/opt/fitcal/uploads`.
- SQLite liegt in `/opt/fitcal/data`.
- Ohne Resend-Konfiguration schreibt die App Reset-Links nur ins Log.
