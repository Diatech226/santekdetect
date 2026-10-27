"""
test_triangulation.py - Tests unitaires automatisés pour heltec-triangulation-python
Utilise uniquement la bibliothèque standard unittest (aucun pip install nécessaire).
"""

import unittest
import math
from triangulation import (
    haversine_distance,
    forward_bearing,
    normalize_azimuth,
    intersect_rays_2d,
    calculate_triangulation,
    calculate_station_guidance
)


class TestTriangulationEngine(unittest.TestCase):

    def test_haversine_and_bearing_basic(self):
        # Deux points connus à Paris
        # Tour Eiffel: 48.8584, 2.2945
        # Notre-Dame: 48.8530, 2.3499
        dist = haversine_distance(48.8584, 2.2945, 48.8530, 2.3499)
        self.assertGreater(dist, 4000)
        self.assertLess(dist, 5000)

        # Cap Nord franc
        bearing_north = forward_bearing(48.0, 2.0, 49.0, 2.0)
        self.assertAlmostEqual(bearing_north, 0.0, places=1)

        # Cap Est franc à l'équateur
        bearing_east = forward_bearing(0.0, 0.0, 0.0, 1.0)
        self.assertAlmostEqual(bearing_east, 90.0, places=1)

    def test_normalize_azimuth(self):
        self.assertEqual(normalize_azimuth(0), 0)
        self.assertEqual(normalize_azimuth(360), 0)
        self.assertEqual(normalize_azimuth(370), 10)
        self.assertEqual(normalize_azimuth(-10), 350)
        self.assertEqual(normalize_azimuth(-370), 350)

    def test_symmetric_convergence(self):
        # Station A en (0, 0), Station B en (1000m, 0)
        # Azimut A = 45°, Azimut B = 315°
        p1 = (0.0, 0.0)
        p2 = (1000.0, 0.0)
        inter, status, dists = intersect_rays_2d(p1, 45.0, p2, 315.0)

        self.assertEqual(status, "VALID")
        self.assertIsNotNone(inter)
        self.assertAlmostEqual(inter[0], 500.0, places=1)
        self.assertAlmostEqual(inter[1], 500.0, places=1)
        self.assertAlmostEqual(dists[0], 707.1, places=1)
        self.assertAlmostEqual(dists[1], 707.1, places=1)

    def test_parallel_rays(self):
        p1 = (0.0, 0.0)
        p2 = (1000.0, 0.0)
        # Même direction plein Nord
        inter, status, _ = intersect_rays_2d(p1, 0.0, p2, 0.0)
        self.assertEqual(status, "PARALLEL")
        self.assertIsNone(inter)

        # Écart minime inférieur au seuil (< 1°)
        inter2, status2, _ = intersect_rays_2d(p1, 10.0, p2, 10.5)
        self.assertEqual(status2, "PARALLEL")
        self.assertIsNone(inter2)

    def test_intersection_behind_station(self):
        p1 = (0.0, 0.0)
        p2 = (1000.0, 0.0)
        # A vise le Sud-Est (135°), B vise le Sud-Ouest (225°)
        # L'intersection est vers y = -500 (derrière si elles devaient aller au Nord, mais là elles vont au Sud donc valide vers le Sud)
        inter_south, status_south, _ = intersect_rays_2d(p1, 135.0, p2, 225.0)
        self.assertEqual(status_south, "VALID")

        # Maintenant: A vise le Nord-Est (45°), B vise le Sud-Est (135°)
        # La visée B s'éloigne vers le bas, les droites se croisent vers y négatif pour B (derrière B)
        inter_behind, status_behind, dists = intersect_rays_2d(p1, 45.0, p2, 135.0)
        self.assertEqual(status_behind, "BEHIND_STATION_B")
        self.assertIsNone(inter_behind)

    def test_coincident_stations(self):
        res = calculate_triangulation(
            lat_a=48.8500, lon_a=2.3500, azimuth_a_deg=45.0, tolerance_a_deg=5.0,
            lat_b=48.8500001, lon_b=2.3500001, azimuth_b_deg=90.0, tolerance_b_deg=5.0
        )
        self.assertEqual(res["status"], "COINCIDENT_STATIONS")
        self.assertIsNone(res["target"])

    def test_full_triangulation_with_uncertainty_and_guidance(self):
        # Essai terrain réaliste:
        # Station A: 48.8500, 2.3000, azimut 45°, tolérance 5°
        # Station B: 48.8500, 2.3500 (à environ 3.6 km à l'Est), azimut 315°, tolérance 5°
        res = calculate_triangulation(
            lat_a=48.8500, lon_a=2.3000, azimuth_a_deg=45.0, tolerance_a_deg=5.0,
            lat_b=48.8500, lon_b=2.3500, azimuth_b_deg=315.0, tolerance_b_deg=5.0,
            max_range_m=10000.0
        )
        self.assertEqual(res["status"], "VALID")
        self.assertIsNotNone(res["target"])
        self.assertIsNotNone(res["guidance"])
        self.assertIn("A", res["guidance"])
        self.assertIn("B", res["guidance"])

        target = res["target"]
        # La cible doit être au Nord de la ligne A-B
        self.assertGreater(target["lat"], 48.8500)
        # La cible doit être à mi-chemin en longitude (autour de 2.325)
        self.assertAlmostEqual(target["lon"], 2.3250, places=2)

        # Vérifier que le guidage depuis A correspond bien à un cap d'environ 45°
        self.assertAlmostEqual(res["guidance"]["A"]["bearing_deg"], 45.0, places=0)
        self.assertAlmostEqual(res["guidance"]["B"]["bearing_deg"], 315.0, places=0)

        # Polygone d'incertitude présent avec 4 sommets
        self.assertIsNotNone(res["uncertainty_polygon"])
        self.assertEqual(len(res["uncertainty_polygon"]), 4)


if __name__ == '__main__':
    unittest.main()
