
/* =========================================================
   SUPERX LEGEND — FILE 102
   FILE: js/vehicle-race-results-ui.js

   MODULE: RACE RESULTS USER INTERFACE
   DEPENDENCY:
   - vehicle-race-results.js
   - vehicle-race-rewards.js

   START: RACE RESULTS UI
   ========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STYLE_ID = "sx-race-results-ui-style";

  const ROOT_SELECTOR = "#raceResultsPage";

  let root = null;
  let initialized = false;
  let latestResult = null;

  /* ---------------------------------------------------------
     1. HELPERS
     --------------------------------------------------------- */

  function escapeHTML(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatTime(milliseconds) {
    const time = Math.max(
      0,
      Number(milliseconds) || 0
    );

    const minutes = Math.floor(time / 60000);

    const seconds = Math.floor(
      (time % 60000) / 1000
    );

    const centiseconds = Math.floor(
      (time % 1000) / 10
    );

    return (
      String(minutes).padStart(2, "0") +
      ":" +
      String(seconds).padStart(2, "0") +
      "." +
      String(centiseconds).padStart(2, "0")
    );
  }

  function formatDate(timestamp) {
    const date = new Date(
      Number(timestamp) || Date.now()
    );

    return date.toLocaleString();
  }

  function formatNumber(value) {
    return Math.max(
      0,
      Math.floor(Number(value) || 0)
    ).toLocaleString();
  }

  function getPositionLabel(position) {
    const labels = {
      1: "1ST",
      2: "2ND",
      3: "3RD"
    };

    return labels[position] || (
      String(position) + "TH"
    );
  }

  function getRoot(target) {
    if (target instanceof HTMLElement) {
      return target;
    }

    if (typeof target === "string") {
      return document.querySelector(target);
    }

    return document.querySelector(ROOT_SELECTOR);
  }

  /* ---------------------------------------------------------
     2. ISOLATED CSS
     --------------------------------------------------------- */

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");

    style.id = STYLE_ID;

    style.textContent = `
      #raceResultsPage,
      #raceResultsPage * {
        box-sizing: border-box;
      }

      #raceResultsPage {
        width: 100%;
        min-width: 0;
        padding: clamp(12px, 3vw, 24px);
        color: #f5f3ff;
        background: #101018;
        border-radius: 18px;
        overflow: hidden;
      }

      #raceResultsPage .sxrr-layout {
        width: 100%;
        max-width: 1100px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 18px;
      }

      #raceResultsPage .sxrr-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
        min-width: 0;
      }

      #raceResultsPage .sxrr-heading {
        min-width: 0;
      }

      #raceResultsPage .sxrr-heading h2 {
        margin: 0;
        font-size: clamp(21px, 4vw, 30px);
        font-weight: 900;
        letter-spacing: 1px;
        overflow-wrap: anywhere;
      }

      #raceResultsPage .sxrr-subtitle {
        margin: 6px 0 0;
        color: #a7a2b8;
        font-size: 13px;
      }

      #raceResultsPage .sxrr-card {
        min-width: 0;
        padding: clamp(13px, 2.5vw, 20px);
        border: 1px solid #343044;
        border-radius: 16px;
        background: #191724;
      }

      #raceResultsPage .sxrr-hero {
        display: grid;
        grid-template-columns:
          minmax(0, 1fr)
          minmax(100px, 150px);
        align-items: center;
        gap: 18px;
        background:
          linear-gradient(135deg, #29203f, #191724 70%);
      }

      #raceResultsPage .sxrr-position {
        min-width: 0;
      }

      #raceResultsPage .sxrr-position-label {
        color: #b9a4ff;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 2px;
      }

      #raceResultsPage .sxrr-position-value {
        margin-top: 5px;
        font-size: clamp(36px, 8vw, 58px);
        font-weight: 950;
        line-height: 1.1;
        overflow-wrap: anywhere;
      }

      #raceResultsPage .sxrr-result-status {
        margin-top: 8px;
        color: #c8c2d7;
        font-size: 13px;
      }

      #raceResultsPage .sxrr-trophy {
        display: grid;
        place-items: center;
        min-height: 112px;
        border-radius: 14px;
        background: #30234a;
        color: #d4b7ff;
        font-size: 42px;
      }

      #raceResultsPage .sxrr-stats {
        display: grid;
        grid-template-columns:
          repeat(4, minmax(0, 1fr));
        gap: 10px;
      }

      #raceResultsPage .sxrr-stat {
        min-width: 0;
        padding: 13px 10px;
        border: 1px solid #343044;
        border-radius: 12px;
        background: #191724;
      }

      #raceResultsPage .sxrr-stat-label {
        color: #a7a2b8;
        font-size: 11px;
        line-height: 1.4;
      }

      #raceResultsPage .sxrr-stat-value {
        margin-top: 7px;
        font-size: clamp(15px, 2.5vw, 21px);
        font-weight: 850;
        overflow-wrap: anywhere;
      }

      #raceResultsPage .sxrr-section-title {
        margin: 0 0 14px;
        font-size: 17px;
        font-weight: 850;
      }

      #raceResultsPage .sxrr-table-wrap {
        width: 100%;
        overflow-x: auto;
        border-radius: 10px;
      }

      #raceResultsPage .sxrr-table {
        width: 100%;
        min-width: 440px;
        border-collapse: collapse;
        text-align: left;
      }

      #raceResultsPage .sxrr-table th,
      #raceResultsPage .sxrr-table td {
        padding: 12px 10px;
        border-bottom: 1px solid #343044;
        font-size: 13px;
      }

      #raceResultsPage .sxrr-table th {
        color: #aaa3bd;
        font-weight: 750;
        background: #211e2d;
      }

      #raceResultsPage .sxrr-table td {
        color: #eeeaf8;
      }

      #raceResultsPage .sxrr-player-row {
        background: #30234a;
      }

      #raceResultsPage .sxrr-finish {
        color: #8ce6ae;
        font-weight: 800;
      }

      #raceResultsPage .sxrr-reward-grid {
        display: grid;
        grid-template-columns:
          repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      #raceResultsPage .sxrr-reward-item {
        min-width: 0;
        padding: 14px;
        border: 1px solid #403653;
        border-radius: 12px;
        background: #211d2e;
      }

      #raceResultsPage .sxrr-reward-label {
        color: #aaa3bd;
        font-size: 12px;
      }

      #raceResultsPage .sxrr-reward-value {
        margin-top: 6px;
        font-size: 23px;
        font-weight: 900;
        overflow-wrap: anywhere;
      }

      #raceResultsPage .sxrr-button-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 16px;
      }

      #raceResultsPage .sxrr-button {
        min-height: 44px;
        min-width: 120px;
        padding: 11px 16px;
        border: 1px solid #51436c;
        border-radius: 10px;
        background: #292337;
        color: #ffffff;
        font-size: 13px;
        font-weight: 800;
        cursor: pointer;
        transition:
          background 0.2s ease,
          transform 0.2s ease;
      }

      #raceResultsPage .sxrr-button-primary {
        border-color: #8155d8;
        background: #7042c4;
      }

      #raceResultsPage .sxrr-button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }

      #raceResultsPage .sxrr-button:focus-visible {
        outline: 3px solid #c4a5ff;
        outline-offset: 3px;
      }

      #raceResultsPage .sxrr-history-list {
        display: grid;
        gap: 10px;
      }

      #raceResultsPage .sxrr-history-item {
        display: grid;
        grid-template-columns:
          minmax(0, 1fr)
          auto;
        align-items: center;
        gap: 12px;
        padding: 13px;
        border: 1px solid #343044;
        border-radius: 12px;
        background: #191724;
      }

      #raceResultsPage .sxrr-history-name {
        font-size: 14px;
        font-weight: 800;
        overflow-wrap: anywhere;
      }

      #raceResultsPage .sxrr-history-meta {
        margin-top: 5px;
        color: #aaa3bd;
        font-size: 11px;
        line-height: 1.5;
      }

      #raceResultsPage .sxrr-history-position {
        color: #c7a5ff;
        font-size: 17px;
        font-weight: 900;
        text-align: right;
      }

      #raceResultsPage .sxrr-empty {
        padding: 28px 16px;
        border: 1px dashed #51476a;
        border-radius: 14px;
        color: #aaa3bd;
        text-align: center;
        line-height: 1.6;
      }

      #raceResultsPage .sxrr-message {
        min-height: 20px;
        color: #cbb6ff;
        font-size: 12px;
        line-height: 1.5;
      }

      @media (max-width: 650px) {
        #raceResultsPage .sxrr-hero {
          grid-template-columns: minmax(0, 1fr);
        }

        #raceResultsPage .sxrr-trophy {
          min-height: 75px;
          font-size: 32px;
        }

        #raceResultsPage .sxrr-stats {
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
        }

        #raceResultsPage .sxrr-button-row {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
        }

        #raceResultsPage .sxrr-button {
          width: 100%;
          min-width: 0;
        }
      }

      @media (max-width: 360px) {
        #raceResultsPage .sxrr-reward-grid {
          grid-template-columns:
            minmax(0, 1fr);
        }

        #raceResultsPage .sxrr-history-item {
          grid-template-columns:
            minmax(0, 1fr);
        }

        #raceResultsPage .sxrr-history-position {
          text-align: left;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #raceResultsPage .sxrr-button {
          transition: none;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* ---------------------------------------------------------
     3. EMPTY SCREEN
     --------------------------------------------------------- */

  function renderEmpty() {
    if (!root) return;

    root.innerHTML = `
      <div class="sxrr-layout">
        <header class="sxrr-header">
          <div class="sxrr-heading">
            <h2>RACE RESULTS</h2>
            <p class="sxrr-subtitle">
              Your race performance and history
            </p>
          </div>
        </header>

        <div class="sxrr-empty">
          <div style="font-size:34px;margin-bottom:10px">
            🏁
          </div>
          <strong>No Race Results Yet</strong>
          <div>
            Complete your first race to see your results here.
          </div>
        </div>
      </div>
    `;
  }

  /* ---------------------------------------------------------
     4. RACER TABLE
     --------------------------------------------------------- */

  function renderRacers(racers) {
    const list = Array.isArray(racers)
      ? racers
      : [];

    if (!list.length) {
      return `
        <div class="sxrr-empty">
          Racer classification is not available.
        </div>
      `;
    }

    const rows = list.map(function (racer) {
      const isPlayer = racer.isPlayer === true;

      return `
        <tr class="${isPlayer ? "sxrr-player-row" : ""}">
          <td>${escapeHTML(racer.position)}</td>
          <td>${escapeHTML(racer.name)}</td>
          <td>
            ${racer.finished
              ? '<span class="sxrr-finish">Finished</span>'
              : "Not Finished"}
          </td>
          <td>${formatTime(racer.totalTime)}</td>
        </tr>
      `;
    }).join("");

    return `
      <div class="sxrr-table-wrap">
        <table class="sxrr-table">
          <thead>
            <tr>
              <th>Position</th>
              <th>Racer</th>
              <th>Status</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  /* ---------------------------------------------------------
     5. REWARD SECTION
     --------------------------------------------------------- */

  function renderReward(result) {
    const reward = result.reward || {};

    const coins = Number(reward.totalCoins) || 0;
    const xp = Number(reward.totalXP) || 0;

    const alreadyClaimed = result.rewardClaimed === true;

    return `
      <section class="sxrr-card">
        <h3 class="sxrr-section-title">
          RACE REWARDS
        </h3>

        <div class="sxrr-reward-grid">
          <div class="sxrr-reward-item">
            <div class="sxrr-reward-label">
              Coins Earned
            </div>
            <div class="sxrr-reward-value">
              🪙 ${formatNumber(coins)}
            </div>
          </div>

          <div class="sxrr-reward-item">
            <div class="sxrr-reward-label">
              XP Earned
            </div>
            <div class="sxrr-reward-value">
              ⭐ ${formatNumber(xp)}
            </div>
          </div>
        </div>

        <div class="sxrr-button-row">
          <button
            type="button"
            class="sxrr-button sxrr-button-primary"
            data-sxrr-action="claim"
            data-race-id="${escapeHTML(result.raceId)}"
            ${alreadyClaimed ? "disabled" : ""}
          >
            ${alreadyClaimed
              ? "REWARD CLAIMED"
              : "CLAIM REWARD"}
          </button>
        </div>

        <div
          class="sxrr-message"
          data-sxrr-message
          aria-live="polite"
        >
          ${alreadyClaimed
            ? "Your race reward has already been collected."
            : "Claim your coins and XP reward."}
        </div>
      </section>
    `;
  }

  /* ---------------------------------------------------------
     6. HISTORY SECTION
     --------------------------------------------------------- */

  function renderHistory() {
    if (!SX.vehicleRaceResults) {
      return "";
    }

    const history = SX.vehicleRaceResults.getAll();

    if (!history.length) {
      return "";
    }

    const items = history.slice(0, 10).map(
      function (item) {
        return `
          <div class="sxrr-history-item">
            <div>
              <div class="sxrr-history-name">
                ${escapeHTML(item.mapName)}
              </div>

              <div class="sxrr-history-meta">
                ${escapeHTML(item.mode)}
                · ${escapeHTML(formatDate(item.finishedAt))}
                <br>
                Best Lap:
                ${formatTime(item.bestLapTime)}
              </div>
            </div>

            <div class="sxrr-history-position">
              ${item.playerPosition > 0
                ? escapeHTML(getPositionLabel(item.playerPosition))
                : "DNF"}
            </div>
          </div>
        `;
      }
    ).join("");

    return `
      <section class="sxrr-card">
        <h3 class="sxrr-section-title">
          RECENT RACE HISTORY
        </h3>

        <div class="sxrr-history-list">
          ${items}
        </div>
      </section>
    `;
  }

  /* ---------------------------------------------------------
     7. MAIN RESULT RENDER
     --------------------------------------------------------- */

  function render(result) {
    if (!root) return false;

    const selected = result ||
      (SX.vehicleRaceResults &&
       SX.vehicleRaceResults.getLatest());

    if (!selected) {
      renderEmpty();
      return true;
    }

    latestResult = selected;

    const position = Number(
      selected.playerPosition
    ) || 0;

    const positionText = position > 0
      ? getPositionLabel(position)
      : "DNF";

    const status = selected.finished
      ? "Race completed successfully."
      : "Race ended before completion.";

    const stats = `
      <div class="sxrr-stats">
        <div class="sxrr-stat">
          <div class="sxrr-stat-label">
            Total Time
          </div>
          <div class="sxrr-stat-value">
            ${formatTime(selected.totalTime)}
          </div>
        </div>

        <div class="sxrr-stat">
          <div class="sxrr-stat-label">
            Best Lap
          </div>
          <div class="sxrr-stat-value">
            ${formatTime(selected.bestLapTime)}
          </div>
        </div>

        <div class="sxrr-stat">
          <div class="sxrr-stat-label">
            Completed Laps
          </div>
          <div class="sxrr-stat-value">
            ${formatNumber(selected.completedLaps)}
            / ${formatNumber(selected.totalLaps)}
          </div>
        </div>

        <div class="sxrr-stat">
          <div class="sxrr-stat-label">
            Penalties
          </div>
          <div class="sxrr-stat-value">
            ${formatTime(selected.penalties * 1000)}
          </div>
        </div>
      </div>
    `;

    root.innerHTML = `
      <div class="sxrr-layout">

        <header class="sxrr-header">
          <div class="sxrr-heading">
            <h2>RACE RESULTS</h2>
            <p class="sxrr-subtitle">
              ${escapeHTML(selected.mapName)}
            </p>
          </div>
        </header>

        <section class="sxrr-card sxrr-hero">
          <div class="sxrr-position">
            <div class="sxrr-position-label">
              YOUR POSITION
            </div>

            <div class="sxrr-position-value">
              ${escapeHTML(positionText)}
            </div>

            <div class="sxrr-result-status">
              ${escapeHTML(status)}
            </div>
          </div>

          <div class="sxrr-trophy" aria-hidden="true">
            🏆
          </div>
        </section>

        ${stats}

        <section class="sxrr-card">
          <h3 class="sxrr-section-title">
            RACE CLASSIFICATION
          </h3>

          ${renderRacers(selected.racers)}
        </section>

        ${selected.finished && position > 0
          ? renderReward(selected)
          : ""}

        <section class="sxrr-card">
          <h3 class="sxrr-section-title">
            RACE INFORMATION
          </h3>

          <div class="sxrr-history-meta">
            Race ID:
            ${escapeHTML(selected.raceId)}
            <br>
            Mode:
            ${escapeHTML(selected.mode)}
            <br>
            Track:
            ${escapeHTML(selected.mapName)}
            <br>
            Car:
            ${escapeHTML(selected.carId)}
            <br>
            Date:
            ${escapeHTML(formatDate(selected.finishedAt))}
          </div>
        </section>

        ${renderHistory()}

      </div>
    `;

    return true;
  }

  /* ---------------------------------------------------------
     8. BUTTON ACTIONS
     --------------------------------------------------------- */

  function handleClick(event) {
    const button = event.target.closest(
      "[data-sxrr-action]"
    );

    if (!button || !root.contains(button)) {
      return;
    }

    const action = button.dataset.sxrrAction;

    if (action === "claim") {
      claimReward(button);
    }
  }
function claimReward(button) {
    if (!SX.vehicleRaceResults) {
      showMessage("Results system is unavailable.");
      return;
    }

    const raceId = button.dataset.raceId;

    const result = SX.vehicleRaceResults.getResult(
      raceId
    );

    if (!result) {
      showMessage("Race result could not be found.");
      return;
    }

    button.disabled = true;
    button.textContent = "PROCESSING...";

    const response =
      SX.vehicleRaceResults.claimReward(
        raceId,
        {
          cleanRace: Number(result.penalties) === 0,
          perfectLap: false
        }
      );

    if (response.success) {
      showMessage("Race rewards successfully collected.");

      render(
        SX.vehicleRaceResults.getResult(raceId)
      );

    } else {
      button.disabled = false;
      button.textContent = "CLAIM REWARD";

      showMessage(
        response.message || "Reward claim failed."
      );
    }
  }

  function showMessage(message) {
    if (!root) return;

    const element = root.querySelector(
      "[data-sxrr-message]"
    );

    if (element) {
      element.textContent = String(message);
    }
  }

  /* ---------------------------------------------------------
     9. RESULT EVENTS
     --------------------------------------------------------- */

  function onResultCreated(event) {
    if (!root) return;

    const detail = event.detail || {};

    if (detail.result) {
      render(detail.result);
    }
  }

  function onRewardClaimed() {
    if (!root || !latestResult) return;

    const updated =
      SX.vehicleRaceResults.getResult(
        latestResult.raceId
      );

    if (updated) {
      render(updated);
    }
  }

  /* ---------------------------------------------------------
     10. INITIALIZATION
     --------------------------------------------------------- */

  function init(target) {
    if (initialized) {
      destroy();
    }

    root = getRoot(target);

    if (!root) {
      console.warn(
        "[SUPERX Results UI] Root element not found.",
        ROOT_SELECTOR
      );

      return false;
    }

    injectStyles();

    root.addEventListener(
      "click",
      handleClick
    );

    window.addEventListener(
      "sx:race-result-created",
      onResultCreated
    );

    window.addEventListener(
      "sx:race-result-rewarded",
      onRewardClaimed
    );

    initialized = true;

    render();

    return true;
  }

  /* ---------------------------------------------------------
     11. DESTROY
     --------------------------------------------------------- */

  function destroy() {
    if (root) {
      root.removeEventListener(
        "click",
        handleClick
      );
    }

    window.removeEventListener(
      "sx:race-result-created",
      onResultCreated
    );

    window.removeEventListener(
      "sx:race-result-rewarded",
      onRewardClaimed
    );

    root = null;
    latestResult = null;
    initialized = false;

    return true;
  }

  /* ---------------------------------------------------------
     12. PUBLIC API
     --------------------------------------------------------- */

  SX.vehicleRaceResultsUI = {
    init,
    render,
    destroy,
    isInitialized: function () {
      return initialized;
    }
  };

})();

/* =========================================================
   END: RACE RESULTS UI — FILE 102
   ========================================================= */

  
    
