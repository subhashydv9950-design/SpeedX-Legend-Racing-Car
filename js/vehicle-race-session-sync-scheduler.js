
/* =========================================================
   SUPERX LEGEND — FILE 128
   FILE: js/vehicle-race-session-sync-scheduler.js

   PURPOSE:
   - Schedule pending cloud sync jobs.
   - Calculate retry delays.
   - Prioritize synchronization jobs.
   - Check network availability.
   - Maintain scheduler history.

   DEPENDENCY:
   FILE 127 — vehicle-race-session-cloud-sync.js

   NOTE:
   This scheduler prepares jobs only.
   It does not perform network uploads.
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_race_sync_scheduler_v1";

  const DEFAULTS = {
    retryBaseDelay: 5000,
    maxRetryDelay: 300000,
    maxRetries: 5,
    batchSize: 10
  };

  let config = Object.assign({}, DEFAULTS);
  let schedulerRunning = false;
  let scheduledJobs = [];

  function isObject(value) {
    return value !== null &&
      typeof value === "object" &&
      !Array.isArray(value);
  }

  function makeId() {
    return "SXSCHEDULE-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 7);
  }

  function readHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : [];

      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  }

  function saveHistory(history) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(history.slice(0, 100))
      );

      return true;
    } catch (error) {
      return false;
    }
  }

  function calculateRetryDelay(attempts) {
    const count = Math.max(
      0,
      Math.min(20, Number(attempts) || 0)
    );

    return Math.min(
      config.retryBaseDelay * Math.pow(2, count),
      config.maxRetryDelay
    );
  }

  function isNetworkAvailable() {
    return typeof navigator !== "undefined" &&
      navigator.onLine === true;
  }

  function getCloudModule() {
    return SX.vehicleRaceSessionCloudSync || null;
  }

  function getPendingJobs() {
    const cloud = getCloudModule();

    if (!cloud || typeof cloud.getQueue !== "function") {
      return [];
    }

    return cloud.getQueue().filter(function (job) {
      return job.status === "pending";
    });
  }

  function sortJobs(jobs) {
    return jobs.slice().sort(function (a, b) {
      if (a.priority === "high" && b.priority !== "high") {
        return -1;
      }

      if (b.priority === "high" && a.priority !== "high") {
        return 1;
      }

      return Number(a.createdAt) - Number(b.createdAt);
    });
  }

  function createSchedule(options) {
    const settings = isObject(options) ? options : {};

    const pending = sortJobs(getPendingJobs());

    const selected = pending.slice(
      0,
      config.batchSize
    );

    const now = Date.now();

    scheduledJobs = selected.map(function (job) {
      const delay = calculateRetryDelay(job.attempts);

      return {
        scheduleId: makeId(),
        jobId: job.id,
        sessionId: job.sessionId,
        priority: job.priority,
        attempts: job.attempts,
        scheduledAt: now + (
          settings.immediate === true ? 0 : delay
        ),
        delay: settings.immediate === true ? 0 : delay,
        status: "scheduled"
      };
    });

    const history = readHistory();

    history.unshift({
      id: makeId(),
      createdAt: now,
      scheduledCount: scheduledJobs.length,
      networkAvailable: isNetworkAvailable()
    });

    saveHistory(history);

    return {
      success: true,
      schedule: scheduledJobs.slice(),
      count: scheduledJobs.length,
      networkAvailable: isNetworkAvailable()
    };
  }

  function getSchedule() {
    return scheduledJobs.slice();
  }

  function getReadyJobs(now) {
    const currentTime = Number(now) || Date.now();

    return scheduledJobs.filter(function (job) {
      return job.status === "scheduled" &&
        job.scheduledAt <= currentTime;
    });
  }

  function markScheduleStatus(scheduleId, status) {
    const allowed = [
      "scheduled",
      "ready",
      "completed",
      "failed",
      "skipped"
    ];

    if (!allowed.includes(status)) return false;

    const job = scheduledJobs.find(function (item) {
      return item.scheduleId === scheduleId;
    });

    if (!job) return false;

    job.status = status;
    job.updatedAt = Date.now();

    return true;
  }

  function prepareBatch(now) {
    if (!isNetworkAvailable()) {
      return {
        success: false,
        reason: "offline",
        jobs: []
      };
    }

    const ready = getReadyJobs(now);

    return {
      success: true,
      jobs: ready.map(function (job) {
        return Object.assign({}, job);
      }),
      count: ready.length
    };
  }

  function configure(options) {
    if (!isObject(options)) {
      return {
        success: false,
        error: "Invalid scheduler settings."
      };
    }

    if (options.retryBaseDelay !== undefined) {
      config.retryBaseDelay = Math.max(
        1000,
        Math.min(60000, Number(options.retryBaseDelay) || 5000)
      );
    }

    if (options.maxRetryDelay !== undefined) {
      config.maxRetryDelay = Math.max(
        config.retryBaseDelay,
        Math.min(3600000, Number(options.maxRetryDelay) || 300000)
      );
    }

    if (options.maxRetries !== undefined) {
      config.maxRetries = Math.max(
        1,
        Math.min(10, Math.floor(Number(options.maxRetries) || 5))
      );
    }

    if (options.batchSize !== undefined) {
      config.batchSize = Math.max(
        1,
        Math.min(50, Math.floor(Number(options.batchSize) || 10))
      );
    }

    return {
      success: true,
      settings: Object.assign({}, config)
    };
  }

  function start() {
    if (schedulerRunning) return false;

    schedulerRunning = true;
    return true;
  }

  function stop() {
    schedulerRunning = false;
    return true;
  }

  function getState() {
    return {
      running: schedulerRunning,
      networkAvailable: isNetworkAvailable(),
      scheduledCount: scheduledJobs.length,
      readyCount: getReadyJobs().length,
      settings: Object.assign({}, config)
    };
  }

  function getHistory() {
    return readHistory().map(function (item) {
      return Object.assign({}, item);
    });
  }

  function clearHistory() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      return false;
    }
  }

  SX.vehicleRaceSessionSyncScheduler = {
    calculateRetryDelay: calculateRetryDelay,
    isNetworkAvailable: isNetworkAvailable,
    createSchedule: createSchedule,
    getSchedule: getSchedule,
    getReadyJobs: getReadyJobs,
    markScheduleStatus: markScheduleStatus,
    prepareBatch: prepareBatch,
    configure: configure,
    start: start,
    stop: stop,
    getState: getState,
    getHistory: getHistory,
    clearHistory: clearHistory
  };

  console.log(
    "[SUPERX] Race Session Sync Scheduler ready."
  );

})(window);

/* ======================= FILE 128 END ======================= */
