import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "../services/api";

const TimeTrackingContext = createContext();
const STORAGE_KEY = "dopamind-timetracking";

const initialState = {
  currentSession: null, // { clockIn: timestamp, breaks: [{ start, end? }] }
  entries: [],          // [{ id, date, clockIn, clockOut, breaks, totalMinutes }]
  absences: [],         // [{ id, startDate, endDate, type, note }]
};

function calcSessionMinutes(session) {
  if (!session) return 0;
  const end = session.clockOut || Date.now();
  const totalMs = end - session.clockIn;
  const breakMs = (session.breaks || []).reduce((sum, b) => {
    return sum + ((b.end || Date.now()) - b.start);
  }, 0);
  return Math.round((totalMs - breakMs) / 60000);
}

function reducer(state, action) {
  switch (action.type) {
    case "CLOCK_IN": {
      if (state.currentSession) return state;
      return {
        ...state,
        currentSession: { clockIn: Date.now(), breaks: [] },
      };
    }
    case "CLOCK_OUT": {
      if (!state.currentSession) return state;
      const session = state.currentSession;
      // End any open break
      const breaks = session.breaks.map((b) =>
        b.end ? b : { ...b, end: Date.now() }
      );
      const entry = {
        id: Date.now().toString(36),
        date: new Date(session.clockIn).toISOString().slice(0, 10),
        clockIn: session.clockIn,
        clockOut: Date.now(),
        breaks,
        totalMinutes: calcSessionMinutes({ ...session, breaks, clockOut: Date.now() }),
      };
      return {
        ...state,
        currentSession: null,
        entries: [entry, ...state.entries],
      };
    }
    case "START_BREAK": {
      if (!state.currentSession) return state;
      const openBreak = state.currentSession.breaks.find((b) => !b.end);
      if (openBreak) return state;
      return {
        ...state,
        currentSession: {
          ...state.currentSession,
          breaks: [...state.currentSession.breaks, { start: Date.now() }],
        },
      };
    }
    case "END_BREAK": {
      if (!state.currentSession) return state;
      return {
        ...state,
        currentSession: {
          ...state.currentSession,
          breaks: state.currentSession.breaks.map((b) =>
            b.end ? b : { ...b, end: Date.now() }
          ),
        },
      };
    }
    case "ADD_ABSENCE": {
      return {
        ...state,
        absences: [
          { id: Date.now().toString(36), ...action.payload },
          ...state.absences,
        ],
      };
    }
    case "DELETE_ABSENCE": {
      return {
        ...state,
        absences: state.absences.filter((a) => a.id !== action.payload),
      };
    }
    case "DELETE_ENTRY": {
      return {
        ...state,
        entries: state.entries.filter((e) => e.id !== action.payload),
      };
    }
    case "UPDATE_ENTRY": {
      return {
        ...state,
        entries: state.entries.map((e) =>
          e.id === action.payload.id ? { ...e, ...action.payload } : e
        ),
      };
    }
    case "UPDATE_ABSENCE": {
      return {
        ...state,
        absences: state.absences.map((a) =>
          a.id === action.payload.id ? { ...a, ...action.payload } : a
        ),
      };
    }
    case "LOAD_STATE":
      return { ...initialState, ...action.payload };
    default:
      return state;
  }
}

export function TimeTrackingProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...init, ...JSON.parse(saved) };
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
    apiFetch("/user-data/time_tracking")
      .then((res) => {
        if (res.data && Object.keys(res.data).length > 0) {
          dispatch({ type: "LOAD_STATE", payload: res.data });
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
      apiFetch("/user-data/time_tracking", {
        method: "PUT",
        body: JSON.stringify({ data: state }),
      }).catch(() => {});
    }, 1000);
  }, [state]);

  const getSessionMinutes = useCallback(() => {
    return calcSessionMinutes(state.currentSession);
  }, [state.currentSession]);

  const isOnBreak = state.currentSession?.breaks.some((b) => !b.end) ?? false;

  const getTodayMinutes = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayEntries = state.entries.filter((e) => e.date === today);
    const pastMinutes = todayEntries.reduce((sum, e) => sum + e.totalMinutes, 0);
    const currentMinutes = state.currentSession ? calcSessionMinutes(state.currentSession) : 0;
    return pastMinutes + currentMinutes;
  }, [state.entries, state.currentSession]);

  const getWeekMinutes = useCallback(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    const weekEntries = state.entries.filter(
      (e) => new Date(e.date) >= weekStart
    );
    const pastMinutes = weekEntries.reduce((sum, e) => sum + e.totalMinutes, 0);
    const currentMinutes = state.currentSession ? calcSessionMinutes(state.currentSession) : 0;
    return pastMinutes + currentMinutes;
  }, [state.entries, state.currentSession]);

  return (
    <TimeTrackingContext.Provider
      value={{ state, dispatch, getSessionMinutes, getTodayMinutes, getWeekMinutes, isOnBreak }}
    >
      {children}
    </TimeTrackingContext.Provider>
  );
}

export const useTimeTracking = () => useContext(TimeTrackingContext);
