
/* =========================================================
   SUPERX LEGEND — FILE 20
   FILE: js/race.js
   START
========================================================= */

(function () {
  "use strict";

  window.SUPERX = window.SUPERX || {};
  const SX = window.SUPERX;

  SX.race = {
    status: "idle",
    mode: "career",
    map: null,
    startTime: 0,
    elapsedTime: 0,
    distance: 0,
    totalDistance: 5000,
    playerPosition: 0,
    checkpoints: [],
    checkpointIndex: 0,
    result: null,
    previousFrame: 0,

    init(options = {}) {
      this.reset();

      this.mode = options.mode || "career";
      this.map = options.map || null;

      this.totalDistance = Math.max(
        500,
        Number(
          options.distance ||
          (this.map && this.map.distance)
        ) || 5000
      );

      this.checkpoints = SX.mapEngine &&
        Array.isArray(SX.mapEngine.checkpoints)
          ? SX.mapEngine.checkpoints
          : [];

      if (SX.physics && !SX.physics.initialized) {
        const selectedCar = SX.getSelectedCar
          ? SX.getSelectedCar()
          : null;

        SX.physics.init(selectedCar || {});
      }

      return this.getState();
    },

    start() {
      if (this.status !== "ready" && this.status !== "idle") {
        return false;
      }

      this.status = "running";
      this.startTime = Date.now();
      this.previousFrame = this.startTime;
      this.elapsedTime = 0;
      this.distance = 0;
      this.playerPosition = 0;
      this.checkpointIndex = 0;
      this.result = null;

      if (SX.physics) {
        SX.physics.reset();
      }

      if (SX.mapEngine && SX.mapEngine.state === "ready") {
        SX.mapEngine.start();
      }

      if (SX.aiRacing && SX.aiRacing.opponents.length) {
        SX.aiRacing.start();
      }

      return true;
    },

    update(deltaTime) {
      if (this.status !== "running") {
        return this.getState();
      }

      const dt = Math.min(
        Math.max(Number(deltaTime) || 0, 0),
        0.05
      );

      this.elapsedTime += dt;

      if (SX.physics) {
        const car = SX.physics.update(dt);

        this.distance += Math.abs(car.speed) * dt;
        this.playerPosition = this.distance;
      }

      this.updateCheckpoints();

      if (SX.mapEngine) {
        SX.mapEngine.update(dt);
      }

      if (SX.aiRacing && SX.aiRacing.active) {
        SX.aiRacing.update(dt, {
          speed: SX.physics ? Math.abs(SX.physics.car.speed) : 0,
          progress: this.distance,
          finishDistance: this.totalDistance
        });
      }

      if (this.distance >= this.totalDistance) {
        return this.finish();
      }

      return this.getState();
    },

    updateCheckpoints() {
      if (!this.checkpoints.length) return;

      const progress = Math.min(
        1,
        this.distance / this.totalDistance
      );

      while (this.checkpointIndex < this.checkpoints.length) {
        const checkpoint = this.checkpoints[this.checkpointIndex];

        if (progress < checkpoint.progress) break;

        if (SX.mapEngine) {
          SX.mapEngine.passCheckpoint(checkpoint.id);
        }

        this.checkpointIndex++;
      }
    },

    finish() {
      if (this.status !== "running") return null;

      this.status = "finished";

      const elapsed = this.elapsedTime;

      let mapResult = null;

      if (SX.mapEngine && SX.mapEngine.state === "running") {
        mapResult = SX.mapEngine.finish({
          elapsedTime: elapsed
        });
      }

      let aiResult = null;

      if (SX.aiRacing && SX.aiRacing.active) {
        aiResult = SX.aiRacing.finishPlayer();
      }

      const baseReward = Number(
        (this.map && this.map.reward) || 100
      );

      const completed = {
        mode: this.mode,
        mapId: this.map ? this.map.id : null,
        time: elapsed,
        distance: this.distance,
        totalDistance: this.totalDistance,
        reward: mapResult ? mapResult.reward : baseReward,
        position: this.getPlayerPosition(aiResult),
        completedAt: Date.now()
      };

      this.result = completed;

      if (!mapResult && SX.addCoins) {
        SX.addCoins(completed.reward);
      }

      if (SX.addXP) {
        SX.addXP(Math.max(10, Math.round(this.distance / 100)));
      }

      return completed;
    },

    getPlayerPosition(standings) {
      if (!standings || !standings.length) return 1;

      const playerIndex = standings.findIndex(
        item => item.id === "player"
      );

      return playerIndex === -1
        ? standings.length + 1
        : playerIndex + 1;
    },

    pause() {
      if (this.status !== "running") return false;

      this.status = "paused";

      if (SX.physics) {
        SX.physics.clearInput();
      }

      return true;
    },

    resume() {
      if (this.status !== "paused") return false;

      this.status = "running";
      this.previousFrame = Date.now();

      return true;
    },

    reset() {
      this.status = "idle";
      this.map = null;
      this.startTime = 0;
      this.elapsedTime = 0;
      this.distance = 0;
      this.playerPosition = 0;
      this.totalDistance = 5000;
      this.checkpoints = [];
      this.checkpointIndex = 0;
      this.result = null;
      this.previousFrame = 0;

      if (SX.physics) {
        SX.physics.clearInput();
      }
    },

    setReady() {
      if (this.status === "idle") {
        this.status = "ready";
      }
    },

    getState() {
      return {
        status: this.status,
        mode: this.mode,
        elapsedTime: this.elapsedTime,
        distance: this.distance,
        totalDistance: this.totalDistance,
        progress: Math.min(
          100,
          Math.round(
            (this.distance / Math.max(1, this.totalDistance)) * 100
          )
        ),
        checkpointIndex: this.checkpointIndex,
        totalCheckpoints: this.checkpoints.length,
        result: this.result
      };
    }
  };

})();

/* =========================================================
   SUPERX LEGEND — FILE 20
   END
========================================================= */
