
/* =========================================================
   SUPERX LEGEND — FILE 125
   FILE: js/vehicle-race-session-recovery.js

   PURPOSE:
   - Recover incomplete race session records.
   - Detect duplicate sessions.
   - Isolate invalid records.
   - Preview recovery before applying.
   - Maintain recovery history.

   DEPENDENCIES: None
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_race_session_recovery_v1";
  const MAX_HISTORY = 100;
  const MAX_RECORDS = 10000;

  function isObject(value) {
    return value !== null &&
      typeof value === "object" &&
      !Array.isArray(value);
  }

  function safeNumber(value, fallback) {
    const result = Number(value);

    return Number.isFinite(result)
      ? result
      : fallback;
  }

  function safeText(value, fallback, limit) {
    if (typeof value !== "string") return fallback;

    return value
      .replace(/[\u0000-\u001F\u007F]/g, "")
      .trim()
      .slice(0, limit || 100) || fallback;
  }

  function makeId() {
    return "SXREC-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 8);
  }

  function readHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];

      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function saveHistory(history) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(history.slice(0, MAX_HISTORY))
      );

      return true;
    } catch (error) {
      return false;
    }
  }

  function getSessionKey(session) {
    if (session.id || session.sessionId) {
      return String(session.id || session.sessionId);
    }

    return [
      session.startedAt || session.createdAt || "",
      session.mode || "",
      session.map || "",
      session.car || ""
    ].join("|");
  }

  function inspectRecord(record, index) {
    const issues = [];

    if (!isObject(record)) {
      return {
        index: index,
        valid: false,
        issues: ["Record is not an object."]
      };
    }

    if (!record.id && !record.sessionId) {
      issues.push("Session ID missing.");
    }

    if (!record.startedAt && !record.createdAt) {
      issues.push("Session start time missing.");
    }

    if (
      record.finishedAt &&
      record.startedAt &&
      safeNumber(record.finishedAt, 0) <
        safeNumber(record.startedAt, 0)
    ) {
      issues.push("Invalid session time range.");
    }

    if (
      record.distanceKm !== undefined &&
      (
        safeNumber(record.distanceKm, -1) < 0
      )
    ) {
      issues.push("Invalid distance.");
    }

    if (
      record.lapTimes !== undefined &&
      !Array.isArray(record.lapTimes)
    ) {
      issues.push("Lap times format is invalid.");
    }

    return {
      index: index,
      valid: issues.length === 0,
      issues: issues
    };
  }

  function recoverRecord(record, options) {
    if (!isObject(record)) {
      return {
        success: false,
        error: "Record is not recoverable."
      };
    }

    const settings = isObject(options) ? options : {};

    const recovered = {};

    recovered.id = safeText(
      record.id || record.sessionId,
      makeId(),
      120
    );

    recovered.player = safeText(
      record.player || record.playerName,
      "Player",
      80
    );

    recovered.mode = safeText(
      record.mode,
      "Unknown Mode",
      50
    );

    recovered.map = safeText(
      record.map,
      "Unknown Map",
      100
    );

    recovered.car = safeText(
      record.car,
      "Unknown Car",
      100
    );

    recovered.startedAt = safeNumber(
      record.startedAt || record.createdAt,
      settings.defaultStartTime || Date.now()
    );

    recovered.finishedAt = safeNumber(
      record.finishedAt,
      0
    );

    recovered.distanceKm = Math.max(
      0,
      safeNumber(record.distanceKm, 0)
    );

    recovered.coinsEarned = Math.max(
      0,
      safeNumber(record.coinsEarned, 0)
    );

    recovered.xpEarned = Math.max(
      0,
      safeNumber(record.xpEarned, 0)
    );

    recovered.position = Math.max(
      0,
      safeNumber(record.position, 0)
    );

    recovered.lapTimes = Array.isArray(record.lapTimes)
      ? record.lapTimes
          .map(function (lap) {
            return safeNumber(lap, 0);
          })
          .filter(function (lap) {
            return lap > 0;
          })
          .slice(0, 100)
      : [];

    recovered.recoveredAt = Date.now();
    recovered.recoveryVersion = 1;

    return {
      success: true,
      data: recovered
    };
  }

  function previewRecovery(records, options) {
    if (!Array.isArray(records)) {
      return {
        success: false,
        error: "Records must be an array."
      };
    }

    if (records.length > MAX_RECORDS) {
      return {
        success: false,
        error: "Record limit exceeded."
      };
    }

    const recovered = [];
    const rejected = [];
    const duplicates = [];
    const seen = new Set();

    records.forEach(function (record, index) {
      const inspection = inspectRecord(record, index);

      if (!inspection.valid && !isObject(record)) {
        rejected.push({
          index: index,
          issues: inspection.issues
        });

        return;
      }

      const result = recoverRecord(record, options);

      if (!result.success) {
        rejected.push({
          index: index,
          issues: [result.error]
        });

        return;
      }

      const key = getSessionKey(result.data);

      if (seen.has(key)) {
        duplicates.push({
          index: index,
          sessionId: result.data.id
        });

        return;
      }

      seen.add(key);

      recovered.push({
        originalIndex: index,
        data: result.data,
        issues: inspection.issues
      });
    });

    return {
      success: true,
      recoveryId: makeId(),
      preview: true,
      recovered: recovered,
      rejected: rejected,
      duplicates: duplicates,
      summary: {
        total: records.length,
        recovered: recovered.length,
        rejected: rejected.length,
        duplicates: duplicates.length
      }
    };
  }

  function applyRecovery(preview, options) {
    if (
      !isObject(preview) ||
      preview.success !== true ||
      !Array.isArray(preview.recovered)
    ) {
      return {
        success: false,
        error: "Invalid recovery preview."
      };
    }

    const settings = isObject(options) ? options : {};

    const recovered = preview.recovered.map(function (item) {
      return item.data;
    });

    let finalRecords = recovered;

    if (settings.merge === true) {
      const existing = Array.isArray(settings.existingRecords)
        ? settings.existingRecords
        : [];

      const seen = new Set();

      finalRecords = [];

      existing.concat(recovered).forEach(function (record) {
        if (!isObject(record)) return;

        const key = getSessionKey(record);

        if (!seen.has(key)) {
          seen.add(key);
          finalRecords.push(record);
        }
      });
    }

    const history = readHistory();

    history.unshift({
      id: preview.recoveryId || makeId(),
      createdAt: Date.now(),
      recoveredCount: recovered.length,
      rejectedCount: Array.isArray(preview.rejected)
        ? preview.rejected.length
        : 0,
      duplicateCount: Array.isArray(preview.duplicates)
        ? preview.duplicates.length
        : 0,
      mode: settings.merge === true ? "merge" : "replace"
    });

    const historySaved = saveHistory(history);

    return {
      success: true,
      records: finalRecords,
      recoveredCount: recovered.length,
      totalCount: finalRecords.length,
      mode: settings.merge === true ? "merge" : "replace",
      historySaved: historySaved
    };
  }

  function getHistory() {
    return readHistory().map(function (item) {
      return {
        id: item.id,
        createdAt: item.createdAt,
        recoveredCount: item.recoveredCount,
        rejectedCount: item.rejectedCount,
        duplicateCount: item.duplicateCount,
        mode: item.mode
      };
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

  function getStats() {
    const history = readHistory();

    return {
      recoveryCount: history.length,
      totalRecovered: history.reduce(function (sum, item) {
        return sum + (Number(item.recoveredCount) || 0);
      }, 0),
      latestRecovery: history.length
        ? history[0].createdAt
        : null
    };
  }

  SX.vehicleRaceSessionRecovery = {
    inspectRecord: inspectRecord,
    recoverRecord: recoverRecord,
    previewRecovery: previewRecovery,
    applyRecovery: applyRecovery,
    getHistory: getHistory,
    clearHistory: clearHistory,
    getStats: getStats
  };

  console.log(
    "[SUPERX] Race Session Recovery Manager ready."
  );

})(window);

/* ======================= FILE 125 END ======================= */
 
