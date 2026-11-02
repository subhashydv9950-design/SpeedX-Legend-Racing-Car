
/* =========================================================
   SUPERX LEGEND — FILE 97
   FILE: js/vehicle-race-penalties.js
   START: VEHICLE RACE PENALTY SYSTEM
   ========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_race_penalties_v1";

  const CONFIG = {
    wrongWay: 3,
    trackLimit: 2,
    missedCheckpoint: 5,
    collision: 2,
    falseStart: 5,
    maximumPenalty: 120,
    historyLimit: 100,
    warningCooldown: 3000
  };

  let active = false;
  let totalPenalty = 0;
  let penalties = [];
  let warnings = [];
  let lastWarning = {};

  function num(value, fallback) {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
  }

  function load() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "{}"
      );

      totalPenalty = Math.max(
        0,
        num(saved.totalPenalty, 0)
      );

      penalties = Array.isArray(saved.penalties)
        ? saved.penalties.slice(0, CONFIG.historyLimit)
        : [];
    } catch (error) {
      totalPenalty = 0;
      penalties = [];
    }
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          totalPenalty,
          penalties
        })
      );
    } catch (error) {
      console.warn("[SUPERX Penalties] Save failed:", error);
    }
  }

  function start() {
    active = true;
    totalPenalty = 0;
    warnings = [];
    lastWarning = {};

    return {
      success: true,
      totalPenalty
    };
  }

  function add(type, seconds, detail) {
    if (!active) {
      return {
        success: false,
        message: "Penalty system is not active."
      };
    }

    const duration = Math.min(
      CONFIG.maximumPenalty,
      Math.max(0, num(seconds, 0))
    );

    if (duration <= 0) return false;

    totalPenalty += duration;

    const record = {
      id: "penalty_" + Date.now() + "_" + penalties.length,
      type: String(type),
      seconds: duration,
      detail: detail || {},
      timestamp: Date.now()
    };

    penalties.unshift(record);

    if (penalties.length > CONFIG.historyLimit) {
      penalties.length = CONFIG.historyLimit;
    }

    save();

    window.dispatchEvent(
      new CustomEvent("sx:race-penalty", {
        detail: {
          ...record,
          totalPenalty
        }
      })
    );

    return {
      success: true,
      penalty: record,
      totalPenalty
    };
  }

  function warn(type, message) {
    const now = Date.now();
    const key = String(type);

    if (
      lastWarning[key] &&
      now - lastWarning[key] < CONFIG.warningCooldown
    ) {
      return false;
    }

    lastWarning[key] = now;

    const warning = {
      type: key,
      message: String(message || "Race warning"),
      timestamp: now
    };

    warnings.unshift(warning);

    if (warnings.length > 30) {
      warnings.length = 30;
    }

    window.dispatchEvent(
      new CustomEvent("sx:race-warning", {
        detail: warning
      })
    );

    return warning;
  }

  function wrongWay(isWrongWay) {
    if (!active) return false;

    if (!isWrongWay) return false;

    return warn(
      "wrong_way",
      "Wrong way! Return to the racing route."
    );
  }

  function trackLimit(isOutside) {
    if (!active || !isOutside) return false;

    return warn(
      "track_limits",
      "Track limits exceeded."
    );
  }

  function missedCheckpoint(checkpointId) {
    return add(
      "missed_checkpoint",
      CONFIG.missedCheckpoint,
      { checkpointId: String(checkpointId) }
    );
  }

  function collision(severity) {
    const level = Math.max(
      0,
      Math.min(3, Math.floor(num(severity, 1)))
    );

    if (level === 0) return false;

    return add(
      "collision",
      CONFIG.collision * level,
      { severity: level }
    );
  }

  function falseStart() {
    return add(
      "false_start",
      CONFIG.falseStart,
      { reason: "Started before race signal." }
    );
  }

  function trackLimitPenalty() {
    return add(
      "track_limits",
      CONFIG.trackLimit,
      { reason: "Repeated track limit violation." }
    );
  }

  function applyWrongWayPenalty() {
    return add(
      "wrong_way",
      CONFIG.wrongWay,
      { reason: "Wrong-way driving." }
    );
  }

  function getTotalPenalty() {
    return totalPenalty;
  }

  function getAdjustedTime(raceMilliseconds) {
    const base = Math.max(
      0,
      num(raceMilliseconds, 0)
    );

    return base + totalPenalty * 1000;
  }

  function getWarnings() {
    return warnings.map(item => ({ ...item }));
  }

  function getPenalties(limit) {
    const count = Number.isInteger(limit) && limit > 0
      ? limit
      : penalties.length;

    return penalties.slice(0, count).map(
      item => ({ ...item })
    );
  }

  function getState() {
    return {
      active,
      totalPenalty,
      adjustedTimeExample: totalPenalty * 1000,
      penaltyCount: penalties.length,
      warningCount: warnings.length
    };
  }

  function finish() {
    if (!active) return false;

    active = false;
    save();

    const result = {
      totalPenalty,
      penaltyCount: penalties.length,
      penalties: getPenalties(),
      finishedAt: Date.now()
    };

    window.dispatchEvent(
      new CustomEvent("sx:race-penalties-finished", {
        detail: result
      })
    );

    return result;
  }

  function reset() {
    active = false;
    totalPenalty = 0;
    warnings = [];
    lastWarning = {};
    save();

    return true;
  }

  function clearHistory() {
    penalties = [];
    totalPenalty = 0;
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
    add,
    warn,
    wrongWay,
    trackLimit,
    missedCheckpoint,
    collision,
    falseStart,
    trackLimitPenalty,
    applyWrongWayPenalty,
    getTotalPenalty,
    getAdjustedTime,
    getWarnings,
    getPenalties,
    getState,
    finish,
    reset,
    clearHistory
  };

  SX.vehicleRacePenalties = api;

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
   END: VEHICLE RACE PENALTY SYSTEM — FILE 97
   ========================================================= */
