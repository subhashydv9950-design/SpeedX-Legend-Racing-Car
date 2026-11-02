
/* ========================================
   SUPERX LEGEND RACING CAR
   PART 14 — GEAR & UI SOUND EVENTS
======================================== */

(function () {
  "use strict";

  let previousGear = null;
  let previousRaceVisible = false;

  function raceIsVisible() {
    const screen = document.getElementById("raceScreen");
    return !!(
      screen &&
      screen.getClientRects().length &&
      getComputedStyle(screen).display !== "none"
    );
  }

  function readPhysics() {
    if (!window.SuperXPhysics) return null;

    try {
      return window.SuperXPhysics.getState();
    } catch (error) {
      return null;
    }
  }

  function checkGear() {
    const audio = window.SuperXAudio;
    const state = readPhysics();

    if (!audio || !state) return;

    const gear = state.gear;

    if (previousGear !== null && gear !== previousGear) {
      audio.gearShift();
    }

    previousGear = gear;
  }

  function addButtonSounds() {
    const audio = window.SuperXAudio;
    if (!audio) return;

    const buttonIds = [
      "menuBtn",
      "coinsBtn",
      "languageBtn",
      "profileBtn",
      "prevCar",
      "nextCar",
      "testDriveBtn",
      "garageDriveBtn",
      "startCareerBtn",
      "startFreeDriveBtn",
      "quickJoinBtn",
      "createRoomBtn",
      "pauseBtn",
      "cameraBtn"
    ];

    buttonIds.forEach(function (id) {
      const button = document.getElementById(id);
      if (!button || button.dataset.superxSoundAdded) return;

      button.dataset.superxSoundAdded = "true";

      button.addEventListener("click", function () {
        if (window.SuperXAudio) {
          window.SuperXAudio.buttonSound();
        }
      });
    });
  }

  function update() {
    const visible = raceIsVisible();

    if (visible && !previousRaceVisible) {
      previousGear = null;
    }

    previousRaceVisible = visible;

    if (visible) {
      checkGear();
    } else {
      previousGear = null;
    }

    addButtonSounds();
  }

  window.addEventListener("DOMContentLoaded", function () {
    update();
    window.setInterval(update, 1500);
  });

  window.SuperXAudioEvents = {
    update: update
  };

})();

/* ========== END OF PART 14 ========== */
