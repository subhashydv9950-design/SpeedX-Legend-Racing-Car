
/* =========================================================
   SUPERX LEGEND — FILE 101
   FILE: js/vehicle-race-results.js

   MODULE: VEHICLE RACE RESULTS MANAGER
   PURPOSE:
   - Collect completed race results
   - Store race classification
   - Track player position and timings
   - Connect with existing race rewards
   - Prevent duplicate result processing

   START: VEHICLE RACE RESULTS MANAGER
   ========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_vehicle_race_results_v1";
  const MAX_RESULTS = 100;

  let results = [];
  let activeResult = null;

  /* ---------------------------------------------------------
     1. BASIC HELPERS
     --------------------------------------------------------- */

  function safeNumber(value, fallback) {
    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : fallback;
  }

  function safeText(value, fallback, maxLength) {
    const text = String(value || "").trim();

    return text
      ? text.slice(0, maxLength || 100)
      : fallback;
  }

  function createRaceId() {
    return "SX-RACE-" +
      Date.now().toString(36) +
      "-" +
      Math.floor(Math.random() * 1000000).toString(36);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  /* ---------------------------------------------------------
     2. STORAGE
     --------------------------------------------------------- */

  function load() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
      );

      results = Array.isArray(saved)
        ? saved.slice(-MAX_RESULTS)
        : [];

      return true;

    } catch (error) {
      console.warn(
        "[SUPERX Results] Could not load race history.",
        error
      );

      results = [];
      return false;
    }
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(results.slice(-MAX_RESULTS))
      );

      return true;

    } catch (error) {
      console.warn(
        "[SUPERX Results] Could not save race history.",
        error
      );

      return false;
    }
  }

  /* ---------------------------------------------------------
     3. NORMALIZE RACER DATA
     --------------------------------------------------------- */

  function normalizeRacer(racer, index) {
    const item = racer || {};

    return {
      racerId: safeText(
        item.racerId,
        "racer-" + (index + 1),
        80
      ),

      name: safeText(
        item.name,
        "Racer " + (index + 1),
        60
      ),

      position: Math.max(
        1,
        Math.floor(
          safeNumber(item.position, index + 1)
        )
      ),

      completedLaps: Math.max(
        0,
        Math.floor(
          safeNumber(item.completedLaps, 0)
        )
      ),

      totalTime: Math.max(
        0,
        safeNumber(item.totalTime, 0)
      ),

      bestLapTime: Math.max(
        0,
        safeNumber(item.bestLapTime, 0)
      ),

      finished: item.finished === true,

      isPlayer: item.isPlayer === true
    };
  }

  /* ---------------------------------------------------------
     4. PREPARE RESULT
     --------------------------------------------------------- */

  function prepare(data) {
    const input = data || {};

    const raceId = safeText(
      input.raceId,
      createRaceId(),
      100
    );

    if (
      results.some(item => item.raceId === raceId) ||
      (activeResult && activeResult.raceId === raceId)
    ) {
      return {
        success: false,
        message: "This race ID already exists."
      };
    }

    const racers = Array.isArray(input.racers)
      ? input.racers
          .slice(0, 12)
          .map(normalizeRacer)
          .sort((a, b) => a.position - b.position)
      : [];

    const player = racers.find(
      racer => racer.isPlayer
    ) || null;

    activeResult = {
      raceId,

      mode: safeText(
        input.mode,
        "career",
        40
      ),

      mapId: safeText(
        input.mapId,
        "unknown",
        80
      ),

      mapName: safeText(
        input.mapName,
        "Unknown Track",
        100
      ),

      carId: safeText(
        input.carId,
        "unknown",
        80
      ),

      difficulty: safeText(
        input.difficulty,
        "normal",
        20
      ),

      totalLaps: Math.max(
        1,
        Math.floor(
          safeNumber(input.totalLaps, 1)
        )
      ),

      completedLaps: player
        ? player.completedLaps
        : Math.max(
            0,
            Math.floor(
              safeNumber(input.completedLaps, 0)
            )
          ),

      playerPosition: player
        ? player.position
        : Math.max(
            0,
            Math.floor(
              safeNumber(input.playerPosition, 0)
            )
          ),

      totalTime: player
        ? player.totalTime
        : Math.max(
            0,
            safeNumber(input.totalTime, 0)
          ),

      bestLapTime: player
        ? player.bestLapTime
        : Math.max(
            0,
            safeNumber(input.bestLapTime, 0)
          ),

      finished: input.finished === true,

      racers,

      penalties: Math.max(
        0,
        safeNumber(input.penalties, 0)
      ),

      adjustedTime: Math.max(
        0,
        safeNumber(input.adjustedTime, 0)
      ),

      startedAt: safeNumber(
        input.startedAt,
        0
      ),

      finishedAt: safeNumber(
        input.finishedAt,
        Date.now()
      ),

      createdAt: Date.now(),

      reward: null,
      rewardClaimed: false
    };

    return {
      success: true,
      result: clone(activeResult)
    };
  }

  /* ---------------------------------------------------------
     5. FINALIZE RESULT
     --------------------------------------------------------- */

  function finalize(data) {
    if (!activeResult) {
      const prepared = prepare(data);

      if (!prepared.success) {
        return prepared;
      }
    }

    const input = data || {};

    if (input.racers && Array.isArray(input.racers)) {
      activeResult.racers = input.racers
        .slice(0, 12)
        .map(normalizeRacer)
        .sort((a, b) => a.position - b.position);
    }

    if (input.finished === false) {
      activeResult.finished = false;
    } else {
      activeResult.finished = true;
    }

    if (input.playerPosition !== undefined) {
      activeResult.playerPosition = Math.max(
        0,
        Math.floor(
          safeNumber(input.playerPosition, 0)
        )
      );
    }

    if (input.totalTime !== undefined) {
      activeResult.totalTime = Math.max(
        0,
        safeNumber(input.totalTime, 0)
      );
    }

    if (input.bestLapTime !== undefined) {
      activeResult.bestLapTime = Math.max(
        0,
        safeNumber(input.bestLapTime, 0)
      );
    }

    if (input.penalties !== undefined) {
      activeResult.penalties = Math.max(
        0,
        safeNumber(input.penalties, 0)
      );
    }

    if (input.adjustedTime !== undefined) {
      activeResult.adjustedTime = Math.max(
        0,
        safeNumber(input.adjustedTime, 0)
      );
    }

    activeResult.finishedAt = Date.now();

    const completed = clone(activeResult);

    results.push(completed);

    if (results.length > MAX_RESULTS) {
      results.shift();
    }

    const saved = save();

    activeResult = null;

    window.dispatchEvent(
      new CustomEvent("sx:race-result-created", {
        detail: {
          result: clone(completed),
          saved
        }
      })
    );

    return {
      success: true,
      saved,
      result: completed
    };
  }

  /* ---------------------------------------------------------
     6. CLAIM RESULT REWARD
     --------------------------------------------------------- */

  function claimReward(raceId, options) {
    const id = safeText(raceId, "", 100);

    const result = results.find(
      item => item.raceId === id
    );

    if (!result) {
      return {
        success: false,
        message: "Race result not found."
      };
    }

    if (result.rewardClaimed) {
      return {
        success: false,
        message: "Reward already claimed."
      };
    }

    if (!result.finished || result.playerPosition < 1) {
      return {
        success: false,
        message: "A valid finished result is required."
      };
    }

    if (
      !SX.vehicleRaceRewards ||
      typeof SX.vehicleRaceRewards.claim !== "function"
    ) {
      return {
        success: false,
        message: "Race rewards system is unavailable."
      };
    }

    const rewardData = {
      ...(options || {}),
      raceId: result.raceId,
      position: result.playerPosition,
      completedLaps: result.completedLaps,
      difficulty: result.difficulty
    };

    const response = SX.vehicleRaceRewards.claim(
      rewardData
    );

    if (!response || response.success !== true) {
      return {
        success: false,
        message: response
          ? response.message
          : "Reward claim failed."
      };
    }

    result.rewardClaimed = true;
    result.reward = response.reward || null;

    save();

    window.dispatchEvent(
      new CustomEvent("sx:race-result-rewarded", {
        detail: {
          raceId: id,
          reward: result.reward
        }
      })
    );

    return {
      success: true,
      reward: result.reward
    };
  }

  /* ---------------------------------------------------------
     7. HISTORY AND STATISTICS
     --------------------------------------------------------- */

  function getAll() {
    return clone(results.slice().reverse());
  }

  function getResult(raceId) {
    const result = results.find(
      item => item.raceId === String(raceId)
    );

    return result ? clone(result) : null;
  }

  function getLatest() {
    if (!results.length) return null;

    return clone(results[results.length - 1]);
  }

  function getStatistics() {
    const completed = results.filter(
      item => item.finished
    );

    const wins = completed.filter(
      item => item.playerPosition === 1
    ).length;

    const totalTime = completed.reduce(
      (sum, item) => sum + item.totalTime,
      0
    );

    const bestLap = completed
      .map(item => item.bestLapTime)
      .filter(time => time > 0);

    return {
      totalRaces: results.length,
      completedRaces: completed.length,
      wins,
      podiums: completed.filter(
        item => item.playerPosition >= 1 &&
          item.playerPosition <= 3
      ).length,

      averageTime: completed.length
        ? totalTime / completed.length
        : 0,

      bestLapTime: bestLap.length
        ? Math.min(...bestLap)
        : 0,

      rewardsClaimed: completed.filter(
        item => item.rewardClaimed
      ).length
    };
  }

  /* ---------------------------------------------------------
     8. CLEAR HISTORY
     --------------------------------------------------------- */

  function clearHistory() {
    results = [];
    activeResult = null;

    const saved = save();

    window.dispatchEvent(
      new CustomEvent("sx:race-results-cleared")
    );

    return saved;
  }

  /* ---------------------------------------------------------
     9. PUBLIC API
     --------------------------------------------------------- */

  load();

  SX.vehicleRaceResults = {
    prepare,
    finalize,
    claimReward,

    getAll,
    getResult,
    getLatest,
    getStatistics,

    clearHistory,
    reload: load
  };

})();

/* =========================================================
   END: VEHICLE RACE RESULTS MANAGER — FILE 101
   ========================================================= */
      
