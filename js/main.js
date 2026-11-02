
/* =====================================================
   SUPERX LEGEND RACING
   FILE 11: js/main.js
   START
===================================================== */

(function () {
  "use strict";

  const SX = window.SUPERX;

  if (!SX) {
    console.error("SUPERX configuration missing.");
    return;
  }

  SX.main = {};

  // GAME STATE
  SX.state = {
    currentPage: SX.utils.getPageName(),
    currentCarIndex: 0,
    selectedCar: SX.getSelectedCar(),
    isPaused: false,
    isGameRunning: false,
    isInitialized: false
  };

  // ELEMENT SHORTCUT
  const $ = function (selector) {
    return document.querySelector(selector);
  };

  const $$ = function (selector) {
    return Array.from(
      document.querySelectorAll(selector)
    );
  };

  // UPDATE HOME PLAYER INFORMATION
  SX.main.updatePlayerInformation = function () {
    SX.ui.refreshPlayer();

    const playerName = $("#playerName");
    const playerLevel = $("#playerLevel");
    const coins = $("#coinCount");

    if (playerName) {
      playerName.textContent = SX.player.name;
    }

    if (playerLevel) {
      playerLevel.textContent = SX.player.level;
    }

    if (coins) {
      coins.textContent =
        SX.utils.formatCoins(SX.player.coins);
    }
  };

  // UPDATE CAR INFORMATION
  SX.main.updateCarInformation = function (car) {
    if (!car) return;

    SX.state.selectedCar = car;

    SX.ui.setText("#carName", car.name);
    SX.ui.setText("#carClass", car.class);
    SX.ui.setText("#carSpeed", car.topSpeed + " KM/H");
    SX.ui.setText("#carPower", car.power + " HP");
    SX.ui.setText("#carHandling", car.handling + "%");

    SX.ui.setText(
      "#carPrice",
      car.price === 0
        ? "FREE"
        : SX.utils.formatCoins(car.price) + " COINS"
    );

    const colorElement = $("#carColorPreview");

    if (colorElement) {
      colorElement.style.background = car.color;
    }

    const carDisplay = $("#showroomCar");

    if (carDisplay) {
      carDisplay.dataset.carId = car.id;
      carDisplay.style.setProperty(
        "--car-color",
        car.color
      );
      carDisplay.style.setProperty(
        "--car-accent",
        car.accent
      );
    }

    const locked = !SX.isCarUnlocked(car.id);

    const buyButton = $("#buyCarBtn");
    const selectButton = $("#selectCarBtn");

    if (buyButton) {
      buyButton.hidden = !locked;
      buyButton.textContent =
        "UNLOCK - " +
        SX.utils.formatCoins(car.price) +
        " COINS";
    }

    if (selectButton) {
      selectButton.hidden = locked;
      selectButton.textContent =
        SX.player.selectedCar === car.id
          ? "SELECTED"
          : "SELECT CAR";

      selectButton.disabled =
        SX.player.selectedCar === car.id;
    }

    SX.events.emit("showroomCarChanged", car);
  };

  // CHANGE SHOWROOM CAR
  SX.main.changeCar = function (direction) {
    const total = SX.CARS.length;

    SX.state.currentCarIndex =
      (
        SX.state.currentCarIndex +
        direction +
        total
      ) % total;

    const car = SX.CARS[SX.state.currentCarIndex];

    SX.main.updateCarInformation(car);
  };

  // BUY CURRENT CAR
  SX.main.buyCurrentCar = function () {
    const car = SX.CARS[SX.state.currentCarIndex];

    if (!car) return;

    const result = SX.buyCar(car.id);

    SX.ui.toast(
      result.message,
      result.success ? "success" : "error"
    );

    SX.main.updateCarInformation(car);
    SX.main.updatePlayerInformation();
  };

  // SELECT CURRENT CAR
  SX.main.selectCurrentCar = function () {
    const car = SX.CARS[SX.state.currentCarIndex];

    if (!car) return;

    if (!SX.selectGameCar(car.id)) {
      SX.ui.toast("Unlock this car first.", "error");
      return;
    }

    SX.ui.toast(car.name + " selected!", "success");

    SX.main.updateCarInformation(car);
    SX.main.updatePlayerInformation();
  };

  // SHOWROOM BUTTON EVENTS
  const previousCar = $("#previousCarBtn");
  const nextCar = $("#nextCarBtn");
  const buyCar = $("#buyCarBtn");
  const selectCar = $("#selectCarBtn");

  if (previousCar) {
    previousCar.addEventListener("click", function () {
      SX.main.changeCar(-1);
    });
  }

  if (nextCar) {
    nextCar.addEventListener("click", function () {
      SX.main.changeCar(1);
    });
  }

  if (buyCar) {
    buyCar.addEventListener("click", function () {
      SX.main.buyCurrentCar();
    });
  }

  if (selectCar) {
    selectCar.addEventListener("click", function () {
      SX.main.selectCurrentCar();
    });
  }

  // NAVIGATION BUTTONS
  $$("[data-page]").forEach(function (button) {
    button.addEventListener("click", function (event) {
      const page = button.dataset.page;

      if (!SX.PAGES[page]) return;

      if (
        button.tagName === "BUTTON" ||
        button.getAttribute("role") === "button"
      ) {
        event.preventDefault();
        SX.navigation.goTo(page);
      }
    });
  });

  // START CAREER
  const careerButton = $("#careerButton");

  if (careerButton) {
    careerButton.addEventListener("click", function () {
      SX.navigation.goTo("career");
    });
  }

  // START FREE DRIVE
  const freeDriveButton = $("#freeDriveButton");

  if (freeDriveButton) {
    freeDriveButton.addEventListener("click", function () {
      SX.navigation.goTo("freeDrive");
    });
  }

  // OPEN GARAGE
  const garageButton = $("#garageButton");

  if (garageButton) {
    garageButton.addEventListener("click", function () {
      SX.navigation.goTo("garage");
    });
  }

  // OPEN ONLINE
  const onlineButton = $("#onlineButton");

  if (onlineButton) {
    onlineButton.addEventListener("click", function () {
      SX.navigation.goTo("online");
    });
  }

  // OPEN PROFILE
  const profileButton = $("#profileButton");

  if (profileButton) {
    profileButton.addEventListener("click", function () {
      SX.navigation.goTo("profile");
    });
  }

  // INITIALIZE SHOWROOM
  SX.main.initializeShowroom = function () {
    const selectedCar = SX.getSelectedCar();

    const index = SX.CARS.findIndex(function (car) {
      return car.id === selectedCar.id;
    });

    SX.state.currentCarIndex = index >= 0 ? index : 0;

    SX.main.updateCarInformation(
      SX.CARS[SX.state.currentCarIndex]
    );
  };

  // INITIALIZE HOME PAGE
  SX.main.initialize = function () {
    if (SX.state.isInitialized) return;

    SX.state.isInitialized = true;

    SX.main.updatePlayerInformation();
    SX.main.initializeShowroom();

    SX.navigation.setActiveLink();

    SX.events.emit("gameInitialized");

    console.log("SUPERX LEGEND MAIN SYSTEM READY");
  };

  // WAIT FOR PAGE LOAD
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      SX.main.initialize,
      { once: true }
    );
  } else {
    SX.main.initialize();
  }

})();

/* =====================================================
   FILE 11: js/main.js
   END
===================================================== */
 
