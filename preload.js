const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  openVideoWindow: (opts) => ipcRenderer.invoke('open-video-window', opts),
  closeVideoWindow: (id) => ipcRenderer.invoke('close-video-window', id),
  notify: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),
  isDesktop: true
});
