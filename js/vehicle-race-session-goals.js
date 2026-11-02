
/* =========================================================
   SUPERX LEGEND — FILE 109
   FILE: js/vehicle-race-session-goals.js
   MODULE: Race Session Goals
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_race_session_goals_v1";
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
    return "goal_" +
      Date.now().toString(36) + "_" +
      Math.random().toString(36).slice(2, 7);
  }

  function loadGoals() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) return [];

      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter(item =>
          item &&
          typeof item === "object" &&
          ALLOWED_TYPES.includes(item.type)
        )
        .slice(0, MAX_GOALS);

    } catch (error) {
      console.warn("[SUPERX Goals] Load failed:", error);
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(goals)
      );

      return true;

    } catch (error) {
      console.warn("[SUPERX Goals] Save failed:", error);
      return false;
    }
  }

  function createGoal(data = {}) {
    if (goals.length >= MAX_GOALS) {
      return {
        success: false,
        error: "Maximum goal limit reached."
      };
    }

    const type = String(data.type || "");

    if (!ALLOWED_TYPES.includes(type)) {
      return {
        success: false,
        error: "Invalid goal type."
      };
    }

    const target = number(data.target, 0);

    if (target <= 0 || target > 100000000) {
      return {
        success: false,
        error: "Enter a valid goal target."
      };
    }

    const title = String(
      data.title || type + " goal"
    ).trim().slice(0, 60);

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
    save();

    return {
      success: true,
      goal: { ...goal }
    };
  }

  function updateGoalProgress(id, amount) {
    const goal = goals.find(item => item.id === id);

    if (!goal) {
      return {
        success: false,
        error: "Goal not found."
      };
    }

    if (goal.completed) {
      return {
        success: false,
        error: "Goal is already completed."
      };
    }

    const increment = Math.max(0, number(amount));

    goal.progress = Math.min(
      goal.target,
      goal.progress + increment
    );

    if (goal.progress >= goal.target) {
      goal.completed = true;
      goal.completedAt = new Date().toISOString();

      window.dispatchEvent(new CustomEvent(
        "sx:race-goal-completed",
        { detail: { ...goal } }
      ));
    }

    save();

    return {
      success: true,
      goal: { ...goal }
    };
  }

  function recordRace(data = {}) {
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

      if (amount > 0) {
        const result = updateGoalProgress(
          goal.id,
          amount
        );

        if (result.success) {
          updates.push(result.goal);
        }
      }
    });

    return updates;
  }

  function getAll(options = {}) {
    const includeCompleted = options.includeCompleted !== false;

    return goals
      .filter(goal =>
        includeCompleted || !goal.completed
      )
      .map(goal => ({
        ...goal,
        percentage: Math.min(
          100,
          Math.round(goal.progress / goal.target * 100)
        ),
        remaining: Math.max(
          0,
          goal.target - goal.progress
        )
      }));
  }

  function getGoal(id) {
    const goal = goals.find(item => item.id === id);

    return goal ? { ...goal } : null;
  }

  function deleteGoal(id) {
    const originalLength = goals.length;

    goals = goals.filter(item => item.id !== id);

    if (goals.length === originalLength) {
      return false;
    }

    save();
    return true;
  }

  function resetGoal(id) {
    const goal = goals.find(item => item.id === id);

    if (!goal) return false;

    goal.progress = 0;
    goal.completed = false;
    goal.completedAt = null;

    save();
    return true;
  }

  function clearCompleted() {
    const originalLength = goals.length;

    goals = goals.filter(goal => !goal.completed);

    save();

    return originalLength - goals.length;
  }

  function getSummary() {
    const completed = goals.filter(
      goal => goal.completed
    ).length;

    return {
      total: goals.length,
      completed,
      active: goals.length - completed,
      completionRate: goals.length
        ? Math.round(completed / goals.length * 100)
        : 0
    };
  }

  SX.vehicleRaceSessionGoals = {
    createGoal,
    updateGoalProgress,
    recordRace,
    getAll,
    getGoal,
    deleteGoal,
    resetGoal,
    clearCompleted,
    getSummary,
    getAllowedTypes: () => ALLOWED_TYPES.slice()
  };

  console.info("[SUPERX] Race Session Goals loaded.");

})(window);

/* ======================= END FILE 109 ======================= */
