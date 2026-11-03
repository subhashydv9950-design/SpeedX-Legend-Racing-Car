/* =========================================================
   SUPERX LEGEND — FILE 85
   FILE: js/vehicle-fuel.js
   START: VEHICLE FUEL SYSTEM
========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};
  const STORAGE_KEY = "superx_vehicle_fuel_v2";

  const DEFAULT_CONFIG = {
    tankCapacity: 60,
    startingFuel: 45,
    fuelPrice: 8,
    consumptionRate: 0.12
  };

  const FUEL_STATIONS = [
    { id: "station_01", name: "SUPERX Fuel Point", priceMultiplier: 1, available: true },
    { id: "station_02", name: "Highway Fuel Stop", priceMultiplier: 1.1, available: true },
    { id: "station_03", name: "Premium Racing Fuel", priceMultiplier: 1.25, available: true }
  ];

  let vehicles = {};
  let config = { ...DEFAULT_CONFIG };
  let initialized = false;

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent("sx:" + name, {
      detail: detail || {}
    }));
  }

  function getCarId() {
    const car = SX.getSelectedCar ? SX.getSelectedCar() : null;

    return String(
      car && (car.id || car.name)
        ? car.id || car.name
        : "default"
    );
  }

  function createVehicle() {
    return {
      fuel: DEFAULT_CONFIG.startingFuel,
      capacity: DEFAULT_CONFIG.tankCapacity,
      totalFuelUsed: 0,
      totalDistance: 0,
      totalRefuelled: 0,
      lastConsumption: 0,
      engineRunning: false
    };
  }

  function normalizeVehicle(vehicle) {
    const defaults = createVehicle();
    const result = { ...defaults, ...(vehicle || {}) };

    result.capacity = Math.max(1, Number(result.capacity) || defaults.capacity);
    result.fuel = Math.max(0, Math.min(
      result.capacity,
      Number(result.fuel) || 0
    ));

    ["totalFuelUsed", "totalDistance", "totalRefuelled", "lastConsumption"]
      .forEach(key => {
        result[key] = Math.max(0, Number(result[key]) || 0);
      });

    result.engineRunning = Boolean(result.engineRunning && result.fuel > 0);

    return result;
  }

  function getVehicle() {
    const id = getCarId();

    if (!vehicles[id]) {
      vehicles[id] = createVehicle();
    } else {
      vehicles[id] = normalizeVehicle(vehicles[id]);
    }

    return vehicles[id];
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        vehicles,
        config
      }));
      return true;
    } catch (error) {
      console.warn("[SUPERX Fuel] Save failed:", error);
      return false;
    }
  }

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

      if (data && typeof data === "object") {
        if (data.vehicles && typeof data.vehicles === "object") {
          vehicles = data.vehicles;
        }

        if (data.config && typeof data.config === "object") {
          config = {
            ...DEFAULT_CONFIG,
            ...data.config
          };
        }
      }
    } catch (error) {
      vehicles = {};
      config = { ...DEFAULT_CONFIG };
    }

    config.tankCapacity = Math.max(1, Number(config.tankCapacity) || 60);
    config.startingFuel = Math.max(
      0,
      Math.min(config.tankCapacity, Number(config.startingFuel) || 45)
    );
    config.fuelPrice = Math.max(0.01, Number(config.fuelPrice) || 8);
    config.consumptionRate = Math.max(
      0.001,
      Number(config.consumptionRate) || 0.12
    );

    Object.keys(vehicles).forEach(id => {
      vehicles[id] = normalizeVehicle(vehicles[id]);
    });

    return true;
  }

  function getFuelPercentage() {
    const car = getVehicle();

    return Math.round((car.fuel / car.capacity) * 100);
  }

  function calculateRange() {
    const car = getVehicle();
    const rate = car.lastConsumption > 0
      ? car.lastConsumption
      : config.consumptionRate;

    return Math.floor(car.fuel / Math.max(0.001, rate));
  }

  function getFuelStatus() {
    const car = getVehicle();
    const percentage = getFuelPercentage();

    let status = "normal";

    if (percentage <= 10) status = "critical";
    else if (percentage <= 25) status = "low";
    else if (percentage >= 95) status = "full";

    return {
      fuel: Number(car.fuel.toFixed(2)),
      capacity: car.capacity,
      percentage,
      status,
      engineRunning: car.engineRunning,
      remainingDistance: calculateRange()
    };
  }

  function consumeFuel(distance, options) {
    const km = Number(distance);

    if (!Number.isFinite(km) || km <= 0) {
      return { success: false, message: "Invalid distance." };
    }

    const car = getVehicle();
    options = options || {};

    if (car.fuel <= 0) {
      car.fuel = 0;
      car.engineRunning = false;
      save();

      return {
        success: false,
        empty: true,
        consumed: 0,
        message: "Fuel tank is empty."
      };
    }

    const speedFactor = Math.max(0.5, Math.min(
      2.5,
      Number(options.speedFactor) || 1
    ));

    const drivingFactor = Math.max(0.7, Math.min(
      2,
      Number(options.drivingFactor) || 1
    ));

    const requested = km *
      config.consumptionRate *
      speedFactor *
      drivingFactor;

    const actual = Math.min(car.fuel, requested);

    car.fuel = Math.max(0, car.fuel - actual);
    car.totalFuelUsed += actual;
    car.totalDistance += km;
    car.lastConsumption = actual / km;

    if (car.fuel <= 0) {
      car.engineRunning = false;
    }

    save();

    const state = getFuelStatus();
    emit("fuel-updated", state);

    if (state.percentage <= 10) {
      emit("fuel-low", state);
    }

    if (car.fuel <= 0) {
      emit("fuel-empty", state);
    }

    return {
      success: true,
      consumed: Number(actual.toFixed(2)),
      remaining: Number(car.fuel.toFixed(2)),
      empty: car.fuel <= 0
    };
  }

  function refuel(amount, stationId) {
    const car = getVehicle();
    const requested = Number(amount);

    if (!Number.isFinite(requested) || requested <= 0) {
      return { success: false, message: "Enter a valid fuel amount." };
    }

    const station = FUEL_STATIONS.find(
      item => item.id === stationId
    ) || FUEL_STATIONS[0];

    if (!station.available) {
      return { success: false, message: "Fuel station unavailable." };
    }

    const space = car.capacity - car.fuel;

    if (space <= 0) {
      return { success: false, message: "Fuel tank is already full." };
    }

    const actual = Math.min(requested, space);
    const cost = Math.ceil(
      actual * config.fuelPrice * station.priceMultiplier
    );

    if (typeof SX.spendCoins !== "function" || SX.spendCoins(cost) !== true) {
      return {
        success: false,
        message: "Not enough coins.",
        cost
      };
    }

    car.fuel = Math.min(car.capacity, car.fuel + actual);
    car.totalRefuelled += actual;

    save();

    emit("fuel-refuelled", {
      amount: actual,
      cost,
      station: station.name,
      fuel: car.fuel
    });

    if (SX.notifications && SX.notifications.success) {
      SX.notifications.success("Fuel refilled successfully!");
    }

    return {
      success: true,
      amount: Number(actual.toFixed(2)),
      cost,
      fuel: Number(car.fuel.toFixed(2)),
      message: "Refuelling completed."
    };
  }

  function refuelFull(stationId) {
    const car = getVehicle();
    const amount = car.capacity - car.fuel;

    if (amount <= 0) {
      return { success: false, message: "Tank is already full." };
    }

    return refuel(amount, stationId);
  }

  function setEngineRunning(running) {
    const car = getVehicle();

    if (running && car.fuel <= 0) {
      car.engineRunning = false;
      return {
        success: false,
        message: "Cannot start engine: no fuel."
      };
    }

    car.engineRunning = Boolean(running);
    save();

    return {
      success: true,
      running: car.engineRunning
    };
  }

  function getStations() {
    return FUEL_STATIONS.map(station => ({
      ...station,
      pricePerUnit: Number(
        (config.fuelPrice * station.priceMultiplier).toFixed(2)
      )
    }));
  }

  function getStatistics() {
    const car = getVehicle();

    return {
      totalFuelUsed: Number(car.totalFuelUsed.toFixed(2)),
      totalRefuelled: Number(car.totalRefuelled.toFixed(2)),
      totalDistance: Number(car.totalDistance.toFixed(2)),
      averageMileage: car.totalFuelUsed > 0
        ? Number((car.totalDistance / car.totalFuelUsed).toFixed(2))
        : 0,
      currentFuel: Number(car.fuel.toFixed(2)),
      capacity: car.capacity
    };
  }

  function configure(options) {
    if (!options || typeof options !== "object") return false;

    if (Number.isFinite(Number(options.fuelPrice)) &&
        Number(options.fuelPrice) > 0) {
      config.fuelPrice = Number(options.fuelPrice);
    }

    if (Number.isFinite(Number(options.consumptionRate)) &&
        Number(options.consumptionRate) > 0) {
      config.consumptionRate = Number(options.consumptionRate);
    }

    if (Number.isFinite(Number(options.tankCapacity)) &&
        Number(options.tankCapacity) > 0) {
      config.tankCapacity = Number(options.tankCapacity);

      Object.values(vehicles).forEach(car => {
        const oldCapacity = car.capacity;
        car.capacity = config.tankCapacity;
        car.fuel = Math.min(car.fuel, car.capacity);
      });
    }

    save();
    return true;
  }

  function resetCurrentVehicle() {
    vehicles[getCarId()] = createVehicle();
    save();
    return getFuelStatus();
  }

  function init() {
    if (initialized) return api;

    load();
    getVehicle();
    initialized = true;

    return api;
  }

  const api = {
    init,
    load,
    save,
    getVehicle,
    getFuelStatus,
    getFuelPercentage,
    calculateRange,
    consumeFuel,
    refuel,
    refuelFull,
    setEngineRunning,
    getStations,
    getStatistics,
    configure,
    resetCurrentVehicle
  };

  SX.vehicleFuel = api;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

})();

/* =========================================================
   END: VEHICLE FUEL SYSTEM — FILE 85
========================================================= */

