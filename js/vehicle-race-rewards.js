
/* =========================================================
   SUPERX LEGEND — FILE 100
   FILE: js/vehicle-race-rewards.js
   START: VEHICLE RACE REWARDS SYSTEM
   ========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_vehicle_race_rewards_v1";
  const MAX_HISTORY = 100;

  const POSITION_REWARDS = {
    1: { coins: 500, xp: 250, title: "1st Place" },
    2: { coins: 350, xp: 180, title: "2nd Place" },
    3: { coins: 250, xp: 130, title: "3rd Place" },
    4: { coins: 180, xp: 100, title: "4th Place" },
    5: { coins: 140, xp: 80, title: "5th Place" }
  };

  const DEFAULT_REWARD = {
    coins: 75,
    xp: 40,
    title: "Race Completed"
  };

  let history = [];
  let claimedRaceIds = [];

  function number(value, fallback) {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
  }

  function safeId(value) {
    return String(value || "")
      .trim()
      .slice(0, 100);
  }

  function load() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "{}"
      );

      history = Array.isArray(saved.history)
        ? saved.history.slice(-MAX_HISTORY)
        : [];

      claimedRaceIds = Array.isArray(saved.claimedRaceIds)
        ? saved.claimedRaceIds.slice(-MAX_HISTORY)
        : [];

    } catch (error) {
      history = [];
      claimedRaceIds = [];
    }

    return true;
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          history: history.slice(-MAX_HISTORY),
          claimedRaceIds: claimedRaceIds.slice(-MAX_HISTORY)
        })
      );

      return true;
    } catch (error) {
      console.warn(
        "[SUPERX] Race reward save failed:",
        error
      );

      return false;
    }
  }

  function getPositionReward(position) {
    const place = Math.max(
      1,
      Math.floor(number(position, 0))
    );

    return {
      ...(POSITION_REWARDS[place] || DEFAULT_REWARD)
    };
  }

  function calculate(options) {
    const data = options || {};

    const position = Math.max(
      1,
      Math.floor(number(data.position, 99))
    );

    const reward = getPositionReward(position);

    const cleanLaps = Math.max(
      0,
      Math.floor(number(data.completedLaps, 0))
    );

    const perfectLap = data.perfectLap === true;
    const cleanRace = data.cleanRace === true;
    const difficulty = String(
      data.difficulty || "normal"
    ).toLowerCase();

    const difficultyMultiplier = {
      easy: 0.8,
      normal: 1,
      hard: 1.25,
      expert: 1.5
    };

    const multiplier =
      difficultyMultiplier[difficulty] || 1;

    const lapBonus = cleanLaps * 10;
    const perfectBonus = perfectLap ? 100 : 0;
    const cleanBonus = cleanRace ? 75 : 0;

    const baseCoins = Math.floor(
      reward.coins * multiplier
    );

    const baseXP = Math.floor(
      reward.xp * multiplier
    );

    return {
      position,
      title: reward.title,
      difficulty,
      multiplier,
      baseCoins,
      baseXP,
      lapBonus,
      perfectBonus,
      cleanBonus,
      totalCoins:
        baseCoins +
        lapBonus +
        perfectBonus +
        cleanBonus,
      totalXP:
        baseXP +
        Math.floor(lapBonus / 2) +
        (perfectLap ? 50 : 0),
      completedLaps: cleanLaps
    };
  }

  function claim(options) {
    const data = options || {};

    const raceId = safeId(data.raceId);

    if (!raceId) {
      return {
        success: false,
        message: "A valid race ID is required."
      };
    }

    if (claimedRaceIds.includes(raceId)) {
      return {
        success: false,
        message: "Rewards already claimed for this race."
      };
    }

    const reward = calculate(data);

    if (
      !SX.addCoins ||
      !SX.addXP
    ) {
      return {
        success: false,
        message: "Player reward system is unavailable."
      };
    }

    const coinsAdded = SX.addCoins(reward.totalCoins);
    const xpAdded = SX.addXP(reward.totalXP);

    if (coinsAdded === false || xpAdded === false) {
      return {
        success: false,
        message: "Could not apply race rewards."
      };
    }

    const record = {
      raceId,
      ...reward,
      claimedAt: Date.now()
    };

    claimedRaceIds.push(raceId);
    history.push(record);

    if (history.length > MAX_HISTORY) {
      history.shift();
    }

    if (claimedRaceIds.length > MAX_HISTORY) {
      claimedRaceIds.shift();
    }

    save();

    window.dispatchEvent(
      new CustomEvent("sx:race-rewards-claimed", {
        detail: { ...record }
      })
    );

    return {
      success: true,
      reward: { ...record }
    };
  }

  function getHistory(limit) {
    const count = Math.max(
      1,
      Math.min(
        MAX_HISTORY,
        Math.floor(number(limit, 20))
      )
    );

    return history
      .slice(-count)
      .reverse()
      .map(item => ({ ...item }));
  }

  function getTotals() {
    return history.reduce(
      (totals, item) => {
        totals.coins += number(item.totalCoins, 0);
        totals.xp += number(item.totalXP, 0);
        totals.races++;
        return totals;
      },
      {
        coins: 0,
        xp: 0,
        races: 0
      }
    );
  }

  function hasClaimed(raceId) {
    return claimedRaceIds.includes(
      safeId(raceId)
    );
  }

  function clearHistory() {
    history = [];
    claimedRaceIds = [];
    save();

    window.dispatchEvent(
      new CustomEvent("sx:race-rewards-history-cleared")
    );

    return true;
  }

  load();

  SX.vehicleRaceRewards = {
    calculate,
    claim,
    getPositionReward,
    getHistory,
    getTotals,
    hasClaimed,
    clearHistory,
    reload: load
  };

})();

/* =========================================================
   END: VEHICLE RACE REWARDS SYSTEM — FILE 100
   ========================================================= */
