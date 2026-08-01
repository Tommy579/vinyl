/**
 * mediaSessionBridge.js
 * -----------------------------------------------------------------------
 * Pont entre l'app Electron et les System Media Transport Controls (SMTC)
 * de Windows 10/11 via PowerShell WinRT.
 * -----------------------------------------------------------------------
 */

const { execFile } = require('child_process');
const path = require('path');

class MediaSessionBridge {
  constructor() {
    this.scriptPath = path.join(__dirname, 'mediaSessionBridge.ps1');
    this.currentState = null;
    this.isPolling = false;
    this.startBackgroundSync();
  }

  startBackgroundSync() {
    if (this.isPolling) return;
    this.isPolling = true;

    const poll = () => {
      this._fetchSessionState((state) => {
        if (state && state.connected) {
          this.currentState = state;
        } else {
          this.currentState = null;
        }
        setTimeout(poll, 600);
      });
    };

    poll();
  }

  _fetchSessionState(callback) {
    execFile(
      'powershell.exe',
      ['-ExecutionPolicy', 'Bypass', '-File', this.scriptPath],
      { windowsHide: true, timeout: 3000 },
      (error, stdout) => {
        if (error || !stdout) {
          return callback(null);
        }
        try {
          const data = JSON.parse(stdout.trim());
          callback(data);
        } catch (e) {
          callback(null);
        }
      }
    );
  }

  _sendCommand(action, ...args) {
    execFile(
      'powershell.exe',
      ['-ExecutionPolicy', 'Bypass', '-File', this.scriptPath, action, ...args.map(String)],
      { windowsHide: true, timeout: 3000 },
      () => {}
    );
  }

  isAvailable() {
    return this.currentState !== null && this.currentState.connected;
  }

  /**
   * Renvoie l'état courant avec le temps de lecture réel recalculé.
   */
  getNowPlaying() {
    if (!this.isAvailable()) return null;

    let livePosition = this.currentState.position || 0;
    const duration = this.currentState.duration || 0;

    if (this.currentState.isPlaying && this.currentState.lastUpdated) {
      const updatedTimestamp = new Date(this.currentState.lastUpdated).getTime();
      if (!isNaN(updatedTimestamp)) {
        const elapsedSec = (Date.now() - updatedTimestamp) / 1000;
        if (elapsedSec > 0 && elapsedSec < 3600) {
          livePosition = livePosition + elapsedSec;
          if (duration > 0 && livePosition > duration) {
            livePosition = duration;
          }
        }
      }
    }

    return {
      title: this.currentState.title || 'Titre inconnu',
      artist: this.currentState.artist || 'Artiste inconnu',
      album: this.currentState.album || '',
      duration: duration || 210,
      position: Math.max(0, livePosition),
      isPlaying: !!this.currentState.isPlaying,
      artwork: this.currentState.artwork || null,
      source: this.currentState.source || 'MediaSession',
    };
  }

  playPause() {
    if (this.currentState) {
      this.currentState.isPlaying = !this.currentState.isPlaying;
    }
    this._sendCommand('playpause');
  }

  next() {
    this._sendCommand('next');
  }

  previous() {
    this._sendCommand('previous');
  }

  seekTo(seconds) {
    if (this.currentState) {
      this.currentState.position = seconds;
      this.currentState.lastUpdated = new Date().toISOString();
    }
    this._sendCommand('seek', seconds);
  }

  setVolume(percent) {
    this._sendCommand('volume', percent);
  }
}

module.exports = MediaSessionBridge;
