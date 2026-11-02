/* SUPERX — PART 22A
   FILE: js/world.js */

(() => {
  "use strict";

  const T = window.THREE;
  if (!T) {
    console.error("Three.js missing");
    return;
  }

  const S = {
    scenes: {},
    cameras: {},
    renderers: {},
    cars: {},
    markers: [],
    objects: [],
    activeCarIndex: 0,
    speed: 0,
    raceActive: false,
    initialized: false
  };

  const colors = [
    0x9b35ff, 0xff3030, 0x00aaff, 0xffcc22,
    0xffffff, 0x222222, 0x00dd99, 0xff6600,
    0x3366ff, 0xdd44aa
  ];

  function makeCar(index = 0) {
    const car = new T.Group();
    const paint = new T.MeshStandardMaterial({
      color: colors[index % colors.length],
      metalness: 0.7,
      roughness: 0.25
    });
    const glass = new T.MeshStandardMaterial({
      color: 0x142638,
      metalness: 0.5,
      roughness: 0.15
    });
    const rubber = new T.MeshStandardMaterial({
      color: 0x101014,
      roughness: 0.8
    });

    function part(geometry, material, x, y, z) {
      const mesh = new T.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      car.add(mesh);
      return mesh;
    }

    part(new T.BoxGeometry(2.1, 0.55, 4.4), paint, 0, 0.75, 0);
    part(new T.BoxGeometry(1.65, 0.65, 2.1), glass, 0, 1.3, -0.25);
    part(new T.BoxGeometry(1.9, 0.16, 1.15), paint, 0, 1.02, 1.45);
    part(new T.BoxGeometry(1.7, 0.12, 0.35), rubber, 0, 1.35, -2.05);

    const wheels = [];
    for (const x of [-1.05, 1.05]) {
      for (const z of [-1.45, 1.45]) {
        const wheel = part(
          new T.CylinderGeometry(0.43, 0.43, 0.28, 20),
          rubber, x, 0.48, z
        );
        wheel.rotation.z = Math.PI / 2;
        wheels.push(wheel);
      }
    }

    for (const x of [-0.7, 0.7]) {
      part(
        new T.BoxGeometry(0.42, 0.18, 0.08),
        new T.MeshBasicMaterial({ color: 0xdff5ff }),
        x, 0.83, 2.22
      );
      part(
        new T.BoxGeometry(0.4, 0.17, 0.08),
        new T.MeshBasicMaterial({ color: 0xff1515 }),
        x, 0.82, -2.22
      );
    }

    car.userData.wheels = wheels;
    car.userData.carIndex = index;
    return car;
  }

  function makeScene(bg) {
    const scene = new T.Scene();
    scene.background = new T.Color(bg);
    scene.fog = new T.Fog(bg, 35, 180);
    scene.add(new T.AmbientLight(0xffffff, 1.4));

    const sun = new T.DirectionalLight(0xffffff, 2);
    sun.position.set(-8, 15, 10);
    scene.add(sun);
    return scene;
  }

  function rendererFor(canvas) {
    if (!canvas) return null;
    return new T.WebGLRenderer({
      canvas,
      antialias: true
    });
  }

  function resize(key) {
    const renderer = S.renderers[key];
    const camera = S.cameras[key];
    if (!renderer || !camera) return;

    const canvas = renderer.domElement;
    const w = canvas.clientWidth || 320;
    const h = canvas.clientHeight || 200;

    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function buildShowroom(canvas, key, index) {
    if (!canvas) return;

    const scene = makeScene(0x090a12);
    const platform = new T.Mesh(
      new T.CylinderGeometry(5, 5, 0.35, 48),
      new T.MeshStandardMaterial({
        color: 0x292236,
        metalness: 0.6
      })
    );
    platform.position.y = 0.1;
    scene.add(platform);

    const car = makeCar(index);
    car.position.y = 0.3;
    scene.add(car);

    const camera = new T.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(7, 4, 8);
    camera.lookAt(0, 0.8, 0);

    S.scenes[key] = scene;
    S.cameras[key] = camera;
    S.renderers[key] = rendererFor(canvas);
    S.cars[key] = car;
  }

  function buildRaceWorld() {
    const scene = makeScene(0x101522);

    const ground = new T.Mesh(
      new T.PlaneGeometry(500, 500),
      new T.MeshStandardMaterial({ color: 0x171923 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const road = new T.Mesh(
      new T.PlaneGeometry(12, 500),
      new T.MeshStandardMaterial({ color: 0x292b32 })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -100);
    scene.add(road);

    for (const x of [-5.7, 5.7]) {
      const edge = new T.Mesh(
        new T.BoxGeometry(0.12, 0.025, 500),
        new T.MeshBasicMaterial({ color: 0xffffff })
      );
      edge.position.set(x, 0.02, -100);
      scene.add(edge);
    }

    S.markers = [];
    S.objects = [];

    for (let i = 0; i < 30; i++) {
      const marker = new T.Mesh(
        new T.BoxGeometry(0.13, 0.025, 3.5),
        new T.MeshBasicMaterial({ color: 0xffffff })
      );
      marker.position.set(0, 0.035, -i * 12);
      scene.add(marker);
      S.markers.push(marker);
    }

    for (let i = 0; i < 24; i++) {
      for (const side of [-1, 1]) {
        const tree = new T.Group();
        const trunk = new T.Mesh(
          new T.CylinderGeometry(0.16, 0.22, 1.6, 7),
          new T.MeshStandardMaterial({ color: 0x684027 })
        );
        trunk.position.y = 0.8;
        tree.add(trunk);

        const leaves = new T.Mesh(
          new T.ConeGeometry(0.9, 2.4, 8),
          new T.MeshStandardMaterial({ color: 0x176b39 })
        );
        leaves.position.y = 2.3;
        tree.add(leaves);

        tree.position.set(side * 11, 0, -i * 20);
        scene.add(tree);
        S.objects.push(tree);
      }
    }

    const player = makeCar(S.activeCarIndex);
    player.position.set(0, 0, 3);
    player.userData.isPlayerCar = true;
    scene.add(player);

    // Traffic and physics share this exact player reference.
    scene.playerCar = player;

    const camera = new T.PerspectiveCamera(65, 1, 0.1, 700);
    camera.position.set(0, 5.5, 10);
    camera.lookAt(0, 1, -8);

    S.scenes.race = scene;
    S.cameras.race = camera;
    S.renderers.race = rendererFor(
      document.getElementById("raceCanvas")
    );
    S.cars.player = player;
  }

  function startRaceWorld() {
    if (!S.scenes.race) buildRaceWorld();

    // Important: allow an existing world to run again.
    S.raceActive = true;
    return S.scenes.race;
  }

  function stopRaceWorld() {
    S.raceActive = false;
    S.speed = 0;
  }

  function setWorldSpeed(value) {
    S.speed = Math.max(0, Number(value) || 0);
  }

  function selectGarageCar(index) {
    index = Math.max(0, Number(index) || 0);
    S.activeCarIndex = index;

    const old = S.cars.garage;
    if (old && S.scenes.garage) {
      S.scenes.garage.remove(old);
    }

    const car = makeCar(index);
    car.position.y = 0.3;
    S.scenes.garage?.add(car);
    S.cars.garage = car;
    return car;
  }

  function setRaceCamera(view = 0) {
    const camera = S.cameras.race;
    const player = S.cars.player;
    if (!camera || !player) return;

    if (view === 1) {
      camera.position.set(0, 2.2, 7);
    } else if (view === 2) {
      camera.position.set(0, 1.5, 0.5);
    } else if (view === 3) {
      camera.position.set(0, 8, -7);
    } else {
      camera.position.set(0, 5.5, 10);
    }
    camera.lookAt(player.position);
  }

  function animate() {
    requestAnimationFrame(animate);

    if (S.cars.showroom) S.cars.showroom.rotation.y += 0.003;
    if (S.cars.garage) S.cars.garage.rotation.y += 0.002;

    if (S.raceActive) {
      const movement = S.speed * 0.0007;

      for (const marker of S.markers) {
        marker.position.z += movement;
        if (marker.position.z > 12) marker.position.z -= 360;
      }

      for (const object of S.objects) {
        object.position.z += movement;
        if (object.position.z > 15) object.position.z -= 480;
      }
    }

    for (const key of Object.keys(S.renderers)) {
      resize(key);
      if (S.scenes[key]) {
        S.renderers[key].render(S.scenes[key], S.cameras[key]);
      }
    }
  }

  function initialize() {
    if (S.initialized) return;
    S.initialized = true;

    buildShowroom(
      document.getElementById("showroomCanvas"),
      "showroom", 0
    );

    buildShowroom(
      document.getElementById("garageCanvas"),
      "garage", 0
    );

    requestAnimationFrame(animate);
  }

  window.SuperX3D = {
    createCar: makeCar,
    selectGarageCar,
    getWorld: () => S.scenes.race || null,
    getPlayerCar: () => S.cars.player || null,
    getActiveCarIndex: () => S.activeCarIndex,
    startRaceWorld,
    stopRaceWorld,
    setWorldSpeed,
    setRaceCamera
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();

/* PART 22A END */

