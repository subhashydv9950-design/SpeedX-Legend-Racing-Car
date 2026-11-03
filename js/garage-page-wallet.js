
/* =====================================================
   SUPERX LEGEND RACING
   FILE 146: js/garage-page-wallet.js
   PURPOSE: Garage coin wallet display and live updates
   START
===================================================== */

(function (window, document) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const GaragePageWallet = {
    initialized: false,
    element: null,

    init() {
      this.element = document.getElementById("garageCoinCount");

      if (!this.element) {
        console.warn(
          "SUPERX Wallet: garageCoinCount element not found."
        );
        return false;
      }

      this.refresh();

      if (
        SX.events &&
        typeof SX.events.on === "function"
      ) {
        SX.events.on("coinsUpdated", this.handleCoinsUpdated);
        SX.events.on("playerUpdated", this.handlePlayerUpdated);
        SX.events.on("progressReset", this.handleProgressReset);
      }

      this.initialized = true;
      return true;
    },

    getBalance() {
      const player = SX.player || {};
      const balance = Number(player.coins);

      return Number.isFinite(balance) && balance >= 0
        ? Math.floor(balance)
        : 0;
    },

    format(value) {
      return Math.floor(Number(value) || 0)
        .toLocaleString("en-IN");
    },

    refresh() {
      if (!this.element) {
        this.element = document.getElementById("garageCoinCount");
      }

      if (!this.element) return false;

      const balance = this.getBalance();

      this.element.textContent = this.format(balance);
      this.element.setAttribute(
        "aria-label",
        "Available coins: " + balance
      );

      return true;
    },

    handleCoinsUpdated() {
      GaragePageWallet.refresh();
    },

    handlePlayerUpdated() {
      GaragePageWallet.refresh();
    },

    handleProgressReset() {
      GaragePageWallet.refresh();
    },

    destroy() {
      if (SX.events && typeof SX.events.off === "function") {
        SX.events.off("coinsUpdated", this.handleCoinsUpdated);
        SX.events.off("playerUpdated", this.handlePlayerUpdated);
        SX.events.off("progressReset", this.handleProgressReset);
      }

      this.initialized = false;
      this.element = null;
    }
  };

  SX.garagePageWallet = GaragePageWallet;

  function startWallet() {
    GaragePageWallet.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      startWallet,
      { once: true }
    );
  } else {
    startWallet();
  }

})(window, document);

/* =====================================================
   FILE 146: js/garage-page-wallet.js
   END
===================================================== */
