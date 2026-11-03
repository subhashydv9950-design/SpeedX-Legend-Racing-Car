
/* =========================================================
   SUPERX LEGEND — FILE 116
   FILE: js/vehicle-race-session-favorites.js
   MODULE: Race Session Favorites
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_race_session_favorites_v2";
  const LEGACY_KEY = "superx_race_session_favorites_v1";

  const MAX_FAVORITES = 200;
  const MAX_NOTE_LENGTH = 300;

  const LIMITS = {
    sessionId: 120,
    title: 100,
    mode: 50,
    map: 80,
    car: 80
  };

  function cleanText(value, limit) {
    if (typeof value !== "string") return "";

    return value
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, limit || 120);
  }

  function safeTime(value) {
    const time = Number(value);

    return Number.isFinite(time) && time > 0
      ? Math.min(time, Date.now() + 86400000)
      : Date.now();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeItem(item) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return null;
    }

    const sessionId = cleanText(item.sessionId, LIMITS.sessionId);

    if (!sessionId) return null;

    return {
      sessionId,
      addedAt: safeTime(item.addedAt),
      updatedAt: safeTime(item.updatedAt || item.addedAt),
      note: cleanText(item.note, MAX_NOTE_LENGTH),
      title: cleanText(item.title, LIMITS.title),
      mode: cleanText(item.mode, LIMITS.mode),
      map: cleanText(item.map, LIMITS.map),
      car: cleanText(item.car, LIMITS.car)
    };
  }

  function normalizeList(list) {
    if (!Array.isArray(list)) return [];

    const result = [];
    const seen = new Set();

    list.forEach(function (item) {
      if (result.length >= MAX_FAVORITES) return;

      const normalized = normalizeItem(item);

      if (!normalized || seen.has(normalized.sessionId)) return;

      seen.add(normalized.sessionId);
      result.push(normalized);
    });

    return result;
  }

  function load() {
    try {
      let raw = window.localStorage.getItem(STORAGE_KEY);
      let migrated = false;

      if (!raw) {
        raw = window.localStorage.getItem(LEGACY_KEY);
        migrated = Boolean(raw);
      }

      if (!raw) return [];

      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed)
        ? parsed
        : parsed && parsed.favorites;

      const result = normalizeList(list);

      if (migrated) {
        try {
          window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              version: 2,
              favorites: result
            })
          );
        } catch (error) {
          console.warn("[SUPERX Favorites] Migration save failed:", error);
        }
      }

      return result;
    } catch (error) {
      console.warn("[SUPERX Favorites] Load failed:", error);
      return [];
    }
  }

  let favorites = load();

  function persist(next) {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 2,
          favorites: next
        })
      );

      favorites = next;
      return true;
    } catch (error) {
      console.warn("[SUPERX Favorites] Save failed:", error);
      return false;
    }
  }

  function findIndex(sessionId) {
    const id = cleanText(sessionId, LIMITS.sessionId);

    return favorites.findIndex(function (item) {
      return item.sessionId === id;
    });
  }

  function emit(action, sessionId) {
    try {
      if (typeof window.CustomEvent !== "function") return;

      window.dispatchEvent(new CustomEvent(
        "sx:race-session-favorites-updated",
        {
          detail: {
            action,
            sessionId: sessionId || null,
            count: favorites.length
          }
        }
      ));
    } catch (error) {
      console.warn("[SUPERX Favorites] Event failed:", error);
    }
  }

  function add(sessionId, details) {
    const id = cleanText(sessionId, LIMITS.sessionId);

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
      updatedAt: Date.now(),
      note: "",
      title: cleanText(info.title, LIMITS.title),
      mode: cleanText(info.mode, LIMITS.mode),
      map: cleanText(info.map, LIMITS.map),
      car: cleanText(info.car, LIMITS.car)
    };

    const next = [item].concat(favorites);

    if (!persist(next)) {
      return {
        success: false,
        reason: "save-failed"
      };
    }

    emit("add", id);

    return {
      success: true,
      favorite: clone(item)
    };
  }

  function remove(sessionId) {
    const id = cleanText(sessionId, LIMITS.sessionId);
    const index = findIndex(id);

    if (index === -1) return false;

    const next = favorites.slice();
    next.splice(index, 1);

    if (!persist(next)) return false;

    emit("remove", id);
    return true;
  }

  function toggle(sessionId, details) {
    const id = cleanText(sessionId, LIMITS.sessionId);

    if (!id) return false;

    if (findIndex(id) !== -1) {
      return remove(id) ? false : true;
    }

    return add(id, details).success;
  }

  function isFavorite(sessionId) {
    return findIndex(sessionId) !== -1;
  }

  function getAll(options) {
    const settings = options || {};
    let result = favorites.slice();

    if (settings.search) {
      const query = String(settings.search).trim().toLowerCase();

      result = result.filter(function (item) {
        return [
          item.sessionId,
          item.title,
          item.mode,
          item.map,
          item.car,
          item.note
        ].some(function (value) {
          return value.toLowerCase().includes(query);
        });
      });
    }

    if (settings.sort === "oldest") {
      result.sort((a, b) => a.addedAt - b.addedAt);
    } else if (settings.sort === "alphabetical") {
      result.sort((a, b) =>
        a.sessionId.localeCompare(b.sessionId)
      );
    } else if (settings.sort === "title") {
      result.sort((a, b) =>
        a.title.localeCompare(b.title)
      );
    } else {
      result.sort((a, b) => b.addedAt - a.addedAt);
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

    const next = clone(favorites);

    next[index].note = cleanText(note, MAX_NOTE_LENGTH);
    next[index].updatedAt = Date.now();

    if (!persist(next)) return false;

    emit("note-updated", next[index].sessionId);
    return true;
  }

  function updateDetails(sessionId, details) {
    const index = findIndex(sessionId);

    if (index === -1) return false;

    const info = details && typeof details === "object"
      ? details
      : {};

    const next = clone(favorites);

    Object.keys(LIMITS).forEach(function (key) {
      if (key === "sessionId" || info[key] === undefined) return;

      next[index][key] = cleanText(info[key], LIMITS[key]);
    });

    next[index].updatedAt = Date.now();

    if (!persist(next)) return false;

    emit("details-updated", next[index].sessionId);
    return true;
  }

  function getCount() {
    return favorites.length;
  }

  function clearAll() {
    if (!favorites.length) return true;

    if (!persist([])) return false;

    emit("clear-all", null);
    return true;
  }

  function exportFavorites() {
    return JSON.stringify({
      version: 2,
      exportedAt: new Date().toISOString(),
      favorites: clone(favorites)
    }, null, 2);
  }

  function importFavorites(input, options) {
    try {
      const data = typeof input === "string"
        ? JSON.parse(input)
        : input;

      if (
        !data ||
        typeof data !== "object" ||
        !Array.isArray(data.favorites)
      ) {
        return {
          success: false,
          reason: "invalid-data"
        };
      }

      const settings = options || {};
      const incoming = normalizeList(data.favorites);

      let next = settings.replace === true
        ? []
        : clone(favorites);

      const existing = new Set(
        next.map(item => item.sessionId)
      );

      let imported = 0;

      incoming.forEach(function (item) {
        if (existing.has(item.sessionId)) return;
        if (next.length >= MAX_FAVORITES) return;

        next.push(item);
        existing.add(item.sessionId);
        imported += 1;
      });

      if (!persist(next)) {
        return {
          success: false,
          reason: "save-failed"
        };
      }

      emit("import", null);

      return {
        success: true,
        imported,
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
    add,
    remove,
    toggle,
    isFavorite,
    getAll,
    getOne,
    updateNote,
    updateDetails,
    getCount,
    clearAll,
    exportFavorites,
    importFavorites
  };

  console.info("[SUPERX] Race Session Favorites ready.");

})(window);

/* ======================= END FILE 116 ======================= */
