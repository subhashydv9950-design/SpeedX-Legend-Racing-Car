
/* =========================================================
   FILE 129: vehicle-race-session-sync-dashboard.js
   PATH: js/vehicle-race-session-sync-dashboard.js

   PURPOSE:
   Read-only dashboard for race session backup,
   recovery and synchronization systems.

   Does not perform uploads or start background timers.
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  if (SX.vehicleRaceSessionSyncDashboard) {
    console.warn("SUPERX: Sync dashboard already initialized.");
    return;
  }

  const MODULE_NAME = "vehicleRaceSessionSyncDashboard";

  const dependencies = {
    backup: "vehicleRaceSessionBackup",
    recovery: "vehicleRaceSessionRecovery",
    sync: "vehicleRaceSessionSync",
    cloudSync: "vehicleRaceSessionCloudSync",
    scheduler: "vehicleRaceSessionSyncScheduler"
  };

  let lastSnapshot = null;
  let refreshCount = 0;
  let lastRefreshAt = null;

  function safeCall(target, method, fallback) {
    try {
      if (
        target &&
        typeof target[method] === "function"
      ) {
        const result = target[method]();

        if (result !== undefined) {
          return result;
        }
      }
    } catch (error) {
      console.warn(
        "SUPERX dashboard read error:",
        method,
        error
      );
    }

    return fallback;
  }

  function safeState(moduleName) {
    const module = SX[moduleName];

    if (!module) {
      return {
        available: false,
        state: null
      };
    }

    const state = safeCall(
      module,
      "getState",
      null
    );

    return {
      available: true,
      state: state
    };
  }

  function countItems(value) {
    if (Array.isArray(value)) {
      return value.length;
    }

    if (
      value &&
      typeof value === "object"
    ) {
      return Object.keys(value).length;
    }

    return 0;
  }

  function getModuleOverview(moduleName) {
    const module = SX[moduleName];

    if (!module) {
      return {
        available: false,
        itemCount: 0,
        state: null
      };
    }

    const state = safeCall(
      module,
      "getState",
      null
    );

    const history = safeCall(
      module,
      "getHistory",
      []
    );

    const stats = safeCall(
      module,
      "getStats",
      null
    );

    return {
      available: true,
      itemCount: countItems(history),
      state: state,
      stats: stats
    };
  }

  function getSchedulerOverview() {
    const scheduler = SX[dependencies.scheduler];

    if (!scheduler) {
      return {
        available: false,
        schedule: null,
        state: null
      };
    }

    return {
      available: true,

      schedule: safeCall(
        scheduler,
        "getSchedule",
        null
      ),

      state: safeCall(
        scheduler,
        "getState",
        null
      ),

      history: safeCall(
        scheduler,
        "getHistory",
        []
      )
    };
  }

  function getQueueOverview() {
    const cloudSync = SX[dependencies.cloudSync];

    if (!cloudSync) {
      return {
        available: false,
        state: null,
        queue: null
      };
    }

    return {
      available: true,

      state: safeCall(
        cloudSync,
        "getState",
        null
      ),

      queue: safeCall(
        cloudSync,
        "getQueue",
        null
      ),

      history: safeCall(
        cloudSync,
        "getHistory",
        []
      )
    };
  }

  function getDependencyStatus() {
    const result = {};

    Object.keys(dependencies).forEach(function (key) {
      const moduleName = dependencies[key];

      result[key] = {
        module: moduleName,
        available: !!SX[moduleName]
      };
    });

    return result;
  }

  function calculateSummary(snapshot) {
    const dependencyStatus = snapshot.dependencies;

    const availableCount = Object.keys(
      dependencyStatus
    ).filter(function (key) {
      return dependencyStatus[key].available;
    }).length;

    const totalCount = Object.keys(
      dependencyStatus
    ).length;

    return {
      availableModules: availableCount,
      totalModules: totalCount,

      missingModules: totalCount - availableCount,

      allModulesAvailable:
        availableCount === totalCount,

      refreshCount: refreshCount
    };
  }

  function createSnapshot() {
    const snapshot = {
      module: MODULE_NAME,

      generatedAt: new Date().toISOString(),

      readOnly: true,

      dependencies: getDependencyStatus(),

      backup: getModuleOverview(
        dependencies.backup
      ),

      recovery: getModuleOverview(
        dependencies.recovery
      ),

      sync: getModuleOverview(
        dependencies.sync
      ),

      cloudSync: getQueueOverview(),

      scheduler: getSchedulerOverview()
    };

    snapshot.summary = calculateSummary(snapshot);

    return snapshot;
  }

  function refresh() {
    refreshCount += 1;

    lastRefreshAt = new Date().toISOString();

    lastSnapshot = createSnapshot();

    return getSnapshot();
  }

  function getSnapshot() {
    if (!lastSnapshot) {
      return refresh();
    }

    return JSON.parse(
      JSON.stringify(lastSnapshot)
    );
  }

  function getLastRefreshTime() {
    return lastRefreshAt;
  }

  function getRefreshCount() {
    return refreshCount;
  }

  function getDependency(name) {
    if (
      !Object.prototype.hasOwnProperty.call(
        dependencies,
        name
      )
    ) {
      return null;
    }

    return {
      name: name,
      module: dependencies[name],
      available: !!SX[dependencies[name]]
    };
  }

  function getDashboardStatus() {
    const snapshot = getSnapshot();

    return {
      ready: snapshot.summary.allModulesAvailable,

      availableModules:
        snapshot.summary.availableModules,

      totalModules:
        snapshot.summary.totalModules,

      lastRefreshAt: lastRefreshAt,

      readOnly: true
    };
  }

  function resetDashboardCache() {
    lastSnapshot = null;
    lastRefreshAt = null;
    refreshCount = 0;

    return true;
  }

  SX[MODULE_NAME] = {
    refresh: refresh,

    getSnapshot: getSnapshot,

    getDashboardStatus: getDashboardStatus,

    getDependency: getDependency,

    getDependencyStatus: getDependencyStatus,

    getLastRefreshTime: getLastRefreshTime,

    getRefreshCount: getRefreshCount,

    resetDashboardCache: resetDashboardCache
  };

  console.info(
    "SUPERX: Race Session Sync Dashboard initialized."
  );

})(window);

/* ================= END FILE 129 ================= */
