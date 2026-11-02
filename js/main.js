/* =========================================
   SUPERX LEGEND
   PART 28 — MAIN GAME SYSTEM
   FILE: js/main.js
========================================= */

"use strict";

const SuperX = {
  coins: 2500,
  selectedCar: 0,
  selectedMode: 0,
  selectedMap: 1,
  selectedWorld: "Village",
  currentScreen: "homeScreen",
  unlockedCars: [0, 1],
  unlockedMaps: {},
  upgrades: {},
  language: "en",
  isRacing: false
};

const CAR_DATA = [
  {name:"NIGHTFALL GT",speed:240,acceleration:70,handling:75,price:0},
  {name:"SHADOW RS",speed:260,acceleration:74,handling:78,price:0},
  {name:"PHANTOM X",speed:280,acceleration:78,handling:77,price:3500},
  {name:"STORM GT",speed:300,acceleration:80,handling:79,price:5000},
  {name:"VENOM R",speed:320,acceleration:82,handling:80,price:7000},
  {name:"FALCON S",speed:340,acceleration:84,handling:82,price:9000},
  {name:"TITAN V8",speed:350,acceleration:82,handling:78,price:11000},
  {name:"APEX R",speed:370,acceleration:87,handling:84,price:13000},
  {name:"VIPER Z",speed:390,acceleration:88,handling:82,price:15000},
  {name:"INFERNO",speed:400,acceleration:89,handling:83,price:17000},
  {name:"BLAZE XR",speed:410,acceleration:90,handling:85,price:19000},
  {name:"TURBO X",speed:420,acceleration:91,handling:86,price:22000},
  {name:"RAPTOR GT",speed:430,acceleration:92,handling:85,price:25000},
  {name:"ECLIPSE",speed:440,acceleration:93,handling:87,price:28000},
  {name:"NOVA R",speed:450,acceleration:94,handling:88,price:31000},
  {name:"SPECTRE",speed:455,acceleration:94,handling:86,price:34000},
  {name:"HURRICANE",speed:460,acceleration:95,handling:89,price:37000},
  {name:"VORTEX",speed:465,acceleration:95,handling:90,price:40000},
  {name:"DARK HORSE",speed:470,acceleration:96,handling:88,price:43000},
  {name:"THUNDER",speed:475,acceleration:96,handling:90,price:46000},
  {name:"CYCLONE",speed:480,acceleration:97,handling:91,price:49000},
  {name:"WILDFIRE",speed:485,acceleration:97,handling:90,price:52000},
  {name:"HYPERION",speed:490,acceleration:98,handling:92,price:55000},
  {name:"ZENITH",speed:495,acceleration:98,handling:93,price:58000},
  {name:"OBLIVION",speed:500,acceleration:98,handling:91,price:61000},
  {name:"BLACKOUT",speed:505,acceleration:99,handling:93,price:64000},
  {name:"QUANTUM",speed:510,acceleration:99,handling:94,price:67000},
  {name:"ETERNITY",speed:515,acceleration:99,handling:94,price:70000},
  {name:"APOCALYPSE",speed:518,acceleration:100,handling:95,price:75000},
  {name:"LEGEND ONE",speed:520,acceleration:100,handling:96,price:80000},
  {name:"SILVER ARROW",speed:360,acceleration:85,handling:92,price:12000},
  {name:"ROYAL GT",speed:385,acceleration:89,handling:88,price:20000},
  {name:"DRAGON RS",speed:445,acceleration:94,handling:87,price:32000},
  {name:"NIGHT RIDER",speed:475,acceleration:97,handling:92,price:54000},
  {name:"SUPERX ONE",speed:520,acceleration:100,handling:100,price:100000}
];

const MAP_MODES = [
  {name:"Village",icon:"🌾",desc:"Rural roads & farms"},
  {name:"City",icon:"🌆",desc:"Traffic & highways"},
  {name:"Mountain",icon:"⛰️",desc:"Curves & cliffs"},
  {name:"High Hills",icon:"🏔️",desc:"Steep winding roads"},
  {name:"Snowfall",icon:"❄️",desc:"Snow & icy roads"},
  {name:"Desert",icon:"🏜️",desc:"Long desert routes"},
  {name:"Forest",icon:"🌲",desc:"Woodland roads"},
  {name:"Coastal",icon:"🌊",desc:"Ocean-side driving"}
];

