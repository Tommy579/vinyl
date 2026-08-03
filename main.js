const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const MediaSessionBridge = require('./src/mediaSessionBridge');

let mainWindow = null;
let bridge = null;
let pollTimer = null;
let lastSentSignature = null;

let autoLaunchOnRequest = false;
let minimizeOnClose = true;
let configPath = '';
let httpServer = null;
let tray = null;
let isQuitting = false;

function updateTrayMenu() {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Ouvrir Vinyle',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Lancement automatique',
      type: 'checkbox',
      checked: autoLaunchOnRequest,
      click: (menuItem) => {
        autoLaunchOnRequest = menuItem.checked;
        saveLaunchConfig();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('app:sync-auto-launch-toggle', autoLaunchOnRequest);
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quitter',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets/vinyl.png');
  tray = new Tray(iconPath);
  tray.setToolTip('Vinyle - Platine virtuelle');
  updateTrayMenu();

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function loadLaunchConfig() {
  try {
    configPath = path.join(app.getPath('userData'), 'config-launch.json');
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      autoLaunchOnRequest = data.autoLaunchOnRequest !== undefined ? !!data.autoLaunchOnRequest : true;
      minimizeOnClose = data.minimizeOnClose !== undefined ? !!data.minimizeOnClose : true;
    } else {
      autoLaunchOnRequest = true; // default to true
      minimizeOnClose = true;
    }
  } catch (err) {
    console.error('Failed to load launch config:', err);
    autoLaunchOnRequest = true;
    minimizeOnClose = true;
  }
}

function saveLaunchConfig() {
  try {
    if (!configPath) {
      configPath = path.join(app.getPath('userData'), 'config-launch.json');
    }
    fs.writeFileSync(configPath, JSON.stringify({ autoLaunchOnRequest, minimizeOnClose }), 'utf8');
  } catch (err) {
    console.error('Failed to save launch config:', err);
  }
}

function startHttpServer() {
  httpServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = req.url || '';
    if (url.includes('launch') || url.includes('spotify') || url.includes('deezer') || url.includes('applemusic') || url.includes('apple-music') || url === '/') {
      if (autoLaunchOnRequest) {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Vinyl launched/focused' }));
        return;
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Auto-launch is disabled' }));
        return;
      }
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  httpServer.on('error', (err) => {
    console.error('HTTP Server error:', err);
  });

  httpServer.listen(19090, '127.0.0.1', () => {
    console.log('HTTP Server listening on http://localhost:19090');
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 760,
    minHeight: 560,
    backgroundColor: '#16110D',
    icon: path.join(__dirname, 'assets/vinyl.png'),
    frame: false,           // habillage retro custom, voir titlebar dans index.html
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('close', (event) => {
    if (isQuitting) return;
    if (minimizeOnClose) {
      event.preventDefault();
      mainWindow.hide();
    } else {
      isQuitting = true;
      app.quit();
    }
  });
}

let wasPlaying = false;
let lastTitle = null;

function startPolling() {
  bridge = new MediaSessionBridge();

  pollTimer = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    const state = bridge.getNowPlaying();
    const payload = state
      ? { connected: true, ...state }
      : { connected: bridge.isAvailable(), title: null };

    // Auto-lancement / Focus de la fenêtre lorsque la musique démarre ou change
    if (autoLaunchOnRequest && payload.connected && payload.isPlaying) {
      const trackChanged = payload.title !== lastTitle;
      const startedPlaying = !wasPlaying;
      if ((startedPlaying || trackChanged) && payload.title) {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
      }
    }

    wasPlaying = !!payload.isPlaying;
    lastTitle = payload.title;

    // On évite de spammer le renderer si rien n'a changé (position mise
    // à part, qui elle change en continu pendant la lecture).
    const signature = JSON.stringify({
      title: payload.title,
      isPlaying: payload.isPlaying,
      connected: payload.connected,
    });

    mainWindow.webContents.send('now-playing', payload);
    lastSentSignature = signature;
  }, 700);
}

ipcMain.handle('bridge:status', () => ({
  available: bridge ? bridge.isAvailable() : false,
}));

ipcMain.on('bridge:play-pause', () => bridge && bridge.playPause());
ipcMain.on('bridge:next', () => bridge && bridge.next());
ipcMain.on('bridge:previous', () => bridge && bridge.previous());
ipcMain.on('bridge:seek', (_evt, seconds) => bridge && bridge.seekTo(seconds));
ipcMain.on('bridge:volume', (_evt, percent) => bridge && bridge.setVolume(percent));

ipcMain.handle('app:get-auto-launch', () => {
  const settings = app.getLoginItemSettings();
  return settings.openAtLogin;
});

ipcMain.on('app:set-auto-launch', (_evt, enabled) => {
  app.setLoginItemSettings({
    openAtLogin: !!enabled,
    path: process.execPath,
  });
});

ipcMain.handle('app:get-auto-launch-on-request', () => {
  return autoLaunchOnRequest;
});

ipcMain.on('app:set-auto-launch-on-request', (_evt, enabled) => {
  autoLaunchOnRequest = !!enabled;
  saveLaunchConfig();
  updateTrayMenu();
});

ipcMain.handle('app:get-minimize-on-close', () => {
  return minimizeOnClose;
});

ipcMain.on('app:set-minimize-on-close', (_evt, enabled) => {
  minimizeOnClose = !!enabled;
  saveLaunchConfig();
});

ipcMain.on('window:minimize', () => mainWindow && mainWindow.minimize());
ipcMain.on('window:close', () => mainWindow && mainWindow.close());

app.whenReady().then(() => {
  loadLaunchConfig();
  createTray();
  createWindow();
  startPolling();
  startHttpServer();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (pollTimer) clearInterval(pollTimer);
  if (httpServer) httpServer.close();
  if (process.platform !== 'darwin') app.quit();
});
