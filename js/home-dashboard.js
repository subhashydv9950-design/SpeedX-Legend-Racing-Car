
/* =====================================================
   SUPERX LEGEND RACING
   FILE: js/home-dashboard.js
   PREMIUM HOME DASHBOARD SYSTEM
   START
===================================================== */

(function () {
  "use strict";

  const SX = window.SUPERX;

  if (!SX) {
    console.error("SUPERX system not loaded.");
    return;
  }

  const $ = (id) => document.getElementById(id);

  function getPlayer() {
    try {
      if (typeof SX.getPlayer === "function") {
        return SX.getPlayer();
      }

      if (SX.player) return SX.player;

      if (typeof SX.storage?.getPlayer === "function") {
        return SX.storage.getPlayer();
      }
    } catch (error) {
      console.warn("Player data unavailable:", error);
    }

    return SX.DEFAULT_PLAYER || {
      name: "Player",
      level: 1,
      coins: 2500
    };
  }

  function updatePlayer() {
    const player = getPlayer();

    const name = player.name || "Player";
    const level = player.level || 1;
    const coins = Number(player.coins ?? 2500);

    [
      "homePlayerName",
      "menuPlayerName"
    ].forEach(id => {
      if ($(id)) $(id).textContent = name;
    });

    [
      "homePlayerLevel",
      "menuPlayerLevel"
    ].forEach(id => {
      if ($(id)) $(id).textContent = level;
    });

    if ($("coinCount")) {
      $("coinCount").textContent =
        coins.toLocaleString("en-IN");
    }
  }

  function updateCar(car) {
    if (!car) return;

    const cars = SX.CARS || [];
    const index = Math.max(
      0,
      cars.findIndex(item => item.id === car.id)
    );

    const player = getPlayer();
    const unlockedCars = player.unlockedCars || [];

    const isUnlocked =
      car.unlocked === true ||
      unlockedCars.includes(car.id) ||
      Number(car.price) === 0;

    if ($("homeCarNumber")) {
      $("homeCarNumber").textContent =
        String(index + 1).padStart(2, "0") +
        " / " +
        String(cars.length).padStart(2, "0");
    }

    if ($("homeCarStatus")) {
      $("homeCarStatus").textContent =
        isUnlocked ? "UNLOCKED" : "LOCKED";

      $("homeCarStatus").classList.toggle(
        "is-locked",
        !isUnlocked
      );

      $("homeCarStatus").classList.toggle(
        "is-unlocked",
        isUnlocked
      );
    }

    if ($("carName")) {
      $("carName").textContent = car.name || "SUPERX CAR";
    }

    if ($("carClass")) {
      $("carClass").textContent = car.class || "SPORTS";
    }

    if ($("carSpeed")) {
      $("carSpeed").textContent =
        Number(car.topSpeed || 0) + " KM/H";
    }

    if ($("carPower")) {
      $("carPower").textContent =
        Number(car.power || 0) + " HP";
    }

    if ($("carHandling")) {
      $("carHandling").textContent =
        Number(car.handling || 0) + "%";
    }

    const showroom = $("showroomCar");

    if (showroom) {
      showroom.dataset.carId = car.id || "";
      showroom.dataset.carUnlocked = String(isUnlocked);
    }
  }

  function updateCurrentCar() {
    const cars = SX.CARS || [];

    if (!cars.length) return;

    const index =
      Number(SX.state?.currentCarIndex || 0);

    const car = cars[index] || cars[0];

    updateCar(car);
  }

  function initializeDashboard() {
    updatePlayer();
    updateCurrentCar();

    if (SX.events && typeof SX.events.on === "function") {
      SX.events.on("showroomCarChanged", updateCar);
    }

    document.addEventListener(
      "visibilitychange",
      function () {
        if (!document.hidden) {
          updatePlayer();
          updateCurrentCar();
        }
      }
    );

    console.log("SUPERX PREMIUM HOME DASHBOARD READY");
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeDashboard
    );
  } else {
    initializeDashboard();
  }

})();

/* =====================================================
   FILE: js/home-dashboard.js
   END
===================================================== */
