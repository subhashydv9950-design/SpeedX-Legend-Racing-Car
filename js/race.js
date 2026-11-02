/* SUPERX — PART 22D
   FILE: js/race.js */

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

  function screen(id) {
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

  function hud() {
    const speed = window.SuperXPhysics?.getSpeed?.() || 0;

    if ($("speedValue")) {
      $("speedValue").textContent = Math.round(speed);
    }

    if ($("raceDistance")) {
      $("raceDistance").textContent =
        (R.distance / 1000).toFixed(2) + " km";
    }

    const progress = Math.min(100, R.distance / R.target * 100);
    if ($("raceProgress")) {
      $("raceProgress").style.width = progress + "%";
    }
  }

  function loop(time) {
    if (!R.active || R.paused) return;

    if (!R.lastTime) R.lastTime = time;
    const dt = Math.min((time - R.lastTime) / 1000, 0.05);
    R.lastTime = time;

    const speed = window.SuperXPhysics?.getSpeed?.() || 0;
    R.distance += speed * dt / 3.6;
    R.elapsed += dt;

    window.SuperXTraffic?.update?.(dt);
    hud();

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
    R.target = mode === "free" ? 100000 : 5000;

    const scene = window.SuperX3D?.startRaceWorld?.();

    if (!scene) {
      toast("3D Race World load nahi hua.");
      return;
    }

    R.active = true;
    R.paused = false;

    screen("raceScreen");

    window.SuperXPhysics?.startNewRace?.();
    window.SuperXTraffic?.start?.();
    window.SuperXControls?.initialize?.();
    window.SuperXAudio?.startEngine?.();

    hud();
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
    window.SuperXAudio?.startEngine?.();

    $("pauseMenu")?.classList.remove("active");

    R.frame = requestAnimationFrame(loop);
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

    R.reward = Math.max(100, Math.round(R.distance / 10));

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
      screen("resultScreen");
    } else {
      screen("homeScreen");
      toast("Race complete! " + R.reward + " coins");
    }
  }

  function bind() {
    $("pauseBtn")?.addEventListener("click", pause);
    $("resumeBtn")?.addEventListener("click", resume);

    $("exitRaceBtn")?.addEventListener("click", () => {
      stop();
      screen("homeScreen");
    });

    $("finishRaceBtn")?.addEventListener("click", finish);
  }

  window.SuperXRace = {
    start,
    pause,
    resume,
    stop,
    finish,
    getState: () => ({ ...R })
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();

/* PART 22D END */

