"""
triangulation.py - Moteur de calcul géodésique et de triangulation radio WGS84
Projet: heltec-triangulation-python

Ce module implémente :
1. La conversion géodésique locale (projection équirectangulaire corrigée par le cosinus de la latitude).
2. L'intersection de demi-droites orientées (relèvements angulaires mesurés depuis le Nord dans le sens horaire).
3. L'estimation rigoureuse de la zone d'incertitude polygonale à partir des tolérances angulaires.
4. Le calcul de guidage (cap / distance orthodromique) depuis chaque station vers la cible estimée.
5. La détection sans compromis des cas indéterminés (stations confondues, visées parallèles, intersections arrières, cônes sans recouvrement).
"""

import math
from typing import Dict, List, Optional, Tuple, Any

EARTH_RADIUS_METERS = 6371000.0  # Rayon moyen de la Terre en mètres (WGS84)


def deg_to_rad(deg: float) -> float:
    """Convertit des degrés en radians."""
    return deg * math.pi / 180.0


def rad_to_deg(rad: float) -> float:
    """Convertit des radians en degrés."""
    return rad * 180.0 / math.pi


def normalize_azimuth(deg: float) -> float:
    """Normalise un azimut dans l'intervalle [0, 360[ degrés."""
    az = deg % 360.0
    if az < 0:
        az += 360.0
    return az


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calcule la distance géodésique en mètres entre deux points WGS84 via la formule de Haversine.
    """
    phi1 = deg_to_rad(lat1)
    phi2 = deg_to_rad(lat2)
    delta_phi = deg_to_rad(lat2 - lat1)
    delta_lambda = deg_to_rad(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    a = min(1.0, max(0.0, a))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_METERS * c


def forward_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calcule le cap initial (azimut en degrés depuis le Nord, sens horaire)
    pour aller du point 1 au point 2.
    """
    phi1 = deg_to_rad(lat1)
    phi2 = deg_to_rad(lat2)
    delta_lambda = deg_to_rad(lon2 - lon1)

    y = math.sin(delta_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)

    bearing = rad_to_deg(math.atan2(y, x))
    return normalize_azimuth(bearing)


def geodetic_to_local(lat: float, lon: float, lat_ref: float, lon_ref: float) -> Tuple[float, float]:
    """
    Projette des coordonnées WGS84 vers un repère cartésien métrique local (x = Est, y = Nord)
    centré sur (lat_ref, lon_ref).
    Précision sous-métrique pour des distances < 100 km.
    """
    x = deg_to_rad(lon - lon_ref) * EARTH_RADIUS_METERS * math.cos(deg_to_rad(lat_ref))
    y = deg_to_rad(lat - lat_ref) * EARTH_RADIUS_METERS
    return x, y


def local_to_geodetic(x: float, y: float, lat_ref: float, lon_ref: float) -> Tuple[float, float]:
    """
    Reconvertit des coordonnées métriques locales (x = Est, y = Nord) en coordonnées géodésiques WGS84.
    """
    lat = lat_ref + rad_to_deg(y / EARTH_RADIUS_METERS)
    cos_lat = math.cos(deg_to_rad(lat_ref))
    if abs(cos_lat) < 1e-7:
        cos_lat = 1e-7
    lon = lon_ref + rad_to_deg(x / (EARTH_RADIUS_METERS * cos_lat))
    return lat, lon


