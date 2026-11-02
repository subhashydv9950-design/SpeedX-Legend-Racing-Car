
/* =====================================================
   SUPERX LEGEND — PART 30 START
   FILE: js/physics.js
===================================================== */

(() => {
  "use strict";

  const P = {
    speed: 0,
    maxSpeed: 240,
    acceleration: 42,
    braking: 100,
    steeringPower: 4.5,
    steering: 0,
    throttle: false,
    brake: false,
    left: false,
    right: false,
    handbrake: false,
    gear: 1,
    rpm: 900,
    distance: 0,
    running: false,
    paused: false
  };

  function setControl(name, value) {
    if (name in P) P[name] = Boolean(value);
  }

  function releaseControls() {
    ["throttle", "brake", "left", "right", "handbrake"]
      .forEach(name => P[name] = false);
  }

  function reset() {
    P.speed = 0;
    P.steering = 0;
    P.gear = 1;
    P.rpm = 900;
    P.distance = 0;
    releaseControls();
  }

  function startNewRace() {
    reset();
    P.running = true;
    P.paused = false;
  }

  function pause() {
    P.running = false;
    P.paused = true;
    releaseControls();
  }

  function resume() {
    if (!P.paused) return;
    P.paused = false;
    P.running = true;
  }

  function stop() {
    P.running = false;
    P.paused = false;
    reset();
  }

  function update(dt) {
    if (!P.running || P.paused) return;

    dt = Math.min(Math.max(Number(dt) || 0, 0), 0.05);

    if (P.throttle && !P.brake) {
      P.speed += P.acceleration * dt;
    }

    if (P.brake) {
      P.speed -= P.braking * dt;
    }

    if (P.handbrake) {
      P.speed -= 75 * dt;
    }

    if (!P.throttle && !P.brake && !P.handbrake) {
      P.speed -= 7 * dt;
    }

    P.speed = Math.max(0, Math.min(P.maxSpeed, P.speed));

    const direction =
      (P.right ? 1 : 0) - (P.left ? 1 : 0);

    if (direction) {
      P.steering += direction * P.steeringPower * dt;
    } else {
      P.steering *= Math.max(0, 1 - 5 * dt);
    }

    P.steering = Math.max(-1, Math.min(1, P.steering));

    const player = window.SuperX3D?.getPlayerCar?.();

    if (player) {
      const factor = Math.max(0.25, P.speed / 120);

      player.position.x += P.steering * factor * dt * 4;
      player.position.x = Math.max(-4.4, Math.min(4.4, player.position.x));

      player.rotation.y = -P.steering * 0.22;

      player.userData.wheels?.forEach(wheel => {
        wheel.rotation.x -= P.speed * dt * 0.025;
      });
    }

    P.gear = P.speed < 1
      ? 1
      : Math.min(6, Math.max(1, Math.ceil(P.speed / 40)));

    P.rpm = Math.round(900 + (P.speed / P.maxSpeed) * 6200);
    P.distance += P.speed * dt / 3600;

    window.SuperX3D?.setWorldSpeed?.(P.speed);

    updateHUD();
  }

  function updateHUD() {
    const speed = document.getElementById("speedValue");
    const gear = document.getElementById("gearValue");
    const rpm = document.getElementById("rpmValue");

    if (speed) speed.textContent = Math.round(P.speed);
    if (gear) gear.textContent = P.gear;
    if (rpm) rpm.textContent = P.rpm;
  }

  function setMaxSpeed(value) {
    P.maxSpeed = Math.max(50, Number(value) || 240);
    P.speed = Math.min(P.speed, P.maxSpeed);
  }

  function setSensitivity(value) {
    P.steeringPower = Math.max(
      1,
      Math.min(10, Number(value) || 4.5)
    );
  }

  window.SuperXPhysics = {
    state: P,
    setControl,
    releaseControls,
    start: startNewRace,
    startNewRace,
    pause,
    resume,
    stop,
    reset,
    update,
    updateHUD,
    setMaxSpeed,
    setSensitivity,
    getSpeed: () => P.speed,
    getDistance: () => P.distance
  };

})();

/* =====================================================
   SUPERX LEGEND — PART 30 END
===================================================== */
