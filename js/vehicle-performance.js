
/* =========================================================
   SUPERX LEGEND — FILE 80
   FILE: js/vehicle-performance.js
   PURPOSE: Vehicle performance calculation and tuning
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
      this.selectedCarId = options.carId || null;
      this.initialized = true;

      this.load();

      return true;
    },

    getCarId() {
      const car = SX.getSelectedCar?.();

      return String(
        this.selectedCarId ||
        car?.id ||
        "default"
      );
    },

    getUpgradeData() {
      const carId = this.getCarId();

      const saved =
        SX.player?.performanceTuning?.[carId];

      if (saved && typeof saved === "object") {
        Object.keys(this.tuning).forEach(key => {
          const value = Number(saved[key]);

          if (Number.isFinite(value)) {
            this.tuning[key] = Math.max(
              1,
              Math.min(this.limits[key], Math.floor(value))
            );
          }
        });
      }

      return { ...this.tuning };
    },

    getBaseStats() {
      const car = SX.getSelectedCar?.();

      return {
        speed: this.readNumber(car, ["topSpeed", "speed"], 240),
        acceleration: this.readNumber(
          car,
          ["acceleration", "accel"],
          7.5
        ),
        handling: this.readNumber(car, ["handling"], 75),
        braking: this.readNumber(car, ["braking", "brakes"], 70),
        stability: this.readNumber(car, ["stability"], 75),
        grip: this.readNumber(car, ["grip"], 72)
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
      result.handling = Math.min(100, result.handling);
      result.braking = Math.min(100, result.braking);
      result.stability = Math.min(100, result.stability);
      result.grip = Math.min(100, result.grip);

      result.acceleration = Math.max(
        1,
        Number(result.acceleration.toFixed(2))
      );

      Object.keys(result).forEach(key => {
        result[key] = Number(result[key].toFixed(2));
      });

      return result;
    },

    getUpgradeCost(category, nextLevel) {
      if (!this.limits[category]) return 0;

      const level = Number(nextLevel);

      if (
        !Number.isInteger(level) ||
        level < 2 ||
        level > this.limits[category]
      ) {
        return 0;
      }

      const baseCosts = {
        engine: 350,
        turbo: 450,
        gearbox: 300,
        brakes: 250,
        tyres: 280,
        suspension: 320,
        steering: 260
      };

      return Math.round(
        baseCosts[category] *
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

      if (!this.limits[category]) {
        return {
          success: false,
          message: "Invalid upgrade category."
        };
      }

      const currentLevel = this.tuning[category] || 1;
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

      if (
        typeof SX.spendCoins !== "function" ||
        !SX.spendCoins(cost)
      ) {
        return {
          success: false,
          message: "Not enough coins."
        };
      }

      this.tuning[category] = nextLevel;

      this.save();

      const stats = this.calculate();

      this.dispatch("upgraded", {
        category,
        level: nextLevel,
        cost,
        stats
      });

      return {
        success: true,
        category,
        level: nextLevel,
        cost,
        stats
      };
    },

    setLevel(category, level) {
      if (!this.limits[category]) return false;

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
        level: value
      });

      return true;
    },

    getSummary() {
      const stats = this.calculate();
      const upgrades = this.getUpgradeData();

      return {
        carId: this.getCarId(),
        stats,
        upgrades,
        overallLevel: Math.round(
          Object.values(upgrades).reduce(
            (sum, level) => sum + level,
            0
          ) / Object.keys(upgrades).length
        )
      };
    },

    save() {
      if (!SX.player) return;

      if (!SX.player.performanceTuning) {
        SX.player.performanceTuning = {};
      }

      SX.player.performanceTuning[this.getCarId()] = {
        ...this.tuning
      };

      SX.savePlayer?.();
    },

    load() {
      const saved =
        SX.player?.performanceTuning?.[this.getCarId()];

      if (!saved) return false;

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
      Object.keys(this.tuning).forEach(category => {
        this.tuning[category] = 1;
      });

      this.save();

      this.dispatch("reset", this.getSummary());

      return true;
    },

    dispatch(name, detail) {
      window.dispatchEvent(
        new CustomEvent(`sx:vehicle-performance-${name}`, {
          detail
        })
      );
    },

    destroy() {
      this.initialized = false;
      this.selectedCarId = null;
    }
  };

  SX.vehiclePerformance = VehiclePerformance;

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 80
   FILE: js/vehicle-performance.js
   END
========================================================= */
