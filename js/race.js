
/* ==========================================
   SUPERX LEGEND RACING CAR
   PART 8 — RACE MANAGER
   FILE: js/race.js
========================================== */

(() => {
  "use strict";

  const Race = {
    active: false,
    paused: false,
    mode: "career",
    startedAt: 0,
    elapsed: 0,
    distanceTarget: 1000,
    reward: 0,
    animationId: null,
    lastFrame: 0
  };

  const $ = (id) => document.getElementById(id);

  function toast(message) {
    if (typeof window.showToast === "function") {
      window.showToast(message);
    } else {
      console.log("[SUPERX]", message);
    }
  }

  function showRaceScreen() {
    const screens = document.querySelectorAll(".screen");

    screens.forEach((screen) => {
      screen.classList.remove("active");
    });

    const raceScreen = $("raceScreen");

    if (raceScreen) {
      raceScreen.classList.add("active");
    }
  }

  function start(mode = "career") {
    if (Race.active) return;

    if (!window.SuperXPhysics) {
      toast("Physics module load nahi hua.");
      return;
    }

    Race.mode = mode;
    Race.paused = false;
    Race.active = true;
    Race.elapsed = 0;
    Race.startedAt = performance.now();
    Race.lastFrame = Race.startedAt;

    const selectedMap = window.SuperX?.selectedMap || 1;
    Race.distanceTarget = Math.min(100000, selectedMap * 1000);
    Race.reward = Math.max(100, selectedMap * 50);

    showRaceScreen();

    // Start the driving simulation.
    window.SuperXPhysics.start();

    // Start AI traffic after the race world is available.
    if (window.SuperXTraffic) {
      window.SuperXTraffic.start();
    }

    updateButtons();
    toast("Race शुरू! Accelerator दबाएँ।");

    if (!Race.animationId) {
      Race.animationId = requestAnimationFrame(loop);
    }
  }

  function pause() {
    if (!Race.active || Race.paused) return;

    Race.paused = true;

    window.SuperXPhysics?.stop();
    window.SuperXTraffic?.stop();
    window.SuperXControls?.releaseAll();

    updateButtons();
    toast("Race paused");
  }

  function resume() {
    if (!Race.active || !Race.paused) return;

    Race.paused = false;
    Race.lastFrame = performance.now();

    window.SuperXPhysics?.start();
    window.SuperXTraffic?.start();

    updateButtons();
    toast("Race resumed");
  }

  function togglePause() {
    if (Race.paused) {
      resume();
    } else {
      pause();
    }
  }

  function stop() {
    Race.active = false;
    Race.paused = false;

    window.SuperXPhysics?.stop();
    window.SuperXTraffic?.stop();
    window.SuperXTraffic?.clear();
    window.SuperXControls?.releaseAll();

    if (Race.animationId) {
      cancelAnimationFrame(Race.animationId);
      Race.animationId = null;
    }

    updateButtons();
  }

  function updateButtons() {
    const pauseBtn = $("pauseBtn");

    if (pauseBtn) {
      pauseBtn.textContent = Race.paused ? "▶ Resume" : "Ⅱ Pause";
    }
  }

  function updateHUD() {
    const state = window.SuperXPhysics?.getState();
    if (!state) return;

    const speedValue = $("speedValue");
    const gearValue = $("gearValue");
    const rpmValue = $("rpmValue");
    const distanceValue = $("distanceValue");
    const progressBar = $("raceProgressBar");

    if (speedValue) {
      speedValue.textContent = state.speed;
    }

    if (gearValue) {
      gearValue.textContent = state.gear;
    }

    if (rpmValue) {
      rpmValue.textContent = state.rpm;
    }

    if (distanceValue) {
      distanceValue.textContent =
        `${Math.floor(state.distance)} m`;
    }

    if (progressBar) {
      const progress = Math.min(
        100,
        (state.distance / Race.distanceTarget) * 100
      );

      progressBar.style.width = `${progress}%`;
    }

    // Finish condition for distance-based races.
    if (
      Race.mode !== "free" &&
      state.distance >= Race.distanceTarget
    ) {
      finishRace();
    }
  }

  function finishRace() {
    if (!Race.active) return;

    const state = window.SuperXPhysics?.getState();
    const earned = Race.reward;

    stop();

    // Save coins locally for this browser.
    if (window.SuperX) {
      window.SuperX.coins =
        Math.max(0, Number(window.SuperX.coins) || 0) + earned;

      if (typeof window.SuperX.saveProgress === "function") {
        window.SuperX.saveProgress();
      }

      if (typeof window.updateCoins === "function") {
        window.updateCoins();
      }
    }

    const message =
      `Race complete!\nDistance: ${Math.floor(state?.distance || 0)} m\nReward: ${earned} coins`;

    toast(message);

    if (typeof window.showDialog === "function") {
      window.showDialog("🏆 RACE COMPLETE", message);
    }
  }

  function loop(time) {
    Race.animationId = null;

    if (!Race.active) return;

    if (!Race.paused) {
      const dt = Math.min((time - Race.lastFrame) / 1000, 0.05);

      Race.elapsed += Math.max(0, dt);
      Race.lastFrame = time;

      // Physics has its own animation loop.
      // Traffic receives the current frame delta.
      window.SuperXTraffic?.update(dt);

      updateHUD();
    } else {
      Race.lastFrame = time;
    }

    if (Race.active) {
      Race.animationId = requestAnimationFrame(loop);
    }
  }

  function bind() {
    $("pauseBtn")?.addEventListener("click", togglePause);

    $("cameraBtn")?.addEventListener("click", () => {
      if (typeof window.SuperXCamera?.next === "function") {
        window.SuperXCamera.next();
      } else {
        toast("Camera views अगले पार्ट में जोड़े जाएँगे।");
      }
    });

    $("hornBtn")?.addEventListener("click", () => {
      if (typeof window.SuperXAudio?.horn === "function") {
        window.SuperXAudio.horn();
      } else {
        toast("Horn sound अगले audio पार्ट में आएगा।");
      }
    });

    $("backToHomeBtn")?.addEventListener("click", () => {
      stop();

      const home = $("homeScreen");

      document.querySelectorAll(".screen").forEach((screen) => {
        screen.classList.remove("active");
      });

      home?.classList.add("active");
    });

    // Escape key pauses an active race.
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && Race.active) {
        togglePause();
      }
    });
  }

  window.SuperXRace = {
    start,
    pause,
    resume,
    togglePause,
    stop,
    getState: () => ({
      active: Race.active,
      paused: Race.paused,
      mode: Race.mode,
      elapsed: Race.elapsed,
      distanceTarget: Race.distanceTarget
    })
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, { once: true });
  } else {
    bind();
  }

  console.log("SUPERX Race Manager loaded");
})();

/* ========== END OF PART 8 ========== */
