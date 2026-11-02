
/* =========================================================
   SUPERX LEGEND — FILE 105
   FILE: js/vehicle-race-session-stats.js
   MODULE: Race Session Statistics
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_race_session_stats_v1";
  const MAX_SESSIONS = 100;

  function number(value, fallback = 0) {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
  }

  function createId() {
    return "session_" +
      Date.now().toString(36) + "_" +
      Math.random().toString(36).slice(2, 8);
  }

  function createEmptySession() {
    return {
      id: createId(),
      startedAt: new Date().toISOString(),
      endedAt: null,
      durationSeconds: 0,
      racesPlayed: 0,
      racesWon: 0,
      racesLost: 0,
      totalDistanceKm: 0,
      totalCoins: 0,
      totalXP: 0,
      bestPosition: null,
      bestLapSeconds: null,
      totalPenalties: 0,
      raceModes: {},
      completed: false
    };
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];

      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) return [];

      return parsed.slice(0, MAX_SESSIONS)
        .filter(item => item && typeof item === "object");

    } catch (error) {
      console.warn("[SUPERX SessionStats] Load failed:", error);
      return [];
    }
  }

  let history = loadHistory();
  let currentSession = null;
  let timerStartedAt = 0;
  let accumulatedSeconds = 0;

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(history.slice(0, MAX_SESSIONS))
      );
      return true;
    } catch (error) {
      console.warn("[SUPERX SessionStats] Save failed:", error);
      return false;
    }
  }

  function startSession() {
    if (currentSession && !currentSession.completed) {
      return getCurrentSession();
    }

    currentSession = createEmptySession();
    timerStartedAt = Date.now();
    accumulatedSeconds = 0;

    return getCurrentSession();
  }

  function getElapsedSeconds() {
    if (!currentSession) return 0;

    const activeSeconds = timerStartedAt
      ? (Date.now() - timerStartedAt) / 1000
      : 0;

    return Math.max(
      0,
      Math.floor(accumulatedSeconds + activeSeconds)
    );
  }

  function pauseSession() {
    if (!currentSession || !timerStartedAt) return false;

    accumulatedSeconds += (Date.now() - timerStartedAt) / 1000;
    timerStartedAt = 0;

    return true;
  }

  function resumeSession() {
    if (!currentSession || currentSession.completed) return false;
    if (timerStartedAt) return true;

    timerStartedAt = Date.now();
    return true;
  }

  function recordRace(data = {}) {
    if (!currentSession) startSession();

    const session = currentSession;

    session.racesPlayed += 1;

    const position = Math.max(
      0,
      Math.floor(number(data.position, 0))
    );

    const won = data.won === true || position === 1;

    if (won) {
      session.racesWon += 1;
    } else {
      session.racesLost += 1;
    }

    const distance = Math.max(
      0,
      number(data.distanceKm, 0)
    );

    session.totalDistanceKm += distance;

    session.totalCoins += Math.max(
      0,
      number(data.coins, 0)
    );

    session.totalXP += Math.max(
      0,
      number(data.xp, 0)
    );

    if (position > 0) {
      session.bestPosition = session.bestPosition === null
        ? position
        : Math.min(session.bestPosition, position);
    }

    const lap = number(data.bestLapSeconds, 0);

    if (lap > 0) {
      session.bestLapSeconds =
        session.bestLapSeconds === null
          ? lap
          : Math.min(session.bestLapSeconds, lap);
    }

    session.totalPenalties += Math.max(
      0,
      number(data.penalties, 0)
    );

    const mode = String(data.mode || "unknown").slice(0, 40);

    session.raceModes[mode] =
      (session.raceModes[mode] || 0) + 1;

    return getCurrentSession();
  }

  function finishSession() {
    if (!currentSession) return null;

    if (timerStartedAt) {
      accumulatedSeconds +=
        (Date.now() - timerStartedAt) / 1000;
    }

    timerStartedAt = 0;

    currentSession.durationSeconds =
      Math.floor(accumulatedSeconds);

    currentSession.endedAt = new Date().toISOString();
    currentSession.completed = true;

    history.unshift(currentSession);
    history = history.slice(0, MAX_SESSIONS);

    const finished = JSON.parse(
      JSON.stringify(currentSession)
    );

    currentSession = null;
    accumulatedSeconds = 0;

    save();

    window.dispatchEvent(new CustomEvent(
      "sx:race-session-finished",
      { detail: finished }
    ));

    return finished;
  }

  function getCurrentSession() {
    if (!currentSession) return null;

    const copy = JSON.parse(
      JSON.stringify(currentSession)
    );

    copy.durationSeconds = getElapsedSeconds();

    return copy;
  }

  function getHistory() {
    return history.map(item =>
      JSON.parse(JSON.stringify(item))
    );
  }

  function getSummary() {
    const total = history.reduce((summary, item) => {
      summary.sessions += 1;
      summary.races += number(item.racesPlayed);
      summary.wins += number(item.racesWon);
      summary.distanceKm += number(item.totalDistanceKm);
      summary.coins += number(item.totalCoins);
      summary.xp += number(item.totalXP);
      summary.durationSeconds += number(item.durationSeconds);
      return summary;
    }, {
      sessions: 0,
      races: 0,
      wins: 0,
      distanceKm: 0,
      coins: 0,
      xp: 0,
      durationSeconds: 0
    });

    total.losses = Math.max(0, total.races - total.wins);

    total.winRate = total.races
      ? Number((total.wins / total.races * 100).toFixed(1))
      : 0;

    total.distanceKm = Number(
      total.distanceKm.toFixed(2)
    );

    return total;
  }

  function getBestSession() {
    if (!history.length) return null;

    const best = history.reduce((currentBest, item) => {
      if (!currentBest) return item;

      return number(item.racesWon) >
        number(currentBest.racesWon)
        ? item
        : currentBest;
    }, null);

    return best
      ? JSON.parse(JSON.stringify(best))
      : null;
  }

  function deleteSession(id) {
    const initialLength = history.length;

    history = history.filter(item => item.id !== id);

    if (history.length === initialLength) return false;

    save();
    return true;
  }

  function clearHistory() {
    history = [];
    save();
    return true;
  }

  function getState() {
    return {
      active: Boolean(currentSession),
      current: getCurrentSession(),
      summary: getSummary(),
      historyCount: history.length
    };
  }

  SX.vehicleRaceSessionStats = {
    startSession,
    pauseSession,
    resumeSession,
    recordRace,
    finishSession,
    getCurrentSession,
    getHistory,
    getSummary,
    getBestSession,
    deleteSession,
    clearHistory,
    getState
  };

  console.info("[SUPERX] Race Session Statistics loaded.");

})(window);

/* ======================= END FILE 105 ======================= */
