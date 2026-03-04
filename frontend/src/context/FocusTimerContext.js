import { createContext, useContext, useReducer, useEffect, useRef } from "react";

const FocusTimerContext = createContext();

const initialState = {
  duration: 25,        // selected duration in minutes
  secondsLeft: 25 * 60,
  running: false,
  completed: false,
  flowDetected: false,
  pauseSuggestion: null,
  // Task-specific timer state
  activeTaskId: null,   // id of task being timed
  activeTaskText: null,  // text for display
  taskElapsed: 0,       // seconds elapsed on the active task
  taskRunning: false,    // whether the task timer is running
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_DURATION":
      return { ...state, duration: action.payload, secondsLeft: action.payload * 60, completed: false, pauseSuggestion: null, flowDetected: false };
    case "TICK":
      return { ...state, secondsLeft: Math.max(0, state.secondsLeft - 1) };
    case "START":
      return { ...state, running: true, completed: false };
    case "PAUSE":
      return { ...state, running: false };
    case "COMPLETE":
      return { ...state, running: false, completed: true, pauseSuggestion: action.payload?.pauseSuggestion || null };
    case "RESET":
      return { ...state, running: false, completed: false, secondsLeft: state.duration * 60, flowDetected: false, pauseSuggestion: null };
    case "SET_FLOW":
      return { ...state, flowDetected: action.payload };
    // Task timer actions
    case "START_TASK_TIMER":
      return { ...state, activeTaskId: action.payload.id, activeTaskText: action.payload.text, taskElapsed: 0, taskRunning: true };
    case "PAUSE_TASK_TIMER":
      return { ...state, taskRunning: false };
    case "RESUME_TASK_TIMER":
      return { ...state, taskRunning: true };
    case "STOP_TASK_TIMER":
      return { ...state, activeTaskId: null, activeTaskText: null, taskElapsed: 0, taskRunning: false };
    case "TICK_TASK":
      return { ...state, taskElapsed: state.taskElapsed + 1 };
    default:
      return state;
  }
}

export function FocusTimerProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const intervalRef = useRef(null);
  const taskIntervalRef = useRef(null);

  // Focus timer interval
  useEffect(() => {
    if (state.running && state.secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        dispatch({ type: "TICK" });
      }, 1000);
      return () => clearInterval(intervalRef.current);
    }
  }, [state.running, state.secondsLeft]);

  // Task timer interval
  useEffect(() => {
    if (state.taskRunning && state.activeTaskId) {
      taskIntervalRef.current = setInterval(() => {
        dispatch({ type: "TICK_TASK" });
      }, 1000);
      return () => clearInterval(taskIntervalRef.current);
    }
  }, [state.taskRunning, state.activeTaskId]);

  const value = { state, dispatch };

  return (
    <FocusTimerContext.Provider value={value}>
      {children}
    </FocusTimerContext.Provider>
  );
}

export function useFocusTimer() {
  const ctx = useContext(FocusTimerContext);
  if (!ctx) throw new Error("useFocusTimer must be used within FocusTimerProvider");
  return ctx;
}
