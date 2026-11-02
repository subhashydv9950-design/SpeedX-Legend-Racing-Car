
/* =========================================================
   SUPERX LEGEND — FILE 104
   FILE: js/vehicle-race-results-export.js
   MODULE: Race Results Export
   PURPOSE:
   Export race results and analysis reports as JSON / CSV.
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const MODULE_NAME = "vehicleRaceResultsExport";
  const VERSION = "1.0.0";

  const MAX_TEXT_LENGTH = 120000;
  const encoder = document.createElement("textarea");

  function safeText(value, fallback = "") {
    if (value === null || value === undefined) return fallback;

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return String(value).slice(0, MAX_TEXT_LENGTH);
    }

    return fallback;
  }

  function safeNumber(value, fallback = 0) {
    const number = Number(value);

    return Number.isFinite(number) ? number : fallback;
  }

  function cleanObject(value, depth = 0) {
    if (depth > 8) return null;

    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "boolean"
    ) {
      return value;
    }

    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    if (Array.isArray(value)) {
      return value.slice(0, 500).map(item =>
        cleanObject(item, depth + 1)
      );
    }

    if (typeof value === "object") {
      const output = {};

      Object.keys(value).slice(0, 200).forEach(key => {
        if (
          key === "__proto__" ||
          key === "constructor" ||
          key === "prototype"
        ) {
          return;
        }

        const item = value[key];

        if (typeof item !== "function") {
          output[key] = cleanObject(item, depth + 1);
        }
      });

      return output;
    }

    return null;
  }

  function getTimestamp() {
    return new Date().toISOString();
  }

  function makeFilename(prefix, extension) {
    const date = new Date()
      .toISOString()
      .replace(/[:.]/g, "-");

    return "SUPERX-" + prefix + "-" + date + "." + extension;
  }

  function downloadFile(content, filename, mimeType) {
    if (typeof Blob === "undefined") {
      return {
        success: false,
        error: "Browser file download is not supported."
      };
    }

    let url = null;

    try {
      const blob = new Blob(
        [content],
        { type: mimeType }
      );

      url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = filename;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        if (url) URL.revokeObjectURL(url);
      }, 1500);

      return {
        success: true,
        filename
      };

    } catch (error) {
      if (url) URL.revokeObjectURL(url);

      return {
        success: false,
        error: safeText(error.message, "Download failed.")
      };
    }
  }

  function getRaceResults() {
    const manager = SX.vehicleRaceResults;

    if (!manager) return [];

    const possibleMethods = [
      "getHistory",
      "getAll",
      "getResults"
    ];

    for (const method of possibleMethods) {
      if (typeof manager[method] === "function") {
        try {
          const result = manager[method]();

          if (Array.isArray(result)) {
            return result;
          }

          if (
            result &&
            Array.isArray(result.results)
          ) {
            return result.results;
          }

        } catch (error) {
          console.warn(
            "[SUPERX Export] Result retrieval failed:",
            error
          );
        }
      }
    }

    return [];
  }

  function getAnalysisHistory() {
    const manager = SX.vehicleRaceAnalysis;

    if (!manager) return [];

    const possibleMethods = [
      "getHistory",
      "getReports",
      "getAll"
    ];

    for (const method of possibleMethods) {
      if (typeof manager[method] === "function") {
        try {
          const result = manager[method]();

          if (Array.isArray(result)) {
            return result;
          }

          if (
            result &&
            Array.isArray(result.reports)
          ) {
            return result.reports;
          }

        } catch (error) {
          console.warn(
            "[SUPERX Export] Analysis retrieval failed:",
            error
          );
        }
      }
    }

    return [];
  }

  function createReport(options = {}) {
    const includeResults = options.includeResults !== false;
    const includeAnalysis = options.includeAnalysis !== false;

    const player = cleanObject(SX.player || {});

    return {
      application: "SUPERX LEGEND RACING CAR",
      reportVersion: VERSION,
      exportedAt: getTimestamp(),

      player: {
        name: safeText(player.name, "Player"),
        level: safeNumber(player.level, 1)
      },

      raceResults: includeResults
        ? cleanObject(getRaceResults())
        : [],

      raceAnalysis: includeAnalysis
        ? cleanObject(getAnalysisHistory())
        : []
    };
  }

  function exportJSON(options = {}) {
    try {
      const report = createReport(options);

      const content = JSON.stringify(
        report,
        null,
        2
      );

      return downloadFile(
        content,
        makeFilename("Race-Report", "json"),
        "application/json;charset=utf-8"
      );

    } catch (error) {
      return {
        success: false,
        error: safeText(error.message, "JSON export failed.")
      };
    }
  }

  function csvCell(value) {
    let text = "";

    if (value === null || value === undefined) {
      text = "";
    } else if (typeof value === "object") {
      text = JSON.stringify(cleanObject(value));
    } else {
      text = String(value);
    }

    // Prevent spreadsheet formula execution.
    if (/^[\s]*[=+\-@]/.test(text)) {
      text = "'" + text;
    }

    return '"' + text.replace(/"/g, '""') + '"';
  }

  function convertToCSV(rows, columns) {
    const header = columns.map(column =>
      csvCell(column.label)
    );

    const lines = [header.join(",")];

    rows.forEach(row => {
      const line = columns.map(column => {
        const value = row[column.key];
        return csvCell(value);
      });

      lines.push(line.join(","));
    });

    return "\uFEFF" + lines.join("\r\n");
  }

  function exportResultsCSV() {
    try {
      const results = getRaceResults();

      if (!results.length) {
        return {
          success: false,
          error: "No race results are available to export."
        };
      }

      const rows = results.map((item, index) => ({
        record: index + 1,
        raceId: item.id || item.raceId || "",
        date: item.date || item.completedAt || "",
        mode: item.mode || item.raceMode || "",
        map: item.mapName || item.map || "",
        car: item.carName || item.car || "",
        position: item.position || item.rank || "",
        laps: item.laps || item.totalLaps || "",
        time: item.time || item.totalTime || "",
        bestLap: item.bestLap || "",
        coins: item.coinsEarned || item.coins || "",
        xp: item.xpEarned || item.xp || "",
        result: item.result || item.status || ""
      }));

      const columns = [
        { key: "record", label: "Record" },
        { key: "raceId", label: "Race ID" },
        { key: "date", label: "Date" },
        { key: "mode", label: "Mode" },
        { key: "map", label: "Map" },
        { key: "car", label: "Car" },
        { key: "position", label: "Position" },
        { key: "laps", label: "Laps" },
        { key: "time", label: "Race Time" },
        { key: "bestLap", label: "Best Lap" },
        { key: "coins", label: "Coins Earned" },
        { key: "xp", label: "XP Earned" },
        { key: "result", label: "Result" }
      ];

      return downloadFile(
        convertToCSV(rows, columns),
        makeFilename("Race-Results", "csv"),
        "text/csv;charset=utf-8"
      );

    } catch (error) {
      return {
        success: false,
        error: safeText(error.message, "CSV export failed.")
      };
    }
  }

  function exportAnalysisCSV() {
    try {
      const reports = getAnalysisHistory();

      if (!reports.length) {
        return {
          success: false,
          error: "No race analysis reports are available."
        };
      }

      const rows = reports.map((item, index) => ({
        record: index + 1,
        date: item.date || item.createdAt || "",
        raceId: item.raceId || item.id || "",
        bestLap: item.bestLap || "",
        worstLap: item.worstLap || "",
        averageLap: item.averageLap || "",
        consistency: item.consistency || "",
        improvement: item.improvement || "",
        penaltyTime: item.penaltyTime || "",
        score: item.score || item.performanceScore || "",
        grade: item.grade || ""
      }));

      const columns = [
        { key: "record", label: "Record" },
        { key: "date", label: "Date" },
        { key: "raceId", label: "Race ID" },
        { key: "bestLap", label: "Best Lap" },
        { key: "worstLap", label: "Worst Lap" },
        { key: "averageLap", label: "Average Lap" },
        { key: "consistency", label: "Consistency" },
        { key: "improvement", label: "Improvement" },
        { key: "penaltyTime", label: "Penalty Time" },
        { key: "score", label: "Performance Score" },
        { key: "grade", label: "Grade" }
      ];

      return downloadFile(
        convertToCSV(rows, columns),
        makeFilename("Race-Analysis", "csv"),
        "text/csv;charset=utf-8"
      );

    } catch (error) {
      return {
        success: false,
        error: safeText(error.message, "Analysis CSV export failed.")
      };
    }
  }

  function getExportSummary() {
    const results = getRaceResults();
    const reports = getAnalysisHistory();

    return {
      resultCount: results.length,
      analysisCount: reports.length,
      canExportJSON: true,
      canExportResultsCSV: results.length > 0,
      canExportAnalysisCSV: reports.length > 0
    };
  }

  function exportAll() {
    return exportJSON({
      includeResults: true,
      includeAnalysis: true
    });
  }

  function init(options = {}) {
    const root = options.root || document;

    if (!root || typeof root.addEventListener !== "function") {
      return false;
    }

    if (root.dataset && root.dataset.sxRaceExportBound === "true") {
      return true;
    }

    root.addEventListener("click", function (event) {
      const button = event.target.closest("[data-sx-race-export]");

      if (!button || !root.contains(button)) return;

      const action = button.dataset.sxRaceExport;

      let result = null;

      if (action === "json") {
        result = exportJSON();
      } else if (action === "results-csv") {
        result = exportResultsCSV();
      } else if (action === "analysis-csv") {
        result = exportAnalysisCSV();
      } else if (action === "all") {
        result = exportAll();
      }

      if (!result) return;

      if (typeof SX.notifications !== "undefined") {
        if (result.success && typeof SX.notifications.success === "function") {
          SX.notifications.success("Race report exported successfully.");
        } else if (
          !result.success &&
          typeof SX.notifications.error === "function"
        ) {
          SX.notifications.error(result.error);
        }
      }

      button.dispatchEvent(new CustomEvent("sx:race-export-complete", {
        bubbles: true,
        detail: result
      }));
    });

    if (root.dataset) {
      root.dataset.sxRaceExportBound = "true";
    }

    return true;
  }

  SX[MODULE_NAME] = {
    version: VERSION,
    init,
    createReport,
    exportJSON,
    exportResultsCSV,
    exportAnalysisCSV,
    exportAll,
    getExportSummary
  };

  console.info("[SUPERX] Race Results Export loaded.");

})(window);

/* ======================= END FILE 104 ======================= */
      
