
/* =========================================================
   SUPERX LEGEND — FILE 29
   FILE: js/settings.js
   START
========================================================= */

(() => {
  "use strict";

  const SX = (window.SUPERX = window.SUPERX || {});

  const DEFAULTS = {
    graphics: "high",
    resolution: "100",
    shadows: true,
    reflections: true,
    particles: true,

    masterVolume: 80,
    musicVolume: 55,
    effectsVolume: 85,
    musicEnabled: true,
    effectsEnabled: true,

    language: "en",

    controlType: "buttons",
    steeringSensitivity: 65,
    steeringAssist: true,
    vibration: true,
    tiltSensitivity: 60,

    cameraMode: "chase",
    cameraSensitivity: 60,
    cameraShake: true,

    showSpeedometer: true,
    showMinimap: true,
    showFPS: false
  };

  const clone = value => JSON.parse(JSON.stringify(value));

  function loadSettings() {
    let saved = {};

    try {
      if (SX.player && SX.player.settings) {
        saved = SX.player.settings;
      } else if (SX.settings) {
        saved = SX.settings;
      }
    } catch (error) {
      console.warn("SUPERX: Settings load warning", error);
    }

    return {
      ...clone(DEFAULTS),
      ...(saved || {})
    };
  }

  let current = loadSettings();

  function persist() {
    SX.settings = clone(current);

    if (SX.player) {
      SX.player.settings = clone(current);

      if (typeof SX.savePlayer === "function") {
        SX.savePlayer();
      }
    }

    if (typeof SX.saveSettings === "function") {
      SX.saveSettings();
    }

    window.dispatchEvent(
      new CustomEvent("superx:settings-changed", {
        detail: clone(current)
      })
    );

    return clone(current);
  }

  function get(key) {
    if (key === undefined) return clone(current);
    return current[key];
  }

  function set(key, value) {
    if (!Object.prototype.hasOwnProperty.call(DEFAULTS, key)) {
      console.warn("SUPERX: Unknown setting:", key);
      return false;
    }

    const defaultValue = DEFAULTS[key];

    if (typeof defaultValue === "boolean") {
      value = Boolean(value);
    }

    if (typeof defaultValue === "number") {
      value = Number(value);

      if (!Number.isFinite(value)) return false;

      if (key.toLowerCase().includes("volume") ||
          key.toLowerCase().includes("sensitivity") ||
          key === "resolution") {
        value = Math.max(0, Math.min(100, value));
      }
    }

    if (typeof defaultValue === "string") {
      value = String(value).trim();
      if (!value) return false;
    }

    current[key] = value;
    persist();
    applySetting(key, value);

    return true;
  }

  function update(values = {}) {
    if (!values || typeof values !== "object") return false;

    Object.keys(values).forEach(key => {
      if (Object.prototype.hasOwnProperty.call(DEFAULTS, key)) {
        const value = values[key];
        const defaultValue = DEFAULTS[key];

        if (typeof defaultValue === "boolean") {
          current[key] = Boolean(value);
        } else if (typeof defaultValue === "number") {
          const number = Number(value);

          if (Number.isFinite(number)) {
            current[key] = Math.max(
              0,
              Math.min(100, number)
            );
          }
        } else if (typeof defaultValue === "string") {
          const text = String(value).trim();
          if (text) current[key] = text;
        }
      }
    });

    persist();
    applyAll();

    return true;
  }

  function applySetting(key, value) {
    switch (key) {
      case "masterVolume":
        if (SX.audio && SX.audio.setMasterVolume) {
          SX.audio.setMasterVolume(value / 100);
        }
        break;

      case "musicVolume":
        if (SX.audio && SX.audio.setMusicVolume) {
          SX.audio.setMusicVolume(value / 100);
        }
        break;

      case "effectsVolume":
        if (SX.audio && SX.audio.setEffectsVolume) {
          SX.audio.setEffectsVolume(value / 100);
        }
        break;

      case "musicEnabled":
        if (SX.audio && SX.audio.setMusicEnabled) {
          SX.audio.setMusicEnabled(value);
        }
        break;

      case "effectsEnabled":
        if (SX.audio && SX.audio.setEffectsEnabled) {
          SX.audio.setEffectsEnabled(value);
        }
        break;

      case "cameraMode":
        if (SX.camera && SX.camera.setMode) {
          SX.camera.setMode(value);
        }
        break;

      case "steeringSensitivity":
        window.dispatchEvent(
          new CustomEvent("superx:steering-sensitivity", {
            detail: value
          })
        );
        break;

      case "language":
        if (SX.language && SX.language.setLanguage) {
          SX.language.setLanguage(value);
        }
        break;

      default:
        window.dispatchEvent(
          new CustomEvent("superx:setting-updated", {
            detail: { key, value }
          })
        );
    }
  }

  function applyAll() {
    Object.keys(current).forEach(key => {
      applySetting(key, current[key]);
    });
  }

  function reset() {
    current = clone(DEFAULTS);
    persist();
    applyAll();
    return clone(current);
  }

  function getDefaults() {
    return clone(DEFAULTS);
  }

  function getOptions() {
    return {
      graphics: [
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
        { value: "ultra", label: "Ultra" }
      ],

      controlType: [
        { value: "buttons", label: "Touch Buttons" },
        { value: "wheel", label: "Steering Wheel" },
        { value: "tilt", label: "Tilt Control" }
      ],

      cameraMode: [
        { value: "chase", label: "Chase Camera" },
        { value: "hood", label: "Hood Camera" },
        { value: "cockpit", label: "Cockpit Camera" },
        { value: "cinematic", label: "Cinematic Camera" }
      ],

      language: [
        { value: "en", label: "English" },
        { value: "hi", label: "हिन्दी" },
        { value: "de", label: "Deutsch" },
        { value: "fr", label: "Français" },
        { value: "es", label: "Español" },
        { value: "ru", label: "Русский" },
        { value: "uk", label: "Українська" },
        { value: "zh", label: "中文" },
        { value: "ja", label: "日本語" },
        { value: "ko", label: "한국어" },
        { value: "bn", label: "বাংলা" },
        { value: "pa", label: "ਪੰਜਾਬੀ" },
        { value: "ta", label: "தமிழ்" },
        { value: "te", label: "తెలుగు" },
        { value: "mr", label: "मराठी" },
        { value: "gu", label: "ગુજરાતી" }
      ]
    };
  }

  function bindControls(root = document) {
    const elements = root.querySelectorAll("[data-setting]");

    elements.forEach(element => {
      const key = element.dataset.setting;

      if (!Object.prototype.hasOwnProperty.call(DEFAULTS, key)) {
        return;
      }

      const value = current[key];

      if (element.type === "checkbox") {
        element.checked = Boolean(value);
      } else {
        element.value = value;
      }

      if (element.dataset.settingsBound === "true") return;

      element.dataset.settingsBound = "true";

      const eventName =
        element.type === "checkbox" ||
        element.tagName === "SELECT"
          ? "change"
          : "input";

      element.addEventListener(eventName, () => {
        const newValue =
          element.type === "checkbox"
            ? element.checked
            : element.value;

        set(key, newValue);
      });
    });
  }

  function init(root = document) {
    bindControls(root);
    applyAll();

    return get();
  }

  SX.settingsManager = {
    defaults: getDefaults,
    get,
    set,
    update,
    reset,
    init,
    bindControls,
    applyAll,
    getOptions
  };

  window.addEventListener("DOMContentLoaded", () => {
    init();
  });

})();

/* =========================================================
   SUPERX LEGEND — FILE 29
   END
========================================================= */
    
