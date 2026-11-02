
/* =====================================================
   SUPERX LEGEND RACING
   FILE 07: js/storage.js
   START
===================================================== */

(function () {
  "use strict";

  const SX = window.SUPERX;

  if (!SX) {
    console.error("SUPERX config.js must load first.");
    return;
  }

  SX.storage = {};

  // SAFE LOCAL STORAGE
  SX.storage.available = function () {
    try {
      const testKey = "__superx_test__";
      localStorage.setItem(testKey, "1");
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  };

  // READ SAVED DATA
  SX.storage.read = function (key, fallback) {
    try {
      const raw = localStorage.getItem(key);

      if (raw === null) return fallback;

      return JSON.parse(raw);
    } catch (error) {
      console.warn("SUPERX storage read failed:", key);
      return fallback;
    }
  };

  // WRITE DATA
  SX.storage.write = function (key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("SUPERX storage write failed:", key, error);
      return false;
    }
  };

  // REMOVE DATA
  SX.storage.remove = function (key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  };

  // PLAYER DATA
  SX.player = SX.storage.read(
    SX.CONFIG.saveKey,
    JSON.parse(JSON.stringify(SX.DEFAULT_PLAYER))
  );

  // SETTINGS DATA
  SX.settings = Object.assign(
    {},
    SX.DEFAULT_SETTINGS,
    SX.storage.read(SX.CONFIG.settingsKey, {})
  );

  // ENSURE REQUIRED PLAYER FIELDS
  SX.player = Object.assign(
    {},
    SX.DEFAULT_PLAYER,
    SX.player
  );

  if (!Array.isArray(SX.player.unlockedCars)) {
    SX.player.unlockedCars = ["sx-car-01", "sx-car-02"];
  }

  if (!Array.isArray(SX.player.completedMaps)) {
    SX.player.completedMaps = [];
  }

  if (!SX.player.bestTimes || typeof SX.player.bestTimes !== "object") {
    SX.player.bestTimes = {};
  }

  // SAVE PLAYER
  SX.savePlayer = function () {
    return SX.storage.write(
      SX.CONFIG.saveKey,
      SX.player
    );
  };

  // SAVE SETTINGS
  SX.saveSettings = function () {
    return SX.storage.write(
      SX.CONFIG.settingsKey,
      SX.settings
    );
  };

  // UPDATE PLAYER DATA
  SX.updatePlayer = function (changes) {
    if (!changes || typeof changes !== "object") return false;

    Object.assign(SX.player, changes);

    SX.savePlayer();

    SX.events.emit("playerUpdated", SX.player);

    return true;
  };

  // ADD COINS
  SX.addCoins = function (amount) {
    amount = Math.floor(Number(amount));

    if (!Number.isFinite(amount) || amount <= 0) {
      return false;
    }

    SX.player.coins += amount;

    SX.savePlayer();

    SX.events.emit("coinsUpdated", SX.player.coins);

    return SX.player.coins;
  };

  // SPEND COINS
  SX.spendCoins = function (amount) {
    amount = Math.floor(Number(amount));

    if (!Number.isFinite(amount) || amount <= 0) {
      return false;
    }

    if (SX.player.coins < amount) {
      return false;
    }

    SX.player.coins -= amount;

    SX.savePlayer();

    SX.events.emit("coinsUpdated", SX.player.coins);

    return true;
  };

  // ADD EXPERIENCE
  SX.addXP = function (amount) {
    amount = Math.floor(Number(amount));

    if (!Number.isFinite(amount) || amount <= 0) {
      return false;
    }

    SX.player.xp += amount;

    // Level progression
    let requiredXP = SX.player.level * 500;

    while (SX.player.xp >= requiredXP) {
      SX.player.xp -= requiredXP;
      SX.player.level += 1;
      requiredXP = SX.player.level * 500;

      SX.events.emit("levelUp", SX.player.level);
    }

    SX.savePlayer();

    SX.events.emit("xpUpdated", {
      xp: SX.player.xp,
      level: SX.player.level
    });

    return true;
  };

  // COMPLETE MAP
  SX.completeMap = function (mapId, reward, time) {
    if (!mapId) return false;

    if (!SX.player.completedMaps.includes(mapId)) {
      SX.player.completedMaps.push(mapId);
    }

    if (typeof time === "number" && Number.isFinite(time)) {
      const previous = SX.player.bestTimes[mapId];

      if (previous === undefined || time < previous) {
        SX.player.bestTimes[mapId] = time;
      }
    }

    SX.addCoins(reward || 0);
    SX.addXP(100);

    SX.savePlayer();

    SX.events.emit("mapCompleted", {
      mapId: mapId,
      reward: reward || 0,
      time: time
    });

    return true;
  };

  // SELECT CAR
  SX.selectCar = function (carId) {
    if (!carId) return false;

    if (!SX.player.unlockedCars.includes(carId)) {
      return false;
    }

    SX.player.selectedCar = carId;

    SX.savePlayer();

    SX.events.emit("carSelected", carId);

    return true;
  };

  // RESET PROGRESS
  SX.resetProgress = function () {
    SX.player = JSON.parse(
      JSON.stringify(SX.DEFAULT_PLAYER)
    );

    SX.settings = Object.assign(
      {},
      SX.DEFAULT_SETTINGS
    );

    SX.savePlayer();
    SX.saveSettings();

    SX.events.emit("progressReset");
  };

  // FIRST SAVE
  SX.savePlayer();
  SX.saveSettings();

  console.log("SUPERX STORAGE READY");

})();

/* =====================================================
   FILE 07: js/storage.js
   END
===================================================== */
