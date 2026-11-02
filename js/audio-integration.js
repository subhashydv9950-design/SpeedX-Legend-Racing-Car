
/* ========================================
   SUPERX LEGEND RACING CAR
   PART 13 — AUDIO INTEGRATION
======================================== */

(function () {
  "use strict";

  let engineActive = false;
  let lastSpeed = 0;

  function getPhysicsState() {
    if (!window.SuperXPhysics) return null;

    try {
      if (typeof window.SuperXPhysics.getState === "function") {
        return window.SuperXPhysics.getState();
      }
    } catch (error) {
      console.warn("Physics state unavailable:", error);
    }

    return null;
  }

  function isRaceVisible() {
    const screen = document.getElementById("raceScreen");
    if (!screen) return false;

    return screen.getClientRects().length > 0 &&
      getComputedStyle(screen).display !== "none" &&
      getComputedStyle(screen).visibility !== "hidden";
  }

  function updateAudio() {
    const audio = window.SuperXAudio;
    if (!audio) return;

    const state = getPhysicsState();

    if (!state) {
      if (engineActive) {
        audio.stopEngine();
        engineActive = false;
      }
      return;
    }

    const speed = Number(state.speed) || 0;
    const rpm = Number(state.rpm) || 800;
    const driving = isRaceVisible();

    if (driving && !engineActive) {
      audio.startEngine();
      engineActive = true;
    } else if (!driving && engineActive) {
      audio.stopEngine();
      engineActive = false;
    }

    if (driving) {
      audio.updateEngine(speed, rpm);
    }

    // Remember the previous speed for future sound effects.
    lastSpeed = speed;
  }

  // Start checking after the game modules load.
  window.addEventListener("DOMContentLoaded", function () {
    window.setInterval(updateAudio, 100);
  });

  window.SuperXAudioIntegration = {
    update: updateAudio,
    getLastSpeed: () => lastSpeed
  };

})();

/* ========== END OF PART 13 ========== */
