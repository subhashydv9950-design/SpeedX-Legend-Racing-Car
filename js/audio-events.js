/* =========================================
   SUPERX LEGEND
   PART 25B — AUDIO EVENT CONNECTION
   FILE: js/audio-events.js
========================================= */

(() => {
  "use strict";

  function setupAudioEvents() {
    const audio = window.SuperXAudio;

    if (!audio) return;

    const musicButton =
      document.getElementById("musicToggle");

    const soundButton =
      document.getElementById("soundToggle");

    const brakeButton =
      document.getElementById("brakeBtn");

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

    if (brakeButton) {
      brakeButton.addEventListener(
        "pointerdown",
        () => audio.playBrake()
      );
    }

    document.addEventListener("click", event => {
      const button = event.target.closest("button");

      if (!button) return;

      const excluded = [
        "hornBtn",
        "musicToggle",
        "soundToggle",
        "brakeBtn"
      ];

      if (!excluded.includes(button.id)) {
        audio.playButton();
      }
    });

    console.log("SUPERX Audio Events Connected.");
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
   PART 25B END
========================================= */

