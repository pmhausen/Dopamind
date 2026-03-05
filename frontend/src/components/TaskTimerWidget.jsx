import { useState, useEffect } from "react";
import { useFocusTimer } from "../context/FocusTimerContext";
import { useApp } from "../context/AppContext";
import { useI18n } from "../i18n/I18nContext";
import { Pause, Play, Square, AlertTriangle } from "lucide-react";

export default function TaskTimerWidget() {
  const { state, dispatch } = useFocusTimer();
  const { dispatch: appDispatch } = useApp();
  const { t } = useI18n();
  const [warningDismissed, setWarningDismissed] = useState(null); // "80" or "100"

  const elapsed = state.taskElapsed;
  const estimatedSec = (state.activeTaskEstimated || 0) * 60;
  const pct = estimatedSec > 0 ? elapsed / estimatedSec : 0;

  // Reset dismissed warning when task changes
  useEffect(() => { setWarningDismissed(null); }, [state.activeTaskId]);

  if (!state.activeTaskId) return null;

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  const timeStr = hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // Cascade warning state
  const showWarning80 = estimatedSec > 0 && pct >= 0.8 && pct < 1.0 && warningDismissed !== "80" && warningDismissed !== "100";
  const showWarning100 = estimatedSec > 0 && pct >= 1.0 && warningDismissed !== "100";
  const overrunMin = pct >= 1.0 ? Math.round((elapsed - estimatedSec) / 60) : 0;

  const handlePause = () => {
    dispatch({ type: "PAUSE_TASK_TIMER" });
  };

  const handleResume = () => {
    dispatch({ type: "RESUME_TASK_TIMER" });
  };

  const handleStop = () => {
    const focusMinutes = Math.max(1, Math.round(elapsed / 60));
    if (focusMinutes >= 1) {
      appDispatch({ type: "ADD_FOCUS_MINUTES", payload: focusMinutes });
    }
    // Log task time for calibration
    appDispatch({ type: "LOG_TASK_TIME", payload: {
      id: Date.now().toString(36),
      date: new Date().toISOString().slice(0, 10),
      taskId: state.activeTaskId,
      sizeCategory: state.activeTaskSize || null,
      estimatedMin: state.activeTaskEstimated || 0,
      actualMin: focusMinutes,
      startedAt: state.taskStartedAt || null,
      stoppedAt: new Date().toISOString(),
    }});
    dispatch({ type: "STOP_TASK_TIMER" });
  };

  // Progress bar color
  const barColor = pct >= 1.0 ? "bg-danger" : pct >= 0.8 ? "bg-warn" : "bg-accent";

  return (
    <div className="fixed bottom-4 right-4 z-50 md:bottom-6 md:right-6 animate-fade-in">
      <div className="glass-card p-3 shadow-lg border border-accent/20 min-w-[220px]">
        {/* Warning banners */}
        {showWarning100 && (
          <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg bg-danger/10 text-danger text-[11px]">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1">{t("timer.overrun", { min: overrunMin })}</span>
            <button onClick={() => setWarningDismissed("100")} className="text-danger/60 hover:text-danger text-[10px]">✕</button>
          </div>
        )}
        {showWarning80 && !showWarning100 && (
          <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg bg-warn/10 text-amber-700 dark:text-warn text-[11px]">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1">{t("timer.almostDone")}</span>
            <button onClick={() => setWarningDismissed("80")} className="text-amber-700/60 hover:text-amber-700 text-[10px]">✕</button>
          </div>
        )}
        {/* Progress bar */}
        {estimatedSec > 0 && (
          <div className="h-1 rounded-full bg-gray-200 dark:bg-white/10 mb-2 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(pct * 100, 100)}%` }} />
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${state.taskRunning ? "bg-success animate-pulse" : "bg-warn"}`} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{state.activeTaskText}</p>
            <p className="text-lg font-bold font-mono tabular-nums text-accent">{timeStr}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {state.taskRunning ? (
              <button onClick={handlePause} className="w-8 h-8 rounded-lg bg-warn/10 hover:bg-warn/20 flex items-center justify-center transition-colors" title={t("focus.pause")}>
                <Pause className="w-4 h-4 text-warn" />
              </button>
            ) : (
              <button onClick={handleResume} className="w-8 h-8 rounded-lg bg-success/10 hover:bg-success/20 flex items-center justify-center transition-colors" title={t("focus.resume")}>
                <Play className="w-4 h-4 text-success" />
              </button>
            )}
            <button onClick={handleStop} className="w-8 h-8 rounded-lg bg-danger/10 hover:bg-danger/20 flex items-center justify-center transition-colors" title={t("focus.reset")}>
              <Square className="w-4 h-4 text-danger" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
