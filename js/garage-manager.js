
/* =========================================================
   SUPERX LEGEND — FILE 64
   FILE: js/garage-manager.js
   PURPOSE: Complete garage inventory and vehicle management
   START
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const GarageManager = {
    storageKey: "superx_garage_manager_v1",

    selectedCarId: null,
    filter: "all",
    sortBy: "default",

    init() {
      this.load();

      if (
        !this.selectedCarId &&
        typeof SX.getSelectedCar === "function"
      ) {
        const car = SX.getSelectedCar();

        if (car) {
          this.selectedCarId = String(car.id);
        }
      }

      return this.getGarage();
    },

    getCars() {
      if (!Array.isArray(SX.CARS)) return [];

      return SX.CARS.map(car => ({
        ...car,
        id: String(car.id)
      }));
    },

    getOwnedCarIds() {
      const player = SX.player || {};

      const owned = Array.isArray(player.ownedCars)
        ? player.ownedCars.map(String)
        : [];

      const cars = this.getCars();

      return cars
        .filter(car => car.unlocked === true)
        .map(car => String(car.id))
        .concat(owned)
        .filter((id, index, array) =>
          array.indexOf(id) === index
        );
    },

    getOwnedCars() {
      const ownedIds = this.getOwnedCarIds();

      return this.getCars().filter(car =>
        ownedIds.includes(String(car.id))
      );
    },

    getLockedCars() {
      const ownedIds = this.getOwnedCarIds();

      return this.getCars().filter(car =>
        !ownedIds.includes(String(car.id))
      );
    },

    getGarage() {
      const cars = this.getOwnedCars();

      return {
        totalCars: this.getCars().length,
        ownedCars: cars.length,
        lockedCars: this.getLockedCars().length,
        selectedCarId: this.selectedCarId,
        cars
      };
    },

    getCar(carId) {
      const id = String(carId);

      return this.getCars().find(
        car => String(car.id) === id
      ) || null;
    },

    isOwned(carId) {
      return this.getOwnedCarIds().includes(
        String(carId)
      );
    },

    selectCar(carId) {
      const id = String(carId);

      if (!this.isOwned(id)) {
        return {
          success: false,
          message: "This car is locked."
        };
      }

      if (typeof SX.selectGameCar === "function") {
        const result = SX.selectGameCar(id);

        if (result === false) {
          return {
            success: false,
            message: "Could not select this car."
          };
        }
      } else if (typeof SX.selectCar === "function") {
        SX.selectCar(id);
      } else {
        return {
          success: false,
          message: "Car selection system is unavailable."
        };
      }

      this.selectedCarId = id;
      this.save();

      this.emit("sx:garage-car-selected", {
        carId: id,
        car: this.getCar(id)
      });

      return {
        success: true,
        car: this.getCar(id)
      };
    },

    buyCar(carId) {
      const id = String(carId);
      const car = this.getCar(id);

      if (!car) {
        return {
          success: false,
          message: "Car not found."
        };
      }

      if (this.isOwned(id)) {
        return {
          success: false,
          message: "Car already owned."
        };
      }

      if (typeof SX.buyCar !== "function") {
        return {
          success: false,
          message: "Car purchase system is unavailable."
        };
      }

      const result = SX.buyCar(id);

      if (
        result === false ||
        (result && result.success === false)
      ) {
        return {
          success: false,
          message: result.message || "Purchase failed."
        };
      }

      this.save();

      this.emit("sx:garage-car-purchased", {
        carId: id,
        car
      });

      return {
        success: true,
        car
      };
    },

    setFilter(filter) {
      const allowed = [
        "all",
        "owned",
        "locked"
      ];

      if (!allowed.includes(filter)) return false;

      this.filter = filter;

      return this.getFilteredCars();
    },

    setSort(sortBy) {
      const allowed = [
        "default",
        "speed-high",
        "speed-low",
        "price-high",
        "price-low",
        "name"
      ];

      if (!allowed.includes(sortBy)) return false;

      this.sortBy = sortBy;

      return this.getFilteredCars();
    },

    getFilteredCars() {
      let cars;

      if (this.filter === "owned") {
        cars = this.getOwnedCars();
      } else if (this.filter === "locked") {
        cars = this.getLockedCars();
      } else {
        cars = this.getCars();
      }

      cars = [...cars];

      const speed = car =>
        Number(car.topSpeed || car.speed || 0);

      const price = car =>
        Number(car.price || 0);

      switch (this.sortBy) {
        case "speed-high":
          cars.sort((a, b) => speed(b) - speed(a));
          break;

        case "speed-low":
          cars.sort((a, b) => speed(a) - speed(b));
          break;

        case "price-high":
          cars.sort((a, b) => price(b) - price(a));
          break;

        case "price-low":
          cars.sort((a, b) => price(a) - price(b));
          break;

        case "name":
          cars.sort((a, b) =>
            String(a.name || "").localeCompare(
              String(b.name || "")
            )
          );
          break;
      }

      return cars.map(car => ({
        ...car,
        owned: this.isOwned(car.id),
        selected:
          String(car.id) === String(this.selectedCarId)
      }));
    },

    getStatistics() {
      const all = this.getCars();
      const owned = this.getOwnedCars();

      const totalValue = owned.reduce(
        (sum, car) =>
          sum + Number(car.price || 0),
        0
      );

      const fastest = [...owned].sort(
        (a, b) =>
          Number(b.topSpeed || b.speed || 0) -
          Number(a.topSpeed || a.speed || 0)
      )[0] || null;

      return {
        totalCars: all.length,
        ownedCars: owned.length,
        lockedCars: all.length - owned.length,
        collectionPercentage: all.length
          ? Math.round((owned.length / all.length) * 100)
          : 0,
        garageValue: totalValue,
        fastestCar: fastest
      };
    },

    save() {
      try {
        localStorage.setItem(
          this.storageKey,
          JSON.stringify({
            selectedCarId: this.selectedCarId,
            filter: this.filter,
            sortBy: this.sortBy
          })
        );

        return true;
      } catch (error) {
        console.warn(
          "[SUPERX Garage] Save failed:",
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

        const data = JSON.parse(raw);

        this.selectedCarId = data.selectedCarId || null;
        this.filter = data.filter || "all";
        this.sortBy = data.sortBy || "default";

        return true;
      } catch (error) {
        console.warn(
          "[SUPERX Garage] Load failed:",
          error
        );

        return false;
      }
    },

    emit(name, detail) {
      window.dispatchEvent(
        new CustomEvent(name, { detail })
      );
    }
  };

  SX.garageManager = GarageManager;

  window.addEventListener(
    "DOMContentLoaded",
    () => GarageManager.init(),
    { once: true }
  );

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 64
   FILE: js/garage-manager.js
   END
========================================================= */
