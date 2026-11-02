
/* =========================================================
   SUPERX LEGEND — FILE 96
   FILE: js/vehicle-stunt-score.js
   START: VEHICLE STUNT SCORE SYSTEM
   ========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_stunt_score_v1";

  const CONFIG = {
    minimumJumpHeight: 0.8,
    minimumAirTime: 0.4,
    comboWindow: 3,
    maximumCombo: 5,
    historyLimit: 50
  };

  let session = null;
  let totalPoints = 0;
  let bestScore = 0;
  let history = [];
  let combo = 0;
  let lastStuntAt = 0;

  function num(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
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
      console.warn("[SUPERX Stunt] Save failed:", error);
    }
  }

  function start() {
    if (session) {
      return {
        success: false,
        message: "Stunt session already active."
      };
    }

    session = {
      score: 0,
      jumps: 0,
      wheelies: 0,
      nearMisses: 0,
      totalAirTime: 0,
      bestJumpDistance: 0,
      currentJump: null,
      stunts: [],
      startedAt: Date.now()
    };

    return {
      success: true,
      state: getState()
    };
  }

  function addScore(type, basePoints, detail) {
    if (!session) return 0;

    const now = Date.now();

    if (
      lastStuntAt &&
      (now - lastStuntAt) / 1000 <= CONFIG.comboWindow
    ) {
      combo = Math.min(
        CONFIG.maximumCombo,
        combo + 1
      );
    } else {
      combo = 1;
    }

    lastStuntAt = now;

    const multiplier = 1 + (combo - 1) * 0.5;

    const points = Math.round(
      Math.max(0, basePoints) * multiplier
    );

    session.score += points;

    const stunt = {
      type,
      points,
      multiplier,
      combo,
      detail: detail || {},
      timestamp: now
    };

    session.stunts.push(stunt);

    window.dispatchEvent(
      new CustomEvent("sx:stunt-score-update", {
        detail: stunt
      })
    );

    return points;
  }

  function startJump(data) {
    if (!session) return false;

    if (session.currentJump) {
      return {
        success: false,
        message: "A jump is already being recorded."
      };
    }

    const state = data || {};

    session.currentJump = {
      startedAt: Date.now(),
      startHeight: num(state.height, 0),
      startX: num(state.x, 0),
      startZ: num(state.z, 0),
      airTime: 0,
      maximumHeight: 0
    };

    return true;
  }

  function updateJump(data) {
    if (!session || !session.currentJump) return false;

    const state = data || {};
    const jump = session.currentJump;

    const height = num(state.height, 0);

    jump.airTime = Math.max(
      0,
      (Date.now() - jump.startedAt) / 1000
    );

    jump.maximumHeight = Math.max(
      jump.maximumHeight,
      height - jump.startHeight
    );

    return {
      airTime: jump.airTime,
      maximumHeight: jump.maximumHeight
    };
  }

  function landJump(data) {
    if (!session || !session.currentJump) {
      return {
        success: false,
        message: "No active jump."
      };
    }

    const state = data || {};
    const jump = session.currentJump;

    const endX = num(state.x, jump.startX);
    const endZ = num(state.z, jump.startZ);

    const dx = endX - jump.startX;
    const dz = endZ - jump.startZ;

    const distance = Math.sqrt(
      dx * dx + dz * dz
    );

    const airTime = Math.max(
      jump.airTime,
      (Date.now() - jump.startedAt) / 1000
    );

    const landingQuality = clamp(
      num(state.landingQuality, 1),
      0,
      1
    );

    const validJump =
      airTime >= CONFIG.minimumAirTime &&
      jump.maximumHeight >= CONFIG.minimumJumpHeight;

    session.jumps++;
    session.totalAirTime += airTime;

    session.bestJumpDistance = Math.max(
      session.bestJumpDistance,
      distance
    );

    let points = 0;

    if (validJump) {
      points = Math.round(
        airTime * 100 +
        jump.maximumHeight * 50 +
        distance * 2
      );

      points = Math.round(points * landingQuality);

      addScore("jump", points, {
        airTime,
        distance,
        maximumHeight: jump.maximumHeight,
        landingQuality
      });
    }

    session.currentJump = null;

    return {
      success: true,
      validJump,
      points,
      airTime,
      distance,
      landingQuality
    };
  }

  function recordWheelie(duration, quality) {
    if (!session) return false;

    const seconds = clamp(num(duration, 0), 0, 30);
    const multiplier = clamp(num(quality, 1), 0, 1);

    if (seconds < 0.5) return false;

    session.wheelies++;

    return addScore(
      "wheelie",
      Math.round(seconds * 40 * multiplier),
      {
        duration: seconds,
        quality: multiplier
      }
    );
  }

  function recordNearMiss(distance, speed) {
    if (!session) return false;

    const gap = num(distance, 999);

    if (gap < 0 || gap > 3) return false;

    const vehicleSpeed = Math.max(
      0,
      num(speed, 0)
    );

    session.nearMisses++;

    return addScore(
      "near_miss",
      Math.round(50 + vehicleSpeed * 0.5),
      {
        distance: gap,
        speed: vehicleSpeed
      }
    );
  }

  function recordBarrelRoll(rotations) {
    if (!session) return false;

    const count = clamp(
      Math.floor(num(rotations, 0)),
      1,
      3
    );

    return addScore(
      "barrel_roll",
      count * 250,
      { rotations: count }
    );
  }

  function finish() {
    if (!session) {
      return {
        success: false,
        message: "No active stunt session."
      };
    }

    const result = {
      id: "stunt_" + Date.now(),
      score: session.score,
      jumps: session.jumps,
      wheelies: session.wheelies,
      nearMisses: session.nearMisses,
      totalAirTime: Number(session.totalAirTime.toFixed(2)),
      bestJumpDistance: Number(
        session.bestJumpDistance.toFixed(2)
      ),
      stuntCount: session.stunts.length,
      stunts: session.stunts.slice(),
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

    session = null;
    combo = 0;
    lastStuntAt = 0;

    window.dispatchEvent(
      new CustomEvent("sx:stunt-session-finished", {
        detail: result
      })
    );

    return {
      success: true,
      result
    };
  }

  function cancel() {
    session = null;
    combo = 0;
    lastStuntAt = 0;
    return true;
  }

  function getState() {
    return {
      active: !!session,
      score: session ? session.score : 0,
      jumps: session ? session.jumps : 0,
      wheelies: session ? session.wheelies : 0,
      nearMisses: session ? session.nearMisses : 0,
      combo,
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
    return {
      totalPoints,
      bestScore,
      sessions: history.length,
      totalJumps: history.reduce(
        (sum, item) => sum + item.jumps,
        0
      ),
      totalWheelies: history.reduce(
        (sum, item) => sum + item.wheelies,
        0
      ),
      totalNearMisses: history.reduce(
        (sum, item) => sum + item.nearMisses,
        0
      )
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
    addScore,
    startJump,
    updateJump,
    landJump,
    recordWheelie,
    recordNearMiss,
    recordBarrelRoll,
    finish,
    cancel,
    getState,
    getHistory,
    getStatistics,
    clearHistory
  };

  SX.vehicleStuntScore = api;

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
   END: VEHICLE STUNT SCORE SYSTEM — FILE 96
   ========================================================= */
  
