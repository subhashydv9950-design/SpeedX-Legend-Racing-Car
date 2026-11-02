
/* =========================================================
   SUPERX LEGEND — FILE 37
   FILE: js/leaderboard.js
   START
========================================================= */

(() => {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_leaderboard_v1";
  const MAX_RECORDS = 100;

  let records = [];
  let initialized = false;

  function createId() {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }

    return `SX-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}`;
  }

  function cleanName(value) {
    return String(value || "SUPERX PLAYER")
      .trim()
      .slice(0, 24) || "SUPERX PLAYER";
  }

  function getPlayerId() {
    if (!SX.player.leaderboardId) {
      SX.player.leaderboardId = createId();
      SX.savePlayer?.();
    }

    return SX.player.leaderboardId;
  }

  function getPlayerName() {
    return cleanName(
      SX.player?.name ||
      SX.player?.displayName ||
      "SUPERX PLAYER"
    );
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(records.slice(0, MAX_RECORDS))
      );

      return true;
    } catch (error) {
      console.warn("SUPERX leaderboard save failed:", error);
      return false;
    }
  }

  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) return;

      const parsed = JSON.parse(saved);

      if (!Array.isArray(parsed)) return;

      records = parsed
        .filter(item =>
          item &&
          typeof item.id === "string" &&
          typeof item.playerId === "string"
        )
        .slice(0, MAX_RECORDS);
    } catch (error) {
      console.warn("SUPERX leaderboard load failed:", error);
      records = [];
    }
  }

  function getScoreData() {
    const progressStats = SX.progress?.getStats?.() || {};
    const profileStats = SX.profile?.getStatistics?.() || {};

    return {
      level: Math.max(
        1,
        Number(SX.player?.level) || 1
      ),

      races: Math.max(
        0,
        Number(progressStats.racesCompleted) || 0
      ),

      wins: Math.max(
        0,
        Number(progressStats.wins) || 0
      ),

      distance: Math.max(
        0,
        Number(progressStats.totalDistance) || 0
      ),

      maps: Math.max(
        0,
        Number(progressStats.mapsCompleted) || 0
      ),

      coins: Math.max(
        0,
        Number(SX.player?.coins) || 0
      ),

      bestTime: Math.max(
        0,
        Number(profileStats.bestTime) || 0
      )
    };
  }

  function calculateScore(data) {
    return Math.floor(
      data.level * 100 +
      data.wins * 500 +
      data.races * 50 +
      data.maps * 100 +
      data.distance * 10
    );
  }

  function createPlayerRecord() {
    const data = getScoreData();

    return {
      id: createId(),
      playerId: getPlayerId(),
      name: getPlayerName(),
      score: calculateScore(data),
      level: data.level,
      wins: data.wins,
      races: data.races,
      distance: data.distance,
      maps: data.maps,
      bestTime: data.bestTime,
      updatedAt: new Date().toISOString()
    };
  }

  function updatePlayerRecord() {
    const newRecord = createPlayerRecord();

    const existingIndex = records.findIndex(
      item => item.playerId === newRecord.playerId
    );

    if (existingIndex >= 0) {
      records[existingIndex] = {
        ...records[existingIndex],
        ...newRecord
      };
    } else {
      records.push(newRecord);
    }

    sortRecords();
    records = records.slice(0, MAX_RECORDS);

    save();

    document.dispatchEvent(
      new CustomEvent("sx:leaderboard-updated", {
        detail: {
          player: newRecord,
          totalPlayers: records.length
        }
      })
    );

    return getPlayerRecord();
  }

  function sortRecords() {
    records.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }

      return a.races - b.races;
    });
  }

  function getPlayerRecord() {
    const playerId = getPlayerId();

    return records.find(
      item => item.playerId === playerId
    ) || null;
  }

  function getRank() {
    const player = getPlayerRecord();

    if (!player) return null;

    const index = records.findIndex(
      item => item.playerId === player.playerId
    );

    return index < 0 ? null : index + 1;
  }

  function getTopPlayers(limit = 10) {
    sortRecords();

    const safeLimit = Math.min(
      100,
      Math.max(1, Math.floor(Number(limit) || 10))
    );

    return records.slice(0, safeLimit).map(
      (record, index) => ({
        ...record,
        rank: index + 1
      })
    );
  }

  function getCategoryRanking(category) {
    const allowed = [
      "score",
      "level",
      "wins",
      "races",
      "distance",
      "maps"
    ];

    if (!allowed.includes(category)) {
      return [];
    }

    return [...records]
      .sort((a, b) => Number(b[category]) - Number(a[category]))
      .map((record, index) => ({
        ...record,
        rank: index + 1
      }));
  }

  function getStats() {
    const player = getPlayerRecord();

    return {
      localPlayers: records.length,
      playerRank: getRank(),
      playerScore: player?.score || 0,
      topScore: records[0]?.score || 0,
      playerRecord: player
    };
  }

  function render(selector = "[data-leaderboard]") {
    const root = document.querySelector(selector);

    if (!root) return;

    const players = getTopPlayers(20);

    root.replaceChildren();

    if (!players.length) {
      const empty = document.createElement("p");
      empty.textContent = "No leaderboard records yet.";
      root.appendChild(empty);
      return;
    }

    players.forEach(player => {
      const row = document.createElement("div");
      row.className = "sx-leaderboard-row";

      if (player.playerId === getPlayerId()) {
        row.classList.add("is-current-player");
      }

      const rank = document.createElement("span");
      rank.className = "sx-leaderboard-rank";
      rank.textContent = `#${player.rank}`;

      const details = document.createElement("div");
      details.className = "sx-leaderboard-player";

      const name = document.createElement("strong");
      name.textContent = player.name;

      const level = document.createElement("small");
      level.textContent = `LEVEL ${player.level}`;

      details.append(name, level);

      const score = document.createElement("strong");
      score.className = "sx-leaderboard-score";
      score.textContent = player.score.toLocaleString();

      row.append(rank, details, score);
      root.appendChild(row);
    });
  }

  function renderPlayerStats() {
    const stats = getStats();

    document.querySelectorAll("[data-leaderboard-rank]")
      .forEach(element => {
        element.textContent = stats.playerRank
          ? `#${stats.playerRank}`
          : "--";
      });

    document.querySelectorAll("[data-leaderboard-score]")
      .forEach(element => {
        element.textContent =
          stats.playerScore.toLocaleString();
      });

    document.querySelectorAll("[data-leaderboard-total]")
      .forEach(element => {
        element.textContent =
          String(stats.localPlayers);
      });
  }

  function resetLocalLeaderboard() {
    records = [];
    save();
    render();
    renderPlayerStats();

    return true;
  }

  function init() {
    if (initialized) return true;

    load();

    initialized = true;

    updatePlayerRecord();
    render();
    renderPlayerStats();

    return true;
  }

  SX.leaderboard = {
    init,
    updatePlayerRecord,
    getPlayerRecord,
    getRank,
    getTopPlayers,
    getCategoryRanking,
    getStats,
    calculateScore,
    render,
    renderPlayerStats,
    resetLocalLeaderboard
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {
      once: true
    });
  } else {
    init();
  }

})();

/* =========================================================
   SUPERX LEGEND — FILE 37
   END
========================================================= */
