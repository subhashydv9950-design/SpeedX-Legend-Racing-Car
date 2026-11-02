/* =========================================
   SUPERX LEGEND RACING CAR
   PART 21 — COMPLETE RACE INTEGRATION
   FILE: js/race.js
========================================= */

(() => {
  "use strict";

  const race = {
    active: false,
    paused: false,
    mode: "career",
    startTime: 0,
    elapsed: 0,
    distance: 0,
    targetDistance: 5000,
    animationFrame: null,
    lastTime: 0,
    reward: 0
  };

  const $ = id => document.getElementById(id);

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach(screen => {
      screen.classList.remove("active");
    });

    const screen = $(id);

    if (screen) {
      screen.classList.add("active");
    }
  }

  function notify(message) {
    if (typeof window.showToast === "function") {
      window.showToast(message);
      return;
    }

    console.log("SUPERX:", message);
  }

  function updateHUD() {
    const physics = window.SuperXPhysics?.state;

    if (!physics) return;

    const speed = Math.round(physics.speed || 0);

    if ($("speedValue")) {
      $("speedValue").textContent = speed;
    }

    if ($("gearValue")) {
      $("gearValue").textContent = physics.gear || 1;
    }

    if ($("rpmValue")) {
      $("rpmValue").textContent = physics.rpm || 900;
    }

    if ($("raceDistance")) {
      $("raceDistance").textContent =
        (race.distance / 1000).toFixed(2) + " km";
    }

    const progress = Math.min(
      100,
      (race.distance / race.targetDistance) * 100
    );

    if ($("raceProgress")) {
      $("raceProgress").style.width = progress + "%";
    }
  }

  function raceLoop(time) {
    if (!race.active || race.paused) return;

    if (!race.lastTime) race.lastTime = time;

    const dt = Math.min(
      (time - race.lastTime) / 1000,
      0.05
    );

    race.lastTime = time;
    race.elapsed += dt;

    const speed =
      window.SuperXPhysics?.getSpeed?.() || 0;

    race.distance += speed * dt / 3.6;

    // Update AI traffic only once per race frame
    window.SuperXTraffic?.update?.(dt);

    updateHUD();

    if (race.distance >= race.targetDistance) {
      finish();
      return;
    }

    race.animationFrame = requestAnimationFrame(raceLoop);
  }

  function start(mode = "career") {
    if (race.active) {
      stop();
    }

    race.mode = mode;
    race.active = true;
    race.paused = false;
    race.distance = 0;
    race.elapsed = 0;
    race.lastTime = 0;
    race.startTime = Date.now();

    race.targetDistance =
      mode === "free" ? 100000 : 5000;

    // Create the 3D race world
    const world = window.SuperX3D?.startRaceWorld?.();

    if (!world) {
      race.active = false;
      notify("3D Race World load nahi hua.");
      return;
    }

    showScreen("raceScreen");

    // Start driving physics
    window.SuperXPhysics?.start?.();

    // Start traffic
    window.SuperXTraffic?.start?.();

    // Initialize controls
    window.SuperXControls?.initialize?.();

    // Start audio if available
    window.SuperXAudio?.startEngine?.();

    updateHUD();

    race.animationFrame = requestAnimationFrame(raceLoop);

    notify("Race Started!");
  }

  function pause() {
    if (!race.active || race.paused) return;

    race.paused = true;

    cancelAnimationFrame(race.animationFrame);

    window.SuperXPhysics?.stop?.();
    window.SuperXTraffic?.stop?.();
    window.SuperXControls?.releaseAll?.();
    window.SuperXAudio?.stopEngine?.();

    if ($("pauseMenu")) {
      $("pauseMenu").classList.add("active");
    }

    notify("Race Paused");
  }

  function resume() {
    if (!race.active || !race.paused) return;

    race.paused = false;

    window.SuperXPhysics?.start?.();
    window.SuperXTraffic?.start?.();
    window.SuperXAudio?.startEngine?.();

    if ($("pauseMenu")) {
      $("pauseMenu").classList.remove("active");
    }

    race.lastTime = 0;
    race.animationFrame = requestAnimationFrame(raceLoop);

    notify("Race Resumed");
  }

  function stop() {
    race.active = false;
    race.paused = false;

    cancelAnimationFrame(race.animationFrame);

    window.SuperXPhysics?.stop?.();
    window.SuperXTraffic?.stop?.();
    window.SuperXControls?.releaseAll?.();
    window.SuperX3D?.stopRaceWorld?.();
    window.SuperXAudio?.stopEngine?.();

    if ($("pauseMenu")) {
      $("pauseMenu").classList.remove("active");
    }
  }

  function finish() {
    if (!race.active) return;

    race.active = false;
    race.paused = false;

    cancelAnimationFrame(race.animationFrame);

    window.SuperXPhysics?.stop?.();
    window.SuperXTraffic?.stop?.();
    window.SuperXControls?.releaseAll?.();
    window.SuperX3D?.stopRaceWorld?.();
    window.SuperXAudio?.stopEngine?.();

    const reward = Math.max(
      100,
      Math.round(race.distance / 10)
    );

    race.reward = reward;

    // Save earned coins if progress system is available
    if (typeof window.updateCoins === "function") {
      window.updateCoins(reward);
    }

    if ($("rewardValue")) {
      $("rewardValue").textContent = reward;
    }

    if ($("resultDistance")) {
      $("resultDistance").textContent =
        (race.distance / 1000).toFixed(2) + " km";
    }

    if ($("resultTime")) {
      $("resultTime").textContent =
        Math.floor(race.elapsed) + " sec";
    }

    if ($("resultScreen")) {
      showScreen("resultScreen");
    } else {
      showScreen("homeScreen");
      notify("Race Complete! Reward: " + reward + " coins");
    }
  }

  function setTargetDistance(distance) {
    race.targetDistance = Math.max(
      100,
      Number(distance) || 5000
    );
  }

  // Pause and resume button integration
  function bindButtons() {
    const pauseBtn = $("pauseBtn");
    const resumeBtn = $("resumeBtn");
    const exitBtn = $("exitRaceBtn");
    const finishBtn = $("finishRaceBtn");

    pauseBtn?.addEventListener("click", pause);
    resumeBtn?.addEventListener("click", resume);
    exitBtn?.addEventListener("click", () => {
      stop();
      showScreen("homeScreen");
    });

    finishBtn?.addEventListener("click", finish);
  }

  window.SuperXRace = {
    start,
    pause,
    resume,
    stop,
    finish,
    setTargetDistance,

    getState: () => ({
      active: race.active,
      paused: race.paused,
      mode: race.mode,
      distance: race.distance,
      elapsed: race.elapsed,
      reward: race.reward
    })
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindButtons);
  } else {
    bindButtons();
  }

})();

/* =========================================
   PART 21 END
========================================= */

