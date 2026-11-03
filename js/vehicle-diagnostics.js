/* =========================================================
   SUPERX LEGEND — FILE 89
   FILE: js/vehicle-diagnostics.js
   START: VEHICLE DIAGNOSTICS SYSTEM
   ========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};
  const STORAGE_KEY = "superx_vehicle_diagnostics_v2";

  const SYSTEMS = {
    engine: {
      name: "Engine System",
      checks: ["Engine temperature", "Engine RPM", "Engine load", "Oil pressure"]
    },
    battery: {
      name: "Battery System",
      checks: ["Battery voltage", "Electrical stability"]
    },
    brakes: {
      name: "Brake System",
      checks: ["Brake input", "ABS availability"]
    },
    transmission: {
      name: "Transmission System",
      checks: ["Gear selection", "Transmission status"]
    },
    fuel: {
      name: "Fuel System",
      checks: ["Fuel level", "Fuel system availability"]
    },
    cooling: {
      name: "Cooling System",
      checks: ["Engine temperature", "Cooling condition"]
    },
    electronics: {
      name: "Electronic Systems",
      checks: ["Telemetry availability", "Sensor availability"]
    }
  };

  let reports = [];
  let activeFaults = {};
  let lastReport = null;
  let initialized = false;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");

      reports = saved && Array.isArray(saved.reports)
        ? saved.reports.slice(0, 50)
        : [];

      activeFaults = saved && saved.activeFaults &&
        typeof saved.activeFaults === "object"
        ? saved.activeFaults
        : {};

      lastReport = saved && saved.lastReport
        ? saved.lastReport
        : null;
    } catch (error) {
      reports = [];
      activeFaults = {};
      lastReport = null;
      console.warn("[SUPERX Diagnostics] Load failed:", error);
    }

    return true;
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          reports,
          activeFaults,
          lastReport
        })
      );
      return true;
    } catch (error) {
      console.warn("[SUPERX Diagnostics] Save failed:", error);
      return false;
    }
  }

  function getSelectedCarId() {
    if (typeof SX.getSelectedCar !== "function") return "default";

    const car = SX.getSelectedCar();

    return String(
      car && (car.id || car.name)
        ? car.id || car.name
        : "default"
    );
  }

  function getTelemetry() {
    const module = SX.vehicleTelemetry;

    if (!module || typeof module.getData !== "function") {
      return null;
    }

    const data = module.getData();

    return data && typeof data === "object" ? data : null;
  }

  function getNumber(data, key, fallback) {
    const value = Number(data && data[key]);

    return Number.isFinite(value) ? value : fallback;
  }

  function issue(code, message, severity, system) {
    return { code, message, severity, system };
  }

  function checkEngine(data) {
    const issues = [];
    const temperature = getNumber(data, "engineTemperature", 0);
    const rpm = getNumber(data, "rpm", 0);
    const oilPressure = getNumber(data, "oilPressure", 0);

    if (temperature >= 115) {
      issues.push(issue(
        "P0217",
        "Engine overheating detected.",
        "critical",
        "engine"
      ));
    }

    if (rpm >= 7500) {
      issues.push(issue(
        "P0219",
        "Engine RPM exceeded the configured game limit.",
        "warning",
        "engine"
      ));
    }

    if (oilPressure > 0 && oilPressure < 1) {
      issues.push(issue(
        "P0524",
        "Engine oil pressure too low.",
        "critical",
        "engine"
      ));
    }

    return issues;
  }

  function checkBattery(data) {
    const voltage = getNumber(data, "batteryVoltage", 12.6);

    if (voltage < 11.5) {
      return [issue(
        "P0562",
        "System voltage is low.",
        "warning",
        "battery"
      )];
    }

    return [];
  }

  function checkBrakes() {
    const assist = SX.vehicleDrivingAssist;

    if (
      assist &&
      typeof assist.getState === "function"
    ) {
      const state = assist.getState();

      if (state && state.settings && state.settings.abs === false) {
        return [issue(
          "C0101",
          "ABS assistance is disabled.",
          "info",
          "brakes"
        )];
      }
    }

    return [];
  }

  function checkTransmission() {
    if (!SX.vehicleTransmission) {
      return [issue(
        "U0100",
        "Transmission module unavailable.",
        "info",
        "transmission"
      )];
    }

    return [];
  }

  function checkFuel(data) {
    const fuel = getNumber(data, "fuel", 100);

    if (fuel <= 3) {
      return [issue(
        "P0463",
        "Fuel level critically low.",
        "critical",
        "fuel"
      )];
    }

    return [];
  }

  function checkCooling(data) {
    const temperature = getNumber(data, "engineTemperature", 0);

    if (temperature >= 105 && temperature < 115) {
      return [issue(
        "P0128",
        "Cooling system temperature elevated.",
        "warning",
        "cooling"
      )];
    }

    return [];
  }

  function checkElectronics() {
    if (!SX.vehicleTelemetry) {
      return [issue(
        "U0001",
        "Telemetry module unavailable.",
        "info",
        "electronics"
      )];
    }

    return [];
  }

  function getStatus(issues) {
    if (issues.some(item => item.severity === "critical")) {
      return "critical";
    }

    if (issues.some(item => item.severity === "warning")) {
      return "warning";
    }

    if (issues.length) return "notice";

    return "healthy";
  }

  function runSystemCheck(systemKey, data) {
    if (!SYSTEMS[systemKey]) {
      return {
        success: false,
        message: "Unknown diagnostic system."
      };
    }

    const checks = {
      engine: () => checkEngine(data),
      battery: () => checkBattery(data),
      brakes: () => checkBrakes(),
      transmission: () => checkTransmission(),
      fuel: () => checkFuel(data),
      cooling: () => checkCooling(data),
      electronics: () => checkElectronics()
    };

    const issues = checks[systemKey]();

    return {
      success: true,
      system: systemKey,
      name: SYSTEMS[systemKey].name,
      status: getStatus(issues),
      issues
    };
  }

  function runFullScan() {
    const data = getTelemetry();

    if (!data) {
      return {
        success: false,
        message: "Vehicle telemetry is unavailable."
      };
    }

    const systems = Object.keys(SYSTEMS).map(
      key => runSystemCheck(key, data)
    );

    const issues = systems.flatMap(
      item => item.issues
    );

    const report = {
      id: "diagnostic_" + Date.now(),
      date: new Date().toISOString(),
      carId: getSelectedCarId(),
      status: getStatus(issues),
      systems,
      issues,
      issueCount: issues.length,
      healthySystems: systems.filter(
        item => item.status === "healthy"
      ).length,
      totalSystems: systems.length
    };

    lastReport = report;

    activeFaults = {};

    issues.forEach(item => {
      activeFaults[item.code] = item;
    });

    reports.unshift(report);

    if (reports.length > 50) {
      reports.length = 50;
    }

    save();

    window.dispatchEvent(
      new CustomEvent("sx:diagnostics-completed", {
        detail: {
          reportId: report.id,
          carId: report.carId,
          status: report.status,
          issueCount: report.issueCount
        }
      })
    );

    return {
      success: true,
      report: clone(report)
    };
  }

  function getLastReport() {
    return lastReport ? clone(lastReport) : null;
  }

  function getReports(limit) {
    const count = Number.isInteger(limit) && limit > 0
      ? limit
      : reports.length;

    return reports.slice(0, count).map(clone);
  }

  function getActiveFaults() {
    return Object.values(activeFaults).map(item => ({ ...item }));
  }

  function clearResolvedFaults() {
    const result = runFullScan();

    if (!result.success) return result;

    return {
      success: true,
      remainingFaults: getActiveFaults(),
      message: "Diagnostic faults refreshed."
    };
  }

  function getSystems() {
    return Object.entries(SYSTEMS).map(([id, system]) => ({
      id,
      name: system.name,
      checks: [...system.checks]
    }));
  }

  function resetHistory() {
    reports = [];
    activeFaults = {};
    lastReport = null;

    save();

    window.dispatchEvent(
      new CustomEvent("sx:diagnostics-reset")
    );

    return true;
  }

  function exportReport() {
    const report = getLastReport();

    if (!report) {
      return {
        success: false,
        message: "No diagnostic report available."
      };
    }

    return {
      success: true,
      filename: "superx-diagnostic-report.json",
      content: JSON.stringify(report, null, 2)
    };
  }

  function init() {
    if (initialized) return api;

    load();
    initialized = true;

    return api;
  }

  const api = {
    init,
    load,
    save,
    getSystems,
    runSystemCheck,
    runFullScan,
    getLastReport,
    getReports,
    getActiveFaults,
    clearResolvedFaults,
    resetHistory,
    exportReport
  };

  SX.vehicleDiagnostics = api;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

})();

/* =========================================================
   END: VEHICLE DIAGNOSTICS SYSTEM — FILE 89
   ========================================================= */
