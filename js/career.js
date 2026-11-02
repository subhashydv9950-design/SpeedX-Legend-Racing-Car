
/* =========================================================
   SUPERX LEGEND — FILE 27
   FILE: js/career.js
   START
========================================================= */

(function () {
  "use strict";

  window.SUPERX = window.SUPERX || {};
  const SX = window.SUPERX;

  const WORLD_CONFIG = [
    {
      id: "village",
      name: "Village",
      description: "Rural roads, farms and village racing.",
      environment: "village",
      icon: "🌾",
      color: "#79a85b",
      difficulty: 1
    },
    {
      id: "city",
      name: "City",
      description: "Urban streets, traffic and sharp turns.",
      environment: "city",
      icon: "🏙️",
      color: "#8d83d9",
      difficulty: 2
    },
    {
      id: "mountains",
      name: "Mountains",
      description: "Steep roads and challenging mountain turns.",
      environment: "mountains",
      icon: "⛰️",
      color: "#a58b72",
      difficulty: 3
    },
    {
      id: "snow",
      name: "Snow World",
      description: "Snow-covered roads and slippery conditions.",
      environment: "snow",
      icon: "❄️",
      color: "#80bde2",
      difficulty: 4
    },
    {
      id: "desert",
      name: "Desert",
      description: "Long desert routes and sandy surroundings.",
      environment: "desert",
      icon: "🏜️",
      color: "#d7a45e",
      difficulty: 3
    },
    {
      id: "forest",
      name: "Forest",
      description: "Narrow forest roads and winding tracks.",
      environment: "forest",
      icon: "🌲",
      color: "#4e9870",
      difficulty: 4
    },
    {
      id: "highway",
      name: "Highway",
      description: "High-speed driving and long-distance races.",
      environment: "highway",
      icon: "🛣️",
      color: "#72869d",
      difficulty: 5
    },
    {
      id: "racing",
      name: "Racing Arena",
      description: "Competitive circuits against AI opponents.",
      environment: "racing",
      icon: "🏁",
      color: "#c16bd7",
      difficulty: 5
    }
  ];

  const MAPS_PER_WORLD = 100;

  const LAYOUTS = [
    "straight",
    "curved",
    "hairpin",
    "loop",
    "zigzag",
    "mixed",
    "circuit",
    "sprint",
    "hill-climb",
    "technical"
  ];

  const OBJECTIVES = [
    "finish",
    "time-trial",
    "distance",
    "checkpoint",
    "overtake",
    "ai-race"
  ];

  let initialized = false;

  function getMapId(worldId, number) {
    return worldId + "-" + String(number).padStart(3, "0");
  }

  function getWorld(worldId) {
    return WORLD_CONFIG.find(function (world) {
      return world.id === worldId;
    }) || null;
  }

  function getWorldIndex(worldId) {
    return WORLD_CONFIG.findIndex(function (world) {
      return world.id === worldId;
    });
  }

  function isMapUnlocked(worldId, number) {
    if (!SX.maps || typeof SX.maps.isUnlocked !== "function") {
      return number === 1;
    }

    return SX.maps.isUnlocked(getMapId(worldId, number));
  }

  function getMap(worldId, number) {
    const world = getWorld(worldId);

    if (!world || number < 1 || number > MAPS_PER_WORLD) {
      return null;
    }

    const mapId = getMapId(worldId, number);

    if (SX.maps && typeof SX.maps.getMap === "function") {
      const map = SX.maps.getMap(mapId);
      if (map) return map;
    }

    return createMap(world, number);
  }

  function createMap(world, number) {
    const worldIndex = getWorldIndex(world.id);
    const seed = worldIndex * 1000 + number;

    const layout = LAYOUTS[seed % LAYOUTS.length];
    const objective = world.id === "racing"
      ? "ai-race"
      : OBJECTIVES[(seed + number) % OBJECTIVES.length];

    const difficulty = Math.min(
      10,
      world.difficulty + Math.floor((number - 1) / 12)
    );

    const distance = 1500 + number * 180 + worldIndex * 250;

    const timeLimit = Math.max(
      35,
      Math.round(distance / (45 + difficulty * 5))
    );

    return {
      id: getMapId(world.id, number),
      worldId: world.id,
      worldName: world.name,
      number: number,
      name: world.name + " " + String(number).padStart(2, "0"),
      environment: world.environment,
      layout: layout,
      objective: objective,
      difficulty: difficulty,
      distance: distance,
      timeLimit: timeLimit,
      reward: 150 + difficulty * 55 + number * 8,
      xpReward: 40 + difficulty * 15 + number * 3,
      opponents: objective === "ai-race" ? 5 : 0,
      weather: world.id === "snow" ? "snow" : "clear",
      timeOfDay: number % 4 === 0 ? "sunset" : "day",
      unlocked: isMapUnlocked(world.id, number)
    };
  }

  function getWorldProgress(worldId) {
    const completed = SX.maps &&
      typeof SX.maps.getCompletedCount === "function"
      ? SX.maps.getCompletedCount(worldId)
      : 0;

    const unlocked = SX.maps &&
      typeof SX.maps.getUnlockedCount === "function"
      ? SX.maps.getUnlockedCount(worldId)
      : 1;

    return {
      completed: completed,
      unlocked: Math.min(MAPS_PER_WORLD, Math.max(1, unlocked)),
      total: MAPS_PER_WORLD,
      percentage: Math.round(
        (completed / MAPS_PER_WORLD) * 100
      )
    };
  }

  function getWorlds() {
    return WORLD_CONFIG.map(function (world) {
      const progress = getWorldProgress(world.id);

      return Object.assign({}, world, {
        progress: progress,
        firstMap: getMap(world.id, 1),
        unlocked: progress.unlocked > 0
      });
    });
  }

  function getMaps(worldId, options) {
    options = options || {};

    const world = getWorld(worldId);
    if (!world) return [];

    const start = Math.max(
      1,
      Math.min(MAPS_PER_WORLD, Number(options.start) || 1)
    );

    const limit = Math.max(
      1,
      Math.min(100, Number(options.limit) || 20)
    );

    const end = Math.min(MAPS_PER_WORLD, start + limit - 1);

    const maps = [];

    for (let number = start; number <= end; number++) {
      const map = createMap(world, number);

      if (options.unlockedOnly && !map.unlocked) continue;

      maps.push(map);
    }

    return maps;
  }

  function getNextMap(worldId) {
    const world = getWorld(worldId);
    if (!world) return null;

    const progress = getWorldProgress(worldId);

    const nextNumber = Math.min(
      MAPS_PER_WORLD,
      progress.completed + 1
    );

    return getMap(worldId, nextNumber);
  }

  function selectMap(worldId, number) {
    const map = getMap(worldId, number);

    if (!map) {
      return {
        success: false,
        message: "Map not found."
      };
    }

    if (!isMapUnlocked(worldId, number)) {
      return {
        success: false,
        message: "Complete previous maps to unlock this map."
      };
    }

    if (SX.mapEngine && typeof SX.mapEngine.init === "function") {
      SX.mapEngine.init(map.id);
    }

    document.dispatchEvent(
      new CustomEvent("superx:careerMapSelected", {
        detail: { map: map }
      })
    );

    return {
      success: true,
      map: map
    };
  }

  function getOverview() {
    const worlds = getWorlds();

    const completed = worlds.reduce(function (total, world) {
      return total + world.progress.completed;
    }, 0);

    const unlocked = worlds.reduce(function (total, world) {
      return total + world.progress.unlocked;
    }, 0);

    return {
      totalWorlds: WORLD_CONFIG.length,
      totalMaps: WORLD_CONFIG.length * MAPS_PER_WORLD,
      completedMaps: completed,
      unlockedMaps: unlocked,
      remainingMaps: WORLD_CONFIG.length * MAPS_PER_WORLD - completed,
      percentage: Math.round(
        (completed / (WORLD_CONFIG.length * MAPS_PER_WORLD)) * 100
      ),
      worlds: worlds
    };
  }

  function init() {
    initialized = true;

    document.dispatchEvent(
      new CustomEvent("superx:careerReady", {
        detail: getOverview()
      })
    );

    return getOverview();
  }

  function getState() {
    return {
      initialized: initialized,
      worlds: WORLD_CONFIG.length,
      mapsPerWorld: MAPS_PER_WORLD,
      totalMaps: WORLD_CONFIG.length * MAPS_PER_WORLD
    };
  }

  SX.career = {
    init: init,
    getWorlds: getWorlds,
    getWorld: getWorld,
    getMap: getMap,
    getMaps: getMaps,
    getWorldProgress: getWorldProgress,
    getNextMap: getNextMap,
    selectMap: selectMap,
    getOverview: getOverview,
    getState: getState,
    MAPS_PER_WORLD: MAPS_PER_WORLD
  };

})();

/* =========================================================
   SUPERX LEGEND — FILE 27
   END
========================================================= */
