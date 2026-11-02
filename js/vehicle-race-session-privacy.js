
/* =========================================================
   SUPERX LEGEND — FILE 118
   FILE: js/vehicle-race-session-privacy.js

   PURPOSE:
   - Store local visibility preferences per session.
   - Mark sessions as private or public.
   - Control local sharing permission preferences.
   - Search and export privacy settings.
   - Does not publish or upload session data.
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};
  const STORAGE_KEY = "superx_race_session_privacy_v1";
  const MAX_RECORDS = 500;

  const DEFAULT_SETTINGS = {
    defaultVisibility: "private",
    allowLocalExport: true,
    showSessionDetails: true
  };

  let settings = loadSettings();
  let records = loadRecords();

  function cleanId(value) {
    return typeof value === "string"
      ? value.trim().slice(0, 120)
      : "";
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadSettings() {
    try {
      const raw = window.localStorage.getItem(
        STORAGE_KEY + "_settings"
      );

      if (!raw) return clone(DEFAULT_SETTINGS);

      const parsed = JSON.parse(raw);

      return {
        defaultVisibility:
          parsed.defaultVisibility === "public"
            ? "public"
            : "private",
        allowLocalExport:
          parsed.allowLocalExport !== false,
        showSessionDetails:
          parsed.showSessionDetails !== false
      };
    } catch (error) {
      return clone(DEFAULT_SETTINGS);
    }
  }

  function loadRecords() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);

      if (!raw) return {};

      const parsed = JSON.parse(raw);

      return parsed && typeof parsed === "object" &&
        !Array.isArray(parsed)
        ? parsed
        : {};
    } catch (error) {
      console.warn("[SUPERX Privacy] Load failed:", error);
      return {};
    }
  }

  function saveRecords() {
    try {
      const ids = Object.keys(records);

      if (ids.length > MAX_RECORDS) {
        ids.sort(function (a, b) {
          return records[a].updatedAt - records[b].updatedAt;
        });

        ids.slice(0, ids.length - MAX_RECORDS).forEach(function (id) {
          delete records[id];
        });
      }

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(records)
      );

      return true;
    } catch (error) {
      console.warn("[SUPERX Privacy] Save failed:", error);
      return false;
    }
  }

  function saveSettings() {
    try {
      window.localStorage.setItem(
        STORAGE_KEY + "_settings",
        JSON.stringify(settings)
      );

      return true;
    } catch (error) {
      console.warn("[SUPERX Privacy] Settings save failed:", error);
      return false;
    }
  }

  function getRecord(sessionId) {
    const id = cleanId(sessionId);

    if (!id) return null;

    if (!records[id]) {
      records[id] = {
        sessionId: id,
        visibility: settings.defaultVisibility,
        allowSharing: false,
        updatedAt: Date.now()
      };
    }

    return records[id];
  }

  function emit(action, sessionId) {
    window.dispatchEvent(new CustomEvent(
      "sx:race-session-privacy-updated",
      {
        detail: {
          action: action,
          sessionId: sessionId || null
        }
      }
    ));
  }

  function setVisibility(sessionId, visibility) {
    const id = cleanId(sessionId);

    if (!id || !["private", "public"].includes(visibility)) {
      return false;
    }

    const record = getRecord(id);

    record.visibility = visibility;
    record.updatedAt = Date.now();

    saveRecords();
    emit("visibility-changed", id);

    return true;
  }

  function getVisibility(sessionId) {
    const id = cleanId(sessionId);

    if (!id) return null;

    const record = records[id];

    return record
      ? record.visibility
      : settings.defaultVisibility;
  }

  function isPrivate(sessionId) {
    return getVisibility(sessionId) !== "public";
  }

  function setSharing(sessionId, enabled) {
    const id = cleanId(sessionId);

    if (!id) return false;

    const record = getRecord(id);

    record.allowSharing = enabled === true;
    record.updatedAt = Date.now();

    saveRecords();
    emit("sharing-changed", id);

    return true;
  }

  function canShare(sessionId) {
    const id = cleanId(sessionId);
    const record = id ? records[id] : null;

    return Boolean(
      record &&
      record.visibility === "public" &&
      record.allowSharing
    );
  }

  function getSessionPrivacy(sessionId) {
    const id = cleanId(sessionId);

    if (!id) return null;

    const record = records[id];

    return {
      sessionId: id,
      visibility: record
        ? record.visibility
        : settings.defaultVisibility,
      allowSharing: record
        ? record.allowSharing
        : false,
      updatedAt: record
        ? record.updatedAt
        : null
    };
  }

  function getAllRecords() {
    return Object.keys(records).map(function (id) {
      return clone(records[id]);
    });
  }

  function getPrivateSessions() {
    return getAllRecords().filter(function (record) {
      return record.visibility === "private";
    });
  }

  function getPublicSessions() {
    return getAllRecords().filter(function (record) {
      return record.visibility === "public";
    });
  }

  function updateSettings(options) {
    if (!options || typeof options !== "object") {
      return false;
    }

    if (options.defaultVisibility !== undefined) {
      if (!["private", "public"].includes(
        options.defaultVisibility
      )) {
        return false;
      }

      settings.defaultVisibility = options.defaultVisibility;
    }

    if (options.allowLocalExport !== undefined) {
      settings.allowLocalExport =
        options.allowLocalExport === true;
    }

    if (options.showSessionDetails !== undefined) {
      settings.showSessionDetails =
        options.showSessionDetails === true;
    }

    saveSettings();
    emit("settings-changed", null);

    return true;
  }

  function getSettings() {
    return clone(settings);
  }

  function canExportLocally() {
    return settings.allowLocalExport;
  }

  function deleteSessionPrivacy(sessionId) {
    const id = cleanId(sessionId);

    if (!id || !records[id]) return false;

    delete records[id];

    saveRecords();
    emit("record-deleted", id);

    return true;
  }

  function clearAll() {
    records = {};

    saveRecords();
    emit("cleared", null);

    return true;
  }

  function getSummary() {
    const all = getAllRecords();

    return {
      total: all.length,
      privateCount: all.filter(function (item) {
        return item.visibility === "private";
      }).length,
      publicCount: all.filter(function (item) {
        return item.visibility === "public";
      }).length,
      sharingEnabledCount: all.filter(function (item) {
        return item.allowSharing;
      }).length,
      defaultVisibility: settings.defaultVisibility
    };
  }

  SX.vehicleRaceSessionPrivacy = {
    setVisibility: setVisibility,
    getVisibility: getVisibility,
    isPrivate: isPrivate,
    setSharing: setSharing,
    canShare: canShare,
    getSessionPrivacy: getSessionPrivacy,
    getAllRecords: getAllRecords,
    getPrivateSessions: getPrivateSessions,
    getPublicSessions: getPublicSessions,
    updateSettings: updateSettings,
    getSettings: getSettings,
    canExportLocally: canExportLocally,
    deleteSessionPrivacy: deleteSessionPrivacy,
    clearAll: clearAll,
    getSummary: getSummary
  };

  console.log("[SUPERX] Race Session Privacy ready.");

})(window);

/* ======================= FILE 118 END ======================= */
