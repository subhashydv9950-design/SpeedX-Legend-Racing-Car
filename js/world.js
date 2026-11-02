
/* ==========================================
   SUPERX LEGEND RACING CAR
   PART 4 — 3D WORLD SYSTEM
   FILE: js/world.js
========================================== */

(() => {
  "use strict";

  if (!window.THREE) {
    console.error("SUPERX: Three.js load nahi hua.");
    return;
  }

  const THREE = window.THREE;
  const worlds = {};
  let activeCarIndex = 0;
  let animationStarted = false;
  let roadOffset = 0;

  const colors = {
    road: 0x292b33,
    line: 0xffffff,
    ground: 0x171a20,
    purple: 0x853dff
  };

  function makeMaterial(color, roughness = 0.65, metalness = 0.15) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness
    });
  }

  function addBox(parent, name, size, position, material) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size[0], size[1], size[2]),
      material
    );

    mesh.name = name;
    mesh.position.set(position[0], position[1], position[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function addCylinder(parent, radius, length, position, material) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, length, 20),
      material
    );

    mesh.rotation.z = Math.PI / 2;
    mesh.position.set(position[0], position[1], position[2]);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  /* ---------- CAR MODEL ---------- */

  function createCar(color = 0x8b35ff) {
    const car = new THREE.Group();
    car.name = "SUPERX_CAR";

    const bodyMat = makeMaterial(color, 0.28, 0.65);
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x182838,
      roughness: 0.15,
      metalness: 0.45
    });
    const tyreMat = makeMaterial(0x101115, 0.95, 0.05);
    const rimMat = makeMaterial(0xbec5d0, 0.25, 0.8);
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xe9f4ff,
      emissive: 0x8bbcff,
      emissiveIntensity: 1.4
    });
    const tailMat = new THREE.MeshStandardMaterial({
      color: 0xff172e,
      emissive: 0xff001a,
      emissiveIntensity: 0.8
    });

    // Main body
    addBox(
      car, "car_body",
      [2.05, 0.55, 4.1],
      [0, 0.77, 0],
      bodyMat
    );

    // Hood
    addBox(
      car, "car_hood",
      [1.9, 0.2, 1.15],
      [0, 1.04, -1.28],
      bodyMat
    );

    // Roof and cabin
    addBox(
      car, "car_roof",
      [1.45, 0.65, 1.8],
      [0, 1.38, 0.05],
      glassMat
    );

    // Front and rear bumpers
    addBox(
      car, "front_bumper",
      [2.12, 0.22, 0.28],
      [0, 0.53, -2.08],
      bodyMat
    );

    addBox(
      car, "rear_bumper",
      [2.12, 0.22, 0.28],
      [0, 0.53, 2.08],
      bodyMat
    );

    // Wheels
    const wheelPositions = [
      [-1.02, 0.47, -1.35],
      [ 1.02, 0.47, -1.35],
      [-1.02, 0.47,  1.35],
      [ 1.02, 0.47,  1.35]
    ];

    const wheels = [];

    wheelPositions.forEach((p) => {
      const wheel = new THREE.Group();
      wheel.position.set(p[0], p[1], p[2]);

      const tyre = new THREE.Mesh(
        new THREE.CylinderGeometry(0.43, 0.43, 0.24, 24),
        tyreMat
      );
      tyre.rotation.z = Math.PI / 2;
      tyre.castShadow = true;
      wheel.add(tyre);

      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.23, 0.23, 0.255, 16),
        rimMat
      );
      rim.rotation.z = Math.PI / 2;
      wheel.add(rim);

      car.add(wheel);
      wheels.push(wheel);
    });

    // Front lights
    addBox(
      car, "headlight_left",
      [0.38, 0.13, 0.08],
      [-0.62, 0.91, -2.13],
      lampMat
    );

    addBox(
      car, "headlight_right",
      [0.38, 0.13, 0.08],
      [0.62, 0.91, -2.13],
      lampMat
    );

    // Rear lights
    addBox(
      car, "tail_left",
      [0.4, 0.13, 0.08],
      [-0.63, 0.87, 2.13],
      tailMat
    );

    addBox(
      car, "tail_right",
      [0.4, 0.13, 0.08],
      [0.63, 0.87, 2.13],
      tailMat
    );

    // Sport spoiler
    addBox(
      car, "spoiler",
      [1.45, 0.09, 0.24],
      [0, 1.45, 1.72],
      bodyMat
    );

    car.userData.wheels = wheels;
    car.userData.bodyMaterial = bodyMat;
    return car;
  }

  /* ---------- WORLD SETUP ---------- */

  function createWorld(canvasId, type) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, 1.5)
    );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(type === "race" ? 0x9bb9d4 : 0x090a10);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(
      type === "race" ? 0x9bb9d4 : 0x090a10
    );

    if (type === "race") {
      scene.fog = new THREE.Fog(0x9bb9d4, 45, 190);
    } else {
      scene.fog = new THREE.Fog(0x090a10, 20, 90);
    }

    const camera = new THREE.PerspectiveCamera(
      60, 1, 0.1, 500
    );

    scene.add(new THREE.HemisphereLight(0xc7ddff, 0x24202e, 2));

    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(-8, 18, -10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300),
      makeMaterial(type === "race" ? 0x627c52 : 0x11131b)
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.08;
    ground.receiveShadow = true;
    scene.add(ground);

    const world = {
      canvas,
      renderer,
      scene,
      camera,
      type,
      car: null,
      roadMarks: [],
      scenery: [],
      traffic: [],
      lastWidth: 0,
      lastHeight: 0
    };

    worlds[type] = world;

    if (type === "showroom") {
      createShowroom(world);
    } else if (type === "garage") {
      createGarage(world);
    } else {
      createRaceWorld(world);
    }

    resizeWorld(world);
    return world;
  }

  /* ---------- SHOWROOM ---------- */

  function createShowroom(world) {
    const { scene, camera } = world;

    camera.position.set(6.5, 4.1, 7.8);
    camera.lookAt(0, 0.7, 0);

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(4.1, 4.1, 0.22, 64),
      makeMaterial(0x24202f, 0.35, 0.65)
    );
    platform.position.y = 0.02;
    platform.receiveShadow = true;
    scene.add(platform);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.4, 0.035, 8, 100),
      new THREE.MeshBasicMaterial({ color: colors.purple })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.15;
    scene.add(ring);

    world.car = createCar();
    world.car.position.y = 0.12;
    scene.add(world.car);
  }

  /* ---------- GARAGE ---------- */

  function createGarage(world) {
    const { scene, camera } = world;

    camera.position.set(5.7, 3.2, 6.5);
    camera.lookAt(0, 0.8, 0);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      makeMaterial(0x20212b, 0.5, 0.3)
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.03;
    scene.add(floor);

    // Purple light panels
    for (let i = -2; i <= 2; i++) {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.02, 7),
        new THREE.MeshBasicMaterial({ color: colors.purple })
      );
      strip.position.set(i * 1.1, 0.02, 0);
      scene.add(strip);
    }

    world.car = createCar();
    world.car.position.y = 0.05;
    scene.add(world.car);
  }

  /* ---------- RACE ROAD ---------- */

  function createRaceWorld(world) {
    const { scene, camera } = world;

    camera.position.set(0, 5.4, 9.5);
    camera.lookAt(0, 1, -12);

    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 260),
      makeMaterial(colors.road, 0.9, 0.05)
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -85);
    road.name = "race_road";
    scene.add(road);
    world.road = road;

    // Road edge lines
    [-5.55, 5.55].forEach((x) => {
      const edge = new THREE.Mesh(
        new THREE.BoxGeometry(0.13, 0.025, 260),
        makeMaterial(0xf1f1f1)
      );
      edge.position.set(x, 0.025, -85);
      scene.add(edge);
    });

    // Dashed lane markers
    for (let z = 30; z >= -220; z -= 8) {
      [-2, 2].forEach((x) => {
        const mark = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.025, 3.4),
          makeMaterial(colors.line)
        );
        mark.position.set(x, 0.035, z);
        scene.add(mark);
        world.roadMarks.push(mark);
      });
    }

    // Guardrails
    [-6.2, 6.2].forEach((x) => {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.55, 260),
        makeMaterial(0x737d8a, 0.35, 0.6)
      );
      rail.position.set(x, 0.36, -85);
      scene.add(rail);
    });

    // Basic roadside trees
    const treeMat = makeMaterial(0x245c34);
    const trunkMat = makeMaterial(0x59402c);

    for (let z = 25; z >= -210; z -= 13) {
      [-10, 10].forEach((x) => {
        const tree = new THREE.Group();

        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.22, 1.3, 8),
          trunkMat
        );
        trunk.position.y = 0.65;
        tree.add(trunk);

        const crown = new THREE.Mesh(
          new THREE.ConeGeometry(0.9, 2.2, 8),
          treeMat
        );
        crown.position.y = 2.1;
        tree.add(crown);

        tree.position.set(x, 0, z);
        scene.add(tree);
        world.scenery.push(tree);
      });
    }

    world.car = createCar();
    world.car.position.set(0, 0.03, 2);
    scene.add(world.car);
  }

  /* ---------- CAR SELECTION ---------- */

  function paintCar(world, index) {
    if (!world || !world.car) return;

    const palette = [
      0x8b35ff, 0xe52335, 0x1788ff, 0xffffff,
      0x111111, 0xf0a51b, 0x1cc9a0, 0xff58b5,
      0x6f7788, 0x40c9ff
    ];

    const color = palette[index % palette.length];
    world.car.userData.bodyMaterial.color.setHex(color);
  }

  function selectGarageCar(index) {
    activeCarIndex = Math.max(0, Number(index) || 0);

    paintCar(worlds.showroom, activeCarIndex);
    paintCar(worlds.garage, activeCarIndex);
  }

  /* ---------- RESIZE ---------- */

  function resizeWorld(world) {
    if (!world || !world.canvas) return;

    const rect = world.canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);

    if (
      width === world.lastWidth &&
      height === world.lastHeight
    ) return;

    world.lastWidth = width;
    world.lastHeight = height;

    world.renderer.setSize(width, height, false);
    world.camera.aspect = width / height;
    world.camera.updateProjectionMatrix();
  }

  window.addEventListener("resize", () => {
    Object.values(worlds).forEach(resizeWorld);
  });

  /* ---------- ANIMATION ---------- */

  function animate() {
    requestAnimationFrame(animate);

    Object.values(worlds).forEach((world) => {
      if (!world) return;

      // Keep hidden screens light on mobile
      if (
        world.canvas.offsetParent === null &&
        world.type !== "race"
      ) return;

      resizeWorld(world);

      if (world.type === "showroom" && world.car) {
        world.car.rotation.y += 0.003;
      }

      if (world.type === "garage" && world.car) {
        world.car.rotation.y += 0.0015;
      }

      if (world.type === "race") {
        // Road marker motion is connected to race speed later.
        roadOffset += 0.12;

        world.roadMarks.forEach((mark) => {
          mark.position.z += 0.12;

          if (mark.position.z > 32) {
            mark.position.z -= 256;
          }
        });

        world.scenery.forEach((tree) => {
          tree.position.z += 0.12;

          if (tree.position.z > 30) {
            tree.position.z -= 247;
          }
        });
      }

      world.renderer.render(world.scene, world.camera);
    });
  }

  function init() {
    createWorld("showroomCanvas", "showroom");
    createWorld("garageCanvas", "garage");
    createWorld("raceCanvas", "race");

    if (!animationStarted) {
      animationStarted = true;
      animate();
    }

    window.SuperX3D = {
      selectGarageCar,
      getWorld: (name) => worlds[name] || null,
      createCar,
      getActiveCarIndex: () => activeCarIndex
    };

    console.log("SUPERX 3D World System ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

/* ========== END OF PART 4 ========== */
                   
