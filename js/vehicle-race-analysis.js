/* =========================================================
   SUPERX LEGEND — FILE 103
   FILE: js/vehicle-race-analysis.js
   START: VEHICLE RACE ANALYSIS
   ========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};
  const STORAGE_KEY = "superx_race_analysis_v2";
  const MAX_REPORTS = 50;

  let reports = [];

  function number(value, fallback = 0) {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function average(values) {
    return values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : 0;
  }

  function deviation(values) {
    if (values.length < 2) return 0;
    const mean = average(values);
    return Math.sqrt(average(values.map(value => (value - mean) ** 2)));
  }

  function makeId() {
    return "SX-ANALYSIS-" + Date.now().toString(36) +
      "-" + Math.random().toString(36).slice(2, 8);
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      reports = Array.isArray(saved) ? saved.slice(-MAX_REPORTS) : [];
      return true;
    } catch (error) {
      reports = [];
      console.warn("[SUPERX Analysis] Load failed:", error);
      return false;
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports.slice(-MAX_REPORTS)));
      return true;
    } catch (error) {
      console.warn("[SUPERX Analysis] Save failed:", error);
      return false;
    }
  }

  function normalizeLaps(input) {
    if (!Array.isArray(input)) return [];

    return input.slice(0, 100).map((item, index) => {
      const raw = item && typeof item === "object"
        ? item.time
        : item;

      return {
        lap: item && typeof item === "object" && Number.isFinite(Number(item.lap))
          ? Math.max(1, Math.floor(Number(item.lap)))
          : index + 1,
        time: Math.max(0, number(raw))
      };
    }).filter(item => item.time > 0);
  }

  function analyzeLaps(input) {
    const laps = normalizeLaps(input);

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
    const spread = deviation(times);

    const consistency = avg > 0
      ? clamp(100 - spread / avg * 100, 0, 100)
      : 0;

    const improvement = times.length > 1 && times[0] > 0
      ? ((times[0] - times[times.length - 1]) / times[0]) * 100
      : 0;

    return {
      count: laps.length,
      best,
      worst,
      average: avg,
      consistency,
      deviation: spread,
      improvement,
      lapDetails: laps.map(item => ({
        lap: item.lap,
        time: item.time,
        differenceFromBest: item.time - best,
        differenceFromAverage: item.time - avg,
        isBest: item.time === best,
        isWorst: item.time === worst
      }))
    };
  }

  function analyzePenalties(input) {
    const data = input || {};
    const totalPenalty = Math.max(0, number(data.totalPenalty));
    const incidents = Math.max(0, Math.floor(number(data.incidents)));
    const adjustedTime = Math.max(0, number(data.adjustedTime));

    return {
      totalPenalty,
      incidents,
      adjustedTime,
      penaltyImpact: Math.min(100, totalPenalty / 60000 * 100)
    };
  }

  function calculateGrade(lapData, penaltyData) {
    const laps = lapData || {};
    const penalties = penaltyData || {};

    let score = number(laps.consistency) * 0.65;

    if (number(laps.improvement) > 0) {
      score += Math.min(15, number(laps.improvement) * 3);
    }

    if (number(laps.count) >= 3) score += 10;

    score -= number(penalties.penaltyImpact) * 0.2;
    score = Math.round(clamp(score, 0, 100));

    let grade = "D";
    if (score >= 95) grade = "S";
    else if (score >= 85) grade = "A";
    else if (score >= 70) grade = "B";
    else if (score >= 55) grade = "C";

    return { score, grade };
  }

  function analyze(options) {
    const data = options || {};
    const laps = normalizeLaps(data.laps);

    if (!laps.length) {
      return { success: false, message: "Valid lap times are required." };
    }

    const lapData = analyzeLaps(laps);
    const penaltyData = analyzePenalties(data.penalties);
    const performance = calculateGrade(lapData, penaltyData);

    const report = {
      reportId: makeId(),
      raceId: String(data.raceId || "").slice(0, 100),
      mapName: String(data.mapName || "Unknown Track").slice(0, 100),
      carId: String(data.carId || "unknown").slice(0, 80),
      createdAt: Date.now(),
      lapAnalysis: lapData,
      penaltyAnalysis: penaltyData,
      performance
    };

    reports.push(report);
    if (reports.length > MAX_REPORTS) reports.shift();

    const saved = save();

    window.dispatchEvent(new CustomEvent("sx:race-analysis-created", {
      detail: { report: clone(report), saved }
    }));

    return { success: true, saved, report: clone(report) };
  }

  function compareReports(firstId, secondId) {
    const first = reports.find(item => item.reportId === firstId);
    const second = reports.find(item => item.reportId === secondId);

    if (!first || !second) {
      return { success: false, message: "One or both reports were not found." };
    }

    const firstAverage = first.lapAnalysis.average;
    const secondAverage = second.lapAnalysis.average;

    return {
      success: true,
      averageTimeDifference: secondAverage - firstAverage,
      consistencyDifference:
        second.lapAnalysis.consistency - first.lapAnalysis.consistency,
      scoreDifference:
        second.performance.score - first.performance.score,
      fasterReport: firstAverage < secondAverage
        ? first.reportId
        : secondAverage < firstAverage
          ? second.reportId
          : null
    };
  }

  function getAll() {
    return clone(reports.slice().reverse());
  }

  function getReport(id) {
    const report = reports.find(item => item.reportId === id);
    return report ? clone(report) : null;
  }

  function getLatest() {
    return reports.length ? clone(reports[reports.length - 1]) : null;
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
      averageScore: Math.round(average(
        reports.map(item => number(item.performance && item.performance.score))
      )),
      averageConsistency: Math.round(average(
        reports.map(item => number(item.lapAnalysis && item.lapAnalysis.consistency))
      )),
      bestScore: Math.max(
        ...reports.map(item => number(item.performance && item.performance.score))
      )
    };
  }

  function clearHistory() {
    reports = [];
    const saved = save();

    window.dispatchEvent(new CustomEvent("sx:race-analysis-cleared"));
    return saved;
  }

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
    reload: load,
    save
  };

})();

/* =========================================================
   END: VEHICLE RACE ANALYSIS — FILE 103
   ========================================================= */
