
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
    {
      key: "racesPlayed",
      label: "Races Played",
      lowerIsBetter: false
    },
    {
      key: "racesWon",
      label: "Races Won",
      lowerIsBetter: false
    },
    {
      key: "racesLost",
      label: "Races Lost",
      lowerIsBetter: true
    },
    {
      key: "totalDistanceKm",
      label: "Distance (km)",
      lowerIsBetter: false
    },
    {
      key: "durationSeconds",
      label: "Session Time (seconds)",
      lowerIsBetter: false
    },
    {
      key: "totalCoins",
      label: "Coins Earned",
      lowerIsBetter: false
    },
    {
      key: "totalXP",
      label: "XP Earned",
      lowerIsBetter: false
    },
    {
      key: "totalPenalties",
      label: "Penalties",
      lowerIsBetter: true
    }
  ];

  function number(value) {
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
  }

  function getSession(id) {
    const manager = historyManager();

    if (!manager || typeof manager.getSession !== "function") {
      return null;
    }

    return manager.getSession(id);
  }

  function calculateWinRate(session) {
    const played = number(session.racesPlayed);

    if (!played) return 0;

    return Number(
      (number(session.racesWon) / played * 100).toFixed(2)
    );
  }

  function compareMetric(first, second, metric) {
    const a = number(first[metric.key]);
    const b = number(second[metric.key]);

    let winner = "tie";

    if (a !== b) {
      if (metric.lowerIsBetter) {
        winner = a < b ? "first" : "second";
      } else {
        winner = a > b ? "first" : "second";
      }
    }

    return {
      key: metric.key,
      label: metric.label,
      first: a,
      second: b,
      difference: Number((a - b).toFixed(2)),
      winner
    };
  }

  function compare(firstId, secondId) {
    if (!firstId || !secondId) {
      return {
        success: false,
        error: "Select two sessions to compare."
      };
    }

    if (firstId === secondId) {
      return {
        success: false,
        error: "Choose two different sessions."
      };
    }

    const first = getSession(firstId);
    const second = getSession(secondId);

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
      difference: Number(
        (firstWinRate - secondWinRate).toFixed(2)
      ),
      winner: firstWinRate === secondWinRate
        ? "tie"
        : firstWinRate > secondWinRate
          ? "first"
          : "second"
    });

    const firstWins = metrics.filter(
      item => item.winner === "first"
    ).length;

    const secondWins = metrics.filter(
      item => item.winner === "second"
    ).length;

    let overallWinner = "tie";

    if (firstWins > secondWins) {
      overallWinner = "first";
    } else if (secondWins > firstWins) {
      overallWinner = "second";
    }

    return {
      success: true,
      first: {
        id: first.id,
        startedAt: first.startedAt,
        endedAt: first.endedAt
      },
      second: {
        id: second.id,
        startedAt: second.startedAt,
        endedAt: second.endedAt
      },
      metrics,
      score: {
        first: firstWins,
        second: secondWins,
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

    const sessions = manager.getHistory();

    if (!Array.isArray(sessions) || sessions.length < 2) {
      return {
        success: false,
        error: "At least two completed sessions are required."
      };
    }

    return compare(sessions[1].id, sessions[0].id);
  }

  function getMetricDefinitions() {
    return METRICS.map(metric => ({
      key: metric.key,
      label: metric.label,
      lowerIsBetter: metric.lowerIsBetter
    }));
  }

  SX.vehicleRaceSessionComparison = {
    compare,
    compareLatest,
    calculateWinRate,
    getMetricDefinitions
  };

  console.info("[SUPERX] Race Session Comparison loaded.");

})(window);

/* ======================= END FILE 107 ======================= */
