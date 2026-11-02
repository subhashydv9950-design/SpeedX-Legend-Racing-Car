
/* =========================================================
   SUPERX LEGEND — FILE 38
   FILE: js/quests.js
   START
========================================================= */

(() => {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_quests_v1";

  const QUESTS = [
    {
      id: "q_first_race",
      title: "First Steps",
      description: "Complete your first race.",
      category: "RACING",
      type: "races",
      target: 1,
      coins: 300,
      xp: 100
    },
    {
      id: "q_five_races",
      title: "Speed Addict",
      description: "Complete 5 races.",
      category: "RACING",
      type: "races",
      target: 5,
      coins: 600,
      xp: 180
    },
    {
      id: "q_three_wins",
      title: "Rising Champion",
      description: "Win 3 races.",
      category: "RACING",
      type: "wins",
      target: 3,
      coins: 900,
      xp: 250
    },
    {
      id: "q_distance",
      title: "Road Traveller",
      description: "Drive a total of 25 kilometres.",
      category: "EXPLORATION",
      type: "distance",
      target: 25,
      coins: 700,
      xp: 200
    },
    {
      id: "q_maps",
      title: "Map Explorer",
      description: "Complete 5 maps.",
      category: "EXPLORATION",
      type: "maps",
      target: 5,
      coins: 800,
      xp: 220
    },
    {
      id: "q_car_collection",
      title: "Collector",
      description: "Own 5 cars.",
      category: "COLLECTION",
      type: "cars",
      target: 5,
      coins: 1200,
      xp: 300
    },
    {
      id: "q_upgrade",
      title: "Mechanic",
      description: "Purchase 5 car upgrades.",
      category: "GARAGE",
      type: "upgrades",
      target: 5,
      coins: 800,
      xp: 200
    },
    {
      id: "q_level",
      title: "Experienced Driver",
      description: "Reach player level 10.",
      category: "PROGRESSION",
      type: "level",
      target: 10,
      coins: 1500,
      xp: 400
    }
  ];

  let state = {
    progress: {},
    claimed: []
  };

  let initialized = false;

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
      );

      return true;
    } catch (error) {
      console.warn("SUPERX quests save failed:", error);
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
        progress:
          parsed.progress &&
          typeof parsed.progress === "object"
            ? parsed.progress
            : {},

        claimed: Array.isArray(parsed.claimed)
          ? parsed.claimed
          : []
      };
    } catch (error) {
      console.warn("SUPERX quests load failed:", error);
    }
  }

  function getQuest(id) {
    return QUESTS.find(quest => quest.id === id) || null;
  }

  function getProgress(quest) {
    return Math.max(
      0,
      Number(state.progress[quest.id]) || 0
    );
  }

  function isClaimed(id) {
    return state.claimed.includes(id);
  }

  function update(type, amount = 1) {
    const safeAmount = Math.max(
      0,
      Number(amount) || 0
    );

    if (!safeAmount) return false;

    let changed = false;

    QUESTS.forEach(quest => {
      if (quest.type !== type) return;
      if (isClaimed(quest.id)) return;

      const previous = getProgress(quest);

      state.progress[quest.id] = Math.min(
        quest.target,
        previous + safeAmount
      );

      if (previous !== state.progress[quest.id]) {
        changed = true;
      }
    });

    if (changed) {
      save();
      render();
    }

    return changed;
  }

  function setProgress(type, value) {
    const safeValue = Math.max(
      0,
      Number(value) || 0
    );

    let changed = false;

    QUESTS.forEach(quest => {
      if (quest.type !== type) return;
      if (isClaimed(quest.id)) return;

      const nextValue = Math.min(
        quest.target,
        safeValue
      );

      if (getProgress(quest) !== nextValue) {
        state.progress[quest.id] = nextValue;
        changed = true;
      }
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

  function addMap(count = 1) {
    return update("maps", count);
  }

  function addCar(count = 1) {
    return update("cars", count);
  }

  function addUpgrade(count = 1) {
    return update("upgrades", count);
  }

  function updateLevel(level) {
    return setProgress("level", level);
  }

  function getQuestData(id) {
    const quest = getQuest(id);

    if (!quest) return null;

    const progress = getProgress(quest);

    return {
      ...quest,
      progress,
      completed: progress >= quest.target,
      claimed: isClaimed(id),
      percentage: Math.min(
        100,
        Math.round(progress / quest.target * 100)
      )
    };
  }

  function getAll() {
    return QUESTS.map(quest => getQuestData(quest.id));
  }

  function getByCategory(category) {
    return getAll().filter(
      quest => quest.category === category
    );
  }

  function getSummary() {
    const all = getAll();

    return {
      total: all.length,
      completed: all.filter(q => q.completed).length,
      claimed: all.filter(q => q.claimed).length,
      available: all.filter(
        q => q.completed && !q.claimed
      ).length
    };
  }

  function claim(id) {
    const quest = getQuest(id);

    if (!quest) {
      return {
        success: false,
        reason: "not_found"
      };
    }

    if (isClaimed(id)) {
      return {
        success: false,
        reason: "already_claimed"
      };
    }

    if (getProgress(quest) < quest.target) {
      return {
        success: false,
        reason: "not_completed"
      };
    }

    let coinsAdded = false;

    if (SX.progress?.addCoins) {
      SX.progress.addCoins(
        quest.coins,
        "quest_reward"
      );

      coinsAdded = true;
    } else if (SX.addCoins) {
      SX.addCoins(quest.coins);
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
        quest.xp,
        "quest_reward"
      );
    } else if (SX.addXP) {
      SX.addXP(quest.xp);
    }

    state.claimed.push(id);
    save();
    render();

    SX.notifications?.success(
      `${quest.coins} coins and ${quest.xp} XP earned!`,
      "MISSION COMPLETED"
    );

    const result = {
      success: true,
      id,
      coins: quest.coins,
      xp: quest.xp
    };

    document.dispatchEvent(
      new CustomEvent("sx:quest-claimed", {
        detail: result
      })
    );

    return result;
  }

  function render(selector = "[data-quests-list]") {
    const root = document.querySelector(selector);

    if (!root) return;

    root.replaceChildren();

    getAll().forEach(quest => {
      const card = document.createElement("article");
      card.className = "sx-quest-card";

      const category = document.createElement("small");
      category.textContent = quest.category;

      const title = document.createElement("h3");
      title.textContent = quest.title;

      const description = document.createElement("p");
      description.textContent = quest.description;

      const progressText = document.createElement("p");
      progressText.textContent =
        `${quest.progress} / ${quest.target}`;

      const progress = document.createElement("progress");
      progress.max = quest.target;
      progress.value = quest.progress;

      const rewards = document.createElement("p");
      rewards.textContent =
        `🪙 ${quest.coins} COINS · ⭐ ${quest.xp} XP`;

      const button = document.createElement("button");
      button.type = "button";

      if (quest.claimed) {
        button.textContent = "CLAIMED";
        button.disabled = true;
      } else if (quest.completed) {
        button.textContent = "CLAIM REWARD";

        button.addEventListener("click", () => {
          claim(quest.id);
        });
      } else {
        button.textContent = "IN PROGRESS";
        button.disabled = true;
      }

      card.append(
        category,
        title,
        description,
        progressText,
        progress,
        rewards,
        button
      );

      root.appendChild(card);
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
      () => addMap(1)
    );

    document.addEventListener(
      "sx:car-purchased",
      () => addCar(1)
    );

    document.addEventListener(
      "sx:car-upgraded",
      () => addUpgrade(1)
    );

    document.addEventListener(
      "sx:level-up",
      event => {
        updateLevel(Number(event.detail?.level) || 1);
      }
    );
  }

  function init() {
    if (initialized) return true;

    load();
    bindEvents();

    initialized = true;
    render();

    return true;
  }

  SX.quests = {
    init,
    update,
    setProgress,
    addRace,
    addWin,
    addDistance,
    addMap,
    addCar,
    addUpgrade,
    updateLevel,
    getQuest,
    getQuestData,
    getAll,
    getByCategory,
    getSummary,
    claim,
    render
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
   SUPERX LEGEND — FILE 38
   END
========================================================= */
      
