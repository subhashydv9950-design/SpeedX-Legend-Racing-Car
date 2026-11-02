
/* =========================================================
   SUPERX LEGEND — FILE 87
   FILE: js/vehicle-driving-assist.js
   START: VEHICLE DRIVING ASSIST SYSTEM
   ========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_driving_assist_v1";

  const DEFAULT_SETTINGS = {
    abs: true,
    tractionControl: true,
    stabilityControl: true,
    launchControl: false,
    cruiseControl: false,
    cruiseSpeed: 100,
    assistStrength: 0.7
  };

  let settings = { ...DEFAULT_SETTINGS };

  let state = {
    absActive: false,
    tractionActive: false,
    stabilityActive: false,
    launchActive: false,
    cruiseActive: false,
    brakePressure: 0,
    throttleLimit: 1,
    steeringCorrection: 0,
    lastSpeed: 0
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(settings)
      );
    } catch (error) {
      console.warn(
        "[SUPERX Driving Assist] Save failed:",
        error
      );
    }
  }

  function load() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "null"
      );

      if (saved && typeof saved === "object") {
        settings = {
          ...DEFAULT_SETTINGS,
          ...saved
        };
      }
    } catch (error) {
      settings = { ...DEFAULT_SETTINGS };
    }

    return getSettings();
  }

  function setAssist(name, enabled) {
    const allowed = [
      "abs",
      "tractionControl",
      "stabilityControl",
      "launchControl"
    ];

    if (!allowed.includes(name)) {
      return false;
    }

    settings[name] = Boolean(enabled);

    if (
      name === "launchControl" &&
      !settings.launchControl
    ) {
      state.launchActive = false;
    }

    save();

    return true;
  }

  function setCruiseControl(enabled, speed) {
    settings.cruiseControl = Boolean(enabled);

    if (Number.isFinite(Number(speed))) {
      settings.cruiseSpeed = clamp(
        Number(speed),
        30,
        300
      );
    }

    state.cruiseActive =
      settings.cruiseControl;

    save();

    return state.cruiseActive;
  }

  function adjustCruiseSpeed(amount) {
    if (!settings.cruiseControl) return false;

    settings.cruiseSpeed = clamp(
      settings.cruiseSpeed + Number(amount || 0),
      30,
      300
    );

    save();

    return settings.cruiseSpeed;
  }

  function activateLaunchControl(speed) {
    if (!settings.launchControl) {
      return {
        success: false,
        message: "Launch Control is disabled."
      };
    }

    if (Number(speed) > 5) {
      return {
        success: false,
        message: "Vehicle speed is too high."
      };
    }

    state.launchActive = true;

    return {
      success: true,
      message: "Launch Control activated."
    };
  }

  function deactivateLaunchControl() {
    state.launchActive = false;
    return true;
  }

  function calculateABS(input) {
    if (!settings.abs) {
      state.absActive = false;
      return input.brake;
    }

    const lockRisk = clamp(
      input.brake * input.speedFactor,
      0,
      1
    );

    state.absActive = lockRisk > 0.55;

    if (state.absActive) {
      return input.brake * 0.78;
    }

    return input.brake;
  }

  function calculateTraction(input) {
    if (!settings.tractionControl) {
      state.tractionActive = false;
      state.throttleLimit = 1;
      return input.throttle;
    }

    const slip = Math.abs(input.wheelSlip || 0);

    state.tractionActive = slip > 0.18;

    if (!state.tractionActive) {
      state.throttleLimit = 1;
      return input.throttle;
    }

    const reduction = clamp(
      slip * settings.assistStrength,
      0,
      0.65
    );

    state.throttleLimit = 1 - reduction;

    return input.throttle * state.throttleLimit;
  }

  function calculateStability(input) {
    if (!settings.stabilityControl) {
      state.stabilityActive = false;
      state.steeringCorrection = 0;

      return 0;
    }

    const yaw = Number(input.yawRate) || 0;
    const steering = Number(input.steering) || 0;

    const instability = Math.abs(
      yaw - steering * 0.35
    );

    state.stabilityActive = instability > 0.35;

    if (!state.stabilityActive) {
      state.steeringCorrection = 0;
      return 0;
    }

    const correction = clamp(
      -yaw * settings.assistStrength * 0.2,
      -0.3,
      0.3
    );

    state.steeringCorrection = correction;

    return correction;
  }

  function calculateCruise(input) {
    if (!settings.cruiseControl) {
      state.cruiseActive = false;
      return null;
    }

    if (input.brake > 0.05) {
      state.cruiseActive = false;
      settings.cruiseControl = false;
      save();

      return null;
    }

    state.cruiseActive = true;

    const difference =
      settings.cruiseSpeed - input.speed;

    return clamp(
      difference * 0.015,
      -0.25,
      0.25
    );
  }

  function update(input) {
    const data = input || {};

    const speed = Math.max(
      0,
      Number(data.speed) || 0
    );

    const result = {
      brake: clamp(
        Number(data.brake) || 0,
        0,
        1
      ),
      throttle: clamp(
        Number(data.throttle) || 0,
        0,
        1
      ),
      steering: clamp(
        Number(data.steering) || 0,
        -1,
        1
      ),
      cruiseThrottle: null,
      steeringCorrection: 0
    };

    const speedFactor = clamp(
      speed / 160,
      0,
      1
    );

    result.brake = calculateABS({
      brake: result.brake,
      speedFactor
    });

    result.throttle = calculateTraction({
      throttle: result.throttle,
      wheelSlip: Number(data.wheelSlip) || 0
    });

    result.steeringCorrection = calculateStability({
      yawRate: Number(data.yawRate) || 0,
      steering: result.steering
    });

    result.cruiseThrottle = calculateCruise({
      speed,
      brake: result.brake
    });

    if (state.launchActive && speed < 5) {
      result.throttle = Math.min(
        result.throttle,
        0.85
      );
    } else {
      state.launchActive = false;
    }

    state.brakePressure = result.brake;
    state.lastSpeed = speed;

    window.dispatchEvent(
      new CustomEvent("sx:driving-assist-update", {
        detail: getState()
      })
    );

    return result;
  }

  function getSettings() {
    return { ...settings };
  }

  function getState() {
    return {
      ...state,
      settings: getSettings()
    };
  }

  function reset() {
    state = {
      absActive: false,
      tractionActive: false,
      stabilityActive: false,
      launchActive: false,
      cruiseActive: false,
      brakePressure: 0,
      throttleLimit: 1,
      steeringCorrection: 0,
      lastSpeed: 0
    };

    return getState();
  }

  function configure(options) {
    if (!options || typeof options !== "object") {
      return false;
    }

    [
      "abs",
      "tractionControl",
      "stabilityControl",
      "launchControl"
    ].forEach(key => {
      if (typeof options[key] === "boolean") {
        settings[key] = options[key];
      }
    });

    if (Number.isFinite(options.assistStrength)) {
      settings.assistStrength = clamp(
        options.assistStrength,
        0,
        1
      );
    }

    save();

    return true;
  }

  function init() {
    load();
    reset();
    return api;
  }

  const api = {
    init,
    load,
    save,
    setAssist,
    setCruiseControl,
    adjustCruiseSpeed,
    activateLaunchControl,
    deactivateLaunchControl,
    update,
    getSettings,
    getState,
    configure,
    reset
  };

  SX.vehicleDrivingAssist = api;

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
   END: VEHICLE DRIVING ASSIST SYSTEM — FILE 87
   ========================================================= */
