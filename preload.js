const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vinyle', {
  onNowPlaying: (callback) => {
    ipcRenderer.on('now-playing', (_evt, data) => callback(data));
  },
  getBridgeStatus: () => ipcRenderer.invoke('bridge:status'),
  playPause: () => ipcRenderer.send('bridge:play-pause'),
  next: () => ipcRenderer.send('bridge:next'),
  previous: () => ipcRenderer.send('bridge:previous'),
  seek: (seconds) => ipcRenderer.send('bridge:seek', seconds),
  setVolume: (percent) => ipcRenderer.send('bridge:volume', percent),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  closeWindow: () => ipcRenderer.send('window:close'),
});
