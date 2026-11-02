
/* =========================================================
   SUPERX LEGEND — FILE 41 START
   FILE: js/game-events.js
   PURPOSE: Central game event integration
========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const EVENT_NAMES = [
    "sx:race-started",
    "sx:race-completed",
    "sx:map-completed",
    "sx:car-purchased",
    "sx:car-upgraded",
    "sx:coins-earned",
    "sx:level-up",
    "sx:tutorial-completed"
  ];

  const eventHistory = [];
  const MAX_HISTORY = 100;
  let initialized = false;

  function recordEvent(name, detail = {}) {
    const entry = {
      name,
      detail: sanitizeDetail(detail),
      timestamp: Date.now()
    };

    eventHistory.push(entry);

    if (eventHistory.length > MAX_HISTORY) {
      eventHistory.shift();
    }

    return entry;
  }

  function sanitizeDetail(detail) {
    if (!detail || typeof detail !== "object") {
      return {};
    }

    const safe = {};

    Object.keys(detail).slice(0, 20).forEach(key => {
      const value = detail[key];

      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null
      ) {
        safe[key] = value;
      }
    });

    return safe;
  }

  function emit(name, detail = {}) {
    if (typeof name !== "string" || !name.startsWith("sx:")) {
      return false;
    }

    const safeDetail = sanitizeDetail(detail);

    recordEvent(name, safeDetail);

    document.dispatchEvent(new CustomEvent(name, {
      detail: safeDetail
    }));

    return true;
  }

  function on(name, callback) {
    if (typeof callback !== "function") {
      return () => {};
    }

    document.addEventListener(name, callback);

    return function unsubscribe() {
      document.removeEventListener(name, callback);
    };
  }

  function connectProgressEvents() {
    on("sx:race-completed", event => {
      const detail = event.detail || {};

      if (SX.achievements && SX.achievements.updateStats) {
        SX.achievements.updateStats({
          racesCompleted: 1,
          wins: detail.won ? 1 : 0
        });
      }
    });

    on("sx:map-completed", event => {
      const detail = event.detail || {};

      if (SX.achievements && SX.achievements.updateStats) {
        SX.achievements.updateStats({
          mapsCompleted: 1,
          totalDistance: Number(detail.distance) || 0
        });
      }
    });

    on("sx:car-purchased", event => {
      const detail = event.detail || {};

      if (SX.notifications && SX.notifications.success) {
        SX.notifications.success(
          "New car unlocked",
          detail.carName || "Your new car is ready!"
        );
      }
    });

    on("sx:level-up", event => {
      const detail = event.detail || {};

      if (SX.notifications && SX.notifications.levelUp) {
        SX.notifications.levelUp(
          detail.level || SX.player?.level || 1
        );
      }
    });
  }

  function init() {
    if (initialized) return true;

    connectProgressEvents();
    initialized = true;

    return true;
  }

  function getHistory(limit = 20) {
    const safeLimit = Math.max(
      1,
      Math.min(Number(limit) || 20, MAX_HISTORY)
    );

    return eventHistory.slice(-safeLimit).map(item => ({
      ...item,
      detail: { ...item.detail }
    }));
  }

  function clearHistory() {
    eventHistory.length = 0;
  }

  SX.gameEvents = {
    init,
    emit,
    on,
    getHistory,
    clearHistory,
    isInitialized: () => initialized,
    eventNames: [...EVENT_NAMES]
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

})();

/* =========================================================
   SUPERX LEGEND — FILE 41 END
   FILE: js/game-events.js
========================================================= */
