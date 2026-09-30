/**
 * ISS Tracker
 * Dedicated ISS view with telemetry.
 */
class ISSTracker {
  constructor() {
    this.viewer = null;
    this.telemetry = {};
    this.issTrail = [];
    this.displayTimer = null;
  }

  async init(containerId) {
    Cesium.Ion.defaultAccessToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhZTYyYTU5Ni1jZWU1LTQ1ZTEtODVhNy05M2M4ZjFlY2ZhNTgiLCJpZCI6NDMzMTY1LCJpc3MiOiJodHRwczovL2lvbi5jZXNpdW0uY29tIiwiYXVkIjoidW5kZWZpbmVkX2RlZmF1bHQiLCJpYXQiOjE3NzkxMjQxOTZ9.PH9dWmOUNHn-fesDtcDkyXU-RsbK3wdJ8D4FZsLEm-0';

    this.viewer = new Cesium.Viewer(containerId, {
      terrain: Cesium.Terrain.fromWorldTerrain(),
      skyBox: false,
      skyAtmosphere: true,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      vrButton: false,
      infoBox: false,
      selectionIndicator: false,
      shadows: false,
      shouldAnimate: true
    });

    this.viewer.scene.backgroundColor = Cesium.Color.BLACK;
    this.viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0a0a12');
    this.viewer.scene.globe.enableLighting = true;

    this.viewer.imageryLayers.removeAll();
    this.viewer.imageryLayers.add(
      new Cesium.ImageryLayer(
        new Cesium.UrlTemplateImageryProvider({
          url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
          subdomains: ['a', 'b', 'c', 'd'],
          maximumLevel: 19
        })
      )
    );

    this.addISS();

    this.displayTimer = setInterval(() => this.renderTelemetry(), 1000);
  }

  addISS() {
    const pos = new Cesium.CallbackProperty(() => {
      if (this.telemetry.lat != null && this.telemetry.lon != null) {
        return Cesium.Cartesian3.fromDegrees(
          this.telemetry.lon,
          this.telemetry.lat,
          this.telemetry.alt * 1000
        );
      }
      return Cesium.Cartesian3.ZERO;
    }, false);

    this.viewer.entities.add({
      name: 'ISS',
      position: pos,
      point: {
        pixelSize: 18,
        color: Cesium.Color.fromCssColorString('#ff00ff'),
        outlineColor: Cesium.Color.fromCssColorString('#00f0ff'),
        outlineWidth: 3
      },
      label: {
        text: 'ISS',
        font: 'bold 14px "Share Tech Mono"',
        fillColor: Cesium.Color.fromCssColorString('#ff00ff'),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -18)
      }
    });

    this.viewer.entities.add({
      name: 'ISS Orbit Trail',
      polyline: {
        positions: new Cesium.CallbackProperty(() => {
          return this.issTrail.map((p) =>
            Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt * 1000)
          );
        }, false),
        width: 3,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.5,
          color: Cesium.Color.fromCssColorString('#ff00ff').withAlpha(0.8)
        })
      }
    });
  }

  updateTelemetry(satelliteEngine, observer) {
    const iss = satelliteEngine.getISS();
    if (!iss) return;
    const pos = satelliteEngine.calculatePosition(iss, observer.lat, observer.lon, 0);
    if (!pos) return;

    this.telemetry = pos;

    this.issTrail.push({ lat: pos.lat, lon: pos.lon, alt: pos.alt });
    if (this.issTrail.length > 200) this.issTrail.shift();

    this.viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(pos.lon - 25, pos.lat + 8, 6000000)
    });
  }

  renderTelemetry() {
    const container = document.getElementById('iss-telemetry');
    if (!container) return;
    const t = this.telemetry;
    if (!t.lat) return;

    container.innerHTML = `
      <div class="telemetry-grid">
        <div class="telemetry-item"><div class="label">LAT</div><div class="value">${t.lat.toFixed(4)}°</div></div>
        <div class="telemetry-item"><div class="label">LON</div><div class="value">${t.lon.toFixed(4)}°</div></div>
        <div class="telemetry-item"><div class="label">ALT</div><div class="value">${t.alt.toFixed(1)} km</div></div>
        <div class="telemetry-item"><div class="label">VEL</div><div class="value">${(t.velocity * 3.6).toFixed(0)} km/h</div></div>
        <div class="telemetry-item"><div class="label">AZ</div><div class="value">${t.azimuth.toFixed(1)}°</div></div>
        <div class="telemetry-item"><div class="label">EL</div><div class="value">${t.elevation.toFixed(1)}°</div></div>
        <div class="telemetry-item"><div class="label">RANGE</div><div class="value">${t.range.toFixed(0)} km</div></div>
        <div class="telemetry-item"><div class="label">STATUS</div><div class="value" style="color:${t.elevation > 0 ? '#00ff80' : '#ff0040'}">${t.elevation > 0 ? 'VISIBLE' : 'BELOW HORIZON'}</div></div>
      </div>
    `;
  }

  destroy() {
    if (this.displayTimer) clearInterval(this.displayTimer);
    if (this.viewer) this.viewer.destroy();
  }
}

window.ISSTracker = ISSTracker;
