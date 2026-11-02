
/* =========================================================
   SUPERX LEGEND — FILE 59
   FILE: js/mission-manager.js
   PURPOSE: Mission objectives, progress and rewards
   START
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const MissionManager = {
    missions: [],
    activeMission: null,
    completedMissions: [],
    initialized: false,

    storageKey: "superx_missions_v1",

    definitions: [
      {
        id: "first-drive",
        title: "First Drive",
        description: "Complete your first driving mission.",
        type: "races",
        target: 1,
        coins: 250,
        xp: 100
      },
      {
        id: "speed-master",
        title: "Speed Master",
        description: "Reach a speed of 200 km/h.",
        type: "speed",
        target: 200,
        coins: 350,
        xp: 150
      },
      {
        id: "road-explorer",
        title: "Road Explorer",
        description: "Travel 10 kilometres.",
        type: "distance",
        target: 10,
        coins: 400,
        xp: 180
      },
      {
        id: "map-explorer",
        title: "Map Explorer",
        description: "Complete 3 maps.",
        type: "maps",
        target: 3,
        coins: 500,
        xp: 200
      },
      {
        id: "car-collector",
        title: "Car Collector",
        description: "Purchase 2 cars.",
        type: "cars",
        target: 2,
        coins: 600,
        xp: 250
      },
      {
        id: "race-champion",
        title: "Race Champion",
        description: "Win 5 races.",
        type: "wins",
        target: 5,
        coins: 800,
        xp: 350
      }
    ],

    init() {
      if (this.initialized) return this.getAll();

      this.load();

      if (!this.missions.length) {
        this.missions = this.definitions.map(item => ({
          ...item,
          progress: 0,
          completed: false,
          claimed: false
        }));
      }

      this.bindEvents();
      this.initialized = true;
      this.save();

      return this.getAll();
    },

    bindEvents() {
      window.addEventListener(
        "sx:race-completed",
        event => {
          this.update("races", 1);

          if (event.detail && event.detail.won) {
            this.update("wins", 1);
          }
        }
      );

      window.addEventListener(
        "sx:map-completed",
        () => this.update("maps", 1)
      );

      window.addEventListener(
        "sx:car-purchased",
        () => this.update("cars", 1)
      );

      window.addEventListener(
        "sx:distance-updated",
        event => {
          const distance = Number(
            event.detail && event.detail.distance
          ) || 0;

          if (distance > 0) {
            this.update("distance", distance);
          }
        }
      );

      window.addEventListener(
        "sx:speed-updated",
        event => {
          const speed = Number(
            event.detail && event.detail.speed
          ) || 0;

          if (speed > 0) {
            this.updateMaximum("speed", speed);
          }
        }
      );
    },

    update(type, amount = 1) {
      const value = Math.max(0, Number(amount) || 0);

      if (!value) return [];

      const updated = [];

      this.missions.forEach(mission => {
        if (
          mission.type !== type ||
          mission.completed
        ) {
          return;
        }

        mission.progress = Math.min(
          mission.target,
          mission.progress + value
        );

        if (mission.progress >= mission.target) {
          mission.completed = true;
          updated.push(mission.id);

          this.emit("sx:mission-completed", {
            mission: this.getMission(mission.id)
          });
        }
      });

      this.save();

      return updated;
    },

    updateMaximum(type, value) {
      const updated = [];

      this.missions.forEach(mission => {
        if (
          mission.type !== type ||
          mission.completed
        ) {
          return;
        }

        mission.progress = Math.max(
          mission.progress,
          Math.min(mission.target, value)
        );

        if (mission.progress >= mission.target) {
          mission.completed = true;
          updated.push(mission.id);

          this.emit("sx:mission-completed", {
            mission: this.getMission(mission.id)
          });
        }
      });

      this.save();

      return updated;
    },

    claim(missionId) {
      const mission = this.getMission(missionId);

      if (!mission) {
        return {
          success: false,
          message: "Mission not found."
        };
      }

      if (!mission.completed) {
        return {
          success: false,
          message: "Mission is not completed."
        };
      }

      if (mission.claimed) {
        return {
          success: false,
          message: "Reward already claimed."
        };
      }

      if (typeof SX.addCoins === "function") {
        SX.addCoins(mission.coins);
      }

      if (typeof SX.addXP === "function") {
        SX.addXP(mission.xp);
      }

      mission.claimed = true;

      if (!this.completedMissions.includes(mission.id)) {
        this.completedMissions.push(mission.id);
      }

      this.save();

      this.emit("sx:mission-reward-claimed", {
        missionId: mission.id,
        coins: mission.coins,
        xp: mission.xp
      });

      return {
        success: true,
        coins: mission.coins,
        xp: mission.xp
      };
    },

    setActive(missionId) {
      const mission = this.getMission(missionId);

      if (!mission || mission.claimed) {
        return false;
      }

      this.activeMission = missionId;
      this.save();

      this.emit("sx:active-mission-changed", {
        missionId
      });

      return true;
    },

    getMission(id) {
      const mission = this.missions.find(
        item => item.id === id
      );

      return mission ? { ...mission } : null;
    },

    getActiveMission() {
      return this.activeMission
        ? this.getMission(this.activeMission)
        : null;
    },

    getAll() {
      return this.missions.map(mission => ({
        ...mission,
        percentage: Math.round(
          (mission.progress / mission.target) * 100
        )
      }));
    },

    getSummary() {
      const total = this.missions.length;
      const completed = this.missions.filter(
        item => item.completed
      ).length;

      const claimed = this.missions.filter(
        item => item.claimed
      ).length;

      return {
        total,
        completed,
        claimed,
        remaining: total - completed,
        claimable: completed - claimed
      };
    },

    load() {
      try {
        const raw = localStorage.getItem(this.storageKey);

        if (!raw) return false;

        const data = JSON.parse(raw);

        if (!data || !Array.isArray(data.missions)) {
          return false;
        }

        this.missions = data.missions;
        this.activeMission = data.activeMission || null;
        this.completedMissions =
          Array.isArray(data.completedMissions)
            ? data.completedMissions
            : [];

        return true;
      } catch (error) {
        console.warn(
          "[SUPERX Missions] Load failed:",
          error
        );

        return false;
      }
    },

    save() {
      try {
        localStorage.setItem(
          this.storageKey,
          JSON.stringify({
            missions: this.missions,
            activeMission: this.activeMission,
            completedMissions: this.completedMissions
          })
        );

        return true;
      } catch (error) {
        console.warn(
          "[SUPERX Missions] Save failed:",
          error
        );

        return false;
      }
    },

    reset() {
      this.missions = this.definitions.map(item => ({
        ...item,
        progress: 0,
        completed: false,
        claimed: false
      }));

      this.activeMission = null;
      this.completedMissions = [];

      this.save();

      return this.getAll();
    },

    emit(name, detail) {
      window.dispatchEvent(
        new CustomEvent(name, { detail })
      );
    }
  };

  SX.missionManager = MissionManager;

  window.addEventListener(
    "DOMContentLoaded",
    () => MissionManager.init(),
    { once: true }
  );

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 59
   FILE: js/mission-manager.js
   END
========================================================= */
