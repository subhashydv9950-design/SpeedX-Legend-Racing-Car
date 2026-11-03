/* =========================================================
   SUPERX LEGEND — FILE 58
   FILE: js/vehicle-damage.js
   PURPOSE: Vehicle damage, repair and visual damage state
   START
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const VehicleDamage = {
    vehicles: new Map(),
    activeVehicleId: "player",

    settings: {
      enabled: true,
      collisionMultiplier: 1,
      performanceImpact: true,
      visualImpact: true,
      maximumDamage: 100
    },

    createVehicle(id) {
      id = String(id || "player");

      const vehicle = {
        id,
        totalDamage: 0,
        engine: 0,
        body: 0,
        tyres: 0,
        suspension: 0,
        windshield: 0,
        lastImpact: 0,
        repairCost: 0,
        status: "perfect"
      };

      this.vehicles.set(id, vehicle);
      return vehicle;
    },

    getVehicle(id) {
      id = String(id || this.activeVehicleId);
      return this.vehicles.get(id) || this.createVehicle(id);
    },

    setActiveVehicle(id) {
      this.activeVehicleId = String(id || "player");
      return this.getVehicle(this.activeVehicleId);
    },

    clamp(value, min, max) {
      return Math.max(min, Math.min(max, Number(value) || 0));
    },

    calculateDamage(impact) {
      impact = impact || {};

      const speed = Math.max(0, Number(impact.speed) || 0);
      const force = Math.max(0, Number(impact.force) || 0);
      const angle = Math.abs(Number(impact.angle) || 0);

      const base = this.clamp(
        (speed * 0.12 + force * 0.08) *
        this.settings.collisionMultiplier,
        0,
        35
      );

      return {
        total: base,
        engine: angle > 140 ? base * 0.15 : 0,
        body: base * 0.65,
        tyres: angle > 60 ? base * 0.12 : 0,
        suspension: base * 0.08,
        windshield: angle < 45 ? base * 0.15 : 0
      };
    },

    applyDamage(impact, vehicleId) {
      if (!this.settings.enabled) return null;

      const vehicle = this.getVehicle(vehicleId);
      const damage = this.calculateDamage(impact);
      const max = this.settings.maximumDamage;

      ["engine", "body", "tyres", "suspension", "windshield"]
        .forEach(part => {
          vehicle[part] = this.clamp(
            vehicle[part] + damage[part],
            0,
            max
          );
        });

      vehicle.totalDamage = this.clamp(
        vehicle.engine +
        vehicle.body +
        vehicle.tyres +
        vehicle.suspension +
        vehicle.windshield,
        0,
        max
      );

      vehicle.lastImpact = Date.now();
      this.updateStatus(vehicle);

      this.emit("sx:vehicle-damaged", {
        vehicleId: vehicle.id,
        damage,
        vehicle: this.getSnapshot(vehicle)
      });

      return this.getSnapshot(vehicle);
    },

    updateStatus(vehicle) {
      if (vehicle.totalDamage >= 75) {
        vehicle.status = "critical";
      } else if (vehicle.totalDamage >= 45) {
        vehicle.status = "damaged";
      } else if (vehicle.totalDamage >= 15) {
        vehicle.status = "minor";
      } else if (vehicle.totalDamage > 0) {
        vehicle.status = "good";
      } else {
        vehicle.status = "perfect";
      }
    },

    getPerformanceMultiplier(vehicleId) {
      const vehicle = this.getVehicle(vehicleId);

      if (!this.settings.performanceImpact) return 1;

      const penalty =
        vehicle.engine * 0.003 +
        vehicle.tyres * 0.002 +
        vehicle.suspension * 0.0015;

      return this.clamp(1 - penalty, 0.35, 1);
    },

    getSteeringMultiplier(vehicleId) {
      const vehicle = this.getVehicle(vehicleId);

      if (!this.settings.performanceImpact) return 1;

      return this.clamp(
        1 - vehicle.suspension * 0.004 -
        vehicle.tyres * 0.002,
        0.45,
        1
      );
    },

    getRepairCost(vehicleId) {
      return Math.ceil(this.getVehicle(vehicleId).totalDamage * 18);
    },

    charge(cost, options) {
      if (options && options.free) return true;

      if (typeof SX.spendCoins !== "function") return false;

      return SX.spendCoins(cost) === true;
    },

    repair(vehicleId, options) {
      const vehicle = this.getVehicle(vehicleId);
      options = options || {};

      const cost = this.getRepairCost(vehicle.id);

      if (vehicle.totalDamage <= 0) {
        return {
          success: false,
          message: "Vehicle is already repaired.",
          cost: 0
        };
      }

      if (!this.charge(cost, options)) {
        return {
          success: false,
          message: "Not enough coins.",
          cost
        };
      }

      vehicle.engine = 0;
      vehicle.body = 0;
      vehicle.tyres = 0;
      vehicle.suspension = 0;
      vehicle.windshield = 0;
      vehicle.totalDamage = 0;
      vehicle.repairCost = cost;
      vehicle.status = "perfect";

      this.emit("sx:vehicle-repaired", {
        vehicleId: vehicle.id,
        cost,
        vehicle: this.getSnapshot(vehicle)
      });

      return {
        success: true,
        message: "Vehicle repaired successfully.",
        cost,
        vehicle: this.getSnapshot(vehicle)
      };
    },

    repairPart(vehicleId, part, options) {
      const vehicle = this.getVehicle(vehicleId);
      options = options || {};

      const allowed = [
        "engine",
        "body",
        "tyres",
        "suspension",
        "windshield"
      ];

      if (!allowed.includes(part)) {
        return {
          success: false,
          message: "Invalid vehicle part."
        };
      }

      const damage = vehicle[part];

      if (damage <= 0) {
        return {
          success: false,
          message: "This part does not need repair."
        };
      }

      const cost = Math.ceil(damage * 18);

      if (!this.charge(cost, options)) {
        return {
          success: false,
          message: "Not enough coins.",
          cost
        };
      }

      vehicle[part] = 0;
      vehicle.totalDamage = this.clamp(
        vehicle.engine +
        vehicle.body +
        vehicle.tyres +
        vehicle.suspension +
        vehicle.windshield,
        0,
        this.settings.maximumDamage
      );

      vehicle.repairCost = cost;
      this.updateStatus(vehicle);

      this.emit("sx:vehicle-part-repaired", {
        vehicleId: vehicle.id,
        part,
        cost,
        vehicle: this.getSnapshot(vehicle)
      });

      return {
        success: true,
        part,
        cost,
        vehicle: this.getSnapshot(vehicle)
      };
    },

    getSnapshot(vehicle) {
      return {
        ...vehicle,
        performanceMultiplier:
          this.getPerformanceMultiplier(vehicle.id),
        steeringMultiplier:
          this.getSteeringMultiplier(vehicle.id),
        repairCost: this.getRepairCost(vehicle.id)
      };
    },

    getState(vehicleId) {
      return this.getSnapshot(this.getVehicle(vehicleId));
    },

    setEnabled(enabled) {
      this.settings.enabled = Boolean(enabled);
      return this.settings.enabled;
    },

    setPerformanceImpact(enabled) {
      this.settings.performanceImpact = Boolean(enabled);
      return this.settings.performanceImpact;
    },

    setVisualImpact(enabled) {
      this.settings.visualImpact = Boolean(enabled);
      return this.settings.visualImpact;
    },

    setCollisionMultiplier(value) {
      this.settings.collisionMultiplier = this.clamp(
        value,
        0,
        3
      );

      return this.settings.collisionMultiplier;
    },

    getSettings() {
      return { ...this.settings };
    },

    emit(name, detail) {
      window.dispatchEvent(new CustomEvent(name, {
        detail: detail || {}
      }));
    },

    reset(vehicleId) {
      if (vehicleId) {
        const id = String(vehicleId);
        this.vehicles.delete(id);
        return this.createVehicle(id);
      }

      this.vehicles.clear();
      this.activeVehicleId = "player";
      return this.createVehicle("player");
    }
  };

  SX.vehicleDamage = VehicleDamage;

  window.dispatchEvent(new CustomEvent("sx:vehicle-damage-ready"));

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 58
   FILE: js/vehicle-damage.js
   END
========================================================= */

