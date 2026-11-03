/* =========================================================
   SUPERX LEGEND
   FILE 153: js/garage-page-preview.js
   PURPOSE: Dynamic garage vehicle preview effects
   START
========================================================= */

(function (window, document) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const GaragePagePreview = {
    root: null,
    placeholder: null,
    initialized: false,

    init() {
      if (this.initialized) return true;

      this.root = document.getElementById("garagePage");

      if (!this.root) return false;

      this.placeholder = document.getElementById(
        "garageCarPlaceholder"
      );

      if (!this.placeholder) return false;

      this.injectStyles();
      this.bindEvents();

      const selector = SX.garagePageCarSelector;
      const car = selector?.getCurrentCar?.();

      if (car) this.update(car);

      this.initialized = true;
      return true;
    },

    bindEvents() {
      window.addEventListener(
        "sx:garage-preview-car-changed",
        event => {
          if (event.detail?.car) {
            this.update(event.detail.car);
          }
        }
      );

      window.addEventListener(
        "sx:garage-car-selected",
        event => {
          const car = event.detail?.car;

          if (car) this.update(car);
        }
      );
    },

    update(car) {
      if (!car || !this.placeholder) return;

      const color = this.safeColor(car.color);
      const accent = this.safeColor(car.accent || car.color);

      this.placeholder.style.setProperty(
        "--sx-preview-color",
        color
      );

      this.placeholder.style.setProperty(
        "--sx-preview-accent",
        accent
      );

      this.placeholder.classList.add(
        "sx-dynamic-car-preview"
      );

      const symbol = this.placeholder.querySelector(
        ".car-symbol"
      );

      const description = this.placeholder.querySelector("p");

      if (symbol) {
        symbol.textContent = "🏎️";
        symbol.style.color = color;
      }

      if (description) {
        description.textContent =
          String(car.name || "SUPERX VEHICLE") +
          " · " +
          String(car.class || car.category || "RACING");
      }

      this.placeholder.setAttribute(
        "aria-label",
        "Preview of " + String(car.name || "selected vehicle")
      );
    },

    safeColor(value) {
      const color = String(value || "#9b5cff");

      if (
        /^#[0-9a-fA-F]{3,8}$/.test(color) ||
        /^rgba?\([\d\s.,%]+\)$/.test(color)
      ) {
        return color;
      }

      return "#9b5cff";
    },

    injectStyles() {
      if (document.getElementById("sx-garage-preview-styles")) {
        return;
      }

      const style = document.createElement("style");

      style.id = "sx-garage-preview-styles";

      style.textContent = `
        #garageCarPlaceholder.sx-dynamic-car-preview {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          border-color: color-mix(
            in srgb,
            var(--sx-preview-color, #9b5cff) 45%,
            transparent
          );
          background:
            radial-gradient(
              ellipse at 50% 70%,
              color-mix(
                in srgb,
                var(--sx-preview-color, #9b5cff) 20%,
                transparent
              ),
              transparent 65%
            ),
            linear-gradient(
              145deg,
              rgba(25,19,38,.96),
              rgba(9,8,15,.98)
            );
          transition:
            background .25s ease,
            border-color .25s ease,
            box-shadow .25s ease;
        }

        #garageCarPlaceholder.sx-dynamic-car-preview
        .car-symbol {
          display: inline-block;
          filter: drop-shadow(
            0 0 16px
            var(--sx-preview-color, #9b5cff)
          );
          transition:
            color .25s ease,
            filter .25s ease,
            transform .25s ease;
        }

        #garageCarPlaceholder.sx-dynamic-car-preview
        p {
          color: var(--sx-preview-accent, #c19aff);
          transition: color .25s ease;
        }

        @media (prefers-reduced-motion: no-preference) {
          #garageCarPlaceholder.sx-dynamic-car-preview
          .car-symbol {
            animation: sxCarPreviewGlow 3s ease-in-out infinite;
          }

          @keyframes sxCarPreviewGlow {
            0%, 100% {
              transform: translateY(0);
            }

            50% {
              transform: translateY(-4px);
            }
          }
        }
      `;

      document.head.appendChild(style);
    }
  };

  SX.garagePagePreview = GaragePagePreview;

  function start() {
    GaragePagePreview.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      { once: true }
    );
  } else {
    start();
  }

})(window, document);

/* =========================================================
   FILE 153: js/garage-page-preview.js
   END
========================================================= */
