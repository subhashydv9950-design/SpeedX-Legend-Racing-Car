
/* =========================================================
   SUPERX LEGEND — FILE 71
   FILE: js/vehicle-camera-effects.js
   PURPOSE: Driving camera shake, speed effects and transitions
   START
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const CameraEffects = {
    camera: null,
    basePosition: null,
    baseFov: 60,

    enabled: true,
    initialized: false,

    speed: 0,
    collisionShake: 0,
    brakingShake: 0,
    transition: 0,

    settings: {
      speedFov: true,
      collisionShake: true,
      brakingEffect: true,
      maxFovIncrease: 12,
      maxShake: 0.12,
      smoothing: 7
    },

    init(options = {}) {
      this.camera = options.camera || null;

      if (!this.camera) {
        return false;
      }

      this.baseFov = Number.isFinite(
        this.camera.fov
      ) ? this.camera.fov : 60;

      this.basePosition = this.camera.position
        ? this.camera.position.clone()
        : null;

      this.collisionShake = 0;
      this.brakingShake = 0;
      this.transition = 0;

      this.initialized = true;

      return true;
    },

    setSpeed(speed) {
      this.speed = Math.max(
        0,
        Number(speed) || 0
      );
    },

    addCollision(intensity = 1) {
      if (!this.enabled ||
          !this.settings.collisionShake) {
        return;
      }

      const amount = Math.max(
        0,
        Math.min(1, Number(intensity) || 0)
      );

      this.collisionShake = Math.max(
        this.collisionShake,
        amount
      );
    },

    setBraking(active) {
      this.brakingShake = active ? 1 : 0;
    },

    setEnabled(enabled) {
      this.enabled = Boolean(enabled);

      if (!this.enabled) {
        this.resetCamera();
      }

      return this.enabled;
    },

    update(deltaTime = 0.016) {
      if (!this.initialized || !this.camera) {
        return;
      }

      const dt = Math.min(
        Math.max(deltaTime, 0),
        0.05
      );

      if (!this.enabled) {
        this.resetCamera();
        return;
      }

      this.updateFOV(dt);
      this.updateShake(dt);

      this.collisionShake = Math.max(
        0,
        this.collisionShake - dt * 2.5
      );

      this.transition = Math.max(
        0,
        this.transition - dt * 2
      );
    },

    updateFOV(dt) {
      if (!this.settings.speedFov ||
          typeof this.camera.fov !== "number") {
        return;
      }

      const speedRatio = Math.min(
        1,
        this.speed / 520
      );

      const targetFov = this.baseFov +
        speedRatio * this.settings.maxFovIncrease;

      const smoothing = Math.min(
        1,
        dt * this.settings.smoothing
      );

      this.camera.fov += (
        targetFov - this.camera.fov
      ) * smoothing;

      this.camera.updateProjectionMatrix?.();
    },

    updateShake(dt) {
      if (!this.camera.position ||
          !this.basePosition) {
        return;
      }

      const collision = this.settings.collisionShake
        ? this.collisionShake
        : 0;

      const braking = this.settings.brakingEffect
        ? this.brakingShake
        : 0;

      const speedRatio = Math.min(
        1,
        this.speed / 520
      );

      const shakeStrength =
        collision * 0.8 +
        braking * 0.08 +
        speedRatio * 0.015;

      const maxShake = this.settings.maxShake;

      const targetX = (
        Math.random() - 0.5
      ) * maxShake * shakeStrength;

      const targetY = (
        Math.random() - 0.5
      ) * maxShake * shakeStrength;

      const targetZ = (
        Math.random() - 0.5
      ) * maxShake * shakeStrength;

      const smoothing = Math.min(
        1,
        dt * 12
      );

      this.camera.position.x += (
        this.basePosition.x +
        targetX -
        this.camera.position.x
      ) * smoothing;

      this.camera.position.y += (
        this.basePosition.y +
        targetY -
        this.camera.position.y
      ) * smoothing;

      this.camera.position.z += (
        this.basePosition.z +
        targetZ -
        this.camera.position.z
      ) * smoothing;
    },

    resetCamera() {
      if (!this.camera) return;

      if (typeof this.camera.fov === "number") {
        this.camera.fov = this.baseFov;
        this.camera.updateProjectionMatrix?.();
      }

      if (this.basePosition &&
          this.camera.position) {
        this.camera.position.copy(
          this.basePosition
        );
      }

      this.collisionShake = 0;
      this.brakingShake = 0;
    },

    updateSettings(options = {}) {
      Object.keys(this.settings).forEach(key => {
        if (Object.prototype.hasOwnProperty.call(
          options,
          key
        )) {
          this.settings[key] = options[key];
        }
      });

      return { ...this.settings };
    },

    getState() {
      return {
        enabled: this.enabled,
        speed: this.speed,
        collisionShake: this.collisionShake,
        brakingShake: this.brakingShake,
        settings: { ...this.settings }
      };
    },

    destroy() {
      this.resetCamera();

      this.camera = null;
      this.basePosition = null;
      this.initialized = false;
    }
  };

  SX.vehicleCameraEffects = CameraEffects;

  window.addEventListener(
    "sx:vehicle-collision",
    event => {
      CameraEffects.addCollision(
        event.detail?.intensity || 1
      );
    }
  );

  window.addEventListener(
    "sx:vehicle-speed",
    event => {
      CameraEffects.setSpeed(
        event.detail?.speed || 0
      );
    }
  );

  window.addEventListener(
    "sx:vehicle-braking",
    event => {
      CameraEffects.setBraking(
        Boolean(event.detail?.active)
      );
    }
  );

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 71
   FILE: js/vehicle-camera-effects.js
   END
========================================================= */