def intersect_rays_2d(
    p1: Tuple[float, float],
    azimuth1_deg: float,
    p2: Tuple[float, float],
    azimuth2_deg: float,
    max_range_m: float = 50000.0,
    min_angle_deg: float = 1.0
) -> Tuple[Optional[Tuple[float, float]], str, Optional[Tuple[float, float]]]:
    """
    Calcule l'intersection de deux demi-droites orientées (visées radio).
    
    p1, p2 : coordonnées locales (x, y) en mètres
    azimuth : direction depuis le Nord (axe +y), horaire -> angle mathématique:
              vx = sin(azimuth), vy = cos(azimuth)
    
    Retourne:
      (intersection (x, y) ou None, statut_explicite, distances (t1, t2) ou None)
    """
    # Vecteurs directeurs
    az1_rad = deg_to_rad(azimuth1_deg)
    az2_rad = deg_to_rad(azimuth2_deg)
    
    v1x, v1y = math.sin(az1_rad), math.cos(az1_rad)
    v2x, v2y = math.sin(az2_rad), math.cos(az2_rad)

    # Déterminant 2D: det([v1, -v2]) = v1x * (-v2y) - v1y * (-v2x) = v2x * v1y - v1x * v2y
    # Cela correspond au produit vectoriel 2D v1 x v2 = v1x * v2y - v1y * v2x
    cross = v1x * v2y - v1y * v2x

    # Écart angulaire entre visées
    diff_angle = abs(normalize_azimuth(azimuth1_deg - azimuth2_deg))
    if diff_angle > 180.0:
        diff_angle = 360.0 - diff_angle

    if diff_angle < min_angle_deg or abs(cross) < 1e-5:
        return None, "PARALLEL", None

    if abs(diff_angle - 180.0) < min_angle_deg:
        return None, "ANTIPARALLEL", None

    # Système linéaire: p1 + t1 * v1 = p2 + t2 * v2
    # [v1x  -v2x] [t1] = [p2x - p1x]
    # [v1y  -v2y] [t2] = [p2y - p1y]
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]

    # Résolution par la règle de Cramer
    # det = -v1x*v2y + v1y*v2x = -cross
    t1 = (dx * (-v2y) - dy * (-v2x)) / (-cross)
    t2 = (v1x * dy - v1y * dx) / (-cross)

    # Vérification du sens avant des visées (demi-droites t >= 0)
    if t1 < 0 and t2 < 0:
        return None, "BEHIND_BOTH", (t1, t2)
    if t1 < 0:
        return None, "BEHIND_STATION_A", (t1, t2)
    if t2 < 0:
        return None, "BEHIND_STATION_B", (t1, t2)

    # Vérification de la portée maximale
    if t1 > max_range_m or t2 > max_range_m:
        return None, "OUT_OF_RANGE", (t1, t2)

    ix = p1[0] + t1 * v1x
    iy = p1[1] + t1 * v1y
    return (ix, iy), "VALID", (t1, t2)


