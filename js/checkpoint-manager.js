
/* =========================================================
   SUPERX LEGEND — FILE 55
   FILE: js/checkpoint-manager.js
   START
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const state = {
    initialized: false,
    active: false,
    paused: false,
    checkpoints: [],
    currentCheckpoint: 0,
    completedCheckpoints: 0,
    currentLap: 1,
    totalLaps: 1,
    lapTimes: [],
    lapStartedAt: 0,
    raceStartedAt: 0,
    pausedAt: 0,
    pausedDuration: 0,
    bestLap: null,
    lastLap: null
  };

  function emit(name, detail = {}) {
    window.dispatchEvent(new CustomEvent("sx:" + name, {
      detail
    }));
  }

  function distance3D(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function normalizeCheckpoint(checkpoint, index) {
    return {
      id: checkpoint.id || "checkpoint-" + (index + 1),
      x: Number(checkpoint.x) || 0,
      y: Number(checkpoint.y) || 0,
      z: Number(checkpoint.z) || 0,
      radius: Math.max(1, Number(checkpoint.radius) || 8)
    };
  }

  function setup(checkpoints, options = {}) {
    if (!Array.isArray(checkpoints) || !checkpoints.length) {
      return false;
    }

    const normalized = checkpoints.map(normalizeCheckpoint);

    if (normalized.some(point =>
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y) ||
      !Number.isFinite(point.z)
    )) {
      return false;
    }

    state.checkpoints = normalized;
    state.totalLaps = Math.max(
      1,
      Math.min(100, Math.floor(Number(options.totalLaps) || 1))
    );

    state.initialized = true;
    state.active = false;
    state.paused = false;
    state.currentCheckpoint = 0;
    state.completedCheckpoints = 0;
    state.currentLap = 1;
    state.lapTimes = [];
    state.bestLap = null;
    state.lastLap = null;
    state.pausedDuration = 0;

    emit("checkpoints-ready", getState());
    return true;
  }

  function start() {
    if (!state.initialized || !state.checkpoints.length) {
      return false;
    }

    state.active = true;
    state.paused = false;
    state.currentCheckpoint = 0;
    state.completedCheckpoints = 0;
    state.currentLap = 1;
    state.lapTimes = [];
    state.bestLap = null;
    state.lastLap = null;
    state.pausedDuration = 0;

    state.raceStartedAt = Date.now();
    state.lapStartedAt = state.raceStartedAt;

    emit("checkpoints-started", getState());
    return true;
  }

  function getElapsedSince(timestamp) {
    return Math.max(0, Date.now() - timestamp);
  }

  function updatePosition(position) {
    if (!state.active || state.paused || !position) return null;

    const current = {
      x: Number(position.x) || 0,
      y: Number(position.y) || 0,
      z: Number(position.z) || 0
    };

    const checkpoint = getCurrentCheckpoint();
    if (!checkpoint) return null;

    const distance = distance3D(current, checkpoint);

    if (distance > checkpoint.radius) {
      return {
        reached: false,
        distance,
        checkpoint: checkpoint.id
      };
    }

    return completeCurrentCheckpoint();
  }

  function completeCurrentCheckpoint() {
    if (!state.active || state.paused) return null;

    const checkpoint = getCurrentCheckpoint();
    if (!checkpoint) return null;

    state.completedCheckpoints++;

    emit("checkpoint-reached", {
      checkpoint,
      index: state.currentCheckpoint + 1,
      total: state.checkpoints.length,
      lap: state.currentLap
    });

    state.currentCheckpoint++;

    if (state.currentCheckpoint >= state.checkpoints.length) {
      return completeLap();
    }

    return {
      reached: true,
      lapCompleted: false,
      nextCheckpoint: state.currentCheckpoint + 1
    };
  }

  function completeLap() {
    const now = Date.now();
    const lapTime = Math.max(0, now - state.lapStartedAt);

    state.lapTimes.push(lapTime);
    state.lastLap = lapTime;

    if (state.bestLap === null || lapTime < state.bestLap) {
      state.bestLap = lapTime;
    }

    emit("lap-completed", {
      lap: state.currentLap,
      lapTime,
      bestLap: state.bestLap,
      totalLaps: state.totalLaps
    });

    if (state.currentLap >= state.totalLaps) {
      state.active = false;
      state.paused = false;

      const result = {
        finished: true,
        totalTime: Math.max(0, now - state.raceStartedAt - state.pausedDuration),
        lapTimes: state.lapTimes.slice(),
        bestLap: state.bestLap,
        totalLaps: state.totalLaps,
        completedCheckpoints: state.completedCheckpoints
      };

      emit("checkpoints-finished", result);
      return result;
    }

    state.currentLap++;
    state.currentCheckpoint = 0;
    state.lapStartedAt = now;

    emit("new-lap-started", {
      lap: state.currentLap,
      totalLaps: state.totalLaps
    });

    return {
      finished: false,
      lapCompleted: true,
      currentLap: state.currentLap,
      totalLaps: state.totalLaps
    };
  }

  function pause() {
    if (!state.active || state.paused) return false;

    state.paused = true;
    state.pausedAt = Date.now();

    emit("checkpoints-paused", getState());
    return true;
  }

  function resume() {
    if (!state.active || !state.paused) return false;

    const now = Date.now();
    const pauseDuration = now - state.pausedAt;

    state.pausedDuration += pauseDuration;
    state.lapStartedAt += pauseDuration;
    state.paused = false;
    state.pausedAt = 0;

    emit("checkpoints-resumed", getState());
    return true;
  }

  function getCurrentCheckpoint() {
    return state.checkpoints[state.currentCheckpoint] || null;
  }

  function getProgress() {
    const total = state.checkpoints.length * state.totalLaps;

    const completed =
      (state.currentLap - 1) * state.checkpoints.length +
      state.currentCheckpoint;

    return {
      completed,
      total,
      percentage: total
        ? Math.min(100, Math.round(completed / total * 100))
        : 0
    };
  }

  function getState() {
    return {
      initialized: state.initialized,
      active: state.active,
      paused: state.paused,
      currentCheckpoint: state.currentCheckpoint,
      nextCheckpoint: getCurrentCheckpoint(),
      totalCheckpoints: state.checkpoints.length,
      completedCheckpoints: state.completedCheckpoints,
      currentLap: state.currentLap,
      totalLaps: state.totalLaps,
      bestLap: state.bestLap,
      lastLap: state.lastLap,
      elapsedTime: state.active
        ? Math.max(0, Date.now() - state.raceStartedAt - state.pausedDuration -
          (state.paused ? Date.now() - state.pausedAt : 0))
        : 0,
      progress: getProgress()
    };
  }

  function reset() {
    state.active = false;
    state.paused = false;
    state.currentCheckpoint = 0;
    state.completedCheckpoints = 0;
    state.currentLap = 1;
    state.lapTimes = [];
    state.bestLap = null;
    state.lastLap = null;
    state.raceStartedAt = 0;
    state.lapStartedAt = 0;
    state.pausedAt = 0;
    state.pausedDuration = 0;

    emit("checkpoints-reset", getState());
  }

  SX.checkpointManager = {
    setup,
    start,
    updatePosition,
    completeCurrentCheckpoint,
    getCurrentCheckpoint,
    getProgress,
    getState,
    pause,
    resume,
    reset
  };

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 55
   END
========================================================= */
