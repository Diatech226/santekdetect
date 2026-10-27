/**
 * app.js - Contrôleur client interactif pour heltec-triangulation-python
 * Gère le recalcul instantané, la carte Leaflet et le repli hors-ligne en pur JavaScript.
 */

// État local de l'application
const AppState = {
  map: null,
  isOfflineMap: false,
  layers: {
    stationA: null,
    stationB: null,
    rayA: null,
    rayB: null,
    coneA: null,
    coneB: null,
    targetMarker: null,
    uncertaintyPolygon: null
  },
  lastData: null
};

// Éléments du DOM
const DOM = {
  latA: document.getElementById('lat-a'),
  lonA: document.getElementById('lon-a'),
  rangeAzA: document.getElementById('range-azimuth-a'),
  numAzA: document.getElementById('num-azimuth-a'),
  tolA: document.getElementById('tol-a'),

  latB: document.getElementById('lat-b'),
  lonB: document.getElementById('lon-b'),
  rangeAzB: document.getElementById('range-azimuth-b'),
  numAzB: document.getElementById('num-azimuth-b'),
  tolB: document.getElementById('tol-b'),

  maxRangeKm: document.getElementById('max-range-km'),

  targetLat: document.getElementById('target-lat-value'),
  targetLon: document.getElementById('target-lon-value'),
  targetPrecision: document.getElementById('target-precision-value'),
  validityBadge: document.getElementById('target-validity-badge'),
  systemStatus: document.getElementById('system-status-indicator'),
  statusMsg: document.getElementById('status-message-box'),

  guidanceACap: document.getElementById('guidance-a-cap'),
  guidanceADist: document.getElementById('guidance-a-dist'),
  guidanceBCap: document.getElementById('guidance-b-cap'),
  guidanceBDist: document.getElementById('guidance-b-dist'),

  btnExample: document.getElementById('btn-example'),
  btnCompute: document.getElementById('btn-compute'),
  btnReset: document.getElementById('btn-reset'),

  mapContainer: document.getElementById('map'),
  offlineCanvas: document.getElementById('offline-canvas'),
  offlineNotice: document.getElementById('offline-notice')
};

// Initialisation
window.addEventListener('DOMContentLoaded', () => {
  setupInputSync();
  initMap();
  setupEventListeners();
  // Premier calcul immédiat
  recalculate();

  // Polling automatique pour synchronisation avec les observations Heltec
  setInterval(pollServerState, 2000);
});

// Synchronisation slider <-> champ numérique
function setupInputSync() {
  // Station A
  DOM.rangeAzA.addEventListener('input', (e) => {
    DOM.numAzA.value = e.target.value;
    triggerDebouncedRecalc();
  });
  DOM.numAzA.addEventListener('input', (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val)) val = 0;
    val = (val % 360 + 360) % 360;
    DOM.rangeAzA.value = val;
    triggerDebouncedRecalc();
  });

  // Station B
  DOM.rangeAzB.addEventListener('input', (e) => {
    DOM.numAzB.value = e.target.value;
    triggerDebouncedRecalc();
  });
  DOM.numAzB.addEventListener('input', (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val)) val = 0;
    val = (val % 360 + 360) % 360;
    DOM.rangeAzB.value = val;
    triggerDebouncedRecalc();
  });

  // Autres champs déclenchant recalcul
  [DOM.latA, DOM.lonA, DOM.tolA, DOM.latB, DOM.lonB, DOM.tolB, DOM.maxRangeKm].forEach(el => {
    el.addEventListener('input', triggerDebouncedRecalc);
  });
}

function setupEventListeners() {
  DOM.btnExample.addEventListener('click', loadExample);
  DOM.btnCompute.addEventListener('click', recalculate);
  DOM.btnReset.addEventListener('click', resetAll);
}

let recalcTimer = null;
function triggerDebouncedRecalc() {
  clearTimeout(recalcTimer);
  recalcTimer = setTimeout(recalculate, 60);
}

// Initialisation de la carte avec détection hors-ligne
function initMap() {
  if (typeof L !== 'undefined') {
    try {
      AppState.map = L.map('map', {
        zoomControl: true,
        attributionControl: false
      }).setView([48.8500, 2.3250], 13);

      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      });

      tileLayer.on('tileerror', () => {
        // En cas d'erreur de tuiles OSM (pas d'Internet), signaler le repli
        DOM.offlineNotice.style.display = 'block';
      });

      tileLayer.addTo(AppState.map);
      return;
    } catch (err) {
      console.warn('Leaflet indisponible ou erreur d\'initialisation:', err);
    }
  }

  // Si Leaflet ne charge pas : passer en mode canevas hors-ligne
  enableOfflineCanvasMap();
}

