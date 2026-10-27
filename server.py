#!/usr/bin/env python3
"""
server.py - Serveur web et API REST autonome pour heltec-triangulation-python
Utilise exclusivement la bibliothèque standard de Python 3 (http.server, urllib, json).
Aucune dépendance externe requise (pas de pip install).
"""

import os
import sys
import json
import time
import argparse
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
from typing import Dict, Any, Optional

# Import du moteur géodésique
from triangulation import calculate_triangulation, haversine_distance, forward_bearing


# État global en mémoire
class TriangulationState:
    def __init__(self, sync_window_sec: float = 30.0, max_age_sec: float = 300.0):
        self.sync_window_sec = sync_window_sec
        self.max_age_sec = max_age_sec
        self.observations: Dict[str, Dict[str, Any]] = {}
        self.manual_mode: bool = True
        self.max_range_m: float = 20000.0
        self.last_result: Dict[str, Any] = {
            "status": "WAITING_MEASURES",
            "message": "En attente des mesures des stations A et B.",
            "target": None,
            "uncertainty_polygon": None,
            "baseline_distance_m": None,
            "guidance": None
        }

    def reset(self):
        self.observations = {}
        self.last_result = {
            "status": "WAITING_MEASURES",
            "message": "Système réinitialisé. En attente de nouvelles mesures.",
            "target": None,
            "uncertainty_polygon": None,
            "baseline_distance_m": None,
            "guidance": None
        }

    def set_example(self):
        """Charge un exemple géométrique convergent cohérent."""
        now = time.time()
        # Deux stations en région parisienne / plaine
        # Station A: Sud-Ouest
        self.observations["A"] = {
            "station_id": "A",
            "lat": 48.8500,
            "lon": 2.3000,
            "azimuth_deg": 45.0,
            "tolerance_deg": 5.0,
            "emission_id": "EXEMPLE_HACKRF",
            "timestamp": now
        }
        # Station B: Sud-Est (à ~3.6 km à l'Est)
        self.observations["B"] = {
            "station_id": "B",
            "lat": 48.8500,
            "lon": 2.3500,
            "azimuth_deg": 315.0,
            "tolerance_deg": 5.0,
            "emission_id": "EXEMPLE_HACKRF",
            "timestamp": now
        }
        return self.compute()

    def record_observation(self, obs: Dict[str, Any]) -> Dict[str, Any]:
        station_id = obs.get("station_id", "").upper().strip()
        if station_id not in ("A", "B"):
            raise ValueError("Identifiant de station invalide. Doit être 'A' ou 'B'.")

        lat = float(obs["lat"])
        lon = float(obs["lon"])
        azimuth_deg = float(obs["azimuth_deg"])
        tolerance_deg = float(obs.get("tolerance_deg", 5.0))
        emission_id = str(obs.get("emission_id", "DEFAULT_EMISSION")).strip()
        timestamp = float(obs.get("timestamp", time.time()))

        if not (-90.0 <= lat <= 90.0):
            raise ValueError("Latitude invalide (doit être entre -90 et +90).")
        if not (-180.0 <= lon <= 180.0):
            raise ValueError("Longitude invalide (doit être entre -180 et +180).")
        if tolerance_deg <= 0.0 or tolerance_deg > 90.0:
            raise ValueError("Tolérance angulaire invalide (doit être entre 0.1° et 90°).")

        self.observations[station_id] = {
            "station_id": station_id,
            "lat": lat,
            "lon": lon,
            "azimuth_deg": azimuth_deg % 360.0,
            "tolerance_deg": tolerance_deg,
            "emission_id": emission_id,
            "timestamp": timestamp
        }

        return self.compute()

    def compute(self) -> Dict[str, Any]:
        obs_a = self.observations.get("A")
        obs_b = self.observations.get("B")

        if not obs_a or not obs_b:
            missing = "A et B" if not obs_a and not obs_b else ("B" if not obs_a else "A")
            self.last_result = {
                "status": "WAITING_MEASURES",
                "message": f"Mesure manquante pour la station {missing}.",
                "target": None,
                "uncertainty_polygon": None,
                "baseline_distance_m": None,
                "guidance": None
            }
            return self.last_result

        now = time.time()

        # 1. Vérification de l'identifiant d'émission
        if obs_a["emission_id"] != obs_b["emission_id"]:
            self.last_result = {
                "status": "EMISSION_MISMATCH",
                "message": f"Identifiants d'émission incompatibles: Station A='{obs_a['emission_id']}', Station B='{obs_b['emission_id']}'.",
                "target": None,
                "uncertainty_polygon": None,
                "baseline_distance_m": None,
                "guidance": None
            }
            return self.last_result

        # 2. Vérification de la fenêtre temporelle de corrélation (30 secondes)
        time_diff = abs(obs_a["timestamp"] - obs_b["timestamp"])
        if time_diff > self.sync_window_sec:
            self.last_result = {
                "status": "SYNC_TIMEOUT",
                "message": f"Observations trop désynchronisées ({time_diff:.1f}s d'écart > limite de {self.sync_window_sec:.0f}s).",
                "target": None,
                "uncertainty_polygon": None,
                "baseline_distance_m": None,
                "guidance": None
            }
            return self.last_result

        # 3. Vérification de la péremption (si non manuel)
        latest_ts = max(obs_a["timestamp"], obs_b["timestamp"])
        if (now - latest_ts) > self.max_age_sec and not self.manual_mode:
            self.last_result = {
                "status": "OBSOLETE_MEASURES",
                "message": f"Mesures périmées (âge {now - latest_ts:.0f}s > {self.max_age_sec:.0f}s).",
                "target": None,
                "uncertainty_polygon": None,
                "baseline_distance_m": None,
                "guidance": None
            }
            return self.last_result

        # 4. Calcul de triangulation rigoureux
        result = calculate_triangulation(
            lat_a=obs_a["lat"],
            lon_a=obs_a["lon"],
            azimuth_a_deg=obs_a["azimuth_deg"],
            tolerance_a_deg=obs_a["tolerance_deg"],
            lat_b=obs_b["lat"],
            lon_b=obs_b["lon"],
            azimuth_b_deg=obs_b["azimuth_deg"],
            tolerance_b_deg=obs_b["tolerance_deg"],
            max_range_m=self.max_range_m
        )

        result["emission_id"] = obs_a["emission_id"]
        result["time_diff_sec"] = round(time_diff, 1)
        self.last_result = result
        return self.last_result

    def get_guidance(self, station_id: str) -> Dict[str, Any]:
        station_id = station_id.upper()
        if self.last_result.get("status") != "VALID" or not self.last_result.get("guidance"):
            return {
                "status": "NO_SOLUTION",
                "station_id": station_id,
                "message": f"Aucun guidage disponible ({self.last_result.get('message')}).",
                "target_lat": None,
                "target_lon": None,
                "bearing_deg": None,
                "distance_m": None,
                "distance_km": None
            }
        guidance = self.last_result["guidance"].get(station_id)
        if not guidance:
            return {
                "status": "NO_SOLUTION",
                "station_id": station_id,
                "message": f"Station {station_id} inconnue.",
                "target_lat": None,
                "target_lon": None,
                "bearing_deg": None,
                "distance_m": None,
                "distance_km": None
            }
        return guidance


