
/* =========================================================
   SUPERX LEGEND — FILE 116
   FILE: js/vehicle-race-session-favorites.js

   PURPOSE:
   - Mark race sessions as favorites.
   - Remove favorite sessions.
   - Store a private note for each favorite.
   - Search and sort favorite sessions.
   - Independent from session history and tags.
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};
  const STORAGE_KEY = "superx_race_session_favorites_v1";

  const MAX_FAVORITES = 200;
  const MAX_NOTE_LENGTH = 300;

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
      }).slice(0, MAX_FAVORITES);
    } catch (error) {
      console.warn("[SUPERX Favorites] Load failed:", error);
      return [];
    }
  }

  let favorites = load();

  function save() {
    try {
      favorites = favorites.slice(0, MAX_FAVORITES);

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(favorites)
      );

      return true;
    } catch (error) {
      console.warn("[SUPERX Favorites] Save failed:", error);
      return false;
    }
  }

  function findIndex(sessionId) {
    const id = cleanText(sessionId, 120);

    return favorites.findIndex(function (item) {
      return item.sessionId === id;
    });
  }

  function emit(action, sessionId) {
    window.dispatchEvent(new CustomEvent(
      "sx:race-session-favorites-updated",
      {
        detail: {
          action: action,
          sessionId: sessionId || null,
          count: favorites.length
        }
      }
    ));
  }

  function add(sessionId, details) {
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
        reason: "already-favorite"
      };
    }

    if (favorites.length >= MAX_FAVORITES) {
      return {
        success: false,
        reason: "favorite-limit-reached"
      };
    }

    const info = details && typeof details === "object"
      ? details
      : {};

    const item = {
      sessionId: id,
      addedAt: Date.now(),
      note: "",
      title: cleanText(info.title, 100),
      mode: cleanText(info.mode, 50),
      map: cleanText(info.map, 80),
      car: cleanText(info.car, 80)
    };

    favorites.unshift(item);

    save();
    emit("add", id);

    return {
      success: true,
      favorite: clone(item)
    };
  }

  function remove(sessionId) {
    const id = cleanText(sessionId, 120);
    const index = findIndex(id);

    if (index === -1) return false;

    favorites.splice(index, 1);

    save();
    emit("remove", id);

    return true;
  }

  function toggle(sessionId, details) {
    const id = cleanText(sessionId, 120);

    if (!id) return false;

    if (findIndex(id) !== -1) {
      remove(id);
      return false;
    }

    const result = add(id, details);

    return result.success ? true : false;
  }

  function isFavorite(sessionId) {
    return findIndex(sessionId) !== -1;
  }

  function getAll(options) {
    const settings = options || {};
    let result = favorites.slice();

    if (settings.search) {
      const query = String(settings.search).toLowerCase();

      result = result.filter(function (item) {
        return (
          item.sessionId.toLowerCase().includes(query) ||
          item.title.toLowerCase().includes(query) ||
          item.mode.toLowerCase().includes(query) ||
          item.map.toLowerCase().includes(query) ||
          item.car.toLowerCase().includes(query) ||
          item.note.toLowerCase().includes(query)
        );
      });
    }

    if (settings.sort === "oldest") {
      result.sort(function (a, b) {
        return a.addedAt - b.addedAt;
      });
    } else if (settings.sort === "alphabetical") {
      result.sort(function (a, b) {
        return a.sessionId.localeCompare(b.sessionId);
      });
    } else {
      result.sort(function (a, b) {
        return b.addedAt - a.addedAt;
      });
    }

    return clone(result);
  }

  function getOne(sessionId) {
    const index = findIndex(sessionId);

    return index === -1
      ? null
      : clone(favorites[index]);
  }

  function updateNote(sessionId, note) {
    const index = findIndex(sessionId);

    if (index === -1) return false;

    favorites[index].note = cleanText(
      note,
      MAX_NOTE_LENGTH
    );

    favorites[index].updatedAt = Date.now();

    save();
    emit("note-updated", favorites[index].sessionId);

    return true;
  }

  function updateDetails(sessionId, details) {
    const index = findIndex(sessionId);

    if (index === -1) return false;

    const info = details && typeof details === "object"
      ? details
      : {};

    ["title", "mode", "map", "car"].forEach(function (key) {
      if (info[key] !== undefined) {
        const limits = {
          title: 100,
          mode: 50,
          map: 80,
          car: 80
        };

        favorites[index][key] = cleanText(
          info[key],
          limits[key]
        );
      }
    });

    favorites[index].updatedAt = Date.now();

    save();
    emit("details-updated", favorites[index].sessionId);

    return true;
  }

  function getCount() {
    return favorites.length;
  }

  function clearAll() {
    favorites = [];
    save();
    emit("clear-all", null);

    return true;
  }

  function exportFavorites() {
    return JSON.stringify({
      version: 1,
      exportedAt: Date.now(),
      favorites: clone(favorites)
    }, null, 2);
  }

  function importFavorites(input) {
    try {
      const data = typeof input === "string"
        ? JSON.parse(input)
        : input;

      if (
        !data ||
        !Array.isArray(data.favorites)
      ) {
        return {
          success: false,
          reason: "invalid-data"
        };
      }

      let imported = 0;

      data.favorites.forEach(function (item) {
        if (
          !item ||
          typeof item.sessionId !== "string"
        ) {
          return;
        }

        const id = cleanText(item.sessionId, 120);

        if (!id || findIndex(id) !== -1) return;
        if (favorites.length >= MAX_FAVORITES) return;

        favorites.push({
          sessionId: id,
          addedAt: Number(item.addedAt) || Date.now(),
          updatedAt: Date.now(),
          note: cleanText(item.note, MAX_NOTE_LENGTH),
          title: cleanText(item.title, 100),
          mode: cleanText(item.mode, 50),
          map: cleanText(item.map, 80),
          car: cleanText(item.car, 80)
        });

        imported += 1;
      });

      save();
      emit("import", null);

      return {
        success: true,
        imported: imported,
        total: favorites.length
      };
    } catch (error) {
      return {
        success: false,
        reason: "import-failed"
      };
    }
  }

  SX.vehicleRaceSessionFavorites = {
    add: add,
    remove: remove,
    toggle: toggle,
    isFavorite: isFavorite,
    getAll: getAll,
    getOne: getOne,
    updateNote: updateNote,
    updateDetails: updateDetails,
    getCount: getCount,
    clearAll: clearAll,
    exportFavorites: exportFavorites,
    importFavorites: importFavorites
  };

  console.log("[SUPERX] Race Session Favorites ready.");

})(window);

/* ======================= FILE 116 END ======================= */
 
