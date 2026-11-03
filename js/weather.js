/* =========================================================
   SUPERX LEGEND — FILE 22
   FILE: js/weather.js
   START
========================================================= */

(function () {
  "use strict";

  window.SUPERX = window.SUPERX || {};
  const SX = window.SUPERX;

  const WEATHER = {
    clear: { name: "Clear", fog: 0x9fc9e8, near: 80, far: 450 },
    rain:  { name: "Rain",  fog: 0x687887, near: 25, far: 190 },
    fog:   { name: "Fog",   fog: 0xabb3bd, near: 8,  far: 95 },
    snow:  { name: "Snow",  fog: 0xd5e0e9, near: 35, far: 210 }
  };

  const TIMES = ["morning", "day", "sunset", "night"];
  const PARTICLE_COUNT = 1100;

  let scene = null;
  let renderer = null;
  let camera = null;

  let weather = "clear";
  let timeOfDay = "day";
  let initialized = false;

  let particles = null;
  let geometry = null;
  let material = null;
  let positions = null;
  let speeds = null;

  let ambientLight = null;
  let sunLight = null;
  let ownsAmbient = false;
  let ownsSun = false;

  let originalFog = null;
  let originalClearColor = null;
  let originalClearAlpha = 1;

  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent("superx:" + name, {
      detail: detail || {}
    }));
  }

  function getClearColor() {
    if (timeOfDay === "night") return 0x101321;
    if (timeOfDay === "sunset") return 0xd88d75;
    if (timeOfDay === "morning") return 0xb5d5e9;

    if (weather === "rain") return 0x687887;
    if (weather === "fog") return 0xabb3bd;
    if (weather === "snow") return 0xd5e0e9;

    return 0x9fc9e8;
  }

  function createParticles() {
    if (!scene || particles) return;

    geometry = new THREE.BufferGeometry();
    positions = new Float32Array(PARTICLE_COUNT * 3);
    speeds = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = i * 3;

      positions[p] = (Math.random() - 0.5) * 100;
      positions[p + 1] = Math.random() * 45;
      positions[p + 2] = (Math.random() - 0.5) * 100;

      speeds[i] = weather === "snow"
        ? 2 + Math.random() * 4
        : 14 + Math.random() * 22;
    }

    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    material = new THREE.PointsMaterial({
      color: weather === "snow" ? 0xffffff : 0xb8d7ed,
      size: weather === "snow" ? 0.22 : 0.11,
      transparent: true,
      opacity: weather === "snow" ? 0.9 : 0.65,
      depthWrite: false,
      sizeAttenuation: true
    });

    particles = new THREE.Points(geometry, material);
    particles.frustumCulled = false;
    scene.add(particles);
  }

  function removeParticles() {
    if (particles && scene) {
      scene.remove(particles);
    }

    if (geometry) geometry.dispose();
    if (material) material.dispose();

    particles = null;
    geometry = null;
    material = null;
    positions = null;
    speeds = null;
  }

  function updateParticles(dt) {
    if (!particles || !positions || !camera) return;

    const snowing = weather === "snow";
    const center = camera.position;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = i * 3;

      if (snowing) {
        positions[p] += Math.sin(i * 0.7) * dt * 1.4;
        positions[p + 1] -= speeds[i] * dt;
        positions[p + 2] += Math.cos(i * 0.4) * dt;
      } else {
        positions[p] -= dt * 2;
        positions[p + 1] -= speeds[i] * dt;
        positions[p + 2] += speeds[i] * dt * 0.32;
      }

      const dx = positions[p] - center.x;
      const dy = positions[p + 1] - center.y;
      const dz = positions[p + 2] - center.z;

      if (dy < -12 || Math.abs(dx) > 65 || Math.abs(dz) > 65) {
        positions[p] = center.x + (Math.random() - 0.5) * 100;
        positions[p + 1] = center.y + 20 + Math.random() * 35;
        positions[p + 2] = center.z + (Math.random() - 0.5) * 100;
      }
    }

    geometry.attributes.position.needsUpdate = true;
  }

  function applyLighting() {
    if (!ambientLight || !sunLight) return;

    const settings = {
      morning: { ambient: 0.8, sun: 1.0, color: 0xffe0b0 },
      day:     { ambient: 1.0, sun: 1.2, color: 0xffffff },
      sunset:  { ambient: 0.65, sun: 0.8, color: 0xffa36b },
      night:   { ambient: 0.35, sun: 0.2, color: 0x8095d5 }
    };

    const data = settings[timeOfDay] || settings.day;

    let ambient = data.ambient;
    let sunlight = data.sun;

    if (weather === "rain" || weather === "fog") {
      ambient *= 0.7;
      sunlight *= 0.45;
    } else if (weather === "snow") {
      ambient *= 0.9;
    }

    ambientLight.intensity = ambient;
    sunLight.intensity = sunlight;
    sunLight.color.setHex(data.color);

    if (renderer) {
      renderer.setClearColor(getClearColor(), 1);
    }
  }

  function applyWeather() {
    if (!scene || !renderer) return;

    const data = WEATHER[weather];

    if (data) {
      scene.fog = new THREE.Fog(
        data.fog,
        data.near,
        data.far
      );
    }

    removeParticles();

    if (weather === "rain" || weather === "snow") {
      createParticles();
    }

    applyLighting();
  }

  function init(options) {
    options = options || {};

    if (typeof THREE === "undefined") return false;

    if (!options.scene || !options.renderer) {
      console.warn("SUPERX Weather: scene and renderer required.");
      return false;
    }

    if (initialized) dispose();

    scene = options.scene;
    renderer = options.renderer;
    camera = options.camera || null;

    originalFog = scene.fog || null;

    if (renderer.getClearColor) {
      originalClearColor = renderer.getClearColor(new THREE.Color()).clone();
      originalClearAlpha = renderer.getClearAlpha
        ? renderer.getClearAlpha()
        : 1;
    }

    ambientLight = options.ambientLight || null;
    sunLight = options.sunLight || null;

    ownsAmbient = !ambientLight;
    ownsSun = !sunLight;

    if (!ambientLight) {
      ambientLight = new THREE.AmbientLight(0xffffff, 1);
      scene.add(ambientLight);
    }

    if (!sunLight) {
      sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
      sunLight.position.set(-40, 80, 35);
      scene.add(sunLight);
    }

    initialized = true;
    applyWeather();

    return true;
  }

  function setWeather(type) {
    if (!WEATHER[type]) return false;

    weather = type;

    if (initialized) applyWeather();

    emit("weatherChanged", {
      weather: weather,
      timeOfDay: timeOfDay
    });

    return true;
  }

  function setTimeOfDay(time) {
    if (!TIMES.includes(time)) return false;

    timeOfDay = time;

    if (initialized) applyLighting();

    emit("timeChanged", {
      time: timeOfDay,
      weather: weather
    });

    return true;
  }

  function update(dt) {
    if (!initialized) return;

    dt = Math.max(0, Math.min(Number(dt) || 0, 0.1));
    updateParticles(dt);
  }

  function getWeatherTypes() {
    return Object.keys(WEATHER).map(function (id) {
      return {
        id: id,
        name: WEATHER[id].name
      };
    });
  }

  function getTimeOptions() {
    return TIMES.slice();
  }

  function getState() {
    return {
      initialized: initialized,
      weather: weather,
      timeOfDay: timeOfDay,
      particlesActive: !!particles
    };
  }

  function dispose() {
    removeParticles();

    if (scene) {
      scene.fog = originalFog;

      if (ownsAmbient && ambientLight) {
        scene.remove(ambientLight);
      }

      if (ownsSun && sunLight) {
        scene.remove(sunLight);
      }
    }

    if (renderer && originalClearColor) {
      renderer.setClearColor(originalClearColor, originalClearAlpha);
    }

    scene = null;
    renderer = null;
    camera = null;

    ambientLight = null;
    sunLight = null;
    ownsAmbient = false;
    ownsSun = false;

    originalFog = null;
    originalClearColor = null;
    initialized = false;
  }

  SX.weather = {
    init: init,
    setWeather: setWeather,
    setTimeOfDay: setTimeOfDay,
    update: update,
    getWeatherTypes: getWeatherTypes,
    getTimeOptions: getTimeOptions,
    getState: getState,
    dispose: dispose
  };

})();

/* =========================================================
   SUPERX LEGEND — FILE 22
   END
========================================================= */

