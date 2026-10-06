# GestAuto — Document de conception

Plateforme web de gestion de flotte automobile avec géolocalisation temps réel.
Stack : **Vue 3 · JavaScript · Node.js · Express · API REST · MongoDB · Socket.IO**.
Traceur cible (v1) : **Teltonika FMC920** (4G LTE Cat-M1/NB-IoT, GNSS, 1 DIN / 1 DOUT / 1 AIN).

---

## 1. Périmètre fonctionnel (MVP)

| Module | Fonctionnalités |
|---|---|
| Suivi temps réel | Carte Leaflet/OSM, marqueur par véhicule coloré par état (mouvement / ralenti / arrêt / hors ligne), cap GPS, suivi d'un véhicule, filtres, zones affichées |
| Véhicules | CRUD, affectation traceur et conducteur, limite de vitesse, odomètre mis à jour par le boîtier |
| Conducteurs | CRUD, permis + expiration, identification iButton (IO 78) |
| Traceurs | CRUD, état en ligne, dernières valeurs I/O, **envoi de commandes GPRS** (Codec 12 : `getinfo`, `setdigout 1` pour anti-démarrage…) |
| Trajets | Détection automatique contact ON → OFF, distance (odomètre boîtier), durée, vitesses, ralenti, **replay** animé avec trace colorée par vitesse |
| Géofencing | Zones cercle / polygone dessinées sur la carte, alertes entrée / sortie, restriction à certains véhicules |
| Alertes | Excès de vitesse (avec hystérésis), entrée/sortie de zone, choc, remorquage, brouillage, débranchement, conduite brusque, échéances ; notifications temps réel, acquittement |
| Maintenance | Entretiens planifiés par date et/ou kilométrage, historique, coûts, rappels automatiques |
| Documents | Assurance, carte grise, contrôle technique, vignette, permis — rappel J-30 |
| Administration | Utilisateurs, rôles `admin` / `manager` / `viewer`, authentification JWT |

---

## 2. Architecture

```
 ┌──────────────┐  TCP :5027 (Codec 8E)   ┌───────────────────────────── Node.js ─────────────────────────────┐
 │ FMC920 (4G)  │ ───────────────────────▶│  Passerelle Teltonika   ──▶  telemetryService  ──▶  MongoDB      │
 │  GNSS + I/O  │ ◀── ACK / Codec 12 ─────│  (net.Server)                 │  trips / geofences / alerts      │
 └──────────────┘                         │                               ▼                                  │
                                          │                        Bus d'événements (EventEmitter)           │
                                          │                               │                                  │
 ┌──────────────┐  HTTPS REST /api        │  Express (API REST, JWT)      ▼                                  │
 │  Front Vue 3 │ ◀──────────────────────▶│                         Socket.IO (position, alert, status)      │
 │  Leaflet/OSM │ ◀══ WebSocket ══════════│                                                                  │
 └──────────────┘                         │  Planificateur (node-cron) : hors-ligne, échéances               │
                                          └──────────────────────────────────────────────────────────────────┘
```

**Choix structurants**

- **Un seul processus Node** pour le MVP (passerelle TCP + API + temps réel) relié par un **bus d'événements interne**. Pour monter en charge, la passerelle devient un service séparé et le bus est remplacé par **Redis Pub/Sub** (+ `@socket.io/redis-adapter`) sans modifier les émetteurs/consommateurs.
- **Acquittement après persistance** : le serveur n'acquitte un paquet AVL qu'après l'avoir enregistré. En cas d'erreur, le FMC920 conserve et renvoie les données → aucune perte.
- **Positions en collection *time series*** MongoDB (≥ 6.0) : stockage compressé, requêtes par plage temporelle efficaces, rétention automatique (`POSITIONS_RETENTION_DAYS`).
- **Dernier état dénormalisé** sur le véhicule (`lastPosition`) : la carte se charge en une requête.
- **Front piloté par configuration** : `CrudPage` + `DataTable` + `FormField` génèrent 6 écrans de gestion à partir de simples définitions de colonnes et de champs.

---

## 3. Intégration Teltonika FMC920

### 3.1 Configuration du boîtier (Teltonika Configurator)

