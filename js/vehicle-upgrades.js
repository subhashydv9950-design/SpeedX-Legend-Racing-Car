
/* =========================================================
   SUPERX LEGEND — FILE 61
   FILE: js/vehicle-upgrades.js
   PURPOSE: Vehicle performance upgrades and coin economy
   START
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const VehicleUpgrades = {
    storageKey: "superx_vehicle_upgrades_v1",

    categories: {
      engine: {
        name: "Engine",
        maxLevel: 10,
        baseCost: 450,
        multiplier: 1.45,
        effects: {
          power: 5,
          speed: 3
        }
      },

      gearbox: {
        name: "Gearbox",
        maxLevel: 10,
        baseCost: 350,
        multiplier: 1.4,
        effects: {
          acceleration: 4
        }
      },

      turbo: {
        name: "Turbo",
        maxLevel: 10,
        baseCost: 550,
        multiplier: 1.5,
        effects: {
          power: 7,
          speed: 4
        }
      },

      brakes: {
        name: "Brakes",
        maxLevel: 10,
        baseCost: 300,
        multiplier: 1.35,
        effects: {
          braking: 6
        }
      },

      tyres: {
        name: "Tyres",
        maxLevel: 10,
        baseCost: 280,
        multiplier: 1.35,
        effects: {
          handling: 5
        }
      },

      suspension: {
        name: "Suspension",
        maxLevel: 10,
        baseCost: 320,
        multiplier: 1.4,
        effects: {
          handling: 4,
          stability: 5
        }
      },

      steering: {
        name: "Steering",
        maxLevel: 10,
        baseCost: 260,
        multiplier: 1.35,
        effects: {
          handling: 6
        }
      }
    },

    levels: {},

    init() {
      this.load();
      return this.getAll();
    },

    getCarId(carId) {
      if (carId) return String(carId);

      if (
        SX.player &&
        SX.player.selectedCar
      ) {
        return String(SX.player.selectedCar);
      }

      if (typeof SX.getSelectedCar === "function") {
        const car = SX.getSelectedCar();

        if (car && car.id !== undefined) {
          return String(car.id);
        }
      }

      return "default";
    },

    getLevels(carId) {
      const id = this.getCarId(carId);

      if (!this.levels[id]) {
        this.levels[id] = {};

        Object.keys(this.categories).forEach(category => {
          this.levels[id][category] = 0;
        });
      }

      return this.levels[id];
    },

    getUpgradeCost(category, carId) {
      const config = this.categories[category];

      if (!config) return 0;

      const level = this.getLevels(carId)[category];

      if (level >= config.maxLevel) return 0;

      return Math.ceil(
        config.baseCost *
        Math.pow(config.multiplier, level)
      );
    },

    upgrade(category, carId) {
      const config = this.categories[category];

      if (!config) {
        return {
          success: false,
          message: "Invalid upgrade category."
        };
      }

      const id = this.getCarId(carId);
      const levels = this.getLevels(id);
      const currentLevel = levels[category];

      if (currentLevel >= config.maxLevel) {
        return {
          success: false,
          message: "Maximum upgrade level reached."
        };
      }

      const cost = this.getUpgradeCost(category, id);

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

      levels[category]++;

      this.save();

      const result = {
        success: true,
        carId: id,
        category,
        level: levels[category],
        cost,
        effects: config.effects
      };

      this.emit("sx:car-upgraded", result);

      return result;
    },

    getPerformance(carId) {
      const levels = this.getLevels(carId);

      const performance = {
        power: 0,
        speed: 0,
        acceleration: 0,
        braking: 0,
        handling: 0,
        stability: 0
      };

      Object.keys(this.categories).forEach(category => {
        const config = this.categories[category];
        const level = levels[category] || 0;

        Object.keys(config.effects).forEach(stat => {
          performance[stat] +=
            config.effects[stat] * level;
        });
      });

      return performance;
    },

    getAll(carId) {
      const id = this.getCarId(carId);
      const levels = this.getLevels(id);

      return Object.keys(this.categories).map(category => {
        const config = this.categories[category];
        const level = levels[category] || 0;

        return {
          id: category,
          name: config.name,
          level,
          maxLevel: config.maxLevel,
          cost: this.getUpgradeCost(category, id),
          maxed: level >= config.maxLevel,
          effects: { ...config.effects }
        };
      });
    },

    getTotalUpgradeValue(carId) {
      const levels = this.getLevels(carId);
      let total = 0;

      Object.keys(this.categories).forEach(category => {
        const config = this.categories[category];

        for (
          let level = 0;
          level < levels[category];
          level++
        ) {
          total += Math.ceil(
            config.baseCost *
            Math.pow(config.multiplier, level)
          );
        }
      });

      return total;
    },

    resetCar(carId, options = {}) {
      const id = this.getCarId(carId);

      if (!options.free) {
        return {
          success: false,
          message: "Reset requires confirmation and refund policy."
        };
      }

      this.levels[id] = {};

      Object.keys(this.categories).forEach(category => {
        this.levels[id][category] = 0;
      });

      this.save();

      this.emit("sx:car-upgrades-reset", {
        carId: id
      });

      return {
        success: true,
        carId: id
      };
    },

    load() {
      try {
        const raw = localStorage.getItem(this.storageKey);

        if (!raw) return false;

        const data = JSON.parse(raw);

        if (
          !data ||
          typeof data !== "object" ||
          Array.isArray(data)
        ) {
          return false;
        }

        this.levels = data;

        Object.keys(this.levels).forEach(carId => {
          const levels = this.levels[carId];

          Object.keys(this.categories).forEach(category => {
            const value = Number(levels[category]) || 0;

            levels[category] = Math.max(
              0,
              Math.min(
                this.categories[category].maxLevel,
                Math.floor(value)
              )
            );
          });
        });

        return true;
      } catch (error) {
        console.warn(
          "[SUPERX Upgrades] Load failed:",
          error
        );

        return false;
      }
    },

    save() {
      try {
        localStorage.setItem(
          this.storageKey,
          JSON.stringify(this.levels)
        );

        return true;
      } catch (error) {
        console.warn(
          "[SUPERX Upgrades] Save failed:",
          error
        );

        return false;
      }
    },

    emit(name, detail) {
      window.dispatchEvent(
        new CustomEvent(name, { detail })
      );
    }
  };

  SX.vehicleUpgrades = VehicleUpgrades;

  window.addEventListener(
    "DOMContentLoaded",
    () => VehicleUpgrades.init(),
    { once: true }
  );

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 61
   FILE: js/vehicle-upgrades.js
   END
========================================================= */
      
