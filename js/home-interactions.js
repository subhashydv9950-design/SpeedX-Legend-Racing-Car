
/* =========================================================
   SUPERX LEGEND — HOME INTERACTIONS
   File: js/home-interactions.js
   Purpose: Home buttons, test drive, dialogs & interactions
========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX;

  if (!SX) {
    console.error("SUPERX core not found.");
    return;
  }

  const HomeInteractions = {
    initialized: false,

    /* ---------- ELEMENT HELPERS ---------- */

    get(id) {
      return document.getElementById(id);
    },

    toast(message) {
      if (SX.ui && typeof SX.ui.toast === "function") {
        SX.ui.toast(message);
        return;
      }

      const toast = this.get("toastMessage");

      if (toast) {
        toast.textContent = message;
        toast.classList.add("show");

        window.clearTimeout(this.toastTimer);

        this.toastTimer = window.setTimeout(() => {
          toast.classList.remove("show");
        }, 2600);
      }
    },

    /* ---------- PAGE NAVIGATION ---------- */

    navigate(page) {
      if (
        SX.navigation &&
        typeof SX.navigation.goTo === "function"
      ) {
        SX.navigation.goTo(page);
        return;
      }

      const pages = SX.PAGES || {};
      const target = pages[page];

      if (target) {
        window.location.href = target;
      } else {
        this.toast("This section is not available yet.");
      }
    },

    /* ---------- TEST DRIVE ---------- */

    startTestDrive() {
      this.toast("Preparing your test drive...");
      this.navigate("race");
    },

    /* ---------- HOME ACTION BUTTONS ---------- */

    initializeHomeActions() {
      const buttons = document.querySelectorAll(
        "[data-home-action]"
      );

      buttons.forEach((button) => {
        if (button.dataset.homeInteractionReady) return;

        button.dataset.homeInteractionReady = "true";

        button.addEventListener("click", () => {
          const action = button.dataset.homeAction;

          const allowedPages = [
            "garage",
            "career",
            "maps",
            "freeDrive",
            "race",
            "online",
            "profile",
            "settings",
            "about"
          ];

          if (!allowedPages.includes(action)) {
            this.toast("This option is not available yet.");
            return;
          }

          this.navigate(action);
        });
      });
    },

    /* ---------- DIALOG CONTROLS ---------- */

    openDialog(dialog) {
      if (!dialog) return;

      if (typeof dialog.showModal === "function") {
        if (!dialog.open) dialog.showModal();
      } else {
        dialog.classList.add("active");
        dialog.setAttribute("aria-hidden", "false");
      }
    },

    closeDialog(dialog) {
      if (!dialog) return;

      if (
        typeof dialog.close === "function" &&
        dialog.open
      ) {
        dialog.close();
      } else {
        dialog.classList.remove("active");
        dialog.setAttribute("aria-hidden", "true");
      }
    },

    initializeDialogs() {
      document.querySelectorAll("[data-dialog-open]").forEach(
        (button) => {
          if (button.dataset.dialogReady) return;
          button.dataset.dialogReady = "true";

          button.addEventListener("click", () => {
            const id = button.dataset.dialogOpen;
            this.openDialog(this.get(id));
          });
        }
      );

      document.querySelectorAll("[data-dialog-close]").forEach(
        (button) => {
          if (button.dataset.dialogReady) return;
          button.dataset.dialogReady = "true";

          button.addEventListener("click", () => {
            const dialog = button.closest("dialog") ||
              button.closest(".dialog");

            this.closeDialog(dialog);
          });
        }
      );

      document.querySelectorAll("dialog").forEach((dialog) => {
        if (dialog.dataset.backdropReady) return;
        dialog.dataset.backdropReady = "true";

        dialog.addEventListener("click", (event) => {
          if (event.target === dialog) {
            this.closeDialog(dialog);
          }
        });
      });
    },

    /* ---------- KEYBOARD CONTROLS ---------- */

    initializeKeyboard() {
      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;

        document.querySelectorAll("dialog[open]").forEach(
          (dialog) => this.closeDialog(dialog)
        );

        const menu = this.get("sideMenu");
        const backdrop = this.get("menuBackdrop");

        if (menu && menu.classList.contains("active")) {
          const closeButton = this.get("menuCloseBtn");

          if (closeButton) closeButton.click();
        }

        if (backdrop && backdrop.classList.contains("active")) {
          backdrop.click();
        }
      });
    },

    /* ---------- TEST DRIVE BUTTON ---------- */

    initializeTestDrive() {
      const button = this.get("homeTestDriveBtn");

      if (!button || button.dataset.testDriveReady) return;

      button.dataset.testDriveReady = "true";

      button.addEventListener("click", () => {
        this.startTestDrive();
      });
    },

    /* ---------- INITIALIZE ---------- */

    initialize() {
      if (this.initialized) return;

      this.initialized = true;

      this.initializeHomeActions();
      this.initializeDialogs();
      this.initializeKeyboard();
      this.initializeTestDrive();

      console.log("SUPERX Home Interactions initialized.");
    }
  };

  SX.homeInteractions = HomeInteractions;

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => HomeInteractions.initialize(),
      { once: true }
    );
  } else {
    HomeInteractions.initialize();
  }

})();
