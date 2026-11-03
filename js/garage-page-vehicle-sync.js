
/* =========================================================
   SUPERX LEGEND
   FILE 150: js/garage-page-vehicle-sync.js
   PURPOSE: Sync selected car details and performance
   START
========================================================= */

(function (window, document) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const GarageVehicleSync = {
    root: null,
    initialized: false,

    elements: {},

    init() {
      if (this.initialized) return true;

      this.root = document.getElementById("garagePage");

      if (!this.root) return false;

      this.cacheElements();
      this.bindEvents();
      this.refresh();

      this.initialized = true;
      return true;
    },

    cacheElements() {
      const ids = [
        "garageCarName",
        "garageCarClass",
        "garageCarPrice",
        "garageTopSpeed",
        "garagePower",
        "garageHandling",
        "garageCarPosition",
        "garageCoinCount",
        "garageSelectCar",
        "garageBuyCar"
      ];

      ids.forEach(id => {
        this.elements[id] = document.getElementById(id);
      });
    },

    getCars() {
      return Array.isArray(SX.CARS) ? SX.CARS : [];
    },

    getSelectedCar() {
      const manager = SX.garageManager;
      const selectedId = manager?.selectedCarId ||
        SX.player?.selectedCar;

      if (selectedId) {
        const found = this.getCars().find(
          car => String(car.id) === String(selectedId)
        );

        if (found) return found;
      }

      if (typeof SX.getSelectedCar === "function") {
        return SX.getSelectedCar();
      }

      return this.getCars()[0] || null;
    },

    getPerformance(car) {
      if (!car) return null;

      const base = {
        topSpeed: Number(car.topSpeed) || 0,
        power: Number(car.power) || 0,
        handling: Number(car.handling) || 0,
        braking: Number(car.braking) || 0,
        acceleration: Number(car.acceleration) || 0
      };

      const upgrades = SX.vehicleUpgrades;

      if (!upgrades) return base;

      const extra = upgrades.getPerformance(car.id);

      const performance = {
        topSpeed: base.topSpeed + extra.speed,
        power: base.power + extra.power,
        handling: base.handling + extra.handling,
        braking: base.braking + extra.braking,
        acceleration: Math.max(
          1,
          base.acceleration - extra.acceleration * 0.01
        )
      };

      const damage = SX.vehicleDamage;

      if (damage) {
        const condition = damage.getPerformanceMultiplier(
          String(car.id)
        );

        performance.topSpeed = Math.round(
          performance.topSpeed * condition
        );

        performance.power = Math.round(
          performance.power * condition
        );
      }

      return performance;
    },

    refresh() {
      const car = this.getSelectedCar();

      if (!car) return false;

      const performance = this.getPerformance(car);

      if (!performance) return false;

      this.setText(
        "garageCarName",
        car.name || "SUPERX VEHICLE"
      );

      this.setText(
        "garageCarClass",
        car.class || car.category || "RACING"
      );

      this.setText(
        "garageTopSpeed",
        performance.topSpeed + " km/h"
      );

      this.setText(
        "garagePower",
        performance.power + " HP"
      );

      this.setText(
        "garageHandling",
        Math.round(performance.handling) + " / 100"
      );

      this.refreshCarPosition(car);
      this.refreshPurchaseButtons(car);
      this.refreshWallet();

      return true;
    },

    setText(id, value) {
      const element = this.elements[id] ||
        document.getElementById(id);

      if (!element) return;

      element.textContent = String(value);
    },

    refreshCarPosition(car) {
      const cars = this.getCars();

      const index = cars.findIndex(
        item => String(item.id) === String(car.id)
      );

      const position = this.elements.garageCarPosition;

      if (position && index >= 0) {
        position.textContent =
          "CAR " +
          String(index + 1).padStart(2, "0") +
          " / " +
          String(cars.length).padStart(2, "0");
      }
    },

    refreshPurchaseButtons(car) {
      const manager = SX.garageManager;

      if (!manager || !car) return;

      const owned = manager.isOwned(car.id);

      const selectButton = this.elements.garageSelectCar;
      const buyButton = this.elements.garageBuyCar;

      if (selectButton) {
        selectButton.disabled = !owned;
        selectButton.textContent = owned
          ? "SELECT THIS CAR"
          : "CAR LOCKED";
      }

      if (buyButton) {
        buyButton.hidden = owned;
        buyButton.disabled = owned;
      }

      const priceElement = this.elements.garageCarPrice;

      if (priceElement) {
        priceElement.textContent = owned
          ? "UNLOCKED"
          : "◆ " + Number(car.price || 0).toLocaleString("en-IN");
      }
    },

    refreshWallet() {
      SX.garagePageWallet?.refresh?.();
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
        "sx:vehicle-repaired",
        () => this.refresh()
      );

      window.addEventListener(
        "sx:vehicle-damaged",
        () => this.refresh()
      );

      window.addEventListener(
        "sx:garage-car-purchased",
        () => this.refresh()
      );

      window.addEventListener(
        "sx:vehicle-customization-changed",
        () => this.refresh()
      );

      window.addEventListener(
        "sx:garage-wallet-refresh",
        () => this.refreshWallet()
      );
    },

    destroy() {
      this.root = null;
      this.elements = {};
      this.initialized = false;
    }
  };

  SX.garageVehicleSync = GarageVehicleSync;

  function start() {
    GarageVehicleSync.init();
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
   FILE 150: js/garage-page-vehicle-sync.js
   END
========================================================= */
