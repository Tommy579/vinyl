const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vinyle', {
  onNowPlaying: (callback) => {
    ipcRenderer.on('now-playing', (_evt, data) => callback(data));
  },
  onSyncAutoLaunchToggle: (callback) => {
    ipcRenderer.on('app:sync-auto-launch-toggle', (_evt, enabled) => callback(enabled));
  },
  getBridgeStatus: () => ipcRenderer.invoke('bridge:status'),
  playPause: () => ipcRenderer.send('bridge:play-pause'),
  next: () => ipcRenderer.send('bridge:next'),
  previous: () => ipcRenderer.send('bridge:previous'),
  seek: (seconds) => ipcRenderer.send('bridge:seek', seconds),
  setVolume: (percent) => ipcRenderer.send('bridge:volume', percent),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  getAutoLaunch: () => ipcRenderer.invoke('app:get-auto-launch'),
  setAutoLaunch: (enabled) => ipcRenderer.send('app:set-auto-launch', enabled),
  getAutoLaunchOnRequest: () => ipcRenderer.invoke('app:get-auto-launch-on-request'),
  setAutoLaunchOnRequest: (enabled) => ipcRenderer.send('app:set-auto-launch-on-request', enabled),
  getMinimizeOnClose: () => ipcRenderer.invoke('app:get-minimize-on-close'),
  setMinimizeOnClose: (enabled) => ipcRenderer.send('app:set-minimize-on-close', enabled),
});
