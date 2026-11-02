
/* =========================================================
   SUPERX LEGEND — FILE 36
   FILE: js/challenges.js
   START
========================================================= */

(() => {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_challenges_v1";

  const CHALLENGES = {
    daily: [
      {
        id: "daily_race_1",
        title: "First Race",
        description: "Complete 1 race",
        type: "races",
        target: 1,
        coins: 150,
        xp: 40
      },
      {
        id: "daily_race_3",
        title: "Race Enthusiast",
        description: "Complete 3 races",
        type: "races",
        target: 3,
        coins: 300,
        xp: 80
      },
      {
        id: "daily_distance",
        title: "Road Explorer",
        description: "Drive 10 kilometres",
        type: "distance",
        target: 10,
        coins: 250,
        xp: 60
      },
      {
        id: "daily_coins",
        title: "Coin Collector",
        description: "Earn 500 coins",
        type: "earnedCoins",
        target: 500,
        coins: 200,
        xp: 50
      }
    ],

    weekly: [
      {
        id: "weekly_races",
        title: "Professional Racer",
        description: "Complete 15 races",
        type: "races",
        target: 15,
        coins: 1000,
        xp: 250
      },
      {
        id: "weekly_wins",
        title: "Champion",
        description: "Win 5 races",
        type: "wins",
        target: 5,
        coins: 1500,
        xp: 350
      },
      {
        id: "weekly_distance",
        title: "Long Distance Driver",
        description: "Drive 100 kilometres",
        type: "distance",
        target: 100,
        coins: 1200,
        xp: 300
      },
      {
        id: "weekly_maps",
        title: "World Explorer",
        description: "Complete 10 maps",
        type: "maps",
        target: 10,
        coins: 1000,
        xp: 250
      }
    ]
  };

  let state = {
    dailyDate: "",
    weeklyDate: "",
    dailyProgress: {},
    weeklyProgress: {},
    claimed: []
  };

  let initialized = false;

  function getDateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");

    return `${y}-${m}-${d}`;
  }

  function getWeekKey(date = new Date()) {
    const copy = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    const day = copy.getDay() || 7;

    copy.setDate(copy.getDate() - day + 1);

    return getDateKey(copy);
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
      );
      return true;
    } catch (error) {
      console.warn("SUPERX challenges save failed:", error);
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
        dailyDate: parsed.dailyDate || "",
        weeklyDate: parsed.weeklyDate || "",
        dailyProgress: parsed.dailyProgress || {},
        weeklyProgress: parsed.weeklyProgress || {},
        claimed: Array.isArray(parsed.claimed)
          ? parsed.claimed
          : []
      };
    } catch (error) {
      console.warn("SUPERX challenges load failed:", error);
    }
  }

  function resetPeriods() {
    const today = getDateKey();
    const week = getWeekKey();

    if (state.dailyDate !== today) {
      state.dailyDate = today;
      state.dailyProgress = {};

      state.claimed = state.claimed.filter(
        id => !id.startsWith("daily_")
      );
    }

    if (state.weeklyDate !== week) {
      state.weeklyDate = week;
      state.weeklyProgress = {};

      state.claimed = state.claimed.filter(
        id => !id.startsWith("weekly_")
      );
    }

    save();
  }

  function getList(period) {
    return CHALLENGES[period] || [];
  }

  function getProgressStore(period) {
    return period === "weekly"
      ? state.weeklyProgress
      : state.dailyProgress;
  }

  function getProgress(period, challenge) {
    const store = getProgressStore(period);

    return Math.max(
      0,
      Number(store[challenge.id]) || 0
    );
  }

  function isCompleted(period, challenge) {
    return getProgress(period, challenge) >= challenge.target;
  }

  function isClaimed(challenge) {
    return state.claimed.includes(challenge.id);
  }

  function getChallenge(period, id) {
    return getList(period).find(
      challenge => challenge.id === id
    ) || null;
  }

  function update(type, amount = 1) {
    resetPeriods();

    const safeAmount = Math.max(
      0,
      Number(amount) || 0
    );

    if (!safeAmount) return false;

    let changed = false;

    ["daily", "weekly"].forEach(period => {
      const store = getProgressStore(period);

      getList(period).forEach(challenge => {
        if (challenge.type !== type) return;

        if (isClaimed(challenge)) return;

        const oldValue = getProgress(period, challenge);

        store[challenge.id] = Math.min(
          challenge.target,
          oldValue + safeAmount
        );

        if (store[challenge.id] !== oldValue) {
          changed = true;
        }
      });
    });

    if (changed) {
      save();
      render();
    }

    return changed;
  }

  function addRace(count = 1) {
    return update("races", count);
  }

  function addWin(count = 1) {
    addRace(count);
    return update("wins", count);
  }

  function addDistance(kilometres) {
    return update("distance", kilometres);
  }

  function addCoinsEarned(coins) {
    return update("earnedCoins", coins);
  }

  function addMapComplete(count = 1) {
    return update("maps", count);
  }

  function claim(period, id) {
    resetPeriods();

    const challenge = getChallenge(period, id);

    if (!challenge) {
      return {
        success: false,
        reason: "not_found"
      };
    }

    if (!isCompleted(period, challenge)) {
      return {
        success: false,
        reason: "not_completed"
      };
    }

    if (isClaimed(challenge)) {
      return {
        success: false,
        reason: "already_claimed"
      };
    }

    let coinsAdded = false;

    if (SX.progress?.addCoins) {
      SX.progress.addCoins(
        challenge.coins,
        "challenge_reward"
      );
      coinsAdded = true;
    } else if (SX.addCoins) {
      SX.addCoins(challenge.coins);
      coinsAdded = true;
    }

    if (!coinsAdded) {
      return {
        success: false,
        reason: "coin_system_unavailable"
      };
    }

    if (SX.progress?.addXP) {
      SX.progress.addXP(
        challenge.xp,
        "challenge_reward"
      );
    } else if (SX.addXP) {
      SX.addXP(challenge.xp);
    }

    state.claimed.push(challenge.id);
    save();
    render();

    SX.notifications?.success(
      `${challenge.coins} coins and ${challenge.xp} XP received!`,
      "CHALLENGE REWARD"
    );

    const result = {
      success: true,
      challengeId: challenge.id,
      coins: challenge.coins,
      xp: challenge.xp
    };

    document.dispatchEvent(
      new CustomEvent("sx:challenge-claimed", {
        detail: result
      })
    );

    return result;
  }

  function getChallenges(period) {
    resetPeriods();

    return getList(period).map(challenge => {
      const progress = getProgress(period, challenge);
      const completed = progress >= challenge.target;

      return {
        ...challenge,
        progress,
        completed,
        claimed: isClaimed(challenge),
        percentage: Math.min(
          100,
          Math.round(
            (progress / challenge.target) * 100
          )
        )
      };
    });
  }

  function getSummary() {
    const daily = getChallenges("daily");
    const weekly = getChallenges("weekly");

    return {
      dailyCompleted: daily.filter(c => c.completed).length,
      dailyClaimed: daily.filter(c => c.claimed).length,
      weeklyCompleted: weekly.filter(c => c.completed).length,
      weeklyClaimed: weekly.filter(c => c.claimed).length
    };
  }

  function renderList(period, selector) {
    const root = document.querySelector(selector);

    if (!root) return;

    const challenges = getChallenges(period);

    root.replaceChildren();

    challenges.forEach(challenge => {
      const card = document.createElement("article");
      card.className = "sx-challenge-card";

      const heading = document.createElement("h3");
      heading.textContent = challenge.title;

      const description = document.createElement("p");
      description.textContent = challenge.description;

      const progressText = document.createElement("p");
      progressText.textContent =
        `${challenge.progress} / ${challenge.target}`;

      const progress = document.createElement("progress");
      progress.max = challenge.target;
      progress.value = challenge.progress;

      const reward = document.createElement("p");
      reward.textContent =
        `🪙 ${challenge.coins} coins · ⭐ ${challenge.xp} XP`;

      const button = document.createElement("button");
      button.type = "button";

      if (challenge.claimed) {
        button.textContent = "CLAIMED";
        button.disabled = true;
      } else if (challenge.completed) {
        button.textContent = "CLAIM REWARD";
        button.addEventListener("click", () => {
          claim(period, challenge.id);
        });
      } else {
        button.textContent = "IN PROGRESS";
        button.disabled = true;
      }

      card.append(
        heading,
        description,
        progressText,
        progress,
        reward,
        button
      );

      root.appendChild(card);
    });
  }

  function render() {
    renderList("daily", "[data-challenges-daily]");
    renderList("weekly", "[data-challenges-weekly]");

    const summary = getSummary();

    document.querySelectorAll("[data-challenges-summary]")
      .forEach(element => {
        element.textContent =
          `Daily: ${summary.dailyCompleted}/${CHALLENGES.daily.length} · ` +
          `Weekly: ${summary.weeklyCompleted}/${CHALLENGES.weekly.length}`;
      });
  }

  function bindEvents() {
    document.addEventListener(
      "sx:race-completed",
      event => {
        const data = event.detail || {};

        addRace(1);

        if (data.won === true) {
          update("wins", 1);
        }

        if (Number(data.distance) > 0) {
          addDistance(Number(data.distance));
        }
      }
    );

    document.addEventListener(
      "sx:map-completed",
      () => addMapComplete(1)
    );

    document.addEventListener(
      "sx:coins-earned",
      event => {
        const amount = Number(event.detail?.amount) || 0;
        addCoinsEarned(amount);
      }
    );
  }

  function init() {
    if (initialized) return true;

    load();
    resetPeriods();
    bindEvents();

    initialized = true;
    render();

    return true;
  }

  SX.challenges = {
    init,
    update,
    addRace,
    addWin,
    addDistance,
    addCoinsEarned,
    addMapComplete,
    claim,
    getChallenge,
    getChallenges,
    getSummary,
    render,
    resetPeriods
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
   SUPERX LEGEND — FILE 36
   END
========================================================= */
               
