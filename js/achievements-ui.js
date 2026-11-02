
/* =========================================================
   SUPERX LEGEND — FILE 39
   FILE: js/achievements-ui.js
   START
========================================================= */

(() => {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const ICONS = {
    race: "🏁",
    speed: "⚡",
    win: "🏆",
    distance: "🛣️",
    map: "🌍",
    car: "🚘",
    level: "⭐",
    collection: "💎",
    default: "🏅"
  };

  let initialized = false;

  function getAchievements() {
    const system = SX.achievements;

    if (!system) return [];

    if (typeof system.getAll === "function") {
      return system.getAll() || [];
    }

    if (typeof system.getAchievements === "function") {
      return system.getAchievements() || [];
    }

    if (Array.isArray(system.list)) {
      return system.list;
    }

    return [];
  }

  function getStatus(item) {
    return Boolean(
      item.unlocked ||
      item.completed ||
      item.isUnlocked ||
      item.claimed
    );
  }

  function getIcon(item) {
    if (item.icon) return item.icon;

    const text = `${item.id || ""} ${item.title || ""}`
      .toLowerCase();

    for (const key of Object.keys(ICONS)) {
      if (key !== "default" && text.includes(key)) {
        return ICONS[key];
      }
    }

    return ICONS.default;
  }

  function getProgress(item) {
    const current = Math.max(
      0,
      Number(item.progress || item.current) || 0
    );

    const target = Math.max(
      1,
      Number(item.target || item.requirement) || 1
    );

    return {
      current,
      target,
      percentage: Math.min(
        100,
        Math.round(current / target * 100)
      )
    };
  }

  function injectStyles() {
    if (document.getElementById("sx-achievements-ui-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "sx-achievements-ui-style";

    style.textContent = `
      .sx-achievements-grid {
        display: grid;
        grid-template-columns: repeat(
          auto-fit,
          minmax(min(100%, 230px), 1fr)
        );
        gap: 14px;
        width: 100%;
      }

      .sx-achievement-card {
        position: relative;
        min-width: 0;
        padding: 18px;
        border-radius: 17px;
        background: linear-gradient(
          145deg,
          #1d1930,
          #11101a
        );
        border: 1px solid rgba(164, 117, 255, .20);
        color: #fff;
        overflow: hidden;
        transition: transform .2s ease, border-color .2s ease;
      }

      .sx-achievement-card:hover {
        transform: translateY(-3px);
        border-color: rgba(181, 137, 255, .65);
      }

      .sx-achievement-card.is-locked {
        opacity: .72;
      }

      .sx-achievement-icon {
        width: 52px;
        height: 52px;
        display: grid;
        place-items: center;
        font-size: 27px;
        border-radius: 15px;
        background: rgba(153, 102, 255, .16);
        margin-bottom: 14px;
      }

      .sx-achievement-title {
        font-size: 15px;
        font-weight: 800;
        margin: 0 0 7px;
      }

      .sx-achievement-description {
        color: #bcb4cd;
        font-size: 12px;
        line-height: 1.5;
        min-height: 35px;
      }

      .sx-achievement-progress-track {
        height: 7px;
        margin-top: 13px;
        border-radius: 20px;
        background: #302a40;
        overflow: hidden;
      }

      .sx-achievement-progress-fill {
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(
          90deg,
          #843cff,
          #d4a4ff
        );
        transition: width .3s ease;
      }

      .sx-achievement-meta {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        margin-top: 10px;
        color: #bcb4cd;
        font-size: 11px;
      }

      .sx-achievement-reward {
        margin-top: 13px;
        color: #f4d98b;
        font-size: 12px;
        font-weight: 700;
      }

      .sx-achievement-status {
        display: inline-block;
        margin-top: 10px;
        padding: 5px 9px;
        border-radius: 20px;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: .5px;
        background: rgba(150, 110, 255, .15);
        color: #c7aaff;
      }

      .sx-achievement-card.is-unlocked
      .sx-achievement-status {
        background: rgba(55, 210, 135, .13);
        color: #80eab3;
      }

      .sx-achievement-empty {
        color: #bcb4cd;
        text-align: center;
        padding: 30px 12px;
        grid-column: 1 / -1;
      }

      .sx-achievement-summary {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin-bottom: 18px;
      }

      .sx-achievement-stat {
        padding: 13px 8px;
        border-radius: 13px;
        text-align: center;
        background: #191526;
        border: 1px solid rgba(164, 117, 255, .16);
      }

      .sx-achievement-stat strong {
        display: block;
        color: #d6b9ff;
        font-size: 21px;
      }

      .sx-achievement-stat span {
        display: block;
        margin-top: 4px;
        color: #aaa0bb;
        font-size: 10px;
      }

      @media(max-width: 420px) {
        .sx-achievement-summary {
          gap: 6px;
        }

        .sx-achievement-card {
          padding: 14px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function createStat(value, label) {
    const box = document.createElement("div");
    box.className = "sx-achievement-stat";

    const number = document.createElement("strong");
    number.textContent = String(value);

    const text = document.createElement("span");
    text.textContent = label;

    box.append(number, text);

    return box;
  }

  function renderSummary(root, achievements) {
    const summary = document.createElement("div");
    summary.className = "sx-achievement-summary";

    const unlocked = achievements.filter(getStatus).length;
    const total = achievements.length;
    const locked = Math.max(0, total - unlocked);

    summary.append(
      createStat(unlocked, "UNLOCKED"),
      createStat(locked, "LOCKED"),
      createStat(total, "TOTAL")
    );

    root.appendChild(summary);
  }

  function createCard(item) {
    const unlocked = getStatus(item);
    const progress = getProgress(item);

    const card = document.createElement("article");

    card.className =
      `sx-achievement-card ${
        unlocked ? "is-unlocked" : "is-locked"
      }`;

    const icon = document.createElement("div");
    icon.className = "sx-achievement-icon";
    icon.textContent = getIcon(item);

    const title = document.createElement("h3");
    title.className = "sx-achievement-title";
    title.textContent =
      String(item.title || item.name || "Achievement");

    const description = document.createElement("p");
    description.className = "sx-achievement-description";
    description.textContent =
      String(item.description || "Complete the objective to unlock.");

    const progressText = document.createElement("div");
    progressText.className = "sx-achievement-meta";

    const current = document.createElement("span");
    current.textContent =
      `${progress.current} / ${progress.target}`;

    const percentage = document.createElement("span");
    percentage.textContent = unlocked
      ? "100%"
      : `${progress.percentage}%`;

    progressText.append(current, percentage);

    const track = document.createElement("div");
    track.className = "sx-achievement-progress-track";

    const fill = document.createElement("div");
    fill.className = "sx-achievement-progress-fill";
    fill.style.width = unlocked
      ? "100%"
      : `${progress.percentage}%`;

    track.appendChild(fill);

    const reward = document.createElement("div");
    reward.className = "sx-achievement-reward";

    const coins = Number(item.coins || item.reward || 0);
    const xp = Number(item.xp || 0);

    reward.textContent =
      `🪙 ${coins} Coins${xp ? ` · ⭐ ${xp} XP` : ""}`;

    const status = document.createElement("span");
    status.className = "sx-achievement-status";
    status.textContent = unlocked ? "UNLOCKED" : "LOCKED";

    card.append(
      icon,
      title,
      description,
      progressText,
      track,
      reward,
      status
    );

    return card;
  }

  function render(selector = "[data-achievements-grid]") {
    const root = document.querySelector(selector);

    if (!root) return false;

    const achievements = getAchievements();

    root.replaceChildren();
    root.classList.add("sx-achievements-grid");

    if (!achievements.length) {
      const empty = document.createElement("div");
      empty.className = "sx-achievement-empty";
      empty.textContent =
        "Achievements will appear here as you progress.";

      root.appendChild(empty);
      return false;
    }

    renderSummary(root, achievements);

    achievements.forEach(item => {
      root.appendChild(createCard(item));
    });

    return true;
  }

  function refresh() {
    render();

    document.dispatchEvent(
      new CustomEvent("sx:achievements-ui-refreshed")
    );
  }

  function bindEvents() {
    [
      "sx:achievement-unlocked",
      "sx:achievement-claimed",
      "sx:race-completed",
      "sx:map-completed",
      "sx:quest-claimed",
      "sx:daily-reward-claimed"
    ].forEach(eventName => {
      document.addEventListener(eventName, refresh);
    });
  }

  function init() {
    if (initialized) return true;

    injectStyles();
    bindEvents();

    initialized = true;
    render();

    return true;
  }

  SX.achievementsUI = {
    init,
    render,
    refresh,
    getAchievements
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
   SUPERX LEGEND — FILE 39
   END
========================================================= */
