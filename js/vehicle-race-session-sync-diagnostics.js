
/* =========================================================
   FILE 133: vehicle-race-session-sync-diagnostics.js
   PATH: js/vehicle-race-session-sync-diagnostics.js

   PURPOSE:
   Read-only diagnostics for race session data systems.

   DEPENDENCIES:
   FILE 123 - Session Integrity
   FILE 124 - Session Backup
   FILE 125 - Session Recovery
   FILE 127 - Cloud Sync Queue
   FILE 128 - Sync Scheduler
   FILE 129 - Sync Dashboard
   FILE 130 - Sync Conflicts
   FILE 132 - Sync Migrations

   SAFETY:
   - No data modification.
   - No automatic conflict resolution.
   - No cloud upload.
   - No automatic cleanup.
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  if (SX.vehicleRaceSessionSyncDiagnostics) {
    console.warn("SUPERX: Diagnostics already initialized.");
    return;
  }

  const MODULES = {
    integrity: "vehicleRaceSessionIntegrity",
    backup: "vehicleRaceSessionBackup",
    recovery: "vehicleRaceSessionRecovery",
    cloudSync: "vehicleRaceSessionCloudSync",
    scheduler: "vehicleRaceSessionSyncScheduler",
    dashboard: "vehicleRaceSessionSyncDashboard",
    conflicts: "vehicleRaceSessionSyncConflicts",
    migrations: "vehicleRaceSessionSyncMigrations"
  };

  let lastReport = null;
  let reportCount = 0;

  function safeCall(moduleName, method, fallback) {
    const module = SX[moduleName];

    if (!module || typeof module[method] !== "function") {
      return fallback;
    }

    try {
      const result = module[method]();

      return result === undefined ? fallback : result;
    } catch (error) {
      return fallback;
    }
  }

  function isAvailable(moduleName) {
    return !!SX[moduleName];
  }

  function inspectModules() {
    const result = {};

    Object.keys(MODULES).forEach(function (key) {
      const name = MODULES[key];

      result[key] = {
        module: name,
        available: isAvailable(name)
      };
    });

    return result;
  }

  function inspectConflicts() {
    const manager = SX[MODULES.conflicts];

    if (!manager) {
      return {
        available: false,
        pending: null,
        statistics: null
      };
    }

    return {
      available: true,

      pending: safeCall(
        MODULES.conflicts,
        "getPendingCount",
        0
      ),

      statistics: safeCall(
        MODULES.conflicts,
        "getStatistics",
        null
      )
    };
  }

  function inspectScheduler() {
    const scheduler = SX[MODULES.scheduler];

    if (!scheduler) {
      return {
        available: false,
        state: null,
        schedule: null
      };
    }

    return {
      available: true,

      state: safeCall(
        MODULES.scheduler,
        "getState",
        null
      ),

      schedule: safeCall(
        MODULES.scheduler,
        "getSchedule",
        null
      )
    };
  }

  function inspectMigration() {
    const manager = SX[MODULES.migrations];

    if (!manager) {
      return {
        available: false,
        status: null
      };
    }

    return {
      available: true,

      status: safeCall(
        MODULES.migrations,
        "getStatus",
        null
      )
    };
  }

  function inspectDashboard() {
    const manager = SX[MODULES.dashboard];

    if (!manager) {
      return {
        available: false,
        status: null
      };
    }

    return {
      available: true,

      status: safeCall(
        MODULES.dashboard,
        "getDashboardStatus",
        null
      )
    };
  }

  function buildIssues(report) {
    const issues = [];

    Object.keys(report.modules).forEach(function (key) {
      if (!report.modules[key].available) {
        issues.push({
          code: "MODULE_MISSING",
          severity: "warning",
          module: report.modules[key].module,
          message: key + " module is not loaded."
        });
      }
    });

    if (
      report.conflicts.available &&
      typeof report.conflicts.pending === "number" &&
      report.conflicts.pending > 0
    ) {
      issues.push({
        code: "PENDING_CONFLICTS",
        severity: "warning",
        message:
          report.conflicts.pending +
          " synchronization conflict(s) need review."
      });
    }

    if (
      report.migration.available &&
      report.migration.status &&
      report.migration.status.registeredMigrations === 0
    ) {
      issues.push({
        code: "NO_MIGRATIONS_REGISTERED",
        severity: "info",
        message:
          "No schema migration steps are registered."
      });
    }

    if (
      report.scheduler.available &&
      !report.scheduler.schedule
    ) {
      issues.push({
        code: "NO_SYNC_SCHEDULE",
        severity: "info",
        message:
          "No sync schedule is currently available."
      });
    }

    return issues;
  }

  function getHealthStatus(report) {
    const hasErrors = report.issues.some(function (issue) {
      return issue.severity === "error";
    });

    const hasWarnings = report.issues.some(function (issue) {
      return issue.severity === "warning";
    });

    if (hasErrors) {
      return "attention-required";
    }

    if (hasWarnings) {
      return "review-recommended";
    }

    return "no-detected-issues";
  }

  function runDiagnostics() {
    const report = {
      reportId:
        "SX-DIAG-" + Date.now().toString(36),

      generatedAt: new Date().toISOString(),

      readOnly: true,

      modules: inspectModules(),

      conflicts: inspectConflicts(),

      scheduler: inspectScheduler(),

      migration: inspectMigration(),

      dashboard: inspectDashboard(),

      issues: []
    };

    report.issues = buildIssues(report);

    report.health = getHealthStatus(report);

    report.summary = {
      totalModules: Object.keys(report.modules).length,

      availableModules: Object.keys(report.modules).filter(
        function (key) {
          return report.modules[key].available;
        }
      ).length,

      issueCount: report.issues.length,

      pendingConflicts:
        report.conflicts.pending || 0
    };

    reportCount += 1;

    lastReport = report;

    return JSON.parse(JSON.stringify(report));
  }

  function getLastReport() {
    if (!lastReport) {
      return null;
    }

    return JSON.parse(JSON.stringify(lastReport));
  }

  function getReportCount() {
    return reportCount;
  }

  function getModuleStatus(key) {
    if (!MODULES[key]) {
      return null;
    }

    return {
      key: key,
      module: MODULES[key],
      available: isAvailable(MODULES[key])
    };
  }

  function resetReportCache() {
    lastReport = null;
    reportCount = 0;

    return true;
  }

  SX.vehicleRaceSessionSyncDiagnostics = {
    runDiagnostics: runDiagnostics,

    getLastReport: getLastReport,

    getReportCount: getReportCount,

    getModuleStatus: getModuleStatus,

    resetReportCache: resetReportCache,

    getModuleList: function () {
      return Object.assign({}, MODULES);
    }
  };

  console.info(
    "SUPERX: Race Session Sync Diagnostics initialized."
  );

})(window);

/* ================= END FILE 133 ================= */
