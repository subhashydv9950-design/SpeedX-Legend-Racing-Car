
/* =========================================================
   SUPERX LEGEND — FILE 44 START
   FILE: js/graphics.js
   PURPOSE: Graphics quality and visual optimization
========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const PRESETS = {
    low: {
      pixelRatio: 0.75,
      shadows: false,
      shadowMapSize: 512,
      antialias: false,
      particles: false,
      particleLimit: 100,
      reflections: false,
      fog: false,
      drawDistance: 300,
      textureQuality: "low",
      effects: false
    },

    medium: {
      pixelRatio: 1,
      shadows: true,
      shadowMapSize: 1024,
      antialias: false,
      particles: true,
      particleLimit: 500,
      reflections: false,
      fog: true,
      drawDistance: 600,
      textureQuality: "medium",
      effects: true
    },

    high: {
      pixelRatio: 1.5,
      shadows: true,
      shadowMapSize: 2048,
      antialias: true,
      particles: true,
      particleLimit: 1500,
      reflections: true,
      fog: true,
      drawDistance: 1200,
      textureQuality: "high",
      effects: true
    }
  };

  let currentQuality = "high";
  let renderer = null;
  let scene = null;
  let camera = null;
  let customOptions = {};

  function detectDevice() {
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i
      .test(navigator.userAgent || "");

    const memory = navigator.deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;

    return {
      mobile: isMobile,
      memory,
      cores,
      recommended: isMobile || memory <= 4 || cores <= 4
        ? "medium"
        : "high"
    };
  }

  function getPreset(quality = currentQuality) {
    const preset = PRESETS[quality];

    if (!preset) {
      return { ...PRESETS.medium };
    }

    return {
      ...preset,
      ...customOptions
    };
  }

  function setRenderer(targetRenderer) {
    if (!targetRenderer) return false;

    renderer = targetRenderer;

    return applyRendererSettings();
  }

  function setScene(targetScene) {
    if (!targetScene) return false;

    scene = targetScene;

    applySceneSettings();

    return true;
  }

  function setCamera(targetCamera) {
    if (!targetCamera) return false;

    camera = targetCamera;

    return applyCameraSettings();
  }

  function applyRendererSettings() {
    if (!renderer) return false;

    const settings = getPreset();

    try {
      const pixelRatio = Math.min(
        window.devicePixelRatio || 1,
        settings.pixelRatio
      );

      renderer.setPixelRatio(pixelRatio);

      if (renderer.shadowMap) {
        renderer.shadowMap.enabled = settings.shadows;

        if (
          renderer.shadowMap.type !== undefined &&
          window.THREE
        ) {
          renderer.shadowMap.type = settings.shadows
            ? THREE.PCFSoftShadowMap
            : THREE.BasicShadowMap;
        }
      }

      if (typeof renderer.setSize === "function") {
        renderer.setSize(
          renderer.domElement.clientWidth || window.innerWidth,
          renderer.domElement.clientHeight || window.innerHeight,
          false
        );
      }

      return true;
    } catch (error) {
      console.warn("SUPERX graphics renderer update failed:", error);
      return false;
    }
  }

  function applySceneSettings() {
    if (!scene) return false;

    const settings = getPreset();

    try {
      scene.traverse(object => {
        if (!object.isMesh) return;

        if (object.castShadow !== undefined) {
          object.castShadow = settings.shadows;
        }

        if (object.receiveShadow !== undefined) {
          object.receiveShadow = settings.shadows;
        }

        if (object.material) {
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];

          materials.forEach(material => {
            if ("envMapIntensity" in material) {
              material.envMapIntensity =
                settings.reflections ? 1 : 0;
            }

            material.needsUpdate = true;
          });
        }
      });

      return true;
    } catch (error) {
      console.warn("SUPERX graphics scene update failed:", error);
      return false;
    }
  }

  function applyCameraSettings() {
    if (!camera) return false;

    const settings = getPreset();

    try {
      camera.far = settings.drawDistance;
      camera.updateProjectionMatrix();

      return true;
    } catch (error) {
      console.warn("SUPERX graphics camera update failed:", error);
      return false;
    }
  }

  function applyAll() {
    applyRendererSettings();
    applySceneSettings();
    applyCameraSettings();

    document.dispatchEvent(new CustomEvent(
      "sx:graphics-applied",
      {
        detail: {
          quality: currentQuality,
          settings: getPreset()
        }
      }
    ));

    return true;
  }

  function setQuality(quality) {
    if (!Object.prototype.hasOwnProperty.call(PRESETS, quality)) {
      return false;
    }

    currentQuality = quality;
    customOptions = {};

    applyAll();

    try {
      if (SX.settingsManager && SX.settingsManager.set) {
        SX.settingsManager.set("graphics", quality);
      }
    } catch (error) {
      console.warn("Could not save graphics preference.");
    }

    return true;
  }

  function updateOption(name, value) {
    const allowed = [
      "shadows",
      "particles",
      "reflections",
      "fog",
      "effects"
    ];

    if (!allowed.includes(name)) {
      return false;
    }

    if (typeof value !== "boolean") {
      return false;
    }

    customOptions[name] = value;

    applyAll();

    return true;
  }

  function getState() {
    return {
      quality: currentQuality,
      settings: getPreset(),
      device: detectDevice()
    };
  }

  function initialize(options = {}) {
    if (options.renderer) {
      setRenderer(options.renderer);
    }

    if (options.scene) {
      setScene(options.scene);
    }

    if (options.camera) {
      setCamera(options.camera);
    }

    const device = detectDevice();

    if (options.autoQuality !== false) {
      setQuality(device.recommended);
    } else {
      applyAll();
    }

    return getState();
  }

  function reset() {
    currentQuality = "high";
    customOptions = {};

    applyAll();

    return true;
  }

  SX.graphics = {
    initialize,
    setRenderer,
    setScene,
    setCamera,
    setQuality,
    updateOption,
    applyAll,
    getPreset,
    getState,
    detectDevice,
    reset,
    presets: Object.keys(PRESETS)
  };

})();

/* =========================================================
   SUPERX LEGEND — FILE 44 END
   FILE: js/graphics.js
========================================================= */
