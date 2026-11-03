
/* =====================================================
   SUPERX LEGEND RACING
   FILE: js/home-audio.js
   PREMIUM AUDIO & UI EFFECTS
   START
===================================================== */

(function () {
  "use strict";

  const SX = window.SUPERX;

  if (!SX) {
    console.error("SUPERX system unavailable.");
    return;
  }

  let audioContext = null;

  function getAudioContext() {
    if (audioContext) return audioContext;

    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return null;

    audioContext = new AudioContextClass();

    return audioContext;
  }

  // PREMIUM BUTTON SOUND
  function playClickSound() {
    if (!SX.settings || !SX.settings.soundEffects) return;

    try {
      const context = getAudioContext();

      if (!context) return;

      if (context.state === "suspended") {
        context.resume();
      }

      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(
        620,
        context.currentTime
      );

      oscillator.frequency.exponentialRampToValueAtTime(
        360,
        context.currentTime + 0.07
      );

      gain.gain.setValueAtTime(
        0.045,
        context.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        0.001,
        context.currentTime + 0.09
      );

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start();
      oscillator.stop(context.currentTime + 0.1);

    } catch (error) {
      console.warn("UI sound unavailable:", error);
    }
  }

  // UPDATE AUDIO LABELS
  function updateAudioLabels() {
    const music = Boolean(SX.settings.music);
    const sound = Boolean(SX.settings.soundEffects);

    const musicStatus =
      document.getElementById("musicStatus");

    const soundStatus =
      document.getElementById("soundStatus");

    const musicButton =
      document.getElementById("musicToggleBtn");

    const soundButton =
      document.getElementById("soundToggleBtn");

    if (musicStatus) {
      musicStatus.textContent = music ? "ON" : "OFF";
    }

    if (soundStatus) {
      soundStatus.textContent = sound ? "ON" : "OFF";
    }

    if (musicButton) {
      musicButton.setAttribute(
        "aria-pressed",
        String(music)
      );

      musicButton.classList.toggle(
        "audio-disabled",
        !music
      );
    }

    if (soundButton) {
      soundButton.setAttribute(
        "aria-pressed",
        String(sound)
      );

      soundButton.classList.toggle(
        "audio-disabled",
        !sound
      );
    }
  }

  // TOGGLE MUSIC SETTING
  function toggleMusic() {
    SX.settings.music = !SX.settings.music;

    SX.saveSettings();
    updateAudioLabels();

    if (SX.ui && SX.ui.toast) {
      SX.ui.toast(
        SX.settings.music
          ? "Music enabled"
          : "Music disabled",
        "success"
      );
    }

    playClickSound();
  }

  // TOGGLE SOUND EFFECTS
  function toggleSound() {
    const nextValue = !SX.settings.soundEffects;

    SX.settings.soundEffects = nextValue;

    SX.saveSettings();
    updateAudioLabels();

    if (SX.ui && SX.ui.toast) {
      SX.ui.toast(
        nextValue
          ? "Sound effects enabled"
          : "Sound effects disabled",
        "success"
      );
    }

    if (nextValue) {
      playClickSound();
    }
  }

  // BUTTON PRESS FEEDBACK
  function initializeButtonEffects() {
    const interactiveElements = document.querySelectorAll(
      "button, .home-mode-card, .test-drive-button, .header-icon"
    );

    interactiveElements.forEach(function (element) {
      element.addEventListener("click", function () {
        playClickSound();
      });
    });
  }

  // INITIALIZE
  function initialize() {
    const musicButton =
      document.getElementById("musicToggleBtn");

    const soundButton =
      document.getElementById("soundToggleBtn");

    if (musicButton) {
      musicButton.addEventListener("click", toggleMusic);
    }

    if (soundButton) {
      soundButton.addEventListener("click", toggleSound);
    }

    updateAudioLabels();
    initializeButtonEffects();

    console.log("SUPERX PREMIUM AUDIO SYSTEM READY");
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }

})();

/* =====================================================
   FILE: js/home-audio.js
   END
===================================================== */
