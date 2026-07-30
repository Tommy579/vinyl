/**
 * itunesBridge.js
 * -----------------------------------------------------------------------
 * Pont entre l'app Electron et l'application "Apple Music" sur Windows.
 *
 * IMPORTANT (à lire avant de te battre avec ce fichier) :
 * Apple Music pour Windows est construit sur l'ancien moteur iTunes et
 * expose encore, dans sa version classique (installeur .exe téléchargé
 * depuis apple.com/itunes ou support.apple.com), une interface
 * d'automatisation COM appelée "iTunesCOMInterface" (ProgID:
 * "iTunes.Application"). C'est cette interface qu'on utilise ici pour
 * lire le morceau en cours, l'avancement, la pochette, et pour piloter
 * play/pause/suivant/précédent.
 *
 * La version distribuée via le Microsoft Store est packagée en MSIX et
 * ne réexpose PAS cette interface COM classique. Si tu as installé la
 * version Store, ce pont ne trouvera rien : installe la version "legacy"
 * depuis https://support.apple.com/fr-fr/HT210384 (lien "téléchargement
 * direct pour Windows").
 *
 * Il n'existe aucun moyen, ni pour cette app ni pour aucune autre app
 * tierce, de décoder et lire un flux audio Apple Music en streaming DRM
 * (FairPlay) à l'intérieur d'Electron/Chromium : FairPlay n'est
 * supporté que par le moteur WebKit de Safari. C'est pour ça que cette
 * app ne "joue" pas la musique elle-même : elle pilote et reflète l'app
 * Apple Music officielle, comme le ferait une télécommande.
 * -----------------------------------------------------------------------
 */

let winax = null;
try {
  // winax nécessite les Build Tools Visual Studio (module natif) et ne
  // fonctionne que sous Windows. On l'encapsule dans un try/catch pour
  // que l'app puisse quand même démarrer en mode démo sur une autre
  // plateforme ou si le module n'a pas pu être compilé.
  winax = require('winax');
} catch (err) {
  console.warn('[itunesBridge] module "winax" indisponible :', err.message);
}

class ITunesBridge {
  constructor() {
    this.app = null;
    this.connected = false;
    this._tryConnect();
  }

  _tryConnect() {
    if (!winax) return false;
    try {
      this.app = new winax.Object('iTunes.Application', { activate: false });
      this.connected = true;
      return true;
    } catch (err) {
      this.connected = false;
      this.app = null;
      return false;
    }
  }

  isAvailable() {
    if (!this.connected) this._tryConnect();
    return this.connected;
  }

  /**
   * Renvoie l'état courant : morceau, artiste, album, pochette (base64),
   * position, durée, et si la lecture est en cours.
   * Renvoie null si Apple Music n'est pas joignable.
   */
  getNowPlaying() {
    if (!this.isAvailable()) return null;
    try {
      const track = this.app.CurrentTrack;
      if (!track) return null;

      let artworkBase64 = null;
      try {
        if (track.Artwork && track.Artwork.Count > 0) {
          const art = track.Artwork.Item(1);
          // winax expose les octets bruts ; on les convertit en base64
          const raw = art.RawData;
          artworkBase64 = Buffer.from(raw, 'binary').toString('base64');
        }
      } catch (e) {
        artworkBase64 = null;
      }

      return {
        title: track.Name || 'Titre inconnu',
        artist: track.Artist || 'Artiste inconnu',
        album: track.Album || '',
        duration: track.Duration || 0,           // secondes
        position: this.app.PlayerPosition || 0,   // secondes
        isPlaying: this.app.PlayerState === 1,     // 1 = en lecture
        artwork: artworkBase64,
      };
    } catch (err) {
      this.connected = false;
      return null;
    }
  }

  playPause() {
    if (!this.isAvailable()) return;
    try { this.app.PlayPause(); } catch (e) { /* ignore */ }
  }

  next() {
    if (!this.isAvailable()) return;
    try { this.app.NextTrack(); } catch (e) { /* ignore */ }
  }

  previous() {
    if (!this.isAvailable()) return;
    try { this.app.PreviousTrack(); } catch (e) { /* ignore */ }
  }

  seekTo(seconds) {
    if (!this.isAvailable()) return;
    try { this.app.PlayerPosition = seconds; } catch (e) { /* ignore */ }
  }

  setVolume(percent) {
    if (!this.isAvailable()) return;
    try { this.app.SoundVolume = Math.max(0, Math.min(100, percent)); } catch (e) { /* ignore */ }
  }
}

module.exports = ITunesBridge;
