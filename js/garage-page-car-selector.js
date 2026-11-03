/* =========================================================
   SUPERX LEGEND
   FILE 152: js/garage-page-car-selector.js
   PURPOSE: Garage car browsing, selection and purchase
   START
========================================================= */

(function (window, document) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const GaragePageCarSelector = {
    root: null,
    cars: [],
    currentIndex: 0,
    initialized: false,

    elements: {},

    init() {
      if (this.initialized) return true;

      this.root = document.getElementById("garagePage");
      if (!this.root || !SX.garageManager) return false;

      this.cacheElements();

      this.cars = SX.garageManager.getCars();

      if (!this.cars.length) return false;

      const selectedId = SX.garageManager.selectedCarId;

      const selectedIndex = this.cars.findIndex(
        car => String(car.id) === String(selectedId)
      );

      this.currentIndex = selectedIndex >= 0
        ? selectedIndex
        : 0;

      this.bindEvents();
      this.render();

      this.initialized = true;
      return true;
    },

    cacheElements() {
      const ids = [
        "garagePreviousCar",
        "garageNextCar",
        "garageSelectCar",
        "garageBuyCar",
        "garageCarName",
        "garageCarClass",
        "garageCarPrice",
        "garageTopSpeed",
        "garagePower",
        "garageHandling",
        "garageCarPosition",
        "garageVehicleStatus",
        "garageCarPlaceholder"
      ];

      ids.forEach(id => {
        this.elements[id] = document.getElementById(id);
      });
    },

    getCurrentCar() {
      return this.cars[this.currentIndex] || null;
    },

    isOwned(car) {
      return Boolean(
        car && SX.garageManager.isOwned(car.id)
      );
    },

    bindEvents() {
      this.elements.garagePreviousCar?.addEventListener(
        "click",
        () => this.move(-1)
      );

      this.elements.garageNextCar?.addEventListener(
        "click",
        () => this.move(1)
      );

      this.elements.garageSelectCar?.addEventListener(
        "click",
        () => this.selectCurrent()
      );

      this.elements.garageBuyCar?.addEventListener(
        "click",
        () => this.buyCurrent()
      );

      window.addEventListener(
        "sx:garage-car-selected",
        event => {
          const id = event.detail?.carId;

          const index = this.cars.findIndex(
            car => String(car.id) === String(id)
          );

          if (index >= 0) {
            this.currentIndex = index;
            this.render();
          }
        }
      );

      window.addEventListener(
        "sx:garage-car-purchased",
        () => this.render()
      );
    },

    move(direction) {
      if (!this.cars.length) return;

      this.currentIndex =
        (this.currentIndex + direction + this.cars.length) %
        this.cars.length;

      this.render();
    },

    render() {
      const car = this.getCurrentCar();

      if (!car) return;

      const owned = this.isOwned(car);
      const selectedId = SX.garageManager.selectedCarId;

      const selected =
        String(selectedId) === String(car.id);

      this.setText("garageCarName", car.name);
      this.setText("garageCarClass", car.class || car.category || "RACING");

      this.setText(
        "garageCarPrice",
        owned
          ? "UNLOCKED"
          : "◆ " + Number(car.price || 0).toLocaleString("en-IN") + " COINS"
      );

      this.setText(
        "garageTopSpeed",
        Number(car.topSpeed || 0) + " km/h"
      );

      this.setText(
        "garagePower",
        Number(car.power || 0) + " HP"
      );

      this.setText(
        "garageHandling",
        Number(car.handling || 0) + " / 100"
      );

      this.setText(
        "garageCarPosition",
        "CAR " +
        String(this.currentIndex + 1).padStart(2, "0") +
        " / " +
        String(this.cars.length).padStart(2, "0")
      );

      this.setText(
        "garageVehicleStatus",
        selected ? "SELECTED" : owned ? "UNLOCKED" : "LOCKED"
      );

      const selectButton = this.elements.garageSelectCar;
      const buyButton = this.elements.garageBuyCar;

      if (selectButton) {
        selectButton.disabled = !owned || selected;
        selectButton.textContent = selected
          ? "CURRENT VEHICLE"
          : owned
            ? "SELECT VEHICLE"
            : "LOCKED VEHICLE";
      }

      if (buyButton) {
        buyButton.hidden = owned;
        buyButton.disabled = owned;
        buyButton.textContent =
          "UNLOCK · " +
          Number(car.price || 0).toLocaleString("en-IN") +
          " COINS";
      }

      this.updatePreview(car);
      this.refreshWallet();
    },

    updatePreview(car) {
      window.dispatchEvent(
        new CustomEvent("sx:garage-preview-car-changed", {
          detail: {
            car,
            index: this.currentIndex,
            owned: this.isOwned(car)
          }
        })
      );

      const placeholder = document.getElementById(
        "garageCarPlaceholder"
      );

      if (placeholder) {
        const symbol = placeholder.querySelector(".car-symbol");
        const description = placeholder.querySelector("p");

        if (symbol) {
          symbol.textContent = "🏎️";
          symbol.style.color = car.color || "#ffffff";
        }

        if (description) {
          description.textContent =
            car.name + " · " + (car.class || "RACING");
        }
      }
    },

    selectCurrent() {
      const car = this.getCurrentCar();

      if (!car) return;

      if (!this.isOwned(car)) {
        this.notify("यह कार अभी लॉक है। पहले इसे अनलॉक करें।");
        return;
      }

      const result = SX.garageManager.selectCar(car.id);

      if (!result.success) {
        this.notify(result.message || "Car selection failed.");
        return;
      }

      this.render();
      this.notify(car.name + " selected successfully.");
    },

    buyCurrent() {
      const car = this.getCurrentCar();

      if (!car) return;

      if (this.isOwned(car)) {
        this.notify("यह कार पहले से अनलॉक है।");
        return;
      }

      const result = SX.garageManager.buyCar(car.id);

      if (!result.success) {
        this.notify(result.message || "Car purchase failed.");
        return;
      }

      this.render();
      this.notify(car.name + " unlocked successfully.");

      window.dispatchEvent(
        new CustomEvent("sx:garage-wallet-refresh")
      );
    },

    setText(id, value) {
      const element = this.elements[id];

      if (element) {
        element.textContent = String(value ?? "");
      }
    },

    refreshWallet() {
      SX.garagePageWallet?.refresh?.();
    },

    notify(message) {
      if (
        SX.notifications &&
        typeof SX.notifications.show === "function"
      ) {
        SX.notifications.show(message);
        return;
      }

      let notice = document.getElementById(
        "sxGarageSelectorNotice"
      );

      if (!notice) {
        notice = document.createElement("div");
        notice.id = "sxGarageSelectorNotice";
        notice.setAttribute("role", "status");

        Object.assign(notice.style, {
          position: "fixed",
          left: "50%",
          bottom: "22px",
          transform: "translateX(-50%)",
          zIndex: "9999",
          maxWidth: "90%",
          padding: "12px 18px",
          borderRadius: "12px",
          background: "#241638",
          color: "#ffffff",
          border: "1px solid #9b5cff",
          fontSize: "13px",
          textAlign: "center"
        });

        document.body.appendChild(notice);
      }

      notice.textContent = String(message);
      notice.hidden = false;

      window.clearTimeout(this.noticeTimer);

      this.noticeTimer = window.setTimeout(() => {
        notice.hidden = true;
      }, 2500);
    }
  };

  SX.garagePageCarSelector = GaragePageCarSelector;

  function start() {
    GaragePageCarSelector.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, {
      once: true
    });
  } else {
    start();
  }

})(window, document);

/* =========================================================
   FILE 152: js/garage-page-car-selector.js
   END
========================================================= */
