
/* ========================================
   SUPERX LEGEND RACING CAR
   PART 11 — SAVE GAME PROGRESS
======================================== */

(function () {
  "use strict";

  const SAVE_KEY = "superx_legend_progress_v1";

  function readSave() {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn("SUPERX save could not be read:", error);
      return null;
    }
  }

  function getGame() {
    return window.SuperX || null;
  }

  function saveProgress() {
    const game = getGame();
    if (!game) return false;

    const data = {
      coins: Number(game.coins) || 0,
      selectedCar: Number(game.selectedCar) || 0,
      unlockedCars: Array.isArray(game.unlockedCars)
        ? game.unlockedCars
        : [0, 1],
      unlockedMaps: game.unlockedMaps || {},
      savedAt: Date.now()
    };

    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.warn("SUPERX progress could not be saved:", error);
      return false;
    }
  }

  function loadProgress() {
    const game = getGame();
    const saved = readSave();

    if (!game || !saved) return;

    if (Number.isFinite(saved.coins)) {
      game.coins = Math.max(0, saved.coins);
    }

    if (Array.isArray(saved.unlockedCars)) {
      game.unlockedCars = [
        ...new Set([0, 1, ...saved.unlockedCars])
      ];
    }

    if (saved.unlockedMaps && typeof saved.unlockedMaps === "object") {
      game.unlockedMaps = saved.unlockedMaps;
    }

    if (Number.isFinite(saved.selectedCar)) {
      game.selectedCar = Math.max(0, saved.selectedCar);
    }

    if (typeof game.updateCoinsDisplay === "function") {
      game.updateCoinsDisplay();
    }
  }

  // Race rewards and other game systems can call this.
  window.updateCoins = function (amount) {
    const game = getGame();
    if (!game) return;

    const change = Number(amount);
    if (!Number.isFinite(change)) return;

    game.coins = Math.max(0, (Number(game.coins) || 0) + change);
    saveProgress();

    if (typeof game.updateCoinsDisplay === "function") {
      game.updateCoinsDisplay();
    }

    const coinElement = document.getElementById("coinValue");
    if (coinElement) {
      coinElement.textContent = game.coins.toLocaleString();
    }
  };

  // Make this function available to the race system.
  window.SuperXSaveProgress = saveProgress;

  // Install save/load helpers once the main game is ready.
  function install() {
    const game = getGame();
    if (!game) return false;

    game.saveProgress = saveProgress;
    loadProgress();
    saveProgress();
    return true;
  }

  if (!install()) {
    window.addEventListener("DOMContentLoaded", install, { once: true });
  }

  console.log("SUPERX progress system loaded.");

})();

/* ========== END OF PART 11 ========== */
