
/* =========================================================
   SUPERX LEGEND — FILE 17
   FILE: js/controls.js
   UNIFIED VEHICLE CONTROL SYSTEM
   START
========================================================= */

(function () {
  "use strict";

  window.SUPERX = window.SUPERX || {};
  const SX = window.SUPERX;

  const clamp = (v, min, max) =>
    Math.max(min, Math.min(max, v));

  SX.controls = {
    initialized: false,
    mode: "buttons",
    keys: {},
    activeTouches: new Map(),
    elements: {},
    sensitivity: 1,
    tiltEnabled: false,
    tiltValue: 0,
    deviceOrientationHandler: null,
    listeners: [],

    init(options = {}) {
      if (this.initialized) this.destroy();

      this.mode = options.mode || "buttons";
      this.sensitivity = clamp(
        Number(options.sensitivity) || 1,
        0.3,
        2.5
      );

      this.elements = {
        left: document.getElementById("controlLeft"),
        right: document.getElementById("controlRight"),
        accelerator: document.getElementById("controlAccelerator"),
        brake: document.getElementById("controlBrake"),
        handbrake: document.getElementById("controlHandbrake"),
        steering: document.getElementById("controlSteering"),
        horn: document.getElementById("controlHorn")
      };

      this.bindButtons();
      this.bindKeyboard();

      this.initialized = true;
      this.applyAllInputs();

      return true;
    },

    listen(element, eventName, handler) {
      if (!element) return;

      element.addEventListener(eventName, handler);

      this.listeners.push(() => {
        element.removeEventListener(eventName, handler);
      });
    },

    bindButtons() {
      const bindings = [
        ["left", "steer", -1],
        ["right", "steer", 1],
        ["accelerator", "throttle", 1],
        ["brake", "brake", 1],
        ["handbrake", "handbrake", true]
      ];

      bindings.forEach(([name, type, value]) => {
        const element = this.elements[name];
        if (!element) return;

        const start = event => {
          event.preventDefault();

          if (
            element.setPointerCapture &&
            event.pointerId !== undefined
          ) {
            try {
              element.setPointerCapture(event.pointerId);
            } catch (error) {}
          }

          this.activeTouches.set(name, true);
          element.classList.add("active");
          this.applyAllInputs();
        };

        const end = event => {
          if (event) event.preventDefault();

          this.activeTouches.delete(name);
          element.classList.remove("active");
          this.applyAllInputs();
        };

        this.listen(element, "pointerdown", start);
        this.listen(element, "pointerup", end);
        this.listen(element, "pointercancel", end);
        this.listen(element, "lostpointercapture", end);

        this.listen(element, "contextmenu", event => {
          event.preventDefault();
        });
      });

      const horn = this.elements.horn;

      if (horn) {
        const start = event => {
          event.preventDefault();
          horn.classList.add("active");

          if (SX.audio?.horn) SX.audio.horn(true);
        };

        const end = event => {
          if (event) event.preventDefault();

          horn.classList.remove("active");

          if (SX.audio?.horn) SX.audio.horn(false);
        };

        this.listen(horn, "pointerdown", start);
        this.listen(horn, "pointerup", end);
        this.listen(horn, "pointercancel", end);
        this.listen(horn, "lostpointercapture", end);
      }
    },

    bindKeyboard() {
      this.keyDownHandler = event => {
        const key = event.key.toLowerCase();

        if (
          ["arrowup", "arrowdown", "arrowleft",
           "arrowright", " "].includes(key)
        ) {
          event.preventDefault();
        }

        if (
          event.target &&
          ["INPUT", "TEXTAREA", "SELECT"].includes(
            event.target.tagName
          )
        ) return;

        this.keys[key] = true;
        this.applyAllInputs();
      };

      this.keyUpHandler = event => {
        this.keys[event.key.toLowerCase()] = false;
        this.applyAllInputs();
      };

      this.blurHandler = () => {
        this.keys = {};
        this.activeTouches.clear();
        this.updateButtonStyles();
        this.applyAllInputs();

        if (SX.audio?.horn) SX.audio.horn(false);
      };

      this.listen(window, "keydown", this.keyDownHandler);
      this.listen(window, "keyup", this.keyUpHandler);
      this.listen(window, "blur", this.blurHandler);
    },

    isKeyDown(...keys) {
      return keys.some(key => Boolean(this.keys[key]));
    },

    getKeyboardState() {
      return {
        throttle: this.isKeyDown("arrowup", "w") ? 1 :
          this.isKeyDown("arrowdown", "s") ? -1 : 0,

        brake: this.isKeyDown(" ") ? 1 : 0,

        steer: this.isKeyDown("arrowleft", "a") ? -1 :
          this.isKeyDown("arrowright", "d") ? 1 : 0,

        handbrake: this.isKeyDown("shift")
      };
    },

    getTouchState() {
      return {
        throttle: this.activeTouches.has("accelerator") ? 1 : 0,
        brake: this.activeTouches.has("brake") ? 1 : 0,

        steer: this.activeTouches.has("left") ? -1 :
          this.activeTouches.has("right") ? 1 : 0,

        handbrake: this.activeTouches.has("handbrake")
      };
    },

    applyAllInputs() {
      if (!SX.physics) return;

      const keyboard = this.getKeyboardState();
      const touch = this.getTouchState();

      let throttle = touch.throttle || keyboard.throttle;
      let brake = Math.max(touch.brake, keyboard.brake);

      let steer = touch.steer || keyboard.steer;

      if (this.tiltEnabled &&
          Math.abs(this.tiltValue) > 0.02 &&
          !touch.steer &&
          !keyboard.steer) {
        steer = this.tiltValue;
      }

      steer = clamp(
        steer * this.sensitivity,
        -1,
        1
      );

      SX.physics.setInput("throttle", throttle);
      SX.physics.setInput("brake", brake);
      SX.physics.setInput("steer", steer);

      SX.physics.setInput(
        "handbrake",
        touch.handbrake || keyboard.handbrake
      );
    },

    applyInput(type, value) {
      if (!SX.physics) return;
      SX.physics.setInput(type, value);
    },

    releaseInput() {
      this.applyAllInputs();
    },

    updateButtonStyles() {
      Object.values(this.elements).forEach(element => {
        if (element) element.classList.remove("active");
      });
    },

    setSensitivity(value) {
      this.sensitivity = clamp(
        Number(value) || 1,
        0.3,
        2.5
      );

      SX.physics?.setSensitivity(this.sensitivity);
      this.applyAllInputs();

      return this.sensitivity;
    },

    enableTilt() {
      if (!("DeviceOrientationEvent" in window)) {
        return false;
      }

      if (
        typeof DeviceOrientationEvent.requestPermission === "function"
      ) {
        return DeviceOrientationEvent.requestPermission()
          .then(permission => {
            if (permission !== "granted") return false;
            return this.startTiltListener();
          })
          .catch(() => false);
      }

      return this.startTiltListener();
    },

    startTiltListener() {
      this.disableTilt();

      this.deviceOrientationHandler = event => {
        if (typeof event.gamma !== "number") return;

        this.tiltValue = clamp(
          event.gamma / 30,
          -1,
          1
        );

        this.applyAllInputs();
      };

      window.addEventListener(
        "deviceorientation",
        this.deviceOrientationHandler
      );

      this.tiltEnabled = true;
      return true;
    },

    disableTilt() {
      if (this.deviceOrientationHandler) {
        window.removeEventListener(
          "deviceorientation",
          this.deviceOrientationHandler
        );
      }

      this.deviceOrientationHandler = null;
      this.tiltEnabled = false;
      this.tiltValue = 0;

      this.applyAllInputs();
      return true;
    },

    destroy() {
      this.disableTilt();

      this.listeners.forEach(remove => remove());
      this.listeners = [];

      this.keys = {};
      this.activeTouches.clear();
      this.updateButtonStyles();
      this.elements = {};
      this.initialized = false;

      if (SX.physics) SX.physics.clearInput();
    }
  };

})();

/* =========================================================
   SUPERX LEGEND — FILE 17
   END
========================================================= */
