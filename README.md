# GestAuto — Gestion de flotte automobile

Plateforme web de gestion de flotte avec suivi GPS temps réel des traceurs **Teltonika FMC920**.
Vue 3 · Node.js / Express · MongoDB · Socket.IO · Leaflet.

➡️ Conception détaillée : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

```
GestAuto/
├─ server/   API REST + passerelle TCP Teltonika + Socket.IO + planificateur
├─ client/   Front Vue 3 (Vite, Tailwind 4, Pinia, Leaflet)
├─ docs/     Document de conception
└─ docker-compose.yml
```

## Démarrage rapide (développement)

Prérequis : Node.js ≥ 20, MongoDB ≥ 6 (local ou `docker run -d -p 27017:27017 mongo:7`).

```bash
# 1. Backend
cd server
cp .env.example .env        # sous Windows : copy .env.example .env
npm install
npm run seed                # process.env.ADMIN_EMAIL / process.env.ADMIN_PASSWORD + données de démo
npm run dev                 # API :3000, TCP Teltonika :5027

# 2. Front (autre terminal)
cd client
npm install
npm run dev                 # http://localhost:5173

# 3. Simuler un FMC920 (autre terminal)
cd server
npm run simulate            # IMEI 356307042441013, trajet dans Casablanca
```

Ouvrez la **Carte temps réel** : le véhicule `12345-A-6` se déplace, les trajets, alertes de vitesse et entrées/sorties de la zone « Dépôt » apparaissent en direct.
Depuis **Traceurs**, le bouton ✈ envoie une commande GPRS au boîtier (le simulateur y répond).

## Avec Docker

```bash
cp server/.env.example server/.env   # définir JWT_SECRET, AUTO_REGISTER_DEVICES=false
docker compose up -d --build
docker compose exec server npm run seed
```

Front : http://localhost:8080 — TCP traceurs : port 5027.

## Brancher un vrai FMC920

1. Créer le traceur dans **Traceurs** (IMEI), puis l'affecter à un véhicule.
2. Dans Teltonika Configurator : *GPRS → Server settings* → domaine/IP publique du serveur, port `5027`, protocole **TCP**, *Data protocol* **Codec 8 Extended**.
3. Ouvrir/rediriger le port 5027 TCP vers le serveur.

Détails (I/O, source d'allumage, odomètre) : section 3 de la conception.

## Tests

```bash
cd server && npm test   # parseur Codec 8/8E/12 (trames officielles), serveur TCP, géofences
```