const $ = id => document.getElementById(id);

function showToast(message) {
  const toast = $("toast");
  if (!toast) {
    console.log("SUPERX:", message);
    return;
  }

  toast.textContent = message;
  toast.classList.add("visible");

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove("visible");
  }, 2400);
}

function showScreen(screenId) {
  const target = $(screenId);
  if (!target) {
    showToast("This section is not ready yet.");
    return;
  }

  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.remove("active");
  });

  target.classList.add("active");
  SuperX.currentScreen = screenId;

  closeMenu();

  if (screenId === "garageScreen") updateGarage();
  if (screenId === "careerScreen") renderMapGrid();

  window.SuperX3D?.resize?.();
}

function openMenu() {
  $("menuDrawer")?.classList.add("open");
  $("drawerBackdrop")?.classList.add("visible");
}

function closeMenu() {
  $("menuDrawer")?.classList.remove("open");
  $("drawerBackdrop")?.classList.remove("visible");
}

function openDialog(title, content) {
  const heading = $("dialogTitle");
  const body = $("dialogContent");
  const backdrop = $("dialogBackdrop");

  if (!heading || !body || !backdrop) return;

  heading.textContent = title;
  body.replaceChildren();

  if (content instanceof Node) {
    body.appendChild(content);
  } else {
    body.textContent = content;
  }

  backdrop.classList.add("visible");
}

function closeDialog() {
  $("dialogBackdrop")?.classList.remove("visible");
}

function updateCoinsDisplay() {
  const coinCount = $("coinCount");
  if (coinCount) {
    coinCount.textContent = SuperX.coins.toLocaleString("en-IN");
  }
}

function getSelectedCar() {
  return CAR_DATA[SuperX.selectedCar] || CAR_DATA[0];
}

function isSelectedCarUnlocked() {
  return SuperX.unlockedCars.includes(SuperX.selectedCar);
}

function updateCarDisplay() {
  const car = getSelectedCar();

  if ($("carName")) $("carName").textContent = car.name;
  if ($("carIndex")) {
    $("carIndex").textContent =
      String(SuperX.selectedCar + 1).padStart(2, "0") + " / 35";
  }

  window.SuperX3D?.selectCar?.(SuperX.selectedCar);
  updateGarage();
}

function changeCar(direction) {
  SuperX.selectedCar =
    (SuperX.selectedCar + direction + CAR_DATA.length) %
    CAR_DATA.length;

  updateCarDisplay();

  if (!isSelectedCarUnlocked()) {
    showToast("Locked car — unlock it in the Garage.");
  }
}

function updateGarage() {
  const car = getSelectedCar();
  const unlocked = isSelectedCarUnlocked();

  if ($("garageCarName")) $("garageCarName").textContent = car.name;

  if ($("garageCarStatus")) {
    $("garageCarStatus").textContent = unlocked
      ? "UNLOCKED"
      : "LOCKED · ◈ " + car.price.toLocaleString("en-IN");
  }

  if ($("statSpeed")) {
    $("statSpeed").innerHTML = car.speed + ' <small>KM/H</small>';
  }

  if ($("statAcceleration")) {
    $("statAcceleration").textContent = car.acceleration;
  }

  if ($("statHandling")) {
    $("statHandling").textContent = car.handling;
  }

  window.SuperX3D?.selectGarageCar?.(SuperX.selectedCar);

  const driveButton = $("garageDriveBtn");
  if (driveButton) {
    driveButton.textContent = unlocked
      ? "DRIVE THIS CAR →"
      : "UNLOCK CAR · ◈ " + car.price.toLocaleString("en-IN");
  }
}

function selectMode(index) {
  if (!MAP_MODES[index]) return;

  SuperX.selectedMode = index;
  SuperX.selectedMap = 1;

  document.querySelectorAll(".mode-card").forEach((card, i) => {
    card.classList.toggle("selected", i === index);
  });

  renderMapGrid();
}

