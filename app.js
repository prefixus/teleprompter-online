/**
 * TELEPROMPTER ONLINE - LOGIKA APLIKACJI
 * Lekki, kompaktowy silnik przewijania, obsługa lustra, Wake Lock, QR i LocalStorage.
 */

(function () {
  'use strict';

  // =========================================================================
  // STAŁE I DOMYŚLNE DANE
  // =========================================================================

  const STORAGE_KEY = 'teleprompter_scripts_v2';
  const ACTIVE_ID_KEY = 'teleprompter_active_id_v2';
  const SETTINGS_KEY = 'teleprompter_settings_v2';

  const DEFAULT_SETTINGS = {
    speed: 45,            // px/s
    fontSize: 56,         // px
    mirror: 'none',       // 'none' | 'h' | 'v' | 'both'
    align: 'center',      // 'center' | 'left' | 'right'
    margin: 85,           // %
    color: '#ffffff',     // kolor tekstu
    eyeline: true,        // wskaźnik wzroku
    countdown: true,      // 3s odliczanie
    wakelock: true        // blokada wygaszania
  };

  const SAMPLE_SCRIPT = {
    id: 'script-sample-1',
    title: 'Wystąpienie powitalne (Przetestuj prompter)',
    content: `Dzień dobry! Witaj w aplikacji Teleprompter Online.

To narzędzie powstało, aby ułatwić Ci nagrywanie wideo, podcastów oraz wystąpienia na żywo przy użyciu telefonu lub komputera.

KROK 1: USTAWIENIA PROMPTERA
Jeśli używasz telepromptera z półprzepuszczalnym szkłem 45 stopni, włącz "Lustro Poziome" (H-Flip) w panelu po prawej stronie lub naciśnij klawisz [M].
Tekst zostanie odwrócony w poziomie, a w lustrze zobaczysz go w idealnej, czytelnej orientacji.

KROK 2: STEROWANIE I ERGONOMIA
• Naciśnij SPACJĘ lub dotknij ekranu telefonu w dowolnym miejscu, aby zatrzymać lub wznowić przewijanie.
• Strzałki w górę i w dół na klawiaturze zmieniają prędkość przewijania na bieżąco.
• W dowolnej chwili możesz przesunąć tekst palcem do wybranego fragmentu.

KROK 3: BLOKADA EKRANU (WAKE LOCK)
Aplikacja automatycznie dba o to, aby ekran Twojego iPhone'a lub telefonu z Androidem nie wygasł w trakcie nagrania.

KROK 4: SZYBKI TRANSFER NA TELEFON
Napisz tekst na laptopie, kliknij przycisk "Telefon / QR" u góry strony i zeskanuj kod aparatem w telefonie. Twój tekst pojawi się na smartfonie w kilka sekund!

Powodzenia w nagraniach!`,
    updated_at: Date.now()
  };

  // =========================================================================
  // STAN APLIKACJI
  // =========================================================================

  let scripts = [];
  let activeScriptId = null;
  let settings = { ...DEFAULT_SETTINGS };

  // Stan silnika promptera
  let isPrompterOpen = false;
  let isPlaying = false;
  let scrollPos = 0;
  let lastTimestamp = 0;
  let rafId = null;
  let hudTimeout = null;
  let wakeLockSentinel = null;
  let countdownInProgress = false;

  // =========================================================================
  // REFERENCJE DOM
  // =========================================================================

  const el = {
    // Widoki
    editorView: document.getElementById('editor-view'),
    prompterView: document.getElementById('prompter-view'),

    // Edytor
    scriptSelect: document.getElementById('script-select'),
    scriptTitle: document.getElementById('script-title'),
    scriptContent: document.getElementById('script-content'),
    dropZone: document.getElementById('drop-zone'),
    fileUploader: document.getElementById('file-uploader'),
    saveStatus: document.getElementById('save-status'),

    // Statystyki
    statWords: document.getElementById('stat-words'),
    statChars: document.getElementById('stat-chars'),
    statReadingTime: document.getElementById('stat-reading-time'),

    // Przyciski edytora
    btnLaunchPrompter: document.getElementById('btn-launch-prompter'),
    btnNewScript: document.getElementById('btn-new-script'),
    btnDuplicateScript: document.getElementById('btn-duplicate-script'),
    btnDownloadTxt: document.getElementById('btn-download-txt'),
    btnDeleteScript: document.getElementById('btn-delete-script'),
    btnShareQr: document.getElementById('btn-share-qr'),
    btnCloudSync: document.getElementById('btn-cloud-sync'),
    btnShortcuts: document.getElementById('btn-shortcuts'),

    // Ustawienia w panelu bocznym
    speedSlider: document.getElementById('speed-slider'),
    speedVal: document.getElementById('speed-val'),
    speedMinus: document.getElementById('speed-minus'),
    speedPlus: document.getElementById('speed-plus'),
    speedPills: document.querySelectorAll('.btn-pill'),

    fontSizeSlider: document.getElementById('font-size-slider'),
    fontSizeVal: document.getElementById('font-size-val'),
    fontMinus: document.getElementById('font-minus'),
    fontPlus: document.getElementById('font-plus'),

    marginSlider: document.getElementById('margin-slider'),
    marginVal: document.getElementById('margin-val'),

    mirrorBtns: document.querySelectorAll('.mirror-toggles-grid .btn-toggle'),
    alignBtns: document.querySelectorAll('.btn-group-toggle .btn-toggle'),
    colorDots: document.querySelectorAll('.color-dot'),

    toggleEyeline: document.getElementById('toggle-eyeline'),
    toggleCountdown: document.getElementById('toggle-countdown'),
    toggleWakelock: document.getElementById('toggle-wakelock'),

    // Elementy Promptera
    eyelineGuide: document.getElementById('eyeline-guide'),
    prompterHud: document.getElementById('prompter-hud'),
    hudBtnExit: document.getElementById('hud-btn-exit'),
    hudBtnRestart: document.getElementById('hud-btn-restart'),
    hudBtnPlayPause: document.getElementById('hud-btn-playpause'),
    hudIconPlay: document.getElementById('hud-icon-play'),
    hudIconPause: document.getElementById('hud-icon-pause'),
    hudSpeedMinus: document.getElementById('hud-speed-minus'),
    hudSpeedPlus: document.getElementById('hud-speed-plus'),
    hudSpeedDisplay: document.getElementById('hud-speed-display'),
    hudFontMinus: document.getElementById('hud-font-minus'),
    hudFontPlus: document.getElementById('hud-font-plus'),
    hudBtnFlip: document.getElementById('hud-btn-flip'),
    hudBtnFullscreen: document.getElementById('hud-btn-fullscreen'),

    prompterBottomBar: document.getElementById('prompter-bottom-bar'),
    prompterWakeLockDot: document.getElementById('prompter-wakelock-dot'),
    prompterWakeLockText: document.getElementById('prompter-wakelock-text'),
    prompterProgressText: document.getElementById('prompter-progress-text'),

    prompterScrollViewport: document.getElementById('prompter-scroll-viewport'),
    prompterTextTrack: document.getElementById('prompter-text-track'),

    countdownOverlay: document.getElementById('countdown-overlay'),
    countdownNumber: document.getElementById('countdown-number'),

    // Modale
    modalQr: document.getElementById('modal-qr'),
    qrCodeCanvas: document.getElementById('qr-code-canvas'),
    shareLinkInput: document.getElementById('share-link-input'),
    btnCopyLink: document.getElementById('btn-copy-link'),
    copyFeedback: document.getElementById('copy-feedback'),

    modalCloud: document.getElementById('modal-cloud'),
    cloudUrlInput: document.getElementById('cloud-url'),
    cloudKeyInput: document.getElementById('cloud-key'),
    btnSaveCloudConfig: document.getElementById('btn-save-cloud-config'),
    btnExportAll: document.getElementById('btn-export-all'),
    importAllFile: document.getElementById('import-all-file'),

    modalShortcuts: document.getElementById('modal-shortcuts')
  };

  // =========================================================================
  // INICJALIZACJA
  // =========================================================================

  function init() {
    loadSettings();
    loadScripts();
    checkUrlHashForScript();
    setupEventListeners();
    updateStats();
    applySettingsToUI();
  }

  // =========================================================================
  // ZARZĄDZANIE DANYMI I LOCALSTORAGE
  // =========================================================================

  function loadSettings() {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        settings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Błąd odczytu ustawień z localStorage:', e);
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Błąd zapisu ustawień:', e);
    }
  }

  function loadScripts() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        scripts = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Błąd odczytu skryptów z localStorage:', e);
    }

    if (!Array.isArray(scripts) || scripts.length === 0) {
      scripts = [{ ...SAMPLE_SCRIPT }];
    }

    // Odczytaj aktywny skrypt
    const storedActiveId = localStorage.getItem(ACTIVE_ID_KEY);
    const found = scripts.find(s => s.id === storedActiveId);
    activeScriptId = found ? found.id : scripts[0].id;

    renderScriptSelect();
    loadActiveScriptToEditor();
  }

  function saveScripts() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scripts));
      if (activeScriptId) {
        localStorage.setItem(ACTIVE_ID_KEY, activeScriptId);
      }
      showSaveIndicator();
    } catch (e) {
      console.warn('Błąd zapisu skryptów:', e);
    }
  }

  function showSaveIndicator() {
    if (!el.saveStatus) return;
    el.saveStatus.textContent = 'Zapisano';
    el.saveStatus.style.color = 'var(--accent-emerald)';
    clearTimeout(el.saveStatus._timer);
    el.saveStatus._timer = setTimeout(() => {
      el.saveStatus.textContent = 'Zapisano lokalnie';
      el.saveStatus.style.color = '';
    }, 1800);
  }

  function renderScriptSelect() {
    el.scriptSelect.innerHTML = '';
    scripts.forEach(script => {
      const opt = document.createElement('option');
      opt.value = script.id;
      opt.textContent = script.title || 'Bez tytułu';
      if (script.id === activeScriptId) {
        opt.selected = true;
      }
      el.scriptSelect.appendChild(opt);
    });
    el.scriptSelect.value = activeScriptId;
  }

  function updateSelectOptionTitle(scriptId, newTitle) {
    const opt = el.scriptSelect.querySelector(`option[value="${scriptId}"]`);
    if (opt) {
      opt.textContent = newTitle || 'Bez tytułu';
    }
  }

  function getActiveScript() {
    return scripts.find(s => s.id === activeScriptId) || scripts[0];
  }

  function loadActiveScriptToEditor() {
    const script = getActiveScript();
    if (!script) return;
    el.scriptTitle.value = script.title || '';
    el.scriptContent.value = script.content || '';
    el.scriptSelect.value = activeScriptId;
    updateStats();
  }

  function saveCurrentEditorContent(updateSelectTitle = false) {
    const script = getActiveScript();
    if (!script) return;
    script.title = el.scriptTitle.value.trim() || 'Bez tytułu';
    script.content = el.scriptContent.value;
    script.updated_at = Date.now();
    saveScripts();
    if (updateSelectTitle) {
      updateSelectOptionTitle(script.id, script.title);
    }
    updateStats();
  }

  function createNewScript(title = 'Nowy Skrypt', content = '') {
    // Zapisz aktualny stan przed utworzeniem nowego
    const current = getActiveScript();
    if (current) {
      current.title = el.scriptTitle.value.trim() || 'Bez tytułu';
      current.content = el.scriptContent.value;
      current.updated_at = Date.now();
    }

    const newScript = {
      id: 'script-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      title: title,
      content: content,
      updated_at: Date.now()
    };
    scripts.unshift(newScript);
    activeScriptId = newScript.id;
    saveScripts();
    renderScriptSelect();
    loadActiveScriptToEditor();
  }

  function duplicateCurrentScript() {
    const current = getActiveScript();
    if (!current) return;
    current.title = el.scriptTitle.value.trim() || 'Bez tytułu';
    current.content = el.scriptContent.value;
    current.updated_at = Date.now();

    createNewScript((current.title || 'Skrypt') + ' (Kopia)', current.content);
  }

  function deleteCurrentScript() {
    if (scripts.length <= 1) {
      alert('Nie możesz usunąć jedynego skryptu. Wyczyść jego treść lub dodaj nowy.');
      return;
    }
    const current = getActiveScript();
    if (confirm(`Czy na pewno chcesz usunąć skrypt "${current.title}"?`)) {
      scripts = scripts.filter(s => s.id !== activeScriptId);
      activeScriptId = scripts[0].id;
      saveScripts();
      renderScriptSelect();
      loadActiveScriptToEditor();
    }
  }

  // =========================================================================
  // STATYSTYKI TEKSTU I CZAS CZYTANIA
  // =========================================================================

  function updateStats() {
    const text = el.scriptContent.value || '';
    const chars = text.length;
    // Dopasowanie słów
    const wordsMatch = text.trim().match(/\S+/g);
    const words = wordsMatch ? wordsMatch.length : 0;

    el.statWords.textContent = words.toLocaleString('pl-PL');
    el.statChars.textContent = chars.toLocaleString('pl-PL');

    // Przyjmujemy średnie tempo mowy prezentera = ~130 słów na minutę
    const totalSeconds = Math.round((words / 130) * 60);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    el.statReadingTime.textContent = `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  }

  // =========================================================================
  // WGRYWANIE PLIKÓW (.txt, .md) I DRAG & DROP
  // =========================================================================

  function handleFileSelected(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const content = e.target.result;
      const fileNameClean = file.name.replace(/\.(txt|md|markdown)$/i, '');

      // Jeśli bieżący edytor jest pusty, wstaw tutaj. W przeciwnym razie utwórz nowy skrypt
      const current = getActiveScript();
      if (!current.content || current.content.trim() === '') {
        current.title = fileNameClean;
        current.content = content;
        saveScripts();
        renderScriptSelect();
        loadActiveScriptToEditor();
      } else {
        createNewScript(fileNameClean, content);
      }
    };
    reader.onerror = function () {
      alert('Nie udało się odczytać pliku. Upewnij się, że to zwykły plik tekstowy.');
    };
    reader.readAsText(file, 'UTF-8');
  }

  // =========================================================================
  // SYNCHRONIZACJA HASH URL (TRANSFER NA TELEFON BEZ LOGOWANIA)
  // =========================================================================

  function checkUrlHashForScript() {
    try {
      const hash = window.location.hash;
      if (!hash) return;

      const params = new URLSearchParams(hash.substring(1));
      const sharedData = params.get('s');

      if (sharedData) {
        // Dekodowanie danych ze skróconego linku
        const jsonStr = decodeURIComponent(escape(atob(sharedData)));
        const data = JSON.parse(jsonStr);

        if (data && data.t && data.c !== undefined) {
          createNewScript(data.t, data.c);
          // Opcjonalnie nadpisz ustawienia, jeśli dołączono
          if (data.opt) {
            settings = { ...settings, ...data.opt };
            saveSettings();
            applySettingsToUI();
          }
          // Wyczyść hash z paska adresu
          history.replaceState(null, '', window.location.pathname);
        }
      }
    } catch (e) {
      console.warn('Nie udało się zaimportować skryptu z linku URL:', e);
    }
  }

  function generateShareUrl() {
    const current = getActiveScript();
    const payload = {
      t: current.title,
      c: current.content,
      opt: {
        speed: settings.speed,
        fontSize: settings.fontSize,
        mirror: settings.mirror,
        align: settings.align,
        margin: settings.margin,
        color: settings.color
      }
    };

    try {
      const jsonStr = JSON.stringify(payload);
      const b64 = btoa(unescape(encodeURIComponent(jsonStr)));
      const baseUrl = window.location.origin + window.location.pathname;
      return `${baseUrl}#s=${b64}`;
    } catch (e) {
      console.warn('Błąd kodowania linku:', e);
      return window.location.href;
    }
  }

  // =========================================================================
  // OBSŁUGA USTAWIEŃ W INTERFEJSIE
  // =========================================================================

  function applySettingsToUI() {
    // 1. Odbicie lustrzane
    el.mirrorBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mirror === settings.mirror);
    });

    // 2. Prędkość
    el.speedSlider.value = settings.speed;
    el.speedVal.textContent = `${settings.speed} px/s`;
    el.hudSpeedDisplay.textContent = settings.speed;
    el.speedPills.forEach(pill => {
      pill.classList.toggle('active', Number(pill.dataset.speed) === settings.speed);
    });

    // 3. Rozmiar czcionki
    el.fontSizeSlider.value = settings.fontSize;
    el.fontSizeVal.textContent = `${settings.fontSize} px`;

    // 4. Wyrównanie
    el.alignBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.align === settings.align);
    });

    // 5. Margines czytania
    el.marginSlider.value = settings.margin;
    el.marginVal.textContent = `${settings.margin}%`;

    // 6. Kolor
    el.colorDots.forEach(dot => {
      dot.classList.toggle('active', dot.dataset.color === settings.color);
    });

    // 7. Checkboxy
    el.toggleEyeline.checked = settings.eyeline;
    el.toggleCountdown.checked = settings.countdown;
    el.toggleWakelock.checked = settings.wakelock;

    // Zastosuj do renderu promptera
    updatePrompterStyles();
  }

  function updatePrompterStyles() {
    // Odbicie lustrzane
    el.prompterTextTrack.className = 'prompter-text-track mirror-' + settings.mirror;

    // Styl tekstu
    el.prompterTextTrack.style.fontSize = settings.fontSize + 'px';
    el.prompterTextTrack.style.textAlign = settings.align;
    el.prompterTextTrack.style.maxWidth = settings.margin + '%';
    el.prompterTextTrack.style.color = settings.color;

    // Linia wzroku
    el.eyelineGuide.classList.toggle('hidden', !settings.eyeline);
  }

  // =========================================================================
  // SILNIK PEŁNOEKRANOWEGO TELEPROMPTERA
  // =========================================================================

  function openPrompter() {
    const current = getActiveScript();
    const content = (current.content || '').trim();

    if (!content) {
      alert('Twój skrypt jest pusty. Wpisz tekst lub wgraj plik przed uruchomieniem promptera.');
      return;
    }

    isPrompterOpen = true;
    el.prompterTextTrack.textContent = content;
    updatePrompterStyles();

    // Pokaz widok promptera
    el.prompterView.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Reset pozycji
    scrollPos = 0;
    el.prompterScrollViewport.scrollTop = 0;
    updateProgressIndicator();

    // Reset ikonki pauzy / startu
    setPlayState(false);

    // Auto-odliczanie i start jeśli włączone
    if (settings.countdown) {
      runCountdown(() => {
        startScrolling();
      });
    } else {
      startScrolling();
    }

    resetHudAutohide();
  }

  function closePrompter() {
    stopScrolling();
    isPrompterOpen = false;
    el.prompterView.classList.add('hidden');
    document.body.style.overflow = '';
    releaseWakeLock();

    // Wyjdź z pełnego ekranu jeśli był aktywny
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  function runCountdown(callback) {
    countdownInProgress = true;
    el.countdownOverlay.classList.remove('hidden');
    let count = 3;
    el.countdownNumber.textContent = count;

    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        el.countdownNumber.textContent = count;
      } else {
        clearInterval(timer);
        el.countdownOverlay.classList.add('hidden');
        countdownInProgress = false;
        if (callback) callback();
      }
    }, 900);
  }

  function startScrolling() {
    if (countdownInProgress) return;
    isPlaying = true;
    setPlayState(true);
    requestWakeLock();

    lastTimestamp = performance.now();
    rafId = requestAnimationFrame(scrollLoop);
    resetHudAutohide();
  }

  function stopScrolling() {
    isPlaying = false;
    setPlayState(false);
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    // Przywróć widoczność HUD przy pauzie
    showHud();
  }

  function togglePlayPause() {
    if (countdownInProgress) return;
    if (isPlaying) {
      stopScrolling();
    } else {
      startScrolling();
    }
  }

  function setPlayState(playing) {
    if (playing) {
      el.hudIconPlay.classList.add('hidden');
      el.hudIconPause.classList.remove('hidden');
    } else {
      el.hudIconPlay.classList.remove('hidden');
      el.hudIconPause.classList.add('hidden');
    }
  }

  function scrollLoop(currentTimestamp) {
    if (!isPlaying) return;

    const deltaSec = (currentTimestamp - lastTimestamp) / 1000;
    lastTimestamp = currentTimestamp;

    // Zabezpieczenie przed skokami powyżej 0.1s (np. przełączenie karty)
    const clampedDelta = Math.min(deltaSec, 0.1);

    scrollPos += settings.speed * clampedDelta;
    el.prompterScrollViewport.scrollTop = scrollPos;

    updateProgressIndicator();

    // Sprawdź czy dotarliśmy do końca
    const maxScroll = el.prompterScrollViewport.scrollHeight - el.prompterScrollViewport.clientHeight;
    if (scrollPos >= maxScroll) {
      stopScrolling();
      return;
    }

    rafId = requestAnimationFrame(scrollLoop);
  }

  function restartPrompter() {
    stopScrolling();
    scrollPos = 0;
    el.prompterScrollViewport.scrollTop = 0;
    updateProgressIndicator();
    if (settings.countdown) {
      runCountdown(() => {
        startScrolling();
      });
    } else {
      startScrolling();
    }
  }

  function updateProgressIndicator() {
    const maxScroll = el.prompterScrollViewport.scrollHeight - el.prompterScrollViewport.clientHeight;
    if (maxScroll <= 0) {
      el.prompterProgressText.textContent = '100%';
      return;
    }
    const current = el.prompterScrollViewport.scrollTop;
    const pct = Math.min(100, Math.max(0, Math.round((current / maxScroll) * 100)));
    el.prompterProgressText.textContent = `${pct}%`;
  }

  // =========================================================================
  // AUTO-HIDE HUD W TRYBIE CZYTANIA
  // =========================================================================

  function resetHudAutohide() {
    showHud();
    clearTimeout(hudTimeout);
    if (isPlaying) {
      hudTimeout = setTimeout(() => {
        if (isPlaying && isPrompterOpen) {
          el.prompterHud.classList.add('hud-autohide');
        }
      }, 3200);
    }
  }

  function showHud() {
    el.prompterHud.classList.remove('hud-autohide');
  }

  // =========================================================================
  // SCREEN WAKE LOCK API (BLOKADA WYGASZANIA EKRANU NA TELEFONIE)
  // =========================================================================

  async function requestWakeLock() {
    if (!settings.wakelock || !('wakeLock' in navigator)) {
      updateWakeLockUI(false);
      return;
    }

    try {
      wakeLockSentinel = await navigator.wakeLock.request('screen');
      updateWakeLockUI(true);

      wakeLockSentinel.addEventListener('release', () => {
        updateWakeLockUI(false);
      });
    } catch (err) {
      console.warn('Wake Lock niedostępny lub zablokowany:', err);
      updateWakeLockUI(false);
    }
  }

  function releaseWakeLock() {
    if (wakeLockSentinel) {
      wakeLockSentinel.release().catch(() => {});
      wakeLockSentinel = null;
    }
    updateWakeLockUI(false);
  }

  function updateWakeLockUI(active) {
    if (el.prompterWakeLockDot) {
      el.prompterWakeLockDot.classList.toggle('dot-active', active);
      el.prompterWakeLockText.textContent = active ? 'Ekran aktywny' : 'Ekran standardowy';
    }
  }

  // Odnów Wake Lock przy powrocie do karty
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isPrompterOpen && isPlaying) {
      requestWakeLock();
    }
  });

  // =========================================================================
  // MODALE (QR CODE, CHMURA, SKRÓTY)
  // =========================================================================

  function openQrModal() {
    saveCurrentEditorContent();
    const url = generateShareUrl();
    el.shareLinkInput.value = url;
    el.copyFeedback.classList.add('hidden');

    // Wygeneruj QR Code
    el.qrCodeCanvas.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
      try {
        new QRCode(el.qrCodeCanvas, {
          text: url,
          width: 200,
          height: 200,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      } catch (err) {
        console.warn('Błąd generowania QR:', err);
      }
    }

    el.modalQr.classList.remove('hidden');
  }

  function closeAllModals() {
    el.modalQr.classList.add('hidden');
    el.modalCloud.classList.add('hidden');
    el.modalShortcuts.classList.add('hidden');
  }

  // =========================================================================
  // LISTENERY ZDARZEŃ
  // =========================================================================

  function setupEventListeners() {
    // 1. Zmiana skryptu w selektorze
    el.scriptSelect.addEventListener('change', e => {
      const selectedId = e.target.value;
      if (!selectedId || selectedId === activeScriptId) return;

      // Zapisz aktualny stan poprzedniego skryptu
      const prev = getActiveScript();
      if (prev) {
        prev.title = el.scriptTitle.value.trim() || 'Bez tytułu';
        prev.content = el.scriptContent.value;
        prev.updated_at = Date.now();
      }

      activeScriptId = selectedId;
      saveScripts();
      loadActiveScriptToEditor();
    });

    // 2. Edycja tytułu i treści
    el.scriptTitle.addEventListener('input', () => {
      saveCurrentEditorContent(true);
    });

    el.scriptContent.addEventListener('input', () => {
      updateStats();
      saveCurrentEditorContent(false);
    });

    // 3. Przyciski zarządzania skryptami
    el.btnNewScript.addEventListener('click', () => {
      createNewScript('Nowy Skrypt', '');
    });

    el.btnDuplicateScript.addEventListener('click', duplicateCurrentScript);
    el.btnDeleteScript.addEventListener('click', deleteCurrentScript);

    // 4. Pobieranie TXT
    el.btnDownloadTxt.addEventListener('click', () => {
      const current = getActiveScript();
      const blob = new Blob([current.content || ''], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (current.title || 'skrypt').replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ_-]/g, '_') + '.txt';
      a.click();
      URL.revokeObjectURL(a.href);
    });

    // 5. Wgrywanie plików przez input file
    el.fileUploader.addEventListener('change', e => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelected(e.target.files[0]);
        e.target.value = '';
      }
    });

    // 6. Drag & Drop na obszar edytora
    ['dragenter', 'dragover'].forEach(eventName => {
      el.dropZone.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
        el.dropZone.classList.add('drag-active');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      el.dropZone.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
        el.dropZone.classList.remove('drag-active');
      });
    });

    el.dropZone.addEventListener('drop', e => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files[0]) {
        handleFileSelected(dt.files[0]);
      }
    });

    // 7. Ustawienia: Lustro
    el.mirrorBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        settings.mirror = btn.dataset.mirror;
        saveSettings();
        applySettingsToUI();
      });
    });

    // 8. Ustawienia: Prędkość
    el.speedSlider.addEventListener('input', e => {
      settings.speed = Number(e.target.value);
      saveSettings();
      applySettingsToUI();
    });

    el.speedMinus.addEventListener('click', () => {
      settings.speed = Math.max(10, settings.speed - 5);
      saveSettings();
      applySettingsToUI();
    });

    el.speedPlus.addEventListener('click', () => {
      settings.speed = Math.min(180, settings.speed + 5);
      saveSettings();
      applySettingsToUI();
    });

    el.speedPills.forEach(pill => {
      pill.addEventListener('click', () => {
        settings.speed = Number(pill.dataset.speed);
        saveSettings();
        applySettingsToUI();
      });
    });

    // 9. Ustawienia: Rozmiar tekstu
    el.fontSizeSlider.addEventListener('input', e => {
      settings.fontSize = Number(e.target.value);
      saveSettings();
      applySettingsToUI();
    });

    el.fontMinus.addEventListener('click', () => {
      settings.fontSize = Math.max(24, settings.fontSize - 4);
      saveSettings();
      applySettingsToUI();
    });

    el.fontPlus.addEventListener('click', () => {
      settings.fontSize = Math.min(110, settings.fontSize + 4);
      saveSettings();
      applySettingsToUI();
    });

    // 10. Ustawienia: Wyrównanie
    el.alignBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        settings.align = btn.dataset.align;
        saveSettings();
        applySettingsToUI();
      });
    });

    // 11. Ustawienia: Margines
    el.marginSlider.addEventListener('input', e => {
      settings.margin = Number(e.target.value);
      saveSettings();
      applySettingsToUI();
    });

    // 12. Ustawienia: Kolor
    el.colorDots.forEach(dot => {
      dot.addEventListener('click', () => {
        settings.color = dot.dataset.color;
        saveSettings();
        applySettingsToUI();
      });
    });

    // 13. Checkboxy opcji
    el.toggleEyeline.addEventListener('change', e => {
      settings.eyeline = e.target.checked;
      saveSettings();
      applySettingsToUI();
    });

    el.toggleCountdown.addEventListener('change', e => {
      settings.countdown = e.target.checked;
      saveSettings();
    });

    el.toggleWakelock.addEventListener('change', e => {
      settings.wakelock = e.target.checked;
      saveSettings();
    });

    // 14. Start Promptera
    el.btnLaunchPrompter.addEventListener('click', openPrompter);

    // 15. Sterowanie w HUD
    el.hudBtnExit.addEventListener('click', e => {
      e.stopPropagation();
      closePrompter();
    });

    el.hudBtnRestart.addEventListener('click', e => {
      e.stopPropagation();
      restartPrompter();
    });

    el.hudBtnPlayPause.addEventListener('click', e => {
      e.stopPropagation();
      togglePlayPause();
    });

    el.hudSpeedMinus.addEventListener('click', e => {
      e.stopPropagation();
      settings.speed = Math.max(10, settings.speed - 5);
      saveSettings();
      applySettingsToUI();
    });

    el.hudSpeedPlus.addEventListener('click', e => {
      e.stopPropagation();
      settings.speed = Math.min(180, settings.speed + 5);
      saveSettings();
      applySettingsToUI();
    });

    el.hudFontMinus.addEventListener('click', e => {
      e.stopPropagation();
      settings.fontSize = Math.max(24, settings.fontSize - 4);
      saveSettings();
      applySettingsToUI();
    });

    el.hudFontPlus.addEventListener('click', e => {
      e.stopPropagation();
      settings.fontSize = Math.min(110, settings.fontSize + 4);
      saveSettings();
      applySettingsToUI();
    });

    el.hudBtnFlip.addEventListener('click', e => {
      e.stopPropagation();
      // Szybki toggle odbicia lustrzanego w poziomie
      settings.mirror = (settings.mirror === 'h') ? 'none' : 'h';
      saveSettings();
      applySettingsToUI();
    });

    el.hudBtnFullscreen.addEventListener('click', e => {
      e.stopPropagation();
      toggleFullscreen();
    });

    // 16. Tap / Kliknięcie w ekran promptera = Start / Pauza
    el.prompterView.addEventListener('click', e => {
      // Ignoruj kliknięcia w pasek HUD
      if (e.target.closest('#prompter-hud')) return;
      togglePlayPause();
      resetHudAutohide();
    });

    // Ruch myszą / dotyk budzi HUD
    ['mousemove', 'touchstart', 'touchmove'].forEach(evName => {
      el.prompterView.addEventListener(evName, () => {
        resetHudAutohide();
      }, { passive: true });
    });

    // Ręczne przewijanie tekstu na telefonie lub kółkiem myszy
    el.prompterScrollViewport.addEventListener('scroll', () => {
      if (!isPlaying) {
        scrollPos = el.prompterScrollViewport.scrollTop;
        updateProgressIndicator();
      }
    }, { passive: true });

    // 17. Skróty klawiszowe
    window.addEventListener('keydown', e => {
      // Jeśli użytkownik pisze w edytorze lub modalach, nie przechwytuj spacji itp.
      if (document.activeElement === el.scriptContent || 
          document.activeElement === el.scriptTitle ||
          document.activeElement.tagName === 'INPUT') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (isPrompterOpen) {
          togglePlayPause();
          resetHudAutohide();
        } else {
          openPrompter();
        }
      } else if (e.code === 'Escape') {
        if (isPrompterOpen) {
          closePrompter();
        } else {
          closeAllModals();
        }
      } else if (isPrompterOpen) {
        if (e.code === 'ArrowUp') {
          e.preventDefault();
          settings.speed = Math.min(180, settings.speed + 5);
          saveSettings();
          applySettingsToUI();
          resetHudAutohide();
        } else if (e.code === 'ArrowDown') {
          e.preventDefault();
          settings.speed = Math.max(10, settings.speed - 5);
          saveSettings();
          applySettingsToUI();
          resetHudAutohide();
        } else if (e.code === 'ArrowLeft') {
          e.preventDefault();
          settings.fontSize = Math.max(24, settings.fontSize - 4);
          saveSettings();
          applySettingsToUI();
          resetHudAutohide();
        } else if (e.code === 'ArrowRight') {
          e.preventDefault();
          settings.fontSize = Math.min(110, settings.fontSize + 4);
          saveSettings();
          applySettingsToUI();
          resetHudAutohide();
        } else if (e.code === 'KeyR') {
          restartPrompter();
        } else if (e.code === 'KeyM') {
          settings.mirror = (settings.mirror === 'h') ? 'none' : 'h';
          saveSettings();
          applySettingsToUI();
          resetHudAutohide();
        } else if (e.code === 'KeyF') {
          toggleFullscreen();
        }
      }
    });

    // 18. Modale: Otwieranie i zamykanie
    el.btnShareQr.addEventListener('click', openQrModal);
    el.btnCloudSync.addEventListener('click', () => {
      el.modalCloud.classList.remove('hidden');
    });
    el.btnShortcuts.addEventListener('click', () => {
      el.modalShortcuts.classList.remove('hidden');
    });

    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', closeAllModals);
    });

    [el.modalQr, el.modalCloud, el.modalShortcuts].forEach(modal => {
      modal.addEventListener('click', e => {
        if (e.target === modal) closeAllModals();
      });
    });

    // Kopiowanie linku
    el.btnCopyLink.addEventListener('click', () => {
      el.shareLinkInput.select();
      navigator.clipboard.writeText(el.shareLinkInput.value).then(() => {
        el.copyFeedback.classList.remove('hidden');
        setTimeout(() => el.copyFeedback.classList.add('hidden'), 2500);
      }).catch(() => {
        document.execCommand('copy');
        el.copyFeedback.classList.remove('hidden');
      });
    });

    // Eksport wszystkich skryptów do JSON
    el.btnExportAll.addEventListener('click', () => {
      const data = {
        app: 'Teleprompter Online',
        version: 2,
        exported_at: new Date().toISOString(),
        scripts: scripts,
        settings: settings
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `teleprompter_kopia_zapasowa_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });

    // Import kopii JSON
    el.importAllFile.addEventListener('change', e => {
      if (!e.target.files || !e.target.files[0]) return;
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = function (ev) {
        try {
          const parsed = JSON.parse(ev.target.result);
          if (Array.isArray(parsed.scripts) && parsed.scripts.length > 0) {
            scripts = parsed.scripts;
            activeScriptId = scripts[0].id;
            if (parsed.settings) {
              settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
            }
            saveScripts();
            saveSettings();
            renderScriptSelect();
            loadActiveScriptToEditor();
            applySettingsToUI();
            alert('Pomyślnie zaimportowano skrypty z kopii zapasowej!');
            closeAllModals();
          } else {
            alert('Plik nie zawiera prawidłowej listy skryptów.');
          }
        } catch (err) {
          alert('Błąd odczytu pliku JSON: ' + err.message);
        }
      };
      reader.readAsText(file);
    });

    // Zapisywanie konfiguracji chmury (Supabase placeholder)
    el.btnSaveCloudConfig.addEventListener('click', () => {
      const url = el.cloudUrlInput.value.trim();
      const key = el.cloudKeyInput.value.trim();
      if (url && key) {
        localStorage.setItem('teleprompter_supabase_url', url);
        localStorage.setItem('teleprompter_supabase_key', key);
        alert('Konfiguracja chmury została zapisana na tym urządzeniu!');
      } else {
        alert('Podaj adres URL i klucz Anon Supabase.');
      }
    });

    // Wczytaj zapisane dane chmury jeśli istnieją
    const savedUrl = localStorage.getItem('teleprompter_supabase_url');
    const savedKey = localStorage.getItem('teleprompter_supabase_key');
    if (savedUrl) el.cloudUrlInput.value = savedUrl;
    if (savedKey) el.cloudKeyInput.value = savedKey;
  }

  // =========================================================================
  // TRYB PEŁNOEKRANOWY (FULLSCREEN API)
  // =========================================================================

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  // Uruchomienie po załadowaniu DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
