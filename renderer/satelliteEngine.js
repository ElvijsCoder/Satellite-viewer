/**
 * Satellite Engine
 * Fetches TLE data and calculates real-time satellite positions
 */
class SatelliteEngine {
  constructor() {
    this.satellites = [];
    this.tleUrl = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle';
    this.lastFetch = null;
    this.cacheDuration = 3600000; // 1 hour
  }

  async fetchTLEData() {
    if (this.lastFetch && Date.now() - this.lastFetch < this.cacheDuration && this.satellites.length) {
      return this.satellites;
    }
    try {
      const response = await fetch(this.tleUrl);
      if (!response.ok) throw new Error('Failed to fetch TLE data');
      const tleText = await response.text();
      this.satellites = this.parseTLEs(tleText);
      this.lastFetch = Date.now();
      return this.satellites;
    } catch (error) {
      console.warn('TLE fetch failed, using demo data:', error);
      return this.getDemoData();
    }
  }

  parseTLEs(tleText) {
    const lines = tleText.trim().split('\n');
    const satellites = [];
    for (let i = 0; i < lines.length; i += 3) {
      if (i + 2 >= lines.length) break;
      const name = lines[i].trim();
      const line1 = lines[i + 1].trim();
      const line2 = lines[i + 2].trim();
      if (line1.startsWith('1 ') && line2.startsWith('2 ')) {
        satellites.push({
          name,
          line1,
          line2,
          noradId: line2.substring(2, 7).trim()
        });
      }
    }
    return satellites;
  }

  getDemoData() {
    return [
      {
        name: 'ISS (ZARYA)',
        line1: '1 25544U 98067A   24138.50000000  .00020000  00000-0  28000-4 0  9999',
        line2: '2 25544  51.6416 247.4627 0006703 130.5360 229.5775 15.509955193  1234',
        noradId: '25544'
      },
      {
        name: 'HST',
        line1: '1 20580U 90037B   24138.50000000  .00001000  00000-0  10000-4 0  9999',
        line2: '2 20580  28.4699 288.4772 0002809  30.5199 329.5830 15.096910012  5678',
        noradId: '20580'
      }
    ];
  }

  calculatePosition(satellite, observerLat, observerLon, observerAlt = 0, date = new Date()) {
    try {
      const satrec = satelliteJS.twoline2satrec(satellite.line1, satellite.line2);
      const pv = satelliteJS.propagate(satrec, date);
      if (!pv.position) return null;

      const gmst = satelliteJS.gstime(date);
      const geodetic = satelliteJS.eciToGeodetic(pv.position, gmst);

      const satLat = satelliteJS.degreesLat(geodetic.latitude);
      const satLon = satelliteJS.degreesLong(geodetic.longitude);
      const satAlt = geodetic.height;

      const observerGeodetic = {
        longitude: satelliteJS.degreesToRadians(observerLon),
        latitude: satelliteJS.degreesToRadians(observerLat),
        height: observerAlt / 1000
      };

      const positionEcf = satelliteJS.eciToEcf(pv.position, gmst);
      const lookAngles = satelliteJS.ecfToLookAngles(observerGeodetic, positionEcf);

      const azimuth = satelliteJS.degreesAz(lookAngles.azimuth);
      const elevation = satelliteJS.degreesEl(lookAngles.elevation);
      const rangeSat = lookAngles.rangeSat;

      return {
        name: satellite.name,
        noradId: satellite.noradId,
        lat: satLat,
        lon: satLon,
        alt: satAlt,
        azimuth,
        elevation,
        range: rangeSat,
        velocity: Math.sqrt(
          pv.velocity.x ** 2 + pv.velocity.y ** 2 + pv.velocity.z ** 2
        ),
        isVisible: elevation > 0,
        timestamp: date
      };
    } catch (err) {
      console.error('Error calculating position for', satellite.name, err);
      return null;
    }
  }

  getVisibleSatellites(observerLat, observerLon, satellites = this.satellites) {
    const now = new Date();
    const visible = [];
    for (const sat of satellites) {
      const pos = this.calculatePosition(sat, observerLat, observerLon, 0, now);
      if (pos && pos.isVisible) visible.push(pos);
    }
    return visible.sort((a, b) => a.range - b.range);
  }

  getSatelliteByName(name) {
    return this.satellites.find((s) =>
      s.name.toLowerCase().includes(name.toLowerCase())
    );
  }

  getISS() {
    return this.getSatelliteByName('ISS');
  }
}

window.SatelliteEngine = SatelliteEngine;
