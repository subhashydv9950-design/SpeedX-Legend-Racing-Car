
// =====================================================
// SUPERX LEGEND — PART 3 START
// FILE: js/main.js
// =====================================================

"use strict";

const SuperX = {
  coins: 2500,
  selectedCar: 0,
  selectedMode: 0,
  selectedMap: 1,
  currentScreen: "homeScreen",
  unlockedCars: [0, 1],
  unlockedMaps: {},
  upgrades: {},
  language: "en",
  isRacing: false
};

const CAR_DATA = [
  { name: "NIGHTFALL GT", speed: 240, acceleration: 70, handling: 75, price: 0 },
  { name: "SHADOW RS", speed: 260, acceleration: 74, handling: 78, price: 0 },
  { name: "PHANTOM X", speed: 280, acceleration: 78, handling: 77, price: 3500 },
  { name: "STORM GT", speed: 300, acceleration: 80, handling: 79, price: 5000 },
  { name: "VENOM R", speed: 320, acceleration: 82, handling: 80, price: 7000 },
  { name: "FALCON S", speed: 340, acceleration: 84, handling: 82, price: 9000 },
  { name: "TITAN V8", speed: 350, acceleration: 82, handling: 78, price: 11000 },
  { name: "APEX R", speed: 370, acceleration: 87, handling: 84, price: 13000 },
  { name: "VIPER Z", speed: 390, acceleration: 88, handling: 82, price: 15000 },
  { name: "INFERNO", speed: 400, acceleration: 89, handling: 83, price: 17000 },
  { name: "BLAZE XR", speed: 410, acceleration: 90, handling: 85, price: 19000 },
  { name: "TURBO X", speed: 420, acceleration: 91, handling: 86, price: 22000 },
  { name: "RAPTOR GT", speed: 430, acceleration: 92, handling: 85, price: 25000 },
  { name: "ECLIPSE", speed: 440, acceleration: 93, handling: 87, price: 28000 },
  { name: "NOVA R", speed: 450, acceleration: 94, handling: 88, price: 31000 },
  { name: "SPECTRE", speed: 455, acceleration: 94, handling: 86, price: 34000 },
  { name: "HURRICANE", speed: 460, acceleration: 95, handling: 89, price: 37000 },
  { name: "VORTEX", speed: 465, acceleration: 95, handling: 90, price: 40000 },
  { name: "DARK HORSE", speed: 470, acceleration: 96, handling: 88, price: 43000 },
  { name: "THUNDER", speed: 475, acceleration: 96, handling: 90, price: 46000 },
  { name: "CYCLONE", speed: 480, acceleration: 97, handling: 91, price: 49000 },
  { name: "WILDFIRE", speed: 485, acceleration: 97, handling: 90, price: 52000 },
  { name: "HYPERION", speed: 490, acceleration: 98, handling: 92, price: 55000 },
  { name: "ZENITH", speed: 495, acceleration: 98, handling: 93, price: 58000 },
  { name: "OBLIVION", speed: 500, acceleration: 98, handling: 91, price: 61000 },
  { name: "BLACKOUT", speed: 505, acceleration: 99, handling: 93, price: 64000 },
  { name: "QUANTUM", speed: 510, acceleration: 99, handling: 94, price: 67000 },
  { name: "ETERNITY", speed: 515, acceleration: 99, handling: 94, price: 70000 },
  { name: "APOCALYPSE", speed: 518, acceleration: 100, handling: 95, price: 75000 },
  { name: "LEGEND ONE", speed: 520, acceleration: 100, handling: 96, price: 80000 },
  { name: "SILVER ARROW", speed: 360, acceleration: 85, handling: 92, price: 12000 },
  { name: "ROYAL GT", speed: 385, acceleration: 89, handling: 88, price: 20000 },
  { name: "DRAGON RS", speed: 445, acceleration: 94, handling: 87, price: 32000 },
  { name: "NIGHT RIDER", speed: 475, acceleration: 97, handling: 92, price: 54000 },
  { name: "SUPERX ONE", speed: 520, acceleration: 100, handling: 100, price: 100000 }
];

const MAP_MODES = [
  { name: "Village", icon: "🌾", desc: "Rural roads & farms" },
  { name: "City", icon: "🌆", desc: "Traffic & highways" },
  { name: "Mountain", icon: "⛰️", desc: "Curves & cliffs" },
  { name: "High Hills", icon: "🏔️", desc: "Steep winding roads" },
  { name: "Snowfall", icon: "❄️", desc: "Snow & icy roads" },
  { name: "Desert", icon: "🏜️", desc: "Long desert routes" },
  { name: "Forest", icon: "🌲", desc: "Woodland roads" },
  { name: "Coastal", icon: "🌊", desc: "Ocean-side driving" }
];

