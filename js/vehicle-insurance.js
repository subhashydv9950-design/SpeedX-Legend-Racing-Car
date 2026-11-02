
/* =========================================================
   SUPERX LEGEND — FILE 82
   FILE: js/vehicle-insurance.js
   PURPOSE: Vehicle protection, repair plans and service records
   START
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const VehicleInsurance = {
    initialized: false,

    plans: [
      {
        id: "basic",
        name: "Basic Protection",
        price: 500,
        repairDiscount: 0.15,
        duration: 7
      },
      {
        id: "premium",
        name: "Premium Protection",
        price: 1200,
        repairDiscount: 0.35,
        duration: 14
      },
      {
        id: "ultimate",
        name: "Ultimate Protection",
        price: 2500,
        repairDiscount: 0.6,
        duration: 30
      }
    ],

    init() {
      this.initialized = true;
      this.expirePlans();
      return true;
    },

    getCarId() {
      const car = SX.getSelectedCar?.();
      return String(car?.id || "default");
    },

    getData() {
      if (!SX.player) return {};

      if (!SX.player.vehicleProtection) {
        SX.player.vehicleProtection = {};
      }

      return SX.player.vehicleProtection;
    },

    getCurrentPlan() {
      const data = this.getData();
      const plan = data[this.getCarId()];

      if (!plan) return null;

      if (plan.expiresAt <= Date.now()) {
        delete data[this.getCarId()];
        this.save();
        return null;
      }

      return { ...plan };
    },

    getPlans() {
      return this.plans.map(plan => ({
        ...plan
      }));
    },

    purchase(planId) {
      if (!this.initialized) {
        return {
          success: false,
          message: "Protection system not initialized."
        };
      }

      const plan = this.plans.find(
        item => item.id === planId
      );

      if (!plan) {
        return {
          success: false,
          message: "Protection plan not found."
        };
      }

      if (this.getCurrentPlan()) {
        return {
          success: false,
          message: "This vehicle already has active protection."
        };
      }

      if (
        typeof SX.spendCoins !== "function" ||
        !SX.spendCoins(plan.price)
      ) {
        return {
          success: false,
          message: "Not enough coins."
        };
      }

      const now = Date.now();

      const record = {
        planId: plan.id,
        planName: plan.name,
        purchasedAt: now,
        expiresAt: now + plan.duration * 86400000,
        repairDiscount: plan.repairDiscount
      };

      this.getData()[this.getCarId()] = record;

      this.save();

      this.dispatch("purchased", {
        carId: this.getCarId(),
        plan: { ...record }
      });

      return {
        success: true,
        message: "Vehicle protection activated.",
        plan: { ...record }
      };
    },

    getRepairDiscount() {
      const plan = this.getCurrentPlan();

      return plan ? plan.repairDiscount : 0;
    },

    calculateRepairCost(baseCost) {
      const amount = Number(baseCost);

      if (!Number.isFinite(amount) || amount < 0) {
        return 0;
      }

      const discount = this.getRepairDiscount();

      return Math.max(
        0,
        Math.round(amount * (1 - discount))
      );
    },

    getRemainingDays() {
      const plan = this.getCurrentPlan();

      if (!plan) return 0;

      return Math.max(
        0,
        Math.ceil(
          (plan.expiresAt - Date.now()) / 86400000
        )
      );
    },

    expirePlans() {
      const data = this.getData();
      const now = Date.now();
      let changed = false;

      Object.keys(data).forEach(carId => {
        if (
          !data[carId] ||
          data[carId].expiresAt <= now
        ) {
          delete data[carId];
          changed = true;
        }
      });

      if (changed) this.save();

      return changed;
    },

    getHistory() {
      const history = SX.player?.serviceHistory;

      return Array.isArray(history)
        ? history.map(item => ({ ...item }))
        : [];
    },

    addServiceRecord(service = {}) {
      if (!SX.player) return false;

      if (!Array.isArray(SX.player.serviceHistory)) {
        SX.player.serviceHistory = [];
      }

      const record = {
        id: `service-${Date.now()}`,
        carId: this.getCarId(),
        type: String(service.type || "General Service"),
        cost: Math.max(0, Number(service.cost) || 0),
        date: Date.now()
      };

      SX.player.serviceHistory.unshift(record);

      SX.player.serviceHistory =
        SX.player.serviceHistory.slice(0, 50);

      this.save();

      this.dispatch("service-recorded", record);

      return true;
    },

    save() {
      SX.savePlayer?.();
    },

    getState() {
      return {
        initialized: this.initialized,
        carId: this.getCarId(),
        activePlan: this.getCurrentPlan(),
        remainingDays: this.getRemainingDays(),
        repairDiscount: this.getRepairDiscount(),
        serviceHistory: this.getHistory()
      };
    },

    dispatch(name, detail) {
      window.dispatchEvent(
        new CustomEvent(`sx:vehicle-protection-${name}`, {
          detail
        })
      );
    },

    destroy() {
      this.initialized = false;
    }
  };

  SX.vehicleInsurance = VehicleInsurance;

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 82
   FILE: js/vehicle-insurance.js
   END
========================================================= */
