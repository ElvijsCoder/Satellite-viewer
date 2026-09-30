/**
 * Cesium 3D View
 * Full-screen rotating globe with satellite positions and orbital trails.
 */
class CesiumView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.viewer = null;
    this.satelliteEntities = new Map();
    this.trailEntities = new Map();
    this.observerEntity = null;
    this.trailLength = 90;
    this.satelliteHistory = new Map();
    this.currentPositions = {};
    this.autoRotate = true;
    this.rotateSpeed = 0.05; // radians per second
    this.videoFeeds = {
      '25544': {
        title: 'ISS HD Live Feed',
        url: 'https://www.youtube.com/embed/86YLFOog4GM?autoplay=1&mute=0'
      }
    };
  }

  async init() {
    // Replace with your real Cesium Ion token
    Cesium.Ion.defaultAccessToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhZTYyYTU5Ni1jZWU1LTQ1ZTEtODVhNy05M2M4ZjFlY2ZhNTgiLCJpZCI6NDMzMTY1LCJpc3MiOiJodHRwczovL2lvbi5jZXNpdW0uY29tIiwiYXVkIjoidW5kZWZpbmVkX2RlZmF1bHQiLCJpYXQiOjE3NzkxMjQxOTZ9.PH9dWmOUNHn-fesDtcDkyXU-RsbK3wdJ8D4FZsLEm-0';

    this.viewer = new Cesium.Viewer(this.container, {
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
      selectionIndicator: true,
      shadows: false,
      shouldAnimate: true
    });

    // Space look
    this.viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#0a0a12');
    this.viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0a0a12');
    this.viewer.scene.globe.enableLighting = false;
    this.viewer.scene.globe.depthTestAgainstTerrain = false;

    // Dark imagery
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

    // Neon atmosphere ring
    this.viewer.scene.globe.showGroundAtmosphere = true;

    // Initial camera
    this.viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(0, 20, 25000000)
    });

    // Auto-rotate
    this.viewer.clock.onTick.addEventListener(() => {
      if (!this.autoRotate) return;
      const spin = this.rotateSpeed / 60;
      this.viewer.camera.rotate(Cesium.Cartesian3.UNIT_Z, -spin);
    });

    // Stop rotation on user interaction
    const canvas = this.viewer.scene.canvas;
    canvas.addEventListener('mousedown', () => (this.autoRotate = false));
    canvas.addEventListener('wheel', () => (this.autoRotate = false));

    // Handle clicks for video feeds
    const handler = new Cesium.ScreenSpaceEventHandler(canvas);
    handler.setInputAction((click) => {
      const picked = this.viewer.scene.pick(click.position);
      if (Cesium.defined(picked) && picked.id && picked.id.satelliteId) {
        this.onSatelliteClick(picked.id.satelliteId, picked.id.name);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return this.viewer;
  }

  onSatelliteClick(noradId, name) {
    const feed = this.videoFeeds[noradId];
    if (feed && window.desktopAPI) {
      window.desktopAPI.openVideoWindow({
        id: noradId,
        title: feed.title,
        url: feed.url,
        width: 720,
        height: 440
      });
    } else if (window.desktopAPI) {
      window.desktopAPI.notify(
        name || 'Satellite',
        'No live video feed available for this satellite.'
      );
    }
  }

  addObserver(lat, lon) {
    if (this.observerEntity) this.viewer.entities.remove(this.observerEntity);

    this.observerEntity = this.viewer.entities.add({
      name: 'Observer',
      position: Cesium.Cartesian3.fromDegrees(lon, lat),
      point: {
        pixelSize: 12,
        color: Cesium.Color.fromCssColorString('#00f0ff'),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2
      },
      ellipse: {
        semiMinorAxis: 50000,
        semiMajorAxis: 50000,
        material: Cesium.Color.fromCssColorString('#00f0ff').withAlpha(0.1),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString('#00f0ff').withAlpha(0.4),
        outlineWidth: 1,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
      }
    });
  }

  updateSatellite(satellite, position) {
    const id = satellite.noradId;

    if (!this.satelliteHistory.has(id)) this.satelliteHistory.set(id, []);
    const history = this.satelliteHistory.get(id);
    history.push({
      longitude: position.lon,
      latitude: position.lat,
      height: position.alt * 1000
    });
    if (history.length > this.trailLength) history.shift();

    if (!this.satelliteEntities.has(id)) {
      const entity = this.viewer.entities.add({
        name: satellite.name,
        satelliteId: id,
        position: new Cesium.CallbackProperty(() => {
          const pos = this.currentPositions[id];
          if (pos) return Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, pos.alt * 1000);
          return Cesium.Cartesian3.ZERO;
        }, false),
        point: {
          pixelSize: 9,
          color: Cesium.Color.fromCssColorString('#00f0ff'),
          outlineColor: Cesium.Color.fromCssColorString('#ff00ff'),
          outlineWidth: 2
        },
        label: {
          text: satellite.name,
          font: '12px "Share Tech Mono"',
          fillColor: Cesium.Color.fromCssColorString('#00f0ff'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -12),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 15000000)
        }
      });
      this.satelliteEntities.set(id, entity);

      const trailEntity = this.viewer.entities.add({
        name: `${satellite.name} Trail`,
        polyline: {
          positions: new Cesium.CallbackProperty(() => {
            const hist = this.satelliteHistory.get(id) || [];
            return hist.map((p) =>
              Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude, p.height)
            );
          }, false),
          width: 2,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.35,
            color: Cesium.Color.fromCssColorString('#00f0ff').withAlpha(0.6)
          })
        }
      });
      this.trailEntities.set(id, trailEntity);
    }

    this.currentPositions[id] = position;
  }

  clearAll() {
    this.satelliteEntities.forEach((e) => this.viewer.entities.remove(e));
    this.trailEntities.forEach((e) => this.viewer.entities.remove(e));
    this.satelliteEntities.clear();
    this.trailEntities.clear();
    this.satelliteHistory.clear();
    this.currentPositions = {};
  }

  destroy() {
    this.clearAll();
    if (this.observerEntity) this.viewer.entities.remove(this.observerEntity);
    this.viewer.destroy();
  }
}

window.CesiumView = CesiumView;
