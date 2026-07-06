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

## Clientseitige Video-Kompression

Workout-Videos werden vor dem Upload lokal im Browser mit einer WebCodecs-basierten Pipeline neu kodiert:
- Zielprofil: `MP4`, `480p`, `24 fps`
- Zielgroesse: maximal `15 MB` pro Datei
- Audio wird fuer die Workout-Beweise verworfen, um Dateigroesse und Encode-Zeit niedrig zu halten
- Hardwarebeschleunigung wird bevorzugt, wenn der Browser sie bereitstellt
- Danach laeuft weiter der robuste JSON-Handshake gegen `/api/submissions` plus Server-Bestaetigung ueber `/api/submissions/status`

Warum das so gebaut ist:
- grosse Handyvideos werden vor dem Upload direkt auf dem Geraet verkleinert
- die Wiedergabe im Browser bleibt MP4-basiert und damit kompatibel mit Scrubbing und `2x`
- der Server muss kein riesiges Originalvideo annehmen, bevor komprimiert wird

Wichtig fuer Entwickler:
- die Kompression setzt einen Browser mit `VideoEncoder` und `VideoDecoder` voraus
- `localhost` ist dafuer als sicherer Ursprung okay
- fuer nicht unterstuetzte Browser wird der Upload mit einer klaren Fehlermeldung abgebrochen statt kaputte Dateien zu erzeugen

## Dashboard-Struktur

Das Dashboard ist in klar getrennte Bereiche aufgeteilt, damit nicht mehr alles als ein langer Scroll-Block untereinander haengt:
- `Uebersicht`: Tagesziel, Tagesstatus, Kerndaten
- `Uploads`: offene Tage und editierbare Claims
- `Timeline`: Verlauf, Review-Feedback, Video-Historie
- `Metastats`: Leistungs- und Messdaten
- `Profil`: Kontodaten, E-Mail-Verifizierung, Einladungen, Feature-Request
- `Review`: Review-Workflows und Teilnehmerstand
- `Regeln`: Challenge-Regeln und Referenzen
- `Rechner`: Hilfsrechner fuer Ziel, Slack, Schulden und Kalorien

Semantische Leitlinie:
- Konto- und Profilthemen liegen im eigenen Bereich `Profil`
- taegliche Workout-Aktionen bleiben bei `Uploads`
- Plattform-/Moderationsthemen liegen sichtbar in `Uebersicht` und `Review`

## Workout-Tracking

Jeder Workout-Eintrag speichert die Challenge-Kernwerte `Liegestuetze` und `Sit-ups` sowie optionale Zusatzkategorien:
- Die Pflichtwerte bleiben als zwei Sets pro Kernuebung erhalten.
- Ueber das kleine `+` im Upload-Formular koennen Nutzer weitere Kategorien wie `Plank`, `Burpees` oder `Laufen` eintragen.
- Zusatzkategorien werden normalisiert, gleichnamige Kategorien pro Eintrag werden zusammengefuehrt und in `DailySubmissionExtra` gespeichert.
- Light-Teilnehmer koennen dieselben Tracking-Daten speichern, aber ohne Video-Upload, Review, Joker oder Schuldenlogik.
- Im Light Mode bleiben die Eingabefelder fuer Push-ups, Sit-ups, Zusatzkategorien und Notizen sichtbar. Video-Upload, Krankmeldung, Joker, Einladungen und Review-Ansichten werden ausgeblendet bzw. serverseitig blockiert.
- Die Light-/Full-Faehigkeiten sind zentral in `src/lib/participation-policy.ts` definiert. Neue UI- oder API-Gates sollen diese Funktionen nutzen statt eigene `isLightParticipant`-Checks zu duplizieren.

Im Leistungsdiagramm sind standardmaessig nur die Gesamtwerte fuer Liegestuetze und Sit-ups sichtbar. Einzelne Sets und Zusatzkategorien sind vorhanden, aber ausgeblendet, damit der Graph ruhig bleibt. Der Zeitraum kann zwischen `7`, `14`, `30` und `Alle` gewechselt werden.

In der Teilnehmeruebersicht bleiben Zusatzkategorien ebenfalls eingeklappt. Wer vergleichen moechte, kann die optionalen Spalten fuer alle vorhandenen Zusatzkategorien aufklappen.

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

GITHUB_APP_ID=1234567
GITHUB_APP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
GITHUB_APP_REPO_OWNER=Krarilotus
GITHUB_APP_REPO_NAME=fitcal
GITHUB_APP_ISSUE_LABELS=feature-request,fitcal
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
- App-/Git-Checkout: `/home/fitcal/app`
- Betriebsdaten, Uploads und Server-Deploy-Key: `/opt/fitcal`

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

### GitHub Feature Requests

