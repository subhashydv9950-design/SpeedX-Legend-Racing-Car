
/* =========================================================
   SUPERX LEGEND — FILE 16
   FILE: js/physics.js
   CORE VEHICLE PHYSICS ENGINE
   START
========================================================= */

(function () {
  "use strict";

  window.SUPERX = window.SUPERX || {};
  const SX = window.SUPERX;

  const clamp = (value, min, max) =>
    Math.max(min, Math.min(max, value));

  SX.physics = {
    initialized: false,

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
      rpm: 850,
      engineOn: true,
      handbrake: false,
      wheelSlip: 0,
      yawRate: 0
    },

    settings: {
      maxSpeed: 240,
      accelerationForce: 32,
      brakeForce: 75,
      reverseSpeed: 35,
      steeringSpeed: 2.2,
      steeringSensitivity: 1,
      drag: 0.985,
      rollingResistance: 0.8,
      grip: 1,
      handling: 75,
      braking: 70,
      stability: 75
    },

    input: {
      throttle: 0,
      brake: 0,
      steer: 0,
      handbrake: false
    },

    init(carData) {
      const car = carData || {};
      const performance = SX.vehiclePerformance;

      let stats = null;

      if (
        performance &&
        typeof performance.calculate === "function"
      ) {
        try {
          stats = performance.calculate();
        } catch (error) {
          stats = null;
        }
      }

      const topSpeed = Number(
        stats?.speed || car.topSpeed || car.speed
      );

      const acceleration = Number(
        stats?.acceleration || car.acceleration
      );

      this.settings.maxSpeed = clamp(
        topSpeed > 0 ? topSpeed : 240,
        30,
        520
      );

      // Car acceleration values represent acceleration rating,
      // not direct force. Convert them into physics force.
      this.settings.accelerationForce = clamp(
        acceleration > 0
          ? 32 * (7.8 / acceleration)
          : 32,
        12,
        75
      );

      this.settings.handling = clamp(
        Number(stats?.handling || car.handling || 75),
        20,
        100
      );

      this.settings.braking = clamp(
        Number(stats?.braking || car.braking || 70),
        20,
        100
      );

      this.settings.grip = clamp(
        Number(stats?.grip || car.grip || 72) / 72,
        0.5,
        1.5
      );

      this.settings.steeringSensitivity = 1;

      this.reset();
      this.initialized = true;

      return this.car;
    },

    reset() {
      Object.assign(this.car, {
        x: 0,
        z: 0,
        speed: 0,
        acceleration: 0,
        steering: 0,
        rotation: 0,
        verticalVelocity: 0,
        grounded: true,
        gear: 1,
        rpm: 850,
        engineOn: true,
        handbrake: false,
        wheelSlip: 0,
        yawRate: 0
      });

      this.clearInput();

      if (SX.vehicleTransmission?.reset) {
        SX.vehicleTransmission.reset();
      }

      if (SX.vehicleDrivingAssist?.reset) {
        SX.vehicleDrivingAssist.reset();
      }

      return this.car;
    },

    setInput(type, value) {
      if (!(type in this.input)) return false;

      if (type === "handbrake") {
        this.input.handbrake = Boolean(value);
        return true;
      }

      this.input[type] = clamp(
        Number(value) || 0,
        -1,
        1
      );

      return true;
    },

    clearInput() {
      this.input.throttle = 0;
      this.input.brake = 0;
      this.input.steer = 0;
      this.input.handbrake = false;
    },

    update(deltaTime) {
      if (!this.initialized) return this.car;

      const dt = clamp(
        Number(deltaTime) || 0,
        0,
        0.05
      );

      if (dt <= 0) return this.car;

      const car = this.car;
      const settings = this.settings;
      const input = this.input;

      let throttle = input.throttle;
      let brake = input.brake;
      let steer = input.steer;

      const speedBefore = car.speed;
      const absoluteSpeed = Math.abs(speedBefore);

      // Driving assistance
      if (SX.vehicleDrivingAssist?.update) {
        const assist = SX.vehicleDrivingAssist.update({
          speed: absoluteSpeed,
          throttle: Math.max(0, throttle),
          brake,
          steering: steer,
          wheelSlip: car.wheelSlip,
          yawRate: car.yawRate
        });

        if (throttle >= 0) {
          throttle = assist.throttle;

          if (assist.cruiseThrottle !== null) {
            throttle = Math.max(
              throttle,
              assist.cruiseThrottle
            );
          }
        }

        brake = assist.brake;
        steer = clamp(
          steer + assist.steeringCorrection,
          -1,
          1
        );
      }

      let force = 0;

      // Forward acceleration and reverse input
      if (throttle > 0) {
        if (car.speed < -0.5) {
          force += settings.brakeForce * throttle;
        } else {
          force += throttle * settings.accelerationForce;
        }
      } else if (throttle < 0) {
        if (car.speed > 0.5) {
          force += throttle * settings.brakeForce;
        } else {
          force -= Math.abs(throttle) *
            settings.accelerationForce * 0.55;
        }
      }

      // Brake pedal
      if (brake > 0) {
        if (Math.abs(car.speed) > 0.08) {
          force -=
            Math.sign(car.speed) *
            brake *
            settings.brakeForce *
            (settings.braking / 70);
        }
      }

      car.acceleration = force;
      car.speed += force * dt;

      // Handbrake
      if (input.handbrake) {
        car.speed *= Math.pow(0.88, dt * 60);
      }

      // Rolling resistance
      const resistance = Math.abs(throttle) < 0.01
        ? settings.rollingResistance
        : 0.12;

      car.speed *= Math.max(
        0,
        1 - resistance * dt * 0.08
      );

      if (Math.abs(car.speed) < 0.08) {
        car.speed = 0;
      }

      car.speed = clamp(
        car.speed,
        -settings.reverseSpeed,
        settings.maxSpeed
      );

      // Steering and vehicle rotation
      const speedRatio = clamp(
        Math.abs(car.speed) /
          Math.max(1, settings.maxSpeed),
        0,
        1
      );

      const steeringStrength =
        settings.steeringSpeed *
        settings.steeringSensitivity *
        (0.22 + speedRatio * 0.78) *
        (settings.handling / 75);

      const direction = car.speed < -0.1 ? -1 : 1;

      car.steering = steer;

      const previousRotation = car.rotation;

      car.rotation +=
        steer *
        steeringStrength *
        direction *
        dt;

      car.yawRate =
        (car.rotation - previousRotation) /
        Math.max(dt, 0.001);

      // Wheel slip and grip
      const steeringSlip =
        Math.abs(steer) * speedRatio * 0.22;

      const handbrakeSlip = input.handbrake
        ? 0.45
        : 0;

      car.wheelSlip = clamp(
        steeringSlip + handbrakeSlip,
        0,
        1
      );

      const grip = input.handbrake
        ? settings.grip * 0.55
        : settings.grip;

      // World movement
      const movement = car.speed * dt;

      car.x +=
        Math.sin(car.rotation) *
        movement *
        grip;

      car.z -=
        Math.cos(car.rotation) *
        movement;

      car.handbrake = input.handbrake;

      this.updateGear();
      this.updateRPM(dt);

      return car;
    },

    updateGear() {
      const transmission = SX.vehicleTransmission;

      if (transmission?.getState) {
        const state = transmission.getState();

        if (state && Number.isFinite(state.gear)) {
          this.car.gear = state.gear;
          return;
        }
      }

      const speed = Math.abs(this.car.speed);

      if (this.car.speed < -0.5) {
        this.car.gear = -1;
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

    updateRPM(dt) {
      const transmission = SX.vehicleTransmission;

      if (transmission?.update) {
        const state = transmission.update(dt, {
          speed: Math.abs(this.car.speed),
          throttle: Math.max(0, this.input.throttle)
        });

        if (state) {
          this.car.rpm = state.rpm;
          this.car.gear = state.gear;
          return;
        }
      }

      const speed = Math.abs(this.car.speed);
      const gear = Math.max(1, this.car.gear);

      const baseRPM = 850;
      const speedRPM = speed *
        (gear === 1 ? 65 : 32);

      const targetRPM = clamp(
        baseRPM + speedRPM,
        baseRPM,
        8500
      );

      const response = clamp(dt * 5, 0, 1);

      this.car.rpm +=
        (targetRPM - this.car.rpm) * response;
    },

    setMaxSpeed(speed) {
      this.settings.maxSpeed = clamp(
        Number(speed) || 240,
        30,
        520
      );

      return this.settings.maxSpeed;
    },

    setSensitivity(value) {
      this.settings.steeringSensitivity = clamp(
        Number(value) || 1,
        0.3,
        2.5
      );

      return this.settings.steeringSensitivity;
    },

    setGrip(value) {
      this.settings.grip = clamp(
        Number(value) || 1,
        0.3,
        2
      );

      return this.settings.grip;
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
        handbrake: this.input.handbrake,
        wheelSlip: this.car.wheelSlip,
        yawRate: this.car.yawRate,
        maxSpeed: this.settings.maxSpeed,
        grounded: this.car.grounded
      };
    }
  };

})();

/* =========================================================
   SUPERX LEGEND — FILE 16
   END
========================================================= */
