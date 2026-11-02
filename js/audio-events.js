
/* =========================================
   SUPERX LEGEND RACING CAR
   PART 24 — AUDIO EVENTS
   FILE: js/audio-events.js
========================================= */

(() => {
  "use strict";

  function setupAudioEvents() {
    const audio = window.SuperXAudio;
    if (!audio) return;

    const hornButtons = [
      "hornBtn",
      "hornButton"
    ];

    hornButtons.forEach(id => {
      const button = document.getElementById(id);

      if (button) {
        button.addEventListener("pointerdown", () => {
          audio.playHorn();
        });
      }
    });

    const musicButton = document.getElementById("musicToggle");
    const soundButton = document.getElementById("soundToggle");

    if (musicButton) {
      musicButton.addEventListener("click", () => {
        audio.toggleMusic();

        musicButton.textContent =
          audio.getSettings().music
            ? "🎵 Music ON"
            : "🔇 Music OFF";
      });
    }

    if (soundButton) {
      soundButton.addEventListener("click", () => {
        audio.toggleSound();

        soundButton.textContent =
          audio.getSettings().sound
            ? "🔊 Sound ON"
            : "🔇 Sound OFF";
      });
    }

    document.addEventListener("click", event => {
      const button = event.target.closest("button");

      if (!button) return;

      if (
        button.id !== "hornBtn" &&
        button.id !== "hornButton" &&
        button.id !== "musicToggle" &&
        button.id !== "soundToggle"
      ) {
        audio.playButton();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      setupAudioEvents,
      { once: true }
    );
  } else {
    setupAudioEvents();
  }

})();

/* =========================================
   PART 24 END
========================================= */
