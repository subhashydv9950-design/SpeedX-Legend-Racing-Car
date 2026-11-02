
/* =========================================================
   SUPERX LEGEND — FILE 16
   FILE: js/physics.js
   START
========================================================= */

(function () {
  "use strict";

  window.SUPERX = window.SUPERX || {};
  const SX = window.SUPERX;

  SX.physics = {
    car: {
      x: 0,
      z: 0,
      speed: 0,
      acceleration: 0,
      steering: 0,
      rotation: 0,
      verticalVelocity: 0,
      grounded: true,
      gear: 1,
      rpm: 900,
      engineOn: true,
      handbrake: false
    },

    settings: {
      maxSpeed: 240,
      accelerationForce: 32,
      brakeForce: 65,
      reverseSpeed: 35,
      steeringSpeed: 2.2,
      steeringSensitivity: 1,
      drag: 0.985,
      rollingResistance: 0.8,
      grip: 1
    },

    input: {
      throttle: 0,
      brake: 0,
      steer: 0,
      handbrake: false
    },

    initialized: false,

    init(carData) {
      const car = carData || {};

      this.settings.maxSpeed =
        Number(car.topSpeed) || 240;

      this.settings.accelerationForce =
        Number(car.acceleration) || 32;

      this.settings.steeringSensitivity = 1;

      this.reset();
      this.initialized = true;

      return this.car;
    },

    reset() {
      this.car.x = 0;
      this.car.z = 0;
      this.car.speed = 0;
      this.car.acceleration = 0;
      this.car.steering = 0;
      this.car.rotation = 0;
      this.car.verticalVelocity = 0;
      this.car.grounded = true;
      this.car.gear = 1;
      this.car.rpm = 900;
      this.car.handbrake = false;

      this.clearInput();
    },

    setInput(type, value) {
      if (!(type in this.input)) return;

      if (type === "handbrake") {
        this.input.handbrake = Boolean(value);
        return;
      }

      this.input[type] = Math.max(
        -1,
        Math.min(1, Number(value) || 0)
      );
    },

    clearInput() {
      this.input.throttle = 0;
      this.input.brake = 0;
      this.input.steer = 0;
      this.input.handbrake = false;
    },

    update(deltaTime) {
      if (!this.initialized) return this.car;

      const dt = Math.min(
        Math.max(Number(deltaTime) || 0, 0),
        0.05
      );

      if (dt === 0) return this.car;

      const car = this.car;
      const settings = this.settings;
      const input = this.input;

      const throttle = input.throttle;
      const brake = input.brake;
      const steer = input.steer;

      const maxForward = settings.maxSpeed;
      const maxReverse = settings.reverseSpeed;

      let force = 0;

      if (throttle > 0) {
        force += throttle * settings.accelerationForce;
      }

      if (throttle < 0 && car.speed > 0) {
        force += throttle * settings.brakeForce;
      } else if (throttle < 0 && car.speed <= 0) {
        force += throttle * settings.accelerationForce * 0.55;
      }

      if (brake > 0) {
        if (Math.abs(car.speed) > 0.5) {
          force -= Math.sign(car.speed) *
            brake * settings.brakeForce;
        }
      }

      car.acceleration = force;
      car.speed += force * dt;

      if (input.handbrake) {
        car.speed *= Math.pow(0.92, dt * 60);
      }

      const resistance = throttle === 0
        ? settings.rollingResistance
        : 0.12;

      car.speed *= Math.max(
        0,
        1 - resistance * dt * 0.08
      );

      if (Math.abs(car.speed) < 0.08) {
        car.speed = 0;
      }

      car.speed = Math.max(
        -maxReverse,
        Math.min(maxForward, car.speed)
      );

      const speedRatio = Math.min(
        1,
        Math.abs(car.speed) / Math.max(1, maxForward)
      );

      const steeringStrength =
        settings.steeringSpeed *
        settings.steeringSensitivity *
        (0.25 + speedRatio * 0.75);

      const direction = car.speed < -0.1 ? -1 : 1;

      car.steering = steer;

      car.rotation +=
        steer *
        steeringStrength *
        direction *
        dt;

      const grip = input.handbrake
        ? settings.grip * 0.55
        : settings.grip;

      const movement = car.speed * dt;

      car.x += Math.sin(car.rotation) * movement * grip;
      car.z -= Math.cos(car.rotation) * movement;

      this.updateGear();
      this.updateRPM();

      return car;
    },

    updateGear() {
      const speed = Math.abs(this.car.speed);

      if (this.car.speed < -0.5) {
        this.car.gear = -1;
        return;
      }

      if (speed < 1) {
        this.car.gear = 1;
      } else if (speed < 45) {
        this.car.gear = 1;
      } else if (speed < 85) {
        this.car.gear = 2;
      } else if (speed < 130) {
        this.car.gear = 3;
      } else if (speed < 180) {
        this.car.gear = 4;
      } else if (speed < 230) {
        this.car.gear = 5;
      } else {
        this.car.gear = 6;
      }
    },

    updateRPM() {
      const speed = Math.abs(this.car.speed);
      const gear = Math.max(1, this.car.gear);

      const baseRPM = 900;
      const speedRPM = speed * (gear === 1 ? 65 : 32);

      this.car.rpm = Math.min(
        8500,
        Math.max(baseRPM, baseRPM + speedRPM)
      );
    },

    setMaxSpeed(speed) {
      this.settings.maxSpeed = Math.max(
        30,
        Number(speed) || 240
      );
    },

    setSensitivity(value) {
      this.settings.steeringSensitivity = Math.max(
        0.3,
        Math.min(2.5, Number(value) || 1)
      );
    },

    setGrip(value) {
      this.settings.grip = Math.max(
        0.3,
        Math.min(2, Number(value) || 1)
      );
    },

    getState() {
      return {
        x: this.car.x,
        z: this.car.z,
        speed: Math.round(Math.abs(this.car.speed)),
        speedSigned: this.car.speed,
        rotation: this.car.rotation,
        steering: this.car.steering,
        gear: this.car.gear,
        rpm: Math.round(this.car.rpm),
        acceleration: this.car.acceleration,
        handbrake: this.input.handbrake
      };
    }
  };

})();

/* =========================================================
   SUPERX LEGEND — FILE 16
   END
========================================================= */
