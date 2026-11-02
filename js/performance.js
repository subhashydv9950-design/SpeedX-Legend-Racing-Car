
/* =========================================================
   SUPERX LEGEND — FILE 43 START
   FILE: js/performance.js
   PURPOSE: FPS monitoring and performance optimization
========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const config = {
    sampleInterval: 1000,
    historyLimit: 60,
    lowFPS: 25,
    mediumFPS: 40,
    targetFPS: 60
  };

  const state = {
    running: false,
    frameCount: 0,
    fps: 0,
    averageFPS: 0,
    minFPS: Infinity,
    maxFPS: 0,
    frameTime: 0,
    lastFrameTime: 0,
    lastSampleTime: 0,
    history: [],
    quality: "high",
    device: "unknown",
    recommendations: []
  };

  let animationFrame = null;
  let lastWarning = "";

  function detectDevice() {
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i
      .test(navigator.userAgent || "");

    state.device = mobile ? "mobile" : "desktop";

    return state.device;
  }

  function getAverage(values) {
    if (!values.length) return 0;

    return values.reduce((sum, value) => sum + value, 0)
      / values.length;
  }

  function updateQuality(fps) {
    let quality = "high";

    if (fps < config.lowFPS) {
      quality = "low";
    } else if (fps < config.mediumFPS) {
      quality = "medium";
    }

    if (quality === state.quality) return;

    state.quality = quality;

    document.dispatchEvent(new CustomEvent(
      "sx:performance-quality-changed",
      {
        detail: {
          quality,
          fps
        }
      }
    ));

    if (SX.notifications && SX.notifications.warning) {
      if (quality === "low" && lastWarning !== "low") {
        SX.notifications.warning(
          "Performance warning",
          "Game quality may need to be reduced."
        );
      }

      lastWarning = quality;
    }
  }

  function updateRecommendations() {
    const recommendations = [];

    if (state.fps < config.lowFPS) {
      recommendations.push("Reduce graphics quality.");
      recommendations.push("Reduce traffic density.");
      recommendations.push("Disable unnecessary visual effects.");
    } else if (state.fps < config.mediumFPS) {
      recommendations.push("Use medium graphics settings.");
      recommendations.push("Reduce shadow quality.");
    } else {
      recommendations.push("Performance is running smoothly.");
    }

    if (state.device === "mobile") {
      recommendations.push("Prefer optimized mobile graphics.");
    }

    state.recommendations = recommendations;
  }

  function tick(timestamp) {
    if (!state.running) return;

    state.frameCount++;

    if (state.lastFrameTime) {
      state.frameTime = timestamp - state.lastFrameTime;
    }

    state.lastFrameTime = timestamp;

    if (!state.lastSampleTime) {
      state.lastSampleTime = timestamp;
    }

    const elapsed = timestamp - state.lastSampleTime;

    if (elapsed >= config.sampleInterval) {
      state.fps = Math.round(
        state.frameCount * 1000 / elapsed
      );

      state.minFPS = Math.min(state.minFPS, state.fps);
      state.maxFPS = Math.max(state.maxFPS, state.fps);

      state.history.push(state.fps);

      if (state.history.length > config.historyLimit) {
        state.history.shift();
      }

      state.averageFPS = Math.round(
        getAverage(state.history)
      );

      updateQuality(state.fps);
      updateRecommendations();

      document.dispatchEvent(new CustomEvent(
        "sx:performance-update",
        {
          detail: getStats()
        }
      ));

      state.frameCount = 0;
      state.lastSampleTime = timestamp;
    }

    animationFrame = requestAnimationFrame(tick);
  }

  function start() {
    if (state.running) return true;

    state.running = true;
    state.frameCount = 0;
    state.lastFrameTime = 0;
    state.lastSampleTime = 0;

    detectDevice();

    animationFrame = requestAnimationFrame(tick);

    return true;
  }

  function stop() {
    state.running = false;

    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    return true;
  }

  function reset() {
    state.frameCount = 0;
    state.fps = 0;
    state.averageFPS = 0;
    state.minFPS = Infinity;
    state.maxFPS = 0;
    state.frameTime = 0;
    state.history = [];
    state.recommendations = [];
    state.quality = "high";
    lastWarning = "";
  }

  function getStats() {
    return {
      running: state.running,
      fps: state.fps,
      averageFPS: state.averageFPS,
      minFPS: state.minFPS === Infinity ? 0 : state.minFPS,
      maxFPS: state.maxFPS,
      frameTime: Number(state.frameTime.toFixed(2)),
      device: state.device,
      quality: state.quality,
      history: [...state.history],
      recommendations: [...state.recommendations]
    };
  }

  function getRecommendedQuality() {
    if (state.device === "mobile") {
      return state.fps < config.lowFPS
        ? "low"
        : "medium";
    }

    return state.fps < config.lowFPS
      ? "low"
      : state.fps < config.mediumFPS
        ? "medium"
        : "high";
  }

  function applyQuality(quality) {
    const allowed = ["low", "medium", "high"];

    if (!allowed.includes(quality)) {
      return false;
    }

    state.quality = quality;

    document.dispatchEvent(new CustomEvent(
      "sx:graphics-quality-requested",
      {
        detail: { quality }
      }
    ));

    return true;
  }

  function getConfig() {
    return { ...config };
  }

  SX.performance = {
    start,
    stop,
    reset,
    getStats,
    getRecommendedQuality,
    applyQuality,
    getConfig,
    detectDevice,
    isRunning: () => state.running
  };

})();

/* =========================================================
   SUPERX LEGEND — FILE 43 END
   FILE: js/performance.js
========================================================= */
