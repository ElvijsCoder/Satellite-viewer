const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');

let mainWindow = null;
const videoWindows = new Map();

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 950,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0a0a12',
    title: 'Satellite Proximity Tracker',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
}

// Opens a small floating window with a video (used for ISS live feed, etc.)
ipcMain.handle('open-video-window', (_event, { id, title, url, width, height }) => {
  if (videoWindows.has(id)) {
    const existing = videoWindows.get(id);
    if (!existing.isDestroyed()) {
      existing.focus();
      return true;
    }
  }

  const win = new BrowserWindow({
    width: width || 640,
    height: height || 400,
    title: title || 'Live Feed',
    backgroundColor: '#0a0a12',
    autoHideMenuBar: true,
    alwaysOnTop: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Embed youtube via a tiny wrapper so autoplay works with sound
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          html, body { margin: 0; padding: 0; background: #0a0a12; overflow: hidden; }
          iframe { border: 0; width: 100vw; height: 100vh; }
        </style>
      </head>
      <body>
        <iframe
          src="${url}"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowfullscreen
        ></iframe>
      </body>
    </html>
  `;

  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  videoWindows.set(id, win);

  win.on('closed', () => videoWindows.delete(id));
  return true;
});

ipcMain.handle('close-video-window', (_event, id) => {
  if (videoWindows.has(id)) {
    const w = videoWindows.get(id);
    if (!w.isDestroyed()) w.close();
    videoWindows.delete(id);
  }
});

ipcMain.handle('show-notification', (_event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});

app.whenReady().then(() => {
  createMainWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
