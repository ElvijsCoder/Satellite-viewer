/**
 * Location Service (Desktop)
 * Uses IP-based geolocation with manual fallback.
 */
class LocationService {
  constructor() {
    this.position = null;
  }

  async getApproximateLocation() {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      return {
        lat: data.latitude,
        lon: data.longitude,
        alt: 0,
        accuracy: 50000,
        city: data.city,
        country: data.country_name,
        isApproximate: true
      };
    } catch {
      return {
        lat: 40.7128,
        lon: -74.006,
        alt: 0,
        accuracy: 1000000,
        isApproximate: true,
        isDefault: true
      };
    }
  }

  setManual(lat, lon) {
    this.position = { lat: Number(lat), lon: Number(lon), alt: 0, accuracy: 0 };
    return this.position;
  }

  getCurrentPosition() {
    return this.position;
  }
}

window.LocationService = LocationService;
