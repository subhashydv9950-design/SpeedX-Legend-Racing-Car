
/* =========================================================
   SUPERX LEGEND — FILE 115
   FILE: js/vehicle-race-session-tags.js

   PURPOSE:
   - Add custom tags to race sessions.
   - Rename and remove tags.
   - Search sessions by tag.
   - Keep tags separate from race history and timeline.
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};
  const STORAGE_KEY = "superx_race_session_tags_v1";

  const MAX_SESSIONS = 300;
  const MAX_TAGS_PER_SESSION = 12;
  const MAX_TAG_LENGTH = 28;

  const DEFAULT_TAGS = [
    "Best Race",
    "Perfect Run",
    "Practice",
    "Difficult Track",
    "Personal Record",
    "Fun Race"
  ];

  function cleanText(value, maxLength) {
    if (typeof value !== "string") return "";

    return value
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, maxLength || MAX_TAG_LENGTH);
  }

  function normalizeTag(tag) {
    return cleanText(tag, MAX_TAG_LENGTH);
  }

  function normalizeSessionId(id) {
    return cleanText(id, 100);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function load() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);

      if (!raw) return {};

      const parsed = JSON.parse(raw);

      return parsed && typeof parsed === "object" &&
        !Array.isArray(parsed)
        ? parsed
        : {};
    } catch (error) {
      console.warn("[SUPERX Tags] Load failed:", error);
      return {};
    }
  }

  let records = load();

  function save() {
    try {
      const keys = Object.keys(records);

      if (keys.length > MAX_SESSIONS) {
        keys
          .sort(function (a, b) {
            return records[a].updatedAt - records[b].updatedAt;
          })
          .slice(0, keys.length - MAX_SESSIONS)
          .forEach(function (key) {
            delete records[key];
          });
      }

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(records)
      );

      return true;
    } catch (error) {
      console.warn("[SUPERX Tags] Save failed:", error);
      return false;
    }
  }

  function getRecord(sessionId) {
    const id = normalizeSessionId(sessionId);

    if (!id) return null;

    if (!records[id]) {
      records[id] = {
        tags: [],
        note: "",
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    }

    return records[id];
  }

  function emitUpdate(sessionId, action) {
    window.dispatchEvent(new CustomEvent(
      "sx:race-session-tags-updated",
      {
        detail: {
          sessionId: sessionId,
          action: action,
          tags: getTags(sessionId)
        }
      }
    ));
  }

  function addTag(sessionId, tag) {
    const id = normalizeSessionId(sessionId);
    const value = normalizeTag(tag);

    if (!id || !value) {
      return {
        success: false,
        reason: "invalid-input"
      };
    }

    const record = getRecord(id);

    const exists = record.tags.some(function (item) {
      return item.toLowerCase() === value.toLowerCase();
    });

    if (exists) {
      return {
        success: false,
        reason: "already-exists"
      };
    }

    if (record.tags.length >= MAX_TAGS_PER_SESSION) {
      return {
        success: false,
        reason: "tag-limit-reached"
      };
    }

    record.tags.push(value);
    record.updatedAt = Date.now();

    save();
    emitUpdate(id, "add");

    return {
      success: true,
      tags: getTags(id)
    };
  }

  function removeTag(sessionId, tag) {
    const id = normalizeSessionId(sessionId);
    const value = normalizeTag(tag);
    const record = getRecord(id);

    if (!record || !value) return false;

    const before = record.tags.length;

    record.tags = record.tags.filter(function (item) {
      return item.toLowerCase() !== value.toLowerCase();
    });

    if (before === record.tags.length) return false;

    record.updatedAt = Date.now();

    save();
    emitUpdate(id, "remove");

    return true;
  }

  function renameTag(sessionId, oldTag, newTag) {
    const id = normalizeSessionId(sessionId);
    const oldValue = normalizeTag(oldTag);
    const newValue = normalizeTag(newTag);
    const record = getRecord(id);

    if (!record || !oldValue || !newValue) return false;

    const oldIndex = record.tags.findIndex(function (item) {
      return item.toLowerCase() === oldValue.toLowerCase();
    });

    if (oldIndex === -1) return false;

    const duplicate = record.tags.some(function (item) {
      return item.toLowerCase() === newValue.toLowerCase();
    });

    if (duplicate) return false;

    record.tags[oldIndex] = newValue;
    record.updatedAt = Date.now();

    save();
    emitUpdate(id, "rename");

    return true;
  }

  function getTags(sessionId) {
    const id = normalizeSessionId(sessionId);
    const record = id ? records[id] : null;

    return record
      ? record.tags.slice()
      : [];
  }

  function setNote(sessionId, note) {
    const id = normalizeSessionId(sessionId);

    if (!id) return false;

    const record = getRecord(id);

    record.note = cleanText(note, 500);
    record.updatedAt = Date.now();

    save();
    emitUpdate(id, "note");

    return true;
  }

  function getNote(sessionId) {
    const id = normalizeSessionId(sessionId);
    const record = id ? records[id] : null;

    return record ? record.note : "";
  }

  function getAllRecords() {
    return Object.keys(records).map(function (id) {
      return {
        sessionId: id,
        tags: records[id].tags.slice(),
        note: records[id].note,
        createdAt: records[id].createdAt,
        updatedAt: records[id].updatedAt
      };
    });
  }

  function findByTag(tag) {
    const query = normalizeTag(tag).toLowerCase();

    if (!query) return [];

    return Object.keys(records)
      .filter(function (id) {
        return records[id].tags.some(function (item) {
          return item.toLowerCase() === query;
        });
      })
      .map(function (id) {
        return {
          sessionId: id,
          tags: records[id].tags.slice(),
          note: records[id].note
        };
      });
  }

  function search(query) {
    const value = cleanText(query, 100).toLowerCase();

    if (!value) return getAllRecords();

    return getAllRecords().filter(function (record) {
      return (
        record.sessionId.toLowerCase().includes(value) ||
        record.tags.some(function (tag) {
          return tag.toLowerCase().includes(value);
        }) ||
        record.note.toLowerCase().includes(value)
      );
    });
  }

  function getPopularTags() {
    const counts = {};

    Object.keys(records).forEach(function (id) {
      records[id].tags.forEach(function (tag) {
        const key = tag.toLowerCase();

        if (!counts[key]) {
          counts[key] = {
            name: tag,
            count: 0
          };
        }

        counts[key].count += 1;
      });
    });

    return Object.keys(counts)
      .map(function (key) {
        return counts[key];
      })
      .sort(function (a, b) {
        return b.count - a.count;
      });
  }

  function deleteSessionTags(sessionId) {
    const id = normalizeSessionId(sessionId);

    if (!id || !records[id]) return false;

    delete records[id];

    save();

    window.dispatchEvent(new CustomEvent(
      "sx:race-session-tags-updated",
      {
        detail: {
          sessionId: id,
          action: "delete-session"
        }
      }
    ));

    return true;
  }

  function clearAll() {
    records = {};
    save();

    window.dispatchEvent(new CustomEvent(
      "sx:race-session-tags-cleared"
    ));

    return true;
  }

  function getDefaultTags() {
    return DEFAULT_TAGS.slice();
  }

  SX.vehicleRaceSessionTags = {
    addTag: addTag,
    removeTag: removeTag,
    renameTag: renameTag,
    getTags: getTags,
    setNote: setNote,
    getNote: getNote,
    getAllRecords: getAllRecords,
    findByTag: findByTag,
    search: search,
    getPopularTags: getPopularTags,
    deleteSessionTags: deleteSessionTags,
    clearAll: clearAll,
    getDefaultTags: getDefaultTags
  };

  console.log("[SUPERX] Race Session Tags ready.");

})(window);

/* ======================= FILE 115 END ======================= */
  
