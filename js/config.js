
/* =====================================================
   SUPERX LEGEND RACING
   FILE 06: js/config.js
   START
===================================================== */

(function () {
  "use strict";

  window.SUPERX = window.SUPERX || {};

  const SX = window.SUPERX;

  // GAME INFORMATION
  SX.INFO = {
    name: "SUPERX LEGEND",
    fullName: "SUPERX LEGEND RACING",
    version: "1.0.0",
    developer: "Subhash Yadav",
    instagram: "@iamsubhash177",
    email: "yahu9950@gmail.com"
  };

  // GAME CONFIGURATION
  SX.CONFIG = {
    startingCoins: 2500,
    startingXP: 0,
    startingLevel: 1,

    totalCars: 35,
    initiallyUnlockedCars: 2,

    totalWorlds: 8,
    mapsPerWorld: 100,
    totalMaps: 800,

    maxSpeed: 520,
    defaultSpeed: 240,

    defaultLanguage: "en",
    supportedLanguages: [
      "en", "hi", "zh", "ja", "ko",
      "fr", "de", "ru", "uk", "bn",
      "pa", "gu", "mr", "ta", "te"
    ],

    defaultCamera: "third-person",
    defaultGraphics: "high",

    saveKey: "SUPERX_LEGEND_SAVE_V1",
    settingsKey: "SUPERX_LEGEND_SETTINGS_V1"
  };

  // PAGE ROUTES
  SX.PAGES = {
    home: "index.html",
    garage: "garage.html",
    career: "career.html",
    maps: "maps.html",
    freeDrive: "free-drive.html",
    race: "race.html",
    online: "online.html",
    profile: "profile.html",
    settings: "settings.html",
    about: "about.html"
  };

  // GAME WORLDS
  SX.WORLDS = [
    {
      id: "village",
      name: "Village",
      maps: 100,
      weather: ["clear", "rain", "fog"],
      unlocked: true
    },
    {
      id: "city",
      name: "City",
      maps: 100,
      weather: ["clear", "rain", "fog"],
      unlocked: true
    },
    {
      id: "mountains",
      name: "Mountains",
      maps: 100,
      weather: ["clear", "fog", "rain"],
      unlocked: true
    },
    {
      id: "snow",
      name: "Snow World",
      maps: 100,
      weather: ["snow", "fog", "clear"],
      unlocked: true
    },
    {
      id: "desert",
      name: "Desert",
      maps: 100,
      weather: ["clear", "fog"],
      unlocked: true
    },
    {
      id: "forest",
      name: "Forest",
      maps: 100,
      weather: ["clear", "rain", "fog"],
      unlocked: true
    },
    {
      id: "highway",
      name: "Highway",
      maps: 100,
      weather: ["clear", "rain"],
      unlocked: true
    },
    {
      id: "racing-arena",
      name: "Racing Arena",
      maps: 100,
      weather: ["clear", "rain"],
      unlocked: true
    }
  ];

  // CAMERA MODES
  SX.CAMERAS = [
    { id: "third-person", name: "Third Person" },
    { id: "close-chase", name: "Close Chase" },
    { id: "front", name: "Front Camera" },
    { id: "cockpit", name: "Cockpit View" }
  ];

  // CONTROL MODES
  SX.CONTROLS = {
    steering: ["wheel", "buttons", "tilt"],
    acceleration: ["pedal", "button"],
    braking: ["pedal", "button"],
    defaultSteering: "wheel",
    sensitivity: 5
  };

  // GRAPHICS SETTINGS
  SX.GRAPHICS = {
    low: {
      pixelRatio: 1,
      shadows: false,
      antialias: false
    },
    medium: {
      pixelRatio: 1.5,
      shadows: true,
      antialias: false
    },
    high: {
      pixelRatio: 2,
      shadows: true,
      antialias: true
    }
  };

  // DEFAULT PLAYER DATA
  SX.DEFAULT_PLAYER = {
    name: "Player",
    avatar: "",
    level: 1,
    xp: 0,
    coins: 2500,
    selectedCar: "sx-car-01",
    unlockedCars: ["sx-car-01", "sx-car-02"],
    completedMaps: [],
    bestTimes: {},
    totalDistance: 0,
    totalRaces: 0,
    wins: 0
  };

  // DEFAULT GAME SETTINGS
  SX.DEFAULT_SETTINGS = {
    language: "en",
    music: true,
    soundEffects: true,
    masterVolume: 0.7,
    musicVolume: 0.5,
    sfxVolume: 0.8,

    graphics: "high",
    camera: "third-person",

    steeringMode: "wheel",
    steeringSensitivity: 5,
    controlSize: 100,

    traffic: true,
    weather: "clear",
    timeOfDay: "day"
  };

  // UTILITY FUNCTIONS
  SX.utils = SX.utils || {};

  SX.utils.clamp = function (value, min, max) {
    return Math.min(Math.max(value, min), max);
  };

  SX.utils.random = function (min, max) {
    return Math.random() * (max - min) + min;
  };

  SX.utils.randomInt = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  SX.utils.formatCoins = function (amount) {
    return Math.floor(Number(amount) || 0).toLocaleString("en-IN");
  };

  SX.utils.getPageName = function () {
    const file = window.location.pathname.split("/").pop();
    return file || "index.html";
  };

  SX.utils.isMobile = function () {
    return window.matchMedia("(max-width: 768px)").matches;
  };

  SX.utils.supportsWebGL = function () {
    try {
      const canvas = document.createElement("canvas");

      return Boolean(
        window.WebGLRenderingContext &&
        (
          canvas.getContext("webgl") ||
          canvas.getContext("experimental-webgl")
        )
      );
    } catch (error) {
      return false;
    }
  };

  // GAME EVENT SYSTEM
  SX.events = {
    listeners: {},

    on: function (eventName, callback) {
      if (!this.listeners[eventName]) {
        this.listeners[eventName] = [];
      }

      this.listeners[eventName].push(callback);
    },

    off: function (eventName, callback) {
      if (!this.listeners[eventName]) return;

      this.listeners[eventName] =
        this.listeners[eventName].filter(
          function (item) {
            return item !== callback;
          }
        );
    },

    emit: function (eventName, data) {
      const callbacks = this.listeners[eventName] || [];

      callbacks.forEach(function (callback) {
        try {
          callback(data);
        } catch (error) {
          console.error(
            "SUPERX event error:",
            eventName,
            error
          );
        }
      });
    }
  };

  // INITIALIZATION CHECK
  SX.initialized = true;

  console.log(
    "SUPERX LEGEND CONFIG LOADED",
    SX.INFO.version
  );

})();

/* =====================================================
   FILE 06: js/config.js
   END
===================================================== */