| Paramètre | Valeur |
|---|---|
| GPRS → APN | APN de l'opérateur de la SIM (ex. IAM / Orange / inwi) |
| Server settings → Domain | IP publique ou nom de domaine du serveur |
| Server settings → Port | `5027` (variable `TCP_PORT`) |
| Server settings → Protocol | **TCP** |
| Data protocol | **Codec 8 Extended** (recommandé) ou Codec 8 |
| Data acquisition (Home / Roaming) | En mouvement : 10–30 s ou 100–200 m ou 10° ; à l'arrêt : 5–15 min |
| I/O | Activer Ignition (239), Movement (240), External Voltage (66), Total Odometer (16), GSM Signal (21) ; optionnel : iButton (78), Green Driving (253), Crash (247), Towing (246), Jamming (249), Unplug (252) |
| Odomètre | *Trip / Odometer → Odometer source : GNSS* et saisir le kilométrage initial du véhicule |
| Ignition source | *DIN1* si le fil APC est câblé, sinon *Power voltage* (seuil ~13,2 V) ou *Accelerometer* |

### 3.2 Protocole implémenté (`server/src/teltonika/`)

1. **Handshake** : `[2 o longueur][IMEI ASCII]` → réponse `0x01` (accepté) / `0x00` (refusé). Les IMEI inconnus sont refusés, sauf `AUTO_REGISTER_DEVICES=true` (dev).
2. **Paquet AVL** : `00000000 | longueur (4 o) | codec (0x08 / 0x8E) | N1 | enregistrements… | N2 | CRC-16/IBM (4 o)`.
3. **Enregistrement** : horodatage ms (8 o), priorité, GPS (lng/lat ×10⁻⁷, altitude, cap, satellites, vitesse), puis groupes d'I/O 1/2/4/8 octets (+ longueur variable en 8E).
4. **ACK** : nombre d'enregistrements (4 o BE).
5. **Commandes Codec 12** : `0x0C | 0x01 | type 0x05 | taille | commande | 0x01 | CRC`, réponse type `0x06`.

Le parseur est validé par des tests unitaires sur les **trames d'exemple officielles Teltonika** (Codec 8, 8E, 12) et un test d'intégration TCP (paquets fragmentés, ACK, commande).

### 3.3 Correspondance I/O → métier

| IO | Nom | Usage dans GestAuto |
|---|---|---|
| 239 | Ignition | Début / fin de trajet, état « ralenti » |
| 240 | Movement | Information |
| 16 | Total Odometer (m) | Kilométrage véhicule, distance des trajets |
| 66 / 67 | Tension externe / batterie (mV) | Télémétrie, santé de l'alimentation |
| 21 | GSM Signal (0-5) | Diagnostic |
| 78 | iButton | Identification conducteur sur le trajet |
| 247 / 246 / 249 / 252 | Crash / Towing / Jamming / Unplug | Alertes critiques |
| 253 / 254 | Green driving type / valeur | Alerte conduite brusque |
| 179 | DOUT1 | État de l'anti-démarrage (commande `setdigout`) |

Ajouter un I/O : une ligne dans `ioElements.js`.

---

## 4. Modèle de données (MongoDB)

| Collection | Champs principaux | Index |
|---|---|---|
| `users` | name, email, passwordHash, role, active | email (unique) |
| `vehicles` | plate, brand, model, category, fuelType, status, speedLimit, odometerKm, device→, driver→, **lastPosition** {location, speed, angle, ignition, timestamp…}, insideGeofences[], overspeeding | plate (unique), lastPosition.location (2dsphere) |
| `drivers` | firstName, lastName, phone, licenseNumber, licenseExpiry, ibutton, vehicle→ | — |
| `devices` | imei, model, simNumber, vehicle→, online, lastSeenAt, lastIo | imei (unique) |
| `positions` *(time series)* | timestamp, meta {device, vehicle}, location, speed, angle, altitude, satellites, ignition, io | meta.vehicle + timestamp |
| `trips` | vehicle→, driver→, status, startAt, endAt, start/endLocation, distanceKm, maxSpeed, avgSpeed, durationSec, idleSec, overspeedCount | vehicle + startAt |
| `geofences` | name, shape (circle/polygon), center + radius / area (GeoJSON), vehicles[], alertOnEnter/Exit, active | — |
| `alerts` | type, severity, message, vehicle→, geofence→, location, occurredAt, acknowledged… | acknowledged + occurredAt, vehicle + occurredAt |
| `maintenances` | vehicle→, type, status, dueDate, dueOdometerKm, doneAt, cost, garage, reminded | vehicle + status + dueDate |
| `documents` | type, vehicle→ / driver→, reference, provider, expiryDate, reminded | expiryDate |

Coordonnées toujours en GeoJSON `[longitude, latitude]`.

---

## 5. API REST

