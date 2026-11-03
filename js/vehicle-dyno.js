/* =========================================================
   SUPERX LEGEND — FILE 90
   FILE: js/vehicle-dyno.js
   START: VEHICLE DYNO TEST SYSTEM
   ========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};
  const STORAGE_KEY = "superx_vehicle_dyno_v2";

  const DEFAULT_CONFIG = {
    testDuration: 12,
    sampleInterval: 100,
    maximumRPM: 8000,
    maximumSpeed: 520
  };

  let config = { ...DEFAULT_CONFIG };
  let results = {};
  let activeTest = null;
  let sampleTimer = null;
  let initialized = false;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function number(value, fallback = 0) {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
  }

  function getCarId() {
    const car = typeof SX.getSelectedCar === "function"
      ? SX.getSelectedCar()
      : null;

    return String(car && (car.id || car.name)
      ? car.id || car.name
      : "default");
  }

  function getCarSpecifications() {
    const car = typeof SX.getSelectedCar === "function"
      ? SX.getSelectedCar()
      : null;

    const specs = {
      horsepower: number(car && (car.horsepower || car.power), 150),
      torque: number(car && car.torque, 250),
      topSpeed: number(car && (car.topSpeed || car.speed), 240)
    };

    if (SX.vehiclePerformance &&
        typeof SX.vehiclePerformance.getStats === "function") {
      const stats = SX.vehiclePerformance.getStats();

      if (stats && Number.isFinite(stats.powerMultiplier)) {
        const multiplier = clamp(stats.powerMultiplier, 0.5, 3);
        specs.horsepower *= multiplier;
        specs.torque *= multiplier;
      }
    }

    return specs;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        config,
        results
      }));
      return true;
    } catch (error) {
      console.warn("[SUPERX Dyno] Save failed:", error);
      return false;
    }
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");

      config = {
        ...DEFAULT_CONFIG,
        ...(saved && saved.config || {})
      };

      results = saved && saved.results &&
        typeof saved.results === "object"
        ? saved.results
        : {};
    } catch (error) {
      config = { ...DEFAULT_CONFIG };
      results = {};
    }

    return true;
  }

  function createPowerCurve(horsepower, torque) {
    const points = [];

    for (let rpm = 1000; rpm <= config.maximumRPM; rpm += 250) {
      const ratio = rpm / config.maximumRPM;
      const torqueFactor = clamp(1.1 - ratio * 0.35, 0.55, 1.1);
      const currentTorque = torque * torqueFactor;
      const currentHP = currentTorque * rpm / 7127;

      points.push({
        rpm,
        horsepower: Number(Math.min(horsepower, currentHP).toFixed(1)),
        torque: Number(currentTorque.toFixed(1))
      });
    }

    return points;
  }

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function beginTest() {
    if (activeTest) {
      return { success: false, message: "A dyno test is already running." };
    }

    const specs = getCarSpecifications();

    activeTest = {
      id: "dyno_" + Date.now(),
      carId: getCarId(),
      startedAt: Date.now(),
      samples: [],
      specs,
      powerCurve: createPowerCurve(specs.horsepower, specs.torque),
      status: "running"
    };

    sampleTimer = setInterval(() => {
      if (!activeTest) return;

      const telemetry = SX.vehicleTelemetry &&
        typeof SX.vehicleTelemetry.getData === "function"
        ? SX.vehicleTelemetry.getData()
        : null;

      if (!telemetry) return;

      const rpm = number(telemetry.rpm);
      const torqueFactor = clamp(
        1.1 - rpm / config.maximumRPM * 0.35,
        0.55,
        1.1
      );

      recordSample({
        rpm,
        speed: telemetry.speed,
        horsepower: Math.min(
          specs.horsepower,
          specs.torque * torqueFactor * rpm / 7127
        ),
        torque: specs.torque * torqueFactor
      });
    }, config.sampleInterval);

    emit("sx:dyno-started", {
      testId: activeTest.id,
      carId: activeTest.carId
    });

    return {
      success: true,
      testId: activeTest.id,
      message: "Dyno test started."
    };
  }

  function recordSample(values) {
    if (!activeTest) {
      return { success: false, message: "No active dyno test." };
    }

    const data = values || {};

    const sample = {
      time: Date.now(),
      rpm: clamp(number(data.rpm), 0, config.maximumRPM),
      speed: clamp(number(data.speed), 0, config.maximumSpeed),
      horsepower: Math.max(0, number(data.horsepower)),
      torque: Math.max(0, number(data.torque))
    };

    activeTest.samples.push(sample);

    return { success: true, sample: { ...sample } };
  }

  function getTestMetrics(test) {
    const samples = test.samples || [];

    const maximum = (key, fallback) => samples.reduce(
      (max, item) => Math.max(max, number(item[key])),
      fallback
    );

    return {
      peakRPM: Math.round(maximum("rpm", 0)),
      peakSpeed: Number(maximum("speed", 0).toFixed(1)),
      peakHorsepower: Number(
        maximum("horsepower", test.specs.horsepower).toFixed(1)
      ),
      peakTorque: Number(
        maximum("torque", test.specs.torque).toFixed(1)
      )
    };
  }

  function stopSampling() {
    if (sampleTimer !== null) {
      clearInterval(sampleTimer);
      sampleTimer = null;
    }
  }

  function finishTest() {
    if (!activeTest) {
      return { success: false, message: "No active dyno test." };
    }

    stopSampling();

    const test = activeTest;
    const finishedAt = Date.now();

    test.status = "completed";
    test.finishedAt = finishedAt;
    test.duration = (finishedAt - test.startedAt) / 1000;
    test.metrics = getTestMetrics(test);

    test.result = {
      testId: test.id,
      carId: test.carId,
      date: new Date(finishedAt).toISOString(),
      horsepower: Number(test.specs.horsepower.toFixed(1)),
      torque: Number(test.specs.torque.toFixed(1)),
      topSpeed: test.specs.topSpeed,
      peakRPM: test.metrics.peakRPM,
      measuredPeakSpeed: test.metrics.peakSpeed,
      peakHorsepower: test.metrics.peakHorsepower,
      peakTorque: test.metrics.peakTorque,
      duration: Number(test.duration.toFixed(2)),
      sampleCount: test.samples.length,
      powerCurve: test.powerCurve.map(item => ({ ...item }))
    };

    if (!results[test.carId]) results[test.carId] = [];

    results[test.carId].unshift(test.result);

    if (results[test.carId].length > 30) {
      results[test.carId].length = 30;
    }

    activeTest = null;
    save();

    emit("sx:dyno-completed", test.result);

    return {
      success: true,
      result: JSON.parse(JSON.stringify(test.result))
    };
  }

  function cancelTest() {
    if (!activeTest) return false;

    const testId = activeTest.id;
    stopSampling();
    activeTest = null;

    emit("sx:dyno-cancelled", { testId });

    return true;
  }

  function getActiveTest() {
    return activeTest
      ? JSON.parse(JSON.stringify(activeTest))
      : null;
  }

  function getLatestResult() {
    const list = results[getCarId()] || [];

    return list.length
      ? JSON.parse(JSON.stringify(list[0]))
      : null;
  }

  function getHistory() {
    return JSON.parse(JSON.stringify(results[getCarId()] || []));
  }

  function getAllVehicleResults() {
    return JSON.parse(JSON.stringify(results));
  }

  function compareResults(firstId, secondId) {
    const list = results[getCarId()] || [];
    const first = list.find(item => item.testId === firstId);
    const second = list.find(item => item.testId === secondId);

    if (!first || !second) {
      return { success: false, message: "Test result not found." };
    }

    return {
      success: true,
      horsepowerDifference: second.horsepower - first.horsepower,
      torqueDifference: second.torque - first.torque,
      topSpeedDifference: second.topSpeed - first.topSpeed
    };
  }

  function clearCurrentHistory() {
    delete results[getCarId()];
    save();
    return true;
  }

  function configure(options) {
    if (!options || typeof options !== "object") return false;
    if (activeTest) return false;

    if (Number.isFinite(options.maximumRPM)) {
      config.maximumRPM = clamp(options.maximumRPM, 3000, 15000);
    }

    if (Number.isFinite(options.maximumSpeed)) {
      config.maximumSpeed = clamp(options.maximumSpeed, 100, 600);
    }

    if (Number.isFinite(options.sampleInterval)) {
      config.sampleInterval = clamp(
        Math.round(options.sampleInterval),
        50,
        1000
      );
    }

    return save();
  }

  function getConfig() {
    return { ...config };
  }

  function destroy() {
    stopSampling();
    activeTest = null;
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
    configure,
    getConfig,
    destroy
  };

  SX.vehicleDyno = api;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

})();

/* =========================================================
   END: VEHICLE DYNO TEST SYSTEM — FILE 90
   ========================================================= */
