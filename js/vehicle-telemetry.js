
/* =========================================================
   SUPERX LEGEND — FILE 88
   FILE: js/vehicle-telemetry.js
   START: VEHICLE TELEMETRY SYSTEM
   ========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const HISTORY_LIMIT = 300;

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

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function numeric(value, fallback) {
    const result = Number(value);

    return Number.isFinite(result)
      ? result
      : fallback;
  }

  function update(values) {
    if (!values || typeof values !== "object") {
      return getData();
    }

    const allowed = [
      "speed",
      "rpm",
      "engineTemperature",
      "oilPressure",
      "batteryVoltage",
      "fuel",
      "throttle",
      "brake",
      "steering",
      "gear",
      "engineLoad",
      "turboPressure"
    ];

    allowed.forEach(key => {
      if (values[key] === undefined) return;

      const value = numeric(
        values[key],
        data[key]
      );

      switch (key) {
        case "speed":
          data[key] = clamp(value, 0, 600);
          break;

        case "rpm":
          data[key] = clamp(value, 0, 15000);
          break;

        case "engineTemperature":
          data[key] = clamp(value, -20, 180);
          break;

        case "oilPressure":
          data[key] = clamp(value, 0, 10);
          break;

        case "batteryVoltage":
          data[key] = clamp(value, 0, 20);
          break;

        case "fuel":
          data[key] = clamp(value, 0, 100);
          break;

        case "throttle":
        case "brake":
          data[key] = clamp(value, 0, 1);
          break;

        case "steering":
          data[key] = clamp(value, -1, 1);
          break;

        case "gear":
          data[key] = Math.trunc(
            clamp(value, -1, 10)
          );
          break;

        case "engineLoad":
          data[key] = clamp(value, 0, 100);
          break;

        case "turboPressure":
          data[key] = clamp(value, 0, 5);
          break;
      }
    });

    const now = Date.now();

    if (now - lastSampleTime >= 250) {
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
      engineLoad: data.engineLoad
    });

    if (history.length > HISTORY_LIMIT) {
      history.shift();
    }
  }

  function getData() {
    return {
      ...data
    };
  }

  function getHistory(limit) {
    const count = Number.isInteger(limit) && limit > 0
      ? limit
      : HISTORY_LIMIT;

    return history.slice(-count).map(item => ({
      ...item
    }));
  }

  function getAverage(key, seconds) {
    const allowed = [
      "speed",
      "rpm",
      "temperature",
      "oilPressure",
      "engineLoad"
    ];

    if (!allowed.includes(key)) return null;

    const duration = Math.max(
      1,
      Number(seconds) || 10
    );

    const cutoff = Date.now() - duration * 1000;

    const samples = history.filter(
      item => item.time >= cutoff
    );

    if (!samples.length) {
      return data[
        key === "temperature"
          ? "engineTemperature"
          : key
      ] ?? null;
    }

    const total = samples.reduce(
      (sum, item) => sum + item[key],
      0
    );

    return Number(
      (total / samples.length).toFixed(2)
    );
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

    if (
      data.oilPressure > 0 &&
      data.oilPressure < 1
    ) {
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

    if (data.fuel <= 10) {
      warnings.push({
        id: "low-fuel",
        severity: data.fuel <= 3
          ? "critical"
          : "warning",
        message: "Fuel level is low."
      });
    }

    if (data.rpm >= 7200) {
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

    const warning = warnings.length > 0;

    return {
      status: critical
        ? "critical"
        : warning
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
      engineLoad: data.engineLoad,
      turboPressure: data.turboPressure,
      health: getHealth()
    };
  }

  function getSessionStats() {
    if (!history.length) {
      return {
        samples: 0,
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

    const max = key => Math.max(
      ...history.map(item => item[key])
    );

    return {
      samples: history.length,
      maximumSpeed: Number(
        max("speed").toFixed(1)
      ),
      maximumRPM: Math.round(max("rpm")),
      averageSpeed: Number(
        (sum("speed") / history.length).toFixed(1)
      ),
      averageRPM: Math.round(
        sum("rpm") / history.length
      )
    };
  }

  function reset() {
    data = { ...DEFAULTS };
    history = [];
    lastSampleTime = 0;

    return getDashboard();
  }

  function exportData() {
    return {
      exportedAt: new Date().toISOString(),
      vehicle: SX.getSelectedCar
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
   END: VEHICLE TELEMETRY SYSTEM — FILE 88
   ========================================================= */
    
