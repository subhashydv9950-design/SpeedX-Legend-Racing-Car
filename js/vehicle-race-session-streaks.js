
/* =========================================================
   SUPERX LEGEND — FILE 113
   FILE: js/vehicle-race-session-streaks.js
   MODULE: Race Session Streak Tracker
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_race_session_streaks_v1";

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

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) return;

      const data = JSON.parse(raw);

      if (!data || typeof data !== "object") return;

      state.raceWins = positiveNumber(data.raceWins);
      state.bestRaceWins = positiveNumber(data.bestRaceWins);

      state.cleanRaces = positiveNumber(data.cleanRaces);
      state.bestCleanRaces = positiveNumber(data.bestCleanRaces);

      state.completedSessions = positiveNumber(data.completedSessions);
      state.bestSessions = positiveNumber(data.bestSessions);

      state.lastRaceId = data.lastRaceId || null;
      state.lastSessionId = data.lastSessionId || null;

      state.processedRaceIds = Array.isArray(data.processedRaceIds)
        ? data.processedRaceIds.slice(-500)
        : [];

      state.processedSessionIds = Array.isArray(data.processedSessionIds)
        ? data.processedSessionIds.slice(-200)
        : [];

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

  function rememberId(list, id, maximum) {
    if (!id) return false;

    const value = String(id).slice(0, 100);

    if (list.includes(value)) return false;

    list.push(value);

    if (list.length > maximum) {
      list.splice(0, list.length - maximum);
    }

    return true;
  }

  function recordRace(data = {}) {
    const raceId = data.raceId
      ? String(data.raceId)
      : null;

    if (
      raceId &&
      state.processedRaceIds.includes(raceId)
    ) {
      return {
        success: false,
        error: "Race already recorded.",
        streaks: getState()
      };
    }

    if (raceId) {
      rememberId(state.processedRaceIds, raceId, 500);
      state.lastRaceId = raceId;
    }

    const won = data.won === true ||
      Number(data.position) === 1;

    const clean = positiveNumber(data.penalties) === 0;

    if (won) {
      state.raceWins += 1;
      state.bestRaceWins = Math.max(
        state.bestRaceWins,
        state.raceWins
      );
    } else {
      state.raceWins = 0;
    }

    if (clean) {
      state.cleanRaces += 1;
      state.bestCleanRaces = Math.max(
        state.bestCleanRaces,
        state.cleanRaces
      );
    } else {
      state.cleanRaces = 0;
    }

    save();

    const result = {
      success: true,
      won,
      clean,
      streaks: getState()
    };

    window.dispatchEvent(new CustomEvent(
      "sx:race-streak-updated",
      { detail: result }
    ));

    return result;
  }

  function recordSession(session) {
    if (!session || !session.id) {
      return {
        success: false,
        error: "Valid session ID is required."
      };
    }

    const id = String(session.id).slice(0, 100);

    if (state.processedSessionIds.includes(id)) {
      return {
        success: false,
        error: "Session already recorded."
      };
    }

    rememberId(state.processedSessionIds, id, 200);

    state.lastSessionId = id;
    state.completedSessions += 1;

    state.bestSessions = Math.max(
      state.bestSessions,
      state.completedSessions
    );

    save();

    const result = getState();

    window.dispatchEvent(new CustomEvent(
      "sx:session-streak-updated",
      { detail: result }
    ));

    return {
      success: true,
      streaks: result
    };
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
        title: "Session Streak",
        current: state.completedSessions,
        best: state.bestSessions
      }
    ];
  }

  function reset() {
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

    save();

    return getState();
  }

  load();

  SX.vehicleRaceSessionStreaks = {
    recordRace,
    recordSession,
    getState,
    getHighlights,
    reset
  };

  console.info("[SUPERX] Race Session Streaks loaded.");

})(window);

/* ======================= END FILE 113 ======================= */