function enableOfflineCanvasMap() {
  AppState.isOfflineMap = true;
  DOM.mapContainer.style.display = 'none';
  DOM.offlineCanvas.style.display = 'block';
  DOM.offlineNotice.style.display = 'block';
  window.addEventListener('resize', drawOfflineCanvas);
}

// Envoi et calcul via l'API locale
async function recalculate() {
  const payload = {
    station_a: {
      lat: parseFloat(DOM.latA.value) || 0,
      lon: parseFloat(DOM.lonA.value) || 0,
      azimuth_deg: parseFloat(DOM.rangeAzA.value) || 0,
      tolerance_deg: parseFloat(DOM.tolA.value) || 5.0
    },
    station_b: {
      lat: parseFloat(DOM.latB.value) || 0,
      lon: parseFloat(DOM.lonB.value) || 0,
      azimuth_deg: parseFloat(DOM.rangeAzB.value) || 0,
      tolerance_deg: parseFloat(DOM.tolB.value) || 5.0
    },
    max_range_m: (parseFloat(DOM.maxRangeKm.value) || 20) * 1000.0
  };

  try {
    const res = await fetch('/api/compute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success && data.state) {
      updateUI(data.state, payload);
    }
  } catch (err) {
    console.error('Erreur API compute:', err);
  }
}

// Mise à jour de l'interface
function updateUI(state, requestData) {
  AppState.lastData = { state, requestData };

  // 1. Badge d'état global
  const status = state.status || 'UNKNOWN';
  DOM.systemStatus.className = 'status-badge';
  DOM.validityBadge.className = 'validity-indicator';

  if (status === 'VALID') {
    DOM.systemStatus.classList.add('status-valid');
    DOM.systemStatus.textContent = 'Verrouillé';
    DOM.validityBadge.classList.add('status-valid');
    DOM.validityBadge.textContent = 'Cible Identifiée';
  } else if (status.startsWith('BEHIND') || status === 'OUT_OF_RANGE') {
    DOM.systemStatus.classList.add('status-error');
    DOM.systemStatus.textContent = 'Invalide';
    DOM.validityBadge.classList.add('status-error');
    DOM.validityBadge.textContent = 'Aucune solution';
  } else if (status === 'PARALLEL' || status === 'ANTIPARALLEL') {
    DOM.systemStatus.classList.add('status-warning');
    DOM.systemStatus.textContent = 'Indéterminé';
    DOM.validityBadge.classList.add('status-warning');
    DOM.validityBadge.textContent = 'Visées parallèles';
  } else {
    DOM.systemStatus.classList.add('status-waiting');
    DOM.systemStatus.textContent = 'En attente';
    DOM.validityBadge.classList.add('status-waiting');
    DOM.validityBadge.textContent = 'Mesures requises';
  }

  // 2. Coordonnées de la cible
  if (state.target && status === 'VALID') {
    DOM.targetLat.textContent = state.target.lat.toFixed(5) + '°';
    DOM.targetLon.textContent = state.target.lon.toFixed(5) + '°';
    DOM.targetPrecision.textContent = state.target.uncertainty_radius_m 
      ? `± ${state.target.uncertainty_radius_m} m` 
      : '± ~50 m';
  } else {
    DOM.targetLat.textContent = '—';
    DOM.targetLon.textContent = '—';
    DOM.targetPrecision.textContent = '—';
  }

  // 3. Message d'explication
  DOM.statusMsg.textContent = state.message || '—';

  // 4. Messages de guidage pour les Heltec
  if (state.guidance && status === 'VALID') {
    const gA = state.guidance.A;
    const gB = state.guidance.B;
    if (gA) {
      DOM.guidanceACap.textContent = `Cap : ${gA.bearing_deg.toFixed(1)}°`;
      DOM.guidanceADist.textContent = `Distance : ${gA.distance_km < 1 ? gA.distance_m + ' m' : gA.distance_km + ' km'}`;
    }
    if (gB) {
      DOM.guidanceBCap.textContent = `Cap : ${gB.bearing_deg.toFixed(1)}°`;
      DOM.guidanceBDist.textContent = `Distance : ${gB.distance_km < 1 ? gB.distance_m + ' m' : gB.distance_km + ' km'}`;
    }
  } else {
    DOM.guidanceACap.textContent = 'Cap : —';
    DOM.guidanceADist.textContent = 'Distance : —';
    DOM.guidanceBCap.textContent = 'Cap : —';
    DOM.guidanceBDist.textContent = 'Distance : —';
  }

  // 5. Mise à jour de la carte
  if (AppState.isOfflineMap) {
    drawOfflineCanvas();
  } else {
    updateLeafletMap(state, requestData);
  }
}

