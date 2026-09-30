/**
 * Satellite Proximity Tracker — Main App
 */
class SatelliteTrackerApp {
  constructor() {
    this.satEngine = new SatelliteEngine();
    this.locService = new LocationService();
    this.passPredictor = null;
    this.notificationService = new NotificationService();
    this.audioEngine = new AudioEngine();
    this.uiController = new UIController();
    this.cesiumView = null;
    this.issTracker = null;

    this.observer = null;
    this.satellites = [];
    this.visibleSatellites = [];
    this.passes = [];

    this.currentMode = '3d';
    this.updateInterval = null;
    this.passUpdateInterval = null;

    this.map = null;
    this.mapMarkers = new Map();
    this.lastClosestRange = Infinity;
  }

  async init() {
    this.setupEventListeners();
    this.audioEngine.startAmbientDrone();

    // Show location overlay first
    document.getElementById('loc-request').classList.remove('hidden');

    document.getElementById('grant-loc').addEventListener('click', () => {
      const lat = parseFloat(document.getElementById('manual-lat').value);
      const lon = parseFloat(document.getElementById('manual-lon').value);
      if (isNaN(lat) || isNaN(lon)) {
        this.uiController.showToast('ERROR', 'Enter valid coordinates');
        this.audioEngine.playError();
        return;
      }
      this.observer = this.locService.setManual(lat, lon);
      this.startApp();
    });

    document.getElementById('auto-loc').addEventListener('click', async () => {
      this.observer = await this.locService.getApproximateLocation();
      this.startApp();
    });
  }

  async startApp() {
    document.getElementById('loc-request').classList.add('hidden');
    this.uiController.updateLocationStatus(
      `${this.observer.lat.toFixed(4)}, ${this.observer.lon.toFixed(4)}`
    );

    this.passPredictor = new PassPredictor(this.satEngine);
    await this.notificationService.init();

    this.uiController.showToast('SYSTEM', 'Downloading orbital data...');
    this.satellites = await this.satEngine.fetchTLEData();
    this.uiController.updateSatCount(this.satellites.length, 0);

    // 2D Map
    this.initMap();

    // 3D Globe
    this.cesiumView = new CesiumView('cesiumContainer');
    await this.cesiumView.init();
    this.cesiumView.addObserver(this.observer.lat, this.observer.lon);

    // ISS tracker
    this.issTracker = new ISSTracker();
    await this.issTracker.init('iss-cesiumContainer');

    this.startUpdateLoops();
    this.audioEngine.playPassAlert();
    this.uiController.showToast('ONLINE', `Tracking ${this.satellites.length} satellites`);
  }