const $ = (id) => document.getElementById(id);

function showToast(message) {
  const toast = $("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("visible");

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove("visible");
  }, 2400);
}

function showScreen(screenId) {
  const screen = $(screenId);

  if (!screen) {
    showToast("This section is not ready yet.");
    return;
  }

  document.querySelectorAll(".screen").forEach((item) => {
    item.classList.remove("active");
  });

  screen.classList.add("active");
  SuperX.currentScreen = screenId;

  closeMenu();

  if (window.SuperX3D && typeof window.SuperX3D.resize === "function") {
    window.SuperX3D.resize();
  }

  if (screenId === "garageScreen") updateGarage();
  if (screenId === "careerScreen") renderMapGrid();
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
  $("dialogTitle").textContent = title;
  $("dialogContent").replaceChildren();

  if (content instanceof Node) {
    $("dialogContent").appendChild(content);
  } else {
    $("dialogContent").textContent = content;
  }

  $("dialogBackdrop").classList.add("visible");
}

function closeDialog() {
  $("dialogBackdrop")?.classList.remove("visible");
}

function updateCoins() {
  $("coinCount").textContent = SuperX.coins.toLocaleString("en-IN");
}

function getSelectedCar() {
  return CAR_DATA[SuperX.selectedCar];
}

function updateCarDisplay() {
  const car = getSelectedCar();

  $("carName").textContent = car.name;
  $("carIndex").textContent =
    String(SuperX.selectedCar + 1).padStart(2, "0") + " / 35";

  if (window.SuperX3D?.selectCar) {
    window.SuperX3D.selectCar(SuperX.selectedCar);
  }

  updateGarage();
}

function changeCar(direction) {
  SuperX.selectedCar =
    (SuperX.selectedCar + direction + CAR_DATA.length) %
    CAR_DATA.length;

  updateCarDisplay();

  if (!SuperX.unlockedCars.includes(SuperX.selectedCar)) {
    showToast("Locked car — unlock it in the Garage.");
  }
}

function updateGarage() {
  const car = getSelectedCar();
  const unlocked = SuperX.unlockedCars.includes(SuperX.selectedCar);

  $("garageCarName").textContent = car.name;
  $("garageCarStatus").textContent = unlocked
    ? "UNLOCKED"
    : "LOCKED · ◈ " + car.price.toLocaleString("en-IN");

  $("statSpeed").innerHTML =
    car.speed + ' <small>KM/H</small>';

  $("statAcceleration").textContent = car.acceleration;
  $("statHandling").textContent = car.handling;

  if (window.SuperX3D?.selectGarageCar) {
    window.SuperX3D.selectGarageCar(SuperX.selectedCar);
  }

  const driveButton = $("garageDriveBtn");
  driveButton.textContent = unlocked
    ? "DRIVE THIS CAR →"
    : "UNLOCK CAR · ◈ " + car.price.toLocaleString("en-IN");
}

function selectMode(index) {
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

  for (let mapNumber = 1; mapNumber <= 100; mapNumber++) {
    const button = document.createElement("button");
    const locked = mapNumber > unlockedMap;

    button.className =
      "map-card" +
      (mapNumber === SuperX.selectedMap ? " selected" : "") +
      (locked ? " locked" : "");

    button.textContent = locked ? "🔒 " + mapNumber : mapNumber;
    button.disabled = locked;

    button.addEventListener("click", () => {
      SuperX.selectedMap = mapNumber;
      renderMapGrid();
    });

    grid.appendChild(button);
  }
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

  const languages = document.createElement("button");
  languages.className = "secondary-btn";
  languages.textContent = "Change Language";
  languages.addEventListener("click", () => {
    showToast("Multi-language support will be added in a later part.");
  });
  container.appendChild(languages);

  const audio = document.createElement("button");
  audio.className = "secondary-btn";
  audio.textContent = "Audio Settings";
  audio.addEventListener("click", () => {
    showToast("Audio settings will be connected in a later part.");
  });
  container.appendChild(audio);

  openDialog("SETTINGS", container);
}

function requestOnline(action) {
  showToast(
    action + ": online server is not connected yet."
  );
}

