/* =========================================================
   SUPERX LEGEND — FILE 84
   FILE: js/vehicle-maintenance.js
   START: VEHICLE MAINTENANCE SYSTEM
   ========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};
  const STORAGE_KEY = "superx_vehicle_maintenance_v2";

  const SERVICES = {
    oil: { name: "Engine Oil Service", interval: 5000, cost: 350, duration: 5 },
    gearbox: { name: "Gearbox Service", interval: 10000, cost: 550, duration: 8 },
    brakes: { name: "Brake Service", interval: 4000, cost: 300, duration: 4 },
    tyres: { name: "Tyre Inspection", interval: 3000, cost: 250, duration: 3 },
    suspension: { name: "Suspension Service", interval: 8000, cost: 450, duration: 7 },
    cooling: { name: "Cooling System Service", interval: 7000, cost: 400, duration: 6 },
    battery: { name: "Battery Check", interval: 6000, cost: 200, duration: 2 },
    full: { name: "Complete Vehicle Service", interval: 10000, cost: 1500, duration: 15 }
  };

  let records = {};
  let initialized = false;

  function getCarId() {
    const car = typeof SX.getSelectedCar === "function"
      ? SX.getSelectedCar()
      : null;

    return String(
      car && (car.id || car.name)
        ? car.id || car.name
        : "default"
    );
  }

  function createRecord() {
    return {
      distance: 0,
      services: {},
      history: [],
      lastService: null,
      totalSpent: 0
    };
  }

  function getCarRecords() {
    const id = getCarId();

    if (!records[id]) {
      records[id] = createRecord();
    }

    return records[id];
  }

  function normalizeRecord(record) {
    if (!record || typeof record !== "object") {
      return createRecord();
    }

    return {
      distance: Math.max(0, Number(record.distance) || 0),
      services: record.services && typeof record.services === "object"
        ? record.services
        : {},
      history: Array.isArray(record.history)
        ? record.history.slice(0, 100)
        : [],
      lastService: record.lastService || null,
      totalSpent: Math.max(0, Number(record.totalSpent) || 0)
    };
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(records)
      );
      return true;
    } catch (error) {
      console.warn("[SUPERX Maintenance] Save failed:", error);
      return false;
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : {};

      records = {};

      if (data && typeof data === "object" && !Array.isArray(data)) {
        Object.keys(data).forEach(id => {
          records[id] = normalizeRecord(data[id]);
        });
      }
    } catch (error) {
      records = {};
      console.warn("[SUPERX Maintenance] Load failed:", error);
    }

    return records;
  }

  function getService(key) {
    return SERVICES[key] || null;
  }

  function getStatus(key) {
    const service = getService(key);
    if (!service) return null;

    const car = getCarRecords();
    const item = car.services[key] || {
      lastDistance: 0,
      count: 0
    };

    const travelled = Math.max(
      0,
      car.distance - (Number(item.lastDistance) || 0)
    );

    const remaining = Math.max(
      0,
      service.interval - travelled
    );

    return {
      key,
      name: service.name,
      cost: service.cost,
      interval: service.interval,
      duration: service.duration,
      travelled: Math.round(travelled),
      remaining: Math.round(remaining),
      percentage: Math.min(
        100,
        Math.round((travelled / service.interval) * 100)
      ),
      due: remaining <= 0,
      count: Number(item.count) || 0,
      lastDate: item.lastDate || null
    };
  }

  function getAllStatuses() {
    return Object.keys(SERVICES).map(getStatus);
  }

  function recordDistance(kilometres) {
    const amount = Number(kilometres);

    if (!Number.isFinite(amount) || amount <= 0) {
      return getCarRecords().distance;
    }

    const car = getCarRecords();
    car.distance += amount;

    save();

    return car.distance;
  }

  function canAfford(cost) {
    return (
      typeof SX.spendCoins === "function" &&
      SX.spendCoins(cost) === true
    );
  }

  function addHistory(car, key, service, date) {
    const entry = {
      id: "service_" + key + "_" + Date.now() + "_" +
        Math.random().toString(36).slice(2, 7),
      key,
      name: service.name,
      cost: service.cost,
      distance: Math.round(car.distance),
      date
    };

    car.history.unshift(entry);

    if (car.history.length > 100) {
      car.history.length = 100;
    }

    return entry;
  }

  function markServiced(car, key, date) {
    const previous = car.services[key] || {};

    car.services[key] = {
      lastDistance: car.distance,
      count: (Number(previous.count) || 0) + 1,
      lastDate: date
    };
  }

  function emitServiceEvent(detail) {
    window.dispatchEvent(
      new CustomEvent("sx:vehicle-serviced", {
        detail
      })
    );
  }

  function serviceVehicle(key) {
    const service = getService(key);

    if (!service) {
      return {
        success: false,
        message: "Invalid service type."
      };
    }

    const car = getCarRecords();

    if (!canAfford(service.cost)) {
      return {
        success: false,
        message: "Not enough coins.",
        cost: service.cost
      };
    }

    const now = new Date().toISOString();

    if (key === "full") {
      Object.keys(SERVICES).forEach(serviceKey => {
        if (serviceKey !== "full") {
          markServiced(car, serviceKey, now);
        }
      });
    }

    markServiced(car, key, now);

    const entry = addHistory(car, key, service, now);

    car.lastService = now;
    car.totalSpent += service.cost;

    save();

    emitServiceEvent({
      carId: getCarId(),
      service: entry,
      fullService: key === "full"
    });

    if (SX.notifications && typeof SX.notifications.success === "function") {
      SX.notifications.success(service.name + " completed!");
    }

    return {
      success: true,
      service: entry,
      message: "Service completed successfully."
    };
  }

  function serviceAll() {
    const car = getCarRecords();

    const dueServices = Object.keys(SERVICES)
      .filter(key => key !== "full")
      .filter(key => getStatus(key).due);

    if (!dueServices.length) {
      return {
        success: false,
        message: "No service is currently due."
      };
    }

    const total = dueServices.reduce(
      (sum, key) => sum + SERVICES[key].cost,
      0
    );

    if (!canAfford(total)) {
      return {
        success: false,
        message: "Not enough coins.",
        cost: total
      };
    }

    const now = new Date().toISOString();
    const completed = [];

    dueServices.forEach(key => {
      markServiced(car, key, now);

      completed.push(
        addHistory(car, key, SERVICES[key], now)
      );
    });

    car.lastService = now;
    car.totalSpent += total;

    save();

    emitServiceEvent({
      carId: getCarId(),
      services: completed,
      total
    });

    if (SX.notifications && typeof SX.notifications.success === "function") {
      SX.notifications.success("All due services completed!");
    }

    return {
      success: true,
      services: completed,
      total,
      message: "All due services completed."
    };
  }

  function getHistory(limit) {
    const history = getCarRecords().history;

    return history.slice(
      0,
      Number.isInteger(limit) && limit > 0
        ? limit
        : history.length
    );
  }

  function getOverview() {
    const car = getCarRecords();
    const statuses = getAllStatuses();
    const due = statuses.filter(item => item.due);

    return {
      carId: getCarId(),
      distance: Math.round(car.distance),
      totalServices: car.history.length,
      totalSpent: car.totalSpent,
      dueCount: due.length,
      dueServices: due,
      estimatedCost: due.reduce(
        (sum, item) => sum + item.cost,
        0
      ),
      lastService: car.lastService
    };
  }

  function getCatalog() {
    return Object.entries(SERVICES).map(([key, value]) => ({
      key,
      name: value.name,
      interval: value.interval,
      cost: value.cost,
      duration: value.duration
    }));
  }

  function resetCurrentCar() {
    delete records[getCarId()];
    save();
    return true;
  }

  function resetAll() {
    records = {};
    save();
    return true;
  }

  function init() {
    if (initialized) return api;

    load();
    getCarRecords();

    initialized = true;
    return api;
  }

  const api = {
    init,
    load,
    save,
    getCatalog,
    getService,
    getStatus,
    getAllStatuses,
    recordDistance,
    serviceVehicle,
    serviceAll,
    getHistory,
    getOverview,
    resetCurrentCar,
    resetAll
  };

  SX.vehicleMaintenance = api;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

})();

/* =========================================================
   END: VEHICLE MAINTENANCE SYSTEM — FILE 84
   ========================================================= */
