
/* =========================================================
   SUPERX LEGEND — FILE 84
   FILE: js/vehicle-maintenance.js
   START: VEHICLE MAINTENANCE SYSTEM
   ========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_vehicle_maintenance_v1";

  const SERVICES = {
    oil: {
      name: "Engine Oil Service",
      interval: 5000,
      cost: 350,
      duration: 5
    },
    gearbox: {
      name: "Gearbox Service",
      interval: 10000,
      cost: 550,
      duration: 8
    },
    brakes: {
      name: "Brake Service",
      interval: 4000,
      cost: 300,
      duration: 4
    },
    tyres: {
      name: "Tyre Inspection",
      interval: 3000,
      cost: 250,
      duration: 3
    },
    suspension: {
      name: "Suspension Service",
      interval: 8000,
      cost: 450,
      duration: 7
    },
    cooling: {
      name: "Cooling System Service",
      interval: 7000,
      cost: 400,
      duration: 6
    },
    battery: {
      name: "Battery Check",
      interval: 6000,
      cost: 200,
      duration: 2
    },
    full: {
      name: "Complete Vehicle Service",
      interval: 10000,
      cost: 1500,
      duration: 15
    }
  };

  let records = {};
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

  function getCarRecords() {
    const id = getCarId();

    if (!records[id]) {
      records[id] = {
        distance: 0,
        services: {},
        history: [],
        lastService: null
      };
    }

    return records[id];
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(records)
      );
    } catch (error) {
      console.warn(
        "[SUPERX Maintenance] Save failed:",
        error
      );
    }
  }

  function load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);

      records = data ? JSON.parse(data) : {};

      if (
        !records ||
        typeof records !== "object" ||
        Array.isArray(records)
      ) {
        records = {};
      }
    } catch (error) {
      records = {};
    }
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
      car.distance - item.lastDistance
    );

    const remaining = Math.max(
      0,
      service.interval - travelled
    );

    const percentage = Math.min(
      100,
      (travelled / service.interval) * 100
    );

    return {
      key,
      name: service.name,
      cost: service.cost,
      interval: service.interval,
      travelled,
      remaining,
      percentage: Math.round(percentage),
      due: remaining <= 0,
      count: item.count || 0
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

  function serviceVehicle(key) {
    const service = getService(key);

    if (!service) {
      return {
        success: false,
        message: "Invalid service type."
      };
    }

    const car = getCarRecords();

    if (
      typeof SX.spendCoins !== "function" ||
      !SX.spendCoins(service.cost)
    ) {
      return {
        success: false,
        message: "Not enough coins."
      };
    }

    car.services[key] = {
      lastDistance: car.distance,
      count: (
        car.services[key]?.count || 0
      ) + 1,
      lastDate: new Date().toISOString()
    };

    const entry = {
      id: "service_" + Date.now(),
      key,
      name: service.name,
      cost: service.cost,
      distance: Math.round(car.distance),
      date: new Date().toISOString()
    };

    car.history.unshift(entry);

    if (car.history.length > 100) {
      car.history.length = 100;
    }

    car.lastService = entry.date;

    save();

    window.dispatchEvent(
      new CustomEvent("sx:vehicle-serviced", {
        detail: {
          carId: getCarId(),
          service: entry
        }
      })
    );

    if (SX.notifications) {
      SX.notifications.success(
        service.name + " completed!"
      );
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

    if (
      typeof SX.spendCoins !== "function" ||
      !SX.spendCoins(total)
    ) {
      return {
        success: false,
        message: "Not enough coins.",
        cost: total
      };
    }

    const now = new Date().toISOString();

    dueServices.forEach(key => {
      car.services[key] = {
        lastDistance: car.distance,
        count: (
          car.services[key]?.count || 0
        ) + 1,
        lastDate: now
      };

      car.history.unshift({
        id: "service_" + key + "_" + Date.now(),
        key,
        name: SERVICES[key].name,
        cost: SERVICES[key].cost,
        distance: Math.round(car.distance),
        date: now
      });
    });

    car.lastService = now;

    save();

    window.dispatchEvent(
      new CustomEvent("sx:vehicle-serviced", {
        detail: {
          carId: getCarId(),
          services: dueServices,
          total
        }
      })
    );

    return {
      success: true,
      services: dueServices,
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
    const statuses = getAllStatuses();

    const due = statuses.filter(item => item.due);

    return {
      carId: getCarId(),
      distance: Math.round(
        getCarRecords().distance
      ),
      totalServices: getCarRecords().history.length,
      dueCount: due.length,
      dueServices: due,
      estimatedCost: due.reduce(
        (sum, item) => sum + item.cost,
        0
      ),
      lastService: getCarRecords().lastService
    };
  }

  function resetCurrentCar() {
    delete records[getCarId()];
    save();

    return true;
  }

  function getCatalog() {
    return Object.entries(SERVICES).map(
      ([key, value]) => ({
        key,
        name: value.name,
        interval: value.interval,
        cost: value.cost,
        duration: value.duration
      })
    );
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
    getStatus,
    getAllStatuses,
    recordDistance,
    serviceVehicle,
    serviceAll,
    getHistory,
    getOverview,
    resetCurrentCar
  };

  SX.vehicleMaintenance = api;

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
   END: VEHICLE MAINTENANCE SYSTEM — FILE 84
   ========================================================= */
