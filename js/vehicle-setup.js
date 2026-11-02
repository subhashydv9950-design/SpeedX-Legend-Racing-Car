
/* =========================================================
   SUPERX LEGEND — FILE 81
   FILE: js/vehicle-setup.js
   PURPOSE: Advanced vehicle setup and handling configuration
   START
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const VehicleSetup = {
    initialized: false,
    vehicle: null,

    defaults: {
      steeringSensitivity: 1,
      steeringAssist: 0.35,
      brakeBalance: 0.6,
      suspensionStiffness: 0.5,
      rideHeight: 0.5,
      tyreGrip: 0.7,
      downforce: 0.5,
      tractionControl: true,
      abs: true,
      stabilityControl: true
    },

    current: {},

    ranges: {
      steeringSensitivity: [0.3, 2],
      steeringAssist: [0, 1],
      brakeBalance: [0.3, 0.8],
      suspensionStiffness: [0.1, 1],
      rideHeight: [0.1, 1],
      tyreGrip: [0.2, 1],
      downforce: [0, 1]
    },

    init(options = {}) {
      this.vehicle = options.vehicle || null;
      this.current = { ...this.defaults };
      this.initialized = true;

      this.load();

      return true;
    },

    getCarId() {
      const car = SX.getSelectedCar?.();

      return String(car?.id || "default");
    },

    normalize(key, value) {
      if (typeof this.defaults[key] === "boolean") {
        return Boolean(value);
      }

      const range = this.ranges[key];

      if (!range) return null;

      const number = Number(value);

      if (!Number.isFinite(number)) return null;

      return Math.max(
        range[0],
        Math.min(range[1], number)
      );
    },

    set(key, value) {
      if (!this.initialized || !(key in this.defaults)) {
        return false;
      }

      const normalized = this.normalize(key, value);

      if (normalized === null) return false;

      this.current[key] = normalized;

      this.save();
      this.dispatch("changed", {
        key,
        value: normalized
      });

      return true;
    },

    update(values = {}) {
      if (!values || typeof values !== "object") {
        return false;
      }

      let changed = false;

      Object.entries(values).forEach(([key, value]) => {
        if (this.set(key, value)) {
          changed = true;
        }
      });

      return changed;
    },

    get(key) {
      if (!(key in this.defaults)) return undefined;

      return this.current[key];
    },

    getAll() {
      return { ...this.current };
    },

    applyToPhysics(physics) {
      if (!this.initialized || !physics) return false;

      const setup = this.current;

      const physicsSettings = {
        steeringSensitivity: setup.steeringSensitivity,
        steeringAssist: setup.steeringAssist,
        brakeBalance: setup.brakeBalance,
        suspensionStiffness: setup.suspensionStiffness,
        tyreGrip: setup.tyreGrip,
        downforce: setup.downforce,
        tractionControl: setup.tractionControl,
        abs: setup.abs,
        stabilityControl: setup.stabilityControl
      };

      if (typeof physics.setVehicleSetup === "function") {
        physics.setVehicleSetup(physicsSettings);
        return true;
      }

      if (typeof physics.configure === "function") {
        physics.configure(physicsSettings);
        return true;
      }

      physics.vehicleSetup = physicsSettings;

      return true;
    },

    applyRideHeight() {
      if (!this.vehicle) return false;

      const height = this.current.rideHeight;

      const offset = (height - 0.5) * 0.3;

      this.vehicle.position.y += offset;

      return true;
    },

    getPresets() {
      return {
        balanced: {
          steeringSensitivity: 1,
          steeringAssist: 0.35,
          brakeBalance: 0.6,
          suspensionStiffness: 0.5,
          rideHeight: 0.5,
          tyreGrip: 0.7,
          downforce: 0.5,
          tractionControl: true,
          abs: true,
          stabilityControl: true
        },

        drift: {
          steeringSensitivity: 1.35,
          steeringAssist: 0.1,
          brakeBalance: 0.48,
          suspensionStiffness: 0.38,
          rideHeight: 0.58,
          tyreGrip: 0.48,
          downforce: 0.35,
          tractionControl: false,
          abs: true,
          stabilityControl: false
        },

        grip: {
          steeringSensitivity: 0.9,
          steeringAssist: 0.5,
          brakeBalance: 0.64,
          suspensionStiffness: 0.78,
          rideHeight: 0.38,
          tyreGrip: 0.95,
          downforce: 0.9,
          tractionControl: true,
          abs: true,
          stabilityControl: true
        },

        comfort: {
          steeringSensitivity: 0.8,
          steeringAssist: 0.7,
          brakeBalance: 0.6,
          suspensionStiffness: 0.28,
          rideHeight: 0.65,
          tyreGrip: 0.68,
          downforce: 0.3,
          tractionControl: true,
          abs: true,
          stabilityControl: true
        }
      };
    },

    applyPreset(name) {
      const presets = this.getPresets();
      const preset = presets[name];

      if (!preset) return false;

      this.current = { ...preset };

      this.save();
      this.dispatch("preset-applied", {
        name,
        settings: this.getAll()
      });

      return true;
    },

    reset() {
      this.current = { ...this.defaults };

      this.save();

      this.dispatch("reset", this.getAll());

      return true;
    },

    save() {
      if (!SX.player) return;

      if (!SX.player.vehicleSetups) {
        SX.player.vehicleSetups = {};
      }

      SX.player.vehicleSetups[this.getCarId()] = {
        ...this.current
      };

      SX.savePlayer?.();
    },

    load() {
      const saved =
        SX.player?.vehicleSetups?.[this.getCarId()];

      if (!saved || typeof saved !== "object") {
        return false;
      }

      Object.keys(this.defaults).forEach(key => {
        if (key in saved) {
          const normalized = this.normalize(key, saved[key]);

          if (normalized !== null) {
            this.current[key] = normalized;
          }
        }
      });

      return true;
    },

    dispatch(name, detail) {
      window.dispatchEvent(
        new CustomEvent(`sx:vehicle-setup-${name}`, {
          detail
        })
      );
    },

    destroy() {
      this.vehicle = null;
      this.initialized = false;
      this.current = { ...this.defaults };
    }
  };

  SX.vehicleSetup = VehicleSetup;

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 81
   FILE: js/vehicle-setup.js
   END
========================================================= */
