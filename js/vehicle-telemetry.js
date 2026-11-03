/* =========================================================
   SUPERX LEGEND — FILE 88
   FILE: js/vehicle-telemetry.js
   START: VEHICLE TELEMETRY SYSTEM
   ========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};
  const HISTORY_LIMIT = 600;
  const SAMPLE_INTERVAL = 250;

  const DEFAULTS = {
    speed: 0,
    rpm: 850,
    engineTemperature: 90,
    oilPressure: 3.5,
    batteryVoltage: 12.6,
    fuel: 45,
    throttle: 0,
    brake: 0,
    steering: 0,
    gear: 1,
    engineLoad: 0,
    turboPressure: 0
  };

  let data = { ...DEFAULTS };
  let history = [];
  let started = false;
  let lastSampleTime = 0;
  let sessionStartedAt = 0;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function numeric(value, fallback) {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
  }

  function update(values) {
    if (!values || typeof values !== "object") {
      return getData();
    }

    const limits = {
      speed: [0, 520],
      rpm: [0, 15000],
      engineTemperature: [-20, 180],
      oilPressure: [0, 10],
      batteryVoltage: [0, 20],
      fuel: [0, 100],
      throttle: [0, 1],
      brake: [0, 1],
      steering: [-1, 1],
      gear: [-1, 10],
      engineLoad: [0, 100],
      turboPressure: [0, 5]
    };

    Object.keys(limits).forEach(key => {
      if (values[key] === undefined) return;

      const value = numeric(values[key], data[key]);
      const [min, max] = limits[key];

      data[key] = key === "gear"
        ? Math.trunc(clamp(value, min, max))
        : clamp(value, min, max);
    });

    const now = Date.now();

    if (!lastSampleTime || now - lastSampleTime >= SAMPLE_INTERVAL) {
      addSample(now);
      lastSampleTime = now;
    }

    return getData();
  }

  function addSample(timestamp) {
    history.push({
      time: timestamp,
      speed: data.speed,
      rpm: data.rpm,
      temperature: data.engineTemperature,
      oilPressure: data.oilPressure,
      batteryVoltage: data.batteryVoltage,
      fuel: data.fuel,
      throttle: data.throttle,
      brake: data.brake,
      steering: data.steering,
      gear: data.gear,
      engineLoad: data.engineLoad,
      turboPressure: data.turboPressure
    });

    if (history.length > HISTORY_LIMIT) {
      history.splice(0, history.length - HISTORY_LIMIT);
    }
  }

  function getData() {
    return { ...data };
  }

  function getHistory(limit) {
    const count = Number.isInteger(limit) && limit > 0
      ? limit
      : HISTORY_LIMIT;

    return history.slice(-count).map(item => ({ ...item }));
  }

  function getAverage(key, seconds) {
    const allowed = [
      "speed",
      "rpm",
      "temperature",
      "oilPressure",
      "batteryVoltage",
      "fuel",
      "engineLoad"
    ];

    if (!allowed.includes(key)) return null;

    const duration = Math.max(1, numeric(seconds, 10));
    const cutoff = Date.now() - duration * 1000;

    const samples = history.filter(item => item.time >= cutoff);

    const currentKey = key === "temperature"
      ? "engineTemperature"
      : key;

    if (!samples.length) return data[currentKey];

    const total = samples.reduce(
      (sum, item) => sum + numeric(item[key], 0),
      0
    );

    return Number((total / samples.length).toFixed(2));
  }

  function getWarnings() {
    const warnings = [];

    if (data.engineTemperature >= 115) {
      warnings.push({
        id: "engine-overheat",
        severity: "critical",
        message: "Engine temperature is too high."
      });
    } else if (data.engineTemperature >= 105) {
      warnings.push({
        id: "engine-hot",
        severity: "warning",
        message: "Engine temperature is elevated."
      });
    }

    if (data.oilPressure > 0 && data.oilPressure < 1) {
      warnings.push({
        id: "low-oil-pressure",
        severity: "critical",
        message: "Oil pressure is critically low."
      });
    }

    if (data.batteryVoltage < 11.5) {
      warnings.push({
        id: "low-battery",
        severity: "warning",
        message: "Battery voltage is low."
      });
    }

    if (data.fuel <= 3) {
      warnings.push({
        id: "critical-fuel",
        severity: "critical",
        message: "Fuel level is critically low."
      });
    } else if (data.fuel <= 10) {
      warnings.push({
        id: "low-fuel",
        severity: "warning",
        message: "Fuel level is low."
      });
    }

    if (data.rpm >= 7500) {
      warnings.push({
        id: "high-rpm",
        severity: "warning",
        message: "Engine RPM is very high."
      });
    }

    return warnings;
  }

  function getHealth() {
    const warnings = getWarnings();

    const critical = warnings.some(
      item => item.severity === "critical"
    );

    return {
      status: critical
        ? "critical"
        : warnings.length
          ? "warning"
          : "normal",
      warningCount: warnings.length,
      warnings
    };
  }

  function getDashboard() {
    return {
      speed: data.speed,
      rpm: data.rpm,
      gear: data.gear,
      temperature: data.engineTemperature,
      oilPressure: data.oilPressure,
      battery: data.batteryVoltage,
      fuel: data.fuel,
      throttle: data.throttle,
      brake: data.brake,
      steering: data.steering,
      engineLoad: data.engineLoad,
      turboPressure: data.turboPressure,
      health: getHealth()
    };
  }

  function getSessionStats() {
    if (!history.length) {
      return {
        samples: 0,
        duration: 0,
        maximumSpeed: data.speed,
        maximumRPM: data.rpm,
        averageSpeed: data.speed,
        averageRPM: data.rpm
      };
    }

    const sum = key => history.reduce(
      (total, item) => total + item[key],
      0
    );

    const max = key => history.reduce(
      (value, item) => Math.max(value, item[key]),
      0
    );

    return {
      samples: history.length,
      duration: sessionStartedAt
        ? Math.max(0, Date.now() - sessionStartedAt)
        : 0,
      maximumSpeed: Number(max("speed").toFixed(1)),
      maximumRPM: Math.round(max("rpm")),
      averageSpeed: Number((sum("speed") / history.length).toFixed(1)),
      averageRPM: Math.round(sum("rpm") / history.length)
    };
  }

  function reset() {
    data = { ...DEFAULTS };
    history = [];
    lastSampleTime = 0;
    sessionStartedAt = Date.now();

    return getDashboard();
  }

  function exportData() {
    return {
      exportedAt: new Date().toISOString(),
      vehicle: typeof SX.getSelectedCar === "function"
        ? SX.getSelectedCar()
        : null,
      data: getData(),
      history: getHistory(),
      statistics: getSessionStats(),
      health: getHealth()
    };
  }

  function init() {
    if (started) return api;

    started = true;
    reset();

    return api;
  }

  const api = {
    init,
    update,
    getData,
    getHistory,
    getAverage,
    getWarnings,
    getHealth,
    getDashboard,
    getSessionStats,
    exportData,
    reset
  };

  SX.vehicleTelemetry = api;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

})();

/* =========================================================
   END: VEHICLE TELEMETRY SYSTEM — FILE 88
   ========================================================= */
