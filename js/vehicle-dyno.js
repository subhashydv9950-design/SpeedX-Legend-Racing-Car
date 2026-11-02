
/* =========================================================
   SUPERX LEGEND — FILE 90
   FILE: js/vehicle-dyno.js
   START: VEHICLE DYNO TEST SYSTEM
   ========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_vehicle_dyno_v1";

  const DEFAULT_CONFIG = {
    testDuration: 12,
    sampleInterval: 100,
    maximumRPM: 8000,
    maximumSpeed: 520
  };

  let config = { ...DEFAULT_CONFIG };
  let results = {};
  let activeTest = null;
  let timer = null;

  function getCarId() {
    const car = SX.getSelectedCar
      ? SX.getSelectedCar()
      : null;

    return String(
      car && (car.id || car.name)
        ? car.id || car.name
        : "default"
    );
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          config,
          results
        })
      );
    } catch (error) {
      console.warn("[SUPERX Dyno] Save failed:", error);
    }
  }

  function load() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "null"
      );

      if (saved && typeof saved === "object") {
        config = {
          ...DEFAULT_CONFIG,
          ...(saved.config || {})
        };

        results = saved.results || {};
      }
    } catch (error) {
      config = { ...DEFAULT_CONFIG };
      results = {};
    }
  }

  function getCarSpecifications() {
    const car = SX.getSelectedCar
      ? SX.getSelectedCar()
      : null;

    if (!car) {
      return {
        horsepower: 150,
        torque: 250,
        topSpeed: 240
      };
    }

    return {
      horsepower: Number(
        car.horsepower || car.power || 150
      ),
      torque: Number(car.torque || 250),
      topSpeed: Number(
        car.topSpeed || car.speed || 240
      )
    };
  }

  function getUpgradeMultiplier() {
    if (
      SX.vehiclePerformance &&
      typeof SX.vehiclePerformance.getStats === "function"
    ) {
      const stats = SX.vehiclePerformance.getStats();

      if (stats && Number.isFinite(stats.powerMultiplier)) {
        return clamp(stats.powerMultiplier, 0.5, 3);
      }
    }

    return 1;
  }

  function createPowerCurve(horsepower, torque) {
    const points = [];

    for (let rpm = 1000; rpm <= config.maximumRPM; rpm += 500) {
      const normalized = rpm / config.maximumRPM;

      const torqueFactor = clamp(
        1.1 - normalized * 0.35,
        0.55,
        1.1
      );

      const currentTorque = torque * torqueFactor;

      const currentHP =
        currentTorque * rpm / 7127;

      points.push({
        rpm,
        horsepower: Number(
          Math.min(horsepower, currentHP).toFixed(1)
        ),
        torque: Number(currentTorque.toFixed(1))
      });
    }

    return points;
  }

  function beginTest() {
    if (activeTest) {
      return {
        success: false,
        message: "A dyno test is already running."
      };
    }

    const specs = getCarSpecifications();
    const multiplier = getUpgradeMultiplier();

    activeTest = {
      id: "dyno_" + Date.now(),
      carId: getCarId(),
      startedAt: Date.now(),
      samples: [],
      specs,
      multiplier,
      status: "running"
    };

    activeTest.specs = {
      horsepower: specs.horsepower * multiplier,
      torque: specs.torque * multiplier,
      topSpeed: specs.topSpeed
    };

    activeTest.powerCurve = createPowerCurve(
      activeTest.specs.horsepower,
      activeTest.specs.torque
    );

    window.dispatchEvent(
      new CustomEvent("sx:dyno-started", {
        detail: {
          testId: activeTest.id,
          carId: activeTest.carId
        }
      })
    );

    return {
      success: true,
      testId: activeTest.id,
      message: "Dyno test started."
    };
  }

  function recordSample(values) {
    if (!activeTest) {
      return {
        success: false,
        message: "No active dyno test."
      };
    }

    const data = values || {};

    const sample = {
      time: Date.now(),
      rpm: clamp(
        Number(data.rpm) || 0,
        0,
        config.maximumRPM
      ),
      speed: clamp(
        Number(data.speed) || 0,
        0,
        config.maximumSpeed
      ),
      horsepower: Math.max(
        0,
        Number(data.horsepower) || 0
      ),
      torque: Math.max(
        0,
        Number(data.torque) || 0
      )
    };

    activeTest.samples.push(sample);

    return {
      success: true,
      sample
    };
  }

  function getTestMetrics(test) {
    const samples = test.samples || [];

    const peakRPM = samples.reduce(
      (max, item) => Math.max(max, item.rpm),
      0
    );

    const peakSpeed = samples.reduce(
      (max, item) => Math.max(max, item.speed),
      0
    );

    const peakHP = samples.reduce(
      (max, item) => Math.max(max, item.horsepower),
      test.specs.horsepower
    );

    const peakTorque = samples.reduce(
      (max, item) => Math.max(max, item.torque),
      test.specs.torque
    );

    return {
      peakRPM: Math.round(peakRPM),
      peakSpeed: Number(peakSpeed.toFixed(1)),
      peakHorsepower: Number(peakHP.toFixed(1)),
      peakTorque: Number(peakTorque.toFixed(1))
    };
  }

  function finishTest() {
    if (!activeTest) {
      return {
        success: false,
        message: "No active dyno test."
      };
    }

    const test = activeTest;

    test.status = "completed";
    test.finishedAt = Date.now();
    test.duration = (
      test.finishedAt - test.startedAt
    ) / 1000;

    test.metrics = getTestMetrics(test);

    test.result = {
      testId: test.id,
      carId: test.carId,
      horsepower: Number(
        test.specs.horsepower.toFixed(1)
      ),
      torque: Number(
        test.specs.torque.toFixed(1)
      ),
      topSpeed: test.specs.topSpeed,
      peakRPM: test.metrics.peakRPM,
      measuredPeakSpeed: test.metrics.peakSpeed,
      peakHorsepower: test.metrics.peakHorsepower,
      peakTorque: test.metrics.peakTorque,
      duration: Number(test.duration.toFixed(2)),
      powerCurve: test.powerCurve
    };

    if (!results[test.carId]) {
      results[test.carId] = [];
    }

    results[test.carId].unshift(test.result);

    if (results[test.carId].length > 30) {
      results[test.carId].length = 30;
    }

    activeTest = null;

    save();

    window.dispatchEvent(
      new CustomEvent("sx:dyno-completed", {
        detail: test.result
      })
    );

    return {
      success: true,
      result: test.result
    };
  }

  function cancelTest() {
    if (!activeTest) return false;

    activeTest.status = "cancelled";
    activeTest = null;

    window.dispatchEvent(
      new CustomEvent("sx:dyno-cancelled")
    );

    return true;
  }

  function getLatestResult() {
    const list = results[getCarId()] || [];

    return list.length
      ? JSON.parse(JSON.stringify(list[0]))
      : null;
  }

  function getHistory() {
    return JSON.parse(
      JSON.stringify(results[getCarId()] || [])
    );
  }

  function compareResults(firstId, secondId) {
    const list = results[getCarId()] || [];

    const first = list.find(x => x.testId === firstId);
    const second = list.find(x => x.testId === secondId);

    if (!first || !second) {
      return {
        success: false,
        message: "Test result not found."
      };
    }

    return {
      success: true,
      horsepowerDifference:
        second.horsepower - first.horsepower,
      torqueDifference:
        second.torque - first.torque,
      topSpeedDifference:
        second.topSpeed - first.topSpeed
    };
  }

  function getActiveTest() {
    return activeTest
      ? JSON.parse(JSON.stringify(activeTest))
      : null;
  }

  function getAllVehicleResults() {
    return JSON.parse(JSON.stringify(results));
  }

  function clearCurrentHistory() {
    delete results[getCarId()];
    save();

    return true;
  }

  function configure(options) {
    if (!options || typeof options !== "object") {
      return false;
    }

    if (
      Number.isFinite(options.maximumRPM) &&
      options.maximumRPM >= 3000 &&
      options.maximumRPM <= 15000
    ) {
      config.maximumRPM = options.maximumRPM;
    }

    if (
      Number.isFinite(options.maximumSpeed) &&
      options.maximumSpeed >= 100 &&
      options.maximumSpeed <= 600
    ) {
      config.maximumSpeed = options.maximumSpeed;
    }

    save();

    return true;
  }

  function init() {
    load();
    return api;
  }

  const api = {
    init,
    load,
    save,
    beginTest,
    recordSample,
    finishTest,
    cancelTest,
    getActiveTest,
    getLatestResult,
    getHistory,
    compareResults,
    getAllVehicleResults,
    clearCurrentHistory,
    getCarSpecifications,
    configure
  };

  SX.vehicleDyno = api;

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
   END: VEHICLE DYNO TEST SYSTEM — FILE 90
   ========================================================= */
    
