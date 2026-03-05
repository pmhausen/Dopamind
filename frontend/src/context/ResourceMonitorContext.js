import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "../services/api";

const ResourceMonitorContext = createContext();
const STORAGE_KEY = "dopamind-resource-monitor";
const LEGACY_KEY = "dopamind-timetracking";

const initialState = {
  // Automatic activity sessions (derived from task/focus interactions)
  activitySessions: [],  // [{ id, date, firstActivity, lastActivity, focusBlocks: [{start,end}], tasksCompleted: number, impliedBreaks: [{start,end}] }]
  todaySession: null,     // { date, firstActivity, lastActivity, focusBlocks, tasksCompleted, interactions: [{ts, type}] }

  // Absence modes
  absenceMode: null,       // null | { type: "sick"|"vacation", startDate, endDate?, note }
  absenceHistory: [],      // [{ id, type, startDate, endDate, note }]

  // Return triage
  pendingTriage: null,     // null | { returnDate, absenceType, startDate }

  // Legacy: keep old entries for Brain Report history (read-only migration)
  legacyEntries: [],
};

// Migrate old timetracking data to resource monitor format
function migrateLegacyState(legacy) {
  if (!legacy) return {};
  const migrated = {};
  // Convert old clock-in/out entries to activity sessions
  if (legacy.entries && legacy.entries.length > 0) {
    migrated.activitySessions = legacy.entries.map((e) => ({
      id: e.id,
      date: e.date,
      firstActivity: e.clockIn,
      lastActivity: e.clockOut,
      focusBlocks: [],
      tasksCompleted: 0,
      impliedBreaks: (e.breaks || []).filter((b) => b.start && b.end),
    }));
    migrated.legacyEntries = legacy.entries;
  }
  // Convert old absences to absence history
  if (legacy.absences && legacy.absences.length > 0) {
    migrated.absenceHistory = legacy.absences.map((a) => ({
      id: a.id,
      type: a.type,
      startDate: a.startDate || a.date,
      endDate: a.endDate || a.date,
      note: a.note || "",
    }));
  }
  return migrated;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function reducer(state, action) {
  switch (action.type) {
    // Activity tracking (automatic, triggered by external events)
    case "RECORD_ACTIVITY": {
      const now = Date.now();
      const today = todayStr();
      const interactionType = action.payload?.interactionType || "generic";
      if (state.todaySession && state.todaySession.date === today) {
        const interactions = [...(state.todaySession.interactions || []), { ts: now, type: interactionType }];
        // Detect implied breaks: gaps >5min between interactions
        const impliedBreaks = [];
        for (let i = 1; i < interactions.length; i++) {
          const gap = interactions[i].ts - interactions[i - 1].ts;
          if (gap > 5 * 60000) {
            impliedBreaks.push({ start: interactions[i - 1].ts, end: interactions[i].ts });
          }
        }
        return {
          ...state,
          todaySession: {
            ...state.todaySession,
            lastActivity: now,
            interactions,
            impliedBreaks,
            tasksCompleted: interactionType === "taskComplete"
              ? (state.todaySession.tasksCompleted || 0) + 1
              : state.todaySession.tasksCompleted || 0,
          },
        };
      }
      // New day or first activity → finalize yesterday if exists, start new session
      let sessions = state.activitySessions;
      if (state.todaySession && state.todaySession.date !== today) {
        const { interactions, ...sessionData } = state.todaySession;
        sessions = [sessionData, ...sessions];
      }
      return {
        ...state,
        activitySessions: sessions,
        todaySession: {
          date: today,
          firstActivity: now,
          lastActivity: now,
          focusBlocks: [],
          tasksCompleted: interactionType === "taskComplete" ? 1 : 0,
          impliedBreaks: [],
          interactions: [{ ts: now, type: interactionType }],
        },
      };
    }

    case "RECORD_FOCUS_BLOCK": {
      if (!state.todaySession) return state;
      const block = action.payload; // { start, end }
      return {
        ...state,
        todaySession: {
          ...state.todaySession,
          focusBlocks: [...(state.todaySession.focusBlocks || []), block],
          lastActivity: Math.max(state.todaySession.lastActivity, block.end || Date.now()),
        },
      };
    }

    // Absence modes
    case "ACTIVATE_SICK_MODE": {
      if (state.absenceMode) return state;
      return {
        ...state,
        absenceMode: {
          type: "sick",
          startDate: todayStr(),
          note: action.payload?.note || "",
        },
      };
    }

    case "ACTIVATE_VACATION_MODE": {
      if (state.absenceMode) return state;
      return {
        ...state,
        absenceMode: {
          type: "vacation",
          startDate: action.payload.startDate,
          endDate: action.payload.endDate,
          note: action.payload?.note || "",
        },
      };
    }

    case "DEACTIVATE_ABSENCE": {
      if (!state.absenceMode) return state;
      const ended = {
        id: Date.now().toString(36),
        ...state.absenceMode,
        endDate: state.absenceMode.endDate || todayStr(),
      };
      return {
        ...state,
        absenceMode: null,
        absenceHistory: [ended, ...state.absenceHistory],
        pendingTriage: {
          returnDate: todayStr(),
          absenceType: ended.type,
          startDate: ended.startDate,
        },
      };
    }

    case "DISMISS_TRIAGE": {
      return { ...state, pendingTriage: null };
    }

    case "DELETE_ABSENCE_HISTORY": {
      return {
        ...state,
        absenceHistory: state.absenceHistory.filter((a) => a.id !== action.payload),
      };
    }

    case "LOAD_STATE":
      return { ...initialState, ...action.payload };

    default:
      return state;
  }
}

export function ResourceMonitorProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => {
    try {
      // Try new storage key first
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...init, ...JSON.parse(saved) };
      // Fall back to legacy data
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const migrated = migrateLegacyState(JSON.parse(legacy));
        return { ...init, ...migrated };
      }
    } catch {}
    return init;
  });
  const saveTimer = useRef(null);
  const didLoad = useRef(false);

  // Load from backend on mount
  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    const token = localStorage.getItem("dopamind-token");
    if (!token) return;
    // Try new endpoint first, fall back to legacy
    apiFetch("/user-data/resource_monitor")
      .then((res) => {
        if (res.data && Object.keys(res.data).length > 0) {
          dispatch({ type: "LOAD_STATE", payload: res.data });
        } else {
          // Fallback: load legacy time_tracking data and migrate
          return apiFetch("/user-data/time_tracking").then((legacyRes) => {
            if (legacyRes.data && Object.keys(legacyRes.data).length > 0) {
              const migrated = migrateLegacyState(legacyRes.data);
              if (Object.keys(migrated).length > 0) {
                dispatch({ type: "LOAD_STATE", payload: migrated });
              }
            }
          });
        }
      })
      .catch(() => {});
  }, []);

  // Persist to localStorage + debounced backend sync
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const token = localStorage.getItem("dopamind-token");
      if (!token) return;
      apiFetch("/user-data/resource_monitor", {
        method: "PUT",
        body: JSON.stringify({ data: state }),
      }).catch(() => {});
    }, 1000);
  }, [state]);

  // Auto-check vacation end
  useEffect(() => {
    if (state.absenceMode?.type === "vacation" && state.absenceMode.endDate) {
      const today = todayStr();
      if (today > state.absenceMode.endDate) {
        dispatch({ type: "DEACTIVATE_ABSENCE" });
      }
    }
  }, [state.absenceMode]);

  const recordActivity = useCallback((interactionType) => {
    if (state.absenceMode) return; // Don't record activity during absence
    dispatch({ type: "RECORD_ACTIVITY", payload: { interactionType } });
  }, [state.absenceMode]);

  const recordFocusBlock = useCallback((block) => {
    dispatch({ type: "RECORD_FOCUS_BLOCK", payload: block });
  }, []);

  const isAbsent = !!state.absenceMode;
  const isSick = state.absenceMode?.type === "sick";
  const isOnVacation = state.absenceMode?.type === "vacation";
  const hasPendingTriage = !!state.pendingTriage;

  const getTodayActivity = useCallback(() => {
    if (!state.todaySession || state.todaySession.date !== todayStr()) return null;
    return state.todaySession;
  }, [state.todaySession]);

  return (
    <ResourceMonitorContext.Provider
      value={{
        state,
        dispatch,
        recordActivity,
        recordFocusBlock,
        isAbsent,
        isSick,
        isOnVacation,
        hasPendingTriage,
        getTodayActivity,
      }}
    >
      {children}
    </ResourceMonitorContext.Provider>
  );
}

export const useResourceMonitor = () => useContext(ResourceMonitorContext);
