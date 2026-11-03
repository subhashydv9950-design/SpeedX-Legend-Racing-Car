
/* =========================================================
   SUPERX LEGEND — FILE 117
   FILE: js/vehicle-race-session-archive.js
   MODULE: RACE SESSION ARCHIVE
   START: RACE SESSION ARCHIVE
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_race_session_archive_v2";
  const MAX_ARCHIVED = 300;
  const MAX_NOTE_LENGTH = 300;

  let archive = [];
  let revision = 0;

  function clean(value, limit = 120) {
    return String(value == null ? "" : value)
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, limit);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalize(item) {
    if (!item || typeof item !== "object") return null;

    const sessionId = clean(item.sessionId, 120);
    if (!sessionId) return null;

    return {
      sessionId,
      archivedAt: Math.max(0, Number(item.archivedAt) || Date.now()),
      updatedAt: Math.max(0, Number(item.updatedAt) || Date.now()),
      title: clean(item.title, 100),
      mode: clean(item.mode, 50),
      map: clean(item.map, 80),
      car: clean(item.car, 80),
      note: clean(item.note, MAX_NOTE_LENGTH),
      label: clean(item.label, 40),
      session: item.session && typeof item.session === "object"
        ? item.session
        : null
    };
  }

  function emit(action, sessionId) {
    window.dispatchEvent(new CustomEvent(
      "sx:race-session-archive-updated",
      {
        detail: {
          action,
          sessionId: sessionId || null,
          count: archive.length,
          revision
        }
      }
    ));
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const records = Array.isArray(parsed)
        ? parsed
        : parsed.records;

      archive = Array.isArray(records)
        ? records.map(normalize).filter(Boolean).slice(0, MAX_ARCHIVED)
        : [];

      revision++;
      return true;
    } catch (error) {
      console.warn("[SUPERX Archive] Load failed:", error);
      archive = [];
      return false;
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: 2,
        revision: revision + 1,
        records: archive.slice(0, MAX_ARCHIVED)
      }));

      revision++;
      return true;
    } catch (error) {
      console.warn("[SUPERX Archive] Save failed:", error);
      return false;
    }
  }

  function findIndex(id) {
    const key = clean(id, 120);
    return archive.findIndex(item => item.sessionId === key);
  }

  function archiveSession(sessionId, details = {}) {
    const id = clean(sessionId, 120);

    if (!id) return { success: false, reason: "invalid-session-id" };
    if (findIndex(id) !== -1) {
      return { success: false, reason: "already-archived" };
    }
    if (archive.length >= MAX_ARCHIVED) {
      return { success: false, reason: "archive-limit-reached" };
    }

    const item = normalize({
      sessionId: id,
      archivedAt: Date.now(),
      updatedAt: Date.now(),
      title: details.title,
      mode: details.mode,
      map: details.map,
      car: details.car,
      note: details.note,
      label: details.label,
      session: details.session
    });

    archive.unshift(item);
    const saved = save();

    emit("archive", id);

    return {
      success: true,
      saved,
      record: clone(item)
    };
  }

  function archiveCurrentSession(details = {}) {
    const manager = SX.vehicleRaceSessionStats;
    const session = manager &&
      typeof manager.getCurrentSession === "function"
      ? manager.getCurrentSession()
      : null;

    if (!session) {
      return { success: false, reason: "no-active-session" };
    }

    return archiveSession(session.id, {
      ...details,
      session
    });
  }

  function restoreSession(sessionId) {
    const index = findIndex(sessionId);
    if (index === -1) return false;

    const id = archive[index].sessionId;
    archive.splice(index, 1);

    const saved = save();
    emit("restore", id);

    return saved;
  }

  function isArchived(sessionId) {
    return findIndex(sessionId) !== -1;
  }

  function getOne(sessionId) {
    const index = findIndex(sessionId);
    return index === -1 ? null : clone(archive[index]);
  }

  function getAll(options = {}) {
    let list = archive.slice();

    const search = clean(options.search, 120).toLowerCase();
    const mode = clean(options.mode, 50).toLowerCase();
    const label = clean(options.label, 40).toLowerCase();

    if (search) {
      list = list.filter(item => [
        item.sessionId,
        item.title,
        item.mode,
        item.map,
        item.car,
        item.note,
        item.label
      ].join(" ").toLowerCase().includes(search));
    }

    if (mode) {
      list = list.filter(item => item.mode.toLowerCase() === mode);
    }

    if (label) {
      list = list.filter(item => item.label.toLowerCase() === label);
    }

    if (options.from) {
      const from = Number(options.from);
      if (Number.isFinite(from)) {
        list = list.filter(item => item.archivedAt >= from);
      }
    }

    if (options.to) {
      const to = Number(options.to);
      if (Number.isFinite(to)) {
        list = list.filter(item => item.archivedAt <= to);
      }
    }

    if (options.sort === "oldest") {
      list.sort((a, b) => a.archivedAt - b.archivedAt);
    } else if (options.sort === "alphabetical") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      list.sort((a, b) => b.archivedAt - a.archivedAt);
    }

    const offset = Math.max(0, Math.floor(Number(options.offset) || 0));
    const limit = Math.min(100, Math.max(1, Math.floor(Number(options.limit) || 100)));

    return clone(list.slice(offset, offset + limit));
  }

  function updateField(sessionId, field, value) {
    const index = findIndex(sessionId);
    if (index === -1) return false;

    const limits = {
      title: 100,
      mode: 50,
      map: 80,
      car: 80,
      note: MAX_NOTE_LENGTH,
      label: 40
    };

    if (!Object.prototype.hasOwnProperty.call(limits, field)) {
      return false;
    }

    archive[index][field] = clean(value, limits[field]);
    archive[index].updatedAt = Date.now();

    const saved = save();
    emit(field + "-updated", archive[index].sessionId);

    return saved;
  }

  function updateNote(id, note) {
    return updateField(id, "note", note);
  }

  function updateLabel(id, label) {
    return updateField(id, "label", label);
  }

  function deleteArchived(sessionId) {
    const index = findIndex(sessionId);
    if (index === -1) return false;

    const id = archive[index].sessionId;
    archive.splice(index, 1);

    const saved = save();
    emit("delete", id);

    return saved;
  }

  function clearArchive() {
    archive = [];
    const saved = save();
    emit("clear", null);
    return saved;
  }

  function getSummary() {
    const modes = {};
    const labels = {};

    archive.forEach(item => {
      const mode = item.mode || "unknown";
      const label = item.label || "unlabelled";

      modes[mode] = (modes[mode] || 0) + 1;
      labels[label] = (labels[label] || 0) + 1;
    });

    return {
      totalArchived: archive.length,
      modeCounts: modes,
      labelCounts: labels,
      oldestArchivedAt: archive.length
        ? Math.min(...archive.map(item => item.archivedAt))
        : null,
      newestArchivedAt: archive.length
        ? Math.max(...archive.map(item => item.archivedAt))
        : null
    };
  }

  function exportArchive() {
    return JSON.stringify({
      version: 2,
      exportedAt: Date.now(),
      records: clone(archive)
    }, null, 2);
  }

  function importArchive(input) {
    try {
      const data = typeof input === "string"
        ? JSON.parse(input)
        : input;

      if (!data || !Array.isArray(data.records)) {
        return { success: false, reason: "invalid-data" };
      }

      let imported = 0;
      let skipped = 0;

      data.records.forEach(raw => {
        const item = normalize(raw);

        if (!item || findIndex(item.sessionId) !== -1 ||
            archive.length >= MAX_ARCHIVED) {
          skipped++;
          return;
        }

        archive.push(item);
        imported++;
      });

      const saved = save();
      emit("import", null);

      return {
        success: true,
        saved,
        imported,
        skipped,
        total: archive.length
      };
    } catch (error) {
      return { success: false, reason: "import-failed" };
    }
  }

  load();

  SX.vehicleRaceSessionArchive = {
    archiveSession,
    archiveCurrentSession,
    restoreSession,
    isArchived,
    getOne,
    getAll,
    updateField,
    updateNote,
    updateLabel,
    deleteArchived,
    clearArchive,
    getCount: () => archive.length,
    getSummary,
    exportArchive,
    importArchive,
    reload: load
  };

  console.info("[SUPERX] Race Session Archive ready.");

})(window);

/* =========================================================
   END: RACE SESSION ARCHIVE — FILE 117
   ========================================================= */
   
