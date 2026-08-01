(() => {
  'use strict';

  // ---------------------------------------------------------- Éléments
  const vinyl = document.getElementById('vinyl');
  const label = document.getElementById('vinyl-label');
  const artworkImg = document.getElementById('artwork-img');
  const tonearm = document.getElementById('tonearm');
  const dropHint = document.getElementById('drop-hint');

  const trackTitle = document.getElementById('track-title');
  const trackArtist = document.getElementById('track-artist');
  const trackAlbum = document.getElementById('track-album');

  const btnPlayPause = document.getElementById('btn-playpause');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');

  const seek = document.getElementById('seek');
  const timeCurrent = document.getElementById('time-current');
  const timeTotal = document.getElementById('time-total');
  const volume = document.getElementById('volume');

  const connectionDot = document.getElementById('connection-dot');
  const connectionText = document.getElementById('connection-text');

  const drawerToggle = document.getElementById('drawer-toggle');
  const drawerBody = document.getElementById('drawer-body');
  const drawerArrow = document.getElementById('drawer-arrow');

  const appThemeSelect = document.getElementById('app-theme-select');
  const tableWoodSelect = document.getElementById('table-wood-select');
  const tableCustomColor = document.getElementById('table-custom-color');

  const vinylColorSelect = document.getElementById('vinyl-color-select');
  const vinylCustomColor = document.getElementById('vinyl-custom-color');

  const textureSelect = document.getElementById('texture-select');
  const accentColor = document.getElementById('accent-color');

  document.getElementById('btn-min').addEventListener('click', () => window.vinyle.minimizeWindow());
  document.getElementById('btn-close').addEventListener('click', () => window.vinyle.closeWindow());

  const DEMO_ARTWORK_SVG = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#c95a2e"/>
        <stop offset="60%" stop-color="#7a2614"/>
        <stop offset="100%" stop-color="#2a0d1d"/>
      </linearGradient>
    </defs>
    <rect width="400" height="400" fill="url(#g)"/>
    <circle cx="200" cy="200" r="140" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="4"/>
    <circle cx="200" cy="200" r="90" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2"/>
    <text x="200" y="190" font-family="sans-serif" font-size="28" font-weight="bold" fill="#fff" text-anchor="middle">NOCTURNE</text>
    <text x="200" y="225" font-family="sans-serif" font-size="14" fill="rgba(255,255,255,0.75)" letter-spacing="2" text-anchor="middle">MODE DÉMO</text>
  </svg>`);

  // ------------------------------------------------------------- État
  let state = {
    connected: false,
    isPlaying: false,
    title: 'Nocturne (démo)',
    artist: 'Aperçu local',
    album: 'Mode démonstration',
    duration: 210,
    position: 0,
    artwork: DEMO_ARTWORK_SVG,
  };

  let demoTicker = null;
  let userIsSeeking = false;
  let dominantArtworkColor = null;
  let lastTrackTitle = null;

  // -------------------------------------------------- Persistence des Thèmes
  function saveThemeSettings() {
    const settings = {
      appTheme: appThemeSelect ? appThemeSelect.value : 'dark',
      tableWood: tableWoodSelect ? tableWoodSelect.value : 'noyer',
      tableCustomColor: tableCustomColor ? tableCustomColor.value : '#4a2c1a',
      vinylColor: vinylColorSelect ? vinylColorSelect.value : 'black',
      vinylCustomColor: vinylCustomColor ? vinylCustomColor.value : '#0b0b0d',
      textureStyle: textureSelect ? textureSelect.value : 'artwork',
      accentColor: accentColor ? accentColor.value : '#c97a3d',
    };
    localStorage.setItem('vinyle-theme-settings', JSON.stringify(settings));
  }

  function loadThemeSettings() {
    const savedRaw = localStorage.getItem('vinyle-theme-settings');
    let settings = {};
    if (savedRaw) {
      try {
        settings = JSON.parse(savedRaw);
      } catch (e) {}
    }

    const legacyAppTheme = localStorage.getItem('app-theme');

    const appTheme = settings.appTheme || legacyAppTheme || 'dark';
    const tableWood = settings.tableWood || 'noyer';
    const tableCustomColorVal = settings.tableCustomColor || '#4a2c1a';
    const vinylColor = settings.vinylColor || 'black';
    const vinylCustomColorVal = settings.vinylCustomColor || '#0b0b0d';
    const textureStyle = settings.textureStyle || 'artwork';
    const accentColorVal = settings.accentColor || '#c97a3d';

    if (appThemeSelect) appThemeSelect.value = appTheme;
    if (tableWoodSelect) tableWoodSelect.value = tableWood;
    if (tableCustomColor) tableCustomColor.value = tableCustomColorVal;
    if (vinylColorSelect) vinylColorSelect.value = vinylColor;
    if (vinylCustomColor) vinylCustomColor.value = vinylCustomColorVal;
    if (textureSelect) textureSelect.value = textureStyle;
    if (accentColor) accentColor.value = accentColorVal;

    applyAppTheme(appTheme);
    applyTableFinish();
    applyVinylColor();
    applyAccentColor();
    refreshLabelArtworkVisibility();
  }

  // ------------------------------------------------------- Thème Global App
  function applyAppTheme(mode) {
    document.documentElement.setAttribute('data-app-theme', mode);
    if (appThemeSelect) appThemeSelect.value = mode;
  }

  if (appThemeSelect) {
    appThemeSelect.addEventListener('change', () => {
      applyAppTheme(appThemeSelect.value);
      saveThemeSettings();
    });
  }

  // ------------------------------------------------------- Finition Table (Bois / Perso)
  const WOOD_PRESETS = {
    noyer: { c1: '#4a2c1a', c2: '#2f1a10' },
    chene: { c1: '#b88d5e', c2: '#7a5833' },
    acajou: { c1: '#662218', c2: '#380e07' },
    ebene: { c1: '#2a2a2d', c2: '#141416' },
    erable: { c1: '#d9be95', c2: '#9e8257' },
  };

  function applyTableFinish() {
    const mode = tableWoodSelect.value;
    if (tableCustomColor) tableCustomColor.hidden = (mode !== 'custom');

    let c1, c2;
    if (mode === 'custom') {
      c1 = tableCustomColor.value;
      c2 = adjustColorBrightness(c1, -30);
    } else {
      const preset = WOOD_PRESETS[mode] || WOOD_PRESETS.noyer;
      c1 = preset.c1;
      c2 = preset.c2;
    }

    document.documentElement.style.setProperty('--plinth-wood-1', c1);
    document.documentElement.style.setProperty('--plinth-wood-2', c2);
  }

  tableWoodSelect.addEventListener('change', () => {
    applyTableFinish();
    saveThemeSettings();
  });
  tableCustomColor.addEventListener('input', () => {
    applyTableFinish();
    saveThemeSettings();
  });

  function adjustColorBrightness(hex, percent) {
    let num = parseInt(hex.replace('#', ''), 16);
    if (isNaN(num)) return '#1a120c';
    let r = Math.max(0, Math.min(255, (num >> 16) + percent));
    let g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + percent));
    let b = Math.max(0, Math.min(255, (num & 0x0000FF) + percent));
    return '#' + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
  }

  // ------------------------------------------------------- Couleur du Vinyle
  function isLightColor(hex) {
    if (!hex || typeof hex !== 'string') return false;
    let num = parseInt(hex.replace('#', ''), 16);
    if (isNaN(num)) return false;
    let r = (num >> 16) & 0xFF;
    let g = (num >> 8) & 0xFF;
    let b = num & 0xFF;
    let brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 165;
  }

  function applyVinylColor() {
    const mode = vinylColorSelect.value;
    if (vinylCustomColor) vinylCustomColor.hidden = (mode !== 'custom');

    let color = '#0b0b0d';
    if (mode === 'white') {
      color = '#f2f2f4';
    } else if (mode === 'auto') {
      if (!dominantArtworkColor && artworkImg && artworkImg.complete && artworkImg.naturalWidth > 0) {
        extractDominantColor(artworkImg);
      }
      color = dominantArtworkColor || (accentColor ? accentColor.value : '#c97a3d');
    } else if (mode === 'custom') {
      color = vinylCustomColor.value;
    }

    document.documentElement.style.setProperty('--vinyl-color', color);
    vinyl.classList.toggle('is-light-vinyl', isLightColor(color));
  }

  vinylColorSelect.addEventListener('change', () => {
    applyVinylColor();
    saveThemeSettings();
  });
  vinylCustomColor.addEventListener('input', () => {
    applyVinylColor();
    saveThemeSettings();
  });

  function applyAccentColor() {
    if (accentColor) {
      document.documentElement.style.setProperty('--accent', accentColor.value);
    }
  }

  accentColor.addEventListener('input', () => {
    applyAccentColor();
    saveThemeSettings();
  });

  const accentPresets = document.getElementById('accent-presets');
  if (accentPresets) {
    accentPresets.querySelectorAll('.accent-dot').forEach((dot) => {
      dot.addEventListener('click', () => {
        const color = dot.getAttribute('data-color');
        if (color && accentColor) {
          accentColor.value = color;
          applyAccentColor();
          if (vinylColorSelect && vinylColorSelect.value === 'auto' && !dominantArtworkColor) {
            applyVinylColor();
          }
          saveThemeSettings();
        }
      });
    });
  }

  // ------------------------------------------------------- Extraction Couleur Pochette
  function extractDominantColor(img) {
    if (!img || !img.complete || img.naturalWidth === 0) return;
    try {
      const cvs = document.createElement('canvas');
      const ctx = cvs.getContext('2d');
      cvs.width = 32;
      cvs.height = 32;
      ctx.drawImage(img, 0, 0, 32, 32);
      const data = ctx.getImageData(0, 0, 32, 32).data;

      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
      if (count > 0) {
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        dominantArtworkColor = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
        if (vinylColorSelect && vinylColorSelect.value === 'auto') {
          applyVinylColor();
        }
      }
    } catch (e) {
      dominantArtworkColor = null;
    }
  }

  artworkImg.addEventListener('load', () => {
    extractDominantColor(artworkImg);
  });

  function refreshLabelArtworkVisibility() {
    const val = textureSelect.value;
    const hasArtwork = !!state.artwork;
    const isPictureDisc = val === 'full-picture';

    vinyl.classList.toggle('is-picture-disc', isPictureDisc);
    label.classList.toggle('is-picture-disc', isPictureDisc);

    if (val === 'artwork' || val === 'full-picture') {
      label.classList.toggle('has-artwork', hasArtwork);
      if (val === 'full-picture' && hasArtwork) {
        const srcUrl = state.artwork.startsWith('data:')
          ? state.artwork
          : `data:image/jpeg;base64,${state.artwork}`;
        vinyl.style.backgroundImage = `url("${srcUrl}")`;
      } else {
        vinyl.style.backgroundImage = '';
      }
    } else {
      label.classList.remove('has-artwork');
      vinyl.style.backgroundImage = '';
    }
  }

  textureSelect.addEventListener('change', () => {
    refreshLabelArtworkVisibility();
    saveThemeSettings();
  });

  drawerToggle.addEventListener('click', () => {
    const collapsed = drawerBody.classList.toggle('collapsed');
    drawerArrow.textContent = collapsed ? '▸' : '▾';
  });

  // -------------------------------------------------- Animation Changement Vinyle
  function triggerVinylSwapAnimation() {
    vinyl.classList.remove('swapping');
    void vinyl.offsetWidth; // Force le reflow GPU pour relancer l'animation CSS à 60fps
    vinyl.classList.add('swapping');
  }

  vinyl.addEventListener('animationend', (e) => {
    if (e.animationName === 'vinylSwap') {
      vinyl.classList.remove('swapping');
    }
  });

  // -------------------------------------------------- Bras interactif
  const REST_ANGLE = 0;     // bras vertical au repos (pause)
  const DROP_ANGLE = 25;    // bras incliné vers la gauche au-dessus du vinyle (lecture)
  const DROP_THRESHOLD = 10;

  let dragging = false;

  function angleFromEvent(evt) {
    const rect = tonearm.parentElement.getBoundingClientRect();
    const pivotX = rect.left + 12;
    const pivotY = rect.top + 12;
    const dx = evt.clientX - pivotX;
    const dy = evt.clientY - pivotY;
    let deg = (Math.atan2(-dx, dy) * 180) / Math.PI;
    return Math.max(REST_ANGLE - 2, Math.min(DROP_ANGLE + 4, deg));
  }

  tonearm.addEventListener('pointerdown', (evt) => {
    dragging = true;
    tonearm.classList.add('dragging');
    tonearm.setPointerCapture(evt.pointerId);
  });

  tonearm.addEventListener('pointermove', (evt) => {
    if (!dragging) return;
    const deg = angleFromEvent(evt);
    tonearm.style.transform = `rotate(${deg}deg)`;
  });

  tonearm.addEventListener('pointerup', (evt) => {
    dragging = false;
    tonearm.classList.remove('dragging');
    const deg = angleFromEvent(evt);
    const dropped = deg > DROP_THRESHOLD;
    userDropTonearm(dropped);
  });

  function setTonearmVisual(dropped) {
    tonearm.classList.toggle('dropped', dropped);
    tonearm.style.transform = `rotate(${dropped ? DROP_ANGLE : REST_ANGLE}deg)`;
    dropHint.style.opacity = dropped ? '0' : '1';
  }

  function userDropTonearm(dropped) {
    setTonearmVisual(dropped);
    if (dropped && !state.isPlaying) requestPlayPause();
    if (!dropped && state.isPlaying) requestPlayPause();
  }

  // --------------------------------------------------------- Contrôles
  function requestPlayPause() {
    if (state.connected) {
      window.vinyle.playPause();
    } else {
      state.isPlaying = !state.isPlaying;
      renderPlayState();
      toggleDemoTicker();
    }
  }

  btnPlayPause.addEventListener('click', () => {
    requestPlayPause();
  });
  btnPrev.addEventListener('click', () => window.vinyle.previous());
  btnNext.addEventListener('click', () => window.vinyle.next());

  seek.addEventListener('input', () => { userIsSeeking = true; });
  seek.addEventListener('change', () => {
    const seconds = (seek.value / 100) * (state.duration || 210);
    state.position = seconds;
    if (state.connected) window.vinyle.seek(seconds);
    userIsSeeking = false;
    renderProgress();
  });

  volume.addEventListener('input', () => window.vinyle.setVolume(Number(volume.value)));

  // ---------------------------------------------------------- Rendu
  function renderPlayState() {
    vinyl.classList.toggle('playing', state.isPlaying);
    btnPlayPause.textContent = state.isPlaying ? '❚❚' : '▶';
  }

  function formatTime(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(sec / 60);
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function renderTrack() {
    trackTitle.textContent = state.title || 'Aucun morceau';
    trackArtist.textContent = state.artist || (state.connected ? 'En pause' : 'Lance la lecture dans Apple Music');
    trackAlbum.textContent = state.album || '';

    if (state.artwork) {
      artworkImg.src = state.artwork.startsWith('data:')
        ? state.artwork
        : `data:image/jpeg;base64,${state.artwork}`;
    } else {
      artworkImg.removeAttribute('src');
      dominantArtworkColor = null;
      applyVinylColor();
    }
    refreshLabelArtworkVisibility();
  }

  function renderProgress() {
    timeCurrent.textContent = formatTime(state.position);
    timeTotal.textContent = formatTime(state.duration);
    if (!userIsSeeking) {
      seek.value = state.duration ? (state.position / state.duration) * 100 : 0;
    }
  }

  function renderConnection() {
    connectionDot.classList.toggle('connected', state.connected);
    connectionText.textContent = state.connected
      ? 'Synchronisé avec Apple Music (MediaSession)'
      : 'Apple Music introuvable — mode démo';
  }

  // ------------------------------------------------- Flux Apple Music
  window.vinyle.onNowPlaying((data) => {
    if (demoTicker) toggleDemoTicker();

    state.connected = !!data.connected;
    if (data.title !== undefined && data.title !== null) {
      if (data.title !== lastTrackTitle) {
        if (lastTrackTitle !== null) {
          triggerVinylSwapAnimation();
        }
        lastTrackTitle = data.title;
        state.position = 0;
      }
      state.title = data.title;
      state.artist = data.artist;
      state.album = data.album;
      state.duration = data.duration || 210;
      if (data.position !== undefined && data.position !== null) {
        state.position = data.position;
      }
      state.isPlaying = !!data.isPlaying;
      state.artwork = data.artwork;
    }
    renderTrack();
    renderProgress();
    renderPlayState();
    renderConnection();
    setTonearmVisual(state.isPlaying);
  });

  // ------------------------------------------------------- Mode démo
  function toggleDemoTicker() {
    if (demoTicker) {
      clearInterval(demoTicker);
      demoTicker = null;
      return;
    }
    state.title = 'Nocturne (démo)';
    state.artist = 'Aperçu local';
    state.album = 'Mode démonstration';
    state.duration = 210;
    state.artwork = DEMO_ARTWORK_SVG;
    renderTrack();
    demoTicker = setInterval(() => {
      if (!state.isPlaying) return;
      state.position = (state.position + 1) % state.duration;
      renderProgress();
    }, 1000);
  }

  // état initial
  loadThemeSettings();
  renderConnection();
  renderTrack();
})();
