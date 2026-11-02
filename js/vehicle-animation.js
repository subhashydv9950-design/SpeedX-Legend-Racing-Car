
/* =========================================================
   SUPERX LEGEND — FILE 73
   FILE: js/vehicle-animation.js
   PURPOSE: Vehicle suspension, wheel and body animations
   START
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const VehicleAnimation = {
    vehicle: null,
    wheels: [],
    suspensionPoints: [],
    initialized: false,

    state: {
      speed: 0,
      steering: 0,
      throttle: 0,
      brake: 0,
      suspension: 0,
      wheelRotation: 0,
      bodyRoll: 0,
      bodyPitch: 0
    },

    settings: {
      wheelRadius: 0.35,
      steeringLimit: 0.55,
      suspensionStrength: 0.035,
      bodyRollStrength: 0.045,
      bodyPitchStrength: 0.035,
      smoothing: 8
    },

    init(options = {}) {
      this.vehicle = options.vehicle || null;

      if (!this.vehicle) return false;

      this.wheels = [];
      this.suspensionPoints = [];

      const wheelObjects = options.wheels || [];

      wheelObjects.forEach(wheel => {
        if (!wheel || !wheel.rotation) return;

        this.wheels.push({
          object: wheel,
          originalRotation: wheel.rotation.clone(),
          front: wheel.userData?.front !== false,
          side: wheel.userData?.side || "left"
        });
      });

      const body = options.body || this.vehicle;

      this.bodyOriginalRotation = body.rotation.clone();
      this.body = body;

      this.initialized = true;

      return true;
    },

    setInput(data = {}) {
      if (Number.isFinite(data.speed)) {
        this.state.speed = Math.max(0, data.speed);
      }

      if (Number.isFinite(data.steering)) {
        this.state.steering = Math.max(
          -1,
          Math.min(1, data.steering)
        );
      }

      if (Number.isFinite(data.throttle)) {
        this.state.throttle = Math.max(
          0,
          Math.min(1, data.throttle)
        );
      }

      if (Number.isFinite(data.brake)) {
        this.state.brake = Math.max(
          0,
          Math.min(1, data.brake)
        );
      }

      if (Number.isFinite(data.suspension)) {
        this.state.suspension = data.suspension;
      }
    },

    update(deltaTime = 0.016) {
      if (!this.initialized) return;

      const dt = Math.min(
        Math.max(deltaTime, 0),
        0.05
      );

      this.updateWheels(dt);
      this.updateBody(dt);
    },

    updateWheels(dt) {
      const speedMeters = this.state.speed / 3.6;

      this.state.wheelRotation +=
        (speedMeters / this.settings.wheelRadius) * dt;

      this.wheels.forEach(wheel => {
        const object = wheel.object;

        if (wheel.front) {
          object.rotation.y =
            wheel.originalRotation.y +
            this.state.steering *
            this.settings.steeringLimit;
        }

        object.rotation.x =
          wheel.originalRotation.x +
          this.state.wheelRotation;
      });
    },

    updateBody(dt) {
      if (!this.body) return;

      const steeringTarget =
        -this.state.steering *
        Math.min(1, this.state.speed / 120) *
        this.settings.bodyRollStrength;

      const brakingTarget =
        this.state.brake *
        this.settings.bodyPitchStrength;

      const accelerationTarget =
        this.state.throttle *
        this.settings.bodyPitchStrength *
        0.5;

      const pitchTarget =
        brakingTarget - accelerationTarget;

      const smoothing = Math.min(
        1,
        dt * this.settings.smoothing
      );

      this.state.bodyRoll += (
        steeringTarget - this.state.bodyRoll
      ) * smoothing;

      this.state.bodyPitch += (
        pitchTarget - this.state.bodyPitch
      ) * smoothing;

      this.body.rotation.z =
        this.bodyOriginalRotation.z +
        this.state.bodyRoll;

      this.body.rotation.x =
        this.bodyOriginalRotation.x +
        this.state.bodyPitch;
    },

    setSettings(options = {}) {
      Object.keys(this.settings).forEach(key => {
        if (Number.isFinite(options[key])) {
          this.settings[key] = Math.max(
            0,
            options[key]
          );
        }
      });

      return { ...this.settings };
    },

    reset() {
      if (this.body && this.bodyOriginalRotation) {
        this.body.rotation.copy(
          this.bodyOriginalRotation
        );
      }

      this.wheels.forEach(wheel => {
        wheel.object.rotation.copy(
          wheel.originalRotation
        );
      });

      this.state.wheelRotation = 0;
      this.state.bodyRoll = 0;
      this.state.bodyPitch = 0;
    },

    getState() {
      return {
        ...this.state,
        wheelCount: this.wheels.length,
        initialized: this.initialized
      };
    },

    destroy() {
      this.reset();

      this.vehicle = null;
      this.body = null;
      this.wheels = [];
      this.suspensionPoints = [];
      this.initialized = false;
    }
  };

  SX.vehicleAnimation = VehicleAnimation;

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 73
   FILE: js/vehicle-animation.js
   END
========================================================= */
