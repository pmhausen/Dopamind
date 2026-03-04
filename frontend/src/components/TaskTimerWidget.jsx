import { useFocusTimer } from "../context/FocusTimerContext";
import { useApp } from "../context/AppContext";
import { useI18n } from "../i18n/I18nContext";
import { Pause, Play, Square } from "lucide-react";

export default function TaskTimerWidget() {
  const { state, dispatch } = useFocusTimer();
  const { dispatch: appDispatch } = useApp();
  const { t } = useI18n();

  if (!state.activeTaskId) return null;

  const elapsed = state.taskElapsed;
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  const timeStr = hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const handlePause = () => {
    dispatch({ type: "PAUSE_TASK_TIMER" });
  };

  const handleResume = () => {
    dispatch({ type: "RESUME_TASK_TIMER" });
  };

  const handleStop = () => {
    // Award focus minutes for the time spent
    const focusMinutes = Math.max(1, Math.round(elapsed / 60));
    if (focusMinutes >= 1) {
      appDispatch({ type: "ADD_FOCUS_MINUTES", payload: focusMinutes });
    }
    dispatch({ type: "STOP_TASK_TIMER" });
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 md:bottom-6 md:right-6 animate-fade-in">
      <div className="glass-card p-3 shadow-lg border border-accent/20 flex items-center gap-3 min-w-[220px]">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${state.taskRunning ? "bg-success animate-pulse" : "bg-warn"}`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{state.activeTaskText}</p>
          <p className="text-lg font-bold font-mono tabular-nums text-accent">{timeStr}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {state.taskRunning ? (
            <button
              onClick={handlePause}
              className="w-8 h-8 rounded-lg bg-warn/10 hover:bg-warn/20 flex items-center justify-center transition-colors"
              title={t("focus.pause")}
            >
              <Pause className="w-4 h-4 text-warn" />
            </button>
          ) : (
            <button
              onClick={handleResume}
              className="w-8 h-8 rounded-lg bg-success/10 hover:bg-success/20 flex items-center justify-center transition-colors"
              title={t("focus.resume")}
            >
              <Play className="w-4 h-4 text-success" />
            </button>
          )}
          <button
            onClick={handleStop}
            className="w-8 h-8 rounded-lg bg-danger/10 hover:bg-danger/20 flex items-center justify-center transition-colors"
            title={t("focus.reset")}
          >
            <Square className="w-4 h-4 text-danger" />
          </button>
        </div>
      </div>
    </div>
  );
}