Préfixe `/api`, JSON, authentification `Authorization: Bearer <JWT>` (sauf login/health).
Listes : `?page=&limit=&search=&sort=` + filtres → `{ items, total, page, limit }`.
Écriture réservée aux rôles `admin` et `manager`.

| Méthode | Route | Description |
|---|---|---|
| POST | `/auth/login` | → `{ token, user }` |
| GET | `/auth/me` | Utilisateur courant |
| GET | `/dashboard` | KPIs flotte, alertes récentes, échéances, km du jour |
| CRUD | `/vehicles` | + `GET /vehicles/live` (état temps réel), `GET /vehicles/:id/positions?from&to` |
| CRUD | `/drivers` | |
| CRUD | `/devices` | + `POST /devices/:id/commands` `{ command }` → réponse du boîtier |
| GET | `/trips?vehicle&driver&from&to` | Liste + totaux |
| GET | `/trips/:id` | Trajet + positions (replay) |
| CRUD | `/geofences` | |
| GET | `/alerts?type&severity&acknowledged&vehicle` | + `PATCH /alerts/:id/ack`, `POST /alerts/ack-all` |
| CRUD | `/maintenance` | |
| CRUD | `/documents` | |
| CRUD | `/users` | Admin uniquement |

Erreurs : `400` validation (détail par champ, Zod), `401`, `403`, `404`, `409` doublon / boîtier non connecté, `504` délai commande.

### Temps réel (Socket.IO, auth JWT au handshake)

| Événement | Charge utile |
|---|---|
| `position` | `{ vehicleId, plate, lastPosition, odometerKm, io }` |
| `device:status` | `{ deviceId, vehicleId, imei, online }` |
| `alert` | Alerte complète (véhicule et zone peuplés) |
| `vehicle:position` | Idem `position`, après `emit('subscribe', vehicleId)` |

---

## 6. Front-end (Vue 3 + Vite + Tailwind 4 + Pinia + Leaflet)

```
client/src/
├─ components/
│  ├─ ui/         AppButton, AppIcon, AppBadge, AppModal, DataTable, FormField, PageHeader, StatCard, ToastContainer
│  ├─ crud/       CrudPage (liste + filtres + formulaire générés par configuration)
│  ├─ map/        BaseMap, FleetMap, vehicleMarker, geofenceLayer
│  └─ layout/     AppLayout (sidebar responsive, barre supérieure, badge alertes)
├─ composables/   useCrud, useToast
├─ stores/        auth (JWT, rôles), fleet (état temps réel alimenté par Socket.IO)
├─ services/      api (fetch + JWT), socket
├─ utils/         format (dates, km, états véhicule), labels (traductions, options)
└─ views/         Dashboard, LiveMap, Vehicles, VehicleDetail, Drivers, Devices, Trips, TripReplay,
                  Geofences, Alerts, Maintenance, Documents, Users, Login
```

**Responsive** : sidebar en tiroir sous 1024 px, carte et liste empilées sur mobile, colonnes secondaires masquées (`hideOnMobile`), modales en *bottom sheet* sur petit écran.

---

## 7. Sécurité

- Mots de passe hachés (bcrypt), JWT signé (`JWT_SECRET` obligatoire en production), rôles vérifiés côté API.
- `helmet`, CORS restreint (`CORS_ORIGIN`), validation systématique des entrées (Zod).
- Passerelle TCP : liste blanche d'IMEI, une session par IMEI, timeout d'inactivité, CRC vérifié.
- En production : HTTPS (reverse proxy), pare-feu n'ouvrant que 443 et 5027, MongoDB non exposé, idéalement APN privé / VPN pour les boîtiers.

---

## 8. Feuille de route

| Phase | Contenu |
|---|---|
| **v1 — MVP** (ce dépôt) | Tout le périmètre §1 |
| v1.1 | Rapports PDF/Excel (kilométrage, trajets, vitesses par période), téléversement des documents (S3/MinIO), notifications e-mail/SMS des alertes |
| v1.2 | Multi-entreprise (champ `organization` + isolation des requêtes), journal d'audit, paramètres d'alerte par véhicule (horaires autorisés, ralenti max) |
| v2 | Carburant (CAN/LVCAN, tickets), score éco-conduite, application mobile conducteur, autres traceurs (Teltonika FMB/FMM, Queclink, Concox) via une interface `TrackerAdapter` |
| Scalabilité | Passerelle séparée, Redis Pub/Sub, MongoDB en replica set, réplication des instances API derrière un load balancer (sticky sessions pour Socket.IO) |
