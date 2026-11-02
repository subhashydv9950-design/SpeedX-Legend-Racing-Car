
/* =========================================================
   SUPERX LEGEND — FILE 95
   FILE: js/vehicle-drift-score.js
   START: VEHICLE DRIFT SCORE SYSTEM
   ========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_drift_score_v1";

  const CONFIG = {
    minimumSpeed: 25,
    minimumAngle: 8,
    maximumAngle: 75,
    comboWindow: 2.5,
    baseMultiplier: 1,
    maximumMultiplier: 5,
    historyLimit: 50
  };

  let session = null;
  let totalPoints = 0;
  let bestScore = 0;
  let history = [];
  let lastDriftTime = 0;
  let combo = 0;
  let multiplier = 1;

  function num(value, fallback) {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function load() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "{}"
      );

      totalPoints = Math.max(0, num(saved.totalPoints, 0));
      bestScore = Math.max(0, num(saved.bestScore, 0));

      history = Array.isArray(saved.history)
        ? saved.history.slice(0, CONFIG.historyLimit)
        : [];
    } catch (error) {
      totalPoints = 0;
      bestScore = 0;
      history = [];
    }
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          totalPoints,
          bestScore,
          history
        })
      );
    } catch (error) {
      console.warn("[SUPERX Drift] Save failed:", error);
    }
  }

  function start() {
    if (session && session.active) {
      return {
        success: false,
        message: "Drift session is already active."
      };
    }

    session = {
      active: true,
      startedAt: Date.now(),
      duration: 0,
      score: 0,
      maximumAngle: 0,
      maximumSpeed: 0,
      totalAngle: 0,
      samples: 0,
      combo: 0,
      multiplier: 1,
      lastAngle: 0,
      lastSpeed: 0
    };

    window.dispatchEvent(
      new CustomEvent("sx:drift-started")
    );

    return {
      success: true,
      state: getState()
    };
  }

  function update(data) {
    if (!session || !session.active) return null;

    const state = data || {};

    const speed = Math.abs(num(state.speed, 0));
    const angle = Math.abs(num(state.angle, 0));
    const dt = clamp(num(state.deltaTime, 0.016), 0, 0.1);

    const now = Date.now();

    if (
      speed < CONFIG.minimumSpeed ||
      angle < CONFIG.minimumAngle
    ) {
      return {
        drifting: false,
        score: session.score,
        multiplier: session.multiplier
      };
    }

    const validAngle = clamp(
      angle,
      CONFIG.minimumAngle,
      CONFIG.maximumAngle
    );

    if (
      lastDriftTime > 0 &&
      (now - lastDriftTime) / 1000 <= CONFIG.comboWindow
    ) {
      combo++;
    } else {
      combo = 1;
    }

    lastDriftTime = now;

    multiplier = clamp(
      CONFIG.baseMultiplier + Math.floor(combo / 5),
      1,
      CONFIG.maximumMultiplier
    );

    const angleFactor = validAngle / 30;
    const speedFactor = speed / 100;

    const earned = Math.max(
      0,
      Math.round(
        angleFactor *
        speedFactor *
        100 *
        dt *
        multiplier
      )
    );

    session.score += earned;
    session.duration += dt;
    session.maximumAngle = Math.max(
      session.maximumAngle,
      validAngle
    );
    session.maximumSpeed = Math.max(
      session.maximumSpeed,
      speed
    );
    session.totalAngle += validAngle;
    session.samples++;
    session.combo = combo;
    session.multiplier = multiplier;
    session.lastAngle = validAngle;
    session.lastSpeed = speed;

    window.dispatchEvent(
      new CustomEvent("sx:drift-score-update", {
        detail: {
          earned,
          score: session.score,
          angle: validAngle,
          speed,
          combo,
          multiplier
        }
      })
    );

    return {
      drifting: true,
      earned,
      score: session.score,
      combo,
      multiplier,
      angle: validAngle,
      speed
    };
  }

  function finish() {
    if (!session || !session.active) {
      return {
        success: false,
        message: "No active drift session."
      };
    }

    session.active = false;

    const result = {
      id: "drift_" + Date.now(),
      score: session.score,
      duration: Number(session.duration.toFixed(2)),
      maximumAngle: Number(session.maximumAngle.toFixed(1)),
      maximumSpeed: Number(session.maximumSpeed.toFixed(1)),
      averageAngle: session.samples
        ? Number(
            (session.totalAngle / session.samples).toFixed(1)
          )
        : 0,
      samples: session.samples,
      completedAt: Date.now()
    };

    totalPoints += result.score;

    bestScore = Math.max(
      bestScore,
      result.score
    );

    history.unshift(result);

    if (history.length > CONFIG.historyLimit) {
      history.length = CONFIG.historyLimit;
    }

    save();

    window.dispatchEvent(
      new CustomEvent("sx:drift-finished", {
        detail: result
      })
    );

    session = null;
    lastDriftTime = 0;
    combo = 0;
    multiplier = 1;

    return {
      success: true,
      result
    };
  }

  function cancel() {
    if (!session) return false;

    session = null;
    lastDriftTime = 0;
    combo = 0;
    multiplier = 1;

    return true;
  }

  function getState() {
    return {
      active: !!(session && session.active),
      score: session ? session.score : 0,
      duration: session ? session.duration : 0,
      combo: session ? session.combo : 0,
      multiplier: session ? session.multiplier : 1,
      maximumAngle: session ? session.maximumAngle : 0,
      maximumSpeed: session ? session.maximumSpeed : 0,
      totalPoints,
      bestScore
    };
  }

  function getHistory(limit) {
    const count = Number.isInteger(limit) && limit > 0
      ? limit
      : history.length;

    return history.slice(0, count).map(
      item => ({ ...item })
    );
  }

  function getStatistics() {
    const completed = history.length;

    const averageScore = completed
      ? history.reduce((sum, item) => sum + item.score, 0) / completed
      : 0;

    return {
      totalPoints,
      bestScore,
      sessionsCompleted: completed,
      averageScore: Number(averageScore.toFixed(1))
    };
  }

  function clearHistory() {
    history = [];
    save();
    return true;
  }

  function init() {
    load();
    return api;
  }

  const api = {
    init,
    start,
    update,
    finish,
    cancel,
    getState,
    getHistory,
    getStatistics,
    clearHistory
  };

  SX.vehicleDriftScore = api;

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }

})();

/* =========================================================
   END: VEHICLE DRIFT SCORE SYSTEM — FILE 95
   ========================================================= */
