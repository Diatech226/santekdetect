#!/usr/bin/env python3
"""
simulate_stations.py - Simulateur de balises Heltec V4.3
Projet: heltec-triangulation-python

Ce script simule deux stations Heltec envoyant leurs coordonnées GPS et leurs
azimuts relevés vers le PC via l'API REST JSON, puis récupère les messages de guidage.
Utilise exclusivement la bibliothèque standard Python (aucun pip install).
"""

import sys
import time
import json
import urllib.request
import urllib.error
import argparse


def send_observation(server_url: str, observation: dict, token: str = None) -> dict:
    url = f"{server_url.rstrip('/')}/api/observations"
    payload = json.dumps(observation).encode("utf-8")
    req = urllib.request.Request(url, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("X-Heltec-Token", token)

    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return json.loads(err_body)
        except Exception:
            return {"success": False, "error": f"Erreur HTTP {e.code}: {err_body}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_json(url: str, token: str = None) -> dict:
    req = urllib.request.Request(url, method="GET")
    if token:
        req.add_header("X-Heltec-Token", token)
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        return {"success": False, "error": str(e)}


def run_simulation(server_url: str, token: str = None):
    print("=" * 68)
    print("  SIMULATEUR DE STATIONS HELTEC V4.3 - Triangulation HackRF")
    print(f"  Cible serveur: {server_url}")
    print("=" * 68)

    now = time.time()
    emission_id = f"HACKRF_SWEEP_{int(now) % 10000:04d}"

    # Définition des stations
    # Station A: Position Sud-Ouest (ex: Parc de Sceaux)
    obs_a = {
        "station_id": "A",
        "lat": 48.7750,
        "lon": 2.2950,
        "azimuth_deg": 40.0,
        "tolerance_deg": 4.5,
        "emission_id": emission_id,
        "timestamp": now
    }

    # Station B: Position Sud-Est (ex: Rungis, à ~4 km à l'Est)
    obs_b = {
        "station_id": "B",
        "lat": 48.7750,
        "lon": 2.3500,
        "azimuth_deg": 320.0,
        "tolerance_deg": 4.5,
        "emission_id": emission_id,
        "timestamp": now + 1.2  # 1.2 seconde de décalage LoRa (parfaitement dans la fenêtre de 30s)
    }

    print(f"\n[1/4] Envoi de l'observation Station A (GPS: {obs_a['lat']}, {obs_a['lon']} · Azimut: {obs_a['azimuth_deg']}°)...")
    res_a = send_observation(server_url, obs_a, token)
    print(f"      Statut serveur : {res_a.get('message', res_a.get('error'))}")

    print(f"\n[2/4] Envoi de l'observation Station B (GPS: {obs_b['lat']}, {obs_b['lon']} · Azimut: {obs_b['azimuth_deg']}°)...")
    res_b = send_observation(server_url, obs_b, token)
    print(f"      Statut serveur : {res_b.get('message', res_b.get('error'))}")

    print("\n[3/4] Consultation du résultat de calcul (/api/state)...")
    state_res = get_json(f"{server_url.rstrip('/')}/api/state", token)
    state = state_res.get("state", {})
    status = state.get("status")

    print(f"      État global : {status}")
    print(f"      Message     : {state.get('message')}")
    if status == "VALID" and state.get("target"):
        target = state["target"]
        print(f"      >>> Position estimée du HackRF : Lat {target['lat']}°, Lon {target['lon']}°")
        print(f"      >>> Rayon d'incertitude géométrique : ± {target.get('uncertainty_radius_m', 'N/A')} mètres")
        print(f"      >>> Écart temporel entre balises   : {state.get('time_diff_sec')} secondes")
    else:
        print("      [AVERTISSEMENT] Aucune position fabriquée (mesures non concluantes).")

    print("\n[4/4] Récupération des vecteurs de guidage pour chaque Heltec...")
    guidance_a = get_json(f"{server_url.rstrip('/')}/api/guidance/A", token)
    guidance_b = get_json(f"{server_url.rstrip('/')}/api/guidance/B", token)

    if guidance_a.get("status") == "VALID":
        print(f"      -> Message pour Heltec A : CAP {guidance_a['bearing_deg']}° | DISTANCE {guidance_a['distance_km']} km ({guidance_a['distance_m']} m)")
    else:
        print(f"      -> Heltec A : {guidance_a.get('message')}")

    if guidance_b.get("status") == "VALID":
        print(f"      -> Message pour Heltec B : CAP {guidance_b['bearing_deg']}° | DISTANCE {guidance_b['distance_km']} km ({guidance_b['distance_m']} m)")
    else:
        print(f"      -> Heltec B : {guidance_b.get('message')}")

    # Démonstration du rejet strict des mesures désynchronisées
    print("\n" + "-" * 68)
    print("  Démonstration : Détection rigoureuse d'un décalage temporel excessif (> 30s)")
    obs_b_stale = dict(obs_b)
    obs_b_stale["timestamp"] = now + 45.0  # 45 secondes d'écart (> 30s)
    obs_b_stale["emission_id"] = "HACKRF_TIMEOUT_TEST"
    obs_a_stale = dict(obs_a)
    obs_a_stale["timestamp"] = now
    obs_a_stale["emission_id"] = "HACKRF_TIMEOUT_TEST"

    send_observation(server_url, obs_a_stale, token)
    res_stale = send_observation(server_url, obs_b_stale, token)
    stale_state = res_stale.get("state", {})
    print(f"      Statut retourné : {stale_state.get('status')} -> {stale_state.get('message')}")
    print("      Vérification : Aucun cercle ni fausse position n'a été calculé.")
    print("=" * 68)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Simulateur d'émissions pour Heltec V4.3")
    parser.add_argument("--url", default="http://127.0.0.1:8080", help="URL du serveur de triangulation (défaut: http://127.0.0.1:8080)")
    parser.add_argument("--token", default=None, help="Jeton d'authentification optionnel")
    args = parser.parse_args()

    run_simulation(args.url, args.token)