STATE = TriangulationState()
CONFIG = {
    "token": os.environ.get("TRIANGULATION_TOKEN", None),
    "static_dir": os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
}


class TriangulationHandler(BaseHTTPRequestHandler):
    """Handler HTTP servant l'interface statique et l'API JSON."""

    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Heltec-Token")

    def _check_auth(self) -> bool:
        """Vérifie le jeton d'authentification optionnel si configuré."""
        expected_token = CONFIG.get("token")
        if not expected_token:
            return True  # Pas de token configuré, accès ouvert en local

        # Vérification Header X-Heltec-Token ou Authorization Bearer
        token_hdr = self.headers.get("X-Heltec-Token")
        if token_hdr and token_hdr.strip() == expected_token:
            return True

        auth_hdr = self.headers.get("Authorization")
        if auth_hdr and auth_hdr.startswith("Bearer "):
            if auth_hdr[7:].strip() == expected_token:
                return True

        return False

    def _send_json(self, status_code: int, data: Any):
        body = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_HEAD(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")
        if not path:
            path = "/"
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")
        if not path:
            path = "/"

        # API Endpoints
        if path == "/api/state":
            obs_dict = STATE.observations
            res = {
                "success": True,
                "state": STATE.last_result,
                "stations": obs_dict,
                "config": {
                    "sync_window_sec": STATE.sync_window_sec,
                    "max_range_m": STATE.max_range_m
                }
            }
            self._send_json(200, res)
            return

        elif path.startswith("/api/guidance/"):
            station_id = path.split("/")[-1].upper()
            if station_id not in ("A", "B"):
                self._send_json(400, {"success": False, "error": "Station ID doit être A ou B."})
                return
            guidance = STATE.get_guidance(station_id)
            self._send_json(200, guidance)
            return

        elif path == "/api/health":
            self._send_json(200, {"status": "ok", "service": "heltec-triangulation-python"})
            return

        # Fichiers statiques pour l'interface web
        self._serve_static(path)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")

        if not self._check_auth():
            self._send_json(401, {"success": False, "error": "Authentification requise (jeton invalide ou manquant)."})
            return

        content_length = int(self.headers.get("Content-Length", 0))
        body_bytes = self.rfile.read(content_length) if content_length > 0 else b"{}"

        try:
            body_json = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
        except json.JSONDecodeError:
            self._send_json(400, {"success": False, "error": "Corps JSON invalide."})
            return

        if path == "/api/observations":
            try:
                result = STATE.record_observation(body_json)
                self._send_json(200, {
                    "success": True,
                    "message": f"Observation enregistrée pour la station {body_json.get('station_id')}.",
                    "state": result,
                    "guidance": result.get("guidance")
                })
            except Exception as e:
                self._send_json(400, {"success": False, "error": str(e)})

        elif path == "/api/compute":
            # Recalcul forcé ou mise à jour directe des deux stations
            try:
                if "station_a" in body_json and "station_b" in body_json:
                    body_json["station_a"]["station_id"] = "A"
                    body_json["station_b"]["station_id"] = "B"
                    STATE.record_observation(body_json["station_a"])
                    STATE.record_observation(body_json["station_b"])
                if "max_range_m" in body_json:
                    STATE.max_range_m = float(body_json["max_range_m"])
                result = STATE.compute()
                self._send_json(200, {
                    "success": True,
                    "state": result,
                    "stations": STATE.observations
                })
            except Exception as e:
                self._send_json(400, {"success": False, "error": str(e)})

        elif path == "/api/example":
            result = STATE.set_example()
            self._send_json(200, {
                "success": True,
                "message": "Exemple de triangulation chargé avec succès.",
                "state": result,
                "stations": STATE.observations
            })

        elif path == "/api/reset":
            STATE.reset()
            self._send_json(200, {
                "success": True,
                "message": "État réinitialisé.",
                "state": STATE.last_result
            })

        else:
            self._send_json(404, {"success": False, "error": f"Endpoint POST non trouvé: {path}"})

    def _serve_static(self, path: str):
        static_dir = CONFIG["static_dir"]
        if path == "/":
            file_path = os.path.join(static_dir, "index.html")
        else:
            # Sécurité chemin relatif
            clean_path = path.lstrip("/")
            file_path = os.path.join(static_dir, clean_path)

        if not os.path.exists(file_path) or os.path.isdir(file_path):
            self.send_response(404)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"404 Not Found")
            return

        # Types MIME
        ext = os.path.splitext(file_path)[1].lower()
        mime_types = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".json": "application/json; charset=utf-8",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".svg": "image/svg+xml",
            ".ico": "image/x-icon"
        }
        content_type = mime_types.get(ext, "application/octet-stream")

        with open(file_path, "rb") as f:
            content = f.read()

        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(content)

    def log_message(self, format, *args):
        # Log épuré pour console Windows
        sys.stderr.write(f"[{time.strftime('%H:%M:%S')}] {args[0]} {args[1]} -> {args[2]}\n")


