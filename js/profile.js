
/* =========================================================
   SUPERX LEGEND — FILE 28
   FILE: js/profile.js
   START
========================================================= */

(function () {
  "use strict";

  window.SUPERX = window.SUPERX || {};
  const SX = window.SUPERX;

  const DEFAULT_PROFILE = {
    name: "SUPERX RACER",
    avatar: "",
    country: "",
    joinedAt: new Date().toISOString(),
    selectedTitle: "Rookie Racer"
  };

  const TITLES = [
    { id: "rookie", name: "Rookie Racer", level: 1 },
    { id: "street", name: "Street Driver", level: 5 },
    { id: "pro", name: "Pro Racer", level: 10 },
    { id: "elite", name: "Elite Driver", level: 20 },
    { id: "legend", name: "Legend Racer", level: 40 },
    { id: "champion", name: "World Champion", level: 60 },
    { id: "superx", name: "SUPERX Legend", level: 100 }
  ];

  let profile = loadProfile();
  let initialized = false;

  function loadProfile() {
    try {
      const saved = localStorage.getItem("superx_profile_v1");

      if (!saved) {
        return Object.assign({}, DEFAULT_PROFILE);
      }

      return Object.assign(
        {},
        DEFAULT_PROFILE,
        JSON.parse(saved)
      );
    } catch (error) {
      return Object.assign({}, DEFAULT_PROFILE);
    }
  }

  function save() {
    try {
      localStorage.setItem(
        "superx_profile_v1",
        JSON.stringify(profile)
      );
      return true;
    } catch (error) {
      console.warn("SUPERX Profile: Save failed.");
      return false;
    }
  }

  function getPlayerData() {
    return SX.player || {};
  }

  function getLevelData() {
    if (SX.progress && SX.progress.getLevel) {
      return SX.progress.getLevel();
    }

    return {
      level: Number(getPlayerData().level) || 1,
      currentXP: 0,
      requiredXP: 500,
      percentage: 0
    };
  }

  function getCoins() {
    return Math.max(
      0,
      Number(getPlayerData().coins) || 0
    );
  }

  function getCollection() {
    const player = getPlayerData();

    const unlocked = Array.isArray(player.unlockedCars)
      ? player.unlockedCars
      : [];

    const selected = player.selectedCar || null;

    const cars = Array.isArray(SX.CARS)
      ? SX.CARS
      : [];

    return {
      totalCars: cars.length,
      unlockedCars: unlocked.length,
      selectedCar: selected,
      cars: cars.map(function (car) {
        return {
          id: car.id,
          name: car.name,
          unlocked: unlocked.includes(car.id),
          selected: selected === car.id
        };
      })
    };
  }

  function getStatistics() {
    if (SX.progress && SX.progress.getStats) {
      return SX.progress.getStats();
    }

    return {
      totalRaces: 0,
      completedRaces: 0,
      totalDistance: 0,
      totalRewards: 0,
      bestTime: null,
      totalXP: 0
    };
  }

  function getAvailableTitles() {
    const level = getLevelData().level;

    return TITLES.map(function (title) {
      return Object.assign({}, title, {
        unlocked: level >= title.level,
        selected: profile.selectedTitle === title.name
      });
    });
  }

  function getBestTitle() {
    const level = getLevelData().level;

    let result = TITLES[0];

    TITLES.forEach(function (title) {
      if (level >= title.level) result = title;
    });

    return result;
  }

  function setName(name) {
    const cleanName = String(name || "")
      .trim()
      .replace(/\s+/g, " ");

    if (cleanName.length < 3 || cleanName.length > 20) {
      return {
        success: false,
        message: "Name must contain 3 to 20 characters."
      };
    }

    profile.name = cleanName;
    save();

    if (SX.player) {
      SX.player.name = cleanName;

      if (SX.savePlayer) {
        SX.savePlayer();
      }
    }

    document.dispatchEvent(
      new CustomEvent("superx:profileUpdated", {
        detail: getProfile()
      })
    );

    return {
      success: true,
      name: cleanName
    };
  }

  function setAvatar(avatar) {
    const value = String(avatar || "").trim();

    if (value.length > 2000) {
      return {
        success: false,
        message: "Avatar value is too large."
      };
    }

    if (
      value &&
      !/^https:\/\/|^data:image\/(png|jpeg|webp);base64,/i.test(value)
    ) {
      return {
        success: false,
        message: "Use a secure image URL or supported image."
      };
    }

    profile.avatar = value;
    save();

    document.dispatchEvent(
      new CustomEvent("superx:profileUpdated", {
        detail: getProfile()
      })
    );

    return {
      success: true,
      avatar: value
    };
  }

  function selectTitle(titleName) {
    const title = TITLES.find(function (item) {
      return item.name === titleName;
    });

    if (!title) return false;

    if (getLevelData().level < title.level) {
      return false;
    }

    profile.selectedTitle = title.name;
    save();

    document.dispatchEvent(
      new CustomEvent("superx:profileUpdated", {
        detail: getProfile()
      })
    );

    return true;
  }

  function getProfile() {
    const level = getLevelData();
    const stats = getStatistics();

    return {
      name: profile.name,
      avatar: profile.avatar,
      country: profile.country,
      joinedAt: profile.joinedAt,
      title: profile.selectedTitle || getBestTitle().name,
      level: level,
      coins: getCoins(),
      collection: getCollection(),
      statistics: stats,
      titles: getAvailableTitles()
    };
  }

  function init() {
    initialized = true;

    const player = getPlayerData();

    if (player.name && profile.name === DEFAULT_PROFILE.name) {
      profile.name = player.name;
      save();
    }

    document.dispatchEvent(
      new CustomEvent("superx:profileReady", {
        detail: getProfile()
      })
    );

    return getProfile();
  }

  function reset() {
    profile = Object.assign({}, DEFAULT_PROFILE);
    save();
    return getProfile();
  }

  function getState() {
    return {
      initialized: initialized,
      name: profile.name,
      title: profile.selectedTitle
    };
  }

  SX.profile = {
    init: init,
    getProfile: getProfile,
    getStatistics: getStatistics,
    getCollection: getCollection,
    getAvailableTitles: getAvailableTitles,
    setName: setName,
    setAvatar: setAvatar,
    selectTitle: selectTitle,
    save: save,
    reset: reset,
    getState: getState
  };

})();

/* =========================================================
   SUPERX LEGEND — FILE 28
   END
========================================================= */
    
