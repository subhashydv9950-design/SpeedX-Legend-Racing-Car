
/* =====================================================
   SUPERX LEGEND — PART 29 START
   FILE: js/race.js
===================================================== */

(() => {
  "use strict";

  const R = {
    active: false,
    paused: false,
    mode: "career",
    distance: 0,
    elapsed: 0,
    target: 5000,
    reward: 0,
    frame: null,
    lastTime: 0,
    bound: false
  };

  const $ = id => document.getElementById(id);

  function toast(message) {
    if (typeof window.showToast === "function") {
      window.showToast(message);
    } else {
      console.log("SUPERX:", message);
    }
  }

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach(screen => {
      screen.classList.remove("active");
    });

    $(id)?.classList.add("active");
  }

  function updateHUD() {
    const physics = window.SuperXPhysics?.state;
    const speed = window.SuperXPhysics?.getSpeed?.() || 0;

    if ($("speedValue")) {
      $("speedValue").textContent = Math.round(speed);
    }

    if ($("raceSpeed")) {
      $("raceSpeed").textContent = Math.round(speed);
    }

    if ($("gearValue") && physics) {
      $("gearValue").textContent = physics.gear;
    }

    if ($("rpmValue") && physics) {
      $("rpmValue").textContent = physics.rpm;
    }

    if ($("raceDistance")) {
      $("raceDistance").textContent =
        (R.distance / 1000).toFixed(2) + " km";
    }

    const progress = Math.min(
      100,
      (R.distance / R.target) * 100
    );

    if ($("raceProgress")) {
      $("raceProgress").style.width = progress + "%";
    }
  }

  function updateRace(dt) {
    const physics = window.SuperXPhysics;

    physics?.update?.(dt);

    const speed = physics?.getSpeed?.() || 0;

    R.distance += speed * dt / 3.6;
    R.elapsed += dt;

    window.SuperXTraffic?.update?.(dt);
    window.SuperXAudio?.updateEngine?.(
      speed,
      physics?.state?.rpm || 900
    );

    updateHUD();

    if (R.mode !== "freeDrive" && R.distance >= R.target) {
      finish();
    }
  }

  function loop(time) {
    if (!R.active || R.paused) return;

    if (!R.lastTime) R.lastTime = time;

    const dt = Math.min(
      Math.max((time - R.lastTime) / 1000, 0),
      0.05
    );

    R.lastTime = time;

    updateRace(dt);

    if (R.active && !R.paused) {
      R.frame = requestAnimationFrame(loop);
    }
  }

  function start(mode = "career") {
    if (R.active) stop();

    const scene = window.SuperX3D?.startRaceWorld?.();

    if (!scene) {
      toast("3D Race World load nahi hua.");
      return;
    }

    R.mode = String(mode);
    R.distance = 0;
    R.elapsed = 0;
    R.reward = 0;
    R.lastTime = 0;

    R.target = R.mode === "freeDrive" ||
      R.mode.toLowerCase().includes("freedrive") ||
      R.mode.toLowerCase() === "free"
        ? Infinity
        : 5000;

    R.active = true;
    R.paused = false;

    window.SuperXPhysics?.startNewRace?.();
    window.SuperXTraffic?.start?.();
    window.SuperXControls?.initialize?.();
    window.SuperXAudio?.initializeAudio?.();
    window.SuperXAudio?.startEngine?.();

    $("pauseMenu")?.classList.remove("active");
    $("resultScreen")?.classList.remove("active");

    showScreen("raceScreen");
    updateHUD();

    R.frame = requestAnimationFrame(loop);
  }

  function setControl(name, value) {
    if (!R.active || R.paused) return;

    const controls = {
      accelerate: "throttle",
      accelerator: "throttle",
      gas: "throttle",
      brake: "brake",
      left: "left",
      right: "right",
      handbrake: "handbrake"
    };

    const physicsName = controls[name] || name;

    window.SuperXPhysics?.setControl?.(
      physicsName,
      Boolean(value)
    );
  }

  function releaseControls() {
    window.SuperXPhysics?.setControl?.("throttle", false);
    window.SuperXPhysics?.setControl?.("brake", false);
    window.SuperXPhysics?.setControl?.("left", false);
    window.SuperXPhysics?.setControl?.("right", false);
    window.SuperXPhysics?.setControl?.("handbrake", false);

    window.SuperXControls?.releaseAll?.();
  }

  function pause() {
    if (!R.active || R.paused) return;

    R.paused = true;
    cancelAnimationFrame(R.frame);

    releaseControls();
    window.SuperXPhysics?.pause?.();
    window.SuperXTraffic?.pause?.();
    window.SuperXAudio?.stopEngine?.();

    $("pauseMenu")?.classList.add("active");
  }

  function resume() {
    if (!R.active || !R.paused) return;

    R.paused = false;
    R.lastTime = 0;

    window.SuperXPhysics?.resume?.();
    window.SuperXTraffic?.resume?.();
    window.SuperXAudio?.startEngine?.();

    $("pauseMenu")?.classList.remove("active");

    R.frame = requestAnimationFrame(loop);
  }

  function togglePause() {
    if (R.paused) {
      resume();
    } else {
      pause();
    }
  }

  function stop() {
    R.active = false;
    R.paused = false;

    cancelAnimationFrame(R.frame);

    releaseControls();

    window.SuperXPhysics?.stop?.();
    window.SuperXTraffic?.stop?.();
    window.SuperX3D?.stopRaceWorld?.();
    window.SuperXAudio?.stopEngine?.();

    $("pauseMenu")?.classList.remove("active");
  }

  function finish() {
    if (!R.active) return;

    R.active = false;
    R.paused = false;

    cancelAnimationFrame(R.frame);
    releaseControls();

    window.SuperXPhysics?.stop?.();
    window.SuperXTraffic?.stop?.();
    window.SuperX3D?.stopRaceWorld?.();
    window.SuperXAudio?.stopEngine?.();

    R.reward = Math.max(
      100,
      Math.round(R.distance / 10)
    );

    if (typeof window.updateCoins === "function") {
      window.updateCoins(R.reward);
    }

    if ($("rewardValue")) {
      $("rewardValue").textContent = R.reward;
    }

    if ($("resultDistance")) {
      $("resultDistance").textContent =
        (R.distance / 1000).toFixed(2) + " km";
    }

    if ($("resultTime")) {
      $("resultTime").textContent =
        Math.floor(R.elapsed) + " sec";
    }

    if ($("resultScreen")) {
      showScreen("resultScreen");
    } else {
      showScreen("homeScreen");
      toast("Race complete! " + R.reward + " coins");
    }
  }

  function horn() {
    if (!R.active || R.paused) return;
    window.SuperXAudio?.playHorn?.();
  }

  function bindButton(id, callback) {
    const button = $(id);
    if (!button || button.dataset.raceBound === "true") return;

    button.dataset.raceBound = "true";
    button.addEventListener("click", callback);
  }

  function bind() {
    if (R.bound) return;
    R.bound = true;

    bindButton("pauseBtn", togglePause);
    bindButton("resumeBtn", resume);

    bindButton("exitRaceBtn", () => {
      stop();
      showScreen("homeScreen");
    });

    bindButton("finishRaceBtn", finish);

    bindButton("hornBtn", horn);

    bindButton("retryRaceBtn", () => {
      start(R.mode);
    });

    bindButton("resultHomeBtn", () => {
      stop();
      showScreen("homeScreen");
    });
  }

  window.SuperXRace = {
    start,
    pause,
    resume,
    togglePause,
    stop,
    finish,
    horn,
    setControl,
    releaseControls,
    getState: () => ({ ...R })
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }

})();

/* =====================================================
   SUPERX LEGEND — PART 29 END
===================================================== */
