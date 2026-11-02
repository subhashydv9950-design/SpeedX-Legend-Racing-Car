
/* ==========================================
   SUPERX LEGEND RACING CAR
   PART 18 — ADVANCED PHYSICS SYSTEM
========================================== */

(function () {
  "use strict";

  const P = {
    speed: 0,
    rpm: 850,
    gear: "D",

    throttle: false,
    brake: false,
    reverse: false,
    handbrake: false,

    steering: 0,
    steeringTarget: 0,

    lateral: 0,
    yaw: 0,
    distance: 0,

    active: false,
    lastTime: 0,

    acceleration: 32,
    maxSpeed: 240,
    reverseMaxSpeed: 35
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function setControl(name, value) {
    if (name === "accelerator") name = "throttle";

    if (
      ["throttle", "brake", "reverse", "handbrake"]
        .includes(name)
    ) {
      P[name] = Boolean(value);
    }
  }

  function setSteering(value) {
    P.steeringTarget = clamp(
      Number(value) || 0,
      -1,
      1
    );
  }

  function update(dt) {
    if (P.reverse) {
      P.gear = "R";
      P.speed -= P.acceleration * 0.55 * dt;
    } else if (P.throttle) {
      P.gear = "D";
      P.speed += P.acceleration * dt;
    } else {
      P.speed *= Math.pow(0.988, dt * 60);
    }

    if (P.brake) {
      P.speed -= 80 * dt;
    }

    if (P.handbrake) {
      P.speed *= Math.pow(0.94, dt * 60);
    }

    P.speed = clamp(
      P.speed,
      -P.reverseMaxSpeed,
      P.maxSpeed
    );

    if (
      !P.throttle &&
      !P.brake &&
      !P.reverse &&
      Math.abs(P.speed) < 0.5
    ) {
      P.speed = 0;
    }

    P.steering +=
      (P.steeringTarget - P.steering) *
      Math.min(1, dt * 7);

    const steeringPower = Math.min(
      1,
      Math.abs(P.speed) / 35
    );

    const direction = P.speed >= 0 ? 1 : -1;

    P.yaw = -P.steering * steeringPower;

    P.lateral +=
      P.steering *
      steeringPower *
      direction *
      dt *
      3.5;

    P.lateral = clamp(P.lateral, -4.3, 4.3);

    P.distance += Math.abs(P.speed) * dt / 3.6;

    P.rpm = clamp(
      850 +
      Math.abs(P.speed) * 25 +
      (P.throttle ? 900 : 0),
      850,
      9000
    );

    updateCar();
    updateHUD();
  }

  function updateCar() {
    if (!window.SuperX3D) return;

    const world = window.SuperX3D.getWorld();
    if (!world) return;

    const car =
      world.playerCar ||
      world.raceCar ||
      world.car;

    if (!car) return;

    car.position.x = P.lateral;
    car.rotation.y = P.yaw * 0.18;
  }

  function updateHUD() {
    const speed = document.getElementById("speedValue");
    const gear = document.getElementById("gearValue");
    const rpm = document.getElementById("rpmValue");

    if (speed) {
      speed.textContent = Math.round(Math.abs(P.speed));
    }

    if (gear) {
      gear.textContent = P.gear;
    }

    if (rpm) {
      rpm.textContent = Math.round(P.rpm);
    }
  }

  function loop(timestamp) {
    if (!P.active) return;

    if (!P.lastTime) P.lastTime = timestamp;

    const dt = Math.min(
      (timestamp - P.lastTime) / 1000,
      0.05
    );

    P.lastTime = timestamp;

    update(dt);

    requestAnimationFrame(loop);
  }

  function start() {
    if (P.active) return;

    P.active = true;
    P.lastTime = 0;

    requestAnimationFrame(loop);
  }

  function stop() {
    P.active = false;
    P.lastTime = 0;

    P.throttle = false;
    P.brake = false;
    P.reverse = false;
    P.handbrake = false;
    P.steeringTarget = 0;
  }

  function reset() {
    stop();

    P.speed = 0;
    P.rpm = 850;
    P.gear = "D";
    P.steering = 0;
    P.steeringTarget = 0;
    P.lateral = 0;
    P.yaw = 0;
    P.distance = 0;

    updateCar();
    updateHUD();
  }

  function getState() {
    return {
      speed: P.speed,
      rpm: P.rpm,
      gear: P.gear,
      distance: P.distance,
      steering: P.steering,
      lateral: P.lateral,
      active: P.active
    };
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

  console.log("SUPERX PART 18 Physics Ready");

})();

/* ========== END OF PART 18 ========== */
