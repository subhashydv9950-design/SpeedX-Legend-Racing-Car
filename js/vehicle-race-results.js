/* =========================================================
   SUPERX LEGEND — FILE 101
   FILE: js/vehicle-race-results.js
   MODULE: VEHICLE RACE RESULTS MANAGER
   START: VEHICLE RACE RESULTS MANAGER
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_vehicle_race_results_v2";
  const MAX_RESULTS = 100;

  let results = [];
  let activeResult = null;
  let processedIds = new Set();

  function number(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function text(value, fallback = "", max = 100) {
    const result = String(value ?? "").trim();
    return (result || fallback).slice(0, max);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createRaceId() {
    return "SX-RACE-" +
      Date.now().toString(36) + "-" +
      Math.random().toString(36).slice(2, 9);
  }

  function emit(name, detail = {}) {
    window.dispatchEvent(new CustomEvent("sx:" + name, {
      detail
    }));
  }

  function normalizeRacer(racer, index) {
    const item = racer || {};

    return {
      racerId: text(item.racerId, "racer-" + (index + 1), 80),
      name: text(item.name, "Racer " + (index + 1), 60),
      position: Math.max(1, Math.floor(number(item.position, index + 1))),
      completedLaps: Math.max(0, Math.floor(number(item.completedLaps))),
      totalTime: Math.max(0, number(item.totalTime)),
      bestLapTime: Math.max(0, number(item.bestLapTime)),
      finished: item.finished === true,
      isPlayer: item.isPlayer === true
    };
  }

  function normalizeResult(item) {
    if (!item || typeof item !== "object") return null;

    const racers = Array.isArray(item.racers)
      ? item.racers.slice(0, 12).map(normalizeRacer)
      : [];

    return {
      raceId: text(item.raceId, createRaceId(), 100),
      mode: text(item.mode, "career", 40),
      mapId: text(item.mapId, "unknown", 80),
      mapName: text(item.mapName, "Unknown Track", 100),
      carId: text(item.carId, "unknown", 80),
      difficulty: text(item.difficulty, "normal", 20),
      totalLaps: Math.max(1, Math.floor(number(item.totalLaps, 1))),
      completedLaps: Math.max(0, Math.floor(number(item.completedLaps))),
      playerPosition: Math.max(0, Math.floor(number(item.playerPosition))),
      totalTime: Math.max(0, number(item.totalTime)),
      bestLapTime: Math.max(0, number(item.bestLapTime)),
      finished: item.finished === true,
      racers,
      penalties: Math.max(0, number(item.penalties)),
      adjustedTime: Math.max(0, number(item.adjustedTime)),
      startedAt: number(item.startedAt),
      finishedAt: number(item.finishedAt, Date.now()),
      createdAt: number(item.createdAt, Date.now()),
      reward: item.reward && typeof item.reward === "object"
        ? item.reward
        : null,
      rewardClaimed: item.rewardClaimed === true
    };
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

      results = Array.isArray(saved)
        ? saved.map(normalizeResult).filter(Boolean).slice(-MAX_RESULTS)
        : [];

      processedIds = new Set(results.map(item => item.raceId));
      return true;
    } catch (error) {
      console.warn("[SUPERX Results] Load failed:", error);
      results = [];
      processedIds = new Set();
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
      console.warn("[SUPERX Results] Save failed:", error);
      return false;
    }
  }

  function prepare(data = {}) {
    const raceId = text(data.raceId, createRaceId(), 100);

    if (processedIds.has(raceId) ||
        (activeResult && activeResult.raceId === raceId)) {
      return {
        success: false,
        message: "This race ID already exists."
      };
    }

    const racers = Array.isArray(data.racers)
      ? data.racers.slice(0, 12)
          .map(normalizeRacer)
          .sort((a, b) => a.position - b.position)
      : [];

    const player = racers.find(item => item.isPlayer);

    activeResult = normalizeResult({
      raceId,
      mode: data.mode,
      mapId: data.mapId,
      mapName: data.mapName,
      carId: data.carId,
      difficulty: data.difficulty,
      totalLaps: data.totalLaps,
      completedLaps: player
        ? player.completedLaps
        : data.completedLaps,
      playerPosition: player
        ? player.position
        : data.playerPosition,
      totalTime: player
        ? player.totalTime
        : data.totalTime,
      bestLapTime: player
        ? player.bestLapTime
        : data.bestLapTime,
      finished: data.finished,
      racers,
      penalties: data.penalties,
      adjustedTime: data.adjustedTime,
      startedAt: data.startedAt,
      finishedAt: Date.now(),
      createdAt: Date.now()
    });

    return {
      success: true,
      result: clone(activeResult)
    };
  }

  function finalize(data = {}) {
    if (!activeResult) {
      const prepared = prepare(data);
      if (!prepared.success) return prepared;
    }

    const result = activeResult;

    if (Array.isArray(data.racers)) {
      result.racers = data.racers.slice(0, 12)
        .map(normalizeRacer)
        .sort((a, b) => a.position - b.position);
    }

    const player = result.racers.find(item => item.isPlayer);

    if (player) {
      result.completedLaps = player.completedLaps;
      result.playerPosition = player.position;
      result.totalTime = player.totalTime;
      result.bestLapTime = player.bestLapTime;
    }

    [
      "mode", "mapId", "mapName", "carId", "difficulty"
    ].forEach(key => {
      if (data[key] !== undefined) {
        result[key] = text(data[key], result[key], 100);
      }
    });

    [
      "totalLaps", "completedLaps", "playerPosition",
      "totalTime", "bestLapTime", "penalties", "adjustedTime"
    ].forEach(key => {
      if (data[key] !== undefined) {
        result[key] = Math.max(0, number(data[key], result[key]));
      }
    });

    if (data.finished !== undefined) {
      result.finished = data.finished === true;
    } else {
      result.finished = true;
    }

    result.finishedAt = Date.now();

    const completed = normalizeResult(result);

    results.push(completed);
    if (results.length > MAX_RESULTS) results.shift();

    processedIds.add(completed.raceId);
    while (processedIds.size > MAX_RESULTS) {
      processedIds.delete(results[0]?.raceId);
    }

    const saved = save();
    activeResult = null;

    emit("race-result-created", {
      result: clone(completed),
      saved
    });

    if (SX.vehicleRaceAnalysis &&
        typeof SX.vehicleRaceAnalysis.analyze === "function") {
      try {
        SX.vehicleRaceAnalysis.analyze(completed);
      } catch (error) {
        console.warn("[SUPERX Results] Analysis integration failed:", error);
      }
    }

    return {
      success: true,
      saved,
      result: clone(completed)
    };
  }

  function claimReward(raceId, options = {}) {
    const id = text(raceId, "", 100);
    const result = results.find(item => item.raceId === id);

    if (!result) {
      return { success: false, message: "Race result not found." };
    }

    if (result.rewardClaimed ||
        (SX.vehicleRaceRewards &&
         SX.vehicleRaceRewards.hasClaimed(id))) {
      return { success: false, message: "Reward already claimed." };
    }

    if (!result.finished || result.playerPosition < 1) {
      return { success: false, message: "A valid finished result is required." };
    }

    if (!SX.vehicleRaceRewards ||
        typeof SX.vehicleRaceRewards.claim !== "function") {
      return { success: false, message: "Race rewards system is unavailable." };
    }

    const response = SX.vehicleRaceRewards.claim({
      ...options,
      raceId: id,
      position: result.playerPosition,
      completedLaps: result.completedLaps,
      difficulty: result.difficulty,
      penalties: result.penalties,
      cleanRace: result.penalties === 0
    });

    if (!response || response.success !== true) {
      return {
        success: false,
        message: response?.message || "Reward claim failed."
      };
    }

    result.rewardClaimed = true;
    result.reward = response.reward || null;
    const saved = save();

    emit("race-result-rewarded", {
      raceId: id,
      reward: result.reward,
      saved
    });

    return {
      success: true,
      saved,
      reward: result.reward
    };
  }

  function getAll() {
    return clone(results.slice().reverse());
  }

  function getResult(raceId) {
    const item = results.find(result => result.raceId === String(raceId));
    return item ? clone(item) : null;
  }

  function getLatest() {
    return results.length ? clone(results[results.length - 1]) : null;
  }

  function getStatistics() {
    const completed = results.filter(item => item.finished);
    const bestLaps = completed
      .map(item => item.bestLapTime)
      .filter(value => value > 0);

    return {
      totalRaces: results.length,
      completedRaces: completed.length,
      wins: completed.filter(item => item.playerPosition === 1).length,
      podiums: completed.filter(item =>
        item.playerPosition >= 1 && item.playerPosition <= 3
      ).length,
      averageTime: completed.length
        ? completed.reduce((sum, item) => sum + item.totalTime, 0) / completed.length
        : 0,
      bestLapTime: bestLaps.length ? Math.min(...bestLaps) : 0,
      rewardsClaimed: completed.filter(item => item.rewardClaimed).length
    };
  }

  function clearHistory() {
    results = [];
    activeResult = null;
    processedIds.clear();

    const saved = save();
    emit("race-results-cleared", { saved });
    return saved;
  }

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
    reload: load,
    getActive: () => activeResult ? clone(activeResult) : null
  };

})(window);

/* =========================================================
   END: VEHICLE RACE RESULTS MANAGER — FILE 101
   ========================================================= */

