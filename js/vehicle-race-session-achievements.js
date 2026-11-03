/* =========================================================
   SUPERX LEGEND — FILE 112
   FILE: js/vehicle-race-session-achievements.js
   MODULE: Race Session Achievements
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_race_session_achievements_v2";
  const LEGACY_KEY = "superx_race_session_achievements_v1";
  const MAX_PROCESSED_IDS = 1000;

  const DEFINITIONS = [
    {
      id: "first_session",
      title: "First Session",
      description: "Complete your first gaming session.",
      target: 1,
      type: "sessions"
    },
    {
      id: "sessions_10",
      title: "Regular Driver",
      description: "Complete 10 gaming sessions.",
      target: 10,
      type: "sessions"
    },
    {
      id: "clean_race",
      title: "Clean Driver",
      description: "Complete a race without penalties.",
      target: 1,
      type: "cleanRaces"
    },
    {
      id: "clean_races_10",
      title: "Precision Driver",
      description: "Complete 10 clean races.",
      target: 10,
      type: "cleanRaces"
    },
    {
      id: "streak_3",
      title: "Winning Streak",
      description: "Win 3 races in a row.",
      target: 3,
      type: "winStreak"
    },
    {
      id: "streak_5",
      title: "Unstoppable",
      description: "Win 5 races in a row.",
      target: 5,
      type: "winStreak"
    },
    {
      id: "long_drive",
      title: "Long Distance",
      description: "Drive 100 km in total.",
      target: 100,
      type: "distance"
    },
    {
      id: "race_100",
      title: "Century Racer",
      description: "Complete 100 races.",
      target: 100,
      type: "races"
    }
  ];

  const state = {
    sessions: 0,
    races: 0,
    cleanRaces: 0,
    winStreak: 0,
    distance: 0,
    unlocked: {},
    processedSessions: [],
    processedRaces: []
  };

  function number(value, fallback = 0) {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
  }

  function safeId(value) {
    return String(value == null ? "" : value)
      .trim()
      .slice(0, 120);
  }

  function safeCount(value) {
    return Math.max(0, Math.min(1000000000, Math.floor(number(value))));
  }

  function safeDistance(value) {
    return Math.max(0, Math.min(1000000000, number(value)));
  }

  function cleanIdList(value) {
    if (!Array.isArray(value)) return [];

    return Array.from(new Set(
      value.map(safeId).filter(Boolean)
    )).slice(-MAX_PROCESSED_IDS);
  }

  function cleanUnlocked(value) {
    const result = {};

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return result;
    }

    DEFINITIONS.forEach(definition => {
      const item = value[definition.id];

      if (!item || typeof item !== "object") return;

      result[definition.id] = {
        id: definition.id,
        title: definition.title,
        description: definition.description,
        unlockedAt: safeId(item.unlockedAt).slice(0, 40) ||
          new Date().toISOString()
      };
    });

    return result;
  }

  function applyData(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return false;
    }

    state.sessions = safeCount(data.sessions);
    state.races = safeCount(data.races);
    state.cleanRaces = Math.min(
      state.races,
      safeCount(data.cleanRaces)
    );
    state.winStreak = safeCount(data.winStreak);
    state.distance = safeDistance(data.distance);
    state.unlocked = cleanUnlocked(data.unlocked);
    state.processedSessions = cleanIdList(data.processedSessions);
    state.processedRaces = cleanIdList(data.processedRaces);

    return true;
  }

  function snapshot() {
    return JSON.stringify(state);
  }

  function restore(raw) {
    try {
      applyData(JSON.parse(raw));
    } catch (error) {
      console.warn("[SUPERX SessionAchievements] Restore failed:", error);
    }
  }

  function load() {
    try {
      let raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        raw = localStorage.getItem(LEGACY_KEY);

        if (raw) {
          const migrated = JSON.parse(raw);
          applyData(migrated);
          save();
        }

        return;
      }

      applyData(JSON.parse(raw));
    } catch (error) {
      console.warn("[SUPERX SessionAchievements] Load failed:", error);
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      console.warn("[SUPERX SessionAchievements] Save failed:", error);
      return false;
    }
  }

  function getValue(type) {
    return number(state[type]);
  }

  function emitUnlock(record) {
    try {
      if (typeof window.CustomEvent === "function") {
        window.dispatchEvent(new CustomEvent(
          "sx:session-achievement-unlocked",
          { detail: { ...record } }
        ));
      }
    } catch (error) {
      console.warn("[SUPERX SessionAchievements] Event failed:", error);
    }
  }

  function checkUnlocks() {
    const newlyUnlocked = [];

    DEFINITIONS.forEach(definition => {
      if (state.unlocked[definition.id]) return;

      if (getValue(definition.type) < definition.target) return;

      const record = {
        id: definition.id,
        title: definition.title,
        description: definition.description,
        unlockedAt: new Date().toISOString()
      };

      state.unlocked[definition.id] = record;
      newlyUnlocked.push({ ...record });
    });

    if (newlyUnlocked.length) {
      if (save()) {
        newlyUnlocked.forEach(emitUnlock);
      }
    }

    return newlyUnlocked;
  }

  function recordRace(data = {}) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return {
        success: false,
        error: "Invalid race data.",
        unlocked: []
      };
    }

    const raceId = safeId(data.id);

    if (raceId && state.processedRaces.includes(raceId)) {
      return {
        success: false,
        error: "Race already processed.",
        unlocked: []
      };
    }

    const previous = snapshot();

    state.races += 1;

    const penalties = Math.max(0, number(data.penalties));
    const clean = penalties === 0;

    if (clean) {
      state.cleanRaces += 1;
    }

    const won = data.won === true || Number(data.position) === 1;

    state.winStreak = won
      ? state.winStreak + 1
      : 0;

    state.distance += safeDistance(data.distanceKm);

    if (raceId) {
      state.processedRaces.push(raceId);
      state.processedRaces = cleanIdList(state.processedRaces);
    }

    if (!save()) {
      restore(previous);

      return {
        success: false,
        error: "Could not save race achievement data.",
        unlocked: []
      };
    }

    return {
      success: true,
      unlocked: checkUnlocks()
    };
  }

  function recordSession(session) {
    if (!session || typeof session !== "object" || Array.isArray(session)) {
      return {
        success: false,
        error: "Invalid session data.",
        unlocked: []
      };
    }

    const id = safeId(session.id);

    if (!id) {
      return {
        success: false,
        error: "Session ID is required.",
        unlocked: []
      };
    }

    if (state.processedSessions.includes(id)) {
      return {
        success: false,
        error: "Session already processed.",
        unlocked: []
      };
    }

    const previous = snapshot();

    state.sessions += 1;
    state.processedSessions.push(id);
    state.processedSessions = cleanIdList(state.processedSessions);

    if (!save()) {
      restore(previous);

      return {
        success: false,
        error: "Could not save session achievement data.",
        unlocked: []
      };
    }

    return {
      success: true,
      unlocked: checkUnlocks()
    };
  }

  function getAll() {
    return DEFINITIONS.map(definition => {
      const unlocked = state.unlocked[definition.id] || null;

      const progress = Math.min(
        definition.target,
        getValue(definition.type)
      );

      return {
        ...definition,
        progress,
        percentage: Math.round(
          progress / definition.target * 100
        ),
        unlocked: Boolean(unlocked),
        unlockedAt: unlocked ? unlocked.unlockedAt : null
      };
    });
  }

  function getUnlocked() {
    return getAll().filter(item => item.unlocked);
  }

  function getLocked() {
    return getAll().filter(item => !item.unlocked);
  }

  function getById(id) {
    return getAll().find(item => item.id === String(id)) || null;
  }

  function getSummary() {
    const all = getAll();
    const unlocked = all.filter(item => item.unlocked).length;

    return {
      total: all.length,
      unlocked,
      locked: all.length - unlocked,
      completionRate: all.length
        ? Math.round(unlocked / all.length * 100)
        : 0
    };
  }

  function getStats() {
    return {
      sessions: state.sessions,
      races: state.races,
      cleanRaces: state.cleanRaces,
      currentWinStreak: state.winStreak,
      totalDistanceKm: Number(state.distance.toFixed(2))
    };
  }

  function exportData() {
    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      stats: getStats(),
      achievements: getAll(),
      storage: JSON.parse(JSON.stringify(state))
    };
  }

  function importData(data, options = {}) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return {
        success: false,
        error: "Invalid import data."
      };
    }

    const incoming = data.storage || data;
    const previous = snapshot();

    if (!applyData(incoming)) {
      restore(previous);

      return {
        success: false,
        error: "Import data could not be read."
      };
    }

    if (options.merge === true) {
      const imported = JSON.parse(snapshot());
      restore(previous);

      state.sessions = Math.max(state.sessions, imported.sessions);
      state.races = Math.max(state.races, imported.races);
      state.cleanRaces = Math.max(state.cleanRaces, imported.cleanRaces);
      state.winStreak = Math.max(state.winStreak, imported.winStreak);
      state.distance = Math.max(state.distance, imported.distance);

      Object.keys(imported.unlocked).forEach(id => {
        if (!state.unlocked[id]) {
          state.unlocked[id] = imported.unlocked[id];
        }
      });

      state.processedSessions = cleanIdList(
        state.processedSessions.concat(imported.processedSessions)
      );

      state.processedRaces = cleanIdList(
        state.processedRaces.concat(imported.processedRaces)
      );
    }

    if (!save()) {
      restore(previous);

      return {
        success: false,
        error: "Could not save imported achievements."
      };
    }

    checkUnlocks();

    return {
      success: true,
      summary: getSummary()
    };
  }

  load();

  SX.vehicleRaceSessionAchievements = {
    recordRace,
    recordSession,
    getAll,
    getUnlocked,
    getLocked,
    getById,
    getSummary,
    getStats,
    checkUnlocks,
    exportData,
    importData
  };

  console.info("[SUPERX] Race Session Achievements loaded.");

})(window);

/* ======================= END FILE 112 ======================= */
       