function renderModeGrid() {
  const grid = $("modeGrid");
  if (!grid) return;

  grid.replaceChildren();

  MAP_MODES.forEach((mode, index) => {
    const button = document.createElement("button");
    button.className = "mode-card" + (index === 0 ? " selected" : "");
    button.innerHTML =
      "<strong>" + mode.icon + " " + mode.name + "</strong>" +
      "<span>" + mode.desc + "</span>";

    button.addEventListener("click", () => selectMode(index));
    grid.appendChild(button);
  });
}

function renderMapGrid() {
  const grid = $("mapGrid");
  if (!grid) return;

  grid.replaceChildren();

  const modeName = MAP_MODES[SuperX.selectedMode].name;
  const unlockedMap = SuperX.unlockedMaps[modeName] || 1;

  for (let number = 1; number <= 100; number++) {
    const button = document.createElement("button");
    const locked = number > unlockedMap;

    button.className =
      "map-card" +
      (number === SuperX.selectedMap ? " selected" : "") +
      (locked ? " locked" : "");

    button.textContent = locked ? "🔒 " + number : number;
    button.disabled = locked;

    button.addEventListener("click", () => {
      SuperX.selectedMap = number;
      renderMapGrid();
    });

    grid.appendChild(button);
  }
}

function configureSelectedCar() {
  const car = getSelectedCar();
  const physics = window.SuperXPhysics;

  if (!physics) return;

  physics.setMaxSpeed?.(car.speed);

  if (physics.state) {
    physics.state.acceleration = 25 + car.acceleration * 0.24;
    physics.state.steeringPower = 2.5 + car.handling * 0.035;
  }
}

function startRace(mode = "career") {
  if (!isSelectedCarUnlocked()) {
    showToast("Unlock this car in the Garage first.");
    return;
  }

  if (!window.SuperXRace?.start) {
    showToast("Race system load nahi hua.");
    return;
  }

  configureSelectedCar();

  SuperX.isRacing = true;
  closeMenu();

  window.SuperXRace.start(mode);
}

function stopRaceFlag() {
  SuperX.isRacing = false;
}

function showAbout() {
  openDialog(
    "ABOUT SUPERX LEGEND",
    "Founder & Developer: Subhash Yadav\n" +
    "Instagram: @iamsubhash177\n" +
    "Email: yahu9950@gmail.com\n\n" +
    "SUPERX LEGEND is an independent racing game project."
  );
}

function showSettings() {
  const container = document.createElement("div");

  const heading = document.createElement("p");
  heading.textContent = "GAME SETTINGS";
  container.appendChild(heading);

  const languageButton = document.createElement("button");
  languageButton.className = "secondary-btn";
  languageButton.textContent = "Change Language";
  languageButton.addEventListener("click", () => {
    showToast("Language selection will be added in a later part.");
  });
  container.appendChild(languageButton);

  const audioButton = document.createElement("button");
  audioButton.className = "secondary-btn";
  audioButton.textContent = "Audio Settings";
  audioButton.addEventListener("click", () => {
    openDialog(
      "AUDIO SETTINGS",
      "Use the Music and Sound controls in the menu drawer."
    );
  });
  container.appendChild(audioButton);

  openDialog("SETTINGS", container);
}

function requestOnline(action) {
  showToast(action + ": online server is not connected yet.");
}

function toggleRacePause() {
  const race = window.SuperXRace;
  if (!race) return;

  if (typeof race.togglePause === "function") {
    race.togglePause();
    return;
  }

  const state = race.getState?.();
  if (state?.paused) {
    race.resume?.();
  } else {
    race.pause?.();
  }
}

