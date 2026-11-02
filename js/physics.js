/* =========================================
   SUPERX LEGEND RACING CAR
   PART 18 — PLAYER DRIVING PHYSICS
   FILE: js/physics.js
========================================= */

(() => {
  "use strict";

  const physics = {
    speed: 0,
    maxSpeed: 240,
    acceleration: 42,
    braking: 100,
    reverseSpeed: 35,
    steering: 0,
    steeringPower: 4.5,
    throttle: false,
    brake: false,
    left: false,
    right: false,
    handbrake: false,
    gear: 1,
    rpm: 900,
    distance: 0,
    running: false,
    lastTime: 0
  };

  function getPlayer() {
    return window.SuperX3D?.getPlayerCar?.() || null;
  }

  function getWorld() {
    return window.SuperX3D?.getWorld?.() || null;
  }

  function setControl(control, value) {
    if (!(control in physics)) return;
    physics[control] = Boolean(value);
  }

  function reset() {
    physics.speed = 0;
    physics.steering = 0;
    physics.gear = 1;
    physics.rpm = 900;
    physics.distance = 0;
    physics.throttle = false;
    physics.brake = false;
    physics.left = false;
    physics.right = false;
    physics.handbrake = false;
  }

  function start() {
    reset();
    physics.running = true;
    physics.lastTime = 0;
  }

  function stop() {
    physics.running = false;
    physics.speed = 0;
    physics.throttle = false;
    physics.brake = false;
  }

  function update(dt) {
    if (!physics.running) return;

    dt = Math.min(Math.max(dt || 0, 0), 0.05);

    const player = getPlayer();

    // Acceleration
    if (physics.throttle && !physics.brake) {
      physics.speed += physics.acceleration * dt;
    }

    // Braking
    if (physics.brake) {
      physics.speed -= physics.braking * dt;
    }

    // Handbrake
    if (physics.handbrake) {
      physics.speed -= 75 * dt;
    }

    // Natural slowdown
    if (!physics.throttle && !physics.brake) {
      physics.speed -= 7 * dt;
    }

    physics.speed = Math.max(
      0,
      Math.min(physics.speed, physics.maxSpeed)
    );

    // Steering
    let direction = 0;

    if (physics.left) direction -= 1;
    if (physics.right) direction += 1;

    if (direction !== 0 && physics.speed > 1) {
      physics.steering += direction * physics.steeringPower * dt;
    } else {
      physics.steering *= Math.max(0, 1 - 5 * dt);
    }

    physics.steering = Math.max(
      -1,
      Math.min(1, physics.steering)
    );

    if (player) {
      const movementFactor = Math.max(
        0.25,
        physics.speed / 120
      );

      player.position.x +=
        physics.steering * movementFactor * dt * 4;

      player.position.x = Math.max(
        -4.4,
        Math.min(4.4, player.position.x)
      );

      player.rotation.y = -physics.steering * 0.22;

      if (player.userData?.wheels) {
        player.userData.wheels.forEach(wheel => {
          wheel.rotation.x -= physics.speed * dt * 0.025;
        });
      }
    }

    // Gear and RPM
    if (physics.speed < 1) {
      physics.gear = 1;
    } else {
      physics.gear = Math.min(
        6,
        Math.max(1, Math.ceil(physics.speed / 40))
      );
    }

    physics.rpm = Math.round(
      900 + (physics.speed / physics.maxSpeed) * 6200
    );

    physics.distance += physics.speed * dt / 3600;

    // Synchronize world speed
    window.SuperX3D?.setWorldSpeed?.(physics.speed);

    // Update HUD
    updateHUD();
  }

  function updateHUD() {
    const speedElement = document.getElementById("speedValue");
    const gearElement = document.getElementById("gearValue");
    const rpmElement = document.getElementById("rpmValue");

    if (speedElement) {
      speedElement.textContent = Math.round(physics.speed);
    }

    if (gearElement) {
      gearElement.textContent = physics.gear;
    }

    if (rpmElement) {
      rpmElement.textContent = physics.rpm;
    }
  }

  function setMaxSpeed(value) {
    physics.maxSpeed = Math.max(50, Number(value) || 240);
  }

  function setSensitivity(value) {
    physics.steeringPower = Math.max(
      1,
      Math.min(10, Number(value) || 4.5)
    );
  }

  window.SuperXPhysics = {
    state: physics,
    setControl,
    start,
    stop,
    reset,
    update,
    setMaxSpeed,
    setSensitivity,
    getSpeed: () => physics.speed,
    getDistance: () => physics.distance
  };

  // Physics update loop
  let previousTime = 0;

  function physicsLoop(time) {
    requestAnimationFrame(physicsLoop);

    if (!physics.running) {
      previousTime = time;
      return;
    }

    if (!previousTime) previousTime = time;

    const dt = Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;

    update(dt);
  }

  requestAnimationFrame(physicsLoop);

})();

/* =========================================
   PART 18 END
========================================= */

