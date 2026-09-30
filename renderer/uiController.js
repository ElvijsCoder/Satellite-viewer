/**
 * UI Controller
 */
class UIController {
  constructor() {
    this.elements = {};
    this.cacheElements();
  }

  cacheElements() {
    this.elements = {
      closestSat: document.getElementById('closest-sat'),
      locStatus: document.getElementById('loc-status'),
      satCount: document.getElementById('sat-count'),
      visibleCount: document.getElementById('visible-count'),
      nextPassTime: document.getElementById('next-pass-time'),
      passList: document.getElementById('pass-list'),
      trackedSats: document.getElementById('tracked-sats')
    };
  }

  updateLocationStatus(status, isError = false) {
    if (!this.elements.locStatus) return;
    this.elements.locStatus.textContent = status;
    this.elements.locStatus.style.color = isError ? '#ff0040' : '#00f0ff';
  }

  updateSatCount(total, visible) {
    if (this.elements.satCount) this.elements.satCount.textContent = total;
    if (this.elements.visibleCount) this.elements.visibleCount.textContent = visible;
  }

  updateNextPass(time) {
    if (this.elements.nextPassTime) this.elements.nextPassTime.textContent = time || '--:--';
  }

  updateClosestSatellite(satellite) {
    if (!this.elements.closestSat) return;
    const content = this.elements.closestSat.querySelector('.panel-content');
    if (!content) return;

    if (!satellite) {
      content.innerHTML = `
        <div class="no-satellite">
          <span class="blink">/// NO VISIBLE SATELLITES ///</span>
        </div>
      `;
      return;
    }

    content.innerHTML = `
      <div class="closest-display">
        <div class="sat-name">${satellite.name}</div>
        <div class="closest-stats">
          <div class="stat-box ${satellite.range < 1000 ? 'highlight' : ''}">
            <div class="label">RANGE</div>
            <div class="value">${satellite.range.toFixed(0)} km</div>
          </div>
          <div class="stat-box">
            <div class="label">ELEVATION</div>
            <div class="value">${satellite.elevation.toFixed(1)}°</div>
          </div>
          <div class="stat-box">
            <div class="label">AZIMUTH</div>
            <div class="value">${satellite.azimuth.toFixed(0)}°</div>
          </div>
          <div class="stat-box">
            <div class="label">ALTITUDE</div>
            <div class="value">${satellite.alt.toFixed(0)} km</div>
          </div>
        </div>
      </div>
    `;
  }

  updatePassPredictions(passes) {
    if (!this.elements.passList) return;
    if (!passes || passes.length === 0) {
      this.elements.passList.innerHTML = `<div class="no-satellite"><span class="blink">/// NO UPCOMING PASSES ///</span></div>`;
      return;
    }

    const now = new Date();
    this.elements.passList.innerHTML = passes
      .map((pass) => {
        const isSoon = pass.startTime - now < 30 * 60000;
        return `
          <div class="pass-card ${isSoon ? 'high-priority' : ''}">
            <div class="pass-time">${pass.satellite}</div>
            <div class="pass-details">${this.formatTime(pass.startTime)} — Max: ${pass.maxElevation.toFixed(1)}°</div>
            <div class="pass-countdown">${this.formatCountdown(pass.startTime)}</div>
          </div>
        `;
      })
      .join('');

    if (passes.length > 0) this.updateNextPass(this.formatTime(passes[0].startTime));
  }

  updateTrackedSatellites(satellites) {
    if (!this.elements.trackedSats) return;
    if (!satellites || satellites.length === 0) {
      this.elements.trackedSats.innerHTML = `<div class="loading">SCANNING SKIES...</div>`;
      return;
    }

    this.elements.trackedSats.innerHTML = satellites
      .slice(0, 8)
      .map(
        (sat, index) => `
        <div class="satellite-card ${index === 0 ? 'closest' : ''}">
          <div class="sat-name">${sat.name}</div>
          <div class="sat-data">
            <span>ELEV</span><span class="value">${sat.elevation.toFixed(1)}°</span>
            <span>RANGE</span><span class="value">${sat.range.toFixed(0)} km</span>
            <span>AZ</span><span class="value">${sat.azimuth.toFixed(0)}°</span>
            <span>VEL</span><span class="value">${(sat.velocity * 3.6).toFixed(0)} km/h</span>
          </div>
        </div>`
      )
      .join('');
  }

  formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatCountdown(date) {
    const diff = date - new Date();
    if (diff < 0) return 'IN PROGRESS';
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  showToast(title, message) {
    const existing = document.querySelector('.notification-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.innerHTML = `<h4>${title}</h4><p>${message}</p>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 500);
    }, 4000);
  }
}

window.UIController = UIController;
