
/* =====================================================
   SUPERX LEGEND RACING
   FILE 12: js/garage.js
   START
===================================================== */

(function () {
  "use strict";

  const SX = window.SUPERX;

  if (!SX || !SX.CARS) {
    console.error("SUPERX car system is not loaded.");
    return;
  }

  SX.garage = {};

  // GARAGE UPGRADE DEFINITIONS
  SX.garage.upgrades = {
    engine: {
      name: "Engine",
      description: "Improve engine power and top speed.",
      maxLevel: 5,
      basePrice: 1200,
      effects: {
        power: 0.08,
        speed: 0.025
      }
    },

    gearbox: {
      name: "Gearbox",
      description: "Improve acceleration and gear response.",
      maxLevel: 5,
      basePrice: 1000,
      effects: {
        acceleration: 0.06
      }
    },

    brakes: {
      name: "Brakes",
      description: "Improve braking performance.",
      maxLevel: 5,
      basePrice: 850,
      effects: {
        braking: 5
      }
    },

    tyres: {
      name: "Tyres",
      description: "Improve grip and cornering.",
      maxLevel: 5,
      basePrice: 900,
      effects: {
        handling: 4
      }
    },

    suspension: {
      name: "Suspension",
      description: "Improve stability on rough roads.",
      maxLevel: 5,
      basePrice: 1100,
      effects: {
        handling: 3,
        braking: 2
      }
    },

    steering: {
      name: "Steering",
      description: "Improve steering response.",
      maxLevel: 5,
      basePrice: 950,
      effects: {
        handling: 5
      }
    },

    turbo: {
      name: "Turbo",
      description: "Increase engine power and speed.",
      maxLevel: 5,
      basePrice: 1500,
      effects: {
        power: 0.12,
        speed: 0.035
      }
    }
  };

  // VISUAL CUSTOMIZATION OPTIONS
  SX.garage.customization = {
    paint: {
      name: "Paint",
      options: [
        "#d7d9df",
        "#ef4444",
        "#2563eb",
        "#16a34a",
        "#a855f7",
        "#f59e0b",
        "#111827",
        "#f8fafc",
        "#ec4899",
        "#06b6d4"
      ],
      basePrice: 300
    },

    rims: {
      name: "Rims",
      options: [
        "Classic",
        "Sport",
        "Racing",
        "Luxury",
        "Forged"
      ],
      basePrice: 500
    },

    bonnet: {
      name: "Bonnet",
      options: [
        "Standard",
        "Sport",
        "Vented",
        "Carbon"
      ],
      basePrice: 700
    },

    frontBumper: {
      name: "Front Bumper",
      options: [
        "Standard",
        "Sport",
        "Racing",
        "Aero"
      ],
      basePrice: 800
    },

    rearBumper: {
      name: "Rear Bumper",
      options: [
        "Standard",
        "Sport",
        "Racing",
        "Diffuser"
      ],
      basePrice: 750
    },

    spoiler: {
      name: "Spoiler",
      options: [
        "None",
        "Small",
        "Sport",
        "GT Wing"
      ],
      basePrice: 650
    },

    bodyKit: {
      name: "Body Kit",
      options: [
        "Standard",
        "Street",
        "Widebody",
        "Track"
      ],
      basePrice: 1200
    },

    headlights: {
      name: "Headlights",
      options: [
        "Standard",
        "LED",
        "Laser",
        "Neon"
      ],
      basePrice: 550
    }
  };

  // CREATE DEFAULT GARAGE SAVE DATA
  SX.garage.getSaveData = function () {
    if (!SX.player.garage) {
      SX.player.garage = {};
    }

    if (!SX.player.garage.upgrades) {
      SX.player.garage.upgrades = {};
    }

    if (!SX.player.garage.customization) {
      SX.player.garage.customization = {};
    }

    return SX.player.garage;
  };

  // GET CURRENT CAR
  SX.garage.getCurrentCar = function () {
    return SX.getSelectedCar();
  };

  // GET CAR UPGRADE LEVEL
  SX.garage.getUpgradeLevel = function (carId, upgradeId) {
    const save = SX.garage.getSaveData();

    const carUpgrades = save.upgrades[carId] || {};

    return carUpgrades[upgradeId] || 0;
  };

  // CALCULATE UPGRADE PRICE
  SX.garage.getUpgradePrice = function (upgradeId, level) {
    const upgrade = SX.garage.upgrades[upgradeId];

    if (!upgrade) return 0;

    return Math.floor(
      upgrade.basePrice * Math.pow(level + 1, 1.65)
    );
  };

  // BUY UPGRADE
  SX.garage.buyUpgrade = function (upgradeId) {
    const car = SX.garage.getCurrentCar();
    const upgrade = SX.garage.upgrades[upgradeId];

    if (!car || !upgrade) {
      return {
        success: false,
        message: "Upgrade not available."
      };
    }

    const currentLevel =
      SX.garage.getUpgradeLevel(car.id, upgradeId);

    if (currentLevel >= upgrade.maxLevel) {
      return {
        success: false,
        message: "Maximum upgrade level reached."
      };
    }

    const price = SX.garage.getUpgradePrice(
      upgradeId,
      currentLevel
    );

    if (!SX.spendCoins(price)) {
      return {
        success: false,
        message: "Not enough coins."
      };
    }

    const save = SX.garage.getSaveData();

    if (!save.upgrades[car.id]) {
      save.upgrades[car.id] = {};
    }

    save.upgrades[car.id][upgradeId] = currentLevel + 1;

    SX.savePlayer();

    SX.events.emit("garageUpgradePurchased", {
      carId: car.id,
      upgradeId: upgradeId,
      level: currentLevel + 1
    });

    return {
      success: true,
      message: upgrade.name + " upgraded to Level " + (currentLevel + 1),
      level: currentLevel + 1,
      price: price
    };
  };

  // GET CURRENT CAR CUSTOMIZATION
  SX.garage.getCustomization = function (carId) {
    const save = SX.garage.getSaveData();

    return save.customization[carId] || {
      paint: null,
      rims: "Classic",
      bonnet: "Standard",
      frontBumper: "Standard",
      rearBumper: "Standard",
      spoiler: "None",
      bodyKit: "Standard",
      headlights: "Standard"
    };
  };

  // CHANGE CUSTOMIZATION
  SX.garage.customize = function (partId, option) {
    const car = SX.garage.getCurrentCar();
    const part = SX.garage.customization[partId];

    if (!car || !part || !part.options.includes(option)) {
      return {
        success: false,
        message: "Customization option not available."
      };
    }

    const current = SX.garage.getCustomization(car.id);

    if (current[partId] === option) {
      return {
        success: false,
        message: "Already selected."
      };
    }

    const price = part.basePrice;

    if (!SX.spendCoins(price)) {
      return {
        success: false,
        message: "Not enough coins."
      };
    }

    const save = SX.garage.getSaveData();

    if (!save.customization[car.id]) {
      save.customization[car.id] = current;
    }

    save.customization[car.id][partId] = option;

    SX.savePlayer();

    SX.events.emit("carCustomized", {
      carId: car.id,
      part: partId,
      option: option
    });

    return {
      success: true,
      message: part.name + " updated!",
      price: price
    };
  };

  // GET UPGRADED CAR PERFORMANCE
  SX.garage.getPerformance = function (carId) {
    const car = SX.getCar(carId);

    if (!car) return null;

    const performance = {
      topSpeed: car.topSpeed,
      acceleration: car.acceleration,
      handling: car.handling,
      braking: car.braking,
      power: car.power
    };

    Object.keys(SX.garage.upgrades).forEach(function (upgradeId) {
      const upgrade = SX.garage.upgrades[upgradeId];

      const level = SX.garage.getUpgradeLevel(
        carId,
        upgradeId
      );

      if (!level) return;

      if (upgrade.effects.speed) {
        performance.topSpeed +=
          car.topSpeed * upgrade.effects.speed * level;
      }

      if (upgrade.effects.power) {
        performance.power +=
          car.power * upgrade.effects.power * level;
      }

      if (upgrade.effects.acceleration) {
        performance.acceleration -=
          upgrade.effects.acceleration * level;
      }

      if (upgrade.effects.handling) {
        performance.handling +=
          upgrade.effects.handling * level;
      }

      if (upgrade.effects.braking) {
        performance.braking +=
          upgrade.effects.braking * level;
      }
    });

    performance.topSpeed = Math.min(
      Math.round(performance.topSpeed),
      SX.CONFIG.maxSpeed
    );

    performance.acceleration = Math.max(
      1,
      Number(performance.acceleration.toFixed(2))
    );

    performance.handling = Math.min(
      100,
      Math.round(performance.handling)
    );

    performance.braking = Math.min(
      100,
      Math.round(performance.braking)
    );

    performance.power = Math.round(performance.power);

    return performance;
  };

  // INITIALIZE GARAGE
  SX.garage.initialize = function () {
    SX.garage.getSaveData();

    const car = SX.garage.getCurrentCar();

    SX.events.emit("garageInitialized", car);

    console.log("SUPERX GARAGE SYSTEM READY");
  };

  SX.garage.initialize();

})();

/* =====================================================
   FILE 12: js/garage.js
   END
===================================================== */
    
