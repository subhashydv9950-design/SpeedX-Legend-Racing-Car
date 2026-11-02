
/* =========================================================
   SUPERX LEGEND — FILE 89
   FILE: js/vehicle-diagnostics.js
   START: VEHICLE DIAGNOSTICS SYSTEM
   ========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_vehicle_diagnostics_v1";

  const SYSTEMS = {
    engine: {
      name: "Engine System",
      checks: [
        "Engine temperature",
        "Engine RPM",
        "Engine load",
        "Oil pressure"
      ]
    },
    battery: {
      name: "Battery System",
      checks: [
        "Battery voltage",
        "Electrical stability"
      ]
    },
    brakes: {
      name: "Brake System",
      checks: [
        "Brake input",
        "ABS availability"
      ]
    },
    transmission: {
      name: "Transmission System",
      checks: [
        "Gear selection",
        "Transmission status"
      ]
    },
    fuel: {
      name: "Fuel System",
      checks: [
        "Fuel level",
        "Fuel system availability"
      ]
    },
    cooling: {
      name: "Cooling System",
      checks: [
        "Engine temperature",
        "Cooling condition"
      ]
    },
    electronics: {
      name: "Electronic Systems",
      checks: [
        "Telemetry availability",
        "Sensor availability"
      ]
    }
  };

  let reports = [];
  let activeFaults = {};
  let lastReport = null;

  function load() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "null"
      );

      if (saved && typeof saved === "object") {
        reports = Array.isArray(saved.reports)
          ? saved.reports
          : [];

        activeFaults =
          saved.activeFaults &&
          typeof saved.activeFaults === "object"
            ? saved.activeFaults
            : {};

        lastReport = saved.lastReport || null;
      }
    } catch (error) {
      reports = [];
      activeFaults = {};
      lastReport = null;
    }
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
    } catch (error) {
      console.warn(
        "[SUPERX Diagnostics] Save failed:",
        error
      );
    }
  }

  function getTelemetry() {
    return SX.vehicleTelemetry &&
      typeof SX.vehicleTelemetry.getData === "function"
      ? SX.vehicleTelemetry.getData()
      : null;
  }

  function checkEngine(data) {
    const issues = [];

    if (data.engineTemperature >= 115) {
      issues.push({
        code: "P0217",
        message: "Engine overheating detected.",
        severity: "critical"
      });
    }

    if (data.rpm >= 7500) {
      issues.push({
        code: "P0219",
        message: "Engine RPM exceeded safe game limit.",
        severity: "warning"
      });
    }

    if (
      data.oilPressure > 0 &&
      data.oilPressure < 1
    ) {
      issues.push({
        code: "P0524",
        message: "Engine oil pressure too low.",
        severity: "critical"
      });
    }

    return issues;
  }

  function checkBattery(data) {
    if (data.batteryVoltage < 11.5) {
      return [{
        code: "P0562",
        message: "System voltage is low.",
        severity: "warning"
      }];
    }

    return [];
  }

  function checkBrakes() {
    const issues = [];

    if (
      SX.vehicleDrivingAssist &&
      typeof SX.vehicleDrivingAssist.getState === "function"
    ) {
      const assist = SX.vehicleDrivingAssist.getState();

      if (!assist.settings.abs) {
        issues.push({
          code: "C0101",
          message: "ABS assistance is disabled.",
          severity: "info"
        });
      }
    }

    return issues;
  }

  function checkTransmission() {
    if (!SX.vehicleTransmission) {
      return [{
        code: "U0100",
        message: "Transmission module unavailable.",
        severity: "info"
      }];
    }

    return [];
  }

  function checkFuel(data) {
    if (data.fuel <= 3) {
      return [{
        code: "P0463",
        message: "Fuel level critically low.",
        severity: "critical"
      }];
    }

    return [];
  }

  function checkCooling(data) {
    if (data.engineTemperature >= 105) {
      return [{
        code: "P0128",
        message: "Cooling system temperature elevated.",
        severity: "warning"
      }];
    }

    return [];
  }

  function checkElectronics() {
    const issues = [];

    if (!SX.vehicleTelemetry) {
      issues.push({
        code: "U0001",
        message: "Telemetry module unavailable.",
        severity: "info"
      });
    }

    return issues;
  }

  function runSystemCheck(systemKey, data) {
    const checks = {
      engine: () => checkEngine(data),
      battery: () => checkBattery(data),
      brakes: () => checkBrakes(),
      transmission: () => checkTransmission(),
      fuel: () => checkFuel(data),
      cooling: () => checkCooling(data),
      electronics: () => checkElectronics()
    };

    if (!checks[systemKey]) {
      return {
        success: false,
        message: "Unknown diagnostic system."
      };
    }

    const issues = checks[systemKey]();

    return {
      success: true,
      system: systemKey,
      name: SYSTEMS[systemKey].name,
      status: getStatus(issues),
      issues
    };
  }

  function getStatus(issues) {
    if (issues.some(x => x.severity === "critical")) {
      return "critical";
    }

    if (issues.some(x => x.severity === "warning")) {
      return "warning";
    }

    if (issues.length) {
      return "notice";
    }

    return "healthy";
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
      system => system.issues.map(issue => ({
        ...issue,
        system: system.system
      }))
    );

    const report = {
      id: "diagnostic_" + Date.now(),
      date: new Date().toISOString(),
      carId: SX.getSelectedCar
        ? (
            SX.getSelectedCar()?.id ||
            SX.getSelectedCar()?.name ||
            "default"
          )
        : "default",
      status: getStatus(issues),
      systems,
      issues,
      issueCount: issues.length,
      healthySystems: systems.filter(
        item => item.status === "healthy"
      ).length
    };

    lastReport = report;

    activeFaults = {};

    issues.forEach(issue => {
      activeFaults[issue.code] = issue;
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
          status: report.status,
          issueCount: report.issueCount
        }
      })
    );

    return {
      success: true,
      report
    };
  }

  function getLastReport() {
    return lastReport
      ? JSON.parse(JSON.stringify(lastReport))
      : null;
  }

  function getReports(limit) {
    const count = Number.isInteger(limit) && limit > 0
      ? limit
      : reports.length;

    return reports.slice(0, count).map(
      report => JSON.parse(JSON.stringify(report))
    );
  }

  function getActiveFaults() {
    return Object.values(activeFaults).map(
      issue => ({ ...issue })
    );
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
    return Object.entries(SYSTEMS).map(
      ([id, system]) => ({
        id,
        name: system.name,
        checks: [...system.checks]
      })
    );
  }

  function resetHistory() {
    reports = [];
    activeFaults = {};
    lastReport = null;

    save();

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
    load();
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
   END: VEHICLE DIAGNOSTICS SYSTEM — FILE 89
   ========================================================= */
      
