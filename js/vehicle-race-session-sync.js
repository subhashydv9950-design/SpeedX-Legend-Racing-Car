
/* =========================================================
   SUPERX LEGEND — FILE 126
   FILE: js/vehicle-race-session-sync.js

   PURPOSE:
   - Synchronize session collections.
   - Detect duplicate records.
   - Detect conflicting records.
   - Preview merge operations.
   - Maintain synchronization history.

   DEPENDENCIES: None
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_race_session_sync_v1";
  const MAX_HISTORY = 100;
  const MAX_RECORDS = 10000;

  function isObject(value) {
    return value !== null &&
      typeof value === "object" &&
      !Array.isArray(value);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function makeId() {
    return "SXSYNC-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 8);
  }

  function getId(record) {
    if (!isObject(record)) return "";

    return String(
      record.id ||
      record.sessionId ||
      ""
    ).trim();
  }

  function fingerprint(record) {
    return [
      record.startedAt || record.createdAt || "",
      record.mode || "",
      record.map || "",
      record.car || "",
      record.player || record.playerName || ""
    ].join("|");
  }

  function getHistory() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      const parsed = value ? JSON.parse(value) : [];

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

  function compareRecords(first, second) {
    const differences = [];

    if (!isObject(first) || !isObject(second)) {
      return {
        identical: false,
        differences: ["Invalid record."]
      };
    }

    const fields = [
      "player",
      "mode",
      "map",
      "car",
      "startedAt",
      "finishedAt",
      "position",
      "distanceKm",
      "coinsEarned",
      "xpEarned"
    ];

    fields.forEach(function (field) {
      if (
        first[field] !== undefined &&
        second[field] !== undefined &&
        first[field] !== second[field]
      ) {
        differences.push(field);
      }
    });

    return {
      identical: differences.length === 0,
      differences: differences
    };
  }

  function previewSync(primaryRecords, secondaryRecords, options) {
    if (
      !Array.isArray(primaryRecords) ||
      !Array.isArray(secondaryRecords)
    ) {
      return {
        success: false,
        error: "Both session collections must be arrays."
      };
    }

    if (
      primaryRecords.length + secondaryRecords.length >
      MAX_RECORDS
    ) {
      return {
        success: false,
        error: "Session count exceeds the allowed limit."
      };
    }

    const settings = isObject(options) ? options : {};

    const primary = [];
    const secondary = [];
    const duplicates = [];
    const conflicts = [];
    const invalid = [];

    primaryRecords.forEach(function (record, index) {
      if (!isObject(record)) {
        invalid.push({
          source: "primary",
          index: index
        });

        return;
      }

      primary.push(clone(record));
    });

    secondaryRecords.forEach(function (record, index) {
      if (!isObject(record)) {
        invalid.push({
          source: "secondary",
          index: index
        });

        return;
      }

      secondary.push({
        record: clone(record),
        index: index
      });
    });

    const idMap = new Map();
    const fingerprintMap = new Map();

    primary.forEach(function (record) {
      const id = getId(record);

      if (id) {
        idMap.set(id, record);
      }

      fingerprintMap.set(fingerprint(record), record);
    });

    const additions = [];

    secondary.forEach(function (item) {
      const record = item.record;
      const id = getId(record);
      const existing = id
        ? idMap.get(id)
        : fingerprintMap.get(fingerprint(record));

      if (!existing) {
        additions.push(record);

        if (id) idMap.set(id, record);

        fingerprintMap.set(fingerprint(record), record);

        return;
      }

      const comparison = compareRecords(existing, record);

      if (comparison.identical) {
        duplicates.push({
          secondaryIndex: item.index,
          sessionId: id || null
        });
      } else {
        conflicts.push({
          secondaryIndex: item.index,
          sessionId: id || null,
          differences: comparison.differences
        });
      }
    });

    const conflictPolicy = settings.conflictPolicy || "keep-primary";

    const resolved = additions.slice();

    if (conflictPolicy === "keep-secondary") {
      conflicts.forEach(function (conflict) {
        const incoming = secondary[conflict.secondaryIndex];

        if (incoming) {
          resolved.push(incoming.record);
        }
      });
    }

    const merged = primary.concat(resolved);

    return {
      success: true,
      preview: true,
      syncId: makeId(),
      conflictPolicy: conflictPolicy,
      mergedRecords: merged,
      additions: additions,
      duplicates: duplicates,
      conflicts: conflicts,
      invalid: invalid,
      summary: {
        primaryCount: primary.length,
        secondaryCount: secondary.length,
        additions: additions.length,
        duplicates: duplicates.length,
        conflicts: conflicts.length,
        invalid: invalid.length,
        finalCount: merged.length
      }
    };
  }

  function applySync(preview) {
    if (
      !isObject(preview) ||
      preview.success !== true ||
      !Array.isArray(preview.mergedRecords)
    ) {
      return {
        success: false,
        error: "Invalid synchronization preview."
      };
    }

    let records;

    try {
      records = clone(preview.mergedRecords);
    } catch (error) {
      return {
        success: false,
        error: "Unable to prepare synchronized records."
      };
    }

    const history = getHistory();

    history.unshift({
      id: preview.syncId || makeId(),
      createdAt: Date.now(),
      additions: preview.summary.additions,
      duplicates: preview.summary.duplicates,
      conflicts: preview.summary.conflicts,
      invalid: preview.summary.invalid,
      finalCount: records.length,
      conflictPolicy: preview.conflictPolicy
    });

    const historySaved = saveHistory(history);

    return {
      success: true,
      records: records,
      count: records.length,
      historySaved: historySaved,
      message: "Synchronization data prepared successfully."
    };
  }

  function getSyncHistory() {
    return getHistory().map(function (item) {
      return {
        id: item.id,
        createdAt: item.createdAt,
        additions: item.additions,
        duplicates: item.duplicates,
        conflicts: item.conflicts,
        invalid: item.invalid,
        finalCount: item.finalCount,
        conflictPolicy: item.conflictPolicy
      };
    });
  }

  function clearSyncHistory() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      return false;
    }
  }

  function getStats() {
    const history = getHistory();

    return {
      totalSyncs: history.length,
      totalAdditions: history.reduce(function (sum, item) {
        return sum + (Number(item.additions) || 0);
      }, 0),
      totalConflicts: history.reduce(function (sum, item) {
        return sum + (Number(item.conflicts) || 0);
      }, 0),
      lastSync: history.length
        ? history[0].createdAt
        : null
    };
  }

  SX.vehicleRaceSessionSync = {
    compareRecords: compareRecords,
    previewSync: previewSync,
    applySync: applySync,
    getSyncHistory: getSyncHistory,
    clearSyncHistory: clearSyncHistory,
    getStats: getStats
  };

  console.log(
    "[SUPERX] Race Session Data Synchronizer ready."
  );

})(window);

/* ======================= FILE 126 END ======================= */
