
/* =========================================================
   SUPERX LEGEND — FILE 108
   FILE: js/vehicle-race-session-insights.js
   MODULE: Race Session Insights
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const HISTORY_LIMIT = 20;

  function getHistory() {
    const manager = SX.vehicleRaceSessionHistory;

    if (!manager || typeof manager.getAll !== "function") {
      return [];
    }

    try {
      const records = manager.getAll();
      return Array.isArray(records) ? records : [];
    } catch (error) {
      console.warn("[SUPERX Insights] History unavailable:", error);
      return [];
    }
  }

  function num(value) {
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
  }

  function average(values) {
    if (!values.length) return 0;

    return values.reduce((sum, value) => sum + value, 0) /
      values.length;
  }

  function round(value, decimals = 2) {
    return Number(value.toFixed(decimals));
  }

  function getRecentSessions(limit = HISTORY_LIMIT) {
    const safeLimit = Math.max(
      1,
      Math.min(100, Math.floor(num(limit) || HISTORY_LIMIT))
    );

    return getHistory().slice(0, safeLimit);
  }

  function getPerformanceTrend() {
    const sessions = getRecentSessions(HISTORY_LIMIT)
      .slice()
      .reverse();

    if (sessions.length < 2) {
      return {
        direction: "insufficient-data",
        change: 0,
        message: "More completed sessions are needed."
      };
    }

    const midpoint = Math.floor(sessions.length / 2);

    const earlier = sessions.slice(0, midpoint);
    const recent = sessions.slice(midpoint);

    const earlierRates = earlier.map(item => {
      const played = num(item.racesPlayed);

      return played
        ? num(item.racesWon) / played * 100
        : 0;
    });

    const recentRates = recent.map(item => {
      const played = num(item.racesPlayed);

      return played
        ? num(item.racesWon) / played * 100
        : 0;
    });

    const oldAverage = average(earlierRates);
    const newAverage = average(recentRates);

    const change = round(newAverage - oldAverage);

    return {
      direction: change > 1
        ? "improving"
        : change < -1
          ? "declining"
          : "stable",
      earlierWinRate: round(oldAverage),
      recentWinRate: round(newAverage),
      change,
      message: change > 1
        ? "Your recent win rate is improving."
        : change < -1
          ? "Your recent win rate has decreased."
          : "Your win rate is relatively stable."
    };
  }

  function getModeStatistics() {
    const sessions = getHistory();
    const modes = {};

    sessions.forEach(session => {
      const raceModes = session.raceModes || {};

      if (
        typeof raceModes !== "object" ||
        Array.isArray(raceModes)
      ) {
        return;
      }

      Object.keys(raceModes).forEach(mode => {
        const count = Math.max(0, num(raceModes[mode]));

        modes[mode] = (modes[mode] || 0) + count;
      });
    });

    return Object.keys(modes)
      .map(mode => ({
        mode,
        races: modes[mode]
      }))
      .sort((a, b) => b.races - a.races);
  }

  function getPersonalRecords() {
    const sessions = getHistory();

    if (!sessions.length) {
      return {
        bestWins: 0,
        longestDistanceKm: 0,
        longestDurationSeconds: 0,
        mostCoins: 0,
        mostXP: 0,
        bestLapSeconds: null
      };
    }

    return sessions.reduce((best, item) => {
      best.bestWins = Math.max(
        best.bestWins,
        num(item.racesWon)
      );

      best.longestDistanceKm = Math.max(
        best.longestDistanceKm,
        num(item.totalDistanceKm)
      );

      best.longestDurationSeconds = Math.max(
        best.longestDurationSeconds,
        num(item.durationSeconds)
      );

      best.mostCoins = Math.max(
        best.mostCoins,
        num(item.totalCoins)
      );

      best.mostXP = Math.max(
        best.mostXP,
        num(item.totalXP)
      );

      const lap = num(item.bestLapSeconds);

      if (lap > 0) {
        best.bestLapSeconds =
          best.bestLapSeconds === null
            ? lap
            : Math.min(best.bestLapSeconds, lap);
      }

      return best;
    }, {
      bestWins: 0,
      longestDistanceKm: 0,
      longestDurationSeconds: 0,
      mostCoins: 0,
      mostXP: 0,
      bestLapSeconds: null
    });
  }

  function getImprovementTips() {
    const sessions = getRecentSessions(10);

    if (!sessions.length) {
      return [
        "Complete your first race session to unlock insights."
      ];
    }

    const races = sessions.reduce(
      (sum, item) => sum + num(item.racesPlayed),
      0
    );

    const wins = sessions.reduce(
      (sum, item) => sum + num(item.racesWon),
      0
    );

    const penalties = sessions.reduce(
      (sum, item) => sum + num(item.totalPenalties),
      0
    );

    const tips = [];

    if (!races) {
      tips.push("Complete a race to begin tracking performance.");
      return tips;
    }

    const winRate = wins / races * 100;

    if (winRate < 30) {
      tips.push("Practice cornering and braking to improve race results.");
    } else if (winRate < 60) {
      tips.push("Work on consistent lap times to improve your win rate.");
    } else {
      tips.push("Great progress. Try more challenging race modes.");
    }

    if (penalties > 0) {
      tips.push("Focus on clean driving to reduce race penalties.");
    }

    const distance = sessions.reduce(
      (sum, item) => sum + num(item.totalDistanceKm),
      0
    );

    if (distance < 10) {
      tips.push("Explore longer routes to build driving experience.");
    }

    return tips;
  }

  function getInsights() {
    const sessions = getHistory();

    const totalRaces = sessions.reduce(
      (sum, item) => sum + num(item.racesPlayed),
      0
    );

    const totalWins = sessions.reduce(
      (sum, item) => sum + num(item.racesWon),
      0
    );

    const totalDistance = sessions.reduce(
      (sum, item) => sum + num(item.totalDistanceKm),
      0
    );

    const totalTime = sessions.reduce(
      (sum, item) => sum + num(item.durationSeconds),
      0
    );

    return {
      generatedAt: new Date().toISOString(),
      sessionsAnalyzed: sessions.length,
      races: totalRaces,
      wins: totalWins,
      winRate: totalRaces
        ? round(totalWins / totalRaces * 100)
        : 0,
      distanceKm: round(totalDistance),
      drivingHours: round(totalTime / 3600),
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
    getInsights
  };

  console.info("[SUPERX] Race Session Insights loaded.");

})(window);

/* ======================= END FILE 108 ======================= */
  
