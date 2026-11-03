
/* START FILE 144: js/garage-page-tabs.js */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const GaragePageTabs = {
    initialized: false,
    root: null,
    tabs: [],
    cards: [],
    activeCategory: "performance",

    init(options = {}) {
      const root = options.root || document;

      if (!root || typeof root.querySelectorAll !== "function") {
        return false;
      }

      this.destroy();

      this.root = root;
      this.tabs = Array.from(
        root.querySelectorAll("[data-garage-tab]")
      );

      this.cards = Array.from(
        root.querySelectorAll("[data-category]")
      );

      if (!this.tabs.length || !this.cards.length) {
        return false;
      }

      this.tabs.forEach((tab) => {
        tab.addEventListener("click", this.handleTabClick);
      });

      this.initialized = true;
      this.showCategory(this.activeCategory);

      return true;
    },

    handleTabClick: (event) => {
      const tab = event.currentTarget;
      const category = tab.dataset.garageTab;

      if (!category) return;

      GaragePageTabs.showCategory(category);
    },

    showCategory(category) {
      if (!this.initialized || !category) return false;

      const matchingCards = this.cards.filter(
        (card) => card.dataset.category === category
      );

      if (!matchingCards.length) return false;

      this.activeCategory = category;

      this.tabs.forEach((tab) => {
        const selected = tab.dataset.garageTab === category;

        tab.setAttribute(
          "aria-selected",
          selected ? "true" : "false"
        );

        tab.setAttribute(
          "tabindex",
          selected ? "0" : "-1"
        );
      });

      this.cards.forEach((card) => {
        const visible = card.dataset.category === category;

        card.hidden = !visible;
        card.setAttribute(
          "aria-hidden",
          visible ? "false" : "true"
        );
      });

      return true;
    },

    getActiveCategory() {
      return this.activeCategory;
    },

    destroy() {
      if (this.tabs.length) {
        this.tabs.forEach((tab) => {
          tab.removeEventListener("click", this.handleTabClick);
        });
      }

      this.tabs = [];
      this.cards = [];
      this.root = null;
      this.initialized = false;
    }
  };

  SX.garagePageTabs = GaragePageTabs;

  document.addEventListener("DOMContentLoaded", () => {
    const garageRoot = document.querySelector(".garage-page");

    if (!garageRoot) return;

    GaragePageTabs.init({
      root: garageRoot
    });
  });

})(window);

/* END FILE 144: js/garage-page-tabs.js */
