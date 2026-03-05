import { useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { useFocusTimer } from "../context/FocusTimerContext";
import { useResourceMonitor } from "../context/ResourceMonitorContext";

/**
 * Bridge component that wires AppContext/FocusTimerContext events
 * to ResourceMonitorContext.recordActivity for automatic activity detection.
 * Renders nothing; just side-effects.
 */
export default function ActivityBridge() {
  const { state: appState } = useApp();
  const { state: ftState } = useFocusTimer();
  const { recordActivity, recordFocusBlock } = useResourceMonitor();

  // Track task completions
  const prevCompleted = useRef(appState.completedToday);
  useEffect(() => {
    if (appState.completedToday > prevCompleted.current) {
      recordActivity("taskComplete");
    }
    prevCompleted.current = appState.completedToday;
  }, [appState.completedToday, recordActivity]);

  // Track focus timer completions
  const prevFocusCompleted = useRef(ftState.completed);
  const focusStartRef = useRef(null);
  useEffect(() => {
    if (ftState.running && !focusStartRef.current) {
      focusStartRef.current = Date.now();
      recordActivity("focusStart");
    }
    if (ftState.completed && !prevFocusCompleted.current && focusStartRef.current) {
      const block = { start: focusStartRef.current, end: Date.now() };
      recordFocusBlock(block);
      recordActivity("focusComplete");
      focusStartRef.current = null;
    }
    if (!ftState.running && !ftState.completed) {
      focusStartRef.current = null;
    }
    prevFocusCompleted.current = ftState.completed;
  }, [ftState.running, ftState.completed, recordActivity, recordFocusBlock]);

  // Track task timer starts
  const prevTaskTimer = useRef(ftState.activeTaskId);
  useEffect(() => {
    if (ftState.activeTaskId && ftState.activeTaskId !== prevTaskTimer.current) {
      recordActivity("taskTimerStart");
    }
    prevTaskTimer.current = ftState.activeTaskId;
  }, [ftState.activeTaskId, recordActivity]);

  return null;
}
