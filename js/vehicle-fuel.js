
/* =========================================================
   SUPERX LEGEND — FILE 85
   FILE: js/vehicle-fuel.js
   START: VEHICLE FUEL SYSTEM
   ========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};
  const STORAGE_KEY = "superx_vehicle_fuel_v1";

  const DEFAULT_CONFIG = {
    tankCapacity: 60,
    startingFuel: 45,
    fuelPrice: 8,
    consumptionRate: 0.12
  };

  const FUEL_STATIONS = [
    {
      id: "station_01",
      name: "SUPERX Fuel Point",
      priceMultiplier: 1,
      available: true
    },
    {
      id: "station_02",
      name: "Highway Fuel Stop",
      priceMultiplier: 1.1,
      available: true
    },
    {
      id: "station_03",
      name: "Premium Racing Fuel",
      priceMultiplier: 1.25,
      available: true
    }
  ];

  let vehicles = {};
  let config = { ...DEFAULT_CONFIG };
  let initialized = false;

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

  function getVehicle() {
    const id = getCarId();

    if (!vehicles[id]) {
      vehicles[id] = createVehicle();
    }

    return vehicles[id];
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          vehicles,
          config
        })
      );
    } catch (error) {
      console.warn("[SUPERX Fuel] Save failed:", error);
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) return;

      const data = JSON.parse(raw);

      if (data && typeof data === "object") {
        if (
          data.vehicles &&
          typeof data.vehicles === "object"
        ) {
          vehicles = data.vehicles;
        }

        if (
          data.config &&
          typeof data.config === "object"
        ) {
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
  }

  function getFuelPercentage() {
    const car = getVehicle();

    return Math.round(
      (car.fuel / car.capacity) * 100
    );
  }

  function getFuelStatus() {
    const car = getVehicle();
    const percentage = getFuelPercentage();

    let status = "normal";

    if (percentage <= 10) {
      status = "critical";
    } else if (percentage <= 25) {
      status = "low";
    } else if (percentage >= 95) {
      status = "full";
    }

    return {
      fuel: Number(car.fuel.toFixed(2)),
      capacity: car.capacity,
      percentage,
      status,
      remainingDistance: calculateRange()
    };
  }

  function calculateRange() {
    const car = getVehicle();

    const rate = Math.max(
      0.01,
      config.consumptionRate
    );

    const average = car.lastConsumption > 0
      ? car.lastConsumption
      : rate;

    return Math.floor(car.fuel / average);
  }

  function consumeFuel(distance, options) {
    const km = Number(distance);

    if (!Number.isFinite(km) || km <= 0) {
      return {
        success: false,
        message: "Invalid distance."
      };
    }

    const car = getVehicle();
    const settings = options || {};

    const speedFactor = Math.max(
      0.5,
      Math.min(
        2.5,
        Number(settings.speedFactor) || 1
      )
    );

    const drivingFactor = Math.max(
      0.7,
      Math.min(
        2,
        Number(settings.drivingFactor) || 1
      )
    );

    const consumption =
      km *
      config.consumptionRate *
      speedFactor *
      drivingFactor;

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

    const actual = Math.min(
      car.fuel,
      consumption
    );

    car.fuel = Math.max(
      0,
      car.fuel - actual
    );

    car.totalFuelUsed += actual;
    car.totalDistance += km;

    car.lastConsumption = actual / km;

    if (car.fuel <= 0) {
      car.engineRunning = false;
    }

    save();

    window.dispatchEvent(
      new CustomEvent("sx:fuel-updated", {
        detail: getFuelStatus()
      })
    );

    if (car.fuel <= car.capacity * 0.1) {
      window.dispatchEvent(
        new CustomEvent("sx:fuel-low", {
          detail: getFuelStatus()
        })
      );
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
      return {
        success: false,
        message: "Enter a valid fuel amount."
      };
    }

    const station = FUEL_STATIONS.find(
      item => item.id === stationId
    ) || FUEL_STATIONS[0];

    if (!station.available) {
      return {
        success: false,
        message: "Fuel station unavailable."
      };
    }

    const availableSpace = car.capacity - car.fuel;

    if (availableSpace <= 0) {
      return {
        success: false,
        message: "Fuel tank is already full."
      };
    }

    const actualAmount = Math.min(
      requested,
      availableSpace
    );

    const cost = Math.ceil(
      actualAmount *
      config.fuelPrice *
      station.priceMultiplier
    );

    if (
      typeof SX.spendCoins !== "function" ||
      !SX.spendCoins(cost)
    ) {
      return {
        success: false,
        message: "Not enough coins.",
        cost
      };
    }

    car.fuel += actualAmount;
    car.totalRefuelled += actualAmount;

    save();

    window.dispatchEvent(
      new CustomEvent("sx:fuel-refuelled", {
        detail: {
          amount: actualAmount,
          cost,
          station: station.name,
          fuel: car.fuel
        }
      })
    );

    if (SX.notifications) {
      SX.notifications.success(
        "Fuel refilled successfully!"
      );
    }

    return {
      success: true,
      amount: Number(actualAmount.toFixed(2)),
      cost,
      fuel: Number(car.fuel.toFixed(2)),
      message: "Refuelling completed."
    };
  }

  function refuelFull(stationId) {
    const car = getVehicle();

    const amount = car.capacity - car.fuel;

    if (amount <= 0) {
      return {
        success: false,
        message: "Tank is already full."
      };
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
        (
          config.fuelPrice *
          station.priceMultiplier
        ).toFixed(2)
      )
    }));
  }

  function getStatistics() {
    const car = getVehicle();

    return {
      totalFuelUsed: Number(
        car.totalFuelUsed.toFixed(2)
      ),
      totalRefuelled: Number(
        car.totalRefuelled.toFixed(2)
      ),
      totalDistance: Number(
        car.totalDistance.toFixed(2)
      ),
      averageMileage:
        car.totalFuelUsed > 0
          ? Number(
              (
                car.totalDistance /
                car.totalFuelUsed
              ).toFixed(2)
            )
          : 0,
      currentFuel: Number(car.fuel.toFixed(2)),
      capacity: car.capacity
    };
  }

  function configure(options) {
    if (!options || typeof options !== "object") {
      return false;
    }

    if (
      Number.isFinite(Number(options.fuelPrice)) &&
      Number(options.fuelPrice) > 0
    ) {
      config.fuelPrice = Number(options.fuelPrice);
    }

    if (
      Number.isFinite(Number(options.consumptionRate)) &&
      Number(options.consumptionRate) > 0
    ) {
      config.consumptionRate = Number(
        options.consumptionRate
      );
    }

    save();

    return true;
  }

  function resetCurrentVehicle() {
    delete vehicles[getCarId()];
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
   END: VEHICLE FUEL SYSTEM — FILE 85
   ========================================================= */
      
