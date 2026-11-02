
/* =========================================================
   SUPERX LEGEND — FILE 98
   FILE: js/vehicle-race-standings.js
   START: VEHICLE RACE STANDINGS SYSTEM
   ========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const MAX_RACERS = 12;

  let racers = [];
  let finishedOrder = [];
  let raceActive = false;
  let lastUpdate = 0;

  function num(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function normalizeRacer(data) {
    const racer = data || {};

    return {
      id: String(
        racer.id || "racer_" + Math.random().toString(36).slice(2, 9)
      ),
      name: String(racer.name || "Unknown Racer").slice(0, 40),
      carName: String(racer.carName || "Unknown Car").slice(0, 40),
      isPlayer: !!racer.isPlayer,
      isAI: racer.isAI !== false && !racer.isPlayer,
      distance: Math.max(0, num(racer.distance, 0)),
      laps: Math.max(0, Math.floor(num(racer.laps, 0))),
      speed: Math.max(0, num(racer.speed, 0)),
      bestLap: Math.max(0, num(racer.bestLap, 0)),
      lastLap: Math.max(0, num(racer.lastLap, 0)),
      penalty: Math.max(0, num(racer.penalty, 0)),
      finished: !!racer.finished,
      finishTime: null,
      position: 0,
      previousPosition: 0,
      status: "racing"
    };
  }

  function start(initialRacers) {
    const input = Array.isArray(initialRacers)
      ? initialRacers
      : [];

    racers = [];
    finishedOrder = [];
    raceActive = true;

    input.slice(0, MAX_RACERS).forEach(item => {
      const racer = normalizeRacer(item);

      if (!racers.some(existing => existing.id === racer.id)) {
        racers.push(racer);
      }
    });

    updatePositions();

    window.dispatchEvent(
      new CustomEvent("sx:race-standings-started", {
        detail: getStandings()
      })
    );

    return getStandings();
  }

  function addRacer(data) {
    if (!raceActive) return false;

    if (racers.length >= MAX_RACERS) {
      return {
        success: false,
        message: "Maximum racer limit reached."
      };
    }

    const racer = normalizeRacer(data);

    if (racers.some(item => item.id === racer.id)) {
      return {
        success: false,
        message: "Racer already exists."
      };
    }

    racers.push(racer);
    updatePositions();

    return {
      success: true,
      racer: { ...racer }
    };
  }

  function updateRacer(id, data) {
    if (!raceActive) return false;

    const racer = racers.find(item => item.id === String(id));

    if (!racer || racer.finished) return false;

    const state = data || {};

    if (state.distance !== undefined) {
      racer.distance = Math.max(
        0,
        num(state.distance, racer.distance)
      );
    }

    if (state.laps !== undefined) {
      racer.laps = Math.max(
        0,
        Math.floor(num(state.laps, racer.laps))
      );
    }

    if (state.speed !== undefined) {
      racer.speed = Math.max(
        0,
        num(state.speed, racer.speed)
      );
    }

    if (state.bestLap !== undefined) {
      racer.bestLap = Math.max(
        0,
        num(state.bestLap, racer.bestLap)
      );
    }

    if (state.lastLap !== undefined) {
      racer.lastLap = Math.max(
        0,
        num(state.lastLap, racer.lastLap)
      );
    }

    if (state.penalty !== undefined) {
      racer.penalty = Math.max(
        0,
        num(state.penalty, racer.penalty)
      );
    }

    updatePositions();

    return getRacer(id);
  }

  function getRaceProgress(racer) {
    return racer.distance;
  }

  function updatePositions() {
    const previous = new Map(
      racers.map(item => [item.id, item.position])
    );

    const activeRacers = racers.filter(
      item => !item.finished
    );

    activeRacers.sort((a, b) => {
      const distanceDifference =
        getRaceProgress(b) - getRaceProgress(a);

      if (distanceDifference !== 0) {
        return distanceDifference;
      }

      const penaltyA = a.penalty;
      const penaltyB = b.penalty;

      if (penaltyA !== penaltyB) {
        return penaltyA - penaltyB;
      }

      return a.bestLap - b.bestLap;
    });

    activeRacers.forEach((racer, index) => {
      racer.previousPosition = previous.get(racer.id) || index + 1;
      racer.position = index + 1;
    });

    const offset = activeRacers.length;

    finishedOrder.forEach((id, index) => {
      const racer = racers.find(item => item.id === id);

      if (racer) {
        racer.previousPosition = previous.get(racer.id) || offset + index + 1;
        racer.position = offset + index + 1;
      }
    });

    lastUpdate = Date.now();
  }

  function finishRacer(id, finishTime) {
    if (!raceActive) return false;

    const racer = racers.find(item => item.id === String(id));

    if (!racer || racer.finished) return false;

    racer.finished = true;
    racer.finishTime = Math.max(
      0,
      num(finishTime, Date.now())
    );

    racer.status = "finished";

    finishedOrder.push(racer.id);

    updatePositions();

    window.dispatchEvent(
      new CustomEvent("sx:racer-finished", {
        detail: {
          racer: { ...racer },
          position: racer.position
        }
      })
    );

    return {
      success: true,
      position: racer.position
    };
  }

  function getRacer(id) {
    const racer = racers.find(
      item => item.id === String(id)
    );

    return racer ? { ...racer } : null;
  }

  function getPlayer() {
    return racers.find(item => item.isPlayer) || null;
  }

  function getPlayerPosition() {
    const player = getPlayer();

    return player ? player.position : null;
  }

  function getStandings() {
    return racers
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(racer => ({
        ...racer,
        positionChange:
          racer.previousPosition - racer.position
      }));
  }

  function getNearbyRacers() {
    const player = getPlayer();

    if (!player) return [];

    return getStandings()
      .filter(racer => racer.id !== player.id)
      .sort((a, b) => {
        const gapA = Math.abs(
          a.distance - player.distance
        );

        const gapB = Math.abs(
          b.distance - player.distance
        );

        return gapA - gapB;
      })
      .slice(0, 3);
  }

  function getResults() {
    return getStandings().map(racer => ({
      id: racer.id,
      name: racer.name,
      carName: racer.carName,
      position: racer.position,
      bestLap: racer.bestLap,
      penalty: racer.penalty,
      finished: racer.finished,
      finishTime: racer.finishTime,
      status: racer.status
    }));
  }

  function getState() {
    return {
      active: raceActive,
      racerCount: racers.length,
      finishedCount: finishedOrder.length,
      remainingCount: racers.length - finishedOrder.length,
      playerPosition: getPlayerPosition(),
      lastUpdate
    };
  }

  function finishRace() {
    if (!raceActive) return false;

    raceActive = false;
    updatePositions();

    const results = getResults();

    window.dispatchEvent(
      new CustomEvent("sx:race-standings-finished", {
        detail: results
      })
    );

    return results;
  }

  function reset() {
    racers = [];
    finishedOrder = [];
    raceActive = false;
    lastUpdate = 0;

    return true;
  }

  const api = {
    start,
    addRacer,
    updateRacer,
    updatePositions,
    finishRacer,
    getRacer,
    getPlayer,
    getPlayerPosition,
    getStandings,
    getNearbyRacers,
    getResults,
    getState,
    finishRace,
    reset
  };

  SX.vehicleRaceStandings = api;

})();

/* =========================================================
   END: VEHICLE RACE STANDINGS SYSTEM — FILE 98
   ========================================================= */
