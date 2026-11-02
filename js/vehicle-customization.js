
/* =========================================================
   SUPERX LEGEND — FILE 63
   FILE: js/vehicle-customization.js
   PURPOSE: Vehicle paint, rims, body parts and styling
   START
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const Customization = {
    storageKey: "superx_vehicle_customization_v1",
    data: {},
    activeCarId: "default",

    paintColors: [
      { id: "purple", name: "Royal Purple", color: "#8b5cf6", price: 0 },
      { id: "red", name: "Racing Red", color: "#ef3038", price: 250 },
      { id: "blue", name: "Electric Blue", color: "#168bff", price: 300 },
      { id: "black", name: "Midnight Black", color: "#171717", price: 350 },
      { id: "white", name: "Pearl White", color: "#eeeeee", price: 350 },
      { id: "silver", name: "Chrome Silver", color: "#aeb8c5", price: 400 },
      { id: "gold", name: "Luxury Gold", color: "#d6a83c", price: 500 },
      { id: "green", name: "Neon Green", color: "#45e66b", price: 450 },
      { id: "orange", name: "Sunset Orange", color: "#ff781f", price: 400 },
      { id: "cyan", name: "Ice Cyan", color: "#37d9e8", price: 450 }
    ],

    rims: [
      { id: "sport", name: "Sport Rims", price: 0 },
      { id: "racing", name: "Racing Rims", price: 500 },
      { id: "luxury", name: "Luxury Rims", price: 750 },
      { id: "carbon", name: "Carbon Rims", price: 1000 },
      { id: "neon", name: "Neon Rims", price: 1250 }
    ],

    parts: [
      { id: "spoiler", name: "Rear Spoiler", price: 600 },
      { id: "bonnet", name: "Custom Bonnet", price: 450 },
      { id: "frontBumper", name: "Front Bumper", price: 550 },
      { id: "rearBumper", name: "Rear Bumper", price: 550 },
      { id: "bodyKit", name: "Wide Body Kit", price: 1200 },
      { id: "headlights", name: "LED Headlights", price: 700 }
    ],

    init() {
      this.load();
      return this.getCurrent();
    },

    setActiveCar(carId) {
      this.activeCarId = String(
        carId || "default"
      );

      this.ensureCar(this.activeCarId);

      return this.getCurrent();
    },

    ensureCar(carId = this.activeCarId) {
      const id = String(carId);

      if (!this.data[id]) {
        this.data[id] = {
          color: "purple",
          rim: "sport",
          parts: {},
          purchasedColors: ["purple"],
          purchasedRims: ["sport"],
          purchasedParts: []
        };
      }

      return this.data[id];
    },

    getColor(colorId) {
      return this.paintColors.find(
        item => item.id === colorId
      ) || null;
    },

    buyColor(colorId) {
      const color = this.getColor(colorId);

      if (!color) {
        return {
          success: false,
          message: "Color not found."
        };
      }

      const car = this.ensureCar();

      if (car.purchasedColors.includes(colorId)) {
        return {
          success: true,
          alreadyOwned: true
        };
      }

      if (
        color.price > 0 &&
        (
          typeof SX.spendCoins !== "function" ||
          !SX.spendCoins(color.price)
        )
      ) {
        return {
          success: false,
          message: "Not enough coins.",
          cost: color.price
        };
      }

      car.purchasedColors.push(colorId);
      car.color = colorId;

      this.save();
      this.emitChange("color", colorId);

      return {
        success: true,
        color
      };
    },

    selectColor(colorId) {
      const color = this.getColor(colorId);

      if (!color) return false;

      const car = this.ensureCar();

      if (!car.purchasedColors.includes(colorId)) {
        return {
          success: false,
          message: "Color is not unlocked."
        };
      }

      car.color = colorId;

      this.save();
      this.emitChange("color", colorId);

      return true;
    },

    buyRim(rimId) {
      const rim = this.rims.find(
        item => item.id === rimId
      );

      if (!rim) {
        return {
          success: false,
          message: "Rim not found."
        };
      }

      const car = this.ensureCar();

      if (car.purchasedRims.includes(rimId)) {
        return {
          success: true,
          alreadyOwned: true
        };
      }

      if (
        rim.price > 0 &&
        (
          typeof SX.spendCoins !== "function" ||
          !SX.spendCoins(rim.price)
        )
      ) {
        return {
          success: false,
          message: "Not enough coins.",
          cost: rim.price
        };
      }

      car.purchasedRims.push(rimId);
      car.rim = rimId;

      this.save();
      this.emitChange("rim", rimId);

      return {
        success: true,
        rim
      };
    },

    selectRim(rimId) {
      const rim = this.rims.find(
        item => item.id === rimId
      );

      if (!rim) return false;

      const car = this.ensureCar();

      if (!car.purchasedRims.includes(rimId)) {
        return {
          success: false,
          message: "Rim is not unlocked."
        };
      }

      car.rim = rimId;

      this.save();
      this.emitChange("rim", rimId);

      return true;
    },

    buyPart(partId) {
      const part = this.parts.find(
        item => item.id === partId
      );

      if (!part) {
        return {
          success: false,
          message: "Part not found."
        };
      }

      const car = this.ensureCar();

      if (car.purchasedParts.includes(partId)) {
        return {
          success: true,
          alreadyOwned: true
        };
      }

      if (
        typeof SX.spendCoins !== "function" ||
        !SX.spendCoins(part.price)
      ) {
        return {
          success: false,
          message: "Not enough coins.",
          cost: part.price
        };
      }

      car.purchasedParts.push(partId);
      car.parts[partId] = true;

      this.save();
      this.emitChange("part", partId);

      return {
        success: true,
        part
      };
    },

    togglePart(partId, enabled) {
      const part = this.parts.find(
        item => item.id === partId
      );

      if (!part) return false;

      const car = this.ensureCar();

      if (!car.purchasedParts.includes(partId)) {
        return {
          success: false,
          message: "Part is not unlocked."
        };
      }

      car.parts[partId] = Boolean(enabled);

      this.save();
      this.emitChange("part", {
        id: partId,
        enabled: Boolean(enabled)
      });

      return true;
    },

    getCurrent() {
      const car = this.ensureCar();
      const color = this.getColor(car.color);

      return {
        carId: this.activeCarId,
        color: color ? { ...color } : null,
        rim: car.rim,
        parts: { ...car.parts },
        purchasedColors: [...car.purchasedColors],
        purchasedRims: [...car.purchasedRims],
        purchasedParts: [...car.purchasedParts]
      };
    },

    getCatalog() {
      const car = this.ensureCar();

      return {
        colors: this.paintColors.map(item => ({
          ...item,
          owned: car.purchasedColors.includes(item.id),
          selected: car.color === item.id
        })),

        rims: this.rims.map(item => ({
          ...item,
          owned: car.purchasedRims.includes(item.id),
          selected: car.rim === item.id
        })),

        parts: this.parts.map(item => ({
          ...item,
          owned: car.purchasedParts.includes(item.id),
          enabled: Boolean(car.parts[item.id])
        }))
      };
    },

    save() {
      try {
        localStorage.setItem(
          this.storageKey,
          JSON.stringify(this.data)
        );

        return true;
      } catch (error) {
        console.warn(
          "[SUPERX Customization] Save failed:",
          error
        );

        return false;
      }
    },

    load() {
      try {
        const raw = localStorage.getItem(
          this.storageKey
        );

        if (!raw) return false;

        const parsed = JSON.parse(raw);

        if (
          !parsed ||
          typeof parsed !== "object" ||
          Array.isArray(parsed)
        ) {
          return false;
        }

        this.data = parsed;

        return true;
      } catch (error) {
        console.warn(
          "[SUPERX Customization] Load failed:",
          error
        );

        return false;
      }
    },

    emitChange(type, value) {
      const detail = {
        carId: this.activeCarId,
        type,
        value,
        customization: this.getCurrent()
      };

      window.dispatchEvent(
        new CustomEvent(
          "sx:vehicle-customization-changed",
          { detail }
        )
      );
    },

    resetCar(carId = this.activeCarId) {
      const id = String(carId);

      delete this.data[id];

      this.ensureCar(id);
      this.save();

      return this.getCurrent();
    }
  };

  SX.vehicleCustomization = Customization;

  window.dispatchEvent(
    new CustomEvent("sx:vehicle-customization-ready")
  );

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 63
   FILE: js/vehicle-customization.js
   END
========================================================= */
          
