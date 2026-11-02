
/* =========================================================
   SUPERX LEGEND — FILE 33
   FILE: js/achievements.js
   START
========================================================= */

(() => {
  "use strict";

  const SX = (window.SUPERX = window.SUPERX || {});

  const STORAGE_KEY = "superx_achievements_v1";

  const DEFINITIONS = [
    {
      id: "first-race",
      title: "First Race",
      description: "Complete your first race.",
      icon: "🏁",
      target: 1,
      reward: 250,
      type: "races"
    },
    {
      id: "race-driver",
      title: "Race Driver",
      description: "Complete 10 races.",
      icon: "🏎️",
      target: 10,
      reward: 750,
      type: "races"
    },
    {
      id: "race-master",
      title: "Race Master",
      description: "Complete 50 races.",
      icon: "🏆",
      target: 50,
      reward: 2500,
      type: "races"
    },
    {
      id: "first-victory",
      title: "First Victory",
      description: "Win your first race.",
      icon: "🥇",
      target: 1,
      reward: 500,
      type: "wins"
    },
    {
      id: "champion",
      title: "Champion",
      description: "Win 25 races.",
      icon: "👑",
      target: 25,
      reward: 2000,
      type: "wins"
    },
    {
      id: "collector",
      title: "Car Collector",
      description: "Own 5 cars.",
      icon: "🚘",
      target: 5,
      reward: 1000,
      type: "cars"
    },
    {
      id: "super-collector",
      title: "Super Collector",
      description: "Own 15 cars.",
      icon: "🚗",
      target: 15,
      reward: 3500,
      type: "cars"
    },
    {
      id: "explorer",
      title: "Explorer",
      description: "Complete 10 maps.",
      icon: "🗺️",
      target: 10,
      reward: 1000,
      type: "maps"
    },
    {
      id: "world-traveller",
      title: "World Traveller",
      description: "Complete 50 maps.",
      icon: "🌍",
      target: 50,
      reward: 3000,
      type: "maps"
    },
    {
      id: "road-runner",
      title: "Road Runner",
      description: "Drive a total of 100 km.",
      icon: "🛣️",
      target: 100,
      reward: 1500,
      type: "distance"
    },
    {
      id: "long-distance",
      title: "Long Distance",
      description: "Drive a total of 500 km.",
      icon: "🌟",
      target: 500,
      reward: 4000,
      type: "distance"
    },
    {
      id: "level-five",
      title: "Rising Star",
      description: "Reach player level 5.",
      icon: "⭐",
      target: 5,
      reward: 1000,
      type: "level"
    },
    {
      id: "level-ten",
      title: "Legend",
      description: "Reach player level 10.",
      icon: "💎",
      target: 10,
      reward: 3000,
      type: "level"
    },
    {
      id: "upgrade-one",
      title: "Mechanic",
      description: "Upgrade a car part.",
      icon: "🔧",
      target: 1,
      reward: 500,
      type: "upgrades"
    },
    {
      id: "upgrade-master",
      title: "Master Mechanic",
      description: "Complete 20 car upgrades.",
      icon: "⚙️",
      target: 20,
      reward: 2000,
      type: "upgrades"
    },
    {
      id: "daily-player",
      title: "Daily Racer",
      description: "Claim 7 daily rewards.",
      icon: "🎁",
      target: 7,
      reward: 1500,
      type: "daily"
    }
  ];

  const stats = {
    races: 0,
    wins: 0,
    cars: 0,
    maps: 0,
    distance: 0,
    level: 1,
    upgrades: 0,
    daily: 0
  };

  const claimed = new Set();
  const notified = new Set();

  function emit(name, detail = {}) {
    window.dispatchEvent(
      new CustomEvent(`superx:achievement-${name}`, { detail })
    );
  }

  function load() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "{}"
      );

      if (saved.stats) {
        Object.keys(stats).forEach(key => {
          const value = Number(saved.stats[key]);

          if (Number.isFinite(value) && value >= 0) {
            stats[key] = value;
          }
        });
      }

      if (Array.isArray(saved.claimed)) {
        saved.claimed.forEach(id => claimed.add(id));
      }

    } catch (error) {
      console.warn("SUPERX: Achievement data could not load.", error);
    }
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          stats,
          claimed: Array.from(claimed)
        })
      );

      return true;
    } catch (error) {
      console.warn("SUPERX: Achievement save failed.", error);
      return false;
    }
  }

  function getProgress(definition) {
    return Math.min(
      definition.target,
      Number(stats[definition.type] || 0)
    );
  }

  function isUnlocked(definition) {
    return getProgress(definition) >= definition.target;
  }

  function getAchievement(id) {
    return DEFINITIONS.find(item => item.id === id) || null;
  }

  function checkAchievements() {
    const unlockedNow = [];

    DEFINITIONS.forEach(definition => {
      if (
        isUnlocked(definition) &&
        !claimed.has(definition.id) &&
        !notified.has(definition.id)
      ) {
        notified.add(definition.id);
        unlockedNow.push(definition);

        emit("unlocked", {
          achievement: { ...definition }
        });
      }
    });

    save();

    return unlockedNow.map(item => ({ ...item }));
  }

  function updateStat(type, amount = 1) {
    if (!Object.prototype.hasOwnProperty.call(stats, type)) {
      return false;
    }

    const value = Number(amount);

    if (!Number.isFinite(value) || value <= 0) {
      return false;
    }

    stats[type] += value;

    save();
    checkAchievements();

    emit("progress", {
      type,
      value: stats[type]
    });

    return true;
  }

  function setStat(type, value) {
    if (!Object.prototype.hasOwnProperty.call(stats, type)) {
      return false;
    }

    const number = Number(value);

    if (!Number.isFinite(number) || number < 0) {
      return false;
    }

    stats[type] = number;

    save();
    checkAchievements();

    return true;
  }

  function claim(id) {
    const definition = getAchievement(id);

    if (!definition) {
      return {
        success: false,
        message: "Achievement not found."
      };
    }

    if (!isUnlocked(definition)) {
      return {
        success: false,
        message: "Achievement is not completed yet."
      };
    }

    if (claimed.has(id)) {
      return {
        success: false,
        message: "Reward already claimed."
      };
    }

    let rewardAdded = false;

    if (typeof SX.addCoins === "function") {
      rewardAdded = SX.addCoins(definition.reward) !== false;
    }

    if (!rewardAdded) {
      return {
        success: false,
        message: "Unable to add reward coins."
      };
    }

    claimed.add(id);
    save();

    emit("claimed", {
      id,
      reward: definition.reward
    });

    return {
      success: true,
      reward: definition.reward
    };
  }

  function claimAll() {
    const results = [];

    DEFINITIONS.forEach(definition => {
      if (isUnlocked(definition) && !claimed.has(definition.id)) {
        results.push({
          id: definition.id,
          ...claim(definition.id)
        });
      }
    });

    return results;
  }

  function getAll() {
    return DEFINITIONS.map(definition => ({
      ...definition,
      progress: getProgress(definition),
      unlocked: isUnlocked(definition),
      claimed: claimed.has(definition.id),
      percentage: Math.round(
        (getProgress(definition) / definition.target) * 100
      )
    }));
  }

  function getUnlocked() {
    return getAll().filter(item => item.unlocked);
  }

  function getClaimed() {
    return getAll().filter(item => item.claimed);
  }

  function getSummary() {
    const total = DEFINITIONS.length;
    const unlocked = getUnlocked().length;
    const claimedCount = claimed.size;

    return {
      total,
      unlocked,
      claimed: claimedCount,
      remaining: total - unlocked,
      completion: Math.round((unlocked / total) * 100),
      stats: { ...stats }
    };
  }

  function syncFromGame() {
    if (SX.player) {
      const player = SX.player;

      if (Array.isArray(player.ownedCars)) {
        setStat("cars", player.ownedCars.length);
      }

      if (Number.isFinite(Number(player.level))) {
        setStat("level", Number(player.level));
      }
    }

    if (SX.progress && typeof SX.progress.getStats === "function") {
      const progressStats = SX.progress.getStats() || {};

      if (Number.isFinite(Number(progressStats.racesCompleted))) {
        setStat("races", Number(progressStats.racesCompleted));
      }

      if (Number.isFinite(Number(progressStats.wins))) {
        setStat("wins", Number(progressStats.wins));
      }

      if (Number.isFinite(Number(progressStats.mapsCompleted))) {
        setStat("maps", Number(progressStats.mapsCompleted));
      }

      if (Number.isFinite(Number(progressStats.totalDistance))) {
        setStat("distance", Number(progressStats.totalDistance));
      }
    }
  }

  function bindUI(root = document) {
    root.querySelectorAll("[data-achievement-claim]").forEach(button => {
      if (button.dataset.achievementBound === "true") return;

      button.dataset.achievementBound = "true";

      button.addEventListener("click", () => {
        const result = claim(button.dataset.achievementClaim);

        button.dispatchEvent(
          new CustomEvent("superx:achievement-claim-result", {
            bubbles: true,
            detail: result
          })
        );
      });
    });
  }

  function init(root = document) {
    load();
    syncFromGame();
    bindUI(root);
    checkAchievements();

    emit("initialized", getSummary());

    return getSummary();
  }

  SX.achievements = {
    definitions: DEFINITIONS,
    init,
    updateStat,
    setStat,
    check: checkAchievements,
    claim,
    claimAll,
    getAll,
    getUnlocked,
    getClaimed,
    getSummary,
    syncFromGame
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init(), {
      once: true
    });
  } else {
    init();
  }

})();

/* =========================================================
   SUPERX LEGEND — FILE 33
   END
========================================================= */
                            
