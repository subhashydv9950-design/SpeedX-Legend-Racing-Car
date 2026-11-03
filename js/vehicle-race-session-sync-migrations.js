
/* =========================================================
   FILE 132: vehicle-race-session-sync-migrations.js
   PATH: js/vehicle-race-session-sync-migrations.js

   PURPOSE:
   Version-aware race session data migration.

   SAFETY:
   - Original input is never modified.
   - Migration steps must be registered explicitly.
   - No automatic cloud sync or data overwrite.
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  if (SX.vehicleRaceSessionSyncMigrations) {
    console.warn("SUPERX: Migration manager already exists.");
    return;
  }

  const CURRENT_VERSION = 1;
  const migrations = new Map();
  const migrationHistory = [];
  const MAX_HISTORY = 200;

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return null;
    }
  }

  function validVersion(version) {
    return (
      Number.isInteger(version) &&
      version >= 1 &&
      version <= 10000
    );
  }

  function recordHistory(entry) {
    migrationHistory.unshift({
      ...entry,
      timestamp: new Date().toISOString()
    });

    if (migrationHistory.length > MAX_HISTORY) {
      migrationHistory.length = MAX_HISTORY;
    }
  }

  function registerMigration(fromVersion, migrationFn) {
    if (!validVersion(fromVersion)) {
      return {
        success: false,
        error: "Invalid source version."
      };
    }

    if (typeof migrationFn !== "function") {
      return {
        success: false,
        error: "Migration must be a function."
      };
    }

    if (migrations.has(fromVersion)) {
      return {
        success: false,
        error: "Migration already registered."
      };
    }

    migrations.set(fromVersion, migrationFn);

    return {
      success: true,
      fromVersion: fromVersion,
      toVersion: fromVersion + 1
    };
  }

  function validatePayload(payload) {
    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload)
    ) {
      return {
        valid: false,
        error: "Payload must be an object."
      };
    }

    if (!validVersion(payload.schemaVersion)) {
      return {
        valid: false,
        error: "Missing or invalid schemaVersion."
      };
    }

    if (
      payload.sessionId !== undefined &&
      typeof payload.sessionId !== "string"
    ) {
      return {
        valid: false,
        error: "sessionId must be a string."
      };
    }

    return {
      valid: true,
      version: payload.schemaVersion
    };
  }

  function previewMigration(payload, targetVersion) {
    const validation = validatePayload(payload);

    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    targetVersion =
      targetVersion === undefined
        ? CURRENT_VERSION
        : targetVersion;

    if (!validVersion(targetVersion)) {
      return {
        success: false,
        error: "Invalid target version."
      };
    }

    const sourceVersion = payload.schemaVersion;

    if (sourceVersion > targetVersion) {
      return {
        success: false,
        error: "Downgrade migrations are not supported."
      };
    }

    if (sourceVersion === targetVersion) {
      return {
        success: true,
        migrated: false,
        sourceVersion: sourceVersion,
        targetVersion: targetVersion,
        data: clone(payload)
      };
    }

    let workingData = clone(payload);

    if (!workingData) {
      return {
        success: false,
        error: "Payload could not be safely copied."
      };
    }

    const appliedSteps = [];

    try {
      for (
        let version = sourceVersion;
        version < targetVersion;
        version++
      ) {
        const migration = migrations.get(version);

        if (!migration) {
          throw new Error(
            "Missing migration from version " + version
          );
        }

        const input = clone(workingData);
        const output = migration(input);

        if (
          !output ||
          typeof output !== "object" ||
          Array.isArray(output)
        ) {
          throw new Error(
            "Migration returned invalid data at version " +
            version
          );
        }

        workingData = clone(output);

        if (!workingData) {
          throw new Error(
            "Migration output could not be copied."
          );
        }

        workingData.schemaVersion = version + 1;

        appliedSteps.push({
          from: version,
          to: version + 1
        });
      }
    } catch (error) {
      recordHistory({
        status: "failed",
        sourceVersion: sourceVersion,
        targetVersion: targetVersion,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        appliedSteps: appliedSteps
      };
    }

    recordHistory({
      status: "previewed",
      sourceVersion: sourceVersion,
      targetVersion: targetVersion,
      steps: appliedSteps.length
    });

    return {
      success: true,
      migrated: true,
      previewOnly: true,
      sourceVersion: sourceVersion,
      targetVersion: targetVersion,
      appliedSteps: appliedSteps,
      data: workingData
    };
  }

  function getRegisteredVersions() {
    return Array.from(
      migrations.keys()
    ).sort(function (a, b) {
      return a - b;
    });
  }

  function getHistory() {
    return clone(migrationHistory);
  }

  function clearHistory() {
    migrationHistory.length = 0;
    return true;
  }

  function getStatus() {
    return {
      currentVersion: CURRENT_VERSION,
      registeredMigrations: migrations.size,
      registeredFromVersions: getRegisteredVersions(),
      historyCount: migrationHistory.length,
      downgradeSupported: false,
      automaticApply: false
    };
  }

  SX.vehicleRaceSessionSyncMigrations = {
    CURRENT_VERSION: CURRENT_VERSION,

    registerMigration: registerMigration,

    validatePayload: validatePayload,

    previewMigration: previewMigration,

    getRegisteredVersions: getRegisteredVersions,

    getHistory: getHistory,

    clearHistory: clearHistory,

    getStatus: getStatus
  };

  console.info(
    "SUPERX: Race Session Sync Migration Manager initialized."
  );

})(window);

/* ================= END FILE 132 ================= */
