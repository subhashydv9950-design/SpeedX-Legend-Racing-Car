
/* =========================================================
   SUPERX LEGEND — FILE 108
   FILE: js/vehicle-race-session-insights.js
   MODULE: Advanced Race Session Insights
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const HISTORY_LIMIT = 20;
  const MAX_LIMIT = 100;

  function number(value) {
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
  }

  function round(value, decimals = 2) {
    const factor = Math.pow(10, decimals);
    return Math.round(number(value) * factor) / factor;
  }

  function average(values) {
    return values.length
      ? values.reduce((sum, value) => sum + number(value), 0) / values.length
      : 0;
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function getHistory() {
    const manager = SX.vehicleRaceSessionHistory;

    if (!manager || typeof manager.getAll !== "function") {
      return [];
    }

    try {
      return safeArray(manager.getAll()).filter(
        item => item && typeof item === "object"
      );
    } catch (error) {
      console.warn("[SUPERX Insights] History unavailable:", error);
      return [];
    }
  }

  function getRecentSessions(limit = HISTORY_LIMIT) {
    const safeLimit = Math.max(
      1,
      Math.min(MAX_LIMIT, Math.floor(number(limit) || HISTORY_LIMIT))
    );

    return getHistory().slice(0, safeLimit);
  }

  function getTotals(sessions) {
    return sessions.reduce((totals, item) => {
      totals.racesPlayed += Math.max(0, number(item.racesPlayed));
      totals.racesWon += Math.max(0, number(item.racesWon));
      totals.racesLost += Math.max(0, number(item.racesLost));
      totals.distanceKm += Math.max(0, number(item.totalDistanceKm));
      totals.durationSeconds += Math.max(0, number(item.durationSeconds));
      totals.coins += Math.max(0, number(item.totalCoins));
      totals.xp += Math.max(0, number(item.totalXP));
      totals.penalties += Math.max(0, number(item.totalPenalties));
      return totals;
    }, {
      racesPlayed: 0,
      racesWon: 0,
      racesLost: 0,
      distanceKm: 0,
      durationSeconds: 0,
      coins: 0,
      xp: 0,
      penalties: 0
    });
  }

  function getPerformanceTrend() {
    const sessions = getRecentSessions(HISTORY_LIMIT).slice().reverse();

    if (sessions.length < 2) {
      return {
        direction: "insufficient-data",
        change: 0,
        earlierWinRate: 0,
        recentWinRate: 0,
        message: "More completed sessions are needed."
      };
    }

    const midpoint = Math.floor(sessions.length / 2);
    const earlier = sessions.slice(0, midpoint);
    const recent = sessions.slice(midpoint);

    function rate(group) {
      const totals = getTotals(group);
      return totals.racesPlayed
        ? totals.racesWon / totals.racesPlayed * 100
        : 0;
    }

    const earlierRate = rate(earlier);
    const recentRate = rate(recent);
    const change = round(recentRate - earlierRate);

    return {
      direction: change > 1
        ? "improving"
        : change < -1
          ? "declining"
          : "stable",
      earlierWinRate: round(earlierRate),
      recentWinRate: round(recentRate),
      change,
      message: change > 1
        ? "Your recent win rate is improving."
        : change < -1
          ? "Your recent win rate has decreased."
          : "Your win rate is relatively stable."
    };
  }

  function getModeStatistics() {
    const modes = {};

    getHistory().forEach(session => {
      const raceModes = session.raceModes;

      if (!raceModes || typeof raceModes !== "object" ||
          Array.isArray(raceModes)) {
        return;
      }

      Object.entries(raceModes).forEach(([mode, count]) => {
        const safeCount = Math.max(0, number(count));
        modes[mode] = (modes[mode] || 0) + safeCount;
      });
    });

    return Object.entries(modes)
      .map(([mode, races]) => ({ mode, races }))
      .sort((a, b) => b.races - a.races);
  }

  function getPersonalRecords() {
    const sessions = getHistory();

    const records = {
      bestWins: 0,
      longestDistanceKm: 0,
      longestDurationSeconds: 0,
      mostCoins: 0,
      mostXP: 0,
      bestLapSeconds: null,
      mostRaces: 0
    };

    sessions.forEach(item => {
      records.bestWins = Math.max(
        records.bestWins,
        number(item.racesWon)
      );

      records.longestDistanceKm = Math.max(
        records.longestDistanceKm,
        number(item.totalDistanceKm)
      );

      records.longestDurationSeconds = Math.max(
        records.longestDurationSeconds,
        number(item.durationSeconds)
      );

      records.mostCoins = Math.max(
        records.mostCoins,
        number(item.totalCoins)
      );

      records.mostXP = Math.max(
        records.mostXP,
        number(item.totalXP)
      );

      records.mostRaces = Math.max(
        records.mostRaces,
        number(item.racesPlayed)
      );

      const lap = number(item.bestLapSeconds);

      if (lap > 0) {
        records.bestLapSeconds = records.bestLapSeconds === null
          ? lap
          : Math.min(records.bestLapSeconds, lap);
      }
    });

    return records;
  }

  function getImprovementTips() {
    const sessions = getRecentSessions(10);
    const totals = getTotals(sessions);

    if (!sessions.length) {
      return ["Complete your first race session to unlock insights."];
    }

    if (!totals.racesPlayed) {
      return ["Complete a race to begin tracking performance."];
    }

    const tips = [];
    const winRate = totals.racesWon / totals.racesPlayed * 100;

    if (winRate < 30) {
      tips.push("Practice cornering and braking to improve race results.");
    } else if (winRate < 60) {
      tips.push("Work on consistent lap times to improve your win rate.");
    } else {
      tips.push("Great progress. Try more challenging race modes.");
    }

    if (totals.penalties > 0) {
      tips.push("Focus on clean driving to reduce race penalties.");
    }

    if (totals.distanceKm < 10) {
      tips.push("Explore longer routes to build driving experience.");
    }

    if (totals.racesPlayed >= 5 && totals.racesWon === 0) {
      tips.push("Try a lower difficulty while learning each track.");
    }

    return tips;
  }

  function getSessionComparison(first, second) {
    if (!first || !second) return null;

    const fields = [
      "racesPlayed",
      "racesWon",
      "totalDistanceKm",
      "durationSeconds",
      "totalCoins",
      "totalXP",
      "totalPenalties"
    ];

    const comparison = {};

    fields.forEach(field => {
      const a = number(first[field]);
      const b = number(second[field]);

      comparison[field] = {
        first: a,
        second: b,
        difference: round(b - a)
      };
    });

    return comparison;
  }

  function getInsights() {
    const sessions = getHistory();
    const totals = getTotals(sessions);

    return {
      generatedAt: new Date().toISOString(),
      sessionsAnalyzed: sessions.length,
      races: totals.racesPlayed,
      wins: totals.racesWon,
      losses: totals.racesLost,
      winRate: totals.racesPlayed
        ? round(totals.racesWon / totals.racesPlayed * 100)
        : 0,
      distanceKm: round(totals.distanceKm),
      drivingHours: round(totals.durationSeconds / 3600),
      coinsEarned: totals.coins,
      xpEarned: totals.xp,
      penalties: totals.penalties,
      averageRaceDistanceKm: totals.racesPlayed
        ? round(totals.distanceKm / totals.racesPlayed)
        : 0,
      averageSessionMinutes: sessions.length
        ? round(totals.durationSeconds / sessions.length / 60)
        : 0,
      trend: getPerformanceTrend(),
      favoriteModes: getModeStatistics(),
      personalRecords: getPersonalRecords(),
      improvementTips: getImprovementTips()
    };
  }

  SX.vehicleRaceSessionInsights = {
    getRecentSessions,
    getPerformanceTrend,
    getModeStatistics,
    getPersonalRecords,
    getImprovementTips,
    getSessionComparison,
    getInsights,
    getTotals
  };

  console.info("[SUPERX] Advanced Race Session Insights loaded.");

})(window);

/* ======================= END FILE 108 ======================= */
