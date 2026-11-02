
/* =========================================================
   SUPERX LEGEND — FILE 86
   FILE: js/vehicle-transmission.js
   START: VEHICLE TRANSMISSION SYSTEM
   ========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const MODES = {
    automatic: {
      label: "Automatic",
      autoShift: true
    },
    manual: {
      label: "Manual",
      autoShift: false
    },
    sport: {
      label: "Sport",
      autoShift: true,
      aggressive: true
    }
  };

  const DEFAULT_CONFIG = {
    mode: "automatic",
    forwardGears: 6,
    reverseGear: -1,
    finalDrive: 3.4,
    idleRPM: 850,
    maxRPM: 7500,
    shiftUpRPM: 6500,
    shiftDownRPM: 1800
  };

  let config = { ...DEFAULT_CONFIG };

  let state = {
    gear: 1,
    rpm: 850,
    speed: 0,
    throttle: 0,
    clutch: 0,
    shifting: false,
    shiftTimer: 0,
    initialized: false
  };

  const GEAR_RATIOS = [
    3.25,
    2.10,
    1.48,
    1.12,
    0.88,
    0.72
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getMode() {
    return MODES[config.mode] || MODES.automatic;
  }

  function setMode(mode) {
    if (!MODES[mode]) {
      return {
        success: false,
        message: "Invalid transmission mode."
      };
    }

    config.mode = mode;

    if (mode === "automatic" || mode === "sport") {
      state.gear = Math.max(1, state.gear);
    }

    save();

    return {
      success: true,
      mode,
      label: getMode().label
    };
  }

  function getGearRatio(gear) {
    if (gear === -1) return 3.0;
    if (gear === 0) return 0;

    return GEAR_RATIOS[gear - 1] || 0.72;
  }

  function getGearLabel() {
    if (state.gear === -1) return "R";
    if (state.gear === 0) return "N";

    return String(state.gear);
  }

  function canShift() {
    return !state.shifting && state.shiftTimer <= 0;
  }

  function shiftTo(gear) {
    const target = Number(gear);

    if (!Number.isInteger(target)) {
      return {
        success: false,
        message: "Invalid gear."
      };
    }

    if (!canShift()) {
      return {
        success: false,
        message: "Gear shift in progress."
      };
    }

    if (
      target < -1 ||
      target > config.forwardGears
    ) {
      return {
        success: false,
        message: "Gear not available."
      };
    }

    if (target === -1 && state.speed > 1) {
      return {
        success: false,
        message: "Stop the vehicle before selecting reverse."
      };
    }

    if (target === 1 && state.gear === -1 && state.speed > 1) {
      return {
        success: false,
        message: "Stop before selecting first gear."
      };
    }

    const previous = state.gear;

    if (previous === target) {
      return {
        success: false,
        message: "Already in this gear."
      };
    }

    state.gear = target;
    state.shifting = true;
    state.shiftTimer = 0.22;

    state.rpm = clamp(
      state.rpm * 0.78,
      config.idleRPM,
      config.maxRPM
    );

    window.dispatchEvent(
      new CustomEvent("sx:gear-changed", {
        detail: {
          previous,
          current: target,
          label: getGearLabel()
        }
      })
    );

    return {
      success: true,
      previous,
      current: target,
      label: getGearLabel()
    };
  }

  function shiftUp() {
    if (state.gear === -1) {
      return shiftTo(1);
    }

    if (state.gear >= config.forwardGears) {
      return {
        success: false,
        message: "Highest gear reached."
      };
    }

    return shiftTo(state.gear + 1);
  }

  function shiftDown() {
    if (state.gear === -1) {
      return shiftTo(0);
    }

    if (state.gear <= 1) {
      return {
        success: false,
        message: "Lowest forward gear reached."
      };
    }

    return shiftTo(state.gear - 1);
  }

  function setThrottle(value) {
    state.throttle = clamp(
      Number(value) || 0,
      0,
      1
    );

    return state.throttle;
  }

  function setClutch(value) {
    state.clutch = clamp(
      Number(value) || 0,
      0,
      1
    );

    return state.clutch;
  }

  function update(deltaTime, input) {
    const dt = clamp(
      Number(deltaTime) || 0,
      0,
      0.1
    );

    const data = input || {};

    const speed = Math.max(
      0,
      Number(data.speed) || 0
    );

    const throttle = setThrottle(
      data.throttle !== undefined
        ? data.throttle
        : state.throttle
    );

    if (data.clutch !== undefined) {
      setClutch(data.clutch);
    }

    state.speed = speed;

    if (state.shiftTimer > 0) {
      state.shiftTimer = Math.max(
        0,
        state.shiftTimer - dt
      );

      if (state.shiftTimer === 0) {
        state.shifting = false;
      }
    }

    if (
      config.mode === "automatic" ||
      config.mode === "sport"
    ) {
      if (
        state.gear > 0 &&
        state.rpm >= config.shiftUpRPM &&
        state.gear < config.forwardGears &&
        canShift()
      ) {
        shiftUp();
      } else if (
        state.gear > 1 &&
        state.rpm <= config.shiftDownRPM &&
        canShift()
      ) {
        shiftDown();
      }
    }

    const ratio = getGearRatio(state.gear);

    const speedFactor = clamp(
      speed / 240,
      0,
      1
    );

    let targetRPM;

    if (state.gear === 0) {
      targetRPM =
        config.idleRPM +
        throttle * 3200;
    } else if (state.gear === -1) {
      targetRPM =
        config.idleRPM +
        speedFactor * 4000;
    } else {
      targetRPM =
        config.idleRPM +
        speedFactor *
        ratio *
        config.finalDrive *
        500 +
        throttle * 900;
    }

    if (state.clutch > 0.8) {
      targetRPM =
        config.idleRPM +
        throttle * 3500;
    }

    targetRPM = clamp(
      targetRPM,
      config.idleRPM,
      config.maxRPM
    );

    const response = clamp(
      dt * 5,
      0,
      1
    );

    state.rpm += (
      targetRPM - state.rpm
    ) * response;

    state.rpm = clamp(
      state.rpm,
      config.idleRPM,
      config.maxRPM
    );

    return getState();
  }

  function getState() {
    return {
      mode: config.mode,
      modeLabel: getMode().label,
      gear: state.gear,
      gearLabel: getGearLabel(),
      rpm: Math.round(state.rpm),
      speed: Number(state.speed.toFixed(1)),
      throttle: state.throttle,
      clutch: state.clutch,
      shifting: state.shifting,
      gearRatio: getGearRatio(state.gear),
      maxRPM: config.maxRPM
    };
  }

  function getConfig() {
    return {
      ...config
    };
  }

  function configure(options) {
    if (!options || typeof options !== "object") {
      return false;
    }

    if (
      Number.isInteger(options.forwardGears) &&
      options.forwardGears >= 4 &&
      options.forwardGears <= 10
    ) {
      config.forwardGears = options.forwardGears;
    }

    if (
      Number.isFinite(options.maxRPM) &&
      options.maxRPM >= 4000 &&
      options.maxRPM <= 12000
    ) {
      config.maxRPM = options.maxRPM;
    }

    if (
      Number.isFinite(options.finalDrive) &&
      options.finalDrive >= 1 &&
      options.finalDrive <= 8
    ) {
      config.finalDrive = options.finalDrive;
    }

    config.shiftUpRPM = Math.min(
      config.shiftUpRPM,
      config.maxRPM
    );

    save();

    return true;
  }

  function reset() {
    state = {
      gear: 1,
      rpm: config.idleRPM,
      speed: 0,
      throttle: 0,
      clutch: 0,
      shifting: false,
      shiftTimer: 0,
      initialized: true
    };

    return getState();
  }

  function save() {
    try {
      localStorage.setItem(
        "superx_transmission_settings_v1",
        JSON.stringify(config)
      );
    } catch (error) {
      console.warn(
        "[SUPERX Transmission] Save failed:",
        error
      );
    }
  }

  function load() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(
          "superx_transmission_settings_v1"
        ) || "null"
      );

      if (saved && typeof saved === "object") {
        config = {
          ...DEFAULT_CONFIG,
          ...saved
        };

        if (!MODES[config.mode]) {
          config.mode = "automatic";
        }
      }
    } catch (error) {
      config = { ...DEFAULT_CONFIG };
    }

    reset();

    return getState();
  }

  function init() {
    if (state.initialized) return api;

    load();

    return api;
  }

  const api = {
    init,
    load,
    save,
    setMode,
    getMode,
    shiftTo,
    shiftUp,
    shiftDown,
    setThrottle,
    setClutch,
    update,
    getState,
    getConfig,
    configure,
    reset
  };

  SX.vehicleTransmission = api;

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }

})();

/* =========================================================
   END: VEHICLE TRANSMISSION SYSTEM — FILE 86
   ========================================================= */
            
