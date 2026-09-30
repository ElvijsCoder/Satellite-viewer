/**
 * Notification Service
 * Uses Electron native notifications via preload bridge.
 */
class NotificationService {
  constructor() {
    this.enabled = false;
    this.notified = new Set();
  }

  async init() {
    // Nothing to do on desktop — always available
    return true;
  }

  async toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  checkAndNotify(passes) {
    if (!this.enabled) return;
    const now = Date.now();

    for (const pass of passes) {
      const diff = pass.startTime - now;
      const key = `${pass.satellite}-${pass.startTime.getTime()}`;

      if (diff > 0 && diff < 5 * 60 * 1000 && !this.notified.has(key)) {
        this.notified.add(key);
        if (window.desktopAPI?.notify) {
          window.desktopAPI.notify(
            `Pass incoming: ${pass.satellite}`,
            `Max elevation ${pass.maxElevation.toFixed(1)}° — starting soon`
          );
        }
      }
    }
  }
}

window.NotificationService = NotificationService;
