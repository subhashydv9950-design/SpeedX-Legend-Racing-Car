/* =========================================================
   SUPERX LEGEND — FILE 73 START
   FILE: js/vehicle-animation.js
   PURPOSE: Advanced Vehicle Animation System
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const VehicleAnimation = {
    vehicle: null,
    body: null,
    wheels: [],
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
      if (!options.vehicle) return false;

      this.destroy();

      this.vehicle = options.vehicle;
      this.body = options.body || options.vehicle;

      this.bodyOriginalPosition =
        this.body.position.clone();

      this.bodyOriginalRotation =
        this.body.rotation.clone();

      const wheelObjects = options.wheels ||
        options.vehicle.userData?.wheels || [];

      this.wheels = wheelObjects.map(wheel => ({
        object: wheel,
        originalPosition: wheel.position.clone(),
        originalRotation: wheel.rotation.clone(),
        front: wheel.userData?.front !== false,
        side: wheel.userData?.side || "left"
      }));

      this.initialized = true;

      return true;
    },

    setInput(data = {}) {
      const limits = {
        speed: [0, 520],
        steering: [-1, 1],
        throttle: [0, 1],
        brake: [0, 1],
        suspension: [-1, 1]
      };

      Object.entries(limits).forEach(([key, range]) => {
        const value = Number(data[key]);

        if (!Number.isFinite(value)) return;

        this.state[key] = Math.max(
          range[0],
          Math.min(range[1], value)
        );
      });
    },

    update(deltaTime = 0.016) {
      if (!this.initialized) return;

      const dt = Math.min(
        Math.max(Number(deltaTime) || 0, 0),
        0.05
      );

      this.updateWheels(dt);
      this.updateBody(dt);
    },

    updateWheels(dt) {
      const speedMeters = this.state.speed / 3.6;

      this.state.wheelRotation +=
        speedMeters / this.settings.wheelRadius * dt;

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

      const speedFactor = Math.min(
        1,
        this.state.speed / 120
      );

      const rollTarget =
        -this.state.steering *
        speedFactor *
        this.settings.bodyRollStrength;

      const pitchTarget =
        (
          this.state.brake -
          this.state.throttle * 0.5
        ) * this.settings.bodyPitchStrength;

      const suspensionTarget =
        this.state.suspension *
        this.settings.suspensionStrength;

      const smoothing = Math.min(
        1,
        dt * this.settings.smoothing
      );

      this.state.bodyRoll += (
        rollTarget - this.state.bodyRoll
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

      this.body.position.y =
        this.bodyOriginalPosition.y +
        suspensionTarget;
    },

    setSettings(options = {}) {
      Object.keys(this.settings).forEach(key => {
        const value = Number(options[key]);

        if (!Number.isFinite(value)) return;

        this.settings[key] = Math.max(
          0,
          Math.min(100, value)
        );
      });

      this.settings.wheelRadius = Math.max(
        0.1,
        this.settings.wheelRadius
      );

      return { ...this.settings };
    },

    reset() {
      if (!this.initialized) return;

      if (this.body) {
        this.body.position.copy(
          this.bodyOriginalPosition
        );

        this.body.rotation.copy(
          this.bodyOriginalRotation
        );
      }

      this.wheels.forEach(wheel => {
        wheel.object.position.copy(
          wheel.originalPosition
        );

        wheel.object.rotation.copy(
          wheel.originalRotation
        );
      });

      this.state.speed = 0;
      this.state.steering = 0;
      this.state.throttle = 0;
      this.state.brake = 0;
      this.state.suspension = 0;
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
      if (this.initialized) {
        this.reset();
      }

      this.vehicle = null;
      this.body = null;
      this.wheels = [];
      this.bodyOriginalPosition = null;
      this.bodyOriginalRotation = null;
      this.initialized = false;
    }
  };

  SX.vehicleAnimation = VehicleAnimation;

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 73 END
   FILE: js/vehicle-animation.js
========================================================= */

