
/* SUPERX — PART 22C
   FILE: js/traffic.js */

(() => {
  "use strict";

  const A = {
    cars: [],
    running: false,
    timer: 0,
    interval: 2.5,
    maxCars: 9,
    cooldown: 0
  };

  const lanes = [-3.5, 0, 3.5];

  function world() {
    return window.SuperX3D?.getWorld?.();
  }

  function player() {
    return window.SuperX3D?.getPlayerCar?.();
  }

  function spawn() {
    const scene = world();
    if (!scene || A.cars.length >= A.maxCars) return;

    const car = window.SuperX3D?.createCar?.(
      Math.floor(Math.random() * 10)
    );
    if (!car) return;

    const lane = lanes[Math.floor(Math.random() * lanes.length)];

    // Avoid spawning directly on the player.
    if (Math.abs(lane - (player()?.position.x || 0)) < 1.5) {
      car.position.x = lane === 0 ? 3.5 : 0;
    } else {
      car.position.x = lane;
    }

    car.position.z = -90 - Math.random() * 70;
    car.userData.trafficSpeed = 45 + Math.random() * 85;
    car.userData.trafficLane = car.position.x;
    car.userData.isTrafficCar = true;

    scene.add(car);
    A.cars.push(car);
  }

  function remove(car) {
    world()?.remove(car);
    A.cars = A.cars.filter(item => item !== car);
  }

  function collide(p, car) {
    return Math.abs(p.position.x - car.position.x) < 1.65 &&
      Math.abs(p.position.z - car.position.z) < 3.2;
  }

  function collision() {
    if (A.cooldown > 0) return;
    A.cooldown = 1.2;

    const physics = window.SuperXPhysics?.state;
    if (physics) physics.speed = Math.max(0, physics.speed * 0.45);

    window.SuperXAudio?.playCollision?.();
    window.dispatchEvent(new CustomEvent("superx:collision"));
  }

  function start() {
    if (A.running) return;
    A.running = true;
    A.timer = 0;

    if (A.cars.length === 0) {
      for (let i = 0; i < 4; i++) spawn();
    }
  }

  function pause() {
    A.running = false;
  }

  function resume() {
    A.running = true;
  }

  function stop() {
    A.running = false;
    A.timer = 0;
    A.cooldown = 0;
    [...A.cars].forEach(remove);
  }

  function update(dt) {
    if (!A.running) return;

    dt = Math.min(Math.max(dt, 0), 0.05);

    const scene = world();
    const p = player();
    if (!scene || !p) return;

    A.timer += dt;
    A.cooldown = Math.max(0, A.cooldown - dt);

    if (A.timer >= A.interval) {
      A.timer = 0;
      spawn();
    }

    const playerSpeed = window.SuperXPhysics?.getSpeed?.() || 0;

    for (const car of [...A.cars]) {
      const relative = (playerSpeed - car.userData.trafficSpeed) * 0.018;
      car.position.z += relative * dt * 5;

      car.position.x +=
        (car.userData.trafficLane - car.position.x) *
        Math.min(1, dt * 2);

      if (collide(p, car)) collision();

      if (car.position.z > 25 || car.position.z < -240) {
        remove(car);
      }
    }
  }

  function setTrafficCount(value) {
    A.maxCars = Math.max(1, Math.min(15, Number(value) || 9));
  }

  window.SuperXTraffic = {
    start,
    pause,
    resume,
    stop,
    update,
    spawn,
    setTrafficCount,
    getCars: () => A.cars
  };
})();

/* PART 22C END */
