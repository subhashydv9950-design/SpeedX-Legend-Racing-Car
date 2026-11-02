
/* =========================================================
   SUPERX LEGEND — FILE 49
   FILE: js/quality-manager.js
   PURPOSE: Automatic graphics quality management
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const PRESETS = {
    low: {
      pixelRatio: 0.75,
      shadows: false,
      antialias: false,
      particles: 0.25,
      viewDistance: 0.55,
      effects: false,
      label: "Low"
    },

    medium: {
      pixelRatio: 1,
      shadows: true,
      antialias: false,
      particles: 0.6,
      viewDistance: 0.8,
      effects: true,
      label: "Medium"
    },

    high: {
      pixelRatio: 1.5,
      shadows: true,
      antialias: true,
      particles: 1,
      viewDistance: 1,
      effects: true,
      label: "High"
    },

    ultra: {
      pixelRatio: 2,
      shadows: true,
      antialias: true,
      particles: 1.5,
      viewDistance: 1.3,
      effects: true,
      label: "Ultra"
    }
  };

  const state = {
    quality: "medium",
    automatic: true,
    initialized: false,
    renderer: null,
    scene: null,
    camera: null,
    fpsSamples: [],
    lastAdjustment: 0,
    minimumFPS: 25,
    targetFPS: 55,
    listeners: new Set()
  };

  function getDeviceInfo() {
    const memory = Number(navigator.deviceMemory || 4);
    const cores = Number(navigator.hardwareConcurrency || 4);
    const width = Math.max(
      window.innerWidth || 0,
      window.innerHeight || 0
    );

    return {
      memory,
      cores,
      width,
      mobile: /Android|iPhone|iPad|Mobile/i.test(
        navigator.userAgent || ""
      )
    };
  }

  function getRecommendedQuality() {
    const device = getDeviceInfo();

    if (device.memory <= 2 || device.cores <= 2) {
      return "low";
    }

    if (device.memory <= 4 || device.cores <= 4) {
      return "medium";
    }

    if (device.memory >= 8 && device.cores >= 8) {
      return "high";
    }

    return "medium";
  }

  function getPreset(name) {
    return PRESETS[name] || PRESETS.medium;
  }

  function notify() {
    const data = getState();

    state.listeners.forEach(function (callback) {
      try {
        callback(data);
      } catch (error) {
        console.warn("SUPERX quality listener error:", error);
      }
    });

    window.dispatchEvent(new CustomEvent("sx:quality-changed", {
      detail: data
    }));
  }

  function applyRendererSettings() {
    const renderer = state.renderer;
    const preset = getPreset(state.quality);

    if (!renderer) return;

    const ratio = Math.min(
      window.devicePixelRatio || 1,
      preset.pixelRatio
    );

    if (typeof renderer.setPixelRatio === "function") {
      renderer.setPixelRatio(ratio);
    }

    if (typeof renderer.setSize === "function") {
      renderer.setSize(
        window.innerWidth,
        window.innerHeight,
        false
      );
    }

    if (renderer.shadowMap) {
      renderer.shadowMap.enabled = preset.shadows;

      if (window.THREE && window.THREE.PCFSoftShadowMap) {
        renderer.shadowMap.type = window.THREE.PCFSoftShadowMap;
      }
    }

    if ("antialias" in renderer) {
      renderer.antialias = preset.antialias;
    }
  }

  function applySceneSettings() {
    const preset = getPreset(state.quality);

    if (state.scene && state.scene.traverse) {
      state.scene.traverse(function (object) {
        if (!object.isMesh || !object.material) return;

        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];

        materials.forEach(function (material) {
          if ("fog" in material) {
            material.fog = true;
          }
        });
      });
    }

    if (state.camera && state.camera.isCamera) {
      const camera = state.camera;

      if (camera.far && camera.userData) {
        camera.userData.superxOriginalFar =
          camera.userData.superxOriginalFar || camera.far;

        camera.far =
          camera.userData.superxOriginalFar *
          preset.viewDistance;

        if (typeof camera.updateProjectionMatrix === "function") {
          camera.updateProjectionMatrix();
        }
      }
    }

    window.dispatchEvent(new CustomEvent("sx:quality-settings", {
      detail: {
        quality: state.quality,
        particles: preset.particles,
        effects: preset.effects,
        shadows: preset.shadows,
        viewDistance: preset.viewDistance
      }
    }));
  }

  function apply(name, options) {
    options = options || {};

    if (!PRESETS[name]) {
      console.warn("SUPERX: Unknown quality preset:", name);
      return false;
    }

    state.quality = name;

    if (options.automatic !== undefined) {
      state.automatic = Boolean(options.automatic);
    }

    applyRendererSettings();
    applySceneSettings();

    if (SX.graphics && typeof SX.graphics.setQuality === "function") {
      if (SX.graphics.getQuality?.() !== name) {
        SX.graphics.setQuality(name);
      }
    }

    if (SX.performance && typeof SX.performance.applyQuality === "function") {
      SX.performance.applyQuality(name);
    }

    notify();
    return true;
  }

  function attach(options) {
    options = options || {};

    state.renderer = options.renderer || state.renderer;
    state.scene = options.scene || state.scene;
    state.camera = options.camera || state.camera;

    applyRendererSettings();
    applySceneSettings();

    return true;
  }

  function recordFPS(fps) {
    fps = Number(fps);

    if (!Number.isFinite(fps) || fps <= 0) return;

    state.fpsSamples.push(fps);

    if (state.fpsSamples.length > 12) {
      state.fpsSamples.shift();
    }

    if (!state.automatic || state.fpsSamples.length < 6) {
      return;
    }

    const now = Date.now();

    if (now - state.lastAdjustment < 12000) {
      return;
    }

    const average = state.fpsSamples.reduce(
      (total, value) => total + value,
      0
    ) / state.fpsSamples.length;

    const order = ["low", "medium", "high", "ultra"];
    const currentIndex = order.indexOf(state.quality);

    if (average < state.minimumFPS && currentIndex > 0) {
      state.lastAdjustment = now;
      apply(order[currentIndex - 1], { automatic: true });
      return;
    }

    if (average > state.targetFPS && currentIndex < order.length - 1) {
      state.lastAdjustment = now;
      apply(order[currentIndex + 1], { automatic: true });
    }
  }

  function setAutomatic(enabled) {
    state.automatic = Boolean(enabled);
    state.fpsSamples = [];

    if (state.automatic) {
      apply(getRecommendedQuality(), { automatic: true });
    }

    notify();
    return state.automatic;
  }

  function setQuality(name) {
    return apply(name, { automatic: false });
  }

  function subscribe(callback) {
    if (typeof callback !== "function") return function () {};

    state.listeners.add(callback);

    return function unsubscribe() {
      state.listeners.delete(callback);
    };
  }

  function getState() {
    return {
      quality: state.quality,
      automatic: state.automatic,
      recommended: getRecommendedQuality(),
      preset: Object.assign({}, getPreset(state.quality)),
      device: getDeviceInfo(),
      averageFPS: state.fpsSamples.length
        ? Math.round(
            state.fpsSamples.reduce((a, b) => a + b, 0) /
            state.fpsSamples.length
          )
        : null
    };
  }

  function init(options) {
    if (state.initialized) {
      if (options) attach(options);
      return getState();
    }

    state.initialized = true;

    const recommended = getRecommendedQuality();

    apply(recommended, { automatic: true });

    if (options) attach(options);

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        state.fpsSamples = [];
      }
    });

    window.addEventListener("resize", function () {
      applyRendererSettings();
    });

    return getState();
  }

  SX.qualityManager = {
    init,
    attach,
    setQuality,
    setAutomatic,
    recordFPS,
    subscribe,
    getState,
    getPreset,
    getRecommendedQuality,
    getPresets: function () {
      return Object.keys(PRESETS);
    }
  };

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 49 END
   ========================================================= */
 
