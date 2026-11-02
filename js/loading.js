
/* =========================================================
   SUPERX LEGEND — FILE 45 START
   FILE: js/loading.js
   PURPOSE: Premium loading screen and progress manager
========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  let screen = null;
  let progressBar = null;
  let statusText = null;
  let percentText = null;
  let progress = 0;
  let visible = false;
  let completed = false;

  const tasks = new Map();

  function createStyles() {
    if (document.getElementById("sxLoadingStyles")) return;

    const style = document.createElement("style");
    style.id = "sxLoadingStyles";

    style.textContent = `
      #sxLoadingScreen {
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        background:
          radial-gradient(circle at center, #25143c 0%, #100b1b 45%, #05040a 100%);
        color: white;
        font-family: Arial, sans-serif;
        opacity: 1;
        visibility: visible;
        transition: opacity .5s ease, visibility .5s ease;
      }

      #sxLoadingScreen.sx-loading-hidden {
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
      }

      .sx-loading-content {
        width: min(390px, 85%);
        text-align: center;
      }

      .sx-loading-logo {
        font-size: clamp(30px, 8vw, 48px);
        font-weight: 1000;
        letter-spacing: 3px;
        background: linear-gradient(90deg, #ffffff, #c38aff, #8e48f2);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        margin-bottom: 9px;
      }

      .sx-loading-subtitle {
        color: #a99abf;
        font-size: 11px;
        letter-spacing: 4px;
        margin-bottom: 48px;
      }

      .sx-loading-car {
        font-size: 65px;
        margin-bottom: 35px;
        animation: sxCarPulse 1.5s ease-in-out infinite;
      }

      @keyframes sxCarPulse {
        0%, 100% { transform: translateX(-7px); }
        50% { transform: translateX(7px); }
      }

      .sx-loading-track {
        height: 7px;
        width: 100%;
        background: #30263d;
        border-radius: 20px;
        overflow: hidden;
      }

      .sx-loading-progress {
        width: 0%;
        height: 100%;
        background: linear-gradient(90deg, #813be5, #d19aff);
        border-radius: inherit;
        transition: width .25s ease;
      }

      .sx-loading-info {
        display: flex;
        justify-content: space-between;
        margin-top: 12px;
        color: #c9bbda;
        font-size: 12px;
      }

      .sx-loading-footer {
        margin-top: 35px;
        color: #786b8b;
        font-size: 10px;
        letter-spacing: 2px;
      }
    `;

    document.head.appendChild(style);
  }

  function createScreen() {
    if (screen) return;

    createStyles();

    screen = document.createElement("div");
    screen.id = "sxLoadingScreen";

    screen.innerHTML = `
      <div class="sx-loading-content">
        <div class="sx-loading-logo">SUPERX LEGEND</div>
        <div class="sx-loading-subtitle">RACING EXPERIENCE</div>

        <div class="sx-loading-car" aria-hidden="true">🏎️</div>

        <div class="sx-loading-track">
          <div class="sx-loading-progress"></div>
        </div>

        <div class="sx-loading-info">
          <span class="sx-loading-status">Preparing game...</span>
          <span class="sx-loading-percent">0%</span>
        </div>

        <div class="sx-loading-footer">
          FOUNDER & DEVELOPER · SUBHASH YADAV
        </div>
      </div>
    `;

    document.body.appendChild(screen);

    progressBar = screen.querySelector(".sx-loading-progress");
    statusText = screen.querySelector(".sx-loading-status");
    percentText = screen.querySelector(".sx-loading-percent");
  }

  function update(value, message) {
    progress = Math.max(0, Math.min(100, Number(value) || 0));

    if (!screen) createScreen();

    progressBar.style.width = progress + "%";
    percentText.textContent = Math.round(progress) + "%";

    if (message) {
      statusText.textContent = String(message);
    }

    document.dispatchEvent(new CustomEvent("sx:loading-progress", {
      detail: {
        progress,
        message: message || ""
      }
    }));

    if (progress >= 100) {
      completed = true;
    }

    return progress;
  }

  function show(message = "Preparing game...") {
    createScreen();

    screen.classList.remove("sx-loading-hidden");
    document.body.style.overflow = "hidden";

    visible = true;
    completed = false;

    update(0, message);

    return true;
  }

  function hide() {
    if (!screen) return false;

    screen.classList.add("sx-loading-hidden");

    document.body.style.overflow = "";

    visible = false;

    document.dispatchEvent(new CustomEvent("sx:loading-complete"));

    return true;
  }

  function registerTask(name, weight = 1) {
    if (!name || tasks.has(name)) return false;

    tasks.set(String(name), {
      weight: Math.max(0.1, Number(weight) || 1),
      progress: 0
    });

    calculateTasks();

    return true;
  }

  function updateTask(name, value, message) {
    const task = tasks.get(name);

    if (!task) return false;

    task.progress = Math.max(
      0,
      Math.min(100, Number(value) || 0)
    );

    calculateTasks(message);

    return true;
  }

  function calculateTasks(message) {
    let totalWeight = 0;
    let completedWeight = 0;

    tasks.forEach(task => {
      totalWeight += task.weight;
      completedWeight += task.weight * task.progress / 100;
    });

    const value = totalWeight
      ? completedWeight / totalWeight * 100
      : 0;

    update(value, message || "Loading game resources...");
  }

  function resetTasks() {
    tasks.clear();
    progress = 0;
    completed = false;

    if (screen) {
      update(0, "Preparing game...");
    }
  }

  function getState() {
    return {
      progress,
      visible,
      completed,
      tasks: Array.from(tasks.entries()).map(([name, task]) => ({
        name,
        weight: task.weight,
        progress: task.progress
      }))
    };
  }

  SX.loading = {
    show,
    hide,
    update,
    registerTask,
    updateTask,
    resetTasks,
    getState,
    isVisible: () => visible,
    isCompleted: () => completed
  };

})();

/* =========================================================
   SUPERX LEGEND — FILE 45 END
   FILE: js/loading.js
========================================================= */