  initMap() {
    this.map = L.map('map', {
      center: [this.observer.lat, this.observer.lon],
      zoom: 4,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(this.map);

    L.marker([this.observer.lat, this.observer.lon])
      .addTo(this.map)
      .bindPopup('<div class="sat-popup"><h3>YOUR LOCATION</h3></div>');

    L.circle([this.observer.lat, this.observer.lon], {
      radius: 2000000,
      color: '#00f0ff',
      weight: 1,
      fillColor: '#00f0ff',
      fillOpacity: 0.03,
      dashArray: '10, 10'
    }).addTo(this.map);
  }

  startUpdateLoops() {
    this.updateInterval = setInterval(() => this.updateSatellitePositions(), 5000);
    this.updateSatellitePositions();

    this.updatePasses();
    this.passUpdateInterval = setInterval(() => this.updatePasses(), 300000);
  }

  updateSatellitePositions() {
    if (!this.observer) return;

    this.visibleSatellites = this.satEngine.getVisibleSatellites(
      this.observer.lat,
      this.observer.lon,
      this.satellites
    );

    this.uiController.updateSatCount(this.satellites.length, this.visibleSatellites.length);
    this.uiController.updateClosestSatellite(this.visibleSatellites[0] || null);
    this.uiController.updateTrackedSatellites(this.visibleSatellites);

    this.updateMapMarkers();
    this.updateCesiumView();

    if (this.issTracker) {
      this.issTracker.updateTelemetry(this.satEngine, this.observer);
    }

    if (this.visibleSatellites.length > 0) {
      const closest = this.visibleSatellites[0];
      if (closest.range < 500 && closest.range < this.lastClosestRange) {
        this.audioEngine.playProximityWarning();
      }
      this.lastClosestRange = closest.range;
    }
  }

  updateMapMarkers() {
    if (!this.map) return;

    for (const [name, marker] of this.mapMarkers) {
      if (!this.visibleSatellites.find((s) => s.name === name)) {
        this.map.removeLayer(marker);
        this.mapMarkers.delete(name);
      }
    }

    this.visibleSatellites.forEach((sat, index) => {
      const isClosest = index === 0;
      if (this.mapMarkers.has(sat.name)) {
        const marker = this.mapMarkers.get(sat.name);
        marker.setLatLng([sat.lat, sat.lon]);
        marker.setPopupContent(this.createPopupContent(sat));
      } else {
        const marker = L.circleMarker([sat.lat, sat.lon], {
          radius: isClosest ? 10 : 6,
          fillColor: isClosest ? '#ff00ff' : '#00f0ff',
          color: isClosest ? '#ff00ff' : '#00f0ff',
          weight: isClosest ? 3 : 2,
          opacity: 0.9,
          fillOpacity: 0.6
        })
          .addTo(this.map)
          .bindPopup(this.createPopupContent(sat));
        this.mapMarkers.set(sat.name, marker);
      }
    });
  }

  createPopupContent(sat) {
    return `
      <div class="sat-popup">
        <h3>${sat.name}</h3>
        <div class="popup-data">
          <span class="label">ELEV</span><span class="value">${sat.elevation.toFixed(1)}°</span>
          <span class="label">AZ</span><span class="value">${sat.azimuth.toFixed(1)}°</span>
          <span class="label">RANGE</span><span class="value">${sat.range.toFixed(0)} km</span>
          <span class="label">ALT</span><span class="value">${sat.alt.toFixed(0)} km</span>
        </div>
      </div>
    `;
  }

  updateCesiumView() {
    if (!this.cesiumView) return;
    this.visibleSatellites.forEach((sat) => {
      const satData = this.satellites.find((s) => s.name === sat.name);
      if (satData) this.cesiumView.updateSatellite(satData, sat);
    });
  }

  async updatePasses() {
    if (!this.observer || !this.passPredictor) return;
    this.passes = await this.passPredictor.getNextPasses(
      this.observer.lat,
      this.observer.lon,
      this.satellites,
      10
    );
    this.uiController.updatePassPredictions(this.passes);
    this.notificationService.checkAndNotify(this.passes);
  }

  setupEventListeners() {
    document.querySelectorAll('.mode-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.switchMode(e.target.dataset.mode);
      });
    });

    document.getElementById('notify-toggle')?.addEventListener('change', async (e) => {
      if (e.target.checked) await this.notificationService.toggle();
      else this.notificationService.enabled = false;
      this.audioEngine.playClick();
    });

    document.getElementById('audio-toggle')?.addEventListener('click', () => {
      const enabled = this.audioEngine.toggle();
      document.getElementById('audio-toggle').textContent = enabled ? '🔊' : '🔇';
    });

    document.getElementById('volume-slider')?.addEventListener('input', (e) => {
      this.audioEngine.setVolume(e.target.value);
    });

    document.getElementById('iss-video-btn')?.addEventListener('click', () => {
      if (window.desktopAPI) {
        window.desktopAPI.openVideoWindow({
          id: '25544',
          title: 'ISS HD Live Feed',
          url: 'https://www.youtube.com/embed/86YLFOog4GM?autoplay=1',
          width: 720,
          height: 440
        });
      }
    });

    window.addEventListener('resize', () => {
      if (this.map) this.map.invalidateSize();
    });
  }

  async switchMode(mode) {
    this.audioEngine.playModeSwitch();
    this.currentMode = mode;

    document.querySelectorAll('.mode-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    document.querySelectorAll('.view-container').forEach((c) => c.classList.remove('active'));

    if (mode === '2d') {
      document.getElementById('map-container').classList.add('active');
      if (this.map) this.map.invalidateSize();
    } else if (mode === '3d') {
      document.getElementById('cesium-container').classList.add('active');
    } else if (mode === 'iss') {
      document.getElementById('iss-container').classList.add('active');
    }
  }

  destroy() {
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.passUpdateInterval) clearInterval(this.passUpdateInterval);
    if (this.cesiumView) this.cesiumView.destroy();
    if (this.issTracker) this.issTracker.destroy();
    this.audioEngine.stopAmbientDrone();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new SatelliteTrackerApp();
  app.init();
  window.addEventListener('beforeunload', () => app.destroy());
});