// Mise à jour de la carte Leaflet
function updateLeafletMap(state, req) {
  if (!AppState.map) return;

  const latA = req.station_a.lat;
  const lonA = req.station_a.lon;
  const azA = req.station_a.azimuth_deg;
  const tolA = req.station_a.tolerance_deg;

  const latB = req.station_b.lat;
  const lonB = req.station_b.lon;
  const azB = req.station_b.azimuth_deg;
  const tolB = req.station_b.tolerance_deg;

  const maxRangeM = req.max_range_m;

  // Nettoyage des calques existants
  Object.keys(AppState.layers).forEach(k => {
    if (AppState.layers[k]) {
      AppState.map.removeLayer(AppState.layers[k]);
      AppState.layers[k] = null;
    }
  });

  // Marqueurs Stations
  AppState.layers.stationA = L.circleMarker([latA, lonA], {
    radius: 8,
    color: '#1d4ed8',
    fillColor: '#3b82f6',
    fillOpacity: 0.9,
    weight: 2
  }).addTo(AppState.map).bindPopup(`<b>Station A</b><br>Azimut: ${azA}° (±${tolA}°)`);

  AppState.layers.stationB = L.circleMarker([latB, lonB], {
    radius: 8,
    color: '#0891b2',
    fillColor: '#06b6d4',
    fillOpacity: 0.9,
    weight: 2
  }).addTo(AppState.map).bindPopup(`<b>Station B</b><br>Azimut: ${azB}° (±${tolB}°)`);

  // Rayon visée Station A
  const endA = projectPointWGS84(latA, lonA, azA, maxRangeM);
  AppState.layers.rayA = L.polyline([[latA, lonA], [endA.lat, endA.lon]], {
    color: '#3b82f6',
    weight: 2.5,
    opacity: 0.85
  }).addTo(AppState.map);

  // Cône de tolérance Station A
  const coneALeft = projectPointWGS84(latA, lonA, azA - tolA, maxRangeM);
  const coneARight = projectPointWGS84(latA, lonA, azA + tolA, maxRangeM);
  AppState.layers.coneA = L.polygon([[latA, lonA], [coneALeft.lat, coneALeft.lon], [coneARight.lat, coneARight.lon]], {
    color: '#3b82f6',
    weight: 1,
    dashArray: '4, 4',
    fillColor: '#3b82f6',
    fillOpacity: 0.08
  }).addTo(AppState.map);

  // Rayon visée Station B
  const endB = projectPointWGS84(latB, lonB, azB, maxRangeM);
  AppState.layers.rayB = L.polyline([[latB, lonB], [endB.lat, endB.lon]], {
    color: '#06b6d4',
    weight: 2.5,
    opacity: 0.85
  }).addTo(AppState.map);

  // Cône de tolérance Station B
  const coneBLeft = projectPointWGS84(latB, lonB, azB - tolB, maxRangeM);
  const coneBRight = projectPointWGS84(latB, lonB, azB + tolB, maxRangeM);
  AppState.layers.coneB = L.polygon([[latB, lonB], [coneBLeft.lat, coneBLeft.lon], [coneBRight.lat, coneBRight.lon]], {
    color: '#06b6d4',
    weight: 1,
    dashArray: '4, 4',
    fillColor: '#06b6d4',
    fillOpacity: 0.08
  }).addTo(AppState.map);

  // Polygone d'incertitude si solution valide
  if (state.uncertainty_polygon && state.uncertainty_polygon.length >= 3) {
    const latlngs = state.uncertainty_polygon.map(p => [p.lat, p.lon]);
    AppState.layers.uncertaintyPolygon = L.polygon(latlngs, {
      color: '#f59e0b',
      weight: 2,
      fillColor: '#f59e0b',
      fillOpacity: 0.25,
      dashArray: '3, 3'
    }).addTo(AppState.map).bindPopup('Zone d\'incertitude géométrique');
  }

  // Marqueur Cible HackRF
  if (state.target && state.status === 'VALID') {
    AppState.layers.targetMarker = L.circleMarker([state.target.lat, state.target.lon], {
      radius: 9,
      color: '#ffffff',
      fillColor: '#f59e0b',
      fillOpacity: 1.0,
      weight: 2.5
    }).addTo(AppState.map).bindPopup(`<b>Position HackRF estimée</b><br>Lat: ${state.target.lat}<br>Lon: ${state.target.lon}`);
  }

  // Ajustement automatique de la vue
  const pointsToFit = [[latA, lonA], [latB, lonB]];
  if (state.target && state.status === 'VALID') {
    pointsToFit.push([state.target.lat, state.target.lon]);
  }
  AppState.map.fitBounds(L.latLngBounds(pointsToFit), { padding: [50, 50], maxZoom: 15 });
}

