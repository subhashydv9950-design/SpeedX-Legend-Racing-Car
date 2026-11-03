/* =========================================================
   SUPERX LEGEND — FILE 80
   FILE: js/vehicle-performance.js
   PURPOSE: Vehicle Performance & Upgrade Calculation
   START
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const VehiclePerformance = {
    initialized: false,
    selectedCarId: null,

    baseStats: {
      speed: 240,
      acceleration: 7.5,
      handling: 75,
      braking: 70,
      stability: 75,
      grip: 72
    },

    tuning: {
      engine: 1,
      turbo: 1,
      gearbox: 1,
      brakes: 1,
      tyres: 1,
      suspension: 1,
      steering: 1
    },

    limits: {
      engine: 10,
      turbo: 10,
      gearbox: 10,
      brakes: 10,
      tyres: 10,
      suspension: 10,
      steering: 10
    },

    baseCosts: {
      engine: 350,
      turbo: 450,
      gearbox: 300,
      brakes: 250,
      tyres: 280,
      suspension: 320,
      steering: 260
    },

    multipliers: {
      engine: {
        speed: 1.025,
        acceleration: 1.07
      },
      turbo: {
        speed: 1.035,
        acceleration: 1.09
      },
      gearbox: {
        acceleration: 1.045,
        handling: 1.015
      },
      brakes: {
        braking: 1.065
      },
      tyres: {
        grip: 1.06,
        handling: 1.035
      },
      suspension: {
        stability: 1.055,
        handling: 1.025
      },
      steering: {
        handling: 1.055
      }
    },

    init(options = {}) {
      this.selectedCarId = options.carId
        ? String(options.carId)
        : null;

      this.initialized = true;
      this.resetLevels();
      this.load();

      this.dispatch("initialized", this.getSummary());

      return true;
    },

    resetLevels() {
      Object.keys(this.tuning).forEach(category => {
        this.tuning[category] = 1;
      });
    },

    getCarId() {
      const car = SX.getSelectedCar?.();

      return String(
        this.selectedCarId ||
        car?.id ||
        car?.model ||
        "default"
      );
    },

    selectCar(carId) {
      if (carId == null || String(carId).trim() === "") {
        return false;
      }

      this.selectedCarId = String(carId);
      this.resetLevels();
      this.load();

      this.dispatch("car-changed", this.getSummary());

      return true;
    },

    getUpgradeData() {
      const carId = this.getCarId();
      const saved = SX.player?.performanceTuning?.[carId];

      const result = {};

      Object.keys(this.tuning).forEach(category => {
        const value = Number(saved?.[category]);

        result[category] = Number.isFinite(value)
          ? Math.max(
              1,
              Math.min(
                this.limits[category],
                Math.floor(value)
              )
            )
          : this.tuning[category];
      });

      this.tuning = { ...result };

      return { ...result };
    },

    getBaseStats() {
      const car = SX.getSelectedCar?.();

      return {
        speed: this.readNumber(
          car,
          ["topSpeed", "speed"],
          this.baseStats.speed
        ),
        acceleration: this.readNumber(
          car,
          ["acceleration", "accel"],
          this.baseStats.acceleration
        ),
        handling: this.readNumber(
          car,
          ["handling"],
          this.baseStats.handling
        ),
        braking: this.readNumber(
          car,
          ["braking", "brakes"],
          this.baseStats.braking
        ),
        stability: this.readNumber(
          car,
          ["stability"],
          this.baseStats.stability
        ),
        grip: this.readNumber(
          car,
          ["grip"],
          this.baseStats.grip
        )
      };
    },

    readNumber(object, keys, fallback) {
      if (!object) return fallback;

      for (const key of keys) {
        const value = Number(object[key]);

        if (Number.isFinite(value) && value > 0) {
          return value;
        }
      }

      return fallback;
    },

    calculate() {
      const base = this.getBaseStats();
      const levels = this.getUpgradeData();

      const result = { ...base };

      Object.entries(this.multipliers).forEach(
        ([category, effects]) => {
          const level = levels[category] || 1;
          const extraLevels = Math.max(0, level - 1);

          Object.entries(effects).forEach(([stat, multiplier]) => {
            result[stat] *= Math.pow(
              multiplier,
              extraLevels
            );
          });
        }
      );

      result.speed = Math.min(520, result.speed);
      result.acceleration = Math.max(1, result.acceleration);

      [
        "handling",
        "braking",
        "stability",
        "grip"
      ].forEach(stat => {
        result[stat] = Math.max(
          1,
          Math.min(100, result[stat])
        );
      });

      Object.keys(result).forEach(key => {
        result[key] = Number(result[key].toFixed(2));
      });

      return result;
    },

    getUpgradeCost(category, nextLevel) {
      if (!Object.prototype.hasOwnProperty.call(
        this.baseCosts,
        category
      )) {
        return 0;
      }

      const level = Number(nextLevel);

      if (
        !Number.isInteger(level) ||
        level < 2 ||
        level > this.limits[category]
      ) {
        return 0;
      }

      return Math.round(
        this.baseCosts[category] *
        Math.pow(level - 1, 1.65)
      );
    },

    upgrade(category) {
      if (!this.initialized) {
        return {
          success: false,
          message: "Performance system not initialized."
        };
      }

      if (!Object.prototype.hasOwnProperty.call(
        this.limits,
        category
      )) {
        return {
          success: false,
          message: "Invalid upgrade category."
        };
      }

      const currentLevel = this.getUpgradeData()[category];
      const nextLevel = currentLevel + 1;

      if (nextLevel > this.limits[category]) {
        return {
          success: false,
          message: "Maximum upgrade level reached."
        };
      }

      const cost = this.getUpgradeCost(
        category,
        nextLevel
      );

      if (typeof SX.spendCoins !== "function") {
        return {
          success: false,
          message: "Wallet system unavailable."
        };
      }

      if (SX.spendCoins(cost) !== true) {
        return {
          success: false,
          message: "Not enough coins."
        };
      }

      this.tuning[category] = nextLevel;
      this.save();

      const stats = this.calculate();

      const result = {
        success: true,
        category,
        level: nextLevel,
        cost,
        stats
      };

      this.dispatch("upgraded", result);

      return result;
    },

    setLevel(category, level) {
      if (!Object.prototype.hasOwnProperty.call(
        this.limits,
        category
      )) {
        return false;
      }

      const value = Number(level);

      if (
        !Number.isInteger(value) ||
        value < 1 ||
        value > this.limits[category]
      ) {
        return false;
      }

      this.tuning[category] = value;
      this.save();

      this.dispatch("tuning-changed", {
        category,
        level: value,
        stats: this.calculate()
      });

      return true;
    },

    getSummary() {
      const stats = this.calculate();
      const upgrades = this.getUpgradeData();
      const values = Object.values(upgrades);

      return {
        carId: this.getCarId(),
        stats,
        upgrades,
        overallLevel: Math.round(
          values.reduce((sum, level) => sum + level, 0) /
          Math.max(1, values.length)
        ),
        maximumLevel: 10
      };
    },

    save() {
      if (!SX.player) return false;

      if (!SX.player.performanceTuning) {
        SX.player.performanceTuning = {};
      }

      SX.player.performanceTuning[this.getCarId()] = {
        ...this.tuning
      };

      SX.savePlayer?.();

      return true;
    },

    load() {
      const saved =
        SX.player?.performanceTuning?.[this.getCarId()];

      this.resetLevels();

      if (!saved || typeof saved !== "object") {
        return false;
      }

      Object.keys(this.tuning).forEach(category => {
        const level = Number(saved[category]);

        if (Number.isFinite(level)) {
          this.tuning[category] = Math.max(
            1,
            Math.min(
              this.limits[category],
              Math.floor(level)
            )
          );
        }
      });

      return true;
    },

    reset() {
      this.resetLevels();
      this.save();

      this.dispatch("reset", this.getSummary());

      return true;
    },

    getCategories() {
      return Object.keys(this.limits).map(category => ({
        id: category,
        level: this.tuning[category],
        maxLevel: this.limits[category],
        nextCost: this.getUpgradeCost(
          category,
          this.tuning[category] + 1
        )
      }));
    },

    dispatch(name, detail = {}) {
      window.dispatchEvent(
        new CustomEvent(
          `sx:vehicle-performance-${name}`,
          { detail }
        )
      );
    },

    destroy() {
      this.initialized = false;
      this.selectedCarId = null;
      this.resetLevels();

      return true;
    }
  };

  SX.vehiclePerformance = VehiclePerformance;

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 80
   END
========================================================= */