function bindNavigation() {
  document.querySelectorAll("[data-screen]").forEach(button => {
    button.addEventListener("click", () => {
      showScreen(button.dataset.screen);
    });
  });

  document.querySelectorAll(".back-btn").forEach(button => {
    button.addEventListener("click", () => showScreen("homeScreen"));
  });

  $("menuBtn")?.addEventListener("click", openMenu);
  $("closeMenuBtn")?.addEventListener("click", closeMenu);
  $("drawerBackdrop")?.addEventListener("click", closeMenu);
  $("dialogClose")?.addEventListener("click", closeDialog);

  $("dialogBackdrop")?.addEventListener("click", event => {
    if (event.target === $("dialogBackdrop")) closeDialog();
  });

  $("prevCar")?.addEventListener("click", () => changeCar(-1));
  $("nextCar")?.addEventListener("click", () => changeCar(1));

  $("profileBtn")?.addEventListener("click", () => {
    openDialog(
      "PLAYER PROFILE",
      "Guest Driver\nLogin and cloud profile features will be added later."
    );
  });

  $("coinsBtn")?.addEventListener("click", () => {
    showToast("Earn coins by completing races and missions.");
  });

  $("languageBtn")?.addEventListener("click", () => {
    showToast("Language selection will be added in a later part.");
  });

  $("aboutBtn")?.addEventListener("click", showAbout);
  $("settingsBtn")?.addEventListener("click", showSettings);

  $("quickJoinBtn")?.addEventListener("click", () => {
    requestOnline("Quick Join");
  });

  $("createRoomBtn")?.addEventListener("click", () => {
    requestOnline("Create Room");
  });

  $("testDriveBtn")?.addEventListener("click", () => {
    startRace("showroom");
  });

  $("garageDriveBtn")?.addEventListener("click", () => {
    if (!isSelectedCarUnlocked()) {
      const car = getSelectedCar();

      if (SuperX.coins < car.price) {
        showToast("Not enough coins to unlock this car.");
        return;
      }

      SuperX.coins -= car.price;
      SuperX.unlockedCars.push(SuperX.selectedCar);

      updateCoinsDisplay();
      updateGarage();
      window.SuperXSaveProgress?.();

      showToast(car.name + " unlocked!");
      return;
    }

    startRace("garage");
  });

  $("startCareerBtn")?.addEventListener("click", () => {
    const mode = MAP_MODES[SuperX.selectedMode].name.toLowerCase();

    startRace("career-" + mode + "-map-" + SuperX.selectedMap);
  });

  document.querySelectorAll("[data-world]").forEach(button => {
    button.addEventListener("click", () => {
      SuperX.selectedWorld = button.dataset.world;
      document.querySelectorAll("[data-world]").forEach(item => {
        item.classList.toggle("selected", item === button);
      });
      showToast(SuperX.selectedWorld + " selected.");
    });
  });

  $("startFreeDriveBtn")?.addEventListener("click", () => {
    startRace("freeDrive");
  });

  $("cameraBtn")?.addEventListener("click", () => {
    cameraView = (cameraView + 1) % 4;
    window.SuperX3D?.setRaceCamera?.(cameraView);
  });

  $("pauseBtn")?.addEventListener("click", toggleRacePause);

  $("hornBtn")?.addEventListener("click", () => {
    if (window.SuperXRace?.horn) {
      window.SuperXRace.horn();
    } else {
      window.SuperXAudio?.playHorn?.();
    }
  });

  // Driving controls are handled by js/controls.js.
  // This avoids duplicate pointer listeners.
}

let cameraView = 0;

function initSuperX() {
  renderModeGrid();
  renderMapGrid();
  updateCoinsDisplay();
  updateCarDisplay();
  bindNavigation();

  console.log("SUPERX LEGEND: main interface initialized.");
}

window.SuperX = SuperX;
window.SUPERX_CARS = CAR_DATA;
window.SUPERX_MAP_MODES = MAP_MODES;

window.SuperXApp = {
  showScreen,
  showToast,
  startRace,
  updateGarage,
  updateCoinsDisplay,
  stopRaceFlag
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSuperX, {once:true});
} else {
  initSuperX();
}

window.addEventListener("error", event => {
  console.error("SUPERX Error:", event.message);
});

window.addEventListener("unhandledrejection", event => {
  console.error("SUPERX Promise Error:", event.reason);
});

/* =========================================
   PART 28 END
========================================= */

