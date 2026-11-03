/* =========================================================
   SUPERX LEGEND — FILE 94
   FILE: js/vehicle-race-ghost-comparison.js
   START: RACE GHOST COMPARISON SYSTEM
   ========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  let active = false;
  let currentRaceStart = 0;
  let currentRaceTime = 0;
  let ghostTime = 0;
  let currentDistance = 0;
  let ghostDistance = 0;
  let currentSpeed = 0;
  let ghostSpeed = 0;
  let lastResult = null;

  function num(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function emit(name, detail = {}) {
    window.dispatchEvent(
      new CustomEvent(name, { detail })
    );
  }

  function start(options = {}) {
    active = true;
    currentRaceStart = Date.now();
    currentRaceTime = 0;
    ghostTime = Math.max(0, num(options.ghostTime));
    currentDistance = 0;
    ghostDistance = 0;
    currentSpeed = 0;
    ghostSpeed = 0;
    lastResult = null;

    emit("sx:ghost-comparison-started", {
      ghostTime
    });

    return getState();
  }

  function updateCurrent(data = {}) {
    if (!active) return false;

    currentRaceTime = Math.max(
      0,
      num(data.elapsed, (Date.now() - currentRaceStart) / 1000)
    );

    currentDistance = Math.max(
      0,
      num(data.distance, currentDistance)
    );

    currentSpeed = Math.max(
      0,
      num(data.speed, currentSpeed)
    );

    return calculate();
  }

  function updateGhost(data = {}) {
    if (!active) return false;

    ghostTime = Math.max(0, num(data.elapsed, ghostTime));
    ghostDistance = Math.max(
      0,
      num(data.distance, ghostDistance)
    );
    ghostSpeed = Math.max(0, num(data.speed, ghostSpeed));

    return calculate();
  }

  function updateFromGhostSystem() {
    if (!active || !SX.vehicleGhost) return false;

    if (
      typeof SX.vehicleGhost.getState !== "function" ||
      typeof SX.vehicleGhost.getInterpolatedSample !== "function"
    ) {
      return false;
    }

    const ghostState = SX.vehicleGhost.getState();
    if (!ghostState) return false;

    const sample = SX.vehicleGhost.getInterpolatedSample(
      ghostState.playbackTime
    );

    if (!sample) return false;

    updateGhost({
      elapsed: sample.time,
      distance: sample.distance,
      speed: sample.speed
    });

    return true;
  }

  function calculate() {
    if (!active && !lastResult) return null;

    const timeDifference = currentRaceTime - ghostTime;
    const distanceDifference = currentDistance - ghostDistance;
    const speedDifference = currentSpeed - ghostSpeed;

    let position = "equal";

    if (timeDifference < -0.05) {
      position = "ahead";
    } else if (timeDifference > 0.05) {
      position = "behind";
    }

    lastResult = {
      currentTime: currentRaceTime,
      ghostTime,
      timeDifference,
      distanceDifference,
      speedDifference,
      currentSpeed,
      ghostSpeed,
      position,
      timeText: formatDifference(timeDifference)
    };

    return { ...lastResult };
  }

  function formatTime(seconds) {
    const value = Math.max(0, num(seconds));
    const minutes = Math.floor(value / 60);
    const remaining = value - minutes * 60;

    return (
      String(minutes).padStart(2, "0") +
      ":" +
      remaining.toFixed(2).padStart(5, "0")
    );
  }

  function formatDifference(seconds) {
    const value = Math.abs(num(seconds));
    const prefix = seconds > 0
      ? "+"
      : seconds < 0
        ? "-"
        : "";

    return prefix + value.toFixed(2) + "s";
  }

  function getProgress() {
    const difference = currentDistance - ghostDistance;

    return {
      currentDistance,
      ghostDistance,
      difference,
      ahead: difference > 0,
      percentage: ghostDistance > 0
        ? clamp(currentDistance / ghostDistance * 100, 0, 200)
        : 0
    };
  }

  function getState() {
    return {
      active,
      currentTime: formatTime(currentRaceTime),
      ghostTime: formatTime(ghostTime),
      position: lastResult ? lastResult.position : "equal",
      difference: lastResult ? lastResult.timeText : "0.00s",
      distanceDifference: currentDistance - ghostDistance,
      speedDifference: currentSpeed - ghostSpeed,
      progress: getProgress()
    };
  }

  function finish() {
    if (!active) return null;

    const result = calculate();
    active = false;

    lastResult = {
      ...result,
      finishedAt: Date.now()
    };

    emit("sx:ghost-comparison-finished", lastResult);

    return { ...lastResult };
  }

  function reset() {
    active = false;
    currentRaceStart = 0;
    currentRaceTime = 0;
    ghostTime = 0;
    currentDistance = 0;
    ghostDistance = 0;
    currentSpeed = 0;
    ghostSpeed = 0;
    lastResult = null;

    emit("sx:ghost-comparison-reset");

    return true;
  }

  const api = {
    start,
    updateCurrent,
    updateGhost,
    updateFromGhostSystem,
    calculate,
    getProgress,
    getState,
    finish,
    reset,
    formatTime,
    formatDifference
  };

  SX.vehicleRaceGhostComparison = api;

})();

/* =========================================================
   END: RACE GHOST COMPARISON SYSTEM — FILE 94
   ========================================================= */

