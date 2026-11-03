/* =========================================================
   SUPERX LEGEND — FILE 87
   FILE: js/vehicle-driving-assist.js
   PURPOSE: ABS, Traction, Stability, Launch & Cruise Control
   START
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};
  const STORAGE_KEY = "superx_driving_assist_v2";

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
    cruiseThrottle: 0,
    lastSpeed: 0
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function number(value, fallback = 0) {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
  }

  function save() {
    try {
      window.localStorage?.setItem(
        STORAGE_KEY,
        JSON.stringify(settings)
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  function load() {
    try {
      const saved = JSON.parse(
        window.localStorage?.getItem(STORAGE_KEY) || "null"
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

    settings.assistStrength = clamp(
      number(settings.assistStrength, 0.7),
      0,
      1
    );

    settings.cruiseSpeed = clamp(
      number(settings.cruiseSpeed, 100),
      30,
      300
    );

    return getSettings();
  }

  function setAssist(name, enabled) {
    const allowed = [
      "abs",
      "tractionControl",
      "stabilityControl",
      "launchControl"
    ];

    if (!allowed.includes(name)) return false;

    settings[name] = Boolean(enabled);

    if (!settings[name]) {
      if (name === "launchControl") state.launchActive = false;
      if (name === "tractionControl") {
        state.tractionActive = false;
        state.throttleLimit = 1;
      }
      if (name === "stabilityControl") {
        state.stabilityActive = false;
        state.steeringCorrection = 0;
      }
      if (name === "abs") state.absActive = false;
    }

    save();
    dispatch("settings-changed", getSettings());

    return true;
  }

  function setCruiseControl(enabled, speed) {
    if (Number.isFinite(Number(speed))) {
      settings.cruiseSpeed = clamp(
        Number(speed),
        30,
        300
      );
    }

    settings.cruiseControl = Boolean(enabled);
    state.cruiseActive = settings.cruiseControl;

    if (!settings.cruiseControl) {
      state.cruiseThrottle = 0;
    }

    save();
    dispatch("cruise-changed", {
      enabled: settings.cruiseControl,
      speed: settings.cruiseSpeed
    });

    return state.cruiseActive;
  }

  function adjustCruiseSpeed(amount) {
    if (!settings.cruiseControl) return false;

    settings.cruiseSpeed = clamp(
      settings.cruiseSpeed + number(amount),
      30,
      300
    );

    save();

    return settings.cruiseSpeed;
  }

  function activateLaunchControl(speed = 0) {
    if (!settings.launchControl) {
      return {
        success: false,
        message: "Launch Control is disabled."
      };
    }

    if (Math.abs(number(speed)) > 5) {
      return {
        success: false,
        message: "Vehicle speed is too high."
      };
    }

    state.launchActive = true;

    dispatch("launch-activated", {});

    return {
      success: true,
      message: "Launch Control activated."
    };
  }

  function deactivateLaunchControl() {
    state.launchActive = false;
    dispatch("launch-deactivated", {});
    return true;
  }

  function calculateABS(brake, speed) {
    if (!settings.abs) {
      state.absActive = false;
      return brake;
    }

    const speedFactor = clamp(speed / 160, 0, 1);
    const lockRisk = brake * speedFactor;

    state.absActive = lockRisk > 0.55;

    return state.absActive
      ? brake * 0.78
      : brake;
  }

  function calculateTraction(throttle, wheelSlip) {
    if (!settings.tractionControl) {
      state.tractionActive = false;
      state.throttleLimit = 1;
      return throttle;
    }

    const slip = Math.abs(wheelSlip);

    state.tractionActive = slip > 0.18;

    if (!state.tractionActive) {
      state.throttleLimit = 1;
      return throttle;
    }

    const reduction = clamp(
      (slip - 0.18) * settings.assistStrength * 1.5,
      0,
      0.65
    );

    state.throttleLimit = 1 - reduction;

    return throttle * state.throttleLimit;
  }

  function calculateStability(steering, yawRate) {
    if (!settings.stabilityControl) {
      state.stabilityActive = false;
      state.steeringCorrection = 0;
      return 0;
    }

    const yaw = number(yawRate);
    const instability = Math.abs(yaw - steering * 0.35);

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

  function calculateCruise(speed, brake) {
    if (!settings.cruiseControl) {
      state.cruiseActive = false;
      state.cruiseThrottle = 0;
      return null;
    }

    if (brake > 0.05) {
      settings.cruiseControl = false;
      state.cruiseActive = false;
      state.cruiseThrottle = 0;

      save();
      dispatch("cruise-cancelled", {
        reason: "braking"
      });

      return null;
    }

    state.cruiseActive = true;

    const difference = settings.cruiseSpeed - speed;

    state.cruiseThrottle = clamp(
      difference * 0.015,
      -0.25,
      0.25
    );

    return state.cruiseThrottle;
  }

  function update(input = {}) {
    const speed = Math.abs(number(input.speed));
    const throttle = clamp(number(input.throttle), 0, 1);
    const brake = clamp(number(input.brake), 0, 1);
    const steering = clamp(number(input.steering), -1, 1);
    const wheelSlip = number(input.wheelSlip);
    const yawRate = number(input.yawRate);

    const result = {
      brake,
      throttle,
      steering,
      cruiseThrottle: null,
      steeringCorrection: 0
    };

    result.brake = calculateABS(result.brake, speed);

    result.throttle = calculateTraction(
      result.throttle,
      wheelSlip
    );

    result.steeringCorrection = calculateStability(
      result.steering,
      yawRate
    );

    result.cruiseThrottle = calculateCruise(
      speed,
      result.brake
    );

    if (state.launchActive) {
      if (speed < 5 && settings.launchControl) {
        result.throttle = Math.min(result.throttle, 0.85);
      } else {
        state.launchActive = false;
      }
    }

    state.brakePressure = result.brake;
    state.lastSpeed = speed;

    dispatch("update", getState());

    return result;
  }

  function configure(options = {}) {
    if (!options || typeof options !== "object") {
      return false;
    }

    [
      "abs",
      "tractionControl",
      "stabilityControl",
      "launchControl",
      "cruiseControl"
    ].forEach(key => {
      if (typeof options[key] === "boolean") {
        settings[key] = options[key];
      }
    });

    if (Number.isFinite(Number(options.assistStrength))) {
      settings.assistStrength = clamp(
        Number(options.assistStrength),
        0,
        1
      );
    }

    if (Number.isFinite(Number(options.cruiseSpeed))) {
      settings.cruiseSpeed = clamp(
        Number(options.cruiseSpeed),
        30,
        300
      );
    }

    save();
    dispatch("settings-changed", getSettings());

    return true;
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
      cruiseActive: settings.cruiseControl,
      brakePressure: 0,
      throttleLimit: 1,
      steeringCorrection: 0,
      cruiseThrottle: 0,
      lastSpeed: 0
    };

    return getState();
  }

  function dispatch(event, detail = {}) {
    if (typeof window.dispatchEvent !== "function") return;

    window.dispatchEvent(
      new CustomEvent(`sx:driving-assist-${event}`, {
        detail
      })
    );
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

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init, {
        once: true
      });
    } else {
      init();
    }
  }

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 87
   END
========================================================= */