Damit Nutzer aus dem Dashboard direkt einen Feature-Wunsch als GitHub-Issue anlegen koennen, nutzt FitCal jetzt eine echte GitHub App statt eines usergebundenen Tokens.

#### GitHub App anlegen

In GitHub:
1. `Settings`
2. `Developer settings`
3. `GitHub Apps`
4. `New GitHub App`

Empfohlene Einstellungen:
- GitHub App name: z. B. `FitCal Feature Requests`
- Homepage URL: `https://fitcal.hisqu.de`
- Webhook:
  - deaktiviert lassen, weil FitCal fuer diese Funktion keine Webhooks braucht
- Repository permissions:
  - `Issues`: `Read and write`
  - `Metadata`: `Read-only`

Danach:
1. App speichern
2. unter der App `Generate a private key`
3. die PEM-Datei sicher ablegen
4. die App ueber `Install App` auf `Krarilotus/fitcal` installieren
5. am besten `Only select repositories` und nur `fitcal` waehlen

Dann die folgenden Umgebungsvariablen in `.env.production` setzen:

```env
GITHUB_APP_ID=1234567
GITHUB_APP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
# Optional statt GITHUB_APP_PRIVATE_KEY:
# GITHUB_APP_PRIVATE_KEY_BASE64=LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0t...
# Optional; wenn leer, wird die Installation ueber owner/repo automatisch gefunden
GITHUB_APP_INSTALLATION_ID=
GITHUB_APP_REPO_OWNER=Krarilotus
GITHUB_APP_REPO_NAME=fitcal
GITHUB_APP_ISSUE_LABELS=feature-request,fitcal
```

Wichtig:
- Issue-Aktionen werden in GitHub der App-Installation zugerechnet, nicht einem einzelnen Benutzer.
- Fuer FitCal brauchst du aktuell weder OAuth-Callback noch Webhook-Secret.
- Ohne diese Variablen zeigt das Dashboard nur an, dass Feature-Requests gerade nicht verbunden sind.

### Clone

Einfachster Weg nach dem Deploy-Key:

```bash
sudo ./deploy/bootstrap-fitcal.sh
```

Das Skript:
- legt den `fitcal`-Systemuser an
- erzeugt das Deploy-Key-Paar
- klont oder updated `/home/fitcal/app`
- legt bei Bedarf `.env.production` aus der Example-Datei an

Manuell geht auch:

```bash
sudo -u fitcal git clone git@github.com:Krarilotus/fitcal.git /home/fitcal/app
```

Dann entweder:

Option A:
- deine lokale [`.env.server`](/c:/Users/Johannes/Documents/DanielMotz/fitcal/.env.server) per SCP/WinSCP nach `/home/fitcal/app/.env.production` kopieren

Option B:

```bash
cd /home/fitcal/app
sudo -u fitcal cp .env.production.example .env.production
sudo -u fitcal nano .env.production
```

## Updates auf dem Server

Einfacher PuTTY-Update mit genau zwei Befehlen:

```bash
cd /home/fitcal/app
./update.sh
```

Falls `./update.sh` einmal nicht ausfuehrbar ist:

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
- bei Root-Ausfuehrung zusaetzlich:
  - `deploy/nginx-fitcal.conf` nach `/etc/nginx/sites-available/fitcal.hisqu.de.conf` kopieren
  - `nginx -t`
  - `systemctl reload nginx`

Optional kannst du Branch/User/Env ueberschreiben:

```bash
APP_USER=fitcal APP_BRANCH=main ENV_FILE=.env.production ./update.sh
```

Optional kannst du auch das Nginx-Sync deaktivieren:

```bash
SYNC_NGINX=0 ./update.sh
```

## Automatisches Deployment bei Push auf `main`

