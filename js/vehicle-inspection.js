
/* =========================================================
   SUPERX LEGEND — FILE 83
   FILE: js/vehicle-inspection.js
   PURPOSE: Vehicle condition and maintenance inspection
   START
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const VehicleInspection = {
    initialized: false,
    lastReport: null,

    components: [
      {
        id: "engine",
        name: "Engine",
        importance: 1.5
      },
      {
        id: "gearbox",
        name: "Gearbox",
        importance: 1.2
      },
      {
        id: "brakes",
        name: "Brakes",
        importance: 1.4
      },
      {
        id: "tyres",
        name: "Tyres",
        importance: 1.3
      },
      {
        id: "suspension",
        name: "Suspension",
        importance: 1.1
      },
      {
        id: "body",
        name: "Body",
        importance: 0.8
      },
      {
        id: "lights",
        name: "Lights",
        importance: 0.7
      }
    ],

    init() {
      this.initialized = true;
      this.ensureData();
      return true;
    },

    getCarId() {
      const car = SX.getSelectedCar?.();
      return String(car?.id || "default");
    },

    ensureData() {
      if (!SX.player) return null;

      if (!SX.player.vehicleCondition) {
        SX.player.vehicleCondition = {};
      }

      const carId = this.getCarId();

      if (!SX.player.vehicleCondition[carId]) {
        const condition = {};

        this.components.forEach(component => {
          condition[component.id] = 100;
        });

        SX.player.vehicleCondition[carId] = condition;
      }

      return SX.player.vehicleCondition[carId];
    },

    getCondition(componentId) {
      const data = this.ensureData();

      if (!data || !(componentId in data)) {
        return 100;
      }

      return Math.max(
        0,
        Math.min(100, Number(data[componentId]) || 0)
      );
    },

    setCondition(componentId, value) {
      if (!this.components.some(item => item.id === componentId)) {
        return false;
      }

      const condition = Number(value);

      if (!Number.isFinite(condition)) return false;

      const data = this.ensureData();

      if (!data) return false;

      data[componentId] = Math.round(
        Math.max(0, Math.min(100, condition))
      );

      this.save();

      this.dispatch("condition-changed", {
        component: componentId,
        condition: data[componentId]
      });

      return true;
    },

    damage(componentId, amount) {
      const damageAmount = Number(amount);

      if (!Number.isFinite(damageAmount) || damageAmount <= 0) {
        return false;
      }

      const current = this.getCondition(componentId);

      return this.setCondition(
        componentId,
        current - damageAmount
      );
    },

    repair(componentId, amount = 100) {
      const repairAmount = Number(amount);

      if (!Number.isFinite(repairAmount) || repairAmount <= 0) {
        return false;
      }

      const current = this.getCondition(componentId);

      return this.setCondition(
        componentId,
        current + repairAmount
      );
    },

    getComponentCost(componentId) {
      const component = this.components.find(
        item => item.id === componentId
      );

      if (!component) return 0;

      const condition = this.getCondition(componentId);
      const missing = 100 - condition;

      const baseCosts = {
        engine: 900,
        gearbox: 700,
        brakes: 550,
        tyres: 500,
        suspension: 650,
        body: 400,
        lights: 250
      };

      return Math.round(
        baseCosts[componentId] *
        (missing / 100) *
        component.importance
      );
    },

    repairComponent(componentId) {
      if (!this.initialized) {
        return {
          success: false,
          message: "Inspection system not initialized."
        };
      }

      const current = this.getCondition(componentId);

      if (current >= 100) {
        return {
          success: false,
          message: "This component is already in perfect condition."
        };
      }

      const baseCost = this.getComponentCost(componentId);

      const cost = SX.vehicleInsurance?.calculateRepairCost
        ? SX.vehicleInsurance.calculateRepairCost(baseCost)
        : baseCost;

      if (
        typeof SX.spendCoins !== "function" ||
        !SX.spendCoins(cost)
      ) {
        return {
          success: false,
          message: "Not enough coins."
        };
      }

      this.setCondition(componentId, 100);

      SX.vehicleInsurance?.addServiceRecord({
        type: `Repair: ${componentId}`,
        cost
      });

      this.dispatch("component-repaired", {
        component: componentId,
        cost
      });

      return {
        success: true,
        cost,
        message: "Component repaired successfully."
      };
    },

    repairAll() {
      if (!this.initialized) {
        return {
          success: false,
          message: "Inspection system not initialized."
        };
      }

      const report = this.inspect();
      const cost = SX.vehicleInsurance?.calculateRepairCost
        ? SX.vehicleInsurance.calculateRepairCost(report.totalRepairCost)
        : report.totalRepairCost;

      if (cost <= 0) {
        return {
          success: false,
          message: "Vehicle is already in perfect condition."
        };
      }

      if (
        typeof SX.spendCoins !== "function" ||
        !SX.spendCoins(cost)
      ) {
        return {
          success: false,
          message: "Not enough coins."
        };
      }

      const data = this.ensureData();

      this.components.forEach(component => {
        data[component.id] = 100;
      });

      this.save();

      SX.vehicleInsurance?.addServiceRecord({
        type: "Complete Vehicle Repair",
        cost
      });

      this.dispatch("vehicle-repaired", { cost });

      return {
        success: true,
        cost,
        message: "All vehicle components repaired."
      };
    },

    inspect() {
      const items = this.components.map(component => {
        const condition = this.getCondition(component.id);

        let status = "Excellent";

        if (condition < 30) {
          status = "Critical";
        } else if (condition < 60) {
          status = "Poor";
        } else if (condition < 85) {
          status = "Fair";
        }

        return {
          id: component.id,
          name: component.name,
          condition,
          status,
          repairCost: this.getComponentCost(component.id)
        };
      });

      const totalWeight = this.components.reduce(
        (sum, component) => sum + component.importance,
        0
      );

      const overall = Math.round(
        items.reduce((sum, item, index) => {
          return sum +
            item.condition * this.components[index].importance;
        }, 0) / totalWeight
      );

      const report = {
        carId: this.getCarId(),
        overallCondition: overall,
        status: overall >= 85
          ? "Excellent"
          : overall >= 60
            ? "Good"
            : overall >= 30
              ? "Needs Service"
              : "Critical",
        components: items,
        totalRepairCost: items.reduce(
          (sum, item) => sum + item.repairCost,
          0
        ),
        inspectedAt: Date.now()
      };

      this.lastReport = report;

      this.dispatch("report-created", report);

      return report;
    },

    getLastReport() {
      return this.lastReport
        ? {
            ...this.lastReport,
            components: this.lastReport.components.map(
              item => ({ ...item })
            )
          }
        : null;
    },

    save() {
      SX.savePlayer?.();
    },

    getState() {
      return {
        initialized: this.initialized,
        report: this.inspect()
      };
    },

    dispatch(name, detail) {
      window.dispatchEvent(
        new CustomEvent(`sx:vehicle-inspection-${name}`, {
          detail
        })
      );
    },

    destroy() {
      this.initialized = false;
      this.lastReport = null;
    }
  };

  SX.vehicleInspection = VehicleInspection;

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 83
   FILE: js/vehicle-inspection.js
   END
========================================================= */
