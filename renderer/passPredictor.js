/**
 * Pass Predictor
 * Predicts upcoming satellite passes above the observer.
 */
class PassPredictor {
  constructor(satelliteEngine) {
    this.engine = satelliteEngine;
  }

  async getNextPasses(observerLat, observerLon, satellites, maxPasses = 10) {
    const passes = [];
    const now = new Date();
    const stepMs = 30 * 1000; // 30s resolution
    const horizonMs = 12 * 60 * 60 * 1000; // next 12h

    for (const sat of satellites) {
      let inPass = false;
      let passStart = null;
      let maxElevation = 0;

      for (let t = 0; t < horizonMs; t += stepMs) {
        const date = new Date(now.getTime() + t);
        const pos = this.engine.calculatePosition(sat, observerLat, observerLon, 0, date);
        if (!pos) continue;

        if (pos.elevation > 0) {
          if (!inPass) {
            inPass = true;
            passStart = date;
            maxElevation = pos.elevation;
          } else {
            maxElevation = Math.max(maxElevation, pos.elevation);
          }
        } else if (inPass) {
          passes.push({
            satellite: sat.name,
            startTime: passStart,
            maxElevation,
            isBright: maxElevation > 40
          });
          inPass = false;
        }
        if (passes.length >= maxPasses * 2) break;
      }
      if (passes.length >= maxPasses * 2) break;
    }

    passes.sort((a, b) => a.startTime - b.startTime);
    return passes.slice(0, maxPasses);
  }
}

window.PassPredictor = PassPredictor;
