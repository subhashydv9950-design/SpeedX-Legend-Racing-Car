
/* =========================================================
   SUPERX LEGEND — FILE 121
   FILE: js/vehicle-race-session-report-export.js

   PURPOSE:
   - Export race reports as HTML, JSON and CSV.
   - Download generated files locally.
   - Print report using a temporary browser window.
   - Does not modify original race session records.
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const MAX_FILE_NAME = 70;

  function clean(value, limit) {
    return String(value == null ? "" : value)
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
      .trim()
      .slice(0, limit || MAX_FILE_NAME);
  }

  function escapeCSV(value) {
    const text = String(value == null ? "" : value);
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function getReport(reportOrId) {
    if (
      reportOrId &&
      typeof reportOrId === "object" &&
      reportOrId.session
    ) {
      return reportOrId;
    }

    if (
      typeof reportOrId === "string" &&
      SX.vehicleRaceSessionReport &&
      typeof SX.vehicleRaceSessionReport.getReport === "function"
    ) {
      return SX.vehicleRaceSessionReport.getReport(reportOrId);
    }

    return null;
  }

  function createFileName(report, extension) {
    const sessionId = clean(
      report.session.sessionId,
      35
    ) || "session";

    return "SUPERX-Race-Report-" +
      sessionId + "." + extension;
  }

  function createJSON(reportOrId) {
    const report = getReport(reportOrId);

    if (!report) return null;

    return JSON.stringify(report, null, 2);
  }

  function createHTML(reportOrId) {
    const report = getReport(reportOrId);

    if (!report) return null;

    const manager = SX.vehicleRaceSessionReport;

    if (
      !manager ||
      typeof manager.createHTML !== "function"
    ) {
      return null;
    }

    return manager.createHTML(report);
  }

  function createCSV(reportOrId) {
    const report = getReport(reportOrId);

    if (!report) return null;

    const session = report.session;
    const stats = report.statistics || {};
    const rewards = report.rewards || {};

    const rows = [
      ["Field", "Value"],
      ["Session ID", session.sessionId],
      ["Title", session.title],
      ["Player", session.player],
      ["Mode", session.mode],
      ["Map", session.map],
      ["Car", session.car],
      ["Started At", session.startedAt],
      ["Finished At", session.finishedAt],
      ["Duration (ms)", session.durationMs],
      ["Position", session.position],
      ["Total Racers", session.totalRacers],
      ["Distance (km)", session.distanceKm],
      ["Average Speed", session.averageSpeed],
      ["Maximum Speed", session.maxSpeed],
      ["Best Lap (ms)", stats.bestLapMs || 0],
      ["Average Lap (ms)", stats.averageLapMs || 0],
      ["Completed Laps", stats.completedLaps || 0],
      ["Penalties", session.penalties],
      ["Clean Race", session.cleanRace],
      ["Completed", session.completed],
      ["Coins Earned", rewards.coins || 0],
      ["XP Earned", rewards.xp || 0]
    ];

    return rows.map(function (row) {
      return row.map(escapeCSV).join(",");
    }).join("\r\n");
  }

  function download(content, fileName, mimeType) {
    if (typeof content !== "string" || !content) {
      return {
        success: false,
        reason: "empty-content"
      };
    }

    if (
      !window.Blob ||
      !window.URL ||
      typeof window.URL.createObjectURL !== "function"
    ) {
      return {
        success: false,
        reason: "download-not-supported"
      };
    }

    let objectURL = null;

    try {
      const blob = new Blob(
        [content],
        { type: mimeType || "text/plain;charset=utf-8" }
      );

      objectURL = window.URL.createObjectURL(blob);

      const anchor = document.createElement("a");

      anchor.href = objectURL;
      anchor.download = clean(fileName, 120) || "report.txt";
      anchor.style.display = "none";

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.setTimeout(function () {
        if (objectURL) {
          window.URL.revokeObjectURL(objectURL);
        }
      }, 1500);

      return { success: true };
    } catch (error) {
      if (objectURL) {
        window.URL.revokeObjectURL(objectURL);
      }

      return {
        success: false,
        reason: "download-failed"
      };
    }
  }

  function downloadJSON(reportOrId) {
    const report = getReport(reportOrId);
    const content = createJSON(report);

    if (!report || !content) {
      return {
        success: false,
        reason: "report-not-found"
      };
    }

    return download(
      content,
      createFileName(report, "json"),
      "application/json;charset=utf-8"
    );
  }

  function downloadHTML(reportOrId) {
    const report = getReport(reportOrId);
    const content = createHTML(report);

    if (!report || !content) {
      return {
        success: false,
        reason: "report-not-found"
      };
    }

    return download(
      content,
      createFileName(report, "html"),
      "text/html;charset=utf-8"
    );
  }

  function downloadCSV(reportOrId) {
    const report = getReport(reportOrId);
    const content = createCSV(report);

    if (!report || !content) {
      return {
        success: false,
        reason: "report-not-found"
      };
    }

    return download(
      content,
      createFileName(report, "csv"),
      "text/csv;charset=utf-8"
    );
  }

  function printReport(reportOrId) {
    const content = createHTML(reportOrId);

    if (!content) {
      return {
        success: false,
        reason: "report-not-found"
      };
    }

    const printWindow = window.open(
      "",
      "_blank",
      "width=900,height=700"
    );

    if (!printWindow) {
      return {
        success: false,
        reason: "popup-blocked"
      };
    }

    try {
      printWindow.document.open();
      printWindow.document.write(content);
      printWindow.document.close();

      printWindow.onload = function () {
        printWindow.focus();
        printWindow.print();
      };

      return { success: true };
    } catch (error) {
      printWindow.close();

      return {
        success: false,
        reason: "print-failed"
      };
    }
  }

  function getFormats() {
    return [
      {
        id: "html",
        label: "HTML Report",
        extension: ".html"
      },
      {
        id: "json",
        label: "JSON Data",
        extension: ".json"
      },
      {
        id: "csv",
        label: "CSV Spreadsheet",
        extension: ".csv"
      }
    ];
  }

  SX.vehicleRaceSessionReportExport = {
    createJSON: createJSON,
    createHTML: createHTML,
    createCSV: createCSV,
    download: download,
    downloadJSON: downloadJSON,
    downloadHTML: downloadHTML,
    downloadCSV: downloadCSV,
    printReport: printReport,
    getFormats: getFormats
  };

  console.log("[SUPERX] Race Session Report Exporter ready.");

})(window);

/* ======================= FILE 121 END ======================= */
