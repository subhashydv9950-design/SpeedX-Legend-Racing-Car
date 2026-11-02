
/* ==========================================
   SUPERX LEGEND RACING CAR
   PART 5 — DRIVING PHYSICS
   FILE: js/physics.js
========================================== */

(() => {
  "use strict";

  const Physics = {
    speed: 0,
    maxSpeed: 240,
    acceleration: 42,
    brakePower: 100,
    steering: 0,
    steeringInput: 0,
    throttle: false,
    braking: false,
    reversing: false,
    handbrake: false,
    gear: "D",
    rpm: 900,
    engineOn: true,
    damage: 0,
    distance: 0,
    lateralPosition: 0,
    yaw: 0,
    active: false,
    lastTime: 0,
    currentCar: null
  };

  const clamp = (value, min, max) =>
    Math.max(min, Math.min(max, value));

  function getSelectedCar() {
    const cars = window.SUPERX_CARS || [];
    const index = window.SuperX?.selectedCar || 0;
    return cars[index] || cars[0] || null;
  }

  function getCarMaxSpeed() {
    const car = getSelectedCar();
    const speed = Number(car?.speed || car?.topSpeed || 240);
    return clamp(speed, 80, 520);
  }

  function reset() {
    Physics.speed = 0;
    Physics.steering = 0;
    Physics.steeringInput = 0;
    Physics.throttle = false;
    Physics.braking = false;
    Physics.reversing = false;
    Physics.handbrake = false;
    Physics.gear = "D";
    Physics.rpm = 900;
    Physics.damage = 0;
    Physics.distance = 0;
    Physics.lateralPosition = 0;
    Physics.yaw = 0;
    Physics.maxSpeed = getCarMaxSpeed();
    Physics.currentCar = getSelectedCar();
    Physics.lastTime = performance.now();
  }

  function start() {
    reset();
    Physics.active = true;
  }

  function stop() {
    Physics.active = false;
    Physics.throttle = false;
    Physics.braking = false;
    Physics.reversing = false;
    Physics.handbrake = false;
  }

  function setControl(name, pressed) {
    const value = Boolean(pressed);

    switch (name) {
      case "accelerator":
      case "accelerate":
      case "gas":
        Physics.throttle = value;
        if (value && Physics.gear === "R") {
          Physics.gear = "D";
        }
        break;

      case "brake":
        Physics.braking = value;
        break;

      case "reverse":
        Physics.reversing = value;
        if (value && Physics.speed < 1) {
          Physics.gear = "R";
        }
        break;

      case "left":
        Physics.steeringInput = value ? -1 : 0;
        break;

      case "right":
        Physics.steeringInput = value ? 1 : 0;
        break;

      case "handbrake":
        Physics.handbrake = value;
        break;

      case "neutral":
        if (value && Physics.speed < 1) {
          Physics.gear = "N";
        }
        break;

      default:
        break;
    }
  }

  function setSteering(value) {
    Physics.steeringInput = clamp(Number(value) || 0, -1, 1);
  }

  function update(deltaTime) {
    if (!Physics.active) return;

    const dt = clamp(deltaTime, 0, 0.05);

    Physics.maxSpeed = getCarMaxSpeed();

    // Steering smoothness
    const steeringResponse = Physics.handbrake ? 5 : 3.2;
    Physics.steering +=
      (Physics.steeringInput - Physics.steering) *
      steeringResponse * dt;

    // Reverse and forward drive
    if (Physics.reversing && Physics.speed < 1) {
      Physics.gear = "R";
    }

    if (Physics.gear === "R" && Physics.reversing) {
      Physics.speed -= 25 * dt;
      Physics.speed = Math.max(Physics.speed, -35);
    } else if (Physics.throttle && Physics.gear !== "N") {
      Physics.speed += Physics.acceleration * dt;
      Physics.speed = Math.min(Physics.speed, Physics.maxSpeed);
    } else {
      // Rolling resistance
      if (Physics.speed > 0) {
        Physics.speed = Math.max(0, Physics.speed - 4.5 * dt);
      } else if (Physics.speed < 0) {
        Physics.speed = Math.min(0, Physics.speed + 4.5 * dt);
      }
    }

    // Brake force
    if (Physics.braking) {
      if (Physics.speed > 0) {
        Physics.speed = Math.max(
          0, Physics.speed - Physics.brakePower * dt
        );
      } else if (Physics.speed < 0) {
        Physics.speed = Math.min(
          0, Physics.speed + Physics.brakePower * dt
        );
      }
    }

    // Handbrake slows the car and increases steering response
    if (Physics.handbrake) {
      if (Physics.speed > 0) {
        Physics.speed = Math.max(0, Physics.speed - 65 * dt);
      } else if (Physics.speed < 0) {
        Physics.speed = Math.min(0, Physics.speed + 65 * dt);
      }
    }

    // Reverse input released: return to forward gear when stopped
    if (!Physics.reversing && Physics.gear === "R" &&
        Math.abs(Physics.speed) < 0.5) {
      Physics.speed = 0;
      Physics.gear = "D";
    }

    // RPM responds to speed and throttle
    const speedRatio = Math.min(
      1, Math.abs(Physics.speed) / Math.max(1, Physics.maxSpeed)
    );

    Physics.rpm = Math.round(
      900 + speedRatio * 5700 +
      (Physics.throttle ? 700 : 0)
    );

    Physics.rpm = clamp(Physics.rpm, 800, 7600);

    // Steering affects lateral movement more at higher speed
    const speedFactor = Math.min(1, Math.abs(Physics.speed) / 100);
    Physics.lateralPosition +=
      Physics.steering * speedFactor * 5.5 * dt;

    Physics.lateralPosition = clamp(
      Physics.lateralPosition, -4.3, 4.3
    );

    // Visual yaw angle
    Physics.yaw = -Physics.steering * speedFactor * 0.28;

    // Distance in metres, approximate from km/h
    Physics.distance += Math.abs(Physics.speed) / 3.6 * dt;
  }

  function getState() {
    return {
      speed: Math.round(Math.abs(Physics.speed)),
      signedSpeed: Physics.speed,
      maxSpeed: Physics.maxSpeed,
      gear: Physics.gear,
      rpm: Physics.rpm,
      steering: Physics.steering,
      steeringInput: Physics.steeringInput,
      lateralPosition: Physics.lateralPosition,
      yaw: Physics.yaw,
      distance: Physics.distance,
      damage: Physics.damage,
      active: Physics.active,
      throttle: Physics.throttle,
      braking: Physics.braking,
      reversing: Physics.reversing,
      handbrake: Physics.handbrake
    };
  }

  function frame(time) {
    requestAnimationFrame(frame);

    if (!Physics.active) {
      Physics.lastTime = time;
      return;
    }

    const dt = Physics.lastTime
      ? (time - Physics.lastTime) / 1000
      : 0;

    Physics.lastTime = time;
    update(dt);

    // Send driving state to the 3D world
    const world = window.SuperX3D?.getWorld("race");

    if (world?.car) {
      world.car.position.x = Physics.lateralPosition;
      world.car.rotation.y = Physics.yaw;

      world.car.userData.wheels?.forEach((wheel) => {
        wheel.rotation.x -= Physics.speed * dt * 0.08;
      });
    }

    // Update HUD if these elements exist
    const speedEl = document.getElementById("speedValue");
    if (speedEl) {
      speedEl.textContent = String(Math.round(Math.abs(Physics.speed)));
    }

    const gearEl = document.getElementById("gearValue");
    if (gearEl) gearEl.textContent = Physics.gear;

    const rpmEl = document.getElementById("rpmValue");
    if (rpmEl) rpmEl.textContent = String(Physics.rpm);
  }

  window.SuperXPhysics = {
    start,
    stop,
    reset,
    update,
    setControl,
    setSteering,
    getState
  };

  requestAnimationFrame(frame);

  console.log("SUPERX Physics module loaded");

})();

/* ========== END OF PART 5 ========== */