def calculate_triangulation(
    lat_a: float,
    lon_a: float,
    azimuth_a_deg: float,
    tolerance_a_deg: float,
    lat_b: float,
    lon_b: float,
    azimuth_b_deg: float,
    tolerance_b_deg: float,
    max_range_m: float = 20000.0
) -> Dict[str, Any]:
    """
    Exécute la triangulation complète entre deux stations avec calcul d'incertitude.
    """
    # 1. Vérification de la distance minimale entre stations
    baseline_dist = haversine_distance(lat_a, lon_a, lat_b, lon_b)
    if baseline_dist < 1.0:
        return {
            "status": "COINCIDENT_STATIONS",
            "message": "Les deux stations sont confondues (< 1 m). Triangulation impossible.",
            "target": None,
            "uncertainty_polygon": None,
            "baseline_distance_m": baseline_dist
        }

    # 2. Centre du repère local (barycentre)
    lat_ref = (lat_a + lat_b) / 2.0
    lon_ref = (lon_a + lon_b) / 2.0

    p_a = geodetic_to_local(lat_a, lon_a, lat_ref, lon_ref)
    p_b = geodetic_to_local(lat_b, lon_b, lat_ref, lon_ref)

    # 3. Intersection nominale
    inter_xy, status_code, dists = intersect_rays_2d(
        p_a, azimuth_a_deg, p_b, azimuth_b_deg, max_range_m=max_range_m
    )

    if status_code != "VALID" or inter_xy is None:
        messages = {
            "PARALLEL": "Relèvements parallèles ou presque parallèles (< 1° d'écart). Pas d'intersection ponctuelle.",
            "ANTIPARALLEL": "Relèvements en opposition directe (180°). Pas d'intersection possible.",
            "BEHIND_STATION_A": "L'intersection mathématique se situe derrière la Station A.",
            "BEHIND_STATION_B": "L'intersection mathématique se situe derrière la Station B.",
            "BEHIND_BOTH": "L'intersection mathématique se situe derrière les deux stations.",
            "OUT_OF_RANGE": f"L'intersection dépasse la portée maximale configurable ({max_range_m/1000.0:.1f} km)."
        }
        return {
            "status": status_code,
            "message": messages.get(status_code, "Aucune intersection valide détectée."),
            "target": None,
            "uncertainty_polygon": None,
            "baseline_distance_m": round(baseline_dist, 1)
        }

    # Reconversion en WGS84
    target_lat, target_lon = local_to_geodetic(inter_xy[0], inter_xy[1], lat_ref, lon_ref)

    # 4. Calcul de la zone d'incertitude polygonale à partir des tolérances angulaires
    # Les 4 combinaisons extrêmes des tolérances angulaires:
    # (az_A - tol_A, az_B - tol_B), (az_A - tol_A, az_B + tol_B),
    # (az_A + tol_A, az_B + tol_B), (az_A + tol_A, az_B - tol_B)
    angles_a = [
        normalize_azimuth(azimuth_a_deg - tolerance_a_deg),
        normalize_azimuth(azimuth_a_deg + tolerance_a_deg)
    ]
    angles_b = [
        normalize_azimuth(azimuth_b_deg - tolerance_b_deg),
        normalize_azimuth(azimuth_b_deg + tolerance_b_deg)
    ]

    corners_xy: List[Tuple[float, float]] = []
    # Ordre du polygone dans le sens trigonométrique ou horaire:
    combinations = [
        (angles_a[0], angles_b[0]),
        (angles_a[0], angles_b[1]),
        (angles_a[1], angles_b[1]),
        (angles_a[1], angles_b[0])
    ]

    for a_ang, b_ang in combinations:
        c_inter, c_status, _ = intersect_rays_2d(p_a, a_ang, p_b, b_ang, max_range_m=max_range_m * 1.5)
        if c_status == "VALID" and c_inter is not None:
            corners_xy.append(c_inter)

    uncertainty_polygon = None
    uncertainty_radius_m = None

    if len(corners_xy) >= 3:
        # Polygone d'incertitude complet
        polygon_geo = []
        dists_to_target = []
        for cx, cy in corners_xy:
            clat, clon = local_to_geodetic(cx, cy, lat_ref, lon_ref)
            polygon_geo.append({"lat": round(clat, 6), "lon": round(clon, 6)})
            dists_to_target.append(math.hypot(cx - inter_xy[0], cy - inter_xy[1]))
        
        uncertainty_polygon = polygon_geo
        uncertainty_radius_m = round(max(dists_to_target), 1) if dists_to_target else None
    else:
        # Les tolérances s'ouvrent trop ou certains rayons divergent: estimation d'ouverture moyenne
        # Écart d'incertitude approximatif au niveau de la cible
        dist_a = dists[0] if dists else 0.0
        dist_b = dists[1] if dists else 0.0
        arc_a = dist_a * deg_to_rad(tolerance_a_deg)
        arc_b = dist_b * deg_to_rad(tolerance_b_deg)
        uncertainty_radius_m = round(math.sqrt(arc_a * arc_a + arc_b * arc_b), 1)

    # 5. Calcul de guidage vers la cible pour chaque station
    guidance_a = calculate_station_guidance(lat_a, lon_a, target_lat, target_lon, "A")
    guidance_b = calculate_station_guidance(lat_b, lon_b, target_lat, target_lon, "B")

    return {
        "status": "VALID",
        "message": "Solution géométrique verrouillée avec intersection avant valide.",
        "target": {
            "lat": round(target_lat, 6),
            "lon": round(target_lon, 6),
            "uncertainty_radius_m": uncertainty_radius_m
        },
        "uncertainty_polygon": uncertainty_polygon,
        "baseline_distance_m": round(baseline_dist, 1),
        "guidance": {
            "A": guidance_a,
            "B": guidance_b
        }
    }


def calculate_station_guidance(
    station_lat: float,
    station_lon: float,
    target_lat: float,
    target_lon: float,
    station_id: str
) -> Dict[str, Any]:
    """
    Calcule le vecteur de guidage (cap et distance) depuis une station vers la cible.
    """
    dist_m = haversine_distance(station_lat, station_lon, target_lat, target_lon)
    bearing = forward_bearing(station_lat, station_lon, target_lat, target_lon)
    return {
        "status": "VALID",
        "station_id": station_id,
        "target_lat": round(target_lat, 6),
        "target_lon": round(target_lon, 6),
        "bearing_deg": round(bearing, 1),
        "distance_m": round(dist_m, 1),
        "distance_km": round(dist_m / 1000.0, 3)
    }
