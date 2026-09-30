# 🛰 Satellite Proximity Tracker

> Real-time orbital surveillance of Earth's active satellite network — rendered on a rotating cyberpunk 3D globe.

A portable Windows desktop app that tracks thousands of satellites in low, medium, and geostationary orbit. Calculates live positions, pass predictions, and proximity vectors from your ground station. Built for people who want to *see* what’s overhead right now.

### ✨ Features
- 🌍 **Rotating 3D globe** with live satellite positions
- 📡 **Real-time TLE data** from Celestrak
- 🎯 **Pass predictions** with countdown timers
- 🛰 **Dedicated ISS tracker** with live HD feed
- 🎨 **Full cyberpunk HUD** — neon grids, scanlines, glitch effects
- 🔊 **Procedural Web Audio** UI sounds
- 📦 **Portable Windows .exe** — no install, no admin rights

### 🧰 Tech Stack
CesiumJS · satellite.js · Leaflet · Electron · Web Audio API

### 📡 Data Sources
- **Celestrak** — TLE orbital elements
- **Cesium Ion** — 3D globe rendering
- **IP-API** — approximate geolocation

### 🚀 Run It
1. Download the latest `SatelliteTracker.exe` from [Releases](../../releases)
2. Double-click to run
3. Enter coordinates or use auto-IP location

> **Note:** On first launch, Windows may show a SmartScreen warning because the app is unsigned. Click **“More info” → “Run anyway”**. The full source is open in this repository.

### 🛠 Build From Source
```bash
git clone https://github.com/ElvijsCoder/satellite-proximity-tracker.git
cd satellite-proximity-tracker
npm install
npm start
