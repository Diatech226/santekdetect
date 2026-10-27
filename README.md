# heltec-triangulation-python

Projet autonome de triangulation radio en **Python pur (standard library)** pour PC Windows, spécialement conçu pour localiser votre propre émetteur **HackRF** lors d'essais terrain à l'aide de deux stations **Heltec V4.3** équipées de modules GPS.

---

## 1. Matériel & Principe de fonctionnement

> [!IMPORTANT]
> **Rappel matériel fondamental** : Une carte Heltec ESP32 avec son récepteur GPS mesure sa propre position géographique et son heure précise (PPS/NMEA), mais **ne peut pas mesurer automatiquement la direction d'arrivée d'une onde radio**.
> 
> Pour cette première version :
> - Chaque opérateur pointe manuellement une antenne directive (ex. Yagi 3 éléments, Moxon ou cadre accordé) vers le signal du HackRF pour repérer le maximum de puissance (ou extinction).
> - L'azimut résultant (en degrés par rapport au Nord, 0° à 359° dans le sens horaire) est soit saisi manuellement sur l'interface du PC via les curseurs, soit transmis par le firmware de la station via l'API JSON.
> - Aucune capacité matérielle magique n'est inventée.

---

## 2. Démarrage rapide sous Windows

### Prérequis
- Un PC sous **Windows 10 ou 11**.
- **Python 3.11+** installé (disponible sur [python.org](https://www.python.org/)).
- **Aucune dépendance externe requise** : ni `pip`, ni `npm`, ni `node`, ni `docker`.

### Lancement en un clic
Double-cliquez simplement sur le fichier :
```cmd
lancer_triangulation.bat
```
Ce script démarre le serveur local sur `127.0.0.1:8080` et ouvre automatiquement votre navigateur par défaut.

### Lancement en ligne de commande
Dans un terminal Windows (Invite de commandes ou PowerShell) :
```cmd
python server.py --host 127.0.0.1 --port 8080
```
Pour écouter sur le réseau local avec protection par jeton :
```cmd
python server.py --host 0.0.0.0 --port 8080 --token MON_SECRET_HELTEC
```

---

## 3. Interface utilisateur (Écran unique)

L'application accessible sur `http://127.0.0.1:8080` regroupe toutes les fonctions sur une seule page :

1. **Formulaires Station A & B** :
   - Latitude et Longitude GPS (coordonnées décimales WGS84).
   - Réglette et champ direct pour l'azimut (0° à 359° avec repères cardinaux N/E/S/O).
   - Tolérance angulaire (ex. ±5.0°).
   - **Recalcul instantané** : Tout mouvement de curseur réévalue la position en temps réel (< 1 ms).
2. **Carte interactive (Leaflet avec repli hors-ligne)** :
   - Affiche les balises A et B, leurs rayons de visée et leurs cônes d'incertitude.
   - Trace la cible estimée du HackRF et le polygone d'incertitude géométrique.
   - **Fonctionnement hors-ligne** : Si le PC n'a pas accès à Internet sur le terrain, l'application bascule automatiquement sur un canevas vectoriel métrique local sans aucun plantage.
3. **Résultat lisible & Messages de guidage** :
   - Latitude / Longitude calculées de la cible et rayon d'incertitude estimé.
   - Guidage retour pour chaque station : **Cap** (azimut) et **Distance** (en mètres ou km) à parcourir pour rejoindre l'émetteur.
4. **Trois boutons d'action** :
   - `Exemple` : Charge des coordonnées convergentes réelles pour vérifier le système.
   - `Calculer` : Force un recalcul immédiat.
   - `Réinitialiser` : Remet à zéro les visées.

---

## 4. Documentation de l'API REST JSON

L'API est prête à communiquer avec les stations Heltec (via Wi-Fi, pont série USB ou passerelle LoRa).

### `POST /api/observations`
Enregistre une observation émise par une station Heltec.

**Exemple de requête JSON :**
```json
{
  "station_id": "A",
  "lat": 48.7750,
  "lon": 2.2950,
  "azimuth_deg": 40.0,
  "tolerance_deg": 4.5,
  "emission_id": "HACKRF_TEST_01",
  "timestamp": 1730000000.0
}
```

**Règles de validation strictes :**
- `emission_id` doit correspondre exactement entre les deux stations.
- L'écart d'horodatage entre A et B ne doit pas dépasser **30 secondes**.
- Sans solution géométrique valide (visées divergentes ou parallèles), aucun cercle ni position fantôme n'est inventé.

### `GET /api/state`
Renvoie l'état complet du calcul géométrique.

**Exemple de réponse :**
```json
{
  "success": true,
  "state": {
    "status": "VALID",
    "message": "Solution géométrique verrouillée avec intersection avant valide.",
    "target": {
      "lat": 48.8021,
      "lon": 2.3275,
      "uncertainty_radius_m": 48.2
    },
    "uncertainty_polygon": [
      {"lat": 48.8015, "lon": 2.3260},
      {"lat": 48.8030, "lon": 2.3280},
      {"lat": 48.8018, "lon": 2.3292},
      {"lat": 48.8005, "lon": 2.3270}
    ],
    "baseline_distance_m": 4050.4
  }
}
```

### `GET /api/guidance/A` et `GET /api/guidance/B`
Fournit le vecteur de ralliement prêt à être affiché sur l'écran OLED d'une Heltec.

**Exemple de réponse pour Station A :**
```json
{
  "status": "VALID",
  "station_id": "A",
  "target_lat": 48.8021,
  "target_lon": 2.3275,
  "bearing_deg": 40.1,
  "distance_m": 3840.5,
  "distance_km": 3.841
}
```

Si le calcul est indéterminé ou les visées parallèles :
```json
{
  "status": "NO_SOLUTION",
  "station_id": "A",
  "message": "Aucun guidage disponible (Relèvements parallèles ou presque parallèles)."
}
```

---

## 5. Simulation et Tests automatisés

### Exécuter les tests unitaires mathématiques
Vérifie la formule de Haversine, le cap initial, l'intersection de demi-droites et le rejet des cas invalides :
```cmd
python test_triangulation.py
```
*Résultat attendu : 7 tests passés avec succès en < 0.01s.*

### Lancer la simulation de deux Heltec
Avec le serveur en cours d'exécution dans une autre console, exécutez :
```cmd
python simulate_stations.py
```
Ce script simule l'envoi des coordonnées GPS de deux balises, calcule la position du HackRF, récupère le guidage et teste le rejet d'une désynchronisation supérieure à 30 secondes.

---

## 6. Bilan : Ce qui a été testé vs. Nécessitant le matériel physique

### Ce qui est testé et pleinement fonctionnel :
- [x] Moteur de projection locale métrique WGS84 et calcul de l'intersection de demi-droites orientées.
- [x] Calcul de la zone d'incertitude polygonale selon les tolérances angulaires.
- [x] Rejet strict des cas invalides (stations confondues, parallélisme < 1°, intersections situées derrière les stations, dépassement de portée max).
- [x] API REST complète (`observations`, `state`, `guidance/A`, `guidance/B`, `compute`, `example`, `reset`).
- [x] Synchronisation temporelle à 30 secondes et filtrage par `emission_id`.
- [x] Interface réactive en français avec curseurs temps réel, carte Leaflet et repli hors-ligne automatique.
- [x] Script de démarrage Windows `.bat` autonome.

### Ce qui nécessitera les essais avec le matériel physique ultérieur :
- [ ] Le flash du firmware ESP32 Arduino/PlatformIO sur les modules Heltec V4.3.
- [ ] La lecture des trames NMEA du module GPS Heltec via UART hardware.
- [ ] La liaison radio LoRa ou Wi-Fi entre les Heltec et le PC (ou pont série USB `pyserial`).
- [ ] Le calibrage de l'antenne directive physique pour la mesure manuelle d'azimut sur le signal émis par le HackRF.
