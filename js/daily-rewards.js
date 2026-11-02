
/* =========================================================
   SUPERX LEGEND — FILE 35
   FILE: js/daily-rewards.js
   START
========================================================= */

(() => {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_daily_rewards_v1";

  const REWARDS = [
    { day: 1, coins: 250, xp: 50 },
    { day: 2, coins: 350, xp: 70 },
    { day: 3, coins: 450, xp: 90 },
    { day: 4, coins: 600, xp: 120 },
    { day: 5, coins: 750, xp: 150 },
    { day: 6, coins: 1000, xp: 200 },
    { day: 7, coins: 2000, xp: 400 }
  ];

  let state = {
    streak: 0,
    lastClaimDate: "",
    totalClaims: 0,
    totalCoins: 0,
    totalXP: 0
  };

  let initialized = false;

  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function dateDifference(first, second) {
    if (!first || !second) return Infinity;

    const a = new Date(`${first}T12:00:00`);
    const b = new Date(`${second}T12:00:00`);

    if (
      Number.isNaN(a.getTime()) ||
      Number.isNaN(b.getTime())
    ) {
      return Infinity;
    }

    return Math.round((b - a) / 86400000);
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
      );

      return true;
    } catch (error) {
      console.warn("SUPERX daily rewards save failed:", error);
      return false;
    }
  }

  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) return;

      const parsed = JSON.parse(saved);

      if (!parsed || typeof parsed !== "object") return;

      state = {
        streak: Math.max(0, Number(parsed.streak) || 0),
        lastClaimDate:
          typeof parsed.lastClaimDate === "string"
            ? parsed.lastClaimDate
            : "",
        totalClaims: Math.max(
          0,
          Number(parsed.totalClaims) || 0
        ),
        totalCoins: Math.max(
          0,
          Number(parsed.totalCoins) || 0
        ),
        totalXP: Math.max(
          0,
          Number(parsed.totalXP) || 0
        )
      };
    } catch (error) {
      console.warn("SUPERX daily rewards load failed:", error);
    }
  }

  function getCurrentDay() {
    if (!state.lastClaimDate) return 1;

    const difference = dateDifference(
      state.lastClaimDate,
      localDateKey()
    );

    if (difference === 0) {
      return ((state.streak - 1) % 7) + 1;
    }

    if (difference === 1) {
      return (state.streak % 7) + 1;
    }

    return 1;
  }

  function hasClaimedToday() {
    return state.lastClaimDate === localDateKey();
  }

  function getReward(day) {
    const safeDay = Math.min(
      7,
      Math.max(1, Math.floor(Number(day) || 1))
    );

    return { ...REWARDS[safeDay - 1] };
  }

  function addPlayerCoins(amount) {
    if (SX.progress?.addCoins) {
      SX.progress.addCoins(amount, "daily_reward");
      return true;
    }

    if (SX.addCoins) {
      SX.addCoins(amount);
      return true;
    }

    console.warn("SUPERX coin system is not available.");
    return false;
  }

  function addPlayerXP(amount) {
    if (SX.progress?.addXP) {
      SX.progress.addXP(amount, "daily_reward");
      return true;
    }

    if (SX.addXP) {
      SX.addXP(amount);
      return true;
    }

    console.warn("SUPERX XP system is not available.");
    return false;
  }

  function claim() {
    if (hasClaimedToday()) {
      SX.notifications?.warning(
        "Come back tomorrow for your next reward.",
        "ALREADY CLAIMED"
      );

      return {
        success: false,
        reason: "already_claimed"
      };
    }

    const today = localDateKey();

    const difference = dateDifference(
      state.lastClaimDate,
      today
    );

    if (difference === 1) {
      state.streak += 1;
    } else {
      state.streak = 1;
    }

    const day = ((state.streak - 1) % 7) + 1;
    const reward = getReward(day);

    const coinsAdded = addPlayerCoins(reward.coins);

    if (!coinsAdded) {
      state.streak = Math.max(0, state.streak - 1);

      return {
        success: false,
        reason: "coin_system_unavailable"
      };
    }

    const xpAdded = addPlayerXP(reward.xp);

    if (!xpAdded) {
      console.warn("Daily reward XP could not be added.");
    }

    state.lastClaimDate = today;
    state.totalClaims += 1;
    state.totalCoins += reward.coins;
    state.totalXP += xpAdded ? reward.xp : 0;

    save();

    const result = {
      success: true,
      day,
      streak: state.streak,
      coins: reward.coins,
      xp: xpAdded ? reward.xp : 0,
      date: today
    };

    SX.notifications?.reward(
      reward.coins,
      `DAY ${day} REWARD`
    );

    document.dispatchEvent(
      new CustomEvent("sx:daily-reward-claimed", {
        detail: result
      })
    );

    return result;
  }

  function getState() {
    return {
      ...state,
      currentDay: getCurrentDay(),
      claimedToday: hasClaimedToday(),
      nextClaimAvailable: !hasClaimedToday()
    };
  }

  function getRewards() {
    return REWARDS.map(reward => ({
      ...reward,
      claimed: reward.day <= (
        state.streak % 7 || (state.streak > 0 ? 7 : 0)
      ) && state.lastClaimDate !== ""
    }));
  }

  function getNextReward() {
    return getReward(getCurrentDay());
  }

  function reset() {
    state = {
      streak: 0,
      lastClaimDate: "",
      totalClaims: 0,
      totalCoins: 0,
      totalXP: 0
    };

    save();
    render();

    return true;
  }

  function render() {
    const currentDay = getCurrentDay();
    const claimed = hasClaimedToday();

    document.querySelectorAll("[data-daily-reward-day]")
      .forEach(element => {
        const day = Number(
          element.dataset.dailyRewardDay
        );

        const reward = getReward(day);

        element.textContent =
          `DAY ${day} · ${reward.coins} COINS · ${reward.xp} XP`;

        element.classList.toggle(
          "is-claimed",
          day < currentDay || (claimed && day === currentDay)
        );

        element.classList.toggle(
          "is-current",
          day === currentDay
        );
      });

    document.querySelectorAll("[data-daily-reward-claim]")
      .forEach(button => {
        button.disabled = claimed;

        button.textContent = claimed
          ? "CLAIMED TODAY"
          : "CLAIM DAILY REWARD";
      });

    document.querySelectorAll("[data-daily-streak]")
      .forEach(element => {
        element.textContent = String(state.streak);
      });

    document.querySelectorAll("[data-daily-current-day]")
      .forEach(element => {
        element.textContent = String(currentDay);
      });
  }

  function bindEvents() {
    document.addEventListener("click", event => {
      const button = event.target.closest(
        "[data-daily-reward-claim]"
      );

      if (!button) return;

      const result = claim();

      if (result.success) {
        render();
      }
    });
  }

  function init() {
    if (initialized) return true;

    load();
    bindEvents();
    initialized = true;

    render();

    return true;
  }

  SX.dailyRewards = {
    init,
    claim,
    getState,
    getRewards,
    getReward,
    getNextReward,
    hasClaimedToday,
    render,
    reset
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {
      once: true
    });
  } else {
    init();
  }

})();

/* =========================================================
   SUPERX LEGEND — FILE 35
   END
========================================================= */
