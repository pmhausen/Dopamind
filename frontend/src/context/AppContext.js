import { createContext, useContext, useReducer, useEffect, useRef, useCallback } from "react";
import { apiFetch } from "../services/api";
import dailyChallengesData from "../data/dailyChallenges.json";

const AppContext = createContext();

const STORAGE_KEY = "dopamind-state";

export const LEVEL_TITLES = {
  1:  { de: "Neuling",              en: "Newcomer" },
  2:  { de: "Starter",              en: "Starter" },
  3:  { de: "Routinier",            en: "Apprentice" },
  5:  { de: "Fokus-Entdecker",      en: "Focus Explorer" },
  8:  { de: "Aufgaben-Jäger",       en: "Task Hunter" },
  12: { de: "Flow-Meister",         en: "Flow Master" },
  18: { de: "Konzentrations-Ass",   en: "Concentration Ace" },
  25: { de: "Produktivitäts-Guru",  en: "Productivity Guru" },
  35: { de: "Dopamind-Veteran",     en: "Dopamind Veteran" },
  50: { de: "Legendarischer Fokus", en: "Legendary Focus" },
};

export function getLevelTitle(level, lang = "de") {
  const thresholds = Object.keys(LEVEL_TITLES).map(Number).sort((a, b) => b - a);
  for (const threshold of thresholds) {
    if (level >= threshold) {
      return LEVEL_TITLES[threshold][lang] || LEVEL_TITLES[threshold].de;
    }
  }
  return LEVEL_TITLES[1][lang] || LEVEL_TITLES[1].de;
}

export const DAILY_CHALLENGES = dailyChallengesData;

export const ACHIEVEMENTS = [
  // Small (25–75 XP)
  { id: "first-task",     size: "small",  xp: 25 },
  { id: "first-focus",    size: "small",  xp: 25 },
  { id: "early-bird",     size: "small",  xp: 30 },
  { id: "night-owl",      size: "small",  xp: 30 },
  { id: "hat-trick",      size: "small",  xp: 50 },
  { id: "focus-duo",      size: "small",  xp: 40 },
  { id: "quick-starter",  size: "small",  xp: 35 },
  { id: "subtask-master", size: "small",  xp: 45 },
  // Medium (100–200 XP)
  { id: "daily-5",        size: "medium", xp: 100 },
  { id: "daily-10",       size: "medium", xp: 150 },
  { id: "focus-hour",     size: "medium", xp: 100 },
  { id: "week-warrior",   size: "medium", xp: 150 },
  { id: "streak-3",       size: "medium", xp: 100 },
  { id: "streak-7",       size: "medium", xp: 175 },
  { id: "deadline-hero",  size: "medium", xp: 125 },
  { id: "focus-marathon", size: "medium", xp: 150 },
  // Large (250–750 XP)
  { id: "streak-30",      size: "large",  xp: 500 },
  { id: "streak-100",     size: "large",  xp: 750 },
  { id: "month-100",      size: "large",  xp: 400 },
  { id: "year-365",       size: "large",  xp: 750 },
  { id: "focus-1000min",  size: "large",  xp: 500 },
  { id: "week-50",        size: "large",  xp: 300 },
  { id: "level-10",       size: "large",  xp: 250 },
  { id: "level-25",       size: "large",  xp: 500 },
  { id: "level-50",       size: "large",  xp: 750 },
  { id: "daily-champion", size: "large",  xp: 500 },
];

