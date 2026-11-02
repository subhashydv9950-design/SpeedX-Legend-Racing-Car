
/* =========================================================
   SUPERX LEGEND — FILE 124
   FILE: js/vehicle-race-session-backup.js

   PURPOSE:
   - Create race session backups.
   - Export and import backup JSON.
   - Validate backup structure.
   - Restore session data.
   - Maintain local backup history.

   DEPENDENCIES: None
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_race_session_backups_v1";
  const BACKUP_VERSION = 1;
  const MAX_BACKUPS = 50;
  const MAX_SESSIONS = 10000;
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  function makeId() {
    return "SXBACKUP-" +
      Date.now().toString(36).toUpperCase() +
      "-" +
      Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isObject(value) {
    return value !== null &&
      typeof value === "object" &&
      !Array.isArray(value);
  }

  function readHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : [];

      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn("[SUPERX] Backup history read failed.", error);
      return [];
    }
  }

  function saveHistory(history) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(history.slice(0, MAX_BACKUPS))
      );

      return true;
    } catch (error) {
      console.warn("[SUPERX] Backup history save failed.", error);
      return false;
    }
  }

  function createBackup(sessions, options) {
    if (!Array.isArray(sessions)) {
      return {
        success: false,
        error: "Sessions must be an array."
      };
    }

    if (sessions.length > MAX_SESSIONS) {
      return {
        success: false,
        error: "Too many sessions for one backup."
      };
    }

    const settings = isObject(options) ? options : {};

    let safeSessions;

    try {
      safeSessions = clone(sessions);
    } catch (error) {
      return {
        success: false,
        error: "Session data cannot be serialized."
      };
    }

    const backup = {
      type: "SUPERX_RACE_SESSION_BACKUP",
      version: BACKUP_VERSION,
      id: makeId(),
      createdAt: Date.now(),
      label: String(settings.label || "Race Session Backup")
        .replace(/[<>]/g, "")
        .slice(0, 80),
      sessionCount: safeSessions.length,
      sessions: safeSessions
    };

    const history = readHistory();

    history.unshift({
      id: backup.id,
      label: backup.label,
      createdAt: backup.createdAt,
      sessionCount: backup.sessionCount
    });

    saveHistory(history);

    return {
      success: true,
      backup: backup
    };
  }

  function validateBackup(backup) {
    const errors = [];
    const warnings = [];

    if (!isObject(backup)) {
      return {
        valid: false,
        errors: ["Backup must be an object."],
        warnings: []
      };
    }

    if (backup.type !== "SUPERX_RACE_SESSION_BACKUP") {
      errors.push("Unknown backup format.");
    }

    if (backup.version !== BACKUP_VERSION) {
      errors.push("Unsupported backup version.");
    }

    if (!Array.isArray(backup.sessions)) {
      errors.push("Session collection is missing.");
    } else {
      if (backup.sessions.length > MAX_SESSIONS) {
        errors.push("Session count exceeds the allowed limit.");
      }

      if (
        Number(backup.sessionCount) !==
        backup.sessions.length
      ) {
        warnings.push("Session count metadata does not match.");
      }

      backup.sessions.forEach(function (session, index) {
        if (!isObject(session)) {
          errors.push("Invalid session at index " + index + ".");
        }
      });
    }

    if (!backup.id || typeof backup.id !== "string") {
      warnings.push("Backup ID is missing.");
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      sessionCount: Array.isArray(backup.sessions)
        ? backup.sessions.length
        : 0
    };
  }

  function exportJSON(backup) {
    const validation = validateBackup(backup);

    if (!validation.valid) {
      return {
        success: false,
        error: "Cannot export an invalid backup.",
        validation: validation
      };
    }

    try {
      return {
        success: true,
        filename: "superx-backup-" + backup.id + ".json",
        content: JSON.stringify(backup, null, 2),
        mimeType: "application/json"
      };
    } catch (error) {
      return {
        success: false,
        error: "Backup export failed."
      };
    }
  }

  function downloadBackup(backup) {
    const result = exportJSON(backup);

    if (!result.success) return result;

    try {
      const blob = new Blob(
        [result.content],
        { type: result.mimeType }
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = result.filename;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 1000);

      return {
        success: true,
        filename: result.filename
      };
    } catch (error) {
      return {
        success: false,
        error: "Backup download failed."
      };
    }
  }

  function parseImport(raw) {
    if (typeof raw !== "string") {
      return {
        success: false,
        error: "Import data must be text."
      };
    }

    if (raw.length > MAX_FILE_SIZE) {
      return {
        success: false,
        error: "Backup file is too large."
      };
    }

    let backup;

    try {
      backup = JSON.parse(raw);
    } catch (error) {
      return {
        success: false,
        error: "Invalid JSON file."
      };
    }

    const validation = validateBackup(backup);

    if (!validation.valid) {
      return {
        success: false,
        error: "Backup validation failed.",
        validation: validation
      };
    }

    return {
      success: true,
      backup: backup,
      validation: validation
    };
  }

  function importFile(file) {
    if (!file) {
      return Promise.resolve({
        success: false,
        error: "No file selected."
      });
    }

    if (file.size > MAX_FILE_SIZE) {
      return Promise.resolve({
        success: false,
        error: "Backup file exceeds 10 MB."
      });
    }

    return file.text().then(parseImport).catch(function () {
      return {
        success: false,
        error: "Unable to read backup file."
      };
    });
  }

  function restoreBackup(backup, options) {
    const validation = validateBackup(backup);

    if (!validation.valid) {
      return {
        success: false,
        error: "Invalid backup cannot be restored.",
        validation: validation
      };
    }

    const settings = isObject(options) ? options : {};

    let restored;

    try {
      restored = clone(backup.sessions);
    } catch (error) {
      return {
        success: false,
        error: "Unable to copy backup sessions."
      };
    }

    if (settings.merge === true) {
      const existing = Array.isArray(settings.existingSessions)
        ? settings.existingSessions
        : [];

      const seen = new Set();

      const merged = [];

      existing.concat(restored).forEach(function (session) {
        const id = session.id || session.sessionId;

        const key = id
          ? String(id)
          : JSON.stringify(session);

        if (!seen.has(key)) {
          seen.add(key);
          merged.push(session);
        }
      });

      restored = merged;
    }

    return {
      success: true,
      sessions: restored,
      restoredCount: restored.length,
      mode: settings.merge === true ? "merge" : "replace",
      message: "Backup data prepared successfully."
    };
  }

  function getHistory() {
    return readHistory().map(function (item) {
      return {
        id: item.id,
        label: item.label,
        createdAt: item.createdAt,
        sessionCount: item.sessionCount
      };
    });
  }

  function deleteHistoryItem(backupId) {
    const history = readHistory();

    const filtered = history.filter(function (item) {
      return item.id !== backupId;
    });

    if (filtered.length === history.length) {
      return false;
    }

    return saveHistory(filtered);
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
      backupCount: history.length,
      totalSessions: history.reduce(function (total, item) {
        return total + (Number(item.sessionCount) || 0);
      }, 0),
      latestBackup: history.length
        ? history[0].createdAt
        : null
    };
  }

  SX.vehicleRaceSessionBackup = {
    createBackup: createBackup,
    validateBackup: validateBackup,
    exportJSON: exportJSON,
    downloadBackup: downloadBackup,
    parseImport: parseImport,
    importFile: importFile,
    restoreBackup: restoreBackup,
    getHistory: getHistory,
    deleteHistoryItem: deleteHistoryItem,
    clearHistory: clearHistory,
    getStats: getStats
  };

  console.log("[SUPERX] Race Session Backup Manager ready.");

})(window);

/* ======================= FILE 124 END ======================= */
        
