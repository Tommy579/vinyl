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

  // -------------------------------------------------- Éléments des vues alternatives
  const displayModeSelect = document.getElementById('display-mode-select');
  const viewVinyl = document.getElementById('view-vinyl');
  const viewCassette = document.getElementById('view-cassette');
  const viewIpod = document.getElementById('view-ipod');

  // Cassette
  const cassetteHandwritingTitle = document.getElementById('cassette-handwriting-title');
  const cassetteHandwritingArtist = document.getElementById('cassette-handwriting-artist');
  const tapeLeft = document.getElementById('tape-left');
  const tapeRight = document.getElementById('tape-right');
  const meterBar = document.getElementById('meter-bar');
  const ckeyPlay = document.getElementById('ckey-play');
  const ckeyStop = document.getElementById('ckey-stop');
  const ckeyRew = document.getElementById('ckey-rew');
  const ckeyFf = document.getElementById('ckey-ff');

  // iPod
  const ipodSongTitle = document.getElementById('ipod-song-title');
  const ipodArtistName = document.getElementById('ipod-artist-name');
  const ipodAlbumName = document.getElementById('ipod-album-name');
  const ipodArtworkBox = document.querySelector('.ipod-artwork-box');
  const ipodArtworkImg = document.getElementById('ipod-artwork-img');
  const ipodTimeCur = document.getElementById('ipod-time-cur');
  const ipodTimeRem = document.getElementById('ipod-time-rem');
  const ipodProgressFill = document.getElementById('ipod-progress-fill');
  const ipodPlayIcon = document.getElementById('ipod-play-icon');
  const ipodClock = document.getElementById('ipod-clock');

  // Boutons Wheel iPod
  document.getElementById('wheel-playpause').addEventListener('click', () => requestPlayPause());
  document.getElementById('wheel-center').addEventListener('click', () => requestPlayPause());
  document.getElementById('wheel-prev').addEventListener('click', () => window.vinyle.previous());
  document.getElementById('wheel-next').addEventListener('click', () => window.vinyle.next());

  // Boutons Cassette
  if (ckeyPlay) ckeyPlay.addEventListener('click', () => requestPlayPause());
  if (ckeyStop) ckeyStop.addEventListener('click', () => { if (state.isPlaying) requestPlayPause(); });
  if (ckeyRew) ckeyRew.addEventListener('click', () => window.vinyle.previous());
  if (ckeyFf) ckeyFf.addEventListener('click', () => window.vinyle.next());

  // Horloge iPod
  function updateIpodClock() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    if (ipodClock) ipodClock.textContent = `${hh}:${mm}`;
  }
  setInterval(updateIpodClock, 1000);
  updateIpodClock();

  const vinylOnlyOptions = document.getElementById('vinyl-only-options');
  const ipodOnlyOptions = document.getElementById('ipod-only-options');
  const ipodColorSelect = document.getElementById('ipod-color-select');
  const ipodCustomColor = document.getElementById('ipod-custom-color');
  const ipodScreenBgSelect = document.getElementById('ipod-screen-bg-select');
  const ipodScreenCustomColor = document.getElementById('ipod-screen-custom-color');

  // -------------------------------------------------- Mode d'affichage (Vinyle / Cassette / iPod)
  function applyDisplayMode(mode) {
    if (viewVinyl) viewVinyl.hidden = (mode !== 'vinyl');
    if (viewCassette) viewCassette.hidden = (mode !== 'cassette');
    if (viewIpod) viewIpod.hidden = (mode !== 'ipod');
    if (vinylOnlyOptions) vinylOnlyOptions.hidden = (mode !== 'vinyl');
    if (ipodOnlyOptions) ipodOnlyOptions.hidden = (mode !== 'ipod');
    if (displayModeSelect) displayModeSelect.value = mode;
    applyAccentColor();
  }

  if (displayModeSelect) {
    displayModeSelect.addEventListener('change', () => {
      applyDisplayMode(displayModeSelect.value);
      saveThemeSettings();
    });
  }

  // -------------------------------------------------- Couleurs iPod & Écran iPod
  const IPOD_COLOR_PRESETS = {
    slate: { c1: '#484c52', c2: '#22252a' },
    silver: { c1: '#e1e4e8', c2: '#a1a8b0' },
    black: { c1: '#262626', c2: '#0d0d0d' },
    blue: { c1: '#2980b9', c2: '#1a5276' },
    green: { c1: '#27ae60', c2: '#1e8449' },
    purple: { c1: '#8e44ad', c2: '#5e3370' },
    red: { c1: '#c0392b', c2: '#7b241c' },
  };

  function applyIpodColors() {
    if (!ipodColorSelect) return;
    const mode = ipodColorSelect.value;
    if (ipodCustomColor) ipodCustomColor.hidden = (mode !== 'custom');

    let c1, c2;
    if (mode === 'custom') {
      c1 = ipodCustomColor.value;
      c2 = adjustColorBrightness(c1, -35);
    } else {
      const preset = IPOD_COLOR_PRESETS[mode] || IPOD_COLOR_PRESETS.slate;
      c1 = preset.c1;
      c2 = preset.c2;
    }

    document.documentElement.style.setProperty('--ipod-body-1', c1);
    document.documentElement.style.setProperty('--ipod-body-2', c2);

    if (displayModeSelect && displayModeSelect.value === 'ipod') {
      applyAccentColor();
    }

    // Écran
    applyIpodScreenBg();
  }

  const ipodScreen = document.querySelector('.ipod-screen');

  function applyIpodScreenBg() {
    if (!ipodScreenBgSelect) return;
    const mode = ipodScreenBgSelect.value;
    if (ipodScreenCustomColor) ipodScreenCustomColor.hidden = (mode !== 'custom');

    let bg = '#000000';
    if (mode === 'darkgray') bg = '#1e2022';
    else if (mode === 'navy') bg = '#0b1626';
    else if (mode === 'auto') bg = dominantArtworkColor || '#000000';
    else if (mode === 'custom') bg = ipodScreenCustomColor.value;

    document.documentElement.style.setProperty('--ipod-screen-bg', bg);
    if (ipodScreen) {
      ipodScreen.classList.toggle('is-light-screen', isLightColor(bg));
    }
  }

  if (ipodColorSelect) ipodColorSelect.addEventListener('change', () => { applyIpodColors(); saveThemeSettings(); });
  if (ipodCustomColor) ipodCustomColor.addEventListener('input', () => { applyIpodColors(); saveThemeSettings(); });
  if (ipodScreenBgSelect) ipodScreenBgSelect.addEventListener('change', () => { applyIpodScreenBg(); saveThemeSettings(); });
  if (ipodScreenCustomColor) ipodScreenCustomColor.addEventListener('input', () => { applyIpodScreenBg(); saveThemeSettings(); });

  // -------------------------------------------------- Persistence des Thèmes
  function saveThemeSettings() {
    const settings = {
      displayMode: displayModeSelect ? displayModeSelect.value : 'vinyl',
      appTheme: appThemeSelect ? appThemeSelect.value : 'dark',
      tableWood: tableWoodSelect ? tableWoodSelect.value : 'noyer',
      tableCustomColor: tableCustomColor ? tableCustomColor.value : '#4a2c1a',
      vinylColor: vinylColorSelect ? vinylColorSelect.value : 'black',
      vinylCustomColor: vinylCustomColor ? vinylCustomColor.value : '#0b0b0d',
      textureStyle: textureSelect ? textureSelect.value : 'artwork',
      ipodColor: ipodColorSelect ? ipodColorSelect.value : 'slate',
      ipodCustomColor: ipodCustomColor ? ipodCustomColor.value : '#363a40',
      ipodScreenBg: ipodScreenBgSelect ? ipodScreenBgSelect.value : 'black',
      ipodScreenCustomColor: ipodScreenCustomColor ? ipodScreenCustomColor.value : '#000000',
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

    const displayMode = settings.displayMode || 'vinyl';
    const appTheme = settings.appTheme || legacyAppTheme || 'dark';
    const tableWood = settings.tableWood || 'noyer';
    const tableCustomColorVal = settings.tableCustomColor || '#4a2c1a';
    const vinylColor = settings.vinylColor || 'black';
    const vinylCustomColorVal = settings.vinylCustomColor || '#0b0b0d';
    const textureStyle = settings.textureStyle || 'artwork';
    const ipodColor = settings.ipodColor || 'slate';
    const ipodCustomColorVal = settings.ipodCustomColor || '#363a40';
    const ipodScreenBg = settings.ipodScreenBg || 'black';
    const ipodScreenCustomColorVal = settings.ipodScreenCustomColor || '#000000';

    if (displayModeSelect) displayModeSelect.value = displayMode;
    if (appThemeSelect) appThemeSelect.value = appTheme;
    if (tableWoodSelect) tableWoodSelect.value = tableWood;
    if (tableCustomColor) tableCustomColor.value = tableCustomColorVal;
    if (vinylColorSelect) vinylColorSelect.value = vinylColor;
    if (vinylCustomColor) vinylCustomColor.value = vinylCustomColorVal;
    if (textureSelect) textureSelect.value = textureStyle;
    if (ipodColorSelect) ipodColorSelect.value = ipodColor;
    if (ipodCustomColor) ipodCustomColor.value = ipodCustomColorVal;
    if (ipodScreenBgSelect) ipodScreenBgSelect.value = ipodScreenBg;
    if (ipodScreenCustomColor) ipodScreenCustomColor.value = ipodScreenCustomColorVal;

    applyAppTheme(appTheme);
    applyTableFinish();
    applyVinylColor();
    applyIpodColors();
    applyDisplayMode(displayMode);
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

  function getTableWoodColor() {
    if (!tableWoodSelect) return '#4a2c1a';
    const mode = tableWoodSelect.value;
    if (mode === 'custom' && tableCustomColor) {
      return tableCustomColor.value;
    }
    const preset = WOOD_PRESETS[mode] || WOOD_PRESETS.noyer;
    return preset.c1;
  }

  function applyTableFinish() {
    const mode = tableWoodSelect.value;
    if (tableCustomColor) tableCustomColor.hidden = (mode !== 'custom');

    let c1 = getTableWoodColor();
    let c2;
    if (mode === 'custom') {
      c2 = adjustColorBrightness(c1, -30);
    } else {
      const preset = WOOD_PRESETS[mode] || WOOD_PRESETS.noyer;
      c2 = preset.c2;
    }

    document.documentElement.style.setProperty('--plinth-wood-1', c1);
    document.documentElement.style.setProperty('--plinth-wood-2', c2);

    if (displayModeSelect && displayModeSelect.value === 'vinyl') {
      applyAccentColor();
    }
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

  // ------------------------------------------------------- Couleur d'Accentuation Dynamique
  const CASSETTE_REC_RED = '#e63946';

  function getIpodColor() {
    if (!ipodColorSelect) return '#484c52';
    const mode = ipodColorSelect.value;
    if (mode === 'custom' && ipodCustomColor) {
      return ipodCustomColor.value;
    }
    const preset = IPOD_COLOR_PRESETS[mode] || IPOD_COLOR_PRESETS.slate;
    return preset.c1;
  }

  function getAccentColor() {
    const mode = displayModeSelect ? displayModeSelect.value : 'vinyl';
    if (mode === 'cassette') {
      return CASSETTE_REC_RED;
    } else if (mode === 'ipod') {
      return getIpodColor();
    } else {
      return getTableWoodColor();
    }
  }

  const btnPlayPauseEl = document.getElementById('btn-playpause');

  function applyAccentColor() {
    const val = getAccentColor();
    document.documentElement.style.setProperty('--accent', val);
    if (btnPlayPauseEl) {
      btnPlayPauseEl.classList.toggle('is-dark-accent', !isLightColor(val));
    }
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
      color = dominantArtworkColor || getAccentColor();
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
        if (ipodScreenBgSelect && ipodScreenBgSelect.value === 'auto') {
          applyIpodScreenBg();
        }
      }
    } catch (e) {
      dominantArtworkColor = null;
    }
  }

  artworkImg.addEventListener('load', () => {
    extractDominantColor(artworkImg);
  });

  const vinylColorField = document.getElementById('vinyl-color-field');

  function refreshLabelArtworkVisibility() {
    const val = textureSelect.value;
    const hasArtwork = !!state.artwork;
    const isPictureDisc = val === 'full-picture';

    if (vinylColorField) {
      vinylColorField.hidden = isPictureDisc;
    }

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

  // -------------------------------------------------- Animation Changement Vinyle & Cassette
  const cassetteWindow = document.getElementById('cassette-window');

  function triggerVinylSwapAnimation() {
    vinyl.classList.remove('swapping');
    if (cassetteWindow) cassetteWindow.classList.remove('swapping');
    void vinyl.offsetWidth; // Force le reflow GPU pour relancer l'animation CSS à 60fps
    vinyl.classList.add('swapping');
    if (cassetteWindow) cassetteWindow.classList.add('swapping');
  }

  vinyl.addEventListener('animationend', (e) => {
    if (e.animationName === 'vinylSwap') {
      vinyl.classList.remove('swapping');
    }
  });

  if (cassetteWindow) {
    cassetteWindow.addEventListener('animationend', (e) => {
      if (e.animationName === 'cassetteDoorAnimation' || e.animationName === 'cassetteSwapAnimation') {
        cassetteWindow.classList.remove('swapping');
      }
    });
  }

  // -------------------------------------------------- Bras interactif
  const REST_ANGLE = 0;           // bras au repos (vertical = 0°)
  const DROP_START_ANGLE = 19;    // bord extérieur du vinyle (début de piste)
  const DROP_END_ANGLE = 33;      // fin de piste près du macaron central
  const DROP_THRESHOLD = 10;

  let dragging = false;

  function angleFromEvent(evt) {
    const rect = tonearm.parentElement.getBoundingClientRect();
    const pivotX = rect.left + 12;
    const pivotY = rect.top + 12;
    const dx = evt.clientX - pivotX;
    const dy = evt.clientY - pivotY;
    let deg = (Math.atan2(dx, dy) * 180) / Math.PI;
    deg = Math.abs(deg);
    return Math.max(REST_ANGLE, Math.min(DROP_END_ANGLE + 4, deg));
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

  function getActivePlaybackAngle() {
    const ratio = state.duration ? Math.max(0, Math.min(1, state.position / state.duration)) : 0;
    return DROP_START_ANGLE + ratio * (DROP_END_ANGLE - DROP_START_ANGLE);
  }

  function setTonearmVisual(dropped) {
    if (dragging) return;
    tonearm.classList.toggle('dropped', dropped);
    const angle = dropped ? getActivePlaybackAngle() : REST_ANGLE;
    tonearm.style.transform = `rotate(${angle}deg)`;
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

  function updateSliderFill(sliderEl) {
    if (!sliderEl) return;
    const val = sliderEl.value;
    const max = sliderEl.max || 100;
    const pct = (val / max) * 100;
    sliderEl.style.setProperty('--slider-pct', `${pct}%`);
  }

  const iconPlayPause = document.getElementById('icon-playpause');

  // ---------------------------------------------------------- Rendu
  function renderPlayState() {
    vinyl.classList.toggle('playing', state.isPlaying);
    if (viewCassette) viewCassette.classList.toggle('playing', state.isPlaying);
    if (iconPlayPause) {
      iconPlayPause.src = state.isPlaying ? 'assets/pause.png' : 'assets/play.png';
      iconPlayPause.alt = state.isPlaying ? 'Pause' : 'Lecture';
    }
    if (ipodPlayIcon) ipodPlayIcon.textContent = state.isPlaying ? '▶' : '❚❚';
    if (meterBar) meterBar.style.width = state.isPlaying ? '75%' : '5%';
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

    // Mises à jour Cassette & iPod
    if (cassetteHandwritingTitle) cassetteHandwritingTitle.textContent = state.title || 'MIX TAPE VOL. 1';
    if (cassetteHandwritingArtist) {
      let artistName = state.artist || 'Love ♡ Mix';
      if (artistName && artistName !== 'Love ♡ Mix') {
        const parts = artistName.split(/\s*[\u2014\u2013]|\s+-\s+/);
        if (parts.length > 1) {
          artistName = parts[0].trim();
        }
      }
      cassetteHandwritingArtist.textContent = artistName;
    }

    if (ipodSongTitle) ipodSongTitle.textContent = state.title || 'Aucun morceau';
    if (ipodArtistName) ipodArtistName.textContent = state.artist || 'Apple Music';
    if (ipodAlbumName) ipodAlbumName.textContent = state.album || '';

    if (state.artwork) {
      const srcUrl = state.artwork.startsWith('data:')
        ? state.artwork
        : `data:image/jpeg;base64,${state.artwork}`;
      artworkImg.src = srcUrl;
      if (ipodArtworkImg) {
        ipodArtworkImg.src = srcUrl;
        if (ipodArtworkBox) ipodArtworkBox.classList.add('has-artwork');
      }
    } else {
      artworkImg.removeAttribute('src');
      if (ipodArtworkImg) {
        ipodArtworkImg.removeAttribute('src');
        if (ipodArtworkBox) ipodArtworkBox.classList.remove('has-artwork');
      }
      dominantArtworkColor = null;
      applyVinylColor();
    }
    refreshLabelArtworkVisibility();
  }

  function renderProgress() {
    timeCurrent.textContent = formatTime(state.position);
    timeTotal.textContent = formatTime(state.duration);
    seek.value = state.duration ? (state.position / state.duration) * 100 : 0;
    updateSliderFill(seek);

    // iPod progress
    const pct = state.duration ? (state.position / state.duration) * 100 : 0;
    if (ipodProgressFill) ipodProgressFill.style.width = `${pct}%`;
    if (ipodTimeCur) ipodTimeCur.textContent = formatTime(state.position);
    const remSec = (state.duration || 0) - (state.position || 0);
    if (ipodTimeRem) ipodTimeRem.textContent = `-${formatTime(remSec)}`;

    // Tape rolls progress (les bobines de cassette se vident/remplissent)
    const ratio = state.duration ? (state.position / state.duration) : 0;
    const leftSize = 85 - (ratio * 33);
    const rightSize = 52 + (ratio * 33);
    if (tapeLeft) {
      tapeLeft.style.width = `${leftSize}px`;
      tapeLeft.style.height = `${leftSize}px`;
    }
    if (tapeRight) {
      tapeRight.style.width = `${rightSize}px`;
      tapeRight.style.height = `${rightSize}px`;
    }

    // Mise à jour de la position du bras de vinyle en continu pendant la lecture
    setTonearmVisual(state.isPlaying);
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

  // -------------------------------------------------- Gestion des Onglets
  const tabPlayer = document.getElementById('tab-player');
  const tabSettings = document.getElementById('tab-settings');
  const contentPlayer = document.getElementById('content-player');
  const contentSettings = document.getElementById('content-settings');

  if (tabPlayer && tabSettings && contentPlayer && contentSettings) {
    tabPlayer.addEventListener('click', () => {
      tabPlayer.classList.add('active');
      tabSettings.classList.remove('active');
      contentPlayer.hidden = false;
      contentSettings.hidden = true;
    });

    tabSettings.addEventListener('click', () => {
      tabSettings.classList.add('active');
      tabPlayer.classList.remove('active');
      contentPlayer.hidden = true;
      contentSettings.hidden = false;
    });
  }

  // ------------------------------------------------- Gestion des Paramètres
  const settingAutoLaunch = document.getElementById('setting-auto-launch');
  const settingWindowsStartup = document.getElementById('setting-windows-startup');
  const settingMinimizeOnClose = document.getElementById('setting-minimize-on-close');

  if (settingAutoLaunch) {
    window.vinyle.getAutoLaunchOnRequest().then((enabled) => {
      settingAutoLaunch.checked = !!enabled;
    }).catch((err) => console.error(err));

    settingAutoLaunch.addEventListener('change', () => {
      window.vinyle.setAutoLaunchOnRequest(settingAutoLaunch.checked);
    });

    window.vinyle.onSyncAutoLaunchToggle((enabled) => {
      settingAutoLaunch.checked = !!enabled;
    });
  }

  if (settingWindowsStartup) {
    window.vinyle.getAutoLaunch().then((enabled) => {
      settingWindowsStartup.checked = !!enabled;
    }).catch((err) => console.error(err));

    settingWindowsStartup.addEventListener('change', () => {
      window.vinyle.setAutoLaunch(settingWindowsStartup.checked);
    });
  }

  if (settingMinimizeOnClose) {
    window.vinyle.getMinimizeOnClose().then((enabled) => {
      settingMinimizeOnClose.checked = !!enabled;
    }).catch((err) => console.error(err));

    settingMinimizeOnClose.addEventListener('change', () => {
      window.vinyle.setMinimizeOnClose(settingMinimizeOnClose.checked);
    });
  }

  // état initial
  loadThemeSettings();
  renderConnection();
  renderTrack();
})();
