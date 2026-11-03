/* =========================================================
   SUPERX LEGEND — FILE 97
   FILE: js/vehicle-race-penalties.js
   START: VEHICLE RACE PENALTY SYSTEM
   ========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};
  const STORAGE_KEY = "superx_race_penalties_v2";

  const CONFIG = {
    wrongWay: 3,
    trackLimit: 2,
    missedCheckpoint: 5,
    collision: 2,
    falseStart: 5,
    maximumPenalty: 120,
    historyLimit: 100,
    warningLimit: 30,
    warningCooldown: 3000
  };

  let active = false;
  let totalPenalty = 0;
  let penalties = [];
  let warnings = [];
  let lastWarning = Object.create(null);
  let sessionId = null;

  function num(value, fallback = 0) {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
  }

  function emit(name, detail = {}) {
    window.dispatchEvent(
      new CustomEvent(name, { detail })
    );
  }

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return {};
    }
  }

  function load() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "{}"
      );

      penalties = Array.isArray(saved.penalties)
        ? saved.penalties
            .filter(item => item && typeof item === "object")
            .slice(0, CONFIG.historyLimit)
        : [];

      totalPenalty = Math.max(
        0,
        num(saved.totalPenalty)
      );
    } catch (_) {
      penalties = [];
      totalPenalty = 0;
    }
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          totalPenalty,
          penalties: penalties.slice(0, CONFIG.historyLimit),
          savedAt: Date.now()
        })
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  function start(options = {}) {
    active = true;
    totalPenalty = 0;
    warnings = [];
    lastWarning = Object.create(null);
    sessionId = String(
      options.sessionId || ("race_" + Date.now())
    );

    emit("sx:race-penalties-started", {
      sessionId
    });

    return {
      success: true,
      sessionId,
      totalPenalty
    };
  }

  function add(type, seconds, detail = {}) {
    if (!active) {
      return {
        success: false,
        message: "Penalty system is not active."
      };
    }

    const duration = Math.min(
      CONFIG.maximumPenalty,
      Math.max(0, num(seconds))
    );

    if (duration <= 0) return false;

    const record = {
      id: "penalty_" + Date.now() + "_" +
        Math.random().toString(36).slice(2, 8),
      sessionId,
      type: String(type || "general"),
      seconds: duration,
      detail: clone(detail),
      timestamp: Date.now()
    };

    totalPenalty += duration;
    penalties.unshift(record);

    if (penalties.length > CONFIG.historyLimit) {
      penalties.length = CONFIG.historyLimit;
    }

    save();

    emit("sx:race-penalty", {
      ...record,
      totalPenalty
    });

    return {
      success: true,
      penalty: { ...record },
      totalPenalty
    };
  }

  function warn(type, message) {
    if (!active) return false;

    const now = Date.now();
    const key = String(type || "general");

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

    if (warnings.length > CONFIG.warningLimit) {
      warnings.length = CONFIG.warningLimit;
    }

    emit("sx:race-warning", warning);

    return { ...warning };
  }

  function wrongWay(isWrongWay) {
    if (!active || !isWrongWay) return false;

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
      { checkpointId: String(checkpointId ?? "unknown") }
    );
  }

  function collision(severity = 1) {
    const level = Math.max(
      0,
      Math.min(3, Math.floor(num(severity, 1)))
    );

    if (!active || level === 0) return false;

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
    return Math.max(0, num(raceMilliseconds)) +
      totalPenalty * 1000;
  }

  function getWarnings() {
    return warnings.map(item => ({ ...item }));
  }

  function getPenalties(limit) {
    const count = Number.isInteger(limit) && limit > 0
      ? limit
      : penalties.length;

    return penalties.slice(0, count).map(item => ({
      ...item,
      detail: clone(item.detail)
    }));
  }

  function getState() {
    return {
      active,
      sessionId,
      totalPenalty,
      adjustedTimeExample: totalPenalty * 1000,
      penaltyCount: penalties.filter(
        item => item.sessionId === sessionId
      ).length,
      warningCount: warnings.length
    };
  }

  function finish() {
    if (!active) return false;

    active = false;
    save();

    const sessionPenalties = penalties.filter(
      item => item.sessionId === sessionId
    );

    const result = {
      sessionId,
      totalPenalty,
      penaltyCount: sessionPenalties.length,
      penalties: sessionPenalties.map(item => ({
        ...item,
        detail: clone(item.detail)
      })),
      finishedAt: Date.now()
    };

    emit("sx:race-penalties-finished", result);

    return result;
  }

  function reset() {
    active = false;
    totalPenalty = 0;
    warnings = [];
    lastWarning = Object.create(null);
    sessionId = null;
    save();

    emit("sx:race-penalties-reset");

    return true;
  }

  function clearHistory() {
    penalties = [];
    totalPenalty = 0;
    save();

    emit("sx:race-penalties-history-cleared");

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
    document.addEventListener("DOMContentLoaded", init, {
      once: true
    });
  } else {
    init();
  }

})();

/* =========================================================
   END: VEHICLE RACE PENALTY SYSTEM — FILE 97
   ========================================================= */