function bindNavigation() {
  document.querySelectorAll("[data-screen]").forEach((button) => {
    button.addEventListener("click", () => {
      showScreen(button.dataset.screen);
    });
  });

  document.querySelectorAll(".back-btn").forEach((button) => {
    button.addEventListener("click", () => showScreen("homeScreen"));
  });

  $("menuBtn").addEventListener("click", openMenu);
  $("closeMenuBtn").addEventListener("click", closeMenu);
  $("drawerBackdrop").addEventListener("click", closeMenu);

  $("dialogClose").addEventListener("click", closeDialog);
  $("dialogBackdrop").addEventListener("click", (event) => {
    if (event.target === $("dialogBackdrop")) closeDialog();
  });

  $("prevCar").addEventListener("click", () => changeCar(-1));
  $("nextCar").addEventListener("click", () => changeCar(1));

  $("profileBtn").addEventListener("click", () => {
    openDialog("PLAYER PROFILE", "Guest Driver\nLogin and cloud profile features will be added later.");
  });

  $("coinsBtn").addEventListener("click", () => {
    showToast("Earn coins by completing races and missions.");
  });

  $("languageBtn").addEventListener("click", () => {
    showToast("Language selection will be added in a later part.");
  });

  $("aboutBtn").addEventListener("click", showAbout);
  $("settingsBtn").addEventListener("click", showSettings);

  $("quickJoinBtn").addEventListener("click", () => requestOnline("Quick Join"));
  $("createRoomBtn").addEventListener("click", () => requestOnline("Create Room"));

  $("testDriveBtn").addEventListener("click", () => {
    if (!SuperX.unlockedCars.includes(SuperX.selectedCar)) {
      showToast("Unlock this car in the Garage first.");
      return;
    }
    startRace("showroom");
  });

  $("garageDriveBtn").addEventListener("click", () => {
    if (!SuperX.unlockedCars.includes(SuperX.selectedCar)) {
      const car = getSelectedCar();

      if (SuperX.coins < car.price) {
        showToast("Not enough coins to unlock this car.");
        return;
      }

      SuperX.coins -= car.price;
      SuperX.unlockedCars.push(SuperX.selectedCar);
      updateCoins();
      updateGarage();
      showToast(car.name + " unlocked!");
      return;
    }

    startRace("garage");
  });

  $("startCareerBtn").addEventListener("click", () => {
    showToast("Career race engine will be connected in the next parts.");
  });

  $("startFreeDriveBtn").addEventListener("click", () => {
    startRace("freeDrive");
  });

  $("cameraBtn").addEventListener("click", () => {
    if (window.SuperX3D?.changeCamera) {
      window.SuperX3D.changeCamera();
    } else {
      showToast("Camera system is loading.");
    }
  });

  $("pauseBtn").addEventListener("click", () => {
    if (window.SuperXRace?.togglePause) {
      window.SuperXRace.togglePause();
    } else {
      showToast("Pause system will be connected in the race part.");
    }
  });

  $("hornBtn").addEventListener("click", () => {
    if (window.SuperXRace?.horn) window.SuperXRace.horn();
  });

  $("acceleratorBtn").addEventListener("pointerdown", () => {
    window.SuperXRace?.setControl("accelerator", true);
  });
  $("acceleratorBtn").addEventListener("pointerup", () => {
    window.SuperXRace?.setControl("accelerator", false);
  });
  $("acceleratorBtn").addEventListener("pointercancel", () => {
    window.SuperXRace?.setControl("accelerator", false);
  });
  $("acceleratorBtn").addEventListener("pointerleave", () => {
    window.SuperXRace?.setControl("accelerator", false);
  });

  $("brakeBtn").addEventListener("pointerdown", () => {
    window.SuperXRace?.setControl("brake", true);
  });
  $("brakeBtn").addEventListener("pointerup", () => {
    window.SuperXRace?.setControl("brake", false);
  });
  $("brakeBtn").addEventListener("pointercancel", () => {
    window.SuperXRace?.setControl("brake", false);
  });
  $("brakeBtn").addEventListener("pointerleave", () => {
    window.SuperXRace?.setControl("brake", false);
  });

  [["steerLeft", "left"], ["steerRight", "right"],
   ["reverseBtn", "reverse"], ["handbrakeBtn", "handbrake"]]
    .forEach(([id, control]) => {
      const button = $(id);
      const start = () => window.SuperXRace?.setControl(control, true);
      const stop = () => window.SuperXRace?.setControl(control, false);

      button.addEventListener("pointerdown", start);
      button.addEventListener("pointerup", stop);
      button.addEventListener("pointercancel", stop);
      button.addEventListener("pointerleave", stop);
    });
}

/* PART 9B — CONNECT GAME TO RACE MANAGER */

function startRace(mode = "career") {
  if (window.SuperXRace) {
    window.SuperXRace.start(mode);
  } else {
    showToast("Race system load nahi hua.");
  }
}

/* END PART 9B */

function initSuperX() {
  renderModeGrid();
  renderMapGrid();
  updateCoins();
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
  updateGarage
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSuperX);
} else {
  initSuperX();
}

// =====================================================
// SUPERX LEGEND — PART 3 END
// =====================================================
    
