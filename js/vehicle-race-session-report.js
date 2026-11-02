
/* =========================================================
   SUPERX LEGEND — FILE 120
   FILE: js/vehicle-race-session-report.js

   PURPOSE:
   - Generate detailed race session reports.
   - Format performance and reward information.
   - Create printable HTML reports.
   - Export reports as JSON.
   - Does not change race records or player rewards.
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const MAX_REPORTS = 100;

  let reportHistory = [];

  function clean(value, limit) {
    if (value === null || value === undefined) return "";

    return String(value)
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, limit || 120);
  }

  function numeric(value) {
    const result = Number(value);

    return Number.isFinite(result) ? result : 0;
  }

  function safeDate(value) {
    const timestamp = Number(value);

    if (!Number.isFinite(timestamp) || timestamp <= 0) {
      return new Date().toISOString();
    }

    return new Date(timestamp).toISOString();
  }

  function formatDuration(milliseconds) {
    const total = Math.max(
      0,
      Math.floor(numeric(milliseconds) / 1000)
    );

    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;

    return [
      String(hours).padStart(2, "0"),
      String(minutes).padStart(2, "0"),
      String(seconds).padStart(2, "0")
    ].join(":");
  }

  function normalizeData(sessionId, input) {
    const data = input && typeof input === "object"
      ? input
      : {};

    const lapTimes = Array.isArray(data.lapTimes)
      ? data.lapTimes
          .map(numeric)
          .filter(function (time) {
            return time > 0;
          })
          .slice(0, 100)
      : [];

    return {
      sessionId: clean(sessionId, 120),
      title: clean(data.title, 100) || "Race Session Report",
      player: clean(data.player, 60) || "Player",
      mode: clean(data.mode, 50) || "Unknown",
      map: clean(data.map, 80) || "Unknown",
      car: clean(data.car, 80) || "Unknown",
      startedAt: safeDate(data.startedAt),
      finishedAt: safeDate(data.finishedAt),
      durationMs: Math.max(0, numeric(data.durationMs)),
      position: Math.max(0, numeric(data.position)),
      totalRacers: Math.max(0, numeric(data.totalRacers)),
      distanceKm: Math.max(0, numeric(data.distanceKm)),
      averageSpeed: Math.max(0, numeric(data.averageSpeed)),
      maxSpeed: Math.max(0, numeric(data.maxSpeed)),
      bestLapMs: Math.max(0, numeric(data.bestLapMs)),
      lapTimes: lapTimes,
      penalties: Math.max(0, numeric(data.penalties)),
      coinsEarned: Math.max(0, numeric(data.coinsEarned)),
      xpEarned: Math.max(0, numeric(data.xpEarned)),
      cleanRace: data.cleanRace === true,
      completed: data.completed === true
    };
  }

  function buildStatistics(data) {
    const laps = data.lapTimes;

    const averageLap = laps.length
      ? laps.reduce(function (sum, time) {
          return sum + time;
        }, 0) / laps.length
      : 0;

    const bestLap = data.bestLapMs > 0
      ? data.bestLapMs
      : laps.length
        ? Math.min.apply(null, laps)
        : 0;

    const worstLap = laps.length
      ? Math.max.apply(null, laps)
      : 0;

    return {
      averageLapMs: Math.round(averageLap),
      bestLapMs: bestLap,
      worstLapMs: worstLap,
      completedLaps: laps.length,
      speedDifference: Math.max(
        0,
        data.maxSpeed - data.averageSpeed
      )
    };
  }

  function generate(sessionId, input) {
    const id = clean(sessionId, 120);

    if (!id) {
      return {
        success: false,
        error: "Session ID is required."
      };
    }

    const data = normalizeData(id, input);
    const statistics = buildStatistics(data);

    const report = {
      reportId:
        "report_" +
        Date.now().toString(36) +
        "_" +
        Math.random().toString(36).slice(2, 7),
      generatedAt: new Date().toISOString(),
      session: data,
      statistics: statistics,
      result: {
        completed: data.completed,
        cleanRace: data.cleanRace,
        position: data.position,
        totalRacers: data.totalRacers
      },
      rewards: {
        coins: data.coinsEarned,
        xp: data.xpEarned
      }
    };

    reportHistory.unshift(report);
    reportHistory = reportHistory.slice(0, MAX_REPORTS);

    window.dispatchEvent(new CustomEvent(
      "sx:race-session-report-generated",
      {
        detail: {
          reportId: report.reportId,
          sessionId: id
        }
      }
    ));

    return {
      success: true,
      report: clone(report)
    };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHTML(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function createHTML(report) {
    if (!report || !report.session) return "";

    const session = report.session;
    const stats = report.statistics;
    const rewards = report.rewards;

    const rows = [
      ["Player", session.player],
      ["Game Mode", session.mode],
      ["Map", session.map],
      ["Car", session.car],
      ["Position", session.position || "N/A"],
      ["Total Racers", session.totalRacers || "N/A"],
      ["Duration", formatDuration(session.durationMs)],
      ["Distance", session.distanceKm.toFixed(2) + " km"],
      ["Average Speed", session.averageSpeed.toFixed(1) + " km/h"],
      ["Maximum Speed", session.maxSpeed.toFixed(1) + " km/h"],
      ["Best Lap", stats.bestLapMs
        ? formatDuration(stats.bestLapMs)
        : "N/A"],
      ["Completed Laps", stats.completedLaps],
      ["Penalties", session.penalties],
      ["Clean Race", session.cleanRace ? "Yes" : "No"],
      ["Coins Earned", rewards.coins],
      ["XP Earned", rewards.xp]
    ];

    const tableRows = rows.map(function (row) {
      return (
        "<tr><th>" + escapeHTML(row[0]) +
        "</th><td>" + escapeHTML(row[1]) +
        "</td></tr>"
      );
    }).join("");

    return [
      "<!DOCTYPE html>",
      '<html lang="en">',
      "<head>",
      '<meta charset="UTF-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      "<title>SUPERX LEGEND Race Report</title>",
      "<style>",
      "*{box-sizing:border-box}",
      "body{margin:0;padding:24px;background:#09090f;color:#f4f2ff;font-family:Arial,sans-serif}",
      ".report{max-width:760px;margin:auto;padding:24px;background:#15131f;border:1px solid #494064;border-radius:16px}",
      "h1{color:#c5a5ff;margin-top:0}",
      ".sub{color:#aaa2bb;font-size:13px;margin-bottom:22px}",
      "table{width:100%;border-collapse:collapse}",
      "th,td{padding:12px 10px;text-align:left;border-bottom:1px solid #383044;overflow-wrap:anywhere}",
      "th{width:42%;color:#bda3f5}",
      "td{color:#fff}",
      ".footer{margin-top:22px;color:#aaa2bb;font-size:12px}",
      ".print{padding:11px 16px;margin-bottom:18px;background:#8055df;color:white;border:0;border-radius:8px;font-weight:bold}",
      "@media print{body{background:white;color:black;padding:0}.report{background:white;color:black;border:0}.print{display:none}th,td{color:black;border-color:#ddd}}",
      "</style>",
      "</head>",
      "<body>",
      '<main class="report">',
      '<button class="print" onclick="window.print()">Print Report</button>',
      "<h1>SUPERX LEGEND</h1>",
      "<h2>" + escapeHTML(session.title) + "</h2>",
      '<p class="sub">Generated: ' +
        escapeHTML(report.generatedAt) + "</p>",
      "<table><tbody>" + tableRows + "</tbody></table>",
      '<p class="footer">Session ID: ' +
        escapeHTML(session.sessionId) + "</p>",
      '<p class="footer">SUPERX LEGEND — Race Session Report</p>',
      "</main>",
      "</body>",
      "</html>"
    ].join("");
  }

  function exportJSON(report) {
    if (!report || !report.session) return null;

    return JSON.stringify(report, null, 2);
  }

  function getHistory() {
    return clone(reportHistory);
  }

  function getReport(reportId) {
    const report = reportHistory.find(function (item) {
      return item.reportId === reportId;
    });

    return report ? clone(report) : null;
  }

  function deleteReport(reportId) {
    const before = reportHistory.length;

    reportHistory = reportHistory.filter(function (item) {
      return item.reportId !== reportId;
    });

    return reportHistory.length !== before;
  }

  function clearHistory() {
    reportHistory = [];
    return true;
  }

  SX.vehicleRaceSessionReport = {
    generate: generate,
    createHTML: createHTML,
    exportJSON: exportJSON,
    getHistory: getHistory,
    getReport: getReport,
    deleteReport: deleteReport,
    clearHistory: clearHistory,
    formatDuration: formatDuration
  };

  console.log("[SUPERX] Race Session Report ready.");

})(window);

/* ======================= FILE 120 END ======================= */
 
