
/* =========================================================
   SUPERX LEGEND — FILE 113
   FILE: js/vehicle-race-session-streaks.js
   MODULE: Advanced Race Streak Tracker
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_race_session_streaks_v2";
  const LEGACY_KEY = "superx_race_session_streaks_v1";

  const state = {
    raceWins: 0,
    bestRaceWins: 0,
    cleanRaces: 0,
    bestCleanRaces: 0,
    completedSessions: 0,
    bestSessions: 0,
    lastRaceId: null,
    lastSessionId: null,
    processedRaceIds: [],
    processedSessionIds: []
  };

  function positiveNumber(value) {
    const result = Number(value);

    return Number.isFinite(result)
      ? Math.max(0, Math.floor(result))
      : 0;
  }

  function safeId(value) {
    return value == null
      ? null
      : String(value).trim().slice(0, 100) || null;
  }

  function uniqueIds(value, maximum) {
    if (!Array.isArray(value)) return [];

    return [...new Set(
      value.map(safeId).filter(Boolean)
    )].slice(-maximum);
  }

  function applyData(data) {
    if (!data || typeof data !== "object") return;

    state.raceWins = positiveNumber(data.raceWins);
    state.bestRaceWins = Math.max(
      state.raceWins,
      positiveNumber(data.bestRaceWins)
    );

    state.cleanRaces = positiveNumber(data.cleanRaces);
    state.bestCleanRaces = Math.max(
      state.cleanRaces,
      positiveNumber(data.bestCleanRaces)
    );

    state.completedSessions = positiveNumber(data.completedSessions);
    state.bestSessions = Math.max(
      state.completedSessions,
      positiveNumber(data.bestSessions)
    );

    state.lastRaceId = safeId(data.lastRaceId);
    state.lastSessionId = safeId(data.lastSessionId);

    state.processedRaceIds = uniqueIds(
      data.processedRaceIds,
      500
    );

    state.processedSessionIds = uniqueIds(
      data.processedSessionIds,
      200
    );
  }

  function load() {
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      const legacy = localStorage.getItem(LEGACY_KEY);
      const raw = current || legacy;

      if (!raw) return;

      const data = JSON.parse(raw);
      applyData(data);

      if (!current && legacy) save();

    } catch (error) {
      console.warn("[SUPERX Streaks] Load failed:", error);
    }
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
      );

      return true;
    } catch (error) {
      console.warn("[SUPERX Streaks] Save failed:", error);
      return false;
    }
  }

  function snapshot() {
    return JSON.parse(JSON.stringify(state));
  }

  function restore(previous) {
    Object.keys(state).forEach(key => {
      state[key] = previous[key];
    });
  }

  function rememberId(list, id, maximum) {
    const value = safeId(id);

    if (!value || list.includes(value)) return false;

    list.push(value);

    if (list.length > maximum) {
      list.splice(0, list.length - maximum);
    }

    return true;
  }

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent("sx:" + name, {
      detail
    }));
  }

  function getState() {
    return {
      raceWins: state.raceWins,
      bestRaceWins: state.bestRaceWins,
      cleanRaces: state.cleanRaces,
      bestCleanRaces: state.bestCleanRaces,
      completedSessions: state.completedSessions,
      bestSessions: state.bestSessions,
      lastRaceId: state.lastRaceId,
      lastSessionId: state.lastSessionId
    };
  }

  function recordRace(data = {}) {
    const raceId = safeId(data.raceId);

    if (raceId && state.processedRaceIds.includes(raceId)) {
      return {
        success: false,
        error: "Race already recorded.",
        streaks: getState()
      };
    }

    const previous = snapshot();

    if (raceId) {
      rememberId(state.processedRaceIds, raceId, 500);
      state.lastRaceId = raceId;
    }

    const won = data.won === true ||
      Number(data.position) === 1;

    const penalties = Math.max(0, Number(data.penalties) || 0);
    const clean = penalties === 0;

    state.raceWins = won ? state.raceWins + 1 : 0;
    state.bestRaceWins = Math.max(
      state.bestRaceWins,
      state.raceWins
    );

    state.cleanRaces = clean ? state.cleanRaces + 1 : 0;
    state.bestCleanRaces = Math.max(
      state.bestCleanRaces,
      state.cleanRaces
    );

    if (!save()) {
      restore(previous);

      return {
        success: false,
        error: "Could not save race streak."
      };
    }

    const result = {
      success: true,
      won,
      clean,
      streaks: getState()
    };

    emit("race-streak-updated", result);

    if (state.raceWins > 0) {
      emit("race-winning-streak", {
        current: state.raceWins,
        best: state.bestRaceWins
      });
    }

    if (state.cleanRaces > 0) {
      emit("race-clean-streak", {
        current: state.cleanRaces,
        best: state.bestCleanRaces
      });
    }

    return result;
  }

  function recordSession(session) {
    if (!session || !session.id) {
      return {
        success: false,
        error: "Valid session ID is required."
      };
    }

    const id = safeId(session.id);

    if (state.processedSessionIds.includes(id)) {
      return {
        success: false,
        error: "Session already recorded.",
        streaks: getState()
      };
    }

    const previous = snapshot();

    rememberId(state.processedSessionIds, id, 200);

    state.lastSessionId = id;
    state.completedSessions += 1;

    state.bestSessions = Math.max(
      state.bestSessions,
      state.completedSessions
    );

    if (!save()) {
      restore(previous);

      return {
        success: false,
        error: "Could not save session streak."
      };
    }

    const result = getState();

    emit("session-streak-updated", result);

    return {
      success: true,
      streaks: result
    };
  }

  function getHighlights() {
    return [
      {
        id: "raceWins",
        title: "Winning Streak",
        current: state.raceWins,
        best: state.bestRaceWins
      },
      {
        id: "cleanRaces",
        title: "Clean Race Streak",
        current: state.cleanRaces,
        best: state.bestCleanRaces
      },
      {
        id: "sessions",
        title: "Completed Sessions",
        current: state.completedSessions,
        best: state.bestSessions
      }
    ];
  }

  function getSummary() {
    return {
      ...getState(),
      highlights: getHighlights(),
      totalTrackedRaces: state.processedRaceIds.length,
      totalTrackedSessions: state.processedSessionIds.length
    };
  }

  function reset() {
    const previous = snapshot();

    state.raceWins = 0;
    state.bestRaceWins = 0;
    state.cleanRaces = 0;
    state.bestCleanRaces = 0;
    state.completedSessions = 0;
    state.bestSessions = 0;
    state.lastRaceId = null;
    state.lastSessionId = null;
    state.processedRaceIds = [];
    state.processedSessionIds = [];

    if (!save()) {
      restore(previous);
      return {
        success: false,
        error: "Could not reset streak data."
      };
    }

    emit("race-streaks-reset", getState());

    return {
      success: true,
      streaks: getState()
    };
  }

  load();

  SX.vehicleRaceSessionStreaks = {
    recordRace,
    recordSession,
    getState,
    getHighlights,
    getSummary,
    reset
  };

  console.info("[SUPERX] Advanced Race Streak Tracker loaded.");

})(window);

/* ======================= END FILE 113 ======================= */
