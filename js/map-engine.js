
/* =========================================================
   SUPERX LEGEND — FILE 14
   FILE: js/map-engine.js
   START
========================================================= */

(function () {
  "use strict";

  window.SUPERX = window.SUPERX || {};
  const SX = window.SUPERX;

  SX.mapEngine = {
    currentMap: null,
    currentWorld: null,
    mapObjects: [],
    routePoints: [],
    checkpoints: [],
    state: "idle",

    init(mapId) {
      if (!SX.maps || typeof SX.maps.getMap !== "function") {
        console.error("SUPERX: Maps data is not loaded.");
        return null;
      }

      const map = SX.maps.getMap(mapId);

      if (!map) {
        console.error("SUPERX: Map not found:", mapId);
        return null;
      }

      if (!SX.maps.isUnlocked(map)) {
        console.warn("SUPERX: This map is locked.");
        return null;
      }

      this.currentMap = map;
      this.currentWorld = map.worldId || null;
      this.state = "ready";

      this.generateRoute(map);
      this.generateCheckpoints(map);

      return this.getSessionData();
    },

    generateRoute(map) {
      const distance = Number(map.distance) || 5000;
      const difficulty = Number(map.difficulty) || 1;

      const segmentCount = Math.max(
        8,
        Math.min(30, Math.round(distance / 500))
      );

      const points = [];

      for (let i = 0; i <= segmentCount; i++) {
        const progress = i / segmentCount;

        const curve =
          Math.sin(progress * Math.PI * 2) *
          (difficulty * 5);

        const secondaryCurve =
          Math.sin(progress * Math.PI * 5) *
          (difficulty * 1.5);

        points.push({
          x: curve + secondaryCurve,
          z: -progress * distance,
          progress: progress
        });
      }

      this.routePoints = points;
      return points;
    },

    generateCheckpoints(map) {
      const count = Math.max(
        2,
        Math.min(8, Number(map.checkpoints) || 4)
      );

      this.checkpoints = [];

      for (let i = 1; i <= count; i++) {
        const progress = i / (count + 1);
        const index = Math.round(
          progress * (this.routePoints.length - 1)
        );

        const point = this.routePoints[index];

        this.checkpoints.push({
          id: "checkpoint-" + i,
          x: point.x,
          z: point.z,
          progress: progress,
          passed: false
        });
      }

      return this.checkpoints;
    },

    start() {
      if (!this.currentMap || this.state !== "ready") {
        return false;
      }

      this.state = "running";
      this.startedAt = Date.now();
      this.elapsedTime = 0;
      this.passedCheckpoints = 0;

      return true;
    },

    update(deltaTime) {
      if (this.state !== "running") return null;

      this.elapsedTime += Math.max(0, Number(deltaTime) || 0);

      return {
        elapsedTime: this.elapsedTime,
        passedCheckpoints: this.passedCheckpoints,
        totalCheckpoints: this.checkpoints.length
      };
    },

    passCheckpoint(checkpointId) {
      if (this.state !== "running") return false;

      const checkpoint = this.checkpoints.find(
        item => item.id === checkpointId
      );

      if (!checkpoint || checkpoint.passed) return false;

      checkpoint.passed = true;
      this.passedCheckpoints++;

      return true;
    },

    getProgress() {
      if (!this.checkpoints.length) return 0;

      return Math.round(
        (this.passedCheckpoints / this.checkpoints.length) * 100
      );
    },

    finish(result = {}) {
      if (this.state !== "running") return null;

      this.state = "finished";

      const elapsed = Math.max(
        0,
        Number(result.elapsedTime) || this.elapsedTime || 0
      );

      const map = this.currentMap;
      const reward = Number(map.reward) || 0;

      const completed = {
        mapId: map.id,
        worldId: map.worldId,
        time: elapsed,
        reward: reward,
        completedAt: Date.now(),
        checkpointsPassed: this.passedCheckpoints,
        totalCheckpoints: this.checkpoints.length
      };

      if (typeof SX.completeMap === "function") {
        SX.completeMap(map.id, completed);
      }

      if (typeof SX.addCoins === "function") {
        SX.addCoins(reward);
      }

      return completed;
    },

    reset() {
      this.currentMap = null;
      this.currentWorld = null;
      this.mapObjects = [];
      this.routePoints = [];
      this.checkpoints = [];
      this.state = "idle";
      this.elapsedTime = 0;
      this.passedCheckpoints = 0;
    },

    getSessionData() {
      if (!this.currentMap) return null;

      return {
        map: this.currentMap,
        worldId: this.currentWorld,
        route: this.routePoints,
        checkpoints: this.checkpoints,
        state: this.state
      };
    }
  };

})();

/* =========================================================
   SUPERX LEGEND — FILE 14
   END
========================================================= */
