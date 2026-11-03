
/* =========================================================
   FILE 130: vehicle-race-session-sync-conflicts.js
   PATH: js/vehicle-race-session-sync-conflicts.js

   PURPOSE:
   Manage race-session synchronization conflicts.

   SAFETY:
   - No automatic data overwrite.
   - No fake cloud connection.
   - Resolution requires an explicit choice.
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  if (SX.vehicleRaceSessionSyncConflicts) {
    console.warn("SUPERX: Sync conflict manager already exists.");
    return;
  }

  const conflicts = [];
  const MAX_CONFLICTS = 500;

  const VALID_CHOICES = [
    "keep-local",
    "keep-remote",
    "keep-both"
  ];

  function createId() {
    return "sxc_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 9);
  }

  function clone(value) {
    if (value === undefined) {
      return null;
    }

    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return null;
    }
  }

  function findConflict(conflictId) {
    return conflicts.find(function (item) {
      return item.id === conflictId;
    }) || null;
  }

  function createConflict(options) {
    options = options || {};

    const sessionId = String(
      options.sessionId || ""
    ).trim();

    if (!sessionId) {
      return {
        success: false,
        error: "A valid sessionId is required."
      };
    }

    const conflict = {
      id: createId(),

      sessionId: sessionId,

      type: String(
        options.type || "version-mismatch"
      ),

      localVersion:
        clone(options.localVersion),

      remoteVersion:
        clone(options.remoteVersion),

      localData:
        clone(options.localData),

      remoteData:
        clone(options.remoteData),

      status: "pending",

      resolution: null,

      createdAt: new Date().toISOString(),

      resolvedAt: null
    };

    conflicts.unshift(conflict);

    if (conflicts.length > MAX_CONFLICTS) {
      conflicts.length = MAX_CONFLICTS;
    }

    return {
      success: true,
      conflict: clone(conflict)
    };
  }

  function resolveConflict(conflictId, choice) {
    const conflict = findConflict(conflictId);

    if (!conflict) {
      return {
        success: false,
        error: "Conflict not found."
      };
    }

    if (conflict.status !== "pending") {
      return {
        success: false,
        error: "This conflict is already closed."
      };
    }

    if (VALID_CHOICES.indexOf(choice) === -1) {
      return {
        success: false,
        error: "Invalid resolution choice."
      };
    }

    conflict.status = "resolved";

    conflict.resolution = choice;

    conflict.resolvedAt = new Date().toISOString();

    let selectedData = null;

    if (choice === "keep-local") {
      selectedData = clone(conflict.localData);
    }

    if (choice === "keep-remote") {
      selectedData = clone(conflict.remoteData);
    }

    if (choice === "keep-both") {
      selectedData = {
        local: clone(conflict.localData),
        remote: clone(conflict.remoteData)
      };
    }

    return {
      success: true,

      conflictId: conflict.id,

      resolution: choice,

      selectedData: selectedData,

      appliedAutomatically: false
    };
  }

  function ignoreConflict(conflictId) {
    const conflict = findConflict(conflictId);

    if (!conflict) {
      return {
        success: false,
        error: "Conflict not found."
      };
    }

    if (conflict.status !== "pending") {
      return {
        success: false,
        error: "Conflict is already closed."
      };
    }

    conflict.status = "ignored";

    conflict.resolvedAt = new Date().toISOString();

    return {
      success: true,
      conflictId: conflict.id,
      status: conflict.status
    };
  }

  function getConflict(conflictId) {
    const conflict = findConflict(conflictId);

    return clone(conflict);
  }

  function getConflicts(filters) {
    filters = filters || {};

    let result = conflicts.slice();

    if (filters.status) {
      result = result.filter(function (item) {
        return item.status === filters.status;
      });
    }

    if (filters.sessionId) {
      result = result.filter(function (item) {
        return item.sessionId === String(
          filters.sessionId
        );
      });
    }

    return clone(result);
  }

  function getPendingCount() {
    return conflicts.filter(function (item) {
      return item.status === "pending";
    }).length;
  }

  function getStatistics() {
    return {
      total: conflicts.length,

      pending: conflicts.filter(function (item) {
        return item.status === "pending";
      }).length,

      resolved: conflicts.filter(function (item) {
        return item.status === "resolved";
      }).length,

      ignored: conflicts.filter(function (item) {
        return item.status === "ignored";
      }).length
    };
  }

  function removeConflict(conflictId) {
    const index = conflicts.findIndex(function (item) {
      return item.id === conflictId;
    });

    if (index === -1) {
      return false;
    }

    conflicts.splice(index, 1);

    return true;
  }

  function clearClosedConflicts() {
    const before = conflicts.length;

    for (let i = conflicts.length - 1; i >= 0; i--) {
      if (conflicts[i].status !== "pending") {
        conflicts.splice(i, 1);
      }
    }

    return {
      removed: before - conflicts.length,
      remaining: conflicts.length
    };
  }

  function clearAll() {
    conflicts.length = 0;

    return true;
  }

  SX.vehicleRaceSessionSyncConflicts = {
    createConflict: createConflict,

    resolveConflict: resolveConflict,

    ignoreConflict: ignoreConflict,

    getConflict: getConflict,

    getConflicts: getConflicts,

    getPendingCount: getPendingCount,

    getStatistics: getStatistics,

    removeConflict: removeConflict,

    clearClosedConflicts: clearClosedConflicts,

    clearAll: clearAll,

    getChoices: function () {
      return VALID_CHOICES.slice();
    }
  };

  console.info(
    "SUPERX: Race Session Sync Conflict Manager initialized."
  );

})(window);

/* ================= END FILE 130 ================= */
