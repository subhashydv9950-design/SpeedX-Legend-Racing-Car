
/* =========================================================
   SUPERX LEGEND — FILE 26
   FILE: js/progress.js
   START
========================================================= */

(function () {
  "use strict";

  window.SUPERX = window.SUPERX || {};
  const SX = window.SUPERX;

  const STORAGE_KEY = "superx_progress_v1";

  const DEFAULT_PROGRESS = {
    totalRaces: 0,
    completedRaces: 0,
    totalDistance: 0,
    totalRewards: 0,
    totalXP: 0,
    bestTime: null,
    dailyRewardDate: "",
    dailyRewardStreak: 0,
    lastRaceDate: "",
    worldCompletions: {},
    achievements: []
  };

  const DAILY_REWARDS = [
    { day: 1, coins: 250, xp: 50 },
    { day: 2, coins: 350, xp: 75 },
    { day: 3, coins: 500, xp: 100 },
    { day: 4, coins: 650, xp: 125 },
    { day: 5, coins: 800, xp: 150 },
    { day: 6, coins: 1000, xp: 175 },
    { day: 7, coins: 1500, xp: 300 }
  ];

  let progress = loadProgress();

  function loadProgress() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        return structuredClone(DEFAULT_PROGRESS);
      }

      const parsed = JSON.parse(saved);

      return Object.assign(
        structuredClone(DEFAULT_PROGRESS),
        parsed
      );
    } catch (error) {
      console.warn("SUPERX Progress: Could not load saved data.");
      return structuredClone(DEFAULT_PROGRESS);
    }
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(progress)
      );
      return true;
    } catch (error) {
      console.warn("SUPERX Progress: Could not save data.");
      return false;
    }
  }

  function getLevelFromXP(xp) {
    let level = 1;
    let remainingXP = Math.max(0, Number(xp) || 0);
    let requiredXP = 500;

    while (remainingXP >= requiredXP && level < 100) {
      remainingXP -= requiredXP;
      level++;
      requiredXP = 500 + (level - 1) * 250;
    }

    return {
      level: level,
      currentXP: remainingXP,
      requiredXP: requiredXP,
      percentage: Math.min(
        100,
        (remainingXP / requiredXP) * 100
      )
    };
  }

  function addXP(amount) {
    const value = Math.max(0, Math.floor(Number(amount) || 0));

    if (!value) return getLevel();

    const previousLevel = getLevel().level;

    progress.totalXP += value;
    save();

    if (typeof SX.addXP === "function") {
      SX.addXP(value);
    }

    const currentLevel = getLevel().level;

    if (currentLevel > previousLevel) {
      document.dispatchEvent(
        new CustomEvent("superx:levelUp", {
          detail: {
            previousLevel: previousLevel,
            level: currentLevel
          }
        })
      );
    }

    document.dispatchEvent(
      new CustomEvent("superx:xpChanged", {
        detail: {
          amount: value,
          totalXP: progress.totalXP,
          level: currentLevel
        }
      })
    );

    return getLevel();
  }

  function addCoins(amount) {
    const value = Math.max(0, Math.floor(Number(amount) || 0));

    if (!value) return false;

    if (typeof SX.addCoins === "function") {
      SX.addCoins(value);
    } else {
      console.warn("SUPERX Progress: Coin storage is unavailable.");
      return false;
    }

    progress.totalRewards += value;
    save();

    document.dispatchEvent(
      new CustomEvent("superx:coinsEarned", {
        detail: { amount: value }
      })
    );

    return true;
  }

  function getLevel() {
    return getLevelFromXP(progress.totalXP);
  }

  function recordRaceStart() {
    progress.totalRaces++;
    progress.lastRaceDate = new Date().toISOString();
    save();
  }

  function recordRaceComplete(data) {
    data = data || {};

    const distance = Math.max(
      0,
      Number(data.distance) || 0
    );

    const time = Math.max(
      0,
      Number(data.time) || 0
    );

    const reward = Math.max(
      0,
      Math.floor(Number(data.reward) || 0)
    );

    const xp = Math.max(
      0,
      Math.floor(Number(data.xp) || 0)
    );

    progress.completedRaces++;
    progress.totalDistance += distance;

    if (
      time > 0 &&
      (progress.bestTime === null || time < progress.bestTime)
    ) {
      progress.bestTime = time;
    }

    save();

    if (reward > 0) addCoins(reward);
    if (xp > 0) addXP(xp);

    document.dispatchEvent(
      new CustomEvent("superx:progressUpdated", {
        detail: getStats()
      })
    );

    return getStats();
  }

  function getTodayKey() {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return year + "-" + month + "-" + day;
  }

  function claimDailyReward() {
    const today = getTodayKey();

    if (progress.dailyRewardDate === today) {
      return {
        success: false,
        message: "Today's reward has already been claimed."
      };
    }

    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);

    const yesterday =
      yesterdayDate.getFullYear() + "-" +
      String(yesterdayDate.getMonth() + 1).padStart(2, "0") + "-" +
      String(yesterdayDate.getDate()).padStart(2, "0");

    if (progress.dailyRewardDate === yesterday) {
      progress.dailyRewardStreak++;
    } else {
      progress.dailyRewardStreak = 1;
    }

    const rewardIndex =
      (progress.dailyRewardStreak - 1) % DAILY_REWARDS.length;

    const reward = DAILY_REWARDS[rewardIndex];

    progress.dailyRewardDate = today;
    save();

    addCoins(reward.coins);
    addXP(reward.xp);

    document.dispatchEvent(
      new CustomEvent("superx:dailyRewardClaimed", {
        detail: {
          day: reward.day,
          coins: reward.coins,
          xp: reward.xp,
          streak: progress.dailyRewardStreak
        }
      })
    );

    return {
      success: true,
      day: reward.day,
      coins: reward.coins,
      xp: reward.xp,
      streak: progress.dailyRewardStreak
    };
  }

  function getDailyRewardState() {
    const today = getTodayKey();
    const claimed = progress.dailyRewardDate === today;

    const nextDay = claimed
      ? progress.dailyRewardStreak + 1
      : progress.dailyRewardDate
        ? progress.dailyRewardStreak + 1
        : 1;

    const rewardIndex = (nextDay - 1) % DAILY_REWARDS.length;

    return {
      claimedToday: claimed,
      streak: progress.dailyRewardStreak,
      nextReward: DAILY_REWARDS[rewardIndex],
      rewards: DAILY_REWARDS.map(function (item) {
        return Object.assign({}, item);
      })
    };
  }

  function recordWorldCompletion(worldId) {
    if (!worldId) return false;

    progress.worldCompletions[worldId] =
      (progress.worldCompletions[worldId] || 0) + 1;

    save();

    document.dispatchEvent(
      new CustomEvent("superx:worldCompleted", {
        detail: {
          worldId: worldId,
          completions: progress.worldCompletions[worldId]
        }
      })
    );

    return true;
  }

  function unlockAchievement(id) {
    if (!id || progress.achievements.includes(id)) {
      return false;
    }

    progress.achievements.push(id);
    save();

    document.dispatchEvent(
      new CustomEvent("superx:achievementUnlocked", {
        detail: { id: id }
      })
    );

    return true;
  }

  function getStats() {
    return {
      totalRaces: progress.totalRaces,
      completedRaces: progress.completedRaces,
      totalDistance: progress.totalDistance,
      totalRewards: progress.totalRewards,
      totalXP: progress.totalXP,
      bestTime: progress.bestTime,
      level: getLevel(),
      dailyReward: getDailyRewardState(),
      worldCompletions: Object.assign(
        {},
        progress.worldCompletions
      ),
      achievements: progress.achievements.slice()
    };
  }

  function reset() {
    progress = structuredClone(DEFAULT_PROGRESS);
    save();

    document.dispatchEvent(
      new CustomEvent("superx:progressReset")
    );

    return getStats();
  }

  SX.progress = {
    addXP: addXP,
    addCoins: addCoins,
    getLevel: getLevel,
    recordRaceStart: recordRaceStart,
    recordRaceComplete: recordRaceComplete,
    claimDailyReward: claimDailyReward,
    getDailyRewardState: getDailyRewardState,
    recordWorldCompletion: recordWorldCompletion,
    unlockAchievement: unlockAchievement,
    getStats: getStats,
    save: save,
    reset: reset
  };

})();

/* =========================================================
   SUPERX LEGEND — FILE 26
   END
========================================================= */
  