Dieses Repo ist fuer automatisches Production-Deployment vorbereitet. Der GitHub-Actions-Worker heisst `Deploy FitCal` und liegt unter [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
Bei jedem Push auf `main` verbindet sich dieser Worker per SSH mit dem Server und fuehrt dort das normale Update aus:

```bash
sudo /home/fitcal/app/update.sh
```

Der App-Code liegt dabei unter `/home/fitcal/app`. Betriebsdaten bleiben unter `/opt/fitcal`, z. B. SQLite in `/opt/fitcal/data` und Uploads in `/opt/fitcal/uploads`.

### Server-User fuer GitHub Actions

Einmalig auf dem Server:

```bash
sudo adduser --disabled-password --gecos "" deployfitcal
sudo -u deployfitcal ssh-keygen -t ed25519 -f /home/deployfitcal/.ssh/fitcal_github_actions -N ""
sudo -u deployfitcal cp /home/deployfitcal/.ssh/fitcal_github_actions.pub /home/deployfitcal/.ssh/authorized_keys
sudo chmod 700 /home/deployfitcal/.ssh
sudo chmod 600 /home/deployfitcal/.ssh/authorized_keys
sudo chown -R deployfitcal:deployfitcal /home/deployfitcal/.ssh
```

Dann `visudo` oeffnen:

```bash
sudo visudo
```

Diese Zeile eintragen, damit GitHub Actions nur das Update-Skript ohne Passwort ausfuehren darf. Der Workflow ruft genau diesen absoluten Pfad auf, damit der Deploy-User keinen eigenen Zugriff auf `/home/fitcal/app` braucht:

```text
deployfitcal ALL=(root) NOPASSWD: /home/fitcal/app/update.sh
```

Private Key fuer GitHub anzeigen:

```bash
sudo cat /home/deployfitcal/.ssh/fitcal_github_actions
```

Den kompletten Inhalt inklusive `-----BEGIN OPENSSH PRIVATE KEY-----` und `-----END OPENSSH PRIVATE KEY-----` kopieren.

### GitHub-Secrets setzen

In GitHub mit einem Account anmelden, der Admin-Rechte auf `Krarilotus/fitcal` hat. Dann:

`Krarilotus/fitcal` -> `Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`

Diese Repository-Secrets anlegen:

- `FITCAL_DEPLOY_HOST`: Hostname oder IP des Servers
- `FITCAL_DEPLOY_USER`: `deployfitcal`
- `FITCAL_DEPLOY_KEY`: privater SSH-Key aus `/home/deployfitcal/.ssh/fitcal_github_actions`
- `FITCAL_DEPLOY_PORT`: `22`, oder optional weglassen, wenn SSH auf Port `22` laeuft

Beispiel:

```text
FITCAL_DEPLOY_HOST = 94.16.31.179
FITCAL_DEPLOY_USER = deployfitcal
FITCAL_DEPLOY_KEY  = -----BEGIN OPENSSH PRIVATE KEY----- ...
FITCAL_DEPLOY_PORT = 22
```

Nach dem naechsten Push auf `main` laeuft der Worker unter `Actions` -> `Deploy FitCal`. Dort sieht man auch Logs, falls SSH, sudo oder Docker fehlschlagen.

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
cd /home/fitcal/app
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
sudo cp /home/fitcal/app/deploy/nginx-fitcal.conf /etc/nginx/sites-available/fitcal.hisqu.de.conf
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

## Testen der Video-Kompression

Sinnvolle lokale Testfaelle:

1. Kleines Handyvideo auswaehlen
- im Dashboard sollte zuerst `Encoder lädt ...` erscheinen
- danach `Videos werden komprimiert ...`
- erst danach startet der eigentliche Upload

2. Grosses Handyvideo auswaehlen
- die Seite soll im Dashboard bleiben
- bei Erfolg landet der Upload normal wieder im Dashboard
- wenn die komprimierte Datei trotzdem zu gross bleibt, erscheint eine klare Fehlermeldung statt einer kaputten API-Seite

3. Nach erfolgreichem Upload pruefen
- Video oeffnen
- Scrubbing / Seek testen
- `2x`-Wiedergabe im Review testen

Automatisierte Checks:

```bash
npm run test:sim
npm run lint
npm run build
```

## Lokaler Dashboard-Test

Fuer einen schnellen lokalen UX-Check nach Aenderungen am Dashboard:
1. `npm run dev`
2. als normaler oder Reviewer-Account anmelden
3. Tabs einmal komplett pruefen:
- `Uebersicht`: Ziel und Tagesdaten sichtbar
- `Uploads`: offene Tage, Claim-Aktionen, Video-Aktionen
- `Timeline`: Verlaufsauswahl und Review-Feedback
- `Metastats`: Charts und Messdaten
- `Profil`: Profil, E-Mail-Verifizierungsstatus, Einladen, Feature-Request
- `Review`: Review-Ansicht und Pending-Tab
4. als Light-Account anmelden und pruefen:
- `Uploads`: Tracking-Felder sichtbar, Speichern ohne Video moeglich
- kein `Review`-Tab, keine Video-, Joker- oder Krankmeldungsaktionen
- `Profil`: Feature-Request sichtbar, Einladungen ausgeblendet

Automatisierte Dashboard-Checks:

```bash
npx playwright test --config=playwright.config.mts tests/e2e/specs/dashboard.spec.ts
```

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
nano /home/fitcal/app/.env.production
./deploy/install-fitcal-service.sh
certbot --nginx -d fitcal.hisqu.de
```

## Hinweise

- Der Container bindet nur lokal an `127.0.0.1`.
- Oeffentlich geht alles ueber Nginx.
- Uploads liegen in `/opt/fitcal/uploads`.
- SQLite liegt in `/opt/fitcal/data`.
- Ohne Resend-Konfiguration schreibt die App Reset-Links nur ins Log.
