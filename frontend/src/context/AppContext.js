import { createContext, useContext, useReducer, useEffect } from "react";

const AppContext = createContext();

const STORAGE_KEY = "dopamind-state";

const initialState = {
  tasks: [],
  xp: 0,
  level: 1,
  streak: 0,
  completedToday: 0,
  focusMinutesToday: 0,
  rewards: [],
};

function calcLevel(xp) {
  // Each level requires progressively more XP
  return Math.floor(1 + Math.sqrt(xp / 50));
}

function xpForLevel(level) {
  return (level - 1) * (level - 1) * 50;
}

function xpForNextLevel(level) {
  return level * level * 50;
}

function reducer(state, action) {
  switch (action.type) {
    case "ADD_TASK": {
      const task = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        text: action.payload.text,
        priority: action.payload.priority || "medium",
        estimatedMinutes: action.payload.estimatedMinutes || 25,
        completed: false,
        createdAt: Date.now(),
        deadline: action.payload.deadline || null,
        mailRef: action.payload.mailRef || null,
        subtasks: action.payload.subtasks || [],
      };
      return { ...state, tasks: [...state.tasks, task] };
    }

    case "UPDATE_TASK":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload.id ? { ...t, ...action.payload } : t
        ),
      };

    case "ADD_SUBTASK": {
      const { taskId, text } = action.payload;
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === taskId
            ? { ...t, subtasks: [...(t.subtasks || []), { id: Date.now().toString(36), text, completed: false }] }
            : t
        ),
      };
    }

    case "TOGGLE_SUBTASK": {
      const { taskId: tId, subtaskId } = action.payload;
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === tId
            ? { ...t, subtasks: (t.subtasks || []).map((s) => s.id === subtaskId ? { ...s, completed: !s.completed } : s) }
            : t
        ),
      };
    }

    case "DELETE_SUBTASK": {
      const { taskId: dtId, subtaskId: dsId } = action.payload;
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === dtId
            ? { ...t, subtasks: (t.subtasks || []).filter((s) => s.id !== dsId) }
            : t
        ),
      };
    }

    case "COMPLETE_TASK": {
      const task = state.tasks.find((t) => t.id === action.payload);
      if (!task || task.completed) return state;

      const xpGain =
        task.priority === "high" ? 30 : task.priority === "medium" ? 20 : 10;
      const newXp = state.xp + xpGain;
      const newLevel = calcLevel(newXp);
      const leveledUp = newLevel > state.level;

      const newRewards = [...state.rewards];
      if (leveledUp) {
        newRewards.push({
          id: Date.now(),
          type: "level-up",
          message: `Level ${newLevel} erreicht!`,
          timestamp: Date.now(),
        });
      }

      const completedToday = state.completedToday + 1;
      if (completedToday === 3 && !state.rewards.find((r) => r.type === "hat-trick")) {
        newRewards.push({
          id: Date.now() + 1,
          type: "hat-trick",
          message: "Hat-Trick! 3 Aufgaben erledigt!",
          timestamp: Date.now(),
        });
      }

      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload ? { ...t, completed: true } : t
        ),
        xp: newXp,
        level: newLevel,
        completedToday,
        rewards: newRewards,
      };
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
      };

    case "ADD_FOCUS_MINUTES":
      return {
        ...state,
        focusMinutesToday: state.focusMinutesToday + action.payload,
        xp: state.xp + action.payload * 2,
        level: calcLevel(state.xp + action.payload * 2),
      };

    case "DISMISS_REWARD":
      return {
        ...state,
        rewards: state.rewards.filter((r) => r.id !== action.payload),
      };

    case "LOAD_STATE":
      return { ...state, ...action.payload };

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
        return { ...init, ...parsed };
      }
    } catch {}
    return init;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch, xpForLevel, xpForNextLevel }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
