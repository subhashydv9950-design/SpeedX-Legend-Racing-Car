
/* =========================================================
   SUPERX LEGEND — FILE 40 START
   FILE: js/tutorial.js
   PURPOSE: First-time player tutorial and driving guide
========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_tutorial_v1";

  const steps = [
    {
      id: "welcome",
      title: "Welcome to SUPERX LEGEND",
      description: "Your racing journey starts here. Learn the basics before hitting the road.",
      target: null,
      action: "Continue"
    },
    {
      id: "garage",
      title: "Your Garage",
      description: "Visit the Garage to select cars, unlock new vehicles and upgrade performance.",
      target: "#garageButton",
      action: "Continue"
    },
    {
      id: "career",
      title: "Career Mode",
      description: "Complete maps, earn rewards and unlock new racing challenges.",
      target: "#careerButton",
      action: "Continue"
    },
    {
      id: "freedrive",
      title: "Free Drive",
      description: "Explore the world freely. Enjoy driving without race objectives.",
      target: "#freeDriveButton",
      action: "Continue"
    },
    {
      id: "controls",
      title: "Driving Controls",
      description: "Use steering, accelerator and brake controls to drive your car.",
      target: "#controlAccelerator",
      action: "Continue"
    },
    {
      id: "camera",
      title: "Camera Views",
      description: "Change camera angles during driving to find your preferred view.",
      target: "#cameraButton",
      action: "Continue"
    },
    {
      id: "complete",
      title: "You're Ready!",
      description: "Tutorial completed. Start your engine and enjoy SUPERX LEGEND.",
      target: null,
      action: "Finish"
    }
  ];

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {
        completed: false,
        currentStep: 0,
        skipped: false
      };
    } catch (error) {
      return {
        completed: false,
        currentStep: 0,
        skipped: false
      };
    }
  }

  let state = loadState();
  let overlay = null;
  let card = null;
  let currentIndex = 0;

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("SUPERX Tutorial: Could not save progress.");
    }
  }

  function createStyles() {
    if (document.getElementById("sxTutorialStyles")) return;

    const style = document.createElement("style");
    style.id = "sxTutorialStyles";

    style.textContent = `
      .sx-tutorial-overlay {
        position: fixed;
        inset: 0;
        z-index: 99990;
        background: rgba(4, 3, 12, .82);
        backdrop-filter: blur(5px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 18px;
      }

      .sx-tutorial-card {
        width: min(440px, 100%);
        background: linear-gradient(145deg, #191329, #090811);
        border: 1px solid rgba(168, 105, 255, .55);
        border-radius: 22px;
        padding: 24px;
        color: #fff;
        box-shadow: 0 18px 65px rgba(0, 0, 0, .65);
        animation: sxTutorialIn .22s ease;
      }

      @keyframes sxTutorialIn {
        from {
          opacity: 0;
          transform: translateY(12px) scale(.97);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .sx-tutorial-brand {
        color: #bd8aff;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 2px;
        margin-bottom: 15px;
      }

      .sx-tutorial-card h2 {
        font-size: 23px;
        margin: 0 0 12px;
        line-height: 1.25;
      }

      .sx-tutorial-card p {
        color: #c5bfd4;
        font-size: 14px;
        line-height: 1.7;
        margin: 0 0 22px;
      }

      .sx-tutorial-progress {
        display: flex;
        gap: 5px;
        margin-bottom: 22px;
      }

      .sx-tutorial-progress span {
        flex: 1;
        height: 4px;
        border-radius: 10px;
        background: #393047;
      }

      .sx-tutorial-progress span.active {
        background: #a76aff;
      }

      .sx-tutorial-actions {
        display: flex;
        gap: 10px;
      }

      .sx-tutorial-actions button {
        min-height: 44px;
        border: 0;
        border-radius: 12px;
        padding: 0 17px;
        font-weight: 800;
        cursor: pointer;
      }

      .sx-tutorial-next {
        flex: 1;
        background: linear-gradient(110deg, #8b45e8, #bd76ff);
        color: #fff;
      }

      .sx-tutorial-skip {
        background: #292333;
        color: #c9c0d8;
      }

      .sx-tutorial-step {
        color: #a99bbd;
        font-size: 11px;
        margin-bottom: 10px;
      }

      @media (max-width: 420px) {
        .sx-tutorial-card {
          padding: 20px;
        }

        .sx-tutorial-card h2 {
          font-size: 21px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function close() {
    if (overlay) {
      overlay.remove();
      overlay = null;
      card = null;
    }

    document.body.style.overflow = "";
  }

  function finish(skipped) {
    state.completed = true;
    state.skipped = Boolean(skipped);
    state.currentStep = steps.length;
    saveState();
    close();

    document.dispatchEvent(new CustomEvent("sx:tutorial-completed", {
      detail: {
        skipped: Boolean(skipped)
      }
    }));

    if (SX.notifications && typeof SX.notifications.success === "function") {
      SX.notifications.success(
        skipped ? "Tutorial skipped" : "Tutorial completed",
        "You are ready to drive!"
      );
    }
  }

  function render() {
    if (!overlay) return;

    const step = steps[currentIndex];
    if (!step) {
      finish(false);
      return;
    }

    const progressHTML = steps.map((item, index) => {
      return `<span class="${index <= currentIndex ? "active" : ""}"></span>`;
    }).join("");

    card.innerHTML = `
      <div class="sx-tutorial-brand">SUPERX LEGEND</div>
      <div class="sx-tutorial-progress">${progressHTML}</div>
      <div class="sx-tutorial-step">
        STEP ${currentIndex + 1} OF ${steps.length}
      </div>
      <h2>${step.title}</h2>
      <p>${step.description}</p>
      <div class="sx-tutorial-actions">
        <button class="sx-tutorial-skip" data-tutorial-skip>
          Skip
        </button>
        <button class="sx-tutorial-next" data-tutorial-next>
          ${step.action}
        </button>
      </div>
    `;

    const nextButton = card.querySelector("[data-tutorial-next]");
    const skipButton = card.querySelector("[data-tutorial-skip]");

    nextButton.addEventListener("click", next);
    skipButton.addEventListener("click", () => finish(true));
  }

  function next() {
    if (currentIndex >= steps.length - 1) {
      finish(false);
      return;
    }

    currentIndex += 1;
    state.currentStep = currentIndex;
    saveState();
    render();
  }

  function start(options = {}) {
    if (overlay) return;

    if (state.completed && !options.force) {
      return false;
    }

    currentIndex = options.force
      ? 0
      : Math.min(state.currentStep || 0, steps.length - 1);

    createStyles();

    overlay = document.createElement("div");
    overlay.className = "sx-tutorial-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "SUPERX LEGEND tutorial");

    card = document.createElement("div");
    card.className = "sx-tutorial-card";

    overlay.appendChild(card);
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    render();

    return true;
  }

  function reset() {
    state = {
      completed: false,
      currentStep: 0,
      skipped: false
    };

    saveState();
  }

  function getState() {
    return {
      completed: state.completed,
      skipped: state.skipped,
      currentStep: currentIndex,
      totalSteps: steps.length,
      steps: steps.map(step => ({
        id: step.id,
        title: step.title
      }))
    };
  }

  SX.tutorial = {
    start,
    next,
    close,
    finish,
    reset,
    getState,
    getSteps: () => steps.map(step => ({ ...step })),
    isCompleted: () => state.completed
  };

  document.addEventListener("keydown", event => {
    if (!overlay) return;

    if (event.key === "Escape") {
      close();
    }

    if (event.key === "Enter") {
      next();
    }
  });

})();

/* =========================================================
   SUPERX LEGEND — FILE 40 END
   FILE: js/tutorial.js
========================================================= */
