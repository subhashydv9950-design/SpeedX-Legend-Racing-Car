/* =========================================================
   SUPERX LEGEND — FILE 109
   FILE: js/vehicle-race-session-goals.js
   MODULE: Advanced Race Session Goals
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_race_session_goals_v2";
  const MAX_GOALS = 50;

  const ALLOWED_TYPES = [
    "races",
    "wins",
    "distance",
    "coins",
    "xp",
    "penalties"
  ];

  let goals = loadGoals();

  function number(value, fallback = 0) {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
  }

  function createId() {
    return "goal_" + Date.now().toString(36) + "_" +
      Math.random().toString(36).slice(2, 9);
  }

  function clone(goal) {
    return {
      ...goal,
      percentage: goal.target > 0
        ? Math.min(100, Math.round(goal.progress / goal.target * 100))
        : 0,
      remaining: Math.max(0, goal.target - goal.progress)
    };
  }

  function normalize(item) {
    if (!item || typeof item !== "object") return null;

    const type = String(item.type || "");
    if (!ALLOWED_TYPES.includes(type)) return null;

    const target = number(item.target);
    if (target <= 0) return null;

    const progress = Math.min(
      target,
      Math.max(0, number(item.progress))
    );

    const completed = Boolean(item.completed) || progress >= target;

    return {
      id: String(item.id || createId()),
      title: String(item.title || type + " goal").trim().slice(0, 60),
      type,
      target,
      progress: completed ? target : progress,
      createdAt: item.createdAt || new Date().toISOString(),
      completedAt: completed
        ? (item.completedAt || new Date().toISOString())
        : null,
      completed
    };
  }

  function loadGoals() {
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      const legacy = localStorage.getItem("superx_race_session_goals_v1");
      const parsed = JSON.parse(current || legacy || "[]");

      return Array.isArray(parsed)
        ? parsed.map(normalize).filter(Boolean).slice(0, MAX_GOALS)
        : [];
    } catch (error) {
      console.warn("[SUPERX Goals] Load failed:", error);
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
      return true;
    } catch (error) {
      console.warn("[SUPERX Goals] Save failed:", error);
      return false;
    }
  }

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent("sx:" + name, {
      detail
    }));
  }

  function createGoal(data = {}) {
    if (goals.length >= MAX_GOALS) {
      return { success: false, error: "Maximum goal limit reached." };
    }

    const type = String(data.type || "");
    if (!ALLOWED_TYPES.includes(type)) {
      return { success: false, error: "Invalid goal type." };
    }

    const target = number(data.target);
    if (target <= 0 || target > 100000000) {
      return { success: false, error: "Enter a valid goal target." };
    }

    const title = String(data.title || type + " goal")
      .trim().slice(0, 60);

    if (!title) {
      return { success: false, error: "Goal title is required." };
    }

    const goal = {
      id: createId(),
      title,
      type,
      target,
      progress: 0,
      createdAt: new Date().toISOString(),
      completedAt: null,
      completed: false
    };

    goals.unshift(goal);

    if (!save()) {
      goals.shift();
      return { success: false, error: "Could not save goal." };
    }

    emit("race-goal-created", clone(goal));

    return { success: true, goal: clone(goal) };
  }

  function updateGoalProgress(id, amount) {
    const goal = goals.find(item => item.id === id);

    if (!goal) {
      return { success: false, error: "Goal not found." };
    }

    if (goal.completed) {
      return { success: false, error: "Goal is already completed." };
    }

    const increment = Math.max(0, number(amount));

    if (increment <= 0) {
      return { success: true, goal: clone(goal), changed: false };
    }

    const previousProgress = goal.progress;
    goal.progress = Math.min(goal.target, goal.progress + increment);

    let completedNow = false;

    if (goal.progress >= goal.target) {
      goal.completed = true;
      goal.completedAt = new Date().toISOString();
      completedNow = true;
    }

    if (!save()) {
      goal.progress = previousProgress;
      goal.completed = false;
      goal.completedAt = null;
      return { success: false, error: "Could not save progress." };
    }

    if (completedNow) {
      emit("race-goal-completed", clone(goal));
    } else {
      emit("race-goal-progress", clone(goal));
    }

    return {
      success: true,
      goal: clone(goal),
      completedNow
    };
  }

  function recordRace(data = {}) {
    const raceId = String(data.raceId || "");

    if (raceId && goals.some(goal =>
      goal.lastRaceId === raceId
    )) {
      return [];
    }

    const events = {
      races: 1,
      wins: data.won === true ? 1 : 0,
      distance: Math.max(0, number(data.distanceKm)),
      coins: Math.max(0, number(data.coins)),
      xp: Math.max(0, number(data.xp)),
      penalties: Math.max(0, number(data.penalties))
    };

    const updates = [];

    goals.forEach(goal => {
      if (goal.completed) return;

      const amount = events[goal.type];
      if (amount <= 0) return;

      const result = updateGoalProgress(goal.id, amount);

      if (result.success) {
        if (raceId) goal.lastRaceId = raceId;
        updates.push(result.goal);
      }
    });

    if (raceId) save();

    return updates;
  }

  function getAll(options = {}) {
    const includeCompleted = options.includeCompleted !== false;

    return goals
      .filter(goal => includeCompleted || !goal.completed)
      .map(clone);
  }

  function getGoal(id) {
    const goal = goals.find(item => item.id === id);
    return goal ? clone(goal) : null;
  }

  function updateGoal(id, changes = {}) {
    const goal = goals.find(item => item.id === id);
    if (!goal) return { success: false, error: "Goal not found." };

    const previous = { ...goal };

    if (changes.title !== undefined) {
      const title = String(changes.title).trim().slice(0, 60);
      if (!title) return { success: false, error: "Invalid title." };
      goal.title = title;
    }

    if (changes.target !== undefined) {
      const target = number(changes.target);
      if (target <= 0 || target > 100000000) {
        return { success: false, error: "Invalid target." };
      }

      goal.target = target;
      goal.progress = Math.min(goal.progress, target);
      goal.completed = goal.progress >= target;
      goal.completedAt = goal.completed
        ? (goal.completedAt || new Date().toISOString())
        : null;
    }

    if (!save()) {
      Object.assign(goal, previous);
      return { success: false, error: "Could not save goal." };
    }

    emit("race-goal-updated", clone(goal));
    return { success: true, goal: clone(goal) };
  }

  function deleteGoal(id) {
    const index = goals.findIndex(item => item.id === id);
    if (index < 0) return false;

    const removed = goals.splice(index, 1)[0];

    if (!save()) {
      goals.splice(index, 0, removed);
      return false;
    }

    emit("race-goal-deleted", { id });
    return true;
  }

  function resetGoal(id) {
    const goal = goals.find(item => item.id === id);
    if (!goal) return false;

    const previous = { ...goal };

    goal.progress = 0;
    goal.completed = false;
    goal.completedAt = null;
    delete goal.lastRaceId;

    if (!save()) {
      Object.assign(goal, previous);
      return false;
    }

    emit("race-goal-reset", clone(goal));
    return true;
  }

  function clearCompleted() {
    const previous = goals.slice();
    goals = goals.filter(goal => !goal.completed);

    if (!save()) {
      goals = previous;
      return 0;
    }

    return previous.length - goals.length;
  }

  function getSummary() {
    const completed = goals.filter(goal => goal.completed).length;
    const active = goals.length - completed;

    return {
      total: goals.length,
      completed,
      active,
      completionRate: goals.length
        ? Math.round(completed / goals.length * 100)
        : 0,
      remainingProgress: goals
        .filter(goal => !goal.completed)
        .reduce((sum, goal) => sum + goal.target - goal.progress, 0)
    };
  }

  SX.vehicleRaceSessionGoals = {
    createGoal,
    updateGoalProgress,
    recordRace,
    getAll,
    getGoal,
    updateGoal,
    deleteGoal,
    resetGoal,
    clearCompleted,
    getSummary,
    getAllowedTypes: () => ALLOWED_TYPES.slice()
  };

  console.info("[SUPERX] Advanced Race Session Goals loaded.");

})(window);

/* ======================= END FILE 109 ======================= */

