
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

    createVehicle(id = "player") {
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

    getVehicle(id = this.activeVehicleId) {
      return this.vehicles.get(id) ||
        this.createVehicle(id);
    },

    setActiveVehicle(id) {
      this.activeVehicleId = id;
      return this.getVehicle(id);
    },

    calculateDamage(impact = {}) {
      const speed = Math.max(
        0,
        Number(impact.speed) || 0
      );

      const force = Math.max(
        0,
        Number(impact.force) || 0
      );

      const angle = Number(impact.angle) || 0;

      const baseDamage = (
        speed * 0.12 +
        force * 0.08
      ) * this.settings.collisionMultiplier;

      return {
        total: Math.min(35, baseDamage),
        engine: angle > 140 ? baseDamage * 0.15 : 0,
        body: baseDamage * 0.65,
        tyres: angle > 60 ? baseDamage * 0.12 : 0,
        suspension: baseDamage * 0.08,
        windshield: angle < 45 ? baseDamage * 0.15 : 0
      };
    },

    applyDamage(impact = {}, vehicleId) {
      if (!this.settings.enabled) return null;

      const vehicle = this.getVehicle(
        vehicleId || this.activeVehicleId
      );

      const damage = this.calculateDamage(impact);
      const max = this.settings.maximumDamage;

      vehicle.engine = this.clamp(
        vehicle.engine + damage.engine,
        0,
        max
      );

      vehicle.body = this.clamp(
        vehicle.body + damage.body,
        0,
        max
      );

      vehicle.tyres = this.clamp(
        vehicle.tyres + damage.tyres,
        0,
        max
      );

      vehicle.suspension = this.clamp(
        vehicle.suspension + damage.suspension,
        0,
        max
      );

      vehicle.windshield = this.clamp(
        vehicle.windshield + damage.windshield,
        0,
        max
      );

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

    clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    },

    updateStatus(vehicle) {
      if (vehicle.totalDamage >= 75) {
        vehicle.status = "critical";
      } else if (vehicle.totalDamage >= 45) {
        vehicle.status = "damaged";
      } else if (vehicle.totalDamage >= 15) {
        vehicle.status = "minor";
      } else {
        vehicle.status = "good";
      }
    },

    getPerformanceMultiplier(vehicleId) {
      const vehicle = this.getVehicle(vehicleId);

      if (!this.settings.performanceImpact) {
        return 1;
      }

      const enginePenalty = vehicle.engine * 0.003;
      const tyrePenalty = vehicle.tyres * 0.002;
      const suspensionPenalty =
        vehicle.suspension * 0.0015;

      return this.clamp(
        1 - enginePenalty - tyrePenalty -
        suspensionPenalty,
        0.35,
        1
      );
    },

    getSteeringMultiplier(vehicleId) {
      const vehicle = this.getVehicle(vehicleId);

      if (!this.settings.performanceImpact) {
        return 1;
      }

      return this.clamp(
        1 - vehicle.suspension * 0.004 -
        vehicle.tyres * 0.002,
        0.45,
        1
      );
    },

    getRepairCost(vehicleId) {
      const vehicle = this.getVehicle(vehicleId);

      return Math.ceil(
        vehicle.totalDamage * 18
      );
    },

    repair(vehicleId, options = {}) {
      const vehicle = this.getVehicle(vehicleId);
      const cost = this.getRepairCost(vehicleId);

      if (vehicle.totalDamage <= 0) {
        return {
          success: false,
          message: "Vehicle is already repaired.",
          cost: 0
        };
      }

      if (!options.free) {
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
      }

      vehicle.totalDamage = 0;
      vehicle.engine = 0;
      vehicle.body = 0;
      vehicle.tyres = 0;
      vehicle.suspension = 0;
      vehicle.windshield = 0;
      vehicle.repairCost = cost;
      vehicle.status = "perfect";

      this.emit("sx:vehicle-repaired", {
        vehicleId: vehicle.id,
        cost
      });

      return {
        success: true,
        message: "Vehicle repaired successfully.",
        cost,
        vehicle: this.getSnapshot(vehicle)
      };
    },

    repairPart(vehicleId, part, options = {}) {
      const vehicle = this.getVehicle(vehicleId);

      const allowedParts = [
        "engine",
        "body",
        "tyres",
        "suspension",
        "windshield"
      ];

      if (!allowedParts.includes(part)) {
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

      if (
        !options.free &&
        (
          typeof SX.spendCoins !== "function" ||
          !SX.spendCoins(cost)
        )
      ) {
        return {
          success: false,
          message: "Not enough coins.",
          cost
        };
      }

      vehicle[part] = 0;

      vehicle.totalDamage = Math.max(
        0,
        vehicle.engine +
        vehicle.body +
        vehicle.tyres +
        vehicle.suspension +
        vehicle.windshield
      );

      this.updateStatus(vehicle);

      this.emit("sx:vehicle-part-repaired", {
        vehicleId: vehicle.id,
        part,
        cost
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
      return this.getSnapshot(
        this.getVehicle(vehicleId)
      );
    },

    setEnabled(enabled) {
      this.settings.enabled = Boolean(enabled);
    },

    setCollisionMultiplier(value) {
      this.settings.collisionMultiplier =
        this.clamp(Number(value) || 1, 0, 3);
    },

    emit(name, detail) {
      window.dispatchEvent(
        new CustomEvent(name, { detail })
      );
    },

    reset(vehicleId) {
      if (vehicleId) {
        this.vehicles.delete(vehicleId);
        return this.createVehicle(vehicleId);
      }

      this.vehicles.clear();
      return this.createVehicle("player");
    }
  };

  SX.vehicleDamage = VehicleDamage;

  window.dispatchEvent(
    new CustomEvent("sx:vehicle-damage-ready")
  );

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 58
   FILE: js/vehicle-damage.js
   END
========================================================= */
