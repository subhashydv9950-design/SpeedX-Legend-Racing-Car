
/* =========================================================
   SUPERX LEGEND — FILE 117
   FILE: js/vehicle-race-session-archive.js

   PURPOSE:
   - Archive completed race sessions.
   - Restore archived sessions.
   - Add archive labels and notes.
   - Search and sort archived records.
   - Keep archive metadata separate from race history.
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_race_session_archive_v1";
  const MAX_ARCHIVED = 300;
  const MAX_NOTE_LENGTH = 300;

  let archive = load();

  function cleanText(value, limit) {
    if (typeof value !== "string") return "";

    return value
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, limit || 120);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function load() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);

      if (!raw) return [];

      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) return [];

      return parsed.filter(function (item) {
        return item &&
          typeof item.sessionId === "string";
      }).slice(0, MAX_ARCHIVED);
    } catch (error) {
      console.warn("[SUPERX Archive] Load failed:", error);
      return [];
    }
  }

  function save() {
    try {
      archive = archive.slice(0, MAX_ARCHIVED);

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(archive)
      );

      return true;
    } catch (error) {
      console.warn("[SUPERX Archive] Save failed:", error);
      return false;
    }
  }

  function findIndex(sessionId) {
    const id = cleanText(sessionId, 120);

    return archive.findIndex(function (item) {
      return item.sessionId === id;
    });
  }

  function emit(action, sessionId) {
    window.dispatchEvent(new CustomEvent(
      "sx:race-session-archive-updated",
      {
        detail: {
          action: action,
          sessionId: sessionId || null,
          count: archive.length
        }
      }
    ));
  }

  function archiveSession(sessionId, details) {
    const id = cleanText(sessionId, 120);

    if (!id) {
      return {
        success: false,
        reason: "invalid-session-id"
      };
    }

    if (findIndex(id) !== -1) {
      return {
        success: false,
        reason: "already-archived"
      };
    }

    if (archive.length >= MAX_ARCHIVED) {
      return {
        success: false,
        reason: "archive-limit-reached"
      };
    }

    const info = details && typeof details === "object"
      ? details
      : {};

    const item = {
      sessionId: id,
      archivedAt: Date.now(),
      updatedAt: Date.now(),
      title: cleanText(info.title, 100),
      mode: cleanText(info.mode, 50),
      map: cleanText(info.map, 80),
      car: cleanText(info.car, 80),
      note: cleanText(info.note, MAX_NOTE_LENGTH),
      label: cleanText(info.label, 40)
    };

    archive.unshift(item);

    save();
    emit("archive", id);

    return {
      success: true,
      record: clone(item)
    };
  }

  function restoreSession(sessionId) {
    const id = cleanText(sessionId, 120);
    const index = findIndex(id);

    if (index === -1) return false;

    archive.splice(index, 1);

    save();
    emit("restore", id);

    return true;
  }

  function isArchived(sessionId) {
    return findIndex(sessionId) !== -1;
  }

  function getOne(sessionId) {
    const index = findIndex(sessionId);

    return index === -1
      ? null
      : clone(archive[index]);
  }

  function getAll(options) {
    const settings = options || {};
    let result = archive.slice();

    if (settings.search) {
      const query = String(settings.search).toLowerCase();

      result = result.filter(function (item) {
        return (
          item.sessionId.toLowerCase().includes(query) ||
          item.title.toLowerCase().includes(query) ||
          item.mode.toLowerCase().includes(query) ||
          item.map.toLowerCase().includes(query) ||
          item.car.toLowerCase().includes(query) ||
          item.label.toLowerCase().includes(query) ||
          item.note.toLowerCase().includes(query)
        );
      });
    }

    if (settings.mode) {
      result = result.filter(function (item) {
        return item.mode.toLowerCase() ===
          String(settings.mode).toLowerCase();
      });
    }

    if (settings.sort === "oldest") {
      result.sort(function (a, b) {
        return a.archivedAt - b.archivedAt;
      });
    } else if (settings.sort === "alphabetical") {
      result.sort(function (a, b) {
        return a.sessionId.localeCompare(b.sessionId);
      });
    } else {
      result.sort(function (a, b) {
        return b.archivedAt - a.archivedAt;
      });
    }

    return clone(result);
  }

  function updateNote(sessionId, note) {
    const index = findIndex(sessionId);

    if (index === -1) return false;

    archive[index].note = cleanText(
      note,
      MAX_NOTE_LENGTH
    );

    archive[index].updatedAt = Date.now();

    save();
    emit("note-updated", archive[index].sessionId);

    return true;
  }

  function updateLabel(sessionId, label) {
    const index = findIndex(sessionId);

    if (index === -1) return false;

    archive[index].label = cleanText(label, 40);
    archive[index].updatedAt = Date.now();

    save();
    emit("label-updated", archive[index].sessionId);

    return true;
  }

  function deleteArchived(sessionId) {
    const id = cleanText(sessionId, 120);
    const index = findIndex(id);

    if (index === -1) return false;

    archive.splice(index, 1);

    save();
    emit("delete", id);

    return true;
  }

  function clearArchive() {
    archive = [];

    save();
    emit("clear", null);

    return true;
  }

  function getCount() {
    return archive.length;
  }

  function getSummary() {
    const modes = {};

    archive.forEach(function (item) {
      const mode = item.mode || "unknown";
      modes[mode] = (modes[mode] || 0) + 1;
    });

    return {
      totalArchived: archive.length,
      modeCounts: modes,
      oldestArchivedAt: archive.length
        ? Math.min.apply(null, archive.map(function (item) {
            return item.archivedAt;
          }))
        : null,
      newestArchivedAt: archive.length
        ? Math.max.apply(null, archive.map(function (item) {
            return item.archivedAt;
          }))
        : null
    };
  }

  function exportArchive() {
    return JSON.stringify({
      version: 1,
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
        return {
          success: false,
          reason: "invalid-data"
        };
      }

      let imported = 0;

      data.records.forEach(function (item) {
        if (
          !item ||
          typeof item.sessionId !== "string" ||
          archive.length >= MAX_ARCHIVED ||
          isArchived(item.sessionId)
        ) {
          return;
        }

        archive.push({
          sessionId: cleanText(item.sessionId, 120),
          archivedAt: Number(item.archivedAt) || Date.now(),
          updatedAt: Date.now(),
          title: cleanText(item.title, 100),
          mode: cleanText(item.mode, 50),
          map: cleanText(item.map, 80),
          car: cleanText(item.car, 80),
          note: cleanText(item.note, MAX_NOTE_LENGTH),
          label: cleanText(item.label, 40)
        });

        imported += 1;
      });

      save();
      emit("import", null);

      return {
        success: true,
        imported: imported,
        total: archive.length
      };
    } catch (error) {
      return {
        success: false,
        reason: "import-failed"
      };
    }
  }

  SX.vehicleRaceSessionArchive = {
    archiveSession: archiveSession,
    restoreSession: restoreSession,
    isArchived: isArchived,
    getOne: getOne,
    getAll: getAll,
    updateNote: updateNote,
    updateLabel: updateLabel,
    deleteArchived: deleteArchived,
    clearArchive: clearArchive,
    getCount: getCount,
    getSummary: getSummary,
    exportArchive: exportArchive,
    importArchive: importArchive
  };

  console.log("[SUPERX] Race Session Archive ready.");

})(window);

/* ======================= FILE 117 END ======================= */
 
