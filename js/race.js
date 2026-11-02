
/* =========================================
   SUPERX LEGEND
   PART 27B — RACE HUD + PAUSE + RESULTS
   FILE: js/race.js
========================================= */

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
    lastTime: 0
  };

  const $ = id => document.getElementById(id);

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach(item => {
      item.classList.remove("active");
    });
    $(id)?.classList.add("active");
  }

  function toast(message) {
    if (typeof window.showToast === "function") {
      window.showToast(message);
    } else {
      console.log("SUPERX:", message);
    }
  }

  function updateHUD() {
    const speed = Math.round(
      window.SuperXPhysics?.getSpeed?.() || 0
    );

    if ($("raceSpeed")) {
      $("raceSpeed").textContent = speed;
    }

    if ($("speedValue")) {
      $("speedValue").textContent = speed;
    }

    const physics = window.SuperXPhysics?.state;

    if ($("gearValue")) {
      $("gearValue").textContent = physics?.gear ?? 1;
    }

    if ($("rpmValue")) {
      $("rpmValue").textContent = physics?.rpm ?? 900;
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

  function loop(time) {
    if (!R.active || R.paused) return;

    if (!R.lastTime) R.lastTime = time;

    const dt = Math.min(
      (time - R.lastTime) / 1000,
      0.05
    );

    R.lastTime = time;

    const speed =
      window.SuperXPhysics?.getSpeed?.() || 0;

    R.distance += speed * dt / 3.6;
    R.elapsed += dt;

    window.SuperXTraffic?.update?.(dt);

    updateHUD();

    if (R.distance >= R.target) {
      finish();
      return;
    }

    R.frame = requestAnimationFrame(loop);
  }

  function start(mode = "career") {
    if (R.active) stop();

    R.mode = mode;
    R.distance = 0;
    R.elapsed = 0;
    R.lastTime = 0;
    R.reward = 0;

    R.target =
      mode === "free" || mode === "freeDrive"
        ? 100000
        : 5000;

    const scene =
      window.SuperX3D?.startRaceWorld?.();

    if (!scene) {
      toast("3D Race World load nahi hua.");
      return;
    }

    R.active = true;
    R.paused = false;

    showScreen("raceScreen");

    window.SuperXAudio?.initializeAudio?.();
    window.SuperXPhysics?.startNewRace?.();
    window.SuperXTraffic?.start?.();
    window.SuperXControls?.initialize?.();
    window.SuperXAudio?.startEngine?.();

    $("pauseMenu")?.classList.remove("active");

    updateHUD();
    R.frame = requestAnimationFrame(loop);
  }

  function pause() {
    if (!R.active || R.paused) return;

    R.paused = true;

    cancelAnimationFrame(R.frame);
    window.SuperXPhysics?.pause?.();
    window.SuperXTraffic?.pause?.();
    window.SuperXControls?.releaseAll?.();
    window.SuperXAudio?.stopEngine?.();

    $("pauseMenu")?.classList.add("active");
  }

  function resume() {
    if (!R.active || !R.paused) return;

    R.paused = false;
    R.lastTime = 0;

    window.SuperXPhysics?.resume?.();
    window.SuperXTraffic?.resume?.();
    window.SuperXAudio?.initializeAudio?.();
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

    window.SuperXPhysics?.stop?.();
    window.SuperXTraffic?.stop?.();
    window.SuperXControls?.releaseAll?.();
    window.SuperX3D?.stopRaceWorld?.();
    window.SuperXAudio?.stopEngine?.();

    $("pauseMenu")?.classList.remove("active");
  }

  function finish() {
    if (!R.active) return;

    R.active = false;
    R.paused = false;

    cancelAnimationFrame(R.frame);

    window.SuperXPhysics?.stop?.();
    window.SuperXTraffic?.stop?.();
    window.SuperXControls?.releaseAll?.();
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

  function setControl(name, value) {
    const aliases = {
      accelerator: "throttle",
      gas: "throttle",
      reverse: "brake"
    };

    const control = aliases[name] || name;

    window.SuperXPhysics?.setControl?.(
      control,
      value
    );
  }

  function horn() {
    window.SuperXAudio?.playHorn?.();
  }

  function bind() {
    $("resumeBtn")?.addEventListener("click", resume);

    $("exitRaceBtn")?.addEventListener("click", () => {
      stop();
      showScreen("homeScreen");
    });

    $("resultHomeBtn")?.addEventListener("click", () => {
      showScreen("homeScreen");
    });

    $("resultRetryBtn")?.addEventListener("click", () => {
      start(R.mode);
    });
  }

  window.SuperXRace = {
    start,
    pause,
    resume,
    togglePause,
    stop,
    finish,
    setControl,
    horn,
    getState: () => ({ ...R })
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }

})();

/* =========================================
   PART 27B END
========================================= */
