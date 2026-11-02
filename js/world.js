
/* =========================================================
   SUPERX LEGEND — FILE 15
   FILE: js/world.js
   START
========================================================= */

(function () {
  "use strict";

  window.SUPERX = window.SUPERX || {};
  const SX = window.SUPERX;

  SX.world = {
    scene: null,
    camera: null,
    renderer: null,
    container: null,
    road: null,
    ground: null,
    scenery: [],
    lights: [],
    currentMap: null,
    animationId: null,
    clock: null,
    running: false,

    init(container, map) {
      if (!window.THREE) {
        console.error("SUPERX: Three.js is not loaded.");
        return false;
      }

      if (!container) {
        console.error("SUPERX: World container not found.");
        return false;
      }

      this.dispose();

      this.container = container;
      this.currentMap = map || null;

      const THREE = window.THREE;

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x777b91);
      this.scene.fog = new THREE.Fog(0x777b91, 90, 650);

      this.camera = new THREE.PerspectiveCamera(
        65,
        container.clientWidth / Math.max(1, container.clientHeight),
        0.1,
        1500
      );

      this.camera.position.set(0, 7, 15);
      this.camera.lookAt(0, 0, -12);

      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false
      });

      this.renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, 2)
      );

      this.renderer.setSize(
        container.clientWidth,
        container.clientHeight
      );

      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      container.appendChild(this.renderer.domElement);

      this.clock = new THREE.Clock();

      this.createLighting();
      this.createGround();
      this.createRoad();
      this.createScenery();
      this.resize();

      this.running = true;
      this.animate();

      return true;
    },

    createLighting() {
      const THREE = window.THREE;

      const ambient = new THREE.HemisphereLight(
        0xdde6ff,
        0x383044,
        1.8
      );

      this.scene.add(ambient);

      const sun = new THREE.DirectionalLight(
        0xffe4bd,
        2.2
      );

      sun.position.set(-35, 65, 30);
      sun.castShadow = true;

      sun.shadow.mapSize.width = 1024;
      sun.shadow.mapSize.height = 1024;

      this.scene.add(sun);

      this.lights = [ambient, sun];
    },

    getEnvironment() {
      const map = this.currentMap || {};
      const environment = String(
        map.environment || map.worldId || "village"
      ).toLowerCase();

      const environments = {
        village: {
          ground: 0x6b7546,
          road: 0x34343a,
          side: 0x9a865c,
          tree: 0x376b38,
          sky: 0x8caed0
        },

        city: {
          ground: 0x45454b,
          road: 0x292a30,
          side: 0x77777d,
          tree: 0x416b48,
          sky: 0x8797b5
        },

        mountains: {
          ground: 0x66645b,
          road: 0x33343a,
          side: 0x777064,
          tree: 0x365b3a,
          sky: 0x8ba6c1
        },

        snow: {
          ground: 0xe4e9ed,
          road: 0x646c78,
          side: 0xd4dce4,
          tree: 0x526d75,
          sky: 0xb8d3e8
        },

        desert: {
          ground: 0xc6a365,
          road: 0x45413b,
          side: 0xb68e58,
          tree: 0x667342,
          sky: 0xd5b98c
        },

        forest: {
          ground: 0x425b3e,
          road: 0x303b35,
          side: 0x61744e,
          tree: 0x244b2c,
          sky: 0x789c91
        },

        highway: {
          ground: 0x686b6d,
          road: 0x292b30,
          side: 0x8a8a85,
          tree: 0x4b7047,
          sky: 0x8ba8c8
        },

        racing: {
          ground: 0x55545c,
          road: 0x282830,
          side: 0x77717f,
          tree: 0x47624b,
          sky: 0x8998b8
        }
      };

      return environments[environment] || environments.village;
    },

    createGround() {
      const THREE = window.THREE;
      const env = this.getEnvironment();

      const geometry = new THREE.PlaneGeometry(
        1200,
        1800
      );

      const material = new THREE.MeshStandardMaterial({
        color: env.ground,
        roughness: 1
      });

      this.ground = new THREE.Mesh(geometry, material);
      this.ground.rotation.x = -Math.PI / 2;
      this.ground.position.y = -0.08;
      this.ground.position.z = -700;
      this.ground.receiveShadow = true;

      this.scene.add(this.ground);
    },

    createRoad() {
      const THREE = window.THREE;
      const env = this.getEnvironment();

      const route =
        SX.mapEngine && SX.mapEngine.routePoints
          ? SX.mapEngine.routePoints
          : [];

      const roadWidth = 12;
      const length = 1200;

      const points = route.length > 1
        ? route.map(point => ({
            x: point.x,
            z: point.z
          }))
        : [
            { x: 0, z: 0 },
            { x: 0, z: -length }
          ];

      const vertices = [];
      const indices = [];

      for (let i = 0; i < points.length; i++) {
        const current = points[i];
        const previous = points[Math.max(0, i - 1)];
        const next = points[Math.min(points.length - 1, i + 1)];

        const dx = next.x - previous.x;
        const dz = next.z - previous.z;

        const magnitude = Math.sqrt(dx * dx + dz * dz) || 1;

        const sideX = -dz / magnitude;
        const sideZ = dx / magnitude;

        vertices.push(
          current.x + sideX * roadWidth / 2,
          0.02,
          current.z + sideZ * roadWidth / 2,

          current.x - sideX * roadWidth / 2,
          0.02,
          current.z - sideZ * roadWidth / 2
        );

        if (i < points.length - 1) {
          const a = i * 2;
          const b = a + 1;
          const c = a + 2;
          const d = a + 3;

          indices.push(a, b, c, b, d, c);
        }
      }

      const geometry = new THREE.BufferGeometry();

      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3)
      );

      geometry.setIndex(indices);
      geometry.computeVertexNormals();

      const material = new THREE.MeshStandardMaterial({
        color: env.road,
        roughness: 0.95,
        side: THREE.DoubleSide
      });

      this.road = new THREE.Mesh(geometry, material);
      this.road.receiveShadow = true;

      this.scene.add(this.road);

      this.createRoadMarkings(points, roadWidth);
    },

    createRoadMarkings(points, roadWidth) {
      const THREE = window.THREE;

      const markingMaterial = new THREE.MeshBasicMaterial({
        color: 0xf2e8c8
      });

      const edgeMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff
      });

      const dashGeometry = new THREE.BoxGeometry(
        0.16,
        0.035,
        3.5
      );

      const edgeGeometry = new THREE.BoxGeometry(
        0.12,
        0.035,
        2.5
      );

      for (let i = 0; i < points.length - 1; i += 2) {
        const current = points[i];
        const next = points[i + 1];

        const dx = next.x - current.x;
        const dz = next.z - current.z;

        const angle = Math.atan2(dx, -dz);

        const centerX = (current.x + next.x) / 2;
        const centerZ = (current.z + next.z) / 2;

        const dash = new THREE.Mesh(
          dashGeometry,
          markingMaterial
        );

        dash.position.set(centerX, 0.065, centerZ);
        dash.rotation.y = angle;

        this.scene.add(dash);
        this.scenery.push(dash);

        [-1, 1].forEach(side => {
          const edge = new THREE.Mesh(
            edgeGeometry,
            edgeMaterial
          );

          edge.position.set(
            centerX + Math.cos(angle) * roadWidth * 0.43 * side,
            0.055,
            centerZ + Math.sin(angle) * roadWidth * 0.43 * side
          );

          edge.rotation.y = angle;

          this.scene.add(edge);
          this.scenery.push(edge);
        });
      }
    },

    createScenery() {
      const THREE = window.THREE;
      const env = this.getEnvironment();

      const route =
        SX.mapEngine && SX.mapEngine.routePoints
          ? SX.mapEngine.routePoints
          : [];

      const roadLength = route.length > 1
        ? Math.abs(route[route.length - 1].z - route[0].z)
        : 1200;

      const count = Math.min(
        100,
        Math.max(20, Math.floor(roadLength / 14))
      );

      for (let i = 0; i < count; i++) {
        const z = -20 - i * (roadLength / count);
        const side = i % 2 === 0 ? -1 : 1;

        const x = side * (14 + Math.random() * 28);

        this.createTree(x, z, env.tree);
      }
    },

    createTree(x, z, color) {
      const THREE = window.THREE;

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.4, 3, 6),
        new THREE.MeshStandardMaterial({
          color: 0x59412d
        })
      );

      trunk.position.set(x, 1.5, z);
      trunk.castShadow = true;

      const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(
          2 + Math.random() * 1.2,
          5 + Math.random() * 2,
          7
        ),
        new THREE.MeshStandardMaterial({
          color: color,
          roughness: 1
        })
      );

      leaves.position.set(x, 5, z);
      leaves.castShadow = true;

      this.scene.add(trunk);
      this.scene.add(leaves);

      this.scenery.push(trunk, leaves);
    },

    resize() {
      if (!this.renderer || !this.camera || !this.container) {
        return;
      }

      const width = Math.max(1, this.container.clientWidth);
      const height = Math.max(1, this.container.clientHeight);

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(width, height);
    },

    animate() {
      if (!this.running || !this.renderer) return;

      this.animationId = requestAnimationFrame(
        () => this.animate()
      );

      this.renderer.render(this.scene, this.camera);
    },

    update() {
      if (!this.renderer || !this.scene || !this.camera) {
        return;
      }

      this.renderer.render(this.scene, this.camera);
    },

    dispose() {
      this.running = false;

      if (this.animationId !== null) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }

      if (this.scene) {
        this.scene.traverse(object => {
          if (object.geometry) {
            object.geometry.dispose();
          }

          if (object.material) {
            const materials = Array.isArray(object.material)
              ? object.material
              : [object.material];

            materials.forEach(material => {
              Object.keys(material).forEach(key => {
                const value = material[key];

                if (value && value.isTexture) {
                  value.dispose();
                }
              });

              material.dispose();
            });
          }
        });
      }

      if (this.renderer) {
        this.renderer.dispose();

        if (
          this.container &&
          this.renderer.domElement.parentNode === this.container
        ) {
          this.container.removeChild(this.renderer.domElement);
        }
      }

      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.ground = null;
      this.road = null;
      this.scenery = [];
      this.lights = [];
      this.clock = null;
    }
  };

})();

/* =========================================================
   SUPERX LEGEND — FILE 15
   END
========================================================= */
          