def run_server():
    parser = argparse.ArgumentParser(description="Serveur de triangulation radio pour Heltec V4.3")
    # Valeurs par défaut adaptées à la fois à Windows (127.0.0.1:8080) et AI Studio (0.0.0.0:3000)
    default_port = int(os.environ.get("PORT", 8080))
    parser.add_argument("--host", default="127.0.0.1", help="Adresse d'écoute (ex: 127.0.0.1 ou 0.0.0.0)")
    parser.add_argument("--port", type=int, default=default_port, help="Port d'écoute HTTP")
    parser.add_argument("--token", default=None, help="Jeton d'authentification pour protéger l'API sur réseau local")
    args = parser.parse_args()

    # Si PORT d'environnement spécifié (ex: Cloud Run / AI Studio), l'honorer
    port = args.port
    host = args.host
    if args.token:
        CONFIG["token"] = args.token

    # Initialisation avec l'exemple par défaut
    STATE.set_example()

    server_address = (host, port)
    httpd = HTTPServer(server_address, TriangulationHandler)

    print("=" * 64)
    print("  heltec-triangulation-python - Serveur actif")
    print(f"  URL locale:    http://{host}:{port}/")
    print(f"  API Endpoint:  http://{host}:{port}/api/observations")
    if CONFIG["token"]:
        print(f"  Sécurité:      Jeton actif (X-Heltec-Token requis)")
    else:
        print(f"  Sécurité:      Accès local sans jeton (127.0.0.1)")
    print("=" * 64)
    print("Appuyez sur Ctrl+C pour arrêter le serveur.")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nArrêt du serveur demandé. Fermeture propre.")
        httpd.server_close()


if __name__ == "__main__":
    run_server()
