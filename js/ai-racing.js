
/* =========================================================
   SUPERX LEGEND — FILE 19
   FILE: js/ai-racing.js
   START
========================================================= */

(function () {
  "use strict";

  window.SUPERX = window.SUPERX || {};
  const SX = window.SUPERX;

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
      easy: {
        speedMultiplier: 0.68,
        reaction: 0.45,
        aggression: 0.15
      },
      medium: {
        speedMultiplier: 0.84,
        reaction: 0.7,
        aggression: 0.35
      },
      hard: {
        speedMultiplier: 0.98,
        reaction: 0.9,
        aggression: 0.6
      }
    },

    init(scene, options = {}) {
      this.reset();

      this.scene = scene || null;
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

      return this.opponents;
    },

    createOpponent(index) {
      if (!window.THREE || !this.scene) {
        return null;
      }

      const THREE = window.THREE;

      const colors = [
        0xe53945,
        0x2676d2,
        0xf0b52d,
        0x31a77c,
        0x9b59b6,
        0xe5e5e5,
        0xe07835,
        0x353535
      ];

      const group = new THREE.Group();

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.8, 4.3),
        new THREE.MeshStandardMaterial({
          color: colors[index % colors.length],
          metalness: 0.5,
          roughness: 0.35
        })
      );

      body.position.y = 0.85;
      body.castShadow = true;
      group.add(body);

      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.65, 0.7, 2),
        new THREE.MeshStandardMaterial({
          color: 0x263344,
          metalness: 0.4,
          roughness: 0.25
        })
      );

      cabin.position.set(0, 1.55, -0.25);
      group.add(cabin);

      const wheelGeometry = new THREE.CylinderGeometry(
        0.42,
        0.42,
        0.28,
        12
      );

      const wheelMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111
      });

      [
        [-0.98, 0.45, 1.35],
        [0.98, 0.45, 1.35],
        [-0.98, 0.45, -1.35],
        [0.98, 0.45, -1.35]
      ].forEach(position => {
        const wheel = new THREE.Mesh(
          wheelGeometry,
          wheelMaterial
        );

        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(...position);
        group.add(wheel);
      });

      const lane = index % 2 === 0 ? -1 : 1;
      const row = Math.floor(index / 2);

      group.position.set(
        lane * 2.7,
        0,
        12 + row * 9
      );

      this.scene.add(group);

      const opponent = {
        id: ++this.opponentId,
        mesh: group,
        lane: lane,
        speed: 0,
        targetSpeed: 0,
        progress: 0,
        finished: false,
        finishTime: null,
        reactionTimer: Math.random(),
        laneChangeTimer: 3 + Math.random() * 5,
        skill: 0.85 + Math.random() * 0.3
      };

      this.opponents.push(opponent);

      return opponent;
    },

    start() {
      if (!this.opponents.length) return false;

      this.active = true;
      this.raceTime = 0;
      this.finishOrder = [];

      this.opponents.forEach(opponent => {
        opponent.finished = false;
        opponent.finishTime = null;
        opponent.progress = 0;
      });

      return true;
    },

    update(deltaTime, playerData = {}) {
      if (!this.active) return;

      const dt = Math.min(
        Math.max(Number(deltaTime) || 0, 0),
        0.05
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

      this.opponents.forEach(opponent => {
        if (opponent.finished) return;

        opponent.reactionTimer -= dt;

        if (opponent.reactionTimer <= 0) {
          this.updateOpponentDecision(
            opponent,
            difficulty,
            playerSpeed
          );

          opponent.reactionTimer =
            0.6 + Math.random() * 1.2;
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

        const movement = opponent.speed * dt;

        opponent.progress += movement;

        if (opponent.mesh) {
          opponent.mesh.position.z -= movement;

          const targetX = opponent.lane * 2.7;

          opponent.mesh.position.x +=
            (targetX - opponent.mesh.position.x) *
            Math.min(1, dt * 1.5);
        }

        if (
          playerData.finishDistance &&
          opponent.progress >= Number(playerData.finishDistance)
        ) {
          this.finishOpponent(opponent);
        }
      });

      return this.getStandings();
    },

    updateOpponentDecision(opponent, difficulty, playerSpeed) {
      const baseSpeed = 105 * difficulty.speedMultiplier;

      const skillAdjustment = opponent.skill;

      let targetSpeed =
        baseSpeed * skillAdjustment;

      if (playerSpeed > targetSpeed) {
        targetSpeed +=
          Math.random() *
          8 *
          difficulty.aggression;
      }

      targetSpeed *= 0.92 + Math.random() * 0.16;

      opponent.targetSpeed = Math.max(
        25,
        Math.min(220, targetSpeed)
      );

      if (Math.random() < difficulty.reaction * 0.12) {
        opponent.lane = Math.random() > 0.5 ? -1 : 1;
      }
    },

    finishOpponent(opponent) {
      if (opponent.finished) return;

      opponent.finished = true;
      opponent.finishTime = this.raceTime;

      this.finishOrder.push({
        id: opponent.id,
        time: opponent.finishTime,
        type: "AI"
      });
    },

    finishPlayer() {
      if (!this.active) return null;

      this.finishOrder.push({
        id: "player",
        time: this.raceTime,
        type: "PLAYER"
      });

      this.active = false;

      return this.getStandings();
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

    setDifficulty(level) {
      if (!this.settings[level]) return false;

      this.difficulty = level;
      return true;
    },

    reset() {
      this.opponents.forEach(opponent => {
        if (this.scene && opponent.mesh) {
          this.scene.remove(opponent.mesh);
        }

        if (opponent.mesh) {
          opponent.mesh.traverse(object => {
            if (object.geometry) object.geometry.dispose();

            if (object.material) {
              const materials = Array.isArray(object.material)
                ? object.material
                : [object.material];

              materials.forEach(material => material.dispose());
            }
          });
        }
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
