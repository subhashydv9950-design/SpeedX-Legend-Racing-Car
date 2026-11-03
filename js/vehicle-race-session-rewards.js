/* =========================================================
   SUPERX LEGEND — FILE 111
   FILE: js/vehicle-race-session-rewards.js
   MODULE: Race Session Rewards Tracker
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_race_session_rewards_v2";
  const LEGACY_KEY = "superx_race_session_rewards_v1";
  const MAX_HISTORY = 300;
  const MAX_ID_LENGTH = 120;

  const state = {
    totalCoins: 0,
    totalXP: 0,
    totalBonus: 0,
    rewardsClaimed: 0,
    history: [],
    processedRaceKeys: []
  };

  function number(value) {
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
  }

  function positiveInteger(value) {
    return Math.max(0, Math.min(
      1000000000,
      Math.floor(number(value))
    ));
  }

  function safeText(value, limit) {
    return String(value == null ? "" : value)
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, limit || MAX_ID_LENGTH);
  }

  function createId() {
    return "reward_" + Date.now().toString(36) +
      "_" + Math.random().toString(36).slice(2, 10);
  }

  function normalizeReward(item) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return null;
    }

    const id = safeText(item.id, MAX_ID_LENGTH);

    if (!id) return null;

    return {
      id,
      raceId: safeText(item.raceId, MAX_ID_LENGTH),
      source: safeText(item.source || "race", 40),
      coins: positiveInteger(item.coins),
      xp: positiveInteger(item.xp),
      bonus: positiveInteger(item.bonus),
      createdAt: safeText(item.createdAt, 40) ||
        new Date().toISOString(),
      claimed: item.claimed === true
    };
  }

  function normalizeKeys(value) {
    if (!Array.isArray(value)) return [];

    return Array.from(new Set(
      value.map(item => safeText(item, MAX_ID_LENGTH))
        .filter(Boolean)
    )).slice(-MAX_HISTORY * 2);
  }

  function snapshot() {
    return JSON.stringify(state);
  }

  function restore(raw) {
    try {
      Object.assign(state, JSON.parse(raw));
    } catch (error) {
      console.warn("[SUPERX SessionRewards] Restore failed:", error);
    }
  }

  function applyData(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return false;
    }

    state.totalCoins = positiveInteger(data.totalCoins);
    state.totalXP = positiveInteger(data.totalXP);
    state.totalBonus = positiveInteger(data.totalBonus);
    state.rewardsClaimed = positiveInteger(data.rewardsClaimed);

    const seen = new Set();

    state.history = (Array.isArray(data.history) ? data.history : [])
      .map(normalizeReward)
      .filter(item => {
        if (!item || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .slice(0, MAX_HISTORY);

    state.processedRaceKeys = normalizeKeys(
      data.processedRaceKeys
    );

    // Preserve idempotency for older saved rewards.
    state.history.forEach(item => {
      if (item.raceId) {
        const key = item.raceId + "|" + item.source;

        if (!state.processedRaceKeys.includes(key)) {
          state.processedRaceKeys.push(key);
        }
      }
    });

    state.processedRaceKeys = normalizeKeys(
      state.processedRaceKeys
    );

    return true;
  }

  function load() {
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      let migrated = false;

      if (!raw) {
        raw = localStorage.getItem(LEGACY_KEY);
        migrated = Boolean(raw);
      }

      if (!raw) return;

      const data = JSON.parse(raw);

      if (!applyData(data)) return;

      if (migrated) save();

    } catch (error) {
      console.warn("[SUPERX SessionRewards] Load failed:", error);
    }
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 2,
          totalCoins: state.totalCoins,
          totalXP: state.totalXP,
          totalBonus: state.totalBonus,
          rewardsClaimed: state.rewardsClaimed,
          history: state.history,
          processedRaceKeys: state.processedRaceKeys
        })
      );

      return true;
    } catch (error) {
      console.warn("[SUPERX SessionRewards] Save failed:", error);
      return false;
    }
  }

  function createReward(data) {
    const input = data && typeof data === "object" &&
      !Array.isArray(data) ? data : {};

    const coins = positiveInteger(input.coins);
    const xp = positiveInteger(input.xp);
    const bonus = positiveInteger(input.bonus);

    if (coins + xp + bonus <= 0) {
      return {
        success: false,
        error: "Reward must contain a positive amount."
      };
    }

    return {
      success: true,
      reward: {
        id: safeText(input.id, MAX_ID_LENGTH) || createId(),
        raceId: safeText(input.raceId, MAX_ID_LENGTH),
        source: safeText(input.source || "race", 40),
        coins,
        xp,
        bonus,
        createdAt: new Date().toISOString(),
        claimed: false
      }
    };
  }

  function emitClaimed(reward) {
    try {
      if (typeof window.CustomEvent !== "function") return;

      window.dispatchEvent(new CustomEvent(
        "sx:session-reward-claimed",
        {
          detail: {
            id: reward.id,
            raceId: reward.raceId,
            coins: reward.coins,
            xp: reward.xp,
            bonus: reward.bonus
          }
        }
      ));
    } catch (error) {
      console.warn("[SUPERX SessionRewards] Event failed:", error);
    }
  }

  function claimReward(data) {
    const result = createReward(data || {});

    if (!result.success) return result;

    const reward = result.reward;

    if (state.history.some(item => item.id === reward.id)) {
      return {
        success: false,
        error: "Duplicate reward ID detected."
      };
    }

    const raceKey = reward.raceId
      ? reward.raceId + "|" + reward.source
      : "";

    if (
      raceKey &&
      state.processedRaceKeys.includes(raceKey)
    ) {
      return {
        success: false,
        error: "Reward for this race and source was already claimed."
      };
    }

    const previous = snapshot();

    reward.claimed = true;

    state.totalCoins += reward.coins;
    state.totalXP += reward.xp;
    state.totalBonus += reward.bonus;
    state.rewardsClaimed += 1;

    state.history.unshift(reward);
    state.history = state.history.slice(0, MAX_HISTORY);

    if (raceKey) {
      state.processedRaceKeys.push(raceKey);
      state.processedRaceKeys = normalizeKeys(
        state.processedRaceKeys
      );
    }

    if (!save()) {
      restore(previous);

      return {
        success: false,
        error: "Could not save reward."
      };
    }

    emitClaimed(reward);

    return {
      success: true,
      reward: { ...reward }
    };
  }

  function getHistory(options) {
    const settings = options || {};

    const limit = Math.max(
      1,
      Math.min(
        MAX_HISTORY,
        Math.floor(number(settings.limit) || MAX_HISTORY)
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
    const key = safeText(id, MAX_ID_LENGTH);

    const reward = state.history.find(
      item => item.id === key
    );

    return reward ? { ...reward } : null;
  }

  function getRewardsByRace(raceId) {
    const id = safeText(raceId, MAX_ID_LENGTH);

    return state.history
      .filter(item => item.raceId === id)
      .map(item => ({ ...item }));
  }

  function clearHistory() {
    const previous = snapshot();

    state.history = [];
    state.totalCoins = 0;
    state.totalXP = 0;
    state.totalBonus = 0;
    state.rewardsClaimed = 0;
    state.processedRaceKeys = [];

    if (!save()) {
      restore(previous);
      return false;
    }

    return true;
  }

  function exportData() {
    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      data: JSON.parse(snapshot())
    };
  }

  function importData(input, options) {
    try {
      const data = typeof input === "string"
        ? JSON.parse(input)
        : input;

      if (!data || typeof data !== "object" || Array.isArray(data)) {
        return {
          success: false,
          error: "Invalid import data."
        };
      }

      const incoming = data.data || data;
      const previous = snapshot();

      if (!applyData(incoming)) {
        restore(previous);

        return {
          success: false,
          error: "Invalid reward data."
        };
      }

      if (options && options.merge === true) {
        const imported = JSON.parse(snapshot());
        restore(previous);

        const knownIds = new Set(
          state.history.map(item => item.id)
        );

        imported.history.forEach(item => {
          if (knownIds.has(item.id)) return;
          state.history.push(item);
          knownIds.add(item.id);
        });

        state.history = state.history.slice(0, MAX_HISTORY);

        state.totalCoins = Math.max(
          state.totalCoins,
          imported.totalCoins
        );

        state.totalXP = Math.max(
          state.totalXP,
          imported.totalXP
        );

        state.totalBonus = Math.max(
          state.totalBonus,
          imported.totalBonus
        );

        state.rewardsClaimed = Math.max(
          state.rewardsClaimed,
          imported.rewardsClaimed
        );

        state.processedRaceKeys = normalizeKeys(
          state.processedRaceKeys.concat(
            imported.processedRaceKeys
          )
        );
      }

      if (!save()) {
        restore(previous);

        return {
          success: false,
          error: "Could not save imported rewards."
        };
      }

      return {
        success: true,
        summary: getSummary()
      };

    } catch (error) {
      return {
        success: false,
        error: "Reward import failed."
      };
    }
  }

  load();

  SX.vehicleRaceSessionRewards = {
    claimReward,
    getHistory,
    getSummary,
    getReward,
    getRewardsByRace,
    clearHistory,
    exportData,
    importData
  };

  console.info("[SUPERX] Race Session Rewards loaded.");

})(window);

/* ======================= END FILE 111 ======================= */

