/* =========================================================
   SUPERX LEGEND — FILE 20
   FILE: js/race.js
   PURPOSE: Core Race Session Controller
   START
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const Race = {
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
    rewardClaimed: false,

    init(options = {}) {
      this.reset();

      this.mode = options.mode || "career";
      this.map = options.map || null;

      this.totalDistance = Math.max(
        500,
        Number(
          options.distance ||
          this.map?.distance ||
          5000
        )
      );

      const mapCheckpoints =
        SX.mapEngine?.checkpoints;

      this.checkpoints = Array.isArray(mapCheckpoints)
        ? mapCheckpoints.slice()
        : [];

      if (SX.physics && !SX.physics.initialized) {
        const selectedCar = SX.getSelectedCar?.() || {};

        SX.physics.init(selectedCar);
      }

      this.status = "ready";

      this.dispatch("initialized", this.getState());

      return this.getState();
    },

    start() {
      if (
        this.status !== "ready" &&
        this.status !== "idle"
      ) {
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
      this.rewardClaimed = false;

      SX.physics?.reset?.();
      SX.physics?.clearInput?.();

      if (SX.mapEngine?.state === "ready") {
        SX.mapEngine.start();
      }

      if (
        SX.aiRacing &&
        Array.isArray(SX.aiRacing.opponents) &&
        SX.aiRacing.opponents.length
      ) {
        SX.aiRacing.start();
      }

      this.dispatch("started", this.getState());

      return true;
    },

    update(deltaTime) {
      if (this.status !== "running") {
        return this.getState();
      }

      const dt = Math.min(
        0.05,
        Math.max(0, Number(deltaTime) || 0)
      );

      if (dt <= 0) return this.getState();

      this.elapsedTime += dt;

      if (SX.physics) {
        const car = SX.physics.update(dt);

        if (car) {
          const speed = Math.abs(
            Number(car.speed) || 0
          );

          // Speed is stored in km/h; distance is measured in metres.
          this.distance += (speed / 3.6) * dt;
          this.playerPosition = this.distance;
        }
      }

      this.updateCheckpoints();

      SX.mapEngine?.update?.(dt);

      if (SX.aiRacing?.active) {
        SX.aiRacing.update(dt, {
          speed: Math.abs(
            Number(SX.physics?.car?.speed) || 0
          ),
          progress: this.distance,
          finishDistance: this.totalDistance
        });
      }

      if (this.distance >= this.totalDistance) {
        return this.finish();
      }

      this.dispatch("updated", this.getState());

      return this.getState();
    },

    updateCheckpoints() {
      if (!this.checkpoints.length) return;

      const progress = Math.min(
        1,
        this.distance / Math.max(1, this.totalDistance)
      );

      while (
        this.checkpointIndex < this.checkpoints.length
      ) {
        const checkpoint =
          this.checkpoints[this.checkpointIndex];

        if (
          !checkpoint ||
          progress < Number(checkpoint.progress || 0)
        ) {
          break;
        }

        if (checkpoint.id != null) {
          SX.mapEngine?.passCheckpoint?.(checkpoint.id);
        }

        this.checkpointIndex++;

        this.dispatch("checkpoint", {
          checkpoint,
          index: this.checkpointIndex,
          total: this.checkpoints.length,
          progress
        });
      }
    },

    finish() {
      if (
        this.status !== "running" ||
        this.rewardClaimed
      ) {
        return this.result;
      }

      this.status = "finished";
      this.rewardClaimed = true;

      const elapsed = this.elapsedTime;

      let mapResult = null;

      if (SX.mapEngine?.state === "running") {
        mapResult = SX.mapEngine.finish?.({
          elapsedTime: elapsed
        }) || null;
      }

      let aiResult = null;

      if (SX.aiRacing?.active) {
        aiResult = SX.aiRacing.finishPlayer?.() || null;
      }

      const baseReward = Math.max(
        0,
        Number(this.map?.reward) || 100
      );

      const reward = mapResult
        ? Math.max(0, Number(mapResult.reward) || 0)
        : baseReward;

      const completed = {
        mode: this.mode,
        mapId: this.map?.id ?? null,
        time: elapsed,
        distance: this.distance,
        totalDistance: this.totalDistance,
        reward,
        position: this.getPlayerPosition(aiResult),
        completedAt: Date.now()
      };

      this.result = completed;

      if (!mapResult) {
        SX.addCoins?.(reward);
      }

      SX.addXP?.(
        Math.max(10, Math.round(this.distance / 100))
      );

      this.dispatch("finished", completed);

      return completed;
    },

    getPlayerPosition(standings) {
      if (!Array.isArray(standings) || !standings.length) {
        return 1;
      }

      const playerIndex = standings.findIndex(
        item => item?.id === "player"
      );

      return playerIndex === -1
        ? standings.length + 1
        : playerIndex + 1;
    },

    pause() {
      if (this.status !== "running") return false;

      this.status = "paused";

      SX.physics?.clearInput?.();

      this.dispatch("paused", this.getState());

      return true;
    },

    resume() {
      if (this.status !== "paused") return false;

      this.status = "running";
      this.previousFrame = Date.now();

      this.dispatch("resumed", this.getState());

      return true;
    },

    reset() {
      this.status = "idle";

      this.map = null;
      this.mode = "career";

      this.startTime = 0;
      this.elapsedTime = 0;
      this.distance = 0;
      this.totalDistance = 5000;

      this.playerPosition = 0;
      this.checkpoints = [];
      this.checkpointIndex = 0;

      this.result = null;
      this.previousFrame = 0;
      this.rewardClaimed = false;

      SX.physics?.clearInput?.();

      this.dispatch("reset", this.getState());

      return true;
    },

    setReady() {
      if (this.status !== "idle") return false;

      this.status = "ready";

      this.dispatch("ready", this.getState());

      return true;
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
    },

    dispatch(name, detail = {}) {
      window.dispatchEvent(
        new CustomEvent(`sx:race-${name}`, {
          detail
        })
      );
    }
  };

  SX.race = Race;

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 20
   END
========================================================= */
