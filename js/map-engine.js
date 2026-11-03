
/* =========================================================
   SUPERX LEGEND — FILE 14
   FILE: js/map-engine.js
   START
========================================================= */

(function () {
  "use strict";

  window.SUPERX = window.SUPERX || {};
  const SX = window.SUPERX;

  const emit = (name, detail = {}) => {
    window.dispatchEvent(new CustomEvent("sx:" + name, {
      detail
    }));
  };

  SX.mapEngine = {
    currentMap: null,
    currentWorld: null,
    mapObjects: [],
    routePoints: [],
    checkpoints: [],
    state: "idle",
    startedAt: 0,
    elapsedTime: 0,
    passedCheckpoints: 0,
    finishResult: null,

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

      if (
        typeof SX.maps.isUnlocked === "function" &&
        !SX.maps.isUnlocked(map)
      ) {
        console.warn("SUPERX: This map is locked.");
        return null;
      }

      this.reset();

      this.currentMap = map;
      this.currentWorld = map.worldId || null;

      this.generateRoute(map);
      this.generateCheckpoints(map);

      this.state = "ready";

      emit("map-ready", {
        mapId: map.id,
        worldId: this.currentWorld,
        routeLength: this.routePoints.length,
        checkpointCount: this.checkpoints.length
      });

      return this.getSessionData();
    },

    generateRoute(map) {
      const distance = Math.max(
        500,
        Number(map.distance) || 5000
      );

      const difficulty = Math.max(
        1,
        Math.min(10, Number(map.difficulty) || 1)
      );

      const segmentCount = Math.max(
        20,
        Math.min(160, Math.round(distance / 100))
      );

      const seedText = String(map.id || "superx-map");
      let seed = 0;

      for (let i = 0; i < seedText.length; i++) {
        seed = (seed * 31 + seedText.charCodeAt(i)) >>> 0;
      }

      const random = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };

      const points = [];
      let previousCurve = 0;

      for (let i = 0; i <= segmentCount; i++) {
        const progress = i / segmentCount;

        const mainCurve =
          Math.sin(progress * Math.PI * 2) *
          difficulty * 7;

        const secondaryCurve =
          Math.sin(progress * Math.PI * 5) *
          difficulty * 2;

        const variation =
          (random() - 0.5) * difficulty * 0.8;

        const curve =
          mainCurve + secondaryCurve + variation;

        previousCurve = curve;

        points.push({
          index: i,
          x: Number(previousCurve.toFixed(3)),
          y: 0,
          z: Number((-progress * distance).toFixed(3)),
          progress: Number(progress.toFixed(5)),
          distance: Number((progress * distance).toFixed(2))
        });
      }

      this.routePoints = points;

      return points;
    },

    generateCheckpoints(map) {
      const count = Math.max(
        2,
        Math.min(20, Number(map.checkpoints) || 4)
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
          index: i,
          x: point.x,
          y: point.y,
          z: point.z,
          progress,
          distance: point.distance,
          passed: false,
          passedAt: 0
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
      this.finishResult = null;

      emit("map-start", {
        mapId: this.currentMap.id,
        startedAt: this.startedAt
      });

      return true;
    },

    update(deltaTime) {
      if (this.state !== "running") return null;

      const dt = Math.max(
        0,
        Math.min(0.25, Number(deltaTime) || 0)
      );

      this.elapsedTime += dt;

      return {
        elapsedTime: this.elapsedTime,
        passedCheckpoints: this.passedCheckpoints,
        totalCheckpoints: this.checkpoints.length,
        progress: this.getProgress(),
        nextCheckpoint: this.getNextCheckpoint()
      };
    },

    passCheckpoint(checkpointId) {
      if (this.state !== "running") return false;

      const checkpoint = this.getNextCheckpoint();

      if (!checkpoint || checkpoint.id !== checkpointId) {
        return false;
      }

      checkpoint.passed = true;
      checkpoint.passedAt = this.elapsedTime;

      this.passedCheckpoints++;

      emit("checkpoint-passed", {
        mapId: this.currentMap.id,
        checkpointId: checkpoint.id,
        checkpointNumber: this.passedCheckpoints,
        totalCheckpoints: this.checkpoints.length,
        progress: this.getProgress(),
        elapsedTime: this.elapsedTime
      });

      return true;
    },

    getNextCheckpoint() {
      return this.checkpoints.find(item => !item.passed) || null;
    },

    getProgress() {
      if (!this.checkpoints.length) return 0;

      return Math.round(
        (this.passedCheckpoints / this.checkpoints.length) * 100
      );
    },

    getRoutePoint(index) {
      return this.routePoints[index] || null;
    },

    getNearestRoutePoint(position) {
      if (!position || !this.routePoints.length) return null;

      let nearest = null;
      let nearestDistance = Infinity;

      for (const point of this.routePoints) {
        const dx = Number(position.x || 0) - point.x;
        const dz = Number(position.z || 0) - point.z;
        const distance = dx * dx + dz * dz;

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = point;
        }
      }

      return nearest ? {
        ...nearest,
        distanceFromVehicle: Math.sqrt(nearestDistance)
      } : null;
    },

    finish(result = {}) {
      if (this.state !== "running") return null;

      this.state = "finished";

      const elapsed = Math.max(
        0,
        Number(result.elapsedTime) || this.elapsedTime
      );

      const map = this.currentMap;
      const reward = Math.max(0, Number(map.reward) || 0);

      const completed = {
        mapId: map.id,
        worldId: map.worldId || null,
        time: elapsed,
        reward,
        completedAt: Date.now(),
        checkpointsPassed: this.passedCheckpoints,
        totalCheckpoints: this.checkpoints.length,
        progress: this.getProgress(),
        result: result.position || "finished"
      };

      this.finishResult = completed;

      // Reward is handled by the central race/progress system.
      // Do not add coins here to prevent duplicate rewards.
      if (typeof SX.completeMap === "function") {
        SX.completeMap(map.id, completed);
      }

      emit("map-finished", completed);

      return completed;
    },

    fail(reason = "failed") {
      if (this.state !== "running") return false;

      this.state = "failed";

      emit("map-failed", {
        mapId: this.currentMap?.id || null,
        reason,
        elapsedTime: this.elapsedTime
      });

      return true;
    },

    pause() {
      if (this.state !== "running") return false;

      this.state = "paused";

      emit("map-paused", {
        mapId: this.currentMap?.id || null,
        elapsedTime: this.elapsedTime
      });

      return true;
    },

    resume() {
      if (this.state !== "paused") return false;

      this.state = "running";

      emit("map-resumed", {
        mapId: this.currentMap?.id || null,
        elapsedTime: this.elapsedTime
      });

      return true;
    },

    reset() {
      this.currentMap = null;
      this.currentWorld = null;
      this.mapObjects = [];
      this.routePoints = [];
      this.checkpoints = [];
      this.state = "idle";
      this.startedAt = 0;
      this.elapsedTime = 0;
      this.passedCheckpoints = 0;
      this.finishResult = null;
    },

    getSessionData() {
      if (!this.currentMap) return null;

      return {
        map: this.currentMap,
        worldId: this.currentWorld,
        route: this.routePoints,
        checkpoints: this.checkpoints,
        state: this.state,
        elapsedTime: this.elapsedTime,
        passedCheckpoints: this.passedCheckpoints,
        progress: this.getProgress()
      };
    }
  };

})();

/* =========================================================
   SUPERX LEGEND — FILE 14
   END
========================================================= */