export const DEFAULT_CATEGORIES = [
  { id: "work",     name: "work",     emoji: "💼", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  { id: "personal", name: "personal", emoji: "👤", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  { id: "health",   name: "health",   emoji: "💪", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  { id: "finance",  name: "finance",  emoji: "💰", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
  { id: "learning", name: "learning", emoji: "📚", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" },
  { id: "home",     name: "home",     emoji: "🏠", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  { id: "errand",   name: "errand",   emoji: "🏃", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300" },
  { id: "creative", name: "creative", emoji: "🎨", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300" },
];

// Compute calibrated size mappings from timeLog data (min 5 data points per category)
export function computeCalibratedMappings(timeLog, defaultMappings = { quick: 10, short: 25, medium: 45, long: 90 }) {
  const result = { ...defaultMappings };
  const stats = {};
  for (const entry of (timeLog || [])) {
    if (!entry.sizeCategory || !entry.actualMin) continue;
    if (!stats[entry.sizeCategory]) stats[entry.sizeCategory] = [];
    stats[entry.sizeCategory].push(entry.actualMin);
  }
  for (const key of ["quick", "short", "medium", "long"]) {
    const data = stats[key];
    if (data && data.length >= 5) {
      result[key] = Math.round(data.reduce((s, v) => s + v, 0) / data.length);
    }
  }
  return { mappings: result, stats };
}

const initialState = {
  tasks: [],
  categories: DEFAULT_CATEGORIES,
  xp: 0,
  level: 1,
  streak: 0,
  completedToday: 0,
  focusMinutesToday: 0,
  rewards: [],
  completedThisWeek: 0,
  completedThisMonth: 0,
  completedThisYear: 0,
  focusMinutesThisWeek: 0,
  focusMinutesThisMonth: 0,
  focusBlocksToday: 0,
  focusBlocksThisWeek: 0,
  currentStreakDays: 0,
  longestStreakDays: 0,
  lastActiveDate: null,
  lastWeekReset: null,
  lastMonthReset: null,
  lastYearReset: null,
  unlockedAchievements: [],
  deadlineHeroCount: 0,
  totalFocusMinutes: 0,
  penalizedTaskIds: [],
  // New gamification fields
  compassionModeDate: null,
  flowModeActive: false,
  energyLevel: null,
  energyCheckDate: null,
  energyLog: [],
  notMyDayCount: 0,
  dailyChallenge: null,
  previousWeekStats: null,
  focusLog: [],
  timeLog: [],
  lastWeeklyReport: null,
  microConfettiQueue: [],
};

function calcLevel(xp) {
  return Math.floor(1 + Math.sqrt(xp / 50));
}

function xpForLevel(level) {
  return (level - 1) * (level - 1) * 50;
}

function xpForNextLevel(level) {
  return level * level * 50;
}

const QUICK_STARTER_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

function calcOverduePenaltyXp(daysOverdue) {
  if (daysOverdue >= 15) return 50;
  if (daysOverdue >= 8) return 25;
  if (daysOverdue >= 4) return 15;
  return 5;
}

function getDaysOverdue(deadlineStr) {
  const deadlineMs = new Date(deadlineStr + "T23:59:59").getTime();
  const nowMs = Date.now();
  if (nowMs <= deadlineMs) return 0;
  return Math.floor((nowMs - deadlineMs) / 86400000);
}

function getStreakMultiplier(streak) {
  if (streak >= 100) return 2.0;
  if (streak >= 30) return 1.5;
  if (streak >= 7) return 1.25;
  if (streak >= 3) return 1.1;
  return 1.0;
}

function calcTaskBaseXp(task) {
  if (task.priority === "high") return 35;
  if (task.priority === "medium") return 20;
  return 10;
}

function calcFocusXpPerMin(minutes) {
  if (minutes > 60) return 3;
  if (minutes > 30) return 2.5;
  if (minutes > 15) return 2;
  return 1.5;
}

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function getWeekStart(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function getMonthKey(dateStr) {
  return dateStr.slice(0, 7);
}

function getYearKey(dateStr) {
  return dateStr.slice(0, 4);
}

function checkAchievements(state, extra) {
  const newAchievements = [];
  const unlocked = state.unlockedAchievements || [];

  const isNew = (id) => !unlocked.includes(id) && !newAchievements.find((a) => a.id === id);
  const add = (id) => {
    const ach = ACHIEVEMENTS.find((a) => a.id === id);
    if (ach) newAchievements.push(ach);
  };

  const { type, task, focusMinutes } = extra || {};

  if (type === "COMPLETE_TASK" && task) {
    const completedCount = state.tasks.filter((t) => t.completed).length;
    if (isNew("first-task") && completedCount === 1) add("first-task");

    const hour = new Date().getHours();
    if (isNew("early-bird") && hour < 9) add("early-bird");
    if (isNew("night-owl") && hour >= 21) add("night-owl");

    if (isNew("quick-starter") && task.createdAt && Date.now() - task.createdAt <= QUICK_STARTER_THRESHOLD_MS) add("quick-starter");

    const completedSubs = (task.subtasks || []).filter((s) => s.completed).length;
    if (isNew("subtask-master") && completedSubs >= 3) add("subtask-master");

    if (isNew("hat-trick") && state.completedToday >= 3) add("hat-trick");
    if (isNew("daily-5") && state.completedToday >= 5) add("daily-5");
    if (isNew("daily-10") && state.completedToday >= 10) add("daily-10");
    if (isNew("week-warrior") && state.completedThisWeek >= 20) add("week-warrior");
    if (isNew("week-50") && state.completedThisWeek >= 50) add("week-50");
    if (isNew("month-100") && state.completedThisMonth >= 100) add("month-100");
    if (isNew("year-365") && state.completedThisYear >= 365) add("year-365");
    if (isNew("deadline-hero") && state.deadlineHeroCount >= 5) add("deadline-hero");
  }

  if (type === "ADD_FOCUS_MINUTES") {
    if (isNew("first-focus") && state.focusBlocksToday >= 1) add("first-focus");
    if (isNew("focus-duo") && state.focusBlocksToday >= 2) add("focus-duo");
    if (isNew("focus-hour") && state.focusMinutesToday >= 60) add("focus-hour");
    if (isNew("focus-marathon") && focusMinutes >= 60) add("focus-marathon");
    if (isNew("focus-1000min") && state.totalFocusMinutes >= 1000) add("focus-1000min");
  }

  // Streak achievements
  if (isNew("streak-3") && state.currentStreakDays >= 3) add("streak-3");
  if (isNew("streak-7") && state.currentStreakDays >= 7) add("streak-7");
  if (isNew("streak-30") && state.currentStreakDays >= 30) add("streak-30");
  if (isNew("streak-100") && state.currentStreakDays >= 100) add("streak-100");

  // Level achievements
  if (isNew("level-10") && state.level >= 10) add("level-10");
  if (isNew("level-25") && state.level >= 25) add("level-25");
  if (isNew("level-50") && state.level >= 50) add("level-50");

  return newAchievements;
}

function applyAchievements(state, newAchievements) {
  if (newAchievements.length === 0) return state;

  let xp = state.xp;
  const rewards = [...state.rewards];
  const unlockedAchievements = [...(state.unlockedAchievements || [])];

  for (const ach of newAchievements) {
    xp += ach.xp;
    unlockedAchievements.push(ach.id);

    let messageKey;
    if (ach.size === "large") messageKey = "rewards.achievementLarge";
    else if (ach.size === "medium") messageKey = "rewards.achievementMedium";
    else messageKey = "rewards.achievement";

    rewards.push({
      id: Date.now() + Math.random() * 1000,
      type: ach.id,
      size: ach.size,
      achievementId: ach.id,
      messageKey,
      xp: ach.xp,
      timestamp: Date.now(),
    });
  }

  return {
    ...state,
    xp,
    level: calcLevel(xp),
    rewards,
    unlockedAchievements,
  };
}

function rollVariableReward() {
  const r = Math.random();
  if (r < 0.05) {
    const xp = Math.round(75 + Math.random() * 75);
    return { type: "jackpot", xp };
  } else if (r < 0.25) {
    const xp = Math.round(20 + Math.random() * 20);
    return { type: "medium", xp };
  } else if (r < 0.55) {
    const xp = Math.round(5 + Math.random() * 10);
    return { type: "small", xp };
  }
  return null;
}

function getDailyChallengeForDate(dateStr) {
  // Deterministically pick a challenge by day-of-year (using UTC to avoid DST issues)
  const d = new Date(dateStr + "T00:00:00Z");
  const start = new Date(d.getUTCFullYear() + "-01-01T00:00:00Z");
  const dayOfYear = Math.floor((d - start) / 86400000);
  return DAILY_CHALLENGES[dayOfYear % DAILY_CHALLENGES.length];
}

function checkDailyChallengeCompletion(state) {
  if (!state.dailyChallenge || state.dailyChallenge.completed) return null;
  const ch = state.dailyChallenge;
  const def = DAILY_CHALLENGES.find((d) => d.id === ch.challengeId);
  if (!def) return null;
  const progress = def.type === "complete_tasks" ? state.completedToday : state.focusMinutesToday;
  if (progress >= def.target) {
    const ach = ACHIEVEMENTS.find((a) => a.id === "daily-champion");
    return ach || null;
  }
  return null;
}

function reducer(state, action) {
  switch (action.type) {
    case "ADD_TASK": {
      const task = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        text: action.payload.text,
        priority: action.payload.priority || "medium",
        energyCost: action.payload.energyCost || "medium",
        estimatedMinutes: action.payload.estimatedMinutes || 25,
        sizeCategory: action.payload.sizeCategory || null,
        completed: false,
        createdAt: Date.now(),
        deadline: action.payload.deadline || null,
        timeOfDay: action.payload.timeOfDay || null,
        scheduledTime: action.payload.scheduledTime || null,
        scheduledDate: action.payload.scheduledDate || null,
        category: action.payload.category || null,
        mailRef: action.payload.mailRef || null,
        subtasks: action.payload.subtasks || [],
        tags: action.payload.tags || [],
      };
      return { ...state, tasks: [...state.tasks, task] };
    }

    case "UPDATE_TASK": {
      const prevTask = state.tasks.find((t) => t.id === action.payload.id);
      const updatedTasks = state.tasks.map((t) =>
        t.id === action.payload.id ? { ...t, ...action.payload } : t
      );
      const microQueue = [...(state.microConfettiQueue || [])];
      let bonusXp = 0;
      // Detect deadline being set (prev null/empty, new has value)
      if (prevTask && !prevTask.deadline && action.payload.deadline) {
        bonusXp += 2;
        microQueue.push({ id: `${Date.now()}-deadline-${Math.random()}`, xp: 2, type: "deadline" });
      }
      // Detect tags growing
      const prevTagCount = (prevTask?.tags || []).length;
      const newTagCount = (action.payload.tags || prevTask?.tags || []).length;
      if (prevTask && newTagCount > prevTagCount) {
        bonusXp += 1;
        microQueue.push({ id: `${Date.now()}-tag-${Math.random()}`, xp: 1, type: "tag" });
      }
      if (bonusXp > 0) {
        const newXp = state.xp + bonusXp;
        return { ...state, tasks: updatedTasks, xp: newXp, level: calcLevel(newXp), microConfettiQueue: microQueue };
      }
      return { ...state, tasks: updatedTasks };
    }

    case "ADD_SUBTASK": {
      const { taskId, text, estimatedMinutes: subMin, scheduledTime: subSchedTime, scheduledDate: subSchedDate, energyCost: subEnergy, timeOfDay: subTimeOfDay, priority: subPrio, deadline: subDeadline, tags: subTags, sizeCategory: subSize } = action.payload;
      return {
        ...state,
        tasks: state.tasks.map((t) => {
          if (t.id !== taskId) return t;
          const newSub = { id: Date.now().toString(36), text, completed: false, estimatedMinutes: subMin || 0, scheduledTime: subSchedTime || null, scheduledDate: subSchedDate || null, energyCost: subEnergy || t.energyCost || "medium", timeOfDay: subTimeOfDay || null, priority: subPrio || t.priority || "medium", deadline: subDeadline || null, category: t.category || null, tags: subTags || [], sizeCategory: subSize || null };
          const subs = [...(t.subtasks || []), newSub];
          const subTotal = subs.reduce((sum, s) => sum + (s.estimatedMinutes || 0), 0);
          return { ...t, subtasks: subs, estimatedMinutes: subTotal > 0 ? subTotal : t.estimatedMinutes };
        }),
      };
    }

    case "UPDATE_SUBTASK": {
      const { taskId: usId, subtaskId: usSubId, ...subUpdates } = action.payload;
      return {
        ...state,
        tasks: state.tasks.map((t) => {
          if (t.id !== usId) return t;
          const subs = (t.subtasks || []).map((s) => s.id === usSubId ? { ...s, ...subUpdates } : s);
          const subTotal = subs.reduce((sum, s) => sum + (s.estimatedMinutes || 0), 0);
          return { ...t, subtasks: subs, estimatedMinutes: subTotal > 0 ? subTotal : t.estimatedMinutes };
        }),
      };
    }

    case "REORDER_BLOCK_TASKS": {
      // payload: { updates: [{ id, blockSortIndex, timeOfDay? }] }
      const updates = action.payload.updates || [];
      const updateMap = new Map(updates.map((u) => [u.id, u]));
      return {
        ...state,
        tasks: state.tasks.map((t) => {
          const u = updateMap.get(t.id);
          if (!u) return t;
          const patch = { blockSortIndex: u.blockSortIndex };
          if (u.timeOfDay !== undefined) patch.timeOfDay = u.timeOfDay;
          return { ...t, ...patch };
        }),
      };
    }

    case "LOG_TASK_TIME": {
      // payload: { taskId, subtaskId?, sizeCategory?, estimatedMin, actualMin, startedAt, stoppedAt }
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
      const prunedLog = (state.timeLog || []).filter((e) => e.date >= ninetyDaysAgo);
      return {
        ...state,
        timeLog: [...prunedLog, { id: Date.now() + Math.random(), date: getTodayStr(), ...action.payload }],
      };
    }

    case "UPDATE_TIME_LOG": {
      // payload: { id, startedAt?, stoppedAt?, actualMin? }
      const { id: logId, ...logUpdates } = action.payload;
      return {
        ...state,
        timeLog: (state.timeLog || []).map((e) => e.id === logId ? { ...e, ...logUpdates } : e),
      };
    }

    case "TOGGLE_SUBTASK": {
      const { taskId: tId, subtaskId } = action.payload;
      const targetTask = state.tasks.find((t) => t.id === tId);
      const targetSub = targetTask && (targetTask.subtasks || []).find((s) => s.id === subtaskId);
      const wasCompleted = targetSub ? targetSub.completed : true;
      const newTasks = state.tasks.map((t) =>
        t.id === tId
          ? { ...t, subtasks: (t.subtasks || []).map((s) => s.id === subtaskId ? { ...s, completed: !s.completed, completedAt: !s.completed ? new Date().toISOString() : null } : s) }
          : t
      );
      // Add micro confetti if completing (not unchecking)
      if (!wasCompleted) {
        const microItem = { id: Date.now() + Math.random(), xp: 1, type: "subtask" };
        return {
          ...state,
          tasks: newTasks,
          xp: state.xp + 1,
          level: calcLevel(state.xp + 1),
          microConfettiQueue: [...(state.microConfettiQueue || []), microItem],
        };
      }
      return { ...state, tasks: newTasks };
    }

    case "DELETE_SUBTASK": {
      const { taskId: dtId, subtaskId: dsId } = action.payload;
      return {
        ...state,
        tasks: state.tasks.map((t) => {
          if (t.id !== dtId) return t;
          const subs = (t.subtasks || []).filter((s) => s.id !== dsId);
          const subTotal = subs.reduce((sum, s) => sum + (s.estimatedMinutes || 0), 0);
          return { ...t, subtasks: subs, estimatedMinutes: subTotal > 0 ? subTotal : t.estimatedMinutes };
        }),
      };
    }

    case "COMPLETE_TASK": {
      const task = state.tasks.find((t) => t.id === action.payload);
      if (!task || task.completed) return state;

      const today = getTodayStr();

      let baseXp = calcTaskBaseXp(task);
      let deadlineBonus = false;
      if (task.priority === "high" && task.deadline && task.deadline <= today) {
        baseXp += 15;
        deadlineBonus = true;
      }
      const completedSubs = (task.subtasks || []).filter((s) => s.completed).length;
      if (completedSubs >= 2) baseXp += 5;

      const mult = getStreakMultiplier(state.currentStreakDays);
      const xpGain = Math.round(baseXp * mult);
      const newXp = state.xp + xpGain;
      const newLevel = calcLevel(newXp);
      const leveledUp = newLevel > state.level;

      const completedToday = state.completedToday + 1;
      const completedThisWeek = state.completedThisWeek + 1;
      const completedThisMonth = state.completedThisMonth + 1;
      const completedThisYear = state.completedThisYear + 1;
      const deadlineHeroCount = state.deadlineHeroCount + (deadlineBonus ? 1 : 0);

      const newRewards = [...state.rewards];
      if (leveledUp) {
        newRewards.push({
          id: Date.now(),
          type: "level-up",
          messageKey: "rewards.levelUp",
          level: newLevel,
          timestamp: Date.now(),
        });
      }
      if (deadlineBonus) {
        newRewards.push({
          id: Date.now() + 1,
          type: "deadline-bonus",
          messageKey: "rewards.deadlineBonus",
          timestamp: Date.now(),
        });
      }

      let bonusXp = 0;
      if (completedToday === 5) {
        bonusXp += 20;
        newRewards.push({
          id: Date.now() + 2,
          type: "daily-bonus",
          messageKey: "rewards.dailyBonus",
          xp: 20,
          timestamp: Date.now(),
        });
      }

      const updatedState = {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload ? { ...t, completed: true, completedAt: new Date().toISOString() } : t
        ),
        xp: newXp + bonusXp,
        level: calcLevel(newXp + bonusXp),
        completedToday,
        completedThisWeek,
        completedThisMonth,
        completedThisYear,
        deadlineHeroCount,
        rewards: newRewards,
      };

      let stateAfterAchs = applyAchievements(updatedState, checkAchievements(updatedState, { type: "COMPLETE_TASK", task }));

      // Variable reward roll
      const varReward = rollVariableReward();
      if (varReward) {
        const varXp = varReward.xp;
        const newVarXp = stateAfterAchs.xp + varXp;
        const varRewards = [...stateAfterAchs.rewards, {
          id: Date.now() + 900,
          type: "variable-reward",
          varType: varReward.type,
          messageKey: varReward.type === "jackpot" ? "rewards.jackpot" : varReward.type === "medium" ? "rewards.variableMedium" : "rewards.variableSmall",
          xp: varXp,
          timestamp: Date.now(),
        }];
        stateAfterAchs = { ...stateAfterAchs, xp: newVarXp, level: calcLevel(newVarXp), rewards: varRewards };
      }

      // Check daily challenge completion
      const dailyChallengeAch = checkDailyChallengeCompletion(stateAfterAchs);
      if (dailyChallengeAch && stateAfterAchs.dailyChallenge && !stateAfterAchs.dailyChallenge.completed) {
        const dcXp = dailyChallengeAch.xp;
        const dcNewXp = stateAfterAchs.xp + dcXp;
        const dcRewards = [...stateAfterAchs.rewards, {
          id: Date.now() + 950,
          type: "daily-champion",
          size: "large",
          achievementId: "daily-champion",
          messageKey: "rewards.achievementLarge",
          xp: dcXp,
          timestamp: Date.now(),
        }];
        stateAfterAchs = {
          ...stateAfterAchs,
          xp: dcNewXp,
          level: calcLevel(dcNewXp),
          rewards: dcRewards,
          unlockedAchievements: [...(stateAfterAchs.unlockedAchievements || []), "daily-champion"],
          dailyChallenge: { ...stateAfterAchs.dailyChallenge, completed: true },
        };
      }

      return stateAfterAchs;
    }

    case "REOPEN_TASK":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload ? { ...t, completed: false } : t
        ),
      };

    case "DELETE_TASK":
      return {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.payload),
        penalizedTaskIds: (state.penalizedTaskIds || []).filter((id) => id !== action.payload),
      };

    case "ADD_FOCUS_MINUTES": {
      const minutes = action.payload;
      const xpPerMin = calcFocusXpPerMin(minutes);
      const baseXp = Math.round(minutes * xpPerMin);
      const mult = getStreakMultiplier(state.currentStreakDays);
      const flowMultiplier = action.flow ? 2 : 1;
      const xpGain = Math.round(baseXp * mult * flowMultiplier);
      const newXp = state.xp + xpGain;
      const newLevel = calcLevel(newXp);
      const leveledUp = newLevel > state.level;

      const focusMinutesToday = state.focusMinutesToday + minutes;
      const focusMinutesThisWeek = state.focusMinutesThisWeek + minutes;
      const focusMinutesThisMonth = state.focusMinutesThisMonth + minutes;
      const focusBlocksToday = state.focusBlocksToday + 1;
      const focusBlocksThisWeek = state.focusBlocksThisWeek + 1;
      const totalFocusMinutes = state.totalFocusMinutes + minutes;

      const newRewards = [...state.rewards];
      if (leveledUp) {
        newRewards.push({
          id: Date.now(),
          type: "level-up",
          messageKey: "rewards.levelUp",
          level: newLevel,
          timestamp: Date.now(),
        });
      }

      let bonusXp = 0;
      if (action.flow) {
        newRewards.push({
          id: Date.now() + 5,
          type: "flow-session",
          messageKey: "rewards.flowSession",
          timestamp: Date.now(),
        });
      }
      if (focusBlocksToday === 3) {
        bonusXp += 15;
        newRewards.push({
          id: Date.now() + 1,
          type: "focus-combo",
          messageKey: "rewards.dailyBonus",
          xp: 15,
          timestamp: Date.now(),
        });
      }

      const updatedState = {
        ...state,
        xp: newXp + bonusXp,
        level: calcLevel(newXp + bonusXp),
        focusMinutesToday,
        focusMinutesThisWeek,
        focusMinutesThisMonth,
        focusBlocksToday,
        focusBlocksThisWeek,
        totalFocusMinutes,
        rewards: newRewards,
        focusLog: [
          ...(state.focusLog || []).filter((entry) => {
            const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
            return entry.date >= sevenDaysAgo;
          }),
          { date: getTodayStr(), hour: new Date().getHours(), minutes },
        ],
      };

      let stateAfterAchs = applyAchievements(updatedState, checkAchievements(updatedState, { type: "ADD_FOCUS_MINUTES", focusMinutes: minutes }));

      // Check daily challenge completion
      const focusDCach = checkDailyChallengeCompletion(stateAfterAchs);
      if (focusDCach && stateAfterAchs.dailyChallenge && !stateAfterAchs.dailyChallenge.completed) {
        const dcXp = focusDCach.xp;
        const dcNewXp = stateAfterAchs.xp + dcXp;
        const dcRewards = [...stateAfterAchs.rewards, {
          id: Date.now() + 950,
          type: "daily-champion",
          size: "large",
          achievementId: "daily-champion",
          messageKey: "rewards.achievementLarge",
          xp: dcXp,
          timestamp: Date.now(),
        }];
        stateAfterAchs = {
          ...stateAfterAchs,
          xp: dcNewXp,
          level: calcLevel(dcNewXp),
          rewards: dcRewards,
          unlockedAchievements: [...(stateAfterAchs.unlockedAchievements || []), "daily-champion"],
          dailyChallenge: { ...stateAfterAchs.dailyChallenge, completed: true },
        };
      }

      return stateAfterAchs;
    }

    case "DISMISS_REWARD":
      return {
        ...state,
        rewards: state.rewards.filter((r) => r.id !== action.payload),
      };

    case "CLEAR_MICRO_CONFETTI":
      return {
        ...state,
        microConfettiQueue: (state.microConfettiQueue || []).filter((m) => m.id !== action.payload),
      };

    case "SET_COMPASSION_MODE":
      return { ...state, compassionModeDate: getTodayStr(), notMyDayCount: state.notMyDayCount + 1 };

    case "SET_FLOW_MODE":
      return { ...state, flowModeActive: !!action.payload };

    case "SET_ENERGY_LEVEL": {
      const today = getTodayStr();
      // Append every change with a timestamp so all changes flow into the Brain Report.
      // Retain entries from the last 90 days to prevent unbounded growth.
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const newEnergyLog = [
        ...(state.energyLog || []).filter((e) => e.date >= cutoff),
        { date: today, level: action.payload, changedAt: new Date().toISOString() },
      ];
      return { ...state, energyLevel: action.payload, energyCheckDate: today, energyLog: newEnergyLog };
    }

    case "UPDATE_DAILY_CHALLENGE": {
      if (!state.dailyChallenge) return state;
      return {
        ...state,
        dailyChallenge: { ...state.dailyChallenge, ...action.payload },
      };
    }

    case "DISMISS_WEEKLY_REPORT":
      return { ...state, lastWeeklyReport: getWeekStart(getTodayStr()) };

    case "START_FOCUS": {
      const sfXp = 3;
      const newXp = state.xp + sfXp;
      const microItem = { id: Date.now() + Math.random(), xp: sfXp, type: "focus_start" };
      return {
        ...state,
        xp: newXp,
        level: calcLevel(newXp),
        microConfettiQueue: [...(state.microConfettiQueue || []), microItem],
      };
    }

    case "LOAD_STATE":
      return { ...initialState, ...action.payload };

    case "RESET_DAILY": {
      const today = getTodayStr();
      if (state.lastActiveDate === today) return state;

      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const streakContinues = state.lastActiveDate === yesterday;
      const compassionToday = state.compassionModeDate === today;
      const compassionYesterday = state.compassionModeDate === yesterday;

      // Compassion mode: skip inactivity streak break if compassion was yesterday and >=1 task completed
      const skipStreakBreak = compassionYesterday && (state.completedToday >= 1);
      const effectiveStreakContinues = streakContinues || skipStreakBreak;
      const newStreak = effectiveStreakContinues ? (state.currentStreakDays || 0) + 1 : 1;

      const currentWeekStart = getWeekStart(today);
      const currentMonthKey = getMonthKey(today);
      const currentYearKey = getYearKey(today);

      const weekReset = state.lastWeekReset !== currentWeekStart;
      const monthReset = state.lastMonthReset !== currentMonthKey;
      const yearReset = state.lastYearReset !== currentYearKey;

      // Save previous week stats before weekly reset
      let previousWeekStats = state.previousWeekStats;
      if (weekReset) {
        const topDayHours = {};
        (state.focusLog || []).forEach((entry) => {
          topDayHours[entry.date] = (topDayHours[entry.date] || 0) + entry.minutes;
        });
        const topDay = Object.keys(topDayHours).sort((a, b) => topDayHours[b] - topDayHours[a])[0] || null;
        previousWeekStats = {
          tasks: state.completedThisWeek,
          focusMinutes: state.focusMinutesThisWeek,
          xp: state.xp,
          topDay,
        };
      }

      // --- Check if user is currently on an absence (time tracking) ---
      let absences = [];
      try {
        const ttData = JSON.parse(localStorage.getItem("dopamind-timetracking") || "{}");
        absences = ttData.absences || [];
      } catch {}
      const isOnAbsence = absences.some((a) => a.startDate <= today && a.endDate >= today);

      // --- Overdue-task XP penalties (skipped during absence and compassion mode) ---
      const penalizedTaskIds = [...(state.penalizedTaskIds || [])];
      const penaltyRewards = [];
      let totalPenalty = 0;
      let penaltyIdx = 0;

      if (!isOnAbsence && !compassionToday) {
        for (const task of state.tasks) {
          if (task.completed || !task.deadline) continue;
          const daysOverdue = getDaysOverdue(task.deadline);
          if (daysOverdue <= 0) continue;
          if (penalizedTaskIds.includes(task.id)) continue;
          const penalty = calcOverduePenaltyXp(daysOverdue);
          totalPenalty += penalty;
          penalizedTaskIds.push(task.id);
          penaltyRewards.push({
            id: Date.now() + penaltyIdx * 1000,
            type: "overdue-penalty",
            messageKey: "rewards.overduePenalty",
            xp: penalty,
            daysOverdue,
            timestamp: Date.now(),
          });
          penaltyIdx++;
        }
      }

      // --- Inactivity XP penalty (streak broken, not first-ever use, skipped during absence and compassion) ---
      if (!isOnAbsence && !effectiveStreakContinues && state.lastActiveDate !== null && !compassionToday) {
        const inactivityDays = state.lastActiveDate
          ? Math.max(1, Math.floor((new Date(today) - new Date(state.lastActiveDate)) / 86400000) - 1)
          : 0;
        const inactivityPenalty = Math.min(50, inactivityDays * 10);
        if (inactivityPenalty > 0) {
          totalPenalty += inactivityPenalty;
          penaltyRewards.push({
            id: Date.now() + penaltyIdx * 1000 + 500,
            type: "inactivity-penalty",
            messageKey: "rewards.inactivityPenalty",
            xp: inactivityPenalty,
            days: inactivityDays,
            timestamp: Date.now(),
          });
        }
      }

      const newXp = Math.max(0, state.xp - totalPenalty);

      // Prune focusLog to last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      const prunedFocusLog = (state.focusLog || []).filter((entry) => entry.date >= sevenDaysAgo);

      // Pick daily challenge for today
      const todayChallenge = getDailyChallengeForDate(today);
      const dailyChallenge = (state.dailyChallenge && state.dailyChallenge.date === today)
        ? state.dailyChallenge
        : { date: today, challengeId: todayChallenge.id, completed: false, progress: 0 };

      return {
        ...state,
        completedToday: 0,
        focusMinutesToday: 0,
        focusBlocksToday: 0,
        currentStreakDays: newStreak,
        longestStreakDays: Math.max(state.longestStreakDays || 0, newStreak),
        lastActiveDate: today,
        xp: newXp,
        level: calcLevel(newXp),
        penalizedTaskIds,
        rewards: [...state.rewards, ...penaltyRewards],
        energyLevel: null,
        energyCheckDate: null,
        compassionModeDate: null,
        focusLog: prunedFocusLog,
        dailyChallenge,
        previousWeekStats,
        ...(weekReset ? {
          completedThisWeek: 0,
          focusMinutesThisWeek: 0,
          focusBlocksThisWeek: 0,
          lastWeekReset: currentWeekStart,
        } : {}),
        ...(monthReset ? {
          completedThisMonth: 0,
          focusMinutesThisMonth: 0,
          lastMonthReset: currentMonthKey,
        } : {}),
        ...(yearReset ? {
          completedThisYear: 0,
          lastYearReset: currentYearKey,
        } : {}),
      };
    }

    case "ADD_CATEGORY": {
      const cat = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 4),
        name: action.payload.name,
        emoji: action.payload.emoji || "📁",
        color: action.payload.color || "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
      };
      return { ...state, categories: [...(state.categories || []), cat] };
    }

    case "UPDATE_CATEGORY":
      return {
        ...state,
        categories: (state.categories || []).map((c) =>
          c.id === action.payload.id ? { ...c, ...action.payload } : c
        ),
      };

    case "DELETE_CATEGORY":
      return {
        ...state,
        categories: (state.categories || []).filter((c) => c.id !== action.payload),
        tasks: state.tasks.map((t) =>
          t.category === action.payload ? { ...t, category: null } : t
        ),
      };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migrate existing tasks: add energyCost + timeOfDay if missing
        if (parsed.tasks) {
          parsed.tasks = parsed.tasks.map((t) => {
            const migrated = { ...t };
            if (!migrated.energyCost) migrated.energyCost = "medium";
            if (migrated.scheduledTime && !migrated.timeOfDay) {
              // Infer timeOfDay from existing scheduledTime
              const h = parseInt(migrated.scheduledTime.split(":")[0], 10);
              migrated.timeOfDay = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
            }
            if (migrated.subtasks) {
              migrated.subtasks = migrated.subtasks.map((s) => ({
                ...s,
                energyCost: s.energyCost || migrated.energyCost,
              }));
            }
            return migrated;
          });
        }
        return { ...init, ...parsed };
      }
    } catch {}
    return init;
  });
  const saveTimer = useRef(null);
  const didLoad = useRef(false);

  // Load state from backend on mount
  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    const token = localStorage.getItem("dopamind-token");
    if (!token) return;
    apiFetch("/user-data/app_state")
      .then((res) => {
        if (res.data && Object.keys(res.data).length > 0) {
          dispatch({ type: "LOAD_STATE", payload: res.data });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    dispatch({ type: "RESET_DAILY" });
  }, []);

  // Persist to localStorage + debounced backend sync
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const token = localStorage.getItem("dopamind-token");
      if (!token) return;
      apiFetch("/user-data/app_state", {
        method: "PUT",
        body: JSON.stringify({ data: state }),
      }).catch(() => {});
    }, 1000);
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch, xpForLevel, xpForNextLevel }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
