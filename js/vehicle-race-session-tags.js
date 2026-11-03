
/* =========================================================
   SUPERX LEGEND — FILE 115
   FILE: js/vehicle-race-session-tags.js
   MODULE: Advanced Race Session Tags
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_race_session_tags_v2";
  const LEGACY_KEY = "superx_race_session_tags_v1";

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

  function cleanText(value, maxLength = MAX_TAG_LENGTH) {
    if (typeof value !== "string" &&
        typeof value !== "number") return "";

    return String(value)
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, maxLength);
  }

  function normalizeTag(tag) {
    return cleanText(tag, MAX_TAG_LENGTH);
  }

  function normalizeSessionId(id) {
    return cleanText(id, 100);
  }

  function normalizeRecord(record) {
    if (!record || typeof record !== "object") {
      return {
        tags: [],
        note: "",
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    }

    const tags = Array.isArray(record.tags)
      ? record.tags.map(normalizeTag).filter(Boolean)
      : [];

    const uniqueTags = [];

    tags.forEach(tag => {
      if (!uniqueTags.some(item =>
        item.toLowerCase() === tag.toLowerCase()
      )) {
        uniqueTags.push(tag);
      }
    });

    return {
      tags: uniqueTags.slice(0, MAX_TAGS_PER_SESSION),
      note: cleanText(record.note, 500),
      createdAt: Number(record.createdAt) || Date.now(),
      updatedAt: Number(record.updatedAt) || Date.now()
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem(LEGACY_KEY);

      if (!raw) return {};

      const parsed = JSON.parse(raw);

      if (!parsed || typeof parsed !== "object" ||
          Array.isArray(parsed)) return {};

      const result = {};

      Object.keys(parsed).slice(0, MAX_SESSIONS).forEach(id => {
        const safeId = normalizeSessionId(id);
        if (safeId) result[safeId] = normalizeRecord(parsed[id]);
      });

      return result;
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
        keys.sort((a, b) =>
          records[a].updatedAt - records[b].updatedAt
        );

        keys.slice(0, keys.length - MAX_SESSIONS)
          .forEach(key => delete records[key]);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      return true;
    } catch (error) {
      console.warn("[SUPERX Tags] Save failed:", error);
      return false;
    }
  }

  function snapshot() {
    return JSON.parse(JSON.stringify(records));
  }

  function restore(previous) {
    records = previous;
  }

  function getRecord(sessionId, create = false) {
    const id = normalizeSessionId(sessionId);
    if (!id) return null;

    if (!records[id] && create) {
      records[id] = {
        tags: [],
        note: "",
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    }

    return records[id] || null;
  }

  function emitUpdate(sessionId, action) {
    window.dispatchEvent(new CustomEvent(
      "sx:race-session-tags-updated",
      {
        detail: {
          sessionId,
          action,
          tags: getTags(sessionId),
          note: getNote(sessionId)
        }
      }
    ));
  }

  function addTag(sessionId, tag) {
    const id = normalizeSessionId(sessionId);
    const value = normalizeTag(tag);

    if (!id || !value) {
      return { success: false, reason: "invalid-input" };
    }

    const previous = snapshot();
    const record = getRecord(id, true);

    if (record.tags.some(item =>
      item.toLowerCase() === value.toLowerCase()
    )) {
      return { success: false, reason: "already-exists" };
    }

    if (record.tags.length >= MAX_TAGS_PER_SESSION) {
      return { success: false, reason: "tag-limit-reached" };
    }

    record.tags.push(value);
    record.updatedAt = Date.now();

    if (!save()) {
      restore(previous);
      return { success: false, reason: "save-failed" };
    }

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

    const previous = snapshot();
    const before = record.tags.length;

    record.tags = record.tags.filter(item =>
      item.toLowerCase() !== value.toLowerCase()
    );

    if (before === record.tags.length) return false;

    record.updatedAt = Date.now();

    if (!save()) {
      restore(previous);
      return false;
    }

    emitUpdate(id, "remove");
    return true;
  }

  function renameTag(sessionId, oldTag, newTag) {
    const id = normalizeSessionId(sessionId);
    const oldValue = normalizeTag(oldTag);
    const newValue = normalizeTag(newTag);
    const record = getRecord(id);

    if (!record || !oldValue || !newValue) return false;

    const previous = snapshot();

    const index = record.tags.findIndex(item =>
      item.toLowerCase() === oldValue.toLowerCase()
    );

    if (index < 0) return false;

    if (record.tags.some(item =>
      item.toLowerCase() === newValue.toLowerCase()
    )) return false;

    record.tags[index] = newValue;
    record.updatedAt = Date.now();

    if (!save()) {
      restore(previous);
      return false;
    }

    emitUpdate(id, "rename");
    return true;
  }

  function getTags(sessionId) {
    const record = getRecord(sessionId);
    return record ? record.tags.slice() : [];
  }

  function setNote(sessionId, note) {
    const id = normalizeSessionId(sessionId);
    if (!id) return false;

    const previous = snapshot();
    const record = getRecord(id, true);

    record.note = cleanText(note, 500);
    record.updatedAt = Date.now();

    if (!save()) {
      restore(previous);
      return false;
    }

    emitUpdate(id, "note");
    return true;
  }

  function getNote(sessionId) {
    const record = getRecord(sessionId);
    return record ? record.note : "";
  }

  function getAllRecords() {
    return Object.keys(records).map(id => ({
      sessionId: id,
      tags: records[id].tags.slice(),
      note: records[id].note,
      createdAt: records[id].createdAt,
      updatedAt: records[id].updatedAt
    }));
  }

  function findByTag(tag) {
    const query = normalizeTag(tag).toLowerCase();
    if (!query) return [];

    return getAllRecords().filter(record =>
      record.tags.some(item => item.toLowerCase() === query)
    );
  }

  function search(query) {
    const value = cleanText(query, 100).toLowerCase();

    if (!value) return getAllRecords();

    return getAllRecords().filter(record =>
      record.sessionId.toLowerCase().includes(value) ||
      record.tags.some(tag => tag.toLowerCase().includes(value)) ||
      record.note.toLowerCase().includes(value)
    );
  }

  function getPopularTags() {
    const counts = {};

    Object.values(records).forEach(record => {
      record.tags.forEach(tag => {
        const key = tag.toLowerCase();

        if (!counts[key]) {
          counts[key] = { name: tag, count: 0 };
        }

        counts[key].count += 1;
      });
    });

    return Object.values(counts)
      .sort((a, b) => b.count - a.count);
  }

  function deleteSessionTags(sessionId) {
    const id = normalizeSessionId(sessionId);
    if (!id || !records[id]) return false;

    const previous = snapshot();
    delete records[id];

    if (!save()) {
      restore(previous);
      return false;
    }

    window.dispatchEvent(new CustomEvent(
      "sx:race-session-tags-updated",
      {
        detail: {
          sessionId: id,
          action: "delete-session",
          tags: [],
          note: ""
        }
      }
    ));

    return true;
  }

  function clearAll() {
    const previous = snapshot();
    records = {};

    if (!save()) {
      restore(previous);
      return false;
    }

    window.dispatchEvent(new CustomEvent(
      "sx:race-session-tags-cleared"
    ));

    return true;
  }

  function getDefaultTags() {
    return DEFAULT_TAGS.slice();
  }

  SX.vehicleRaceSessionTags = {
    addTag,
    removeTag,
    renameTag,
    getTags,
    setNote,
    getNote,
    getAllRecords,
    findByTag,
    search,
    getPopularTags,
    deleteSessionTags,
    clearAll,
    getDefaultTags
  };

  console.info("[SUPERX] Advanced Race Session Tags loaded.");

})(window);

/* ======================= FILE 115 END ======================= */