// Fonction utilitaire de projection géodésique WGS84
function projectPointWGS84(lat, lon, azimuthDeg, distanceM) {
  const R = 6371000.0;
  const azRad = (azimuthDeg * Math.PI) / 180.0;
  const latRad = (lat * Math.PI) / 180.0;
  const lonRad = (lon * Math.PI) / 180.0;
  const distRatio = distanceM / R;

  const targetLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(distRatio) +
    Math.cos(latRad) * Math.sin(distRatio) * Math.cos(azRad)
  );

  const targetLonRad = lonRad + Math.atan2(
    Math.sin(azRad) * Math.sin(distRatio) * Math.cos(latRad),
    Math.cos(distRatio) - Math.sin(latRad) * Math.sin(targetLatRad)
  );

  return {
    lat: (targetLatRad * 180.0) / Math.PI,
    lon: (targetLonRad * 180.0) / Math.PI
  };
}

// Rendu Canevas hors-ligne
function drawOfflineCanvas() {
  const canvas = DOM.offlineCanvas;
  if (!canvas || canvas.style.display === 'none') return;

  const ctx = canvas.getContext('2d');
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;

  const w = canvas.width;
  const h = canvas.height;

  // Fond
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, w, h);

  // Grille métrique
  ctx.strokeStyle = '#1a2333';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < w; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Si pas de données encore, dessiner repère
  if (!AppState.lastData) return;
  const { state, requestData } = AppState.lastData;

  // Projection simple relative sur canevas
  const midX = w / 2;
  const midY = h / 2;
  const scale = Math.min(w, h) / 15000.0; // pixels par mètre

  // Coordonnées relatives
  const posA = { x: midX - 140, y: midY + 100 };
  const posB = { x: midX + 140, y: midY + 100 };

  // Rayon A
  const azA = requestData.station_a.azimuth_deg;
  const lenA = 300;
  const endAx = posA.x + Math.sin(azA * Math.PI / 180) * lenA;
  const endAy = posA.y - Math.cos(azA * Math.PI / 180) * lenA;

  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(posA.x, posA.y);
  ctx.lineTo(endAx, endAy);
  ctx.stroke();

  // Rayon B
  const azB = requestData.station_b.azimuth_deg;
  const lenB = 300;
  const endBx = posB.x + Math.sin(azB * Math.PI / 180) * lenB;
  const endBy = posB.y - Math.cos(azB * Math.PI / 180) * lenB;

  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(posB.x, posB.y);
  ctx.lineTo(endBx, endBy);
  ctx.stroke();

  // Dessin Stations
  ctx.fillStyle = '#3b82f6';
  ctx.beginPath();
  ctx.arc(posA.x, posA.y, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#06b6d4';
  ctx.beginPath();
  ctx.arc(posB.x, posB.y, 7, 0, Math.PI * 2);
  ctx.fill();

  // Cible estimée
  if (state.status === 'VALID' && state.target) {
    const targetX = midX;
    const targetY = midY - 60;

    // Cible
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(targetX, targetY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.fillText('HackRF Estimé', targetX + 12, targetY + 4);
  }
}

// Chargement exemple prédéfini
async function loadExample() {
  try {
    const res = await fetch('/api/example', { method: 'POST' });
    const data = await res.json();
    if (data.success && data.stations) {
      if (data.stations.A) {
        DOM.latA.value = data.stations.A.lat;
        DOM.lonA.value = data.stations.A.lon;
        DOM.rangeAzA.value = data.stations.A.azimuth_deg;
        DOM.numAzA.value = data.stations.A.azimuth_deg;
        DOM.tolA.value = data.stations.A.tolerance_deg;
      }
      if (data.stations.B) {
        DOM.latB.value = data.stations.B.lat;
        DOM.lonB.value = data.stations.B.lon;
        DOM.rangeAzB.value = data.stations.B.azimuth_deg;
        DOM.numAzB.value = data.stations.B.azimuth_deg;
        DOM.tolB.value = data.stations.B.tolerance_deg;
      }
      recalculate();
    }
  } catch (err) {
    console.error('Erreur chargement exemple:', err);
  }
}

// Réinitialisation
async function resetAll() {
  try {
    await fetch('/api/reset', { method: 'POST' });
    DOM.rangeAzA.value = 0;
    DOM.numAzA.value = 0;
    DOM.rangeAzB.value = 0;
    DOM.numAzB.value = 0;
    recalculate();
  } catch (err) {
    console.error('Erreur reset:', err);
  }
}

// Polling périodique des observations Heltec distantes
async function pollServerState() {
  try {
    const res = await fetch('/api/state');
    const data = await res.json();
    if (data.success && data.state) {
      // Si de nouvelles observations distantes ont été reçues
      if (data.stations && data.stations.A && data.stations.B) {
        // Optionnel : ne pas écraser les curseurs si l'utilisateur est en train de glisser
      }
    }
  } catch (err) {
    // Silencieux pour ne pas spammer la console si serveur arrêté
  }
}
