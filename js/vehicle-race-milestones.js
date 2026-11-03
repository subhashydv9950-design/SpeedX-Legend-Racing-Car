
/* =========================================================
   SUPERX LEGEND — FILE 110
   FILE: js/vehicle-race-milestones.js
   MODULE: Race Session Milestones
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};
  const STORAGE_KEY = "superx_race_milestones_v2";

  const DEFINITIONS = [
    { id: "race_10", category: "races", target: 10, title: "Rookie Racer" },
    { id: "race_50", category: "races", target: 50, title: "Street Racer" },
    { id: "race_100", category: "races", target: 100, title: "Pro Racer" },
    { id: "race_500", category: "races", target: 500, title: "Legend Racer" },

    { id: "wins_5", category: "wins", target: 5, title: "First Victories" },
    { id: "wins_25", category: "wins", target: 25, title: "Victory Hunter" },
    { id: "wins_100", category: "wins", target: 100, title: "Champion" },

    { id: "distance_50", category: "distance", target: 50, title: "Road Explorer" },
    { id: "distance_250", category: "distance", target: 250, title: "Road Master" },
    { id: "distance_1000", category: "distance", target: 1000, title: "Road Legend" },

    { id: "coins_10000", category: "coins", target: 10000, title: "Coin Collector" },
    { id: "coins_50000", category: "coins", target: 50000, title: "Wealthy Driver" },

    { id: "xp_5000", category: "xp", target: 5000, title: "Experienced Driver" },
    { id: "xp_25000", category: "xp", target: 25000, title: "Master Driver" }
  ];

  function number(value) {
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
  }

  function emit(name, detail = {}) {
    window.dispatchEvent(
      new CustomEvent(name, { detail })
    );
  }

  function load() {
    try {
      const parsed = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "{}"
      );

      return parsed && typeof parsed === "object" &&
        !Array.isArray(parsed)
        ? parsed
        : {};
    } catch (_) {
      return {};
    }
  }

  let progress = load();

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(progress)
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  function getProgress(id) {
    const value = progress[id];

    return value && typeof value === "object"
      ? {
          value: Math.max(0, number(value.value)),
          unlocked: value.unlocked === true,
          unlockedAt: value.unlockedAt || null
        }
      : {
          value: 0,
          unlocked: false,
          unlockedAt: null
        };
  }

  function update(category, amount) {
    const increment = Math.max(0, number(amount));

    if (!increment) return [];

    const unlockedNow = [];

    DEFINITIONS
      .filter(item => item.category === category)
      .forEach(definition => {
        const current = getProgress(definition.id);

        current.value = Math.min(
          definition.target,
          current.value + increment
        );

        if (
          !current.unlocked &&
          current.value >= definition.target
        ) {
          current.unlocked = true;
          current.unlockedAt = new Date().toISOString();

          const unlocked = {
            ...definition,
            ...current
          };

          unlockedNow.push(unlocked);

          emit("sx:milestone-unlocked", {
            id: definition.id,
            title: definition.title,
            category,
            target: definition.target,
            unlockedAt: current.unlockedAt
          });
        }

        progress[definition.id] = current;
      });

    return unlockedNow;
  }

  function recordRace(data = {}) {
    const unlocked = [];

    unlocked.push(...update("races", 1));

    if (data.won === true) {
      unlocked.push(...update("wins", 1));
    }

    unlocked.push(...update(
      "distance",
      Math.max(0, number(data.distanceKm))
    ));

    unlocked.push(...update(
      "coins",
      Math.max(0, number(data.coins))
    ));

    unlocked.push(...update(
      "xp",
      Math.max(0, number(data.xp))
    ));

    save();

    if (unlocked.length) {
      emit("sx:milestones-updated", {
        unlocked: unlocked.map(item => item.id),
        summary: getSummary()
      });
    }

    return unlocked;
  }

  function getAll() {
    return DEFINITIONS.map(definition => {
      const current = getProgress(definition.id);

      return {
        ...definition,
        ...current,
        percentage: Math.min(
          100,
          Math.round(current.value / definition.target * 100)
        ),
        remaining: Math.max(
          0,
          definition.target - current.value
        )
      };
    });
  }

  function getUnlocked() {
    return getAll().filter(item => item.unlocked);
  }

  function getLocked() {
    return getAll().filter(item => !item.unlocked);
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

  function getNextMilestones(limit = 3) {
    const count = Math.max(
      1,
      Math.min(20, Math.floor(number(limit) || 3))
    );

    return getLocked()
      .sort((a, b) => {
        const progressA = a.value / a.target;
        const progressB = b.value / b.target;

        return progressB - progressA;
      })
      .slice(0, count);
  }

  function getById(id) {
    const definition = DEFINITIONS.find(
      item => item.id === String(id)
    );

    if (!definition) return null;

    const current = getProgress(definition.id);

    return {
      ...definition,
      ...current,
      percentage: Math.min(
        100,
        Math.round(current.value / definition.target * 100)
      ),
      remaining: Math.max(0, definition.target - current.value)
    };
  }

  function resetProgress() {
    progress = {};
    save();

    emit("sx:milestones-reset");

    return getSummary();
  }

  SX.vehicleRaceMilestones = {
    recordRace,
    getAll,
    getById,
    getUnlocked,
    getLocked,
    getSummary,
    getNextMilestones,
    resetProgress
  };

})(window);

/* ======================= END FILE 110 ======================= */
