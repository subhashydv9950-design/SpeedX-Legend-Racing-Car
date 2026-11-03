/* =========================================================
   SUPERX LEGEND — FILE 105
   FILE: js/vehicle-race-session-stats.js
   MODULE: RACE SESSION STATISTICS
   START: RACE SESSION STATISTICS
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_race_session_stats_v2";
  const MAX_SESSIONS = 100;

  function number(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createId() {
    return "session_" + Date.now().toString(36) +
      "_" + Math.random().toString(36).slice(2, 9);
  }

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent("sx:" + name, {
      detail: detail || {}
    }));
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
      raceIds: [],
      completed: false
    };
  }

  function normalizeSession(item) {
    if (!item || typeof item !== "object") return null;

    return {
      id: String(item.id || createId()).slice(0, 100),
      startedAt: item.startedAt || new Date().toISOString(),
      endedAt: item.endedAt || null,
      durationSeconds: Math.max(0, number(item.durationSeconds)),
      racesPlayed: Math.max(0, Math.floor(number(item.racesPlayed))),
      racesWon: Math.max(0, Math.floor(number(item.racesWon))),
      racesLost: Math.max(0, Math.floor(number(item.racesLost))),
      totalDistanceKm: Math.max(0, number(item.totalDistanceKm)),
      totalCoins: Math.max(0, number(item.totalCoins)),
      totalXP: Math.max(0, number(item.totalXP)),
      bestPosition: item.bestPosition == null
        ? null
        : Math.max(1, Math.floor(number(item.bestPosition, 1))),
      bestLapSeconds: item.bestLapSeconds == null
        ? null
        : Math.max(0, number(item.bestLapSeconds)),
      totalPenalties: Math.max(0, number(item.totalPenalties)),
      raceModes: item.raceModes && typeof item.raceModes === "object"
        ? item.raceModes
        : {},
      raceIds: Array.isArray(item.raceIds)
        ? item.raceIds.map(String).slice(-200)
        : [],
      completed: item.completed === true
    };
  }

  function loadHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed)
        ? parsed.map(normalizeSession).filter(Boolean).slice(0, MAX_SESSIONS)
        : [];
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_SESSIONS)));
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

    emit("race-session-started", getCurrentSession());
    return getCurrentSession();
  }

  function getElapsedSeconds() {
    if (!currentSession) return 0;

    const active = timerStartedAt
      ? (Date.now() - timerStartedAt) / 1000
      : 0;

    return Math.max(0, Math.floor(accumulatedSeconds + active));
  }

  function pauseSession() {
    if (!currentSession || !timerStartedAt) return false;

    accumulatedSeconds += (Date.now() - timerStartedAt) / 1000;
    timerStartedAt = 0;

    emit("race-session-paused", getCurrentSession());
    return true;
  }

  function resumeSession() {
    if (!currentSession || currentSession.completed) return false;
    if (timerStartedAt) return true;

    timerStartedAt = Date.now();
    emit("race-session-resumed", getCurrentSession());
    return true;
  }

  function recordRace(data = {}) {
    if (!currentSession) startSession();

    const session = currentSession;
    const raceId = String(data.raceId || "").slice(0, 100);

    if (raceId && session.raceIds.includes(raceId)) {
      return {
        success: false,
        message: "Race already recorded in this session.",
        session: getCurrentSession()
      };
    }

    if (raceId) session.raceIds.push(raceId);

    session.racesPlayed += 1;

    const position = Math.max(0, Math.floor(number(data.position)));
    const won = data.won === true || position === 1;

    if (won) session.racesWon += 1;
    else session.racesLost += 1;

    session.totalDistanceKm += Math.max(0, number(data.distanceKm));
    session.totalCoins += Math.max(0, number(data.coins));
    session.totalXP += Math.max(0, number(data.xp));

    if (position > 0) {
      session.bestPosition = session.bestPosition === null
        ? position
        : Math.min(session.bestPosition, position);
    }

    const lap = number(data.bestLapSeconds);
    if (lap > 0) {
      session.bestLapSeconds = session.bestLapSeconds === null
        ? lap
        : Math.min(session.bestLapSeconds, lap);
    }

    session.totalPenalties += Math.max(0, number(data.penalties));

    const mode = String(data.mode || "unknown").slice(0, 40);
    session.raceModes[mode] = (number(session.raceModes[mode]) || 0) + 1;

    const snapshot = getCurrentSession();
    emit("race-session-race-recorded", {
      raceId,
      session: snapshot
    });

    return {
      success: true,
      session: snapshot
    };
  }

  function finishSession() {
    if (!currentSession) return null;

    if (timerStartedAt) {
      accumulatedSeconds += (Date.now() - timerStartedAt) / 1000;
    }

    timerStartedAt = 0;
    currentSession.durationSeconds = Math.floor(accumulatedSeconds);
    currentSession.endedAt = new Date().toISOString();
    currentSession.completed = true;

    const finished = clone(currentSession);

    history.unshift(normalizeSession(finished));
    history = history.slice(0, MAX_SESSIONS);

    currentSession = null;
    accumulatedSeconds = 0;

    const saved = save();

    if (SX.vehicleRaceSessionAchievements &&
        typeof SX.vehicleRaceSessionAchievements.recordSession === "function") {
      try {
        SX.vehicleRaceSessionAchievements.recordSession(finished);
      } catch (error) {
        console.warn("[SUPERX SessionStats] Achievement update failed:", error);
      }
    }

    emit("race-session-finished", {
      session: finished,
      saved
    });

    return finished;
  }

  function getCurrentSession() {
    if (!currentSession) return null;

    const copy = clone(currentSession);
    copy.durationSeconds = getElapsedSeconds();
    return copy;
  }

  function getHistory() {
    return clone(history);
  }

  function getSummary() {
    const summary = history.reduce((total, item) => {
      total.sessions += 1;
      total.races += number(item.racesPlayed);
      total.wins += number(item.racesWon);
      total.distanceKm += number(item.totalDistanceKm);
      total.coins += number(item.totalCoins);
      total.xp += number(item.totalXP);
      total.durationSeconds += number(item.durationSeconds);
      total.penalties += number(item.totalPenalties);
      return total;
    }, {
      sessions: 0,
      races: 0,
      wins: 0,
      losses: 0,
      distanceKm: 0,
      coins: 0,
      xp: 0,
      durationSeconds: 0,
      penalties: 0
    });

    summary.losses = Math.max(0, summary.races - summary.wins);
    summary.winRate = summary.races
      ? Number((summary.wins / summary.races * 100).toFixed(1))
      : 0;

    summary.distanceKm = Number(summary.distanceKm.toFixed(2));
    summary.coins = Math.floor(summary.coins);
    summary.xp = Math.floor(summary.xp);

    return summary;
  }

  function getBestSession() {
    if (!history.length) return null;

    const best = history.reduce((a, b) => {
      if (!a) return b;
      if (number(b.racesWon) !== number(a.racesWon)) {
        return number(b.racesWon) > number(a.racesWon) ? b : a;
      }
      return number(b.totalDistanceKm) > number(a.totalDistanceKm) ? b : a;
    }, null);

    return best ? clone(best) : null;
  }

  function deleteSession(id) {
    const before = history.length;
    history = history.filter(item => item.id !== String(id));

    if (history.length === before) return false;

    save();
    emit("race-session-deleted", { id: String(id) });
    return true;
  }

  function clearHistory() {
    history = [];
    const saved = save();
    emit("race-session-history-cleared", { saved });
    return saved;
  }

  function getState() {
    return {
      active: Boolean(currentSession),
      paused: Boolean(currentSession && !timerStartedAt),
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
    getElapsedSeconds,
    getCurrentSession,
    getHistory,
    getSummary,
    getBestSession,
    deleteSession,
    clearHistory,
    getState,
    reload: () => {
      history = loadHistory();
      return getHistory();
    }
  };

  console.info("[SUPERX] Race Session Statistics loaded.");

})(window);

/* =========================================================
   END: RACE SESSION STATISTICS — FILE 105
   ========================================================= */

