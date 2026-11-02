
/* =====================================================
   SUPERX LEGEND RACING
   FILE 13: js/maps-data.js
   START
===================================================== */

(function () {
  "use strict";

  const SX = window.SUPERX;

  if (!SX || !SX.WORLDS) {
    console.error("SUPERX world configuration missing.");
    return;
  }

  SX.maps = {};

  // MAP ENVIRONMENT DEFINITIONS
  SX.maps.environments = {
    village: {
      roadTypes: ["village-road", "narrow-road", "rural-highway"],
      scenery: ["houses", "fields", "trees", "farms", "bridges"],
      traffic: ["tractor", "car", "bike", "bus"],
      weather: ["clear", "rain", "fog"]
    },

    city: {
      roadTypes: ["city-street", "wide-road", "flyover", "downtown"],
      scenery: ["buildings", "shops", "streetlights", "bridges"],
      traffic: ["car", "bus", "taxi", "truck"],
      weather: ["clear", "rain", "fog"]
    },

    mountains: {
      roadTypes: ["mountain-road", "hairpin-road", "cliff-road"],
      scenery: ["mountains", "rocks", "tunnels", "pine-trees"],
      traffic: ["car", "bus", "truck"],
      weather: ["clear", "fog", "rain"]
    },

    snow: {
      roadTypes: ["snow-road", "icy-road", "mountain-snow-road"],
      scenery: ["snow-trees", "ice", "snow-hills", "cabins"],
      traffic: ["car", "bus", "snow-truck"],
      weather: ["snow", "fog", "clear"]
    },

    desert: {
      roadTypes: ["desert-highway", "sand-road", "rocky-road"],
      scenery: ["sand-dunes", "rocks", "cactus", "desert-hills"],
      traffic: ["car", "truck", "offroad"],
      weather: ["clear", "fog"]
    },

    forest: {
      roadTypes: ["forest-road", "woodland-road", "river-road"],
      scenery: ["forest-trees", "rivers", "wooden-bridges", "hills"],
      traffic: ["car", "truck", "jeep"],
      weather: ["clear", "rain", "fog"]
    },

    highway: {
      roadTypes: ["expressway", "six-lane-highway", "toll-road"],
      scenery: ["toll-plaza", "signboards", "bridges", "service-area"],
      traffic: ["car", "bus", "truck", "sports-car"],
      weather: ["clear", "rain"]
    },

    "racing-arena": {
      roadTypes: ["race-circuit", "technical-circuit", "speed-track"],
      scenery: ["grandstands", "pit-lane", "barriers", "race-towers"],
      traffic: ["race-car"],
      weather: ["clear", "rain"]
    }
  };

  // MAP CHALLENGES
  SX.maps.objectives = [
    "finish",
    "time-trial",
    "checkpoint",
    "distance",
    "traffic-challenge",
    "clean-drive",
    "racing"
  ];

  // MAP DIFFICULTY
  SX.maps.getDifficulty = function (mapNumber) {
    if (mapNumber <= 20) return "Easy";
    if (mapNumber <= 45) return "Normal";
    if (mapNumber <= 70) return "Hard";
    if (mapNumber <= 90) return "Expert";
    return "Legend";
  };

  // MAP REWARD
  SX.maps.getReward = function (mapNumber, worldIndex) {
    return Math.floor(
      100 +
      mapNumber * 18 +
      worldIndex * 35
    );
  };

  // CREATE ONE MAP
  SX.maps.createMap = function (world, worldIndex, mapNumber) {
    const environment =
      SX.maps.environments[world.id];

    const objectiveIndex =
      (mapNumber + worldIndex * 2) %
      SX.maps.objectives.length;

    const objective =
      SX.maps.objectives[objectiveIndex];

    const weatherIndex =
      (mapNumber + worldIndex) %
      environment.weather.length;

    const roadIndex =
      (mapNumber * 3 + worldIndex) %
      environment.roadTypes.length;

    const sceneryIndex =
      (mapNumber * 5 + worldIndex) %
      environment.scenery.length;

    const trafficIndex =
      (mapNumber + worldIndex * 3) %
      environment.traffic.length;

    const distance = 2 + (mapNumber % 9) * 1.5;

    return {
      id: world.id + "-map-" + String(mapNumber).padStart(3, "0"),

      worldId: world.id,
      worldName: world.name,

      number: mapNumber,
      title: world.name + " - Map " + mapNumber,

      difficulty: SX.maps.getDifficulty(mapNumber),

      objective: objective,

      roadType: environment.roadTypes[roadIndex],
      scenery: environment.scenery[sceneryIndex],
      trafficType: environment.traffic[trafficIndex],

      weather: environment.weather[weatherIndex],

      timeOfDay:
        mapNumber % 3 === 0
          ? "night"
          : mapNumber % 3 === 1
            ? "day"
            : "sunset",

      distance: Number(distance.toFixed(1)),

      targetTime: Math.floor(90 + distance * 18),

      reward: SX.maps.getReward(
        mapNumber,
        worldIndex
      ),

      aiOpponents:
        world.id === "racing-arena"
          ? 3 + (mapNumber % 5)
          : 0,

      unlocked: mapNumber === 1,

      generated: true
    };
  };

  // GENERATE ALL MAPS
  SX.maps.generateAll = function () {
    const allMaps = [];

    SX.WORLDS.forEach(function (world, worldIndex) {
      for (let number = 1; number <= world.maps; number++) {
        allMaps.push(
          SX.maps.createMap(
            world,
            worldIndex,
            number
          )
        );
      }
    });

    return allMaps;
  };

  // STORE ALL MAPS
  SX.maps.all = SX.maps.generateAll();

  // GET WORLD MAPS
  SX.maps.getWorldMaps = function (worldId) {
    return SX.maps.all.filter(function (map) {
      return map.worldId === worldId;
    });
  };

  // GET MAP BY ID
  SX.maps.getMap = function (mapId) {
    return SX.maps.all.find(function (map) {
      return map.id === mapId;
    }) || null;
  };

  // GET MAP BY NUMBER
  SX.maps.getMapNumber = function (worldId, number) {
    return SX.maps.getMap(
      worldId + "-map-" +
      String(number).padStart(3, "0")
    );
  };

  // CHECK MAP COMPLETION
  SX.maps.isCompleted = function (mapId) {
    return SX.player.completedMaps.includes(mapId);
  };

  // CHECK MAP UNLOCK
  SX.maps.isUnlocked = function (map) {
    if (!map) return false;

    if (map.number === 1) return true;

    const previousMapId =
      map.worldId +
      "-map-" +
      String(map.number - 1).padStart(3, "0");

    return SX.maps.isCompleted(previousMapId);
  };

  // WORLD PROGRESS
  SX.maps.getWorldProgress = function (worldId) {
    const maps = SX.maps.getWorldMaps(worldId);

    const completed = maps.filter(function (map) {
      return SX.maps.isCompleted(map.id);
    }).length;

    return {
      total: maps.length,
      completed: completed,
      percentage: Math.round(
        (completed / maps.length) * 100
      )
    };
  };

  // NEXT AVAILABLE MAP
  SX.maps.getNextMap = function (worldId) {
    const maps = SX.maps.getWorldMaps(worldId);

    return maps.find(function (map) {
      return (
        SX.maps.isUnlocked(map) &&
        !SX.maps.isCompleted(map.id)
      );
    }) || null;
  };

  // MAP SYSTEM INFORMATION
  SX.maps.getSummary = function () {
    return {
      worlds: SX.WORLDS.length,
      totalMaps: SX.maps.all.length,
      completedMaps: SX.player.completedMaps.length,
      availableWorlds: SX.WORLDS.map(function (world) {
        return world.id;
      })
    };
  };

  console.log(
    "SUPERX MAP DATA READY:",
    SX.maps.getSummary()
  );

})();

/* =====================================================
   FILE 13: js/maps-data.js
   END
===================================================== */
