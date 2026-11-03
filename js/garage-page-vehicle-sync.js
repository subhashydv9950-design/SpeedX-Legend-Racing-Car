/* =========================================================
   SUPERX LEGEND
   FILE 150: js/garage-page-vehicle-sync.js
   PURPOSE: Safe vehicle performance synchronization
   START
========================================================= */

(function (window, document) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const GarageVehicleSync = {
    initialized: false,
    root: null,

    elements: {},

    init() {
      if (this.initialized) return true;

      this.root = document.getElementById("garagePage");
      if (!this.root) return false;

      this.elements = {
        speed: document.getElementById("garageTopSpeed"),
        power: document.getElementById("garagePower"),
        handling: document.getElementById("garageHandling")
      };

      this.bindEvents();
      this.refresh();

      this.initialized = true;
      return true;
    },

    getPreviewCar() {
      const selector = SX.garagePageCarSelector;

      if (selector && typeof selector.getCurrentCar === "function") {
        const previewCar = selector.getCurrentCar();
        if (previewCar) return previewCar;
      }

      const manager = SX.garageManager;
      const selectedId = manager?.selectedCarId ||
        SX.player?.selectedCar;

      const cars = Array.isArray(SX.CARS) ? SX.CARS : [];

      return cars.find(
        car => String(car.id) === String(selectedId)
      ) || cars[0] || null;
    },

    getPerformance(car) {
      if (!car) return null;

      const result = {
        topSpeed: Number(car.topSpeed) || 0,
        power: Number(car.power) || 0,
        handling: Number(car.handling) || 0
      };

      const upgrades = SX.vehicleUpgrades;

      if (upgrades && typeof upgrades.getPerformance === "function") {
        const bonus = upgrades.getPerformance(String(car.id));

        if (bonus) {
          result.topSpeed += Number(bonus.speed) || 0;
          result.power += Number(bonus.power) || 0;
          result.handling += Number(bonus.handling) || 0;
        }
      }

      const damage = SX.vehicleDamage;

      if (
        damage &&
        typeof damage.getPerformanceMultiplier === "function"
      ) {
        const multiplier = Number(
          damage.getPerformanceMultiplier(String(car.id))
        );

        if (Number.isFinite(multiplier)) {
          result.topSpeed *= multiplier;
          result.power *= multiplier;
        }
      }

      result.topSpeed = Math.round(result.topSpeed);
      result.power = Math.round(result.power);
      result.handling = Math.round(result.handling);

      return result;
    },

    refresh() {
      const car = this.getPreviewCar();
      if (!car) return false;

      const stats = this.getPerformance(car);
      if (!stats) return false;

      this.setText("speed", stats.topSpeed + " km/h");
      this.setText("power", stats.power + " HP");
      this.setText("handling", stats.handling + " / 100");

      return true;
    },

    setText(key, value) {
      const element = this.elements[key];
      if (element) element.textContent = String(value);
    },

    bindEvents() {
      const events = [
        "sx:garage-preview-car-changed",
        "sx:garage-car-selected",
        "sx:car-upgraded",
        "sx:vehicle-repaired",
        "sx:vehicle-damaged",
        "sx:garage-car-purchased",
        "sx:car-upgrades-reset"
      ];

      events.forEach(eventName => {
        window.addEventListener(eventName, () => this.refresh());
      });
    },

    destroy() {
      this.initialized = false;
      this.root = null;
      this.elements = {};
    }
  };

  SX.garageVehicleSync = GarageVehicleSync;

  function start() {
    GarageVehicleSync.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

})(window, document);

/* =========================================================
   FILE 150: js/garage-page-vehicle-sync.js
   END
========================================================= */

