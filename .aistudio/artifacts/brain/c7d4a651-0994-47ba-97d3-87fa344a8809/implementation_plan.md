# heltec-triangulation-python

Système autonome et compact de triangulation radio pour deux stations Heltec V4.3 avec modules GPS, conçu pour localiser un émetteur HackRF en laboratoire ou sur le terrain depuis un PC Windows. L'application associe un serveur local en Python pur (sans dépendance externe) et une interface web épurée sur une seule page avec carte interactive, recalcul instantané et guidage des stations.

## User Review & Critical Decisions

> [!IMPORTANT]
> Les trois choix structurants confirmés lors de la phase de clarification :
> - **Cartographie & Terrain** : Intégration de Leaflet avec tuiles OpenStreetMap lorsque connecté à Internet, combiné à un repli graphique vectoriel immédiat (grille métrique locale WGS84 en Canvas/SVG) en l'absence de réseau.
> - **Dépendances système minimales** : Utilisation exclusive de la bibliothèque standard de Python 3.11+ (`http.server`, `urllib`, `json`, `math`, `unittest`, `dataclasses`). Aucun `pip install` ou compilation C n'est requis sur le PC Windows.
> - **Synchronisation des observations** : Fenêtre de corrélation temporelle fixée à 30 secondes entre les réceptions des stations A et B portant le même `emission_id`.

- **Choix confirmé 1 (Calcul géodésique)** : Projection locale équirectangulaire / Haversine adaptée aux distances d'essais terrain (< 50 km) garantissant une résolution sous-métrique sans bibliothèques lourdes comme GDAL ou PROJ.
- **Choix confirmé 2 (Sécurité réseau local)** : Serveur lié par défaut à `127.0.0.1`. Option d'écoute LAN `--host 0.0.0.0` protégée par un jeton d'authentification `Bearer` ou en-tête `X-Heltec-Token` configurable.

---

## 1. Overview & Core Concept

