
/* =========================================================
   SUPERX LEGEND
   FILE 150: js/garage-page-performance.js
   PURPOSE: Live selected-car performance statistics
   START
========================================================= */

(function (window, document) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const GaragePagePerformance = {
    initialized: false,
    root: null,

    elements: {},

    init() {
      if (this.initialized) return true;

      this.root = document.getElementById("garagePage");
      if (!this.root) return false;

      this.elements = {
        name: document.getElementById("garageCarName"),
        carClass: document.getElementById("garageCarClass"),
        status: document.getElementById("garageVehicleStatus"),
        speed: document.getElementById("garageTopSpeed"),
        power: document.getElementById("garagePower"),
        handling: document.getElementById("garageHandling"),
        position: document.getElementById("garageCarPosition")
      };

      this.bindEvents();
      this.refresh();

      this.initialized = true;
      return true;
    },

    getCarId() {
      return String(
        SX.garageManager?.selectedCarId ||
        SX.player?.selectedCar ||
        "sx-car-01"
      );
    },

    getCar() {
      const id = this.getCarId();

      if (!Array.isArray(SX.CARS)) return null;

      return SX.CARS.find(
        car => String(car.id) === id
      ) || null;
    },

    getUpgradedStats(car) {
      const base = {
        topSpeed: Number(car.topSpeed) || 0,
        power: Number(car.power) || 0,
        handling: Number(car.handling) || 0,
        acceleration: Number(car.acceleration) || 0,
        braking: Number(car.braking) || 0
      };

      const upgrades = SX.vehicleUpgrades;

      if (!upgrades) return base;

      const bonus = upgrades.getPerformance(
        this.getCarId()
      );

      if (!bonus) return base;

      return {
        topSpeed: base.topSpeed + (bonus.speed || 0),
        power: base.power + (bonus.power || 0),
        handling: base.handling + (bonus.handling || 0),
        acceleration: base.acceleration,
        braking: base.braking + (bonus.braking || 0)
      };
    },

    refresh() {
      const car = this.getCar();

      if (!car) {
        this.showUnavailable();
        return false;
      }

      const stats = this.getUpgradedStats(car);
      const index = SX.CARS.findIndex(
        item => String(item.id) === String(car.id)
      );

      this.setText(
        "name",
        car.name || "SUPERX VEHICLE"
      );

      this.setText(
        "carClass",
        String(car.class || "STANDARD").toUpperCase() + " CLASS"
      );

      this.setText(
        "speed",
        Math.round(stats.topSpeed) + " km/h"
      );

      this.setText(
        "power",
        Math.round(stats.power) + " HP"
      );

      this.setText(
        "handling",
        Math.round(stats.handling) + " / 100"
      );

      this.setText(
        "position",
        "CAR " +
        String(index + 1).padStart(2, "0") +
        " / " +
        String(SX.CARS.length).padStart(2, "0")
      );

      this.updateOwnership(car);

      return true;
    },

    updateOwnership(car) {
      const status = this.elements.status;
      if (!status) return;

      const owned = SX.garageManager
        ? SX.garageManager.isOwned(car.id)
        : Boolean(car.unlocked);

      status.textContent = owned ? "OWNED · SELECTED" : "LOCKED";
      status.classList.toggle("is-locked", !owned);
      status.classList.toggle("is-owned", owned);
    },

    setText(key, value) {
      const element = this.elements[key];

      if (element) {
        element.textContent = String(value);
      }
    },

    showUnavailable() {
      this.setText("name", "VEHICLE UNAVAILABLE");
      this.setText("carClass", "--");
      this.setText("speed", "-- km/h");
      this.setText("power", "-- HP");
      this.setText("handling", "--");
      this.setText("position", "CAR -- / --");
      this.setText("status", "UNAVAILABLE");
    },

    bindEvents() {
      window.addEventListener(
        "sx:garage-car-selected",
        () => this.refresh()
      );

      window.addEventListener(
        "sx:car-upgraded",
        () => this.refresh()
      );

      window.addEventListener(
        "sx:garage-car-purchased",
        () => this.refresh()
      );

      window.addEventListener(
        "carSelected",
        () => this.refresh()
      );

      window.addEventListener(
        "garageUpgradePurchased",
        () => this.refresh()
      );
    },

    destroy() {
      this.initialized = false;
      this.root = null;
      this.elements = {};
    }
  };

  SX.garagePagePerformance = GaragePagePerformance;

  function start() {
    GaragePagePerformance.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      { once: true }
    );
  } else {
    start();
  }

})(window, document);

/* =========================================================
   FILE 150: js/garage-page-performance.js
   END
========================================================= */
