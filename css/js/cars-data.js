
/* =====================================================
   SUPERX LEGEND RACING
   FILE 10: js/cars-data.js
   START
===================================================== */

(function () {
  "use strict";

  const SX = window.SUPERX;

  if (!SX) {
    console.error("SUPERX config.js must load first.");
    return;
  }

  // 35 DIFFERENT CAR DESIGNS
  // Every car has its own body type and performance data.

  SX.CARS = [

    {
      id: "sx-car-01",
      name: "Phantom GT",
      brand: "SUPERX",
      class: "Sports",
      category: "Starter",
      price: 0,
      topSpeed: 240,
      acceleration: 7.8,
      handling: 78,
      braking: 72,
      power: 320,
      weight: 1480,
      bodyType: "sports-coupe",
      modelShape: "low-wide-coupe",
      color: "#d7d9df",
      accent: "#7c3aed",
      unlocked: true
    },

    {
      id: "sx-car-02",
      name: "Street Hunter",
      brand: "SUPERX",
      class: "Muscle",
      category: "Starter",
      price: 0,
      topSpeed: 260,
      acceleration: 7.2,
      handling: 70,
      braking: 74,
      power: 390,
      weight: 1650,
      bodyType: "muscle-car",
      modelShape: "long-hood-muscle",
      color: "#b91c1c",
      accent: "#f5f5f5",
      unlocked: true
    },

    {
      id: "sx-car-03",
      name: "Apex R",
      brand: "SUPERX",
      class: "Supercar",
      price: 3500,
      topSpeed: 290,
      acceleration: 6.2,
      handling: 85,
      braking: 82,
      power: 520,
      weight: 1420,
      bodyType: "mid-engine-supercar",
      modelShape: "wedge-supercar",
      color: "#e11d48",
      accent: "#111827"
    },

    {
      id: "sx-car-04",
      name: "Vortex X",
      brand: "SUPERX",
      class: "Hypercar",
      price: 6500,
      topSpeed: 330,
      acceleration: 5.4,
      handling: 89,
      braking: 88,
      power: 680,
      weight: 1380,
      bodyType: "hypercar",
      modelShape: "aero-hypercar",
      color: "#2563eb",
      accent: "#dbeafe"
    },

    {
      id: "sx-car-05",
      name: "Thunder 69",
      brand: "SUPERX",
      class: "Muscle",
      price: 4500,
      topSpeed: 285,
      acceleration: 6.4,
      handling: 68,
      braking: 76,
      power: 570,
      weight: 1720,
      bodyType: "classic-muscle",
      modelShape: "classic-long-hood",
      color: "#f59e0b",
      accent: "#171717"
    },

    {
      id: "sx-car-06",
      name: "Neon Drift",
      brand: "SUPERX",
      class: "Drift",
      price: 5000,
      topSpeed: 275,
      acceleration: 6.5,
      handling: 96,
      braking: 80,
      power: 460,
      weight: 1350,
      bodyType: "drift-coupe",
      modelShape: "wide-drift-coupe",
      color: "#a855f7",
      accent: "#22d3ee"
    },

    {
      id: "sx-car-07",
      name: "Titan SUV",
      brand: "SUPERX",
      class: "SUV",
      price: 5500,
      topSpeed: 250,
      acceleration: 8.5,
      handling: 70,
      braking: 75,
      power: 420,
      weight: 2200,
      bodyType: "luxury-suv",
      modelShape: "tall-luxury-suv",
      color: "#334155",
      accent: "#cbd5e1"
    },

    {
      id: "sx-car-08",
      name: "Raptor X",
      brand: "SUPERX",
      class: "Offroad",
      price: 6000,
      topSpeed: 230,
      acceleration: 9.0,
      handling: 74,
      braking: 78,
      power: 450,
      weight: 2350,
      bodyType: "offroad-pickup",
      modelShape: "raised-pickup-truck",
      color: "#65a30d",
      accent: "#1f2937"
    },

    {
      id: "sx-car-09",
      name: "Elegance S",
      brand: "SUPERX",
      class: "Luxury",
      price: 7500,
      topSpeed: 270,
      acceleration: 7.0,
      handling: 82,
      braking: 84,
      power: 480,
      weight: 1850,
      bodyType: "luxury-sedan",
      modelShape: "executive-sedan",
      color: "#111827",
      accent: "#d4af37"
    },

    {
      id: "sx-car-10",
      name: "Falcon GT",
      brand: "SUPERX",
      class: "Sports",
      price: 8000,
      topSpeed: 310,
      acceleration: 5.9,
      handling: 88,
      braking: 85,
      power: 610,
      weight: 1450,
      bodyType: "grand-tourer",
      modelShape: "long-grand-tourer",
      color: "#f97316",
      accent: "#171717"
    },

    {
      id: "sx-car-11",
      name: "Shadow RS",
      brand: "SUPERX",
      class: "Supercar",
      price: 9000,
      topSpeed: 320,
      acceleration: 5.5,
      handling: 90,
      braking: 88,
      power: 650,
      weight: 1400,
      bodyType: "track-supercar",
      modelShape: "track-aero-coupe",
      color: "#18181b",
      accent: "#ef4444"
    },

    {
      id: "sx-car-12",
      name: "Velocity Z",
      brand: "SUPERX",
      class: "Hypercar",
      price: 12000,
      topSpeed: 350,
      acceleration: 4.9,
      handling: 91,
      braking: 90,
      power: 780,
      weight: 1320,
      bodyType: "aero-hypercar",
      modelShape: "extreme-low-hypercar",
      color: "#0ea5e9",
      accent: "#f8fafc"
    },

    {
      id: "sx-car-13",
      name: "Urban Beast",
      brand: "SUPERX",
      class: "SUV",
      price: 8500,
      topSpeed: 265,
      acceleration: 7.8,
      handling: 76,
      braking: 80,
      power: 520,
      weight: 2050,
      bodyType: "performance-suv",
      modelShape: "sporty-coupe-suv",
      color: "#7f1d1d",
      accent: "#fca5a5"
    },

    {
      id: "sx-car-14",
      name: "Desert King",
      brand: "SUPERX",
      class: "Offroad",
      price: 9500,
      topSpeed: 220,
      acceleration: 9.5,
      handling: 80,
      braking: 82,
      power: 500,
      weight: 2400,
      bodyType: "desert-4x4",
      modelShape: "boxy-four-wheel-drive",
      color: "#a16207",
      accent: "#292524"
    },

    {
      id: "sx-car-15",
      name: "Royal Cruiser",
      brand: "SUPERX",
      class: "Luxury",
      price: 11000,
      topSpeed: 280,
      acceleration: 6.8,
      handling: 83,
      braking: 86,
      power: 550,
      weight: 1950,
      bodyType: "luxury-limousine",
      modelShape: "extended-luxury-sedan",
      color: "#312e81",
      accent: "#e5e7eb"
    },

    {
      id: "sx-car-16",
      name: "Turbo Hawk",
      brand: "SUPERX",
      class: "Sports",
      price: 13000,
      topSpeed: 335,
      acceleration: 5.1,
      handling: 92,
      braking: 90,
      power: 720,
      weight: 1390,
      bodyType: "turbo-sports",
      modelShape: "compact-turbo-coupe",
      color: "#16a34a",
      accent: "#052e16"
    },

    {
      id: "sx-car-17",
      name: "Night Rider",
      brand: "SUPERX",
      class: "Supercar",
      price: 15000,
      topSpeed: 360,
      acceleration: 4.7,
      handling: 93,
      braking: 92,
      power: 850,
      weight: 1350,
      bodyType: "stealth-supercar",
      modelShape: "stealth-angular-coupe",
      color: "#27272a",
      accent: "#a78bfa"
    },

    {
      id: "sx-car-18",
      name: "Inferno V12",
      brand: "SUPERX",
      class: "Hypercar",
      price: 18000,
      topSpeed: 390,
      acceleration: 4.2,
      handling: 94,
      braking: 94,
      power: 950,
      weight: 1280,
      bodyType: "v12-hypercar",
      modelShape: "long-v12-hypercar",
      color: "#dc2626",
      accent: "#facc15"
    },

    {
      id: "sx-car-19",
      name: "Mountain Wolf",
      brand: "SUPERX",
      class: "Offroad",
      price: 12500,
      topSpeed: 235,
      acceleration: 8.8,
      handling: 84,
      braking: 85,
      power: 560,
      weight: 2250,
      bodyType: "mountain-offroader",
      modelShape: "short-wheelbase-offroad",
      color: "#57534e",
      accent: "#a3e635"
    },

    {
      id: "sx-car-20",
      name: "Metro Elite",
      brand: "SUPERX",
      class: "Luxury",
      price: 14000,
      topSpeed: 295,
      acceleration: 6.3,
      handling: 87,
      braking: 89,
      power: 600,
      weight: 1780,
      bodyType: "sport-sedan",
      modelShape: "fastback-executive-sedan",
      color: "#e5e7eb",
      accent: "#475569"
    },

    {
      id: "sx-car-21",
      name: "Drift Phantom",
      brand: "SUPERX",
      class: "Drift",
      price: 16000,
      topSpeed: 300,
      acceleration: 5.8,
      handling: 98,
      braking: 86,
      power: 620,
      weight: 1320,
      bodyType: "pro-drift-car",
      modelShape: "extreme-widebody-drift",
      color: "#ec4899",
      accent: "#06b6d4"
    },

    {
      id: "sx-car-22",
      name: "Aero Blade",
      brand: "SUPERX",
      class: "Hypercar",
      price: 22000,
      topSpeed: 410,
      acceleration: 3.9,
      handling: 95,
      braking: 96,
      power: 1050,
      weight: 1240,
      bodyType: "aero-track-hypercar",
      modelShape: "blade-shaped-hypercar",
      color: "#f8fafc",
      accent: "#2563eb"
    },

    {
      id: "sx-car-23",
      name: "Storm Breaker",
      brand: "SUPERX",
      class: "Muscle",
      price: 19000,
      topSpeed: 320,
      acceleration: 5.4,
      handling: 79,
      braking: 88,
      power: 780,
      weight: 1700,
      bodyType: "modern-muscle",
      modelShape: "wide-modern-muscle",
      color: "#0f172a",
      accent: "#38bdf8"
    },

    {
      id: "sx-car-24",
      name: "Glacier GT",
      brand: "SUPERX",
      class: "Sports",
      price: 20000,
      topSpeed: 340,
      acceleration: 5.0,
      handling: 91,
      braking: 93,
      power: 750,
      weight: 1370,
      bodyType: "electric-sports",
      modelShape: "smooth-electric-coupe",
      color: "#bae6fd",
      accent: "#0284c7"
    },

    {
      id: "sx-car-25",
      name: "Royal Falcon",
      brand: "SUPERX",
      class: "Luxury",
      price: 24000,
      topSpeed: 310,
      acceleration: 5.8,
      handling: 89,
      braking: 94,
      power: 720,
      weight: 1900,
      bodyType: "luxury-grand-sedan",
      modelShape: "premium-long-wheelbase-sedan",
      color: "#854d0e",
      accent: "#fef3c7"
    },

    {
      id: "sx-car-26",
      name: "Venom X",
      brand: "SUPERX",
      class: "Supercar",
      price: 28000,
      topSpeed: 420,
      acceleration: 3.6,
      handling: 96,
      braking: 97,
      power: 1150,
      weight: 1260,
      bodyType: "extreme-supercar",
      modelShape: "aggressive-aero-supercar",
      color: "#65a30d",
      accent: "#111827"
    },

    {
      id: "sx-car-27",
      name: "Cyber Beast",
      brand: "SUPERX",
      class: "Electric",
      price: 30000,
      topSpeed: 370,
      acceleration: 3.8,
      handling: 90,
      braking: 93,
      power: 1000,
      weight: 2100,
      bodyType: "futuristic-electric",
      modelShape: "angular-futuristic-pickup",
      color: "#a1a1aa",
      accent: "#7c3aed"
    },

    {
      id: "sx-car-28",
      name: "Skyline Racer",
      brand: "SUPERX",
      class: "Racing",
      price: 32000,
      topSpeed: 380,
      acceleration: 4.0,
      handling: 97,
      braking: 96,
      power: 980,
      weight: 1180,
      bodyType: "gt-race-car",
      modelShape: "low-racing-car-with-wing",
      color: "#1d4ed8",
      accent: "#facc15"
    },

    {
      id: "sx-car-29",
      name: "Desert Falcon",
      brand: "SUPERX",
      class: "Offroad",
      price: 26000,
      topSpeed: 270,
      acceleration: 7.5,
      handling: 88,
      braking: 90,
      power: 750,
      weight: 2180,
      bodyType: "rally-raider",
      modelShape: "high-clearance-rally-suv",
      color: "#ea580c",
      accent: "#292524"
    },

    {
      id: "sx-car-30",
      name: "Quantum R",
      brand: "SUPERX",
      class: "Hypercar",
      price: 38000,
      topSpeed: 440,
      acceleration: 3.2,
      handling: 97,
      braking: 98,
      power: 1300,
      weight: 1220,
      bodyType: "hybrid-hypercar",
      modelShape: "advanced-hybrid-hypercar",
      color: "#7c3aed",
      accent: "#f8fafc"
    },

    {
      id: "sx-car-31",
      name: "Black Crown",
      brand: "SUPERX",
      class: "Luxury",
      price: 35000,
      topSpeed: 330,
      acceleration: 5.2,
      handling: 91,
      braking: 96,
      power: 850,
      weight: 2050,
      bodyType: "luxury-performance-sedan",
      modelShape: "black-crown-luxury-sedan",
      color: "#09090b",
      accent: "#d4af37"
    },

    {
      id: "sx-car-32",
      name: "Apex Legend",
      brand: "SUPERX",
      class: "Racing",
      price: 42000,
      topSpeed: 460,
      acceleration: 2.9,
      handling: 98,
      braking: 98,
      power: 1450,
      weight: 1150,
      bodyType: "prototype-racer",
      modelShape: "closed-cockpit-prototype",
      color: "#f97316",
      accent: "#1e293b"
    },

    {
      id: "sx-car-33",
      name: "Phantom X",
      brand: "SUPERX",
      class: "Hypercar",
      price: 48000,
      topSpeed: 480,
      acceleration: 2.7,
      handling: 98,
      braking: 99,
      power: 1600,
      weight: 1190,
      bodyType: "ultimate-hypercar",
      modelShape: "ultra-low-wide-hypercar",
      color: "#f1f5f9",
      accent: "#9333ea"
    },

    {
      id: "sx-car-34",
      name: "Infinity GT",
      brand: "SUPERX",
      class: "Electric",
      price: 55000,
      topSpeed: 500,
      acceleration: 2.5,
      handling: 99,
      braking: 99,
      power: 1800,
      weight: 1250,
      bodyType: "electric-hypercar",
      modelShape: "streamlined-electric-hypercar",
      color: "#06b6d4",
      accent: "#0f172a"
    },

    {
      id: "sx-car-35",
      name: "SUPERX One",
      brand: "SUPERX",
      class: "Ultimate",
      price: 75000,
      topSpeed: 520,
      acceleration: 2.2,
      handling: 100,
      braking: 100,
      power: 2200,
      weight: 1100,
      bodyType: "ultimate-concept",
      modelShape: "unique-futuristic-concept-car",
      color: "#e5e7eb",
      accent: "#7c3aed"
    }

  ];

  // FIND CAR BY ID
  SX.getCar = function (carId) {
    return SX.CARS.find(function (car) {
      return car.id === carId;
    }) || null;
  };

  // GET ALL UNLOCKED CARS
  SX.getUnlockedCars = function () {
    return SX.CARS.filter(function (car) {
      return SX.player.unlockedCars.includes(car.id);
    });
  };

  // GET ALL LOCKED CARS
  SX.getLockedCars = function () {
    return SX.CARS.filter(function (car) {
      return !SX.player.unlockedCars.includes(car.id);
    });
  };

  // CHECK CAR UNLOCK STATUS
  SX.isCarUnlocked = function (carId) {
    return SX.player.unlockedCars.includes(carId);
  };

  // BUY CAR
  SX.buyCar = function (carId) {
    const car = SX.getCar(carId);

    if (!car) {
      return {
        success: false,
        message: "Car not found."
      };
    }

    if (SX.isCarUnlocked(carId)) {
      return {
        success: false,
        message: "This car is already unlocked."
      };
    }

    if (!SX.spendCoins(car.price)) {
      return {
        success: false,
        message: "Not enough coins."
      };
    }

    SX.player.unlockedCars.push(carId);
    SX.savePlayer();

    SX.events.emit("carUnlocked", car);

    return {
      success: true,
      message: car.name + " unlocked!",
      car: car
    };
  };

  // SELECT CAR
  SX.selectGameCar = function (carId) {
    const car = SX.getCar(carId);

    if (!car || !SX.isCarUnlocked(carId)) {
      return false;
    }

    SX.player.selectedCar = carId;
    SX.savePlayer();

    SX.events.emit("carSelected", car);

    return true;
  };

  // CURRENT SELECTED CAR
  SX.getSelectedCar = function () {
    return (
      SX.getCar(SX.player.selectedCar) ||
      SX.CARS[0]
    );
  };

  // DATA VALIDATION
  SX.validateCars = function () {
    const ids = SX.CARS.map(function (car) {
      return car.id;
    });

    return {
      total: SX.CARS.length,
      uniqueIds: new Set(ids).size === ids.length,
      validCount: SX.CARS.length === SX.CONFIG.totalCars,
      fastestSpeed: Math.max.apply(
        null,
        SX.CARS.map(function (car) {
          return car.topSpeed;
        })
      )
    };
  };

  console.log(
    "SUPERX CARS READY:",
    SX.validateCars()
  );

})();

/* =====================================================
   FILE 10: js/cars-data.js
   END
===================================================== */
        
