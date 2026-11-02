
/* =========================================================
   SUPERX LEGEND — FILE 68
   FILE: js/garage-effects.js
   PURPOSE: Garage visual effects and interaction feedback
   START
========================================================= */

(function (window, document) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const GarageEffects = {
    initialized: false,
    styleId: "sx-garage-effects-style",

    init() {
      if (this.initialized) return true;

      this.injectStyles();
      this.bindEvents();

      this.initialized = true;
      return true;
    },

    injectStyles() {
      if (document.getElementById(this.styleId)) return;

      const style = document.createElement("style");
      style.id = this.styleId;

      style.textContent = `
        .sx-garage-flash {
          animation: sxGarageFlash .45s ease;
        }

        .sx-garage-selected {
          animation: sxGarageSelected .35s ease;
        }

        .sx-garage-pulse {
          animation: sxGaragePulse .65s ease;
        }

        .sx-garage-shake {
          animation: sxGarageShake .3s ease;
        }

        .sx-garage-effect-toast {
          position: fixed;
          left: 50%;
          bottom: 28px;
          z-index: 99999;
          transform: translate(-50%, 20px);
          padding: 12px 20px;
          border: 1px solid rgba(170, 120, 255, .55);
          border-radius: 14px;
          background: rgba(17, 12, 29, .96);
          color: #fff;
          font: 600 13px system-ui, sans-serif;
          box-shadow: 0 8px 30px rgba(0, 0, 0, .4);
          opacity: 0;
          pointer-events: none;
          transition: opacity .25s ease,
                      transform .25s ease;
        }

        .sx-garage-effect-toast.show {
          opacity: 1;
          transform: translate(-50%, 0);
        }

        @keyframes sxGarageFlash {
          0% { filter: brightness(1); }
          45% { filter: brightness(1.5); }
          100% { filter: brightness(1); }
        }

        @keyframes sxGarageSelected {
          0% { transform: scale(.97); }
          70% { transform: scale(1.015); }
          100% { transform: scale(1); }
        }

        @keyframes sxGaragePulse {
          0% { box-shadow: 0 0 0 0 rgba(160, 90, 255, .6); }
          100% { box-shadow: 0 0 0 16px rgba(160, 90, 255, 0); }
        }

        @keyframes sxGarageShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        @media (prefers-reduced-motion: reduce) {
          .sx-garage-flash,
          .sx-garage-selected,
          .sx-garage-pulse,
          .sx-garage-shake {
            animation: none !important;
          }

          .sx-garage-effect-toast {
            transition: none;
          }
        }
      `;

      document.head.appendChild(style);
    },

    bindEvents() {
      window.addEventListener(
        "sx:garage-car-selected",
        event => {
          this.animateShowroom();
          this.showToast(
            event.detail?.carName || "Vehicle selected"
          );
        }
      );

      window.addEventListener(
        "sx:car-purchased",
        () => {
          this.animateElement(
            this.getGarageRoot(),
            "sx-garage-pulse"
          );

          this.showToast("Vehicle added to garage");
        }
      );

      window.addEventListener(
        "sx:car-upgraded",
        event => {
          this.animateShowroom();
          this.showToast(
            event.detail?.message || "Upgrade applied"
          );
        }
      );

      window.addEventListener(
        "sx:vehicle-damage-updated",
        () => {
          this.animateElement(
            this.getGarageRoot(),
            "sx-garage-flash"
          );
        }
      );
    },

    getGarageRoot() {
      return document.querySelector(
        "#garagePage, #garageInspection"
      );
    },

    animateShowroom() {
      const element = document.querySelector(
        "#showroomCar, .garage-car-preview, #garagePreview"
      );

      this.animateElement(
        element,
        "sx-garage-selected"
      );
    },

    animateElement(element, className) {
      if (!element) return;

      element.classList.remove(className);

      // Restart the CSS animation.
      void element.offsetWidth;

      element.classList.add(className);

      element.addEventListener(
        "animationend",
        () => element.classList.remove(className),
        { once: true }
      );
    },

    showToast(message) {
      let toast = document.querySelector(
        ".sx-garage-effect-toast"
      );

      if (!toast) {
        toast = document.createElement("div");
        toast.className = "sx-garage-effect-toast";
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");
        document.body.appendChild(toast);
      }

      toast.textContent = String(message);

      toast.classList.remove("show");
      void toast.offsetWidth;
      toast.classList.add("show");

      clearTimeout(this.toastTimer);

      this.toastTimer = setTimeout(() => {
        toast.classList.remove("show");
      }, 1800);
    },

    success(element) {
      this.animateElement(
        element || this.getGarageRoot(),
        "sx-garage-pulse"
      );

      this.showToast("Success");
    },

    error(element, message = "Action could not be completed") {
      this.animateElement(
        element || this.getGarageRoot(),
        "sx-garage-shake"
      );

      this.showToast(message);
    },

    destroy() {
      clearTimeout(this.toastTimer);

      document.getElementById(this.styleId)?.remove();

      document.querySelector(
        ".sx-garage-effect-toast"
      )?.remove();

      this.initialized = false;
    }
  };

  SX.garageEffects = GarageEffects;

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => GarageEffects.init(),
      { once: true }
    );
  } else {
    GarageEffects.init();
  }

})(window, document);

/* =========================================================
   SUPERX LEGEND — FILE 68
   FILE: js/garage-effects.js
   END
========================================================= */
