
/* =====================================================
   SUPERX LEGEND RACING
   FILE 08: js/navigation.js
   START
===================================================== */

(function () {
  "use strict";

  const SX = window.SUPERX;

  if (!SX) {
    console.error("SUPERX config.js must load first.");
    return;
  }

  SX.navigation = {};

  const $ = function (selector) {
    return document.querySelector(selector);
  };

  const menuButton = $("#menuOpenBtn");
  const menuCloseButton = $("#menuCloseBtn");
  const menuBackdrop = $("#menuBackdrop");
  const sideMenu = $("#sideMenu");

  // OPEN SIDE MENU
  SX.navigation.openMenu = function () {
    if (!sideMenu || !menuBackdrop) return;

    sideMenu.classList.add("active");
    menuBackdrop.classList.add("active");

    sideMenu.setAttribute("aria-hidden", "false");

    if (menuButton) {
      menuButton.setAttribute("aria-expanded", "true");
    }

    document.body.classList.add("menu-open");

    SX.events.emit("menuOpened");
  };

  // CLOSE SIDE MENU
  SX.navigation.closeMenu = function () {
    if (!sideMenu || !menuBackdrop) return;

    sideMenu.classList.remove("active");
    menuBackdrop.classList.remove("active");

    sideMenu.setAttribute("aria-hidden", "true");

    if (menuButton) {
      menuButton.setAttribute("aria-expanded", "false");
    }

    document.body.classList.remove("menu-open");

    SX.events.emit("menuClosed");
  };

  // TOGGLE SIDE MENU
  SX.navigation.toggleMenu = function () {
    if (!sideMenu) return;

    if (sideMenu.classList.contains("active")) {
      SX.navigation.closeMenu();
    } else {
      SX.navigation.openMenu();
    }
  };

  // OPEN PAGE
  SX.navigation.goTo = function (pageName) {
    const destination = SX.PAGES[pageName];

    if (!destination) {
      console.warn("SUPERX page not found:", pageName);
      return false;
    }

    window.location.href = destination;

    return true;
  };

  // ACTIVE PAGE LINK
  SX.navigation.setActiveLink = function () {
    const currentPage = SX.utils.getPageName();

    document.querySelectorAll("[data-page]").forEach(function (link) {
      const pageName = link.getAttribute("data-page");
      const destination = SX.PAGES[pageName];

      const isActive = destination === currentPage;

      link.classList.toggle("active", isActive);

      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  // MENU BUTTON
  if (menuButton) {
    menuButton.addEventListener("click", function () {
      SX.navigation.toggleMenu();
    });
  }

  // CLOSE BUTTON
  if (menuCloseButton) {
    menuCloseButton.addEventListener("click", function () {
      SX.navigation.closeMenu();
    });
  }

  // BACKDROP CLICK
  if (menuBackdrop) {
    menuBackdrop.addEventListener("click", function () {
      SX.navigation.closeMenu();
    });
  }

  // MENU LINKS
  document.querySelectorAll("[data-page]").forEach(function (link) {
    link.addEventListener("click", function (event) {
      const pageName = link.getAttribute("data-page");

      if (!SX.PAGES[pageName]) return;

      event.preventDefault();

      SX.navigation.closeMenu();
      SX.navigation.goTo(pageName);
    });
  });

  // CLOSE MENU WITH ESCAPE
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      SX.navigation.closeMenu();
    }
  });

  // CLOSE MENU WHEN CLICKING OUTSIDE ON MOBILE
  window.addEventListener("resize", function () {
    if (window.innerWidth > 900) {
      SX.navigation.closeMenu();
    }
  });

  // INITIALIZE ACTIVE LINK
  SX.navigation.setActiveLink();

  console.log("SUPERX NAVIGATION READY");

})();

/* =====================================================
   FILE 08: js/navigation.js
   END
===================================================== */
