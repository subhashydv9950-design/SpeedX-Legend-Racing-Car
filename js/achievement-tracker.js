
/* =========================================================
   SUPERX LEGEND — FILE 56
   FILE: js/achievement-tracker.js
   PURPOSE: Track player actions and achievement progress
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_achievement_tracker_v1";

  const DEFINITIONS = [
    {
      id: "first-race",
      name: "First Race",
      description: "Complete your first race",
      target: 1,
      stat: "races",
      reward: 100
    },
    {
      id: "race-10",
      name: "Racing Rookie",
      description: "Complete 10 races",
      target: 10,
      stat: "races",
      reward: 250
    },
    {
      id: "race-50",
      name: "Street Racer",
      description: "Complete 50 races",
      target: 50,
      stat: "races",
      reward: 700
    },
    {
      id: "race-100",
      name: "Racing Legend",
      description: "Complete 100 races",
      target: 100,
      stat: "races",
      reward: 1500
    },
    {
      id: "wins-10",
      name: "Champion",
      description: "Win 10 races",
      target: 10,
      stat: "wins",
      reward: 500
    },
    {
      id: "wins-50",
      name: "Ultimate Champion",
      description: "Win 50 races",
      target: 50,
      stat: "wins",
      reward: 1200
    },
    {
      id: "cars-5",
      name: "Car Collector",
      description: "Own 5 cars",
      target: 5,
      stat: "cars",
      reward: 400
    },
    {
      id: "cars-15",
      name: "Super Collector",
      description: "Own 15 cars",
      target: 15,
      stat: "cars",
      reward: 1000
    },
    {
      id: "maps-10",
      name: "Explorer",
      description: "Complete 10 maps",
      target: 10,
      stat: "maps",
      reward: 400
    },
    {
      id: "maps-50",
      name: "World Explorer",
      description: "Complete 50 maps",
      target: 50,
      stat: "maps",
      reward: 1000
    },
    {
      id: "distance-100",
      name: "Road Traveller",
      description: "Drive 100 kilometres",
      target: 100,
      stat: "distance",
      reward: 300
    },
    {
      id: "distance-1000",
      name: "Road Master",
      description: "Drive 1000 kilometres",
      target: 1000,
      stat: "distance",
      reward: 1500
    },
    {
      id: "coins-10000",
      name: "Coin Hunter",
      description: "Earn 10000 coins",
      target: 10000,
      stat: "earnedCoins",
      reward: 500
    },
    {
      id: "level-10",
      name: "Rising Star",
      description: "Reach level 10",
      target: 10,
      stat: "level",
      reward: 1000
    }
  ];

  const state = {
    initialized: false,
    stats: {
      races: 0,
      wins: 0,
      cars: 2,
      maps: 0,
      distance: 0,
      earnedCoins: 0,
      level: 1
    },
    claimed: [],
    unlocked: []
  };

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, {
      detail: detail || {}
    }));
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          stats: state.stats,
          claimed: state.claimed,
          unlocked: state.unlocked
        })
      );

      return true;
    } catch (error) {
      console.warn("SUPERX achievement save failed:", error);
      return false;
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) return false;

      const data = JSON.parse(raw);

      if (!data || typeof data !== "object") {
        return false;
      }

      if (data.stats) {
        Object.keys(state.stats).forEach(function (key) {
          const value = Number(data.stats[key]);

          if (Number.isFinite(value) && value >= 0) {
            state.stats[key] = value;
          }
        });
      }

      state.claimed = Array.isArray(data.claimed)
        ? data.claimed.filter(id =>
            DEFINITIONS.some(item => item.id === id)
          )
        : [];

      state.unlocked = Array.isArray(data.unlocked)
        ? data.unlocked.filter(id =>
            DEFINITIONS.some(item => item.id === id)
          )
        : [];

      return true;
    } catch (error) {
      return false;
    }
  }

  function checkAchievements() {
    DEFINITIONS.forEach(function (achievement) {
      const value = Number(
        state.stats[achievement.stat] || 0
      );

      if (
        value >= achievement.target &&
        !state.unlocked.includes(achievement.id)
      ) {
        state.unlocked.push(achievement.id);

        emit("sx:achievement-unlocked", {
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          reward: achievement.reward
        });
      }
    });

    save();
  }

  function addStat(stat, amount) {
    if (!(stat in state.stats)) return false;

    amount = Number(amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return false;
    }

    state.stats[stat] += amount;

    checkAchievements();

    emit("sx:achievement-stat-updated", {
      stat,
      value: state.stats[stat]
    });

    return true;
  }

  function setStat(stat, value) {
    if (!(stat in state.stats)) return false;

    value = Number(value);

    if (!Number.isFinite(value) || value < 0) {
      return false;
    }

    state.stats[stat] = value;

    checkAchievements();
    return true;
  }

  function recordRace(won) {
    addStat("races", 1);

    if (won) {
      addStat("wins", 1);
    }
  }

  function recordCarPurchased() {
    addStat("cars", 1);
  }

  function recordMapCompleted() {
    addStat("maps", 1);
  }

  function recordDistance(kilometres) {
    addStat("distance", kilometres);
  }

  function recordCoinsEarned(coins) {
    addStat("earnedCoins", coins);
  }

  function updateLevel(level) {
    setStat("level", level);
  }

  function getAll() {
    return DEFINITIONS.map(function (item) {
      const progress = Number(
        state.stats[item.stat] || 0
      );

      return Object.assign({}, item, {
        progress: Math.min(progress, item.target),
        percentage: Math.min(
          100,
          Math.round(progress / item.target * 100)
        ),
        unlocked: state.unlocked.includes(item.id),
        claimed: state.claimed.includes(item.id)
      });
    });
  }

  function claimReward(id) {
    const achievement = DEFINITIONS.find(
      item => item.id === id
    );

    if (
      !achievement ||
      !state.unlocked.includes(id) ||
      state.claimed.includes(id)
    ) {
      return false;
    }

    let rewarded = false;

    if (typeof SX.addCoins === "function") {
      rewarded = SX.addCoins(achievement.reward) !== false;
    }

    if (!rewarded && SX.progress &&
        typeof SX.progress.addCoins === "function") {
      SX.progress.addCoins(achievement.reward);
      rewarded = true;
    }

    if (!rewarded) return false;

    state.claimed.push(id);
    save();

    emit("sx:achievement-reward-claimed", {
      id,
      reward: achievement.reward
    });

    return true;
  }

  function getStats() {
    return Object.assign({}, state.stats);
  }

  function getSummary() {
    return {
      total: DEFINITIONS.length,
      unlocked: state.unlocked.length,
      claimed: state.claimed.length,
      remaining: DEFINITIONS.length - state.unlocked.length
    };
  }

  function reset() {
    state.stats = {
      races: 0,
      wins: 0,
      cars: 2,
      maps: 0,
      distance: 0,
      earnedCoins: 0,
      level: 1
    };

    state.claimed = [];
    state.unlocked = [];

    save();
    emit("sx:achievements-reset");
  }

  function init() {
    if (state.initialized) {
      return getAll();
    }

    state.initialized = true;
    load();

    checkAchievements();

    return getAll();
  }

  SX.achievementTracker = {
    init,
    getAll,
    getStats,
    getSummary,
    addStat,
    setStat,
    recordRace,
    recordCarPurchased,
    recordMapCompleted,
    recordDistance,
    recordCoinsEarned,
    updateLevel,
    claimReward,
    checkAchievements,
    reset
  };

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 56 END
   ========================================================= */
    
