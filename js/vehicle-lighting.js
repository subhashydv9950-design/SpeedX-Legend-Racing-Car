
/* =========================================================
   SUPERX LEGEND — FILE 69
   FILE: js/vehicle-lighting.js
   PURPOSE: Vehicle headlights, indicators and brake lights
   START
========================================================= */

(function (window, document) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const VehicleLighting = {
    enabled: true,
    headlights: false,
    highBeam: false,
    leftIndicator: false,
    rightIndicator: false,
    hazardLights: false,
    brakeLights: false,
    reverseLights: false,

    scene: null,
    vehicle: null,
    lights: [],
    indicatorTimer: null,
    indicatorState: false,
    lastIndicatorUpdate: 0,

    init(options = {}) {
      this.scene = options.scene || null;
      this.vehicle = options.vehicle || null;

      this.clearLights();

      if (this.scene && window.THREE) {
        this.createLights();
      }

      this.bindControls();

      return true;
    },

    createLights() {
      const THREE = window.THREE;

      const definitions = [
        {
          id: "leftHeadlight",
          color: 0xffffff,
          intensity: 0,
          position: [-0.65, 0.5, -2]
        },
        {
          id: "rightHeadlight",
          color: 0xffffff,
          intensity: 0,
          position: [0.65, 0.5, -2]
        },
        {
          id: "leftBrake",
          color: 0xff1717,
          intensity: 0,
          position: [-0.65, 0.5, 2]
        },
        {
          id: "rightBrake",
          color: 0xff1717,
          intensity: 0,
          position: [0.65, 0.5, 2]
        },
        {
          id: "leftIndicator",
          color: 0xffa500,
          intensity: 0,
          position: [-0.8, 0.45, 2]
        },
        {
          id: "rightIndicator",
          color: 0xffa500,
          intensity: 0,
          position: [0.8, 0.45, 2]
        },
        {
          id: "leftReverse",
          color: 0xffffff,
          intensity: 0,
          position: [-0.45, 0.45, 2]
        },
        {
          id: "rightReverse",
          color: 0xffffff,
          intensity: 0,
          position: [0.45, 0.45, 2]
        }
      ];

      definitions.forEach(definition => {
        const light = new THREE.PointLight(
          definition.color,
          definition.intensity,
          5
        );

        light.position.set(
          definition.position[0],
          definition.position[1],
          definition.position[2]
        );

        light.userData.lightingId = definition.id;

        this.scene.add(light);
        this.lights.push(light);
      });
    },

    clearLights() {
      this.lights.forEach(light => {
        light.parent?.remove(light);
        light.dispose?.();
      });

      this.lights = [];
    },

    getLight(id) {
      return this.lights.find(
        light => light.userData.lightingId === id
      ) || null;
    },

    setIntensity(id, intensity) {
      const light = this.getLight(id);

      if (light) {
        light.intensity = Math.max(0, intensity);
      }
    },

    setHeadlights(enabled) {
      this.headlights = Boolean(enabled);

      const intensity = this.headlights ? 2.5 : 0;

      this.setIntensity("leftHeadlight", intensity);
      this.setIntensity("rightHeadlight", intensity);

      this.dispatch("headlights", this.headlights);
      return this.headlights;
    },

    toggleHeadlights() {
      return this.setHeadlights(!this.headlights);
    },

    setHighBeam(enabled) {
      this.highBeam = Boolean(enabled);

      if (this.highBeam) {
        this.setHeadlights(true);
      }

      const intensity = this.highBeam ? 5 : 2.5;

      this.setIntensity(
        "leftHeadlight",
        this.headlights ? intensity : 0
      );

      this.setIntensity(
        "rightHeadlight",
        this.headlights ? intensity : 0
      );

      this.dispatch("high-beam", this.highBeam);
      return this.highBeam;
    },

    setIndicator(side, enabled) {
      if (side !== "left" && side !== "right") {
        return false;
      }

      const value = Boolean(enabled);

      if (side === "left") {
        this.leftIndicator = value;

        if (value) {
          this.rightIndicator = false;
        }
      } else {
        this.rightIndicator = value;

        if (value) {
          this.leftIndicator = false;
        }
      }

      if (this.leftIndicator || this.rightIndicator) {
        this.startIndicatorBlink();
      } else if (!this.hazardLights) {
        this.stopIndicatorBlink();
      }

      this.dispatch("indicator", {
        side,
        enabled: value
      });

      return value;
    },

    toggleIndicator(side) {
      if (side === "left") {
        return this.setIndicator(
          "left",
          !this.leftIndicator
        );
      }

      if (side === "right") {
        return this.setIndicator(
          "right",
          !this.rightIndicator
        );
      }

      return false;
    },

    setHazardLights(enabled) {
      this.hazardLights = Boolean(enabled);

      if (this.hazardLights) {
        this.leftIndicator = false;
        this.rightIndicator = false;
        this.startIndicatorBlink();
      } else {
        this.stopIndicatorBlink();
      }

      this.dispatch("hazard", this.hazardLights);
      return this.hazardLights;
    },

    startIndicatorBlink() {
      if (this.indicatorTimer) return;

      this.indicatorState = true;

      this.indicatorTimer = window.setInterval(() => {
        this.indicatorState = !this.indicatorState;
        this.updateIndicatorLights();
      }, 450);

      this.updateIndicatorLights();
    },

    stopIndicatorBlink() {
      if (this.indicatorTimer) {
        window.clearInterval(this.indicatorTimer);
      }

      this.indicatorTimer = null;
      this.indicatorState = false;
      this.updateIndicatorLights();
    },

    updateIndicatorLights() {
      const leftOn = this.indicatorState &&
        (this.leftIndicator || this.hazardLights);

      const rightOn = this.indicatorState &&
        (this.rightIndicator || this.hazardLights);

      this.setIntensity(
        "leftIndicator",
        leftOn ? 2 : 0
      );

      this.setIntensity(
        "rightIndicator",
        rightOn ? 2 : 0
      );
    },

    setBrakeLights(enabled) {
      this.brakeLights = Boolean(enabled);

      const intensity = this.brakeLights ? 2.5 : 0;

      this.setIntensity("leftBrake", intensity);
      this.setIntensity("rightBrake", intensity);

      this.dispatch("brake-lights", this.brakeLights);
      return this.brakeLights;
    },

    setReverseLights(enabled) {
      this.reverseLights = Boolean(enabled);

      const intensity = this.reverseLights ? 1.8 : 0;

      this.setIntensity("leftReverse", intensity);
      this.setIntensity("rightReverse", intensity);

      this.dispatch("reverse-lights", this.reverseLights);
      return this.reverseLights;
    },

    update(data = {}) {
      if (typeof data.brake === "boolean") {
        this.setBrakeLights(data.brake);
      }

      if (typeof data.reverse === "boolean") {
        this.setReverseLights(data.reverse);
      }

      if (Number.isFinite(data.steering)) {
        if (data.steering < -0.35) {
          if (!this.leftIndicator && !this.hazardLights) {
            // Steering does not automatically activate indicators.
          }
        }
      }
    },

    bindControls() {
      const bindings = [
        ["#headlightsButton", () => this.toggleHeadlights()],
        ["#highBeamButton", () => this.setHighBeam(!this.highBeam)],
        ["#leftIndicatorButton", () => this.toggleIndicator("left")],
        ["#rightIndicatorButton", () => this.toggleIndicator("right")],
        ["#hazardButton", () => this.setHazardLights(!this.hazardLights)]
      ];

      bindings.forEach(([selector, callback]) => {
        document.querySelectorAll(selector).forEach(button => {
          if (button.dataset.sxLightingBound) return;

          button.dataset.sxLightingBound = "true";

          button.addEventListener("click", callback);
        });
      });
    },

    dispatch(name, detail) {
      window.dispatchEvent(
        new CustomEvent(`sx:lighting-${name}`, {
          detail
        })
      );
    },

    getState() {
      return {
        headlights: this.headlights,
        highBeam: this.highBeam,
        leftIndicator: this.leftIndicator,
        rightIndicator: this.rightIndicator,
        hazardLights: this.hazardLights,
        brakeLights: this.brakeLights,
        reverseLights: this.reverseLights
      };
    },

    destroy() {
      this.stopIndicatorBlink();
      this.clearLights();

      this.scene = null;
      this.vehicle = null;
    }
  };

  SX.vehicleLighting = VehicleLighting;

})(window, document);

/* =========================================================
   SUPERX LEGEND — FILE 69
   FILE: js/vehicle-lighting.js
   END
========================================================= */
          
