
/* =========================================================
   SUPERX LEGEND — FILE 17
   FILE: js/controls.js
   START
========================================================= */

(function () {
  "use strict";

  window.SUPERX = window.SUPERX || {};
  const SX = window.SUPERX;

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

    init(options = {}) {
      if (this.initialized) {
        this.destroy();
      }

      this.mode = options.mode || "buttons";
      this.sensitivity = Number(options.sensitivity) || 1;

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

      return true;
    },

    bindButtons() {
      const bindings = [
        ["left", "steer", -1],
        ["right", "steer", 1],
        ["accelerator", "throttle", 1],
        ["brake", "brake", 1],
        ["handbrake", "handbrake", true]
      ];

      bindings.forEach(([elementName, inputName, value]) => {
        const element = this.elements[elementName];

        if (!element) return;

        const start = event => {
          event.preventDefault();

          if (element.setPointerCapture && event.pointerId !== undefined) {
            try {
              element.setPointerCapture(event.pointerId);
            } catch (error) {}
          }

          this.activeTouches.set(elementName, true);
          this.applyInput(inputName, value);
          element.classList.add("active");
        };

        const end = event => {
          if (event) event.preventDefault();

          this.activeTouches.delete(elementName);
          element.classList.remove("active");
          this.releaseInput(inputName, value);
        };

        element.addEventListener("pointerdown", start);
        element.addEventListener("pointerup", end);
        element.addEventListener("pointercancel", end);
        element.addEventListener("lostpointercapture", end);
        element.addEventListener("contextmenu", event => {
          event.preventDefault();
        });

        element._sxCleanup = () => {
          element.removeEventListener("pointerdown", start);
          element.removeEventListener("pointerup", end);
          element.removeEventListener("pointercancel", end);
          element.removeEventListener("lostpointercapture", end);
        };
      });

      const horn = this.elements.horn;

      if (horn) {
        const hornStart = event => {
          event.preventDefault();
          horn.classList.add("active");

          if (SX.audio && typeof SX.audio.horn === "function") {
            SX.audio.horn(true);
          }
        };

        const hornEnd = event => {
          if (event) event.preventDefault();

          horn.classList.remove("active");

          if (SX.audio && typeof SX.audio.horn === "function") {
            SX.audio.horn(false);
          }
        };

        horn.addEventListener("pointerdown", hornStart);
        horn.addEventListener("pointerup", hornEnd);
        horn.addEventListener("pointercancel", hornEnd);
        horn.addEventListener("lostpointercapture", hornEnd);

        horn._sxCleanup = () => {
          horn.removeEventListener("pointerdown", hornStart);
          horn.removeEventListener("pointerup", hornEnd);
          horn.removeEventListener("pointercancel", hornEnd);
          horn.removeEventListener("lostpointercapture", hornEnd);
        };
      }
    },

    applyInput(type, value) {
      if (!SX.physics) return;

      if (type === "handbrake") {
        SX.physics.setInput("handbrake", value);
      } else {
        SX.physics.setInput(type, value);
      }
    },

    releaseInput(type, value) {
      if (!SX.physics) return;

      if (type === "handbrake") {
        SX.physics.setInput("handbrake", false);
        return;
      }

      const remaining = this.getRemainingInput(type);

      if (remaining !== null) {
        SX.physics.setInput(type, remaining);
      } else {
        SX.physics.setInput(type, 0);
      }
    },

    getRemainingInput(type) {
      const leftActive = this.activeTouches.has("left");
      const rightActive = this.activeTouches.has("right");

      if (type === "steer") {
        if (leftActive) return -1;
        if (rightActive) return 1;
      }

      if (type === "throttle" &&
          this.activeTouches.has("accelerator")) {
        return 1;
      }

      if (type === "brake" &&
          this.activeTouches.has("brake")) {
        return 1;
      }

      return null;
    },

    bindKeyboard() {
      this.keyDownHandler = event => {
        const key = event.key.toLowerCase();

        if (
          ["arrowup", "arrowdown", "arrowleft", "arrowright", " "]
            .includes(key)
        ) {
          event.preventDefault();
        }

        this.keys[key] = true;
        this.updateKeyboardInput();
      };

      this.keyUpHandler = event => {
        const key = event.key.toLowerCase();

        this.keys[key] = false;
        this.updateKeyboardInput();
      };

      this.blurHandler = () => {
        this.keys = {};
        this.activeTouches.clear();

        if (SX.physics) {
          SX.physics.clearInput();
        }

        this.updateButtonStyles();
      };

      window.addEventListener("keydown", this.keyDownHandler);
      window.addEventListener("keyup", this.keyUpHandler);
      window.addEventListener("blur", this.blurHandler);
    },

    updateKeyboardInput() {
      if (!SX.physics) return;

      const forward =
        this.keys.arrowup || this.keys.w;

      const reverse =
        this.keys.arrowdown || this.keys.s;

      const left =
        this.keys.arrowleft || this.keys.a;

      const right =
        this.keys.arrowright || this.keys.d;

      SX.physics.setInput(
        "throttle",
        forward ? 1 : reverse ? -1 : 0
      );

      SX.physics.setInput(
        "steer",
        left ? -1 : right ? 1 : 0
      );

      SX.physics.setInput(
        "brake",
        this.keys[" "] ? 1 : 0
      );

      SX.physics.setInput(
        "handbrake",
        Boolean(this.keys.shift)
      );
    },

    updateButtonStyles() {
      Object.values(this.elements).forEach(element => {
        if (element) element.classList.remove("active");
      });
    },

    setSensitivity(value) {
      this.sensitivity = Math.max(
        0.3,
        Math.min(2.5, Number(value) || 1)
      );

      if (SX.physics) {
        SX.physics.setSensitivity(this.sensitivity);
      }
    },

    enableTilt() {
      if (!("DeviceOrientationEvent" in window)) {
        return false;
      }

      this.deviceOrientationHandler = event => {
        if (typeof event.gamma !== "number") return;

        this.tiltValue = Math.max(
          -1,
          Math.min(1, event.gamma / 30)
        );

        if (SX.physics && this.tiltEnabled) {
          SX.physics.setInput(
            "steer",
            this.tiltValue * this.sensitivity
          );
        }
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

      if (SX.physics) {
        SX.physics.setInput("steer", 0);
      }
    },

    destroy() {
      Object.values(this.elements).forEach(element => {
        if (element && element._sxCleanup) {
          element._sxCleanup();
          delete element._sxCleanup;
        }
      });

      if (this.keyDownHandler) {
        window.removeEventListener("keydown", this.keyDownHandler);
      }

      if (this.keyUpHandler) {
        window.removeEventListener("keyup", this.keyUpHandler);
      }

      if (this.blurHandler) {
        window.removeEventListener("blur", this.blurHandler);
      }

      this.disableTilt();
      this.keys = {};
      this.activeTouches.clear();
      this.elements = {};
      this.initialized = false;

      if (SX.physics) {
        SX.physics.clearInput();
      }
    }
  };

})();

/* =========================================================
   SUPERX LEGEND — FILE 17
   END
========================================================= */
