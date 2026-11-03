/* =========================================================
   SUPERX LEGEND — FILE 21
   FILE: js/camera.js
   PURPOSE: Advanced 4-Mode Vehicle Camera System
   START
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const CAMERA_MODES = [
    {
      id: "third",
      name: "Third Person",
      position: { x: 0, y: 5.2, z: 11.5 },
      lookAt: { x: 0, y: 1.2, z: 0 },
      fov: 65
    },
    {
      id: "close",
      name: "Close Chase",
      position: { x: 0, y: 3.2, z: 6.2 },
      lookAt: { x: 0, y: 1, z: 0 },
      fov: 72
    },
    {
      id: "front",
      name: "Front / Bumper",
      position: { x: 0, y: 1.5, z: -1.8 },
      lookAt: { x: 0, y: 1.2, z: -12 },
      fov: 75
    },
    {
      id: "cockpit",
      name: "Cockpit",
      position: { x: 0, y: 1.65, z: 0.25 },
      lookAt: { x: 0, y: 1.4, z: -12 },
      fov: 78
    }
  ];

  let camera = null;
  let car = null;
  let modeIndex = 0;
  let smoothness = 5;
  let initialized = false;
  let lookTarget = null;
  let positionTarget = null;
  let enabled = true;

  function getThree() {
    return window.THREE || null;
  }

  function getMode() {
    return CAMERA_MODES[modeIndex];
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function makeWorldPoint(localPoint) {
    const THREE = getThree();

    if (!THREE || !car) return null;

    const point = new THREE.Vector3(
      localPoint.x,
      localPoint.y,
      localPoint.z
    );

    if (typeof car.localToWorld === "function") {
      car.updateMatrixWorld?.(true);
      car.localToWorld(point);
      return point;
    }

    point.add(car.position || new THREE.Vector3());
    return point;
  }

  function setCameraPosition(position, target, dt) {
    if (!camera || !car) return;

    const desiredPosition = makeWorldPoint(position);
    const desiredLook = makeWorldPoint(target);

    if (!desiredPosition || !desiredLook) return;

    const factor = 1 - Math.exp(
      -smoothness * clamp(dt, 0.001, 0.1)
    );

    if (!positionTarget) {
      positionTarget = desiredPosition.clone();
    } else {
      positionTarget.lerp(desiredPosition, factor);
    }

    if (!lookTarget) {
      lookTarget = desiredLook.clone();
    } else {
      lookTarget.lerp(desiredLook, factor);
    }

    camera.position.lerp(positionTarget, factor);
    camera.lookAt(lookTarget);
  }

  function dispatchChange() {
    const mode = getMode();

    if (SX.ui && typeof SX.ui.showToast === "function") {
      SX.ui.showToast(mode.name);
    }

    if (typeof document !== "undefined") {
      document.dispatchEvent(
        new CustomEvent("superx:cameraChanged", {
          detail: {
            id: mode.id,
            name: mode.name,
            index: modeIndex
          }
        })
      );
    }
  }

  function applyMode() {
    if (!camera) return false;

    const mode = getMode();

    camera.fov = mode.fov;

    if (typeof camera.updateProjectionMatrix === "function") {
      camera.updateProjectionMatrix();
    }

    lookTarget = null;
    positionTarget = null;

    dispatchChange();

    return true;
  }

  function init(options = {}) {
    const THREE = getThree();

    if (!THREE) {
      console.warn("SUPERX Camera: Three.js is unavailable.");
      return false;
    }

    const nextCamera = options.camera;
    const nextCar = options.car;

    if (!nextCamera || !nextCar) {
      console.warn("SUPERX Camera: camera or vehicle missing.");
      return false;
    }

    camera = nextCamera;
    car = nextCar;

    modeIndex = 0;
    lookTarget = null;
    positionTarget = null;
    enabled = true;
    initialized = true;

    applyMode();
    update(1 / 60);

    return true;
  }

  function update(dt = 0.016) {
    if (!initialized || !enabled || !camera || !car) {
      return false;
    }

    const mode = getMode();

    setCameraPosition(
      mode.position,
      mode.lookAt,
      clamp(Number(dt) || 0.016, 0.001, 0.1)
    );

    return true;
  }

  function next() {
    modeIndex = (modeIndex + 1) % CAMERA_MODES.length;
    applyMode();
    return getMode();
  }

  function previous() {
    modeIndex = (
      modeIndex - 1 + CAMERA_MODES.length
    ) % CAMERA_MODES.length;

    applyMode();
    return getMode();
  }

  function setMode(mode) {
    const index = CAMERA_MODES.findIndex(item =>
      item.id === mode || item.name === mode
    );

    if (index < 0) return false;

    modeIndex = index;
    applyMode();

    return true;
  }

  function setCar(newCar) {
    if (!newCar) return false;

    car = newCar;
    lookTarget = null;
    positionTarget = null;

    return true;
  }

  function setCamera(newCamera) {
    if (!newCamera) return false;

    camera = newCamera;

    if (initialized) {
      applyMode();
    }

    return true;
  }

  function setSmoothness(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) return false;

    smoothness = clamp(number, 1, 15);

    return true;
  }

  function setEnabled(value) {
    enabled = Boolean(value);

    if (enabled) {
      lookTarget = null;
      positionTarget = null;
    }

    return enabled;
  }

  function getModes() {
    return CAMERA_MODES.map(mode => ({
      id: mode.id,
      name: mode.name,
      fov: mode.fov
    }));
  }

  function getState() {
    return {
      initialized,
      enabled,
      mode: getMode().id,
      modeName: getMode().name,
      modeIndex,
      totalModes: CAMERA_MODES.length,
      smoothness
    };
  }

  function dispose() {
    camera = null;
    car = null;
    lookTarget = null;
    positionTarget = null;

    initialized = false;
    enabled = true;
    modeIndex = 0;

    return true;
  }

  SX.camera = {
    init,
    update,
    next,
    previous,
    setMode,
    setCar,
    setCamera,
    setSmoothness,
    setEnabled,
    getModes,
    getState,
    dispose
  };

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 21
   END
========================================================= */