- **Fonction principale** : Réceptionner les coordonnées GPS et les azimuts relevés par deux stations Heltec V4.3 (ou saisis manuellement sur l'interface), calculer l'intersection des deux demi-droites de visée, délimiter la zone d'incertitude polygonale selon les tolérances angulaires, et fournir à chaque station un cap (bearing) et une distance de ralliement vers la cible.
- **Utilisateur & Contexte** : Expérimentateur radioamateur / testeur RF se déplaçant sur le terrain ou en atelier avec deux balises Heltec et un HackRF en émission balise.
- **Valeur clé** : Rigueur mathématique absolue (aucun résultat inventé quand les droites sont divergentes, parallèles ou que l'intersection se situe derrière les balises), temps réel sans latence, et zéro friction d'installation sur Windows via un double-clic sur `lancer_triangulation.bat`.

---

## 2. User Experience & Visual Design

### Parcours utilisateur & Éléments de l'écran unique

1. **Ruban supérieur d'état (Header)** :
   - Titre du projet `Heltec Triangulation` avec statut du serveur (`127.0.0.1:8080`) et état géométrique global (`Valide`, `Parallèle`, `Divergent`, `En attente`).
   - Actions rapides : Bouton « Exemple » (charge des coordonnées et azimuts réels qui convergent), « Calculer » (force un recalcul) et « Réinitialiser ».
2. **Panneau de contrôle latéral gauche (Stations A & B)** :
   - Deux blocs compacts pour Station A et Station B :
     - Coordonnées GPS (Latitude, Longitude en degrés décimaux WGS84).
     - Curseur rotatif / réglette d'azimut (0° à 360°, pas de 1°, graduation des points cardinaux N/E/S/O) avec champ numérique direct.
     - Tolérance angulaire (ex. ±5°, réglable de 1° à 30°).
   - Portée maximale de recherche configurable (ex. 10 km).
   - Recalcul déclenché immédiatement dès qu'un curseur ou champ change (`input` event).
3. **Zone centrale cartographique** :
   - Carte Leaflet centrée automatiquement sur la zone d'intérêt englobant Station A, Station B et l'intersection.
   - Tracé des deux stations avec repères distincts (Station A en bleu cobalt, Station B en cyan).
   - Rayons d'azimut projetés vers l'avant.
   - Cône de tolérance angulaire formant le polygone d'incertitude (fond semi-transparent coloré).
   - Marqueur HackRF estimé avec coordonnées et ellipse d'incertitude.
4. **Panneau de résultat & Guidage** :
   - État explicite en toutes lettres : `Solution géométrique verrouillée`, `Relèvements parallèles (< 1° d'écart)`, `Intersection située derrière les stations`, ou `Émissions non synchronisées`.
   - Coordonnées estimées : Latitude, Longitude, précision estimée en mètres.
   - Télémétrie de guidage :
     - Station A $\rightarrow$ Cible : Distance (m/km) et Cap (°).
     - Station B $\rightarrow$ Cible : Distance (m/km) et Cap (°).

---

## 3. Key Product Decisions & Trade-Offs

### Modèle mathématique de triangulation WGS84

- **Formule d'intersection de visées (Bearing-Bearing Intersection)** :
  1. Conversion des coordonnées géodésiques $(\text{lat}, \text{lon})$ en coordonnées locales tangentes planes métriques $(x, y)$ centrées sur le barycentre des deux stations (projection équirectangulaire corrigée par $\cos(\text{lat}_{\text{ref}})$).
  2. Chaque visée est représentée par une demi-droite d'origine $P_i$ et de vecteur unitaire $\vec{u}_i = (\sin(\theta_i), \cos(\theta_i))$ où $\theta$ est l'azimut depuis le nord géographique dans le sens horaire.
  3. Résolution du système linéaire $P_A + t_A \vec{u}_A = P_B + t_B \vec{u}_B$.
  4. **Validation stricte** :
     - Si $|\det(\vec{u}_A, \vec{u}_B)| < \epsilon$ (angle entre rayons $< 1^\circ$ ou $> 179^\circ$) : état `Parallèle / Indéterminé`.
     - Si $t_A < 0$ ou $t_B < 0$ : l'intersection mathématique se trouve derrière l'une des stations, état `Intersection arrière (Invalide)`.
     - Si $t_A > \text{portée\_max}$ ou $t_B > \text{portée\_max}$ : état `Hors de portée`.
- **Estimation de la zone d'incertitude** :
  - Évaluation des 4 intersections extrêmes formées par $(\theta_A \pm \Delta\theta_A)$ et $(\theta_B \pm \Delta\theta_B)$.
  - Délimitation du quadrilatère d'incertitude projeté sur la carte. Si les cônes ne se recoupent pas avant la portée max, aucun polygone trompeur n'est dessiné.

### Gestion de la synchronisation d'émission (Emission Correlation)

- Chaque observation reçue via l'API contient : `station_id` ("A" ou "B"), `lat`, `lon`, `azimuth_deg`, `tolerance_deg`, `timestamp` (ISO8601 ou UNIX timestamp), et `emission_id`.
- Le serveur associe uniquement deux observations si :
  1. `emission_id` est identique (ou observation manuelle en direct de l'interface).
  2. L'écart $|\text{timestamp}_A - \text{timestamp}_B| \le 30\text{ secondes}$.
  3. L'âge de la mesure la plus récente est inférieur à la durée de péremption (par défaut 5 minutes).

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Navigateur Web PC Windows                       │
│  [Formulaires A & B] ──> [Curseurs Azimut] ──> [Carte Leaflet / Canvas]│
│            ▲                                          │                │
│            └─────────────── JSON Fetch ───────────────┘                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP Local (127.0.0.1:8080)
┌───────────────────────────────────▼────────────────────────────────────┐
│              Serveur Python (server.py - Stdlib pure)                  │
│                                                                        │
│   ├── Handler HTTP (SimpleHTTPRequestHandler personnalisé)             │
│   │   ├── GET  /                   -> index.html + style.css + app.js  │
│   │   ├── POST /api/observations   -> Enregistre observation balise    │
│   │   ├── GET  /api/state          -> Retourne triangulation courante  │
│   │   ├── GET  /api/guidance/A     -> Vecteur cap/distance Station A   │
│   │   └── GET  /api/guidance/B     -> Vecteur cap/distance Station B   │
│   │                                                                    │
│   ├── Moteur de Calcul (triangulation.py)                              │
│   │   ├── Conversion WGS84 <-> Métrique local                          │
│   │   ├── Calcul d'intersection des demi-droites                       │
│   │   ├── Calcul du polygone d'incertitude angulaire                   │
│   │   └── Calcul de cap (forward azimuth) et distance (Haversine)      │
│   │                                                                    │
│   └── Gestionnaire d'État (state.py)                                   │
│       └── Corrélation des émissions (fenêtre 30s) & validation         │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │ HTTP REST / JSON
┌───────────────────────────────────┴────────────────────────────────────┐
│          Stations Heltec V4.3 (ou simulateur simulate_stations.py)     │
│   Station A (GPS + Azimut manuel) ──> POST /api/observations           │
│   Station B (GPS + Azimut manuel) ──> POST /api/observations           │
│   Lecture guidage                 <── GET  /api/guidance/{A,B}         │
└────────────────────────────────────────────────────────────────────────┘
```

### Endpoints de l'API REST JSON

1. `POST /api/observations` :
   ```json
   {
     "station_id": "A",
     "lat": 48.8566,
     "lon": 2.3522,
     "azimuth_deg": 45.0,
     "tolerance_deg": 5.0,
     "emission_id": "TEST_HACKRF_01",
     "timestamp": 1730000000.0
   }
   ```
2. `GET /api/state` :
   ```json
   {
     "status": "VALID",
     "message": "Intersection valide calculée",
     "emission_id": "TEST_HACKRF_01",
     "target": {
       "lat": 48.8650,
       "lon": 2.3700,
       "uncertainty_radius_m": 42.5
     },
     "uncertainty_polygon": [
       {"lat": 48.8648, "lon": 2.3685},
       {"lat": 48.8660, "lon": 2.3710},
       {"lat": 48.8640, "lon": 2.3715},
       {"lat": 48.8635, "lon": 2.3690}
     ],
     "stations": {
       "A": {"lat": 48.8566, "lon": 2.3522, "azimuth_deg": 45.0, "tolerance_deg": 5.0},
       "B": {"lat": 48.8500, "lon": 2.3700, "azimuth_deg": 350.0, "tolerance_deg": 5.0}
     }
   }
   ```
3. `GET /api/guidance/A` et `GET /api/guidance/B` :
   ```json
   {
     "status": "VALID",
     "station_id": "A",
     "target_lat": 48.8650,
     "target_lon": 2.3700,
     "bearing_deg": 46.2,
     "distance_m": 1620.4,
     "distance_km": 1.62
   }
   ```

### Organisation des fichiers livrés

- `server.py` : Serveur HTTP standard léger avec routage de l'API REST et distribution des fichiers statiques.
- `triangulation.py` : Cœur algorithmique mathématique WGS84, intersection de visées, gestion des cas limites et calculs de guidage.
- `static/index.html` : Interface en français, épurée, ergonomique et responsive.
- `static/style.css` : Feuille de style soignée respectant les principes de design scientifique (typographie lisible, chiffres tabulaires, contrastes adaptés).
- `static/app.js` : Contrôleur client gérant les interactions en temps réel, Leaflet et le repli hors-ligne.
- `simulate_stations.py` : Script de test démontrant l'envoi de mesures simulées par deux Heltec et la réception du guidage.
- `test_triangulation.py` : Suite complète de tests unitaires automatisés validant tous les cas géométriques (convergence, parallélisme, intersection arrière, tolérance temporelle).
- `lancer_triangulation.bat` : Script Windows pour démarrage immédiat en un clic.
- `README.md` : Guide complet en français avec explications matérielles, API, et commandes de test.
