/* =========================================================
   SUPERX LEGEND — FILE 19
   FILE: js/ai-racing.js
   START
========================================================= */

(function () {
  "use strict";

  window.SUPERX = window.SUPERX || {};
  const SX = window.SUPERX;

  const emit = (name, detail = {}) => {
    window.dispatchEvent(new CustomEvent("sx:" + name, { detail }));
  };

  SX.aiRacing = {
    opponents: [],
    scene: null,
    active: false,
    difficulty: "medium",
    raceTime: 0,
    playerProgress: 0,
    finishOrder: [],
    opponentId: 0,

    settings: {
      easy:   { speedMultiplier: 0.72, reaction: 0.45, aggression: 0.12 },
      medium: { speedMultiplier: 0.88, reaction: 0.70, aggression: 0.30 },
      hard:   { speedMultiplier: 1.02, reaction: 0.92, aggression: 0.55 }
    },

    init(scene, options = {}) {
      this.reset();

      if (!window.THREE || !scene) return false;

      this.scene = scene;
      this.difficulty = this.settings[options.difficulty]
        ? options.difficulty
        : "medium";

      const count = Math.max(
        1,
        Math.min(11, Number(options.opponents) || 5)
      );

      for (let i = 0; i < count; i++) {
        this.createOpponent(i);
      }

      emit("ai-ready", {
        count: this.opponents.length,
        difficulty: this.difficulty
      });

      return this.opponents;
    },

    createOpponent(index) {
      if (!window.THREE || !this.scene) return null;

      const THREE = window.THREE;
      const colors = [
        0xe53945, 0x2676d2, 0xf0b52d, 0x31a77c,
        0x9b59b6, 0xe5e5e5, 0xe07835, 0x353535,
        0x17a2a4, 0x8b9c32, 0xb63e80
      ];

      const group = new THREE.Group();

      const bodyMaterial = new THREE.MeshStandardMaterial({
        color: colors[index % colors.length],
        metalness: 0.55,
        roughness: 0.34
      });

      const glassMaterial = new THREE.MeshStandardMaterial({
        color: 0x263344,
        metalness: 0.4,
        roughness: 0.22
      });

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.8, 4.3),
        bodyMaterial
      );
      body.position.y = 0.85;
      body.castShadow = true;
      group.add(body);

      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.65, 0.7, 2),
        glassMaterial
      );
      cabin.position.set(0, 1.55, -0.25);
      cabin.castShadow = true;
      group.add(cabin);

      const wheelGeometry = new THREE.CylinderGeometry(
        0.42, 0.42, 0.28, 12
      );

      const wheelMaterial = new THREE.MeshStandardMaterial({
        color: 0x101014,
        roughness: 0.9
      });

      const wheels = [];

      [
        [-0.98, 0.45, 1.35],
        [0.98, 0.45, 1.35],
        [-0.98, 0.45, -1.35],
        [0.98, 0.45, -1.35]
      ].forEach(position => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(...position);
        wheel.castShadow = true;
        group.add(wheel);
        wheels.push(wheel);
      });

      const lane = index % 2 === 0 ? -1 : 1;
      const row = Math.floor(index / 2);

      group.position.set(lane * 2.7, 0, 12 + row * 9);
      group.userData.wheels = wheels;

      this.scene.add(group);

      const opponent = {
        id: ++this.opponentId,
        mesh: group,
        lane,
        speed: 0,
        targetSpeed: 0,
        progress: 0,
        finished: false,
        finishTime: null,
        reactionTimer: Math.random(),
        laneChangeTimer: 3 + Math.random() * 5,
        skill: 0.88 + Math.random() * 0.24
      };

      this.opponents.push(opponent);
      return opponent;
    },

    start() {
      if (!this.opponents.length || !this.scene) return false;

      this.active = true;
      this.raceTime = 0;
      this.playerProgress = 0;
      this.finishOrder = [];

      this.opponents.forEach((opponent, index) => {
        opponent.finished = false;
        opponent.finishTime = null;
        opponent.progress = 0;
        opponent.speed = 0;
        opponent.targetSpeed = 0;
        opponent.reactionTimer = 0.5 + index * 0.15;
      });

      emit("ai-start", { opponents: this.opponents.length });
      return true;
    },

    update(deltaTime, playerData = {}) {
      if (!this.active) return null;

      const dt = Math.min(
        0.05,
        Math.max(0, Number(deltaTime) || 0)
      );

      this.raceTime += dt;

      const difficulty = this.settings[this.difficulty];

      const playerSpeed = Math.max(
        0,
        Number(playerData.speed) || 0
      );

      this.playerProgress = Math.max(
        0,
        Number(playerData.progress) || 0
      );

      const finishDistance = Number(playerData.finishDistance) || 0;

      this.opponents.forEach(opponent => {
        if (opponent.finished) return;

        opponent.reactionTimer -= dt;

        if (opponent.reactionTimer <= 0) {
          this.updateOpponentDecision(
            opponent,
            difficulty,
            playerSpeed
          );

          opponent.reactionTimer = 0.7 + Math.random() * 1.1;
        }

        const acceleration = 18 * dt;

        if (opponent.speed < opponent.targetSpeed) {
          opponent.speed = Math.min(
            opponent.targetSpeed,
            opponent.speed + acceleration
          );
        } else {
          opponent.speed = Math.max(
            opponent.targetSpeed,
            opponent.speed - acceleration
          );
        }

        // Speed is stored in km/h; movement is calculated in metres.
        const movement = (opponent.speed / 3.6) * dt;

        opponent.progress += movement;

        if (opponent.mesh) {
          opponent.mesh.position.z -= movement;

          const targetX = opponent.lane * 2.7;
          opponent.mesh.position.x +=
            (targetX - opponent.mesh.position.x) *
            Math.min(1, dt * 1.5);

          opponent.mesh.userData.wheels?.forEach(wheel => {
            wheel.rotation.x += movement / 0.42;
          });
        }

        if (
          finishDistance > 0 &&
          opponent.progress >= finishDistance
        ) {
          opponent.progress = finishDistance;
          this.finishOpponent(opponent);
        }
      });

      return this.getStandings();
    },

    updateOpponentDecision(opponent, difficulty, playerSpeed) {
      const baseSpeed = 105 * difficulty.speedMultiplier;
      let targetSpeed = baseSpeed * opponent.skill;

      if (playerSpeed > targetSpeed) {
        targetSpeed += Math.random() * 8 * difficulty.aggression;
      }

      targetSpeed *= 0.94 + Math.random() * 0.12;

      opponent.targetSpeed = Math.max(
        25,
        Math.min(220, targetSpeed)
      );

      if (Math.random() < difficulty.reaction * 0.12) {
        opponent.lane = Math.random() > 0.5 ? -1 : 1;
      }
    },

    finishOpponent(opponent) {
      if (opponent.finished) return false;

      opponent.finished = true;
      opponent.finishTime = this.raceTime;

      this.finishOrder.push({
        id: opponent.id,
        time: opponent.finishTime,
        progress: opponent.progress,
        type: "AI"
      });

      emit("ai-opponent-finished", {
        id: opponent.id,
        time: opponent.finishTime
      });

      return true;
    },

    finishPlayer() {
      if (!this.active) return null;

      this.finishOrder.push({
        id: "player",
        time: this.raceTime,
        progress: this.playerProgress,
        type: "PLAYER"
      });

      this.active = false;

      const standings = this.getStandings();

      emit("ai-race-finished", { standings });

      return standings;
    },

    getStandings() {
      const standings = this.finishOrder.slice();

      this.opponents.forEach(opponent => {
        if (!opponent.finished) {
          standings.push({
            id: opponent.id,
            progress: opponent.progress,
            time: null,
            type: "AI"
          });
        }
      });

      standings.sort((a, b) => {
        if (a.time !== null && b.time !== null) {
          return a.time - b.time;
        }

        if (a.time !== null) return -1;
        if (b.time !== null) return 1;

        return (b.progress || 0) - (a.progress || 0);
      });

      return standings;
    },

    getPlayerPosition() {
      const standings = this.getStandings();
      const index = standings.findIndex(item => item.type === "PLAYER");
      return index === -1 ? null : index + 1;
    },

    setDifficulty(level) {
      if (!this.settings[level]) return false;
      this.difficulty = level;
      return true;
    },

    setOpponentCount(count) {
      if (!this.scene) return false;

      const target = Math.max(1, Math.min(11, Number(count) || 1));

      while (this.opponents.length > target) {
        const opponent = this.opponents.pop();
        this.disposeOpponent(opponent);
      }

      while (this.opponents.length < target) {
        this.createOpponent(this.opponents.length);
      }

      return true;
    },

    disposeOpponent(opponent) {
      if (!opponent || !opponent.mesh) return;

      if (this.scene) this.scene.remove(opponent.mesh);

      opponent.mesh.traverse(object => {
        if (object.geometry) object.geometry.dispose();

        if (object.material) {
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];

          materials.forEach(material => material.dispose());
        }
      });
    },

    reset() {
      this.opponents.forEach(opponent => {
        this.disposeOpponent(opponent);
      });

      this.opponents = [];
      this.finishOrder = [];
      this.active = false;
      this.raceTime = 0;
      this.playerProgress = 0;
      this.scene = null;
    },

    dispose() {
      this.reset();
    }
  };

})();

/* =========================================================
   SUPERX LEGEND — FILE 19
   END
========================================================= */

