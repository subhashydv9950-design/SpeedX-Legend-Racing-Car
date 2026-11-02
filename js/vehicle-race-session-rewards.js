
/* =========================================================
   SUPERX LEGEND — FILE 111
   FILE: js/vehicle-race-session-rewards.js
   MODULE: Race Session Rewards Tracker
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_race_session_rewards_v1";
  const MAX_HISTORY = 300;

  const state = {
    totalCoins: 0,
    totalXP: 0,
    totalBonus: 0,
    rewardsClaimed: 0,
    history: []
  };

  function number(value) {
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
  }

  function positiveInteger(value) {
    return Math.max(0, Math.floor(number(value)));
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) return;

      const data = JSON.parse(raw);

      if (!data || typeof data !== "object") return;

      state.totalCoins = positiveInteger(data.totalCoins);
      state.totalXP = positiveInteger(data.totalXP);
      state.totalBonus = positiveInteger(data.totalBonus);
      state.rewardsClaimed = positiveInteger(data.rewardsClaimed);

      state.history = Array.isArray(data.history)
        ? data.history.slice(0, MAX_HISTORY)
        : [];

    } catch (error) {
      console.warn("[SUPERX SessionRewards] Load failed:", error);
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
      console.warn("[SUPERX SessionRewards] Save failed:", error);
      return false;
    }
  }

  function createReward(data = {}) {
    const coins = positiveInteger(data.coins);
    const xp = positiveInteger(data.xp);
    const bonus = positiveInteger(data.bonus);

    if (coins + xp + bonus <= 0) {
      return {
        success: false,
        error: "Reward must contain a positive amount."
      };
    }

    const reward = {
      id: "reward_" + Date.now().toString(36) +
        "_" + Math.random().toString(36).slice(2, 7),

      raceId: String(data.raceId || "").slice(0, 80),
      source: String(data.source || "race").slice(0, 40),

      coins,
      xp,
      bonus,

      createdAt: new Date().toISOString(),
      claimed: false
    };

    return {
      success: true,
      reward
    };
  }

  function claimReward(data = {}) {
    const result = createReward(data);

    if (!result.success) return result;

    const reward = result.reward;

    // Claim once: reject duplicate IDs.
    if (state.history.some(item => item.id === reward.id)) {
      return {
        success: false,
        error: "Duplicate reward detected."
      };
    }

    reward.claimed = true;

    state.totalCoins += reward.coins;
    state.totalXP += reward.xp;
    state.totalBonus += reward.bonus;
    state.rewardsClaimed += 1;

    state.history.unshift(reward);
    state.history = state.history.slice(0, MAX_HISTORY);

    save();

    window.dispatchEvent(new CustomEvent(
      "sx:session-reward-claimed",
      {
        detail: {
          id: reward.id,
          coins: reward.coins,
          xp: reward.xp,
          bonus: reward.bonus
        }
      }
    ));

    return {
      success: true,
      reward: { ...reward }
    };
  }

  function getHistory(options = {}) {
    const limit = Math.max(
      1,
      Math.min(
        MAX_HISTORY,
        Math.floor(number(options.limit) || MAX_HISTORY)
      )
    );

    return state.history
      .slice(0, limit)
      .map(item => ({ ...item }));
  }

  function getSummary() {
    return {
      totalCoins: state.totalCoins,
      totalXP: state.totalXP,
      totalBonus: state.totalBonus,
      rewardsClaimed: state.rewardsClaimed,
      historyCount: state.history.length
    };
  }

  function getReward(id) {
    const reward = state.history.find(
      item => item.id === id
    );

    return reward ? { ...reward } : null;
  }

  function getRewardsByRace(raceId) {
    const id = String(raceId || "");

    return state.history
      .filter(item => item.raceId === id)
      .map(item => ({ ...item }));
  }

  function clearHistory() {
    state.history = [];
    state.totalCoins = 0;
    state.totalXP = 0;
    state.totalBonus = 0;
    state.rewardsClaimed = 0;

    save();

    return true;
  }

  load();

  SX.vehicleRaceSessionRewards = {
    claimReward,
    getHistory,
    getSummary,
    getReward,
    getRewardsByRace,
    clearHistory
  };

  console.info("[SUPERX] Race Session Rewards loaded.");

})(window);

/* ======================= END FILE 111 ======================= */
