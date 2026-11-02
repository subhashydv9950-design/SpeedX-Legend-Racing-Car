
/* =========================================================
   SUPERX LEGEND — FILE 103
   FILE: js/vehicle-race-analysis.js

   MODULE: VEHICLE RACE PERFORMANCE ANALYSIS

   RESPONSIBILITY:
   - Analyze completed lap times
   - Calculate consistency
   - Calculate pace improvement
   - Estimate penalty impact
   - Generate performance grades
   - Store analysis reports

   DOES NOT:
   - Control the race
   - Modify player rewards
   - Change race standings
   - Apply vehicle upgrades

   START: VEHICLE RACE ANALYSIS
   ========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_race_analysis_v1";
  const MAX_REPORTS = 50;

  let reports = [];

  /* ---------------------------------------------------------
     1. HELPERS
     --------------------------------------------------------- */

  function toNumber(value, fallback) {
    const result = Number(value);

    return Number.isFinite(result)
      ? result
      : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function average(values) {
    if (!values.length) return 0;

    return values.reduce(
      (sum, value) => sum + value,
      0
    ) / values.length;
  }

  function standardDeviation(values) {
    if (values.length < 2) return 0;

    const mean = average(values);

    const variance = average(
      values.map(value => Math.pow(value - mean, 2))
    );

    return Math.sqrt(variance);
  }

  function makeId() {
    return "SX-ANALYSIS-" +
      Date.now().toString(36) +
      "-" +
      Math.floor(Math.random() * 100000).toString(36);
  }

  /* ---------------------------------------------------------
     2. STORAGE
     --------------------------------------------------------- */

  function load() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
      );

      reports = Array.isArray(saved)
        ? saved.slice(-MAX_REPORTS)
        : [];

      return true;

    } catch (error) {
      reports = [];

      console.warn(
        "[SUPERX Analysis] History load failed.",
        error
      );

      return false;
    }
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(reports.slice(-MAX_REPORTS))
      );

      return true;

    } catch (error) {
      console.warn(
        "[SUPERX Analysis] History save failed.",
        error
      );

      return false;
    }
  }

  /* ---------------------------------------------------------
     3. NORMALIZE LAP DATA
     --------------------------------------------------------- */

  function normalizeLaps(input) {
    if (!Array.isArray(input)) return [];

    return input
      .slice(0, 100)
      .map((item, index) => {
        const value = typeof item === "object"
          ? item.time
          : item;

        return {
          lap: index + 1,
          time: Math.max(0, toNumber(value, 0))
        };
      })
      .filter(item => item.time > 0);
  }

  /* ---------------------------------------------------------
     4. LAP PERFORMANCE
     --------------------------------------------------------- */

  function analyzeLaps(laps) {
    if (!laps.length) {
      return {
        count: 0,
        best: 0,
        worst: 0,
        average: 0,
        consistency: 0,
        deviation: 0,
        improvement: 0,
        lapDetails: []
      };
    }

    const times = laps.map(item => item.time);

    const best = Math.min(...times);
    const worst = Math.max(...times);
    const avg = average(times);
    const deviation = standardDeviation(times);

    const consistency = avg > 0
      ? clamp(
          100 - (deviation / avg) * 100,
          0,
          100
        )
      : 0;

    let improvement = 0;

    if (times.length >= 2) {
      const first = times[0];
      const last = times[times.length - 1];

      improvement = first > 0
        ? ((first - last) / first) * 100
        : 0;
    }

    const details = laps.map(item => ({
      lap: item.lap,
      time: item.time,
      differenceFromBest: item.time - best,
      differenceFromAverage: item.time - avg,
      isBest: item.time === best,
      isWorst: item.time === worst
    }));

    return {
      count: laps.length,
      best,
      worst,
      average: avg,
      consistency,
      deviation,
      improvement,
      lapDetails: details
    };
  }

  /* ---------------------------------------------------------
     5. PENALTY ANALYSIS
     --------------------------------------------------------- */

  function analyzePenalties(data) {
    const input = data || {};

    const totalPenalty = Math.max(
      0,
      toNumber(input.totalPenalty, 0)
    );

    const incidents = Math.max(
      0,
      Math.floor(toNumber(input.incidents, 0))
    );

    const adjustedTime = Math.max(
      0,
      toNumber(input.adjustedTime, 0)
    );

    return {
      totalPenalty,
      incidents,
      adjustedTime,
      penaltyImpact: totalPenalty > 0
        ? Math.min(100, (totalPenalty / 60000) * 100)
        : 0
    };
  }

  /* ---------------------------------------------------------
     6. PERFORMANCE GRADE
     --------------------------------------------------------- */

  function calculateGrade(lapData, penaltyData) {
    const consistency = lapData.consistency;

    let score = consistency * 0.65;

    if (lapData.improvement > 0) {
      score += Math.min(
        15,
        lapData.improvement * 3
      );
    }

    if (lapData.count >= 3) {
      score += 10;
    }

    score -= penaltyData.penaltyImpact * 0.2;

    score = Math.round(
      clamp(score, 0, 100)
    );

    let grade = "D";

    if (score >= 95) grade = "S";
    else if (score >= 85) grade = "A";
    else if (score >= 70) grade = "B";
    else if (score >= 55) grade = "C";

    return {
      score,
      grade
    };
  }

  /* ---------------------------------------------------------
     7. GENERATE ANALYSIS
     --------------------------------------------------------- */

  function analyze(options) {
    const data = options || {};

    const laps = normalizeLaps(data.laps);

    if (!laps.length) {
      return {
        success: false,
        message: "Valid lap times are required."
      };
    }

    const lapData = analyzeLaps(laps);

    const penaltyData = analyzePenalties(
      data.penalties
    );

    const gradeData = calculateGrade(
      lapData,
      penaltyData
    );

    const report = {
      reportId: makeId(),

      raceId: String(data.raceId || "")
        .slice(0, 100),

      mapName: String(data.mapName || "Unknown Track")
        .slice(0, 100),

      carId: String(data.carId || "unknown")
        .slice(0, 80),

      createdAt: Date.now(),

      lapAnalysis: lapData,

      penaltyAnalysis: penaltyData,

      performance: gradeData
    };

    reports.push(report);

    if (reports.length > MAX_REPORTS) {
      reports.shift();
    }

    const saved = save();

    window.dispatchEvent(
      new CustomEvent("sx:race-analysis-created", {
        detail: {
          report: clone(report),
          saved
        }
      })
    );

    return {
      success: true,
      saved,
      report: clone(report)
    };
  }

  /* ---------------------------------------------------------
     8. COMPARISON
     --------------------------------------------------------- */

  function compareReports(firstId, secondId) {
    const first = reports.find(
      item => item.reportId === firstId
    );

    const second = reports.find(
      item => item.reportId === secondId
    );

    if (!first || !second) {
      return {
        success: false,
        message: "One or both reports were not found."
      };
    }

    const firstAverage =
      first.lapAnalysis.average;

    const secondAverage =
      second.lapAnalysis.average;

    return {
      success: true,

      averageTimeDifference:
        secondAverage - firstAverage,

      consistencyDifference:
        second.lapAnalysis.consistency -
        first.lapAnalysis.consistency,

      scoreDifference:
        second.performance.score -
        first.performance.score,

      fasterReport:
        firstAverage < secondAverage
          ? first.reportId
          : secondAverage < firstAverage
            ? second.reportId
            : null
    };
  }

  /* ---------------------------------------------------------
     9. HISTORY
     --------------------------------------------------------- */

  function getAll() {
    return clone(reports.slice().reverse());
  }

  function getReport(id) {
    const report = reports.find(
      item => item.reportId === id
    );

    return report ? clone(report) : null;
  }

  function getLatest() {
    if (!reports.length) return null;

    return clone(reports[reports.length - 1]);
  }

  function getSummary() {
    if (!reports.length) {
      return {
        totalReports: 0,
        averageScore: 0,
        averageConsistency: 0,
        bestScore: 0
      };
    }

    return {
      totalReports: reports.length,

      averageScore: Math.round(
        average(
          reports.map(item => item.performance.score)
        )
      ),

      averageConsistency: Math.round(
        average(
          reports.map(
            item => item.lapAnalysis.consistency
          )
        )
      ),

      bestScore: Math.max(
        ...reports.map(
          item => item.performance.score
        )
      )
    };
  }

  /* ---------------------------------------------------------
     10. CLEAR HISTORY
     --------------------------------------------------------- */

  function clearHistory() {
    reports = [];

    const saved = save();

    window.dispatchEvent(
      new CustomEvent("sx:race-analysis-cleared")
    );

    return saved;
  }

  /* ---------------------------------------------------------
     11. PUBLIC API
     --------------------------------------------------------- */

  load();

  SX.vehicleRaceAnalysis = {
    analyze,
    analyzeLaps,
    analyzePenalties,
    calculateGrade,
    compareReports,

    getAll,
    getReport,
    getLatest,
    getSummary,

    clearHistory,
    reload: load
  };

})();

/* =========================================================
   END: VEHICLE RACE ANALYSIS — FILE 103
   ========================================================= */
   
