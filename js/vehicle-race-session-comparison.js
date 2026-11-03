
/* =========================================================
   SUPERX LEGEND — FILE 107
   FILE: js/vehicle-race-session-comparison.js
   MODULE: Race Session Comparison
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const historyManager = () =>
    SX.vehicleRaceSessionHistory || null;

  const statsManager = () =>
    SX.vehicleRaceSessionStats || null;

  const METRICS = [
    { key: "racesPlayed", label: "Races Played", lowerIsBetter: false },
    { key: "racesWon", label: "Races Won", lowerIsBetter: false },
    { key: "racesLost", label: "Races Lost", lowerIsBetter: true },
    { key: "totalDistanceKm", label: "Distance (km)", lowerIsBetter: false },
    { key: "durationSeconds", label: "Session Time (seconds)", lowerIsBetter: false },
    { key: "totalCoins", label: "Coins Earned", lowerIsBetter: false },
    { key: "totalXP", label: "XP Earned", lowerIsBetter: false },
    { key: "totalPenalties", label: "Penalties", lowerIsBetter: true }
  ];

  function number(value) {
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
  }

  function round(value) {
    return Number(number(value).toFixed(2));
  }

  function safeId(value) {
    return String(value == null ? "" : value).trim().slice(0, 120);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getSession(id) {
    const manager = historyManager();

    if (!manager || typeof manager.getSession !== "function") {
      return null;
    }

    try {
      return manager.getSession(safeId(id));
    } catch (error) {
      console.warn("[SUPERX Comparison] Session lookup failed:", error);
      return null;
    }
  }

  function calculateWinRate(session) {
    if (!session || typeof session !== "object") return 0;

    const played = Math.max(0, number(session.racesPlayed));

    if (!played) return 0;

    return round(
      Math.max(0, number(session.racesWon)) / played * 100
    );
  }

  function compareMetric(first, second, metric) {
    const a = number(first[metric.key]);
    const b = number(second[metric.key]);

    let winner = "tie";

    if (a !== b) {
      winner = metric.lowerIsBetter
        ? (a < b ? "first" : "second")
        : (a > b ? "first" : "second");
    }

    return {
      key: metric.key,
      label: metric.label,
      first: round(a),
      second: round(b),
      difference: round(a - b),
      winner,
      lowerIsBetter: metric.lowerIsBetter
    };
  }

  function compare(firstId, secondId) {
    const idA = safeId(firstId);
    const idB = safeId(secondId);

    if (!idA || !idB) {
      return {
        success: false,
        error: "Select two sessions to compare."
      };
    }

    if (idA === idB) {
      return {
        success: false,
        error: "Choose two different sessions."
      };
    }

    const first = getSession(idA);
    const second = getSession(idB);

    if (!first || !second) {
      return {
        success: false,
        error: "One or both sessions could not be found."
      };
    }

    const metrics = METRICS.map(metric =>
      compareMetric(first, second, metric)
    );

    const firstWinRate = calculateWinRate(first);
    const secondWinRate = calculateWinRate(second);

    metrics.push({
      key: "winRate",
      label: "Win Rate (%)",
      first: firstWinRate,
      second: secondWinRate,
      difference: round(firstWinRate - secondWinRate),
      winner: firstWinRate === secondWinRate
        ? "tie"
        : firstWinRate > secondWinRate
          ? "first"
          : "second",
      lowerIsBetter: false
    });

    const firstWins = metrics.filter(
      item => item.winner === "first"
    ).length;

    const secondWins = metrics.filter(
      item => item.winner === "second"
    ).length;

    const ties = metrics.length - firstWins - secondWins;

    let overallWinner = "tie";

    if (firstWins > secondWins) {
      overallWinner = "first";
    } else if (secondWins > firstWins) {
      overallWinner = "second";
    }

    return {
      success: true,

      first: {
        id: safeId(first.id),
        startedAt: first.startedAt || null,
        endedAt: first.endedAt || null,
        racesPlayed: number(first.racesPlayed),
        racesWon: number(first.racesWon),
        winRate: firstWinRate
      },

      second: {
        id: safeId(second.id),
        startedAt: second.startedAt || null,
        endedAt: second.endedAt || null,
        racesPlayed: number(second.racesPlayed),
        racesWon: number(second.racesWon),
        winRate: secondWinRate
      },

      metrics,

      score: {
        first: firstWins,
        second: secondWins,
        ties,
        overallWinner
      },

      comparedAt: new Date().toISOString()
    };
  }

  function compareLatest() {
    const manager = statsManager();

    if (!manager || typeof manager.getHistory !== "function") {
      return {
        success: false,
        error: "Session history is not available."
      };
    }

    let sessions;

    try {
      sessions = manager.getHistory();
    } catch (error) {
      return {
        success: false,
        error: "Could not load session history."
      };
    }

    if (!Array.isArray(sessions) || sessions.length < 2) {
      return {
        success: false,
        error: "At least two completed sessions are required."
      };
    }

    return compare(sessions[1].id, sessions[0].id);
  }

  function compareMany(ids) {
    if (!Array.isArray(ids)) {
      return {
        success: false,
        error: "Session IDs must be an array."
      };
    }

    const uniqueIds = Array.from(
      new Set(ids.map(safeId).filter(Boolean))
    ).slice(0, 10);

    if (uniqueIds.length < 2) {
      return {
        success: false,
        error: "Select at least two different sessions."
      };
    }

    const sessions = uniqueIds.map(getSession);

    if (sessions.some(session => !session)) {
      return {
        success: false,
        error: "One or more sessions could not be found."
      };
    }

    return {
      success: true,
      sessions: sessions.map(session => ({
        id: safeId(session.id),
        startedAt: session.startedAt || null,
        endedAt: session.endedAt || null,
        racesPlayed: number(session.racesPlayed),
        racesWon: number(session.racesWon),
        winRate: calculateWinRate(session),
        totalDistanceKm: round(session.totalDistanceKm),
        durationSeconds: number(session.durationSeconds),
        totalCoins: number(session.totalCoins),
        totalXP: number(session.totalXP),
        totalPenalties: number(session.totalPenalties)
      })),
      comparedAt: new Date().toISOString()
    };
  }

  function getMetricDefinitions() {
    return METRICS.map(metric => ({
      key: metric.key,
      label: metric.label,
      lowerIsBetter: metric.lowerIsBetter
    })).concat([{
      key: "winRate",
      label: "Win Rate (%)",
      lowerIsBetter: false
    }]);
  }

  SX.vehicleRaceSessionComparison = {
    compare,
    compareLatest,
    compareMany,
    calculateWinRate,
    getMetricDefinitions
  };

  console.info("[SUPERX] Race Session Comparison loaded.");

})(window);

/* ======================= END FILE 107 ======================= */
