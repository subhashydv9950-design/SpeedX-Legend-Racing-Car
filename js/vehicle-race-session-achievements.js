
/* =========================================================
   SUPERX LEGEND — FILE 112
   FILE: js/vehicle-race-session-achievements.js
   MODULE: Race Session Achievements
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_race_session_achievements_v1";

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
    processedSessions: []
  };

  function number(value) {
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) return;

      const data = JSON.parse(raw);

      if (!data || typeof data !== "object") return;

      state.sessions = Math.max(0, number(data.sessions));
      state.races = Math.max(0, number(data.races));
      state.cleanRaces = Math.max(0, number(data.cleanRaces));
      state.winStreak = Math.max(0, number(data.winStreak));
      state.distance = Math.max(0, number(data.distance));

      state.unlocked =
        data.unlocked && typeof data.unlocked === "object"
          ? data.unlocked
          : {};

      state.processedSessions =
        Array.isArray(data.processedSessions)
          ? data.processedSessions.slice(-200)
          : [];

    } catch (error) {
      console.warn("[SUPERX SessionAchievements] Load failed:", error);
    }
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
      );

      return true;
    } catch (error) {
      console.warn("[SUPERX SessionAchievements] Save failed:", error);
      return false;
    }
  }

  function getValue(type) {
    return number(state[type]);
  }

  function checkUnlocks() {
    const newlyUnlocked = [];

    DEFINITIONS.forEach(definition => {
      if (state.unlocked[definition.id]) return;

      if (
        getValue(definition.type) >= definition.target
      ) {
        const record = {
          id: definition.id,
          title: definition.title,
          description: definition.description,
          unlockedAt: new Date().toISOString()
        };

        state.unlocked[definition.id] = record;
        newlyUnlocked.push({ ...record });

        window.dispatchEvent(new CustomEvent(
          "sx:session-achievement-unlocked",
          { detail: { ...record } }
        ));
      }
    });

    if (newlyUnlocked.length) save();

    return newlyUnlocked;
  }

  function recordRace(data = {}) {
    state.races += 1;

    const penalties = Math.max(
      0,
      number(data.penalties)
    );

    const clean = penalties === 0;

    if (clean) {
      state.cleanRaces += 1;
    }

    const won = data.won === true ||
      Number(data.position) === 1;

    state.winStreak = won
      ? state.winStreak + 1
      : 0;

    state.distance += Math.max(
      0,
      number(data.distanceKm)
    );

    save();

    return checkUnlocks();
  }

  function recordSession(session) {
    if (!session || typeof session !== "object") {
      return {
        success: false,
        error: "Invalid session data."
      };
    }

    const id = String(session.id || "");

    if (!id) {
      return {
        success: false,
        error: "Session ID is required."
      };
    }

    if (state.processedSessions.includes(id)) {
      return {
        success: false,
        error: "Session already processed."
      };
    }

    state.sessions += 1;

    state.processedSessions.push(id);
    state.processedSessions =
      state.processedSessions.slice(-200);

    save();

    const unlocked = checkUnlocks();

    return {
      success: true,
      unlocked
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

  load();

  SX.vehicleRaceSessionAchievements = {
    recordRace,
    recordSession,
    getAll,
    getUnlocked,
    getSummary,
    getStats
  };

  console.info("[SUPERX] Race Session Achievements loaded.");

})(window);

/* ======================= END FILE 112 ======================= */
