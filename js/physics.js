
/* ==========================================
   SUPERX LEGEND RACING CAR
   PART 16 — ADVANCED DRIVING PHYSICS
========================================== */

(function () {
  "use strict";

  const Physics = {
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
    acceleration: 30,
    maxSpeed: 240
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function setControl(control, value) {
    if (!(control in Physics)) return;

    if (typeof Physics[control] === "boolean") {
      Physics[control] = Boolean(value);
    }
  }

  function setSteering(value) {
    Physics.steeringTarget = clamp(Number(value) || 0, -1, 1);
  }

  function update(dt) {
    const p = Physics;

    const acceleration = p.acceleration;
    const maxSpeed = p.maxSpeed;

    if (p.reverse) {
      p.gear = "R";
      p.speed -= acceleration * 0.55 * dt;
    } else if (p.throttle) {
      p.gear = "D";
      p.speed += acceleration * dt;
    } else {
      p.speed *= Math.pow(0.985, dt * 60);
    }

    if (p.brake) {
      p.speed -= 75 * dt;
    }

    if (p.handbrake) {
      p.speed *= Math.pow(0.94, dt * 60);
    }

    p.speed = clamp(p.speed, -35, maxSpeed);

    if (!p.throttle && !p.brake && !p.reverse && Math.abs(p.speed) < 0.5) {
      p.speed = 0;
    }

    p.steering +=
      (p.steeringTarget - p.steering) * Math.min(1, dt * 7);

    const steeringPower = Math.min(1, Math.abs(p.speed) / 35);

    p.yaw = -p.steering * steeringPower;

    const direction = p.speed >= 0 ? 1 : -1;

    p.lateral +=
      p.steering * steeringPower * direction * dt * 3.5;

    p.lateral = clamp(p.lateral, -4.3, 4.3);

    p.distance += Math.abs(p.speed) * dt / 3.6;

    p.rpm = clamp(
      850 + Math.abs(p.speed) * 25 +
      (p.throttle ? 900 : 0),
      850,
      9000
    );

    if (Math.abs(p.speed) < 1) {
      p.gear = p.reverse ? "R" : "D";
    }

    updateCarPosition();
    updateHUD();
  }

  function updateCarPosition() {
    if (!window.SuperX3D) return;

    const world = window.SuperX3D.getWorld();
    if (!world) return;

    const car =
      world.playerCar ||
      world.raceCar ||
      world.car;

    if (!car) return;

    car.position.x = Physics.lateral;
    car.rotation.y = Physics.yaw * 0.18;
  }

  function updateHUD() {
    const speedElement = document.getElementById("speedValue");
    const gearElement = document.getElementById("gearValue");
    const rpmElement = document.getElementById("rpmValue");

    if (speedElement) {
      speedElement.textContent = Math.round(Math.abs(Physics.speed));
    }

    if (gearElement) {
      gearElement.textContent = Physics.gear;
    }

    if (rpmElement) {
      rpmElement.textContent = Math.round(Physics.rpm);
    }
  }

  function loop(timestamp) {
    if (!Physics.active) return;

    if (!Physics.lastTime) Physics.lastTime = timestamp;

    const dt = Math.min((timestamp - Physics.lastTime) / 1000, 0.05);
    Physics.lastTime = timestamp;

    update(dt);

    requestAnimationFrame(loop);
  }

  function start() {
    if (Physics.active) return;

    Physics.active = true;
    Physics.lastTime = 0;

    requestAnimationFrame(loop);
  }

  function stop() {
    Physics.active = false;
    Physics.lastTime = 0;
  }

  function reset() {
    Physics.speed = 0;
    Physics.rpm = 850;
    Physics.gear = "D";
    Physics.throttle = false;
    Physics.brake = false;
    Physics.reverse = false;
    Physics.handbrake = false;
    Physics.steering = 0;
    Physics.steeringTarget = 0;
    Physics.lateral = 0;
    Physics.yaw = 0;
    Physics.distance = 0;

    updateHUD();
    updateCarPosition();
  }

  function getState() {
    return {
      speed: Physics.speed,
      rpm: Physics.rpm,
      gear: Physics.gear,
      distance: Physics.distance,
      steering: Physics.steering,
      lateral: Physics.lateral,
      active: Physics.active
    };
  }

  window.SuperXPhysics = {
    start: start,
    stop: stop,
    reset: reset,
    update: update,
    setControl: setControl,
    setSteering: setSteering,
    getState: getState
  };

  console.log("SUPERX advanced physics loaded.");

})();

/* ========== END OF PART 16 ========== */
