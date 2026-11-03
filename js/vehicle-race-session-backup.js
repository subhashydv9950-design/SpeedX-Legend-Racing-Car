
/* =========================================================
   SUPERX LEGEND — FILE 124
   FILE: js/vehicle-race-session-backup.js

   RACE SESSION BACKUP MANAGER
   - Create, validate, export and import backups
   - Restore and merge session history
   - Duplicate-session protection
   - Backup history and statistics
   - File-size and data-integrity checks

   DEPENDENCIES: None
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_race_session_backups_v2";
  const LEGACY_KEY = "superx_race_session_backups_v1";

  const BACKUP_TYPE = "SUPERX_RACE_SESSION_BACKUP";
  const BACKUP_VERSION = 2;

  const MAX_BACKUPS = 50;
  const MAX_SESSIONS = 10000;
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const MAX_LABEL_LENGTH = 80;

  function isObject(value) {
    return value !== null &&
      typeof value === "object" &&
      !Array.isArray(value);
  }

  function safeString(value, fallback) {
    if (typeof value !== "string") return fallback;

    return value
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, MAX_LABEL_LENGTH) || fallback;
  }

  function makeId() {
    return "SXBACKUP-" +
      Date.now().toString(36).toUpperCase() +
      "-" +
      Math.random().toString(36).slice(2, 10).toUpperCase();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getStorage() {
    try {
      return window.localStorage || null;
    } catch (error) {
      return null;
    }
  }

  function normalizeHistory(data) {
    if (!Array.isArray(data)) return [];

    const seen = new Set();

    return data
      .filter(function (item) {
        if (!isObject(item)) return false;
        if (typeof item.id !== "string" || !item.id) return false;
        if (seen.has(item.id)) return false;

        seen.add(item.id);
        return true;
      })
      .map(function (item) {
        return {
          id: item.id.slice(0, 120),
          label: safeString(item.label, "Race Session Backup"),
          createdAt: Number(item.createdAt) || 0,
          sessionCount: Math.max(
            0,
            Math.min(MAX_SESSIONS, Number(item.sessionCount) || 0)
          )
        };
      })
      .sort(function (a, b) {
        return b.createdAt - a.createdAt;
      })
      .slice(0, MAX_BACKUPS);
  }

  function readHistory() {
    const storage = getStorage();

    if (!storage) return [];

    try {
      const current = storage.getItem(STORAGE_KEY);

      if (current !== null) {
        return normalizeHistory(JSON.parse(current));
      }

      const legacy = storage.getItem(LEGACY_KEY);

      if (legacy !== null) {
        const migrated = normalizeHistory(JSON.parse(legacy));

        saveHistory(migrated);

        return migrated;
      }

      return [];
    } catch (error) {
      console.warn("[SUPERX] Backup history read failed.", error);
      return [];
    }
  }

  function saveHistory(history) {
    const storage = getStorage();

    if (!storage) return false;

    try {
      const safeHistory = normalizeHistory(history);

      storage.setItem(
        STORAGE_KEY,
        JSON.stringify(safeHistory)
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

    const invalidIndex = sessions.findIndex(function (session) {
      return !isObject(session);
    });

    if (invalidIndex !== -1) {
      return {
        success: false,
        error: "Invalid session at index " + invalidIndex + "."
      };
    }

    let safeSessions;

    try {
      safeSessions = clone(sessions);
    } catch (error) {
      return {
        success: false,
        error: "Session data cannot be serialized."
      };
    }

    const settings = isObject(options) ? options : {};

    const backup = {
      type: BACKUP_TYPE,
      version: BACKUP_VERSION,
      id: makeId(),
      createdAt: Date.now(),
      label: safeString(
        settings.label,
        "Race Session Backup"
      ),
      sessionCount: safeSessions.length,
      sessions: safeSessions
    };

    let serialized;

    try {
      serialized = JSON.stringify(backup);

      if (serialized.length > MAX_FILE_SIZE) {
        return {
          success: false,
          error: "Backup exceeds the 10 MB limit."
        };
      }
    } catch (error) {
      return {
        success: false,
        error: "Backup data could not be prepared."
      };
    }

    const history = readHistory();

    history.unshift({
      id: backup.id,
      label: backup.label,
      createdAt: backup.createdAt,
      sessionCount: backup.sessionCount
    });

    const historySaved = saveHistory(history);

    return {
      success: true,
      backup: backup,
      historySaved: historySaved,
      warning: historySaved
        ? null
        : "Backup created, but local backup history could not be saved."
    };
  }

  function validateBackup(backup) {
    const errors = [];
    const warnings = [];

    if (!isObject(backup)) {
      return {
        valid: false,
        errors: ["Backup must be an object."],
        warnings: [],
        sessionCount: 0
      };
    }

    if (backup.type !== BACKUP_TYPE) {
      errors.push("Unknown backup format.");
    }

    if (
      !Number.isInteger(backup.version) ||
      backup.version !== BACKUP_VERSION
    ) {
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
          return;
        }

        if (
          session.id !== undefined &&
          typeof session.id !== "string" &&
          typeof session.id !== "number"
        ) {
          warnings.push(
            "Session ID has an unusual format at index " + index + "."
          );
        }

        if (
          session.startedAt !== undefined &&
          !Number.isFinite(Number(session.startedAt))
        ) {
          warnings.push(
            "Invalid start timestamp at index " + index + "."
          );
        }
      });
    }

    if (!backup.id || typeof backup.id !== "string") {
      warnings.push("Backup ID is missing.");
    }

    if (
      backup.createdAt !== undefined &&
      !Number.isFinite(Number(backup.createdAt))
    ) {
      warnings.push("Backup timestamp is invalid.");
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
      const content = JSON.stringify(backup, null, 2);

      if (content.length > MAX_FILE_SIZE) {
        return {
          success: false,
          error: "Backup exceeds the 10 MB export limit."
        };
      }

      const safeId = String(backup.id || "backup")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 100);

      return {
        success: true,
        filename: "superx-backup-" + safeId + ".json",
        content: content,
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

    let url = null;
    let link = null;

    try {
      if (
        typeof Blob === "undefined" ||
        !window.URL ||
        typeof window.URL.createObjectURL !== "function"
      ) {
        return {
          success: false,
          error: "File download is not supported in this browser."
        };
      }

      const blob = new Blob(
        [result.content],
        { type: result.mimeType }
      );

      url = window.URL.createObjectURL(blob);

      link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();

      return {
        success: true,
        filename: result.filename
      };
    } catch (error) {
      return {
        success: false,
        error: "Backup download failed."
      };
    } finally {
      if (link && link.parentNode) {
        link.parentNode.removeChild(link);
      }

      if (url) {
        window.setTimeout(function () {
          try {
            window.URL.revokeObjectURL(url);
          } catch (error) {
            // Ignore cleanup errors.
          }
        }, 1500);
      }
    }
  }

  function parseImport(raw) {
    if (typeof raw !== "string") {
      return {
        success: false,
        error: "Import data must be text."
      };
    }

    if (!raw.trim()) {
      return {
        success: false,
        error: "Backup file is empty."
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

    try {
      return {
        success: true,
        backup: clone(backup),
        validation: validation
      };
    } catch (error) {
      return {
        success: false,
        error: "Backup data could not be copied safely."
      };
    }
  }

  function importFile(file) {
    if (!file) {
      return Promise.resolve({
        success: false,
        error: "No file selected."
      });
    }

    if (typeof file.size === "number" && file.size > MAX_FILE_SIZE) {
      return Promise.resolve({
        success: false,
        error: "Backup file exceeds 10 MB."
      });
    }

    if (typeof file.text === "function") {
      return file.text()
        .then(parseImport)
        .catch(function () {
          return {
            success: false,
            error: "Unable to read backup file."
          };
        });
    }

    if (typeof FileReader !== "undefined") {
      return new Promise(function (resolve) {
        const reader = new FileReader();

        reader.onload = function () {
          resolve(parseImport(String(reader.result || "")));
        };

        reader.onerror = function () {
          resolve({
            success: false,
            error: "Unable to read backup file."
          });
        };

        try {
          reader.readAsText(file);
        } catch (error) {
          resolve({
            success: false,
            error: "Unable to open backup file."
          });
        }
      });
    }

    return Promise.resolve({
      success: false,
      error: "File reading is not supported in this browser."
    });
  }

  function getSessionKey(session) {
    const id = session.id || session.sessionId;

    if (id !== undefined && id !== null && String(id)) {
      return "ID:" + String(id);
    }

    try {
      return "DATA:" + JSON.stringify(session);
    } catch (error) {
      return null;
    }
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
        ? settings.existingSessions.filter(isObject)
        : [];

      const seen = new Set();
      const merged = [];

      existing.concat(restored).forEach(function (session) {
        const key = getSessionKey(session);

        if (key === null || seen.has(key)) return;

        seen.add(key);
        merged.push(session);
      });

      if (merged.length > MAX_SESSIONS) {
        return {
          success: false,
          error: "Merged session count exceeds the allowed limit."
        };
      }

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
    if (typeof backupId !== "string" || !backupId) {
      return false;
    }

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
    const storage = getStorage();

    if (!storage) return false;

    try {
      storage.removeItem(STORAGE_KEY);
      storage.removeItem(LEGACY_KEY);
      return true;
    } catch (error) {
      console.warn("[SUPERX] Unable to clear backup history.", error);
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
        : null,

      oldestBackup: history.length
        ? history[history.length - 1].createdAt
        : null,

      storageAvailable: !!getStorage()
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
