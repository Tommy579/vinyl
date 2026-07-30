const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const MediaSessionBridge = require('./src/mediaSessionBridge');

let mainWindow = null;
let bridge = null;
let pollTimer = null;
let lastSentSignature = null;

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
}

function startPolling() {
  bridge = new MediaSessionBridge();

  pollTimer = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    const state = bridge.getNowPlaying();
    const payload = state
      ? { connected: true, ...state }
      : { connected: bridge.isAvailable(), title: null };

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

ipcMain.on('window:minimize', () => mainWindow && mainWindow.minimize());
ipcMain.on('window:close', () => mainWindow && mainWindow.close());

app.whenReady().then(() => {
  createWindow();
  startPolling();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (pollTimer) clearInterval(pollTimer);
  if (process.platform !== 'darwin') app.quit();
});
