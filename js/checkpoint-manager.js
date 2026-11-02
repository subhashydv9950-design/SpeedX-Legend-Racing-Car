
/* =========================================================
   SUPERX LEGEND — FILE 55
   FILE: js/checkpoint-manager.js
   PURPOSE: Race checkpoints and lap tracking
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const state = {
    initialized: false,
    active: false,
    checkpoints: [],
    currentCheckpoint: 0,
    completedCheckpoints: 0,
    currentLap: 1,
    totalLaps: 1,
    lapTimes: [],
    lapStartedAt: 0,
    raceStartedAt: 0,
    bestLap: null,
    lastLap: null,
    totalDistance: 0
  };

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, {
      detail: detail || {}
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
      radius: Math.max(
        1,
        Number(checkpoint.radius) || 8
      )
    };
  }

  function setup(checkpoints, options) {
    if (!Array.isArray(checkpoints) || !checkpoints.length) {
      return false;
    }

    options = options || {};

    state.checkpoints = checkpoints.map(
      normalizeCheckpoint
    );

    state.totalLaps = Math.max(
      1,
      Math.floor(Number(options.totalLaps) || 1)
    );

    state.initialized = true;

    return true;
  }

  function start() {
    if (!state.initialized || !state.checkpoints.length) {
      return false;
    }

    state.active = true;
    state.currentCheckpoint = 0;
    state.completedCheckpoints = 0;
    state.currentLap = 1;
    state.lapTimes = [];
    state.bestLap = null;
    state.lastLap = null;
    state.totalDistance = 0;

    state.raceStartedAt = Date.now();
    state.lapStartedAt = Date.now();

    emit("sx:checkpoints-started", getState());

    return true;
  }

  function updatePosition(position) {
    if (!state.active || !position) return null;

    const current = {
      x: Number(position.x) || 0,
      y: Number(position.y) || 0,
      z: Number(position.z) || 0
    };

    const checkpoint =
      state.checkpoints[state.currentCheckpoint];

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
    if (!state.active) return null;

    const checkpoint =
      state.checkpoints[state.currentCheckpoint];

    state.completedCheckpoints++;

    emit("sx:checkpoint-reached", {
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

    const lapTime = now - state.lapStartedAt;

    state.lapTimes.push(lapTime);
    state.lastLap = lapTime;

    if (
      state.bestLap === null ||
      lapTime < state.bestLap
    ) {
      state.bestLap = lapTime;
    }

    emit("sx:lap-completed", {
      lap: state.currentLap,
      lapTime,
      bestLap: state.bestLap,
      totalLaps: state.totalLaps
    });

    if (state.currentLap >= state.totalLaps) {
      state.active = false;

      const result = {
        finished: true,
        totalTime: now - state.raceStartedAt,
        lapTimes: state.lapTimes.slice(),
        bestLap: state.bestLap
      };

      emit("sx:checkpoints-finished", result);

      return result;
    }

    state.currentLap++;
    state.currentCheckpoint = 0;
    state.lapStartedAt = now;

    emit("sx:new-lap-started", {
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
      currentCheckpoint: state.currentCheckpoint,
      totalCheckpoints: state.checkpoints.length,
      completedCheckpoints: state.completedCheckpoints,
      currentLap: state.currentLap,
      totalLaps: state.totalLaps,
      bestLap: state.bestLap,
      lastLap: state.lastLap,
      progress: getProgress()
    };
  }

  function reset() {
    state.active = false;
    state.currentCheckpoint = 0;
    state.completedCheckpoints = 0;
    state.currentLap = 1;
    state.lapTimes = [];
    state.bestLap = null;
    state.lastLap = null;
    state.totalDistance = 0;

    emit("sx:checkpoints-reset", getState());
  }

  SX.checkpointManager = {
    setup,
    start,
    updatePosition,
    completeCurrentCheckpoint,
    getCurrentCheckpoint,
    getProgress,
    getState,
    reset
  };

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 55 END
   ========================================================= */
    
