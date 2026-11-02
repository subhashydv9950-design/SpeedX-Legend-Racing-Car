
/* =========================================================
   SUPERX LEGEND — FILE 60
   FILE: js/garage-preview.js
   PURPOSE: Garage vehicle preview and customization display
   START
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const GaragePreview = {
    container: null,
    vehicleElement: null,
    currentCar: null,
    currentColor: "#8b5cf6",
    currentCamera: "front",
    currentParts: {},
    initialized: false,

    defaultParts: {
      spoiler: false,
      frontBumper: false,
      rearBumper: false,
      bonnet: false,
      bodyKit: false,
      rims: false,
      headlights: false
    },

    init(options = {}) {
      this.container = typeof options.container === "string"
        ? document.querySelector(options.container)
        : options.container || document.querySelector(
            "#garagePreview"
          );

      if (!this.container) {
        return {
          success: false,
          message: "Garage preview container not found."
        };
      }

      this.vehicleElement = this.container.querySelector(
        ".garage-preview-vehicle"
      );

      if (!this.vehicleElement) {
        this.vehicleElement = document.createElement("div");
        this.vehicleElement.className =
          "garage-preview-vehicle";

        this.container.appendChild(this.vehicleElement);
      }

      this.injectStyles();
      this.bindEvents();
      this.initialized = true;

      if (options.car) {
        this.setCar(options.car);
      }

      return {
        success: true,
        container: this.container
      };
    },

    setCar(car) {
      if (!car) return false;

      this.currentCar = car;
      this.currentColor = car.color ||
        this.currentColor;

      this.render();

      return true;
    },

    setColor(color) {
      if (
        typeof color !== "string" ||
        !/^#[0-9a-f]{3,8}$/i.test(color)
      ) {
        return false;
      }

      this.currentColor = color;
      this.render();

      this.emit("sx:garage-preview-color", {
        color
      });

      return true;
    },

    setCamera(mode) {
      const allowed = [
        "front",
        "rear",
        "side",
        "top"
      ];

      if (!allowed.includes(mode)) return false;

      this.currentCamera = mode;

      if (this.vehicleElement) {
        this.vehicleElement.dataset.camera = mode;
      }

      this.emit("sx:garage-preview-camera", {
        camera: mode
      });

      return true;
    },

    setPart(part, enabled) {
      if (!Object.prototype.hasOwnProperty.call(
        this.defaultParts,
        part
      )) {
        return false;
      }

      this.currentParts[part] = Boolean(enabled);

      if (this.vehicleElement) {
        this.vehicleElement.dataset[part] =
          String(Boolean(enabled));
      }

      this.render();

      this.emit("sx:garage-preview-part", {
        part,
        enabled: Boolean(enabled)
      });

      return true;
    },

    render() {
      if (!this.vehicleElement) return;

      const car = this.currentCar || {};

      const name = this.escapeHTML(
        car.name || car.title || "SUPERX CAR"
      );

      const model = car.model || car.modelUrl || "";

      this.vehicleElement.innerHTML = `
        <div class="garage-preview-stage">
          ${
            model
              ? `<div class="garage-preview-model"
                   data-model="${this.escapeHTML(model)}"></div>`
              : ""
          }

          <div class="garage-preview-placeholder"
               style="--car-color:${this.currentColor}">
            <div class="garage-preview-glow"></div>

            <div class="garage-preview-car">
              <div class="garage-preview-spoiler"></div>
              <div class="garage-preview-roof"></div>
              <div class="garage-preview-window"></div>
              <div class="garage-preview-body"></div>
              <div class="garage-preview-front"></div>
              <div class="garage-preview-wheel wheel-left"></div>
              <div class="garage-preview-wheel wheel-right"></div>
              <div class="garage-preview-light"></div>
            </div>

            <div class="garage-preview-shadow"></div>
          </div>

          <div class="garage-preview-label">
            <strong>${name}</strong>
            <span>${this.escapeHTML(
              car.class || car.category || "SPORTS CAR"
            )}</span>
          </div>
        </div>
      `;

      this.vehicleElement.dataset.camera =
        this.currentCamera;

      Object.keys(this.defaultParts).forEach(part => {
        this.vehicleElement.dataset[part] =
          String(Boolean(this.currentParts[part]));
      });

      this.emit("sx:garage-preview-rendered", {
        car,
        color: this.currentColor,
        camera: this.currentCamera
      });
    },

    bindEvents() {
      if (!this.container || this.container.dataset.previewBound) {
        return;
      }

      this.container.dataset.previewBound = "true";

      this.container.addEventListener(
        "click",
        event => {
          const cameraButton = event.target.closest(
            "[data-preview-camera]"
          );

          if (!cameraButton) return;

          this.setCamera(
            cameraButton.dataset.previewCamera
          );
        }
      );
    },

    escapeHTML(value) {
      return String(value).replace(
        /[&<>"']/g,
        character => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        })[character]
      );
    },

    injectStyles() {
      if (document.getElementById(
        "superx-garage-preview-styles"
      )) {
        return;
      }

      const style = document.createElement("style");
      style.id = "superx-garage-preview-styles";

      style.textContent = `
        .garage-preview-vehicle {
          width: 100%;
          min-height: 280px;
          position: relative;
          overflow: hidden;
          border-radius: 22px;
          background:
            radial-gradient(
              ellipse at 50% 70%,
              rgba(139,92,246,.20),
              transparent 65%
            ),
            linear-gradient(145deg,#171321,#09090f);
        }

        .garage-preview-stage {
          min-height: 280px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          position: relative;
          padding: 24px 12px;
        }

        .garage-preview-placeholder {
          width: min(90%,420px);
          height: 180px;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          perspective: 700px;
        }

        .garage-preview-glow {
          position: absolute;
          width: 75%;
          height: 75%;
          border-radius: 50%;
          background: var(--car-color);
          opacity: .15;
          filter: blur(45px);
        }

        .garage-preview-car {
          position: relative;
          width: 78%;
          height: 100px;
          transform: rotateX(5deg);
          transition: transform .35s ease;
        }

        .garage-preview-body {
          position: absolute;
          left: 8%;
          right: 8%;
          bottom: 25px;
          height: 48px;
          border-radius: 45% 35% 20% 20%;
          background: linear-gradient(
            160deg,
            #ffffff,
            var(--car-color) 30%,
            #292333 100%
          );
          box-shadow: inset 0 -8px 12px #0008;
          clip-path: polygon(
            0 45%,12% 25%,28% 15%,42% 0,
            70% 8%,88% 28%,100% 55%,
            96% 100%,4% 100%
          );
        }

        .garage-preview-roof {
          position: absolute;
          width: 43%;
          height: 42px;
          left: 29%;
          bottom: 60px;
          background: linear-gradient(
            145deg,#b7c6d8,#252c3c 65%
          );
          clip-path: polygon(
            20% 100%,36% 0,75% 0,100% 100%
          );
        }

        .garage-preview-window {
          position: absolute;
          width: 32%;
          height: 29px;
          left: 34%;
          bottom: 63px;
          background: linear-gradient(
            145deg,#b7d4e8,#111827 70%
          );
          clip-path: polygon(
            18% 100%,35% 0,78% 0,100% 100%
          );
        }

        .garage-preview-front {
          position: absolute;
          right: 5%;
          bottom: 30px;
          width: 20%;
          height: 25px;
          border-radius: 10px 30px 8px 5px;
          background: var(--car-color);
        }

        .garage-preview-wheel {
          position: absolute;
          bottom: 5px;
          width: 34px;
          height: 34px;
          border: 7px solid #171717;
          border-radius: 50%;
          background: #9ca3af;
          box-shadow: inset 0 0 0 4px #343434;
        }

        .wheel-left { left: 20%; }
        .wheel-right { right: 20%; }

        .garage-preview-light {
          position: absolute;
          right: 7%;
          bottom: 48px;
          width: 17px;
          height: 7px;
          border-radius: 5px;
          background: #dff7ff;
          box-shadow: 0 0 12px #8eeaff;
        }

        .garage-preview-shadow {
          position: absolute;
          width: 75%;
          height: 15px;
          bottom: 14px;
          border-radius: 50%;
          background: #0009;
          filter: blur(9px);
        }

        .garage-preview-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          margin-top: 5px;
          color: #fff;
        }

        .garage-preview-label span {
          color: #a78bfa;
          font-size: 11px;
          letter-spacing: 2px;
        }

        .garage-preview-vehicle[data-camera="rear"]
        .garage-preview-car {
          transform: rotateY(180deg);
        }

        .garage-preview-vehicle[data-camera="side"]
        .garage-preview-car {
          transform: rotateY(90deg);
        }

        .garage-preview-vehicle[data-camera="top"]
        .garage-preview-car {
          transform: rotateX(65deg);
        }

        .garage-preview-vehicle[data-spoiler="true"]
        .garage-preview-spoiler {
          position: absolute;
          z-index: 3;
          left: 25%;
          bottom: 77px;
          width: 48%;
          height: 6px;
          border-radius: 5px;
          background: #d1d5db;
          box-shadow: 0 5px 0 #27212f;
        }

        .garage-preview-vehicle[data-body-kit="true"]
        .garage-preview-body {
          filter: drop-shadow(0 5px 3px #a78bfa);
        }

        .garage-preview-vehicle[data-headlights="true"]
        .garage-preview-light {
          box-shadow: 0 0 20px 7px #8eeaff;
        }

        @media(max-width:600px) {
          .garage-preview-vehicle,
          .garage-preview-stage {
            min-height: 240px;
          }

          .garage-preview-placeholder {
            height: 150px;
          }
        }
      `;

      document.head.appendChild(style);
    },

    destroy() {
      if (this.container) {
        delete this.container.dataset.previewBound;
      }

      this.container = null;
      this.vehicleElement = null;
      this.initialized = false;
    },

    emit(name, detail) {
      window.dispatchEvent(
        new CustomEvent(name, { detail })
      );
    }
  };

  SX.garagePreview = GaragePreview;

  window.dispatchEvent(
    new CustomEvent("sx:garage-preview-ready")
  );

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 60
   FILE: js/garage-preview.js
   END
========================================================= */
