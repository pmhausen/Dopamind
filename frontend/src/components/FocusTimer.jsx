import { useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { useI18n } from "../i18n/I18nContext";
import { useSettings } from "../context/SettingsContext";
import { useFocusTimer } from "../context/FocusTimerContext";

const PRESETS = [15, 25, 45];

export default function FocusTimer({ layout = "vertical" }) {
  const { dispatch: appDispatch } = useApp();
  const { t } = useI18n();
  const { settings } = useSettings();
  const { state: timerState, dispatch } = useFocusTimer();

  const { duration, secondsLeft, running, completed, flowDetected } = timerState;

  const flowShieldEnabled = settings.gamification?.flowShieldEnabled !== false;

  const totalSeconds = duration * 60;
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  const displayMin = Math.floor(secondsLeft / 60);
  const displaySec = secondsLeft % 60;

  const handleComplete = useCallback(() => {
    dispatch({ type: "COMPLETE" });
    appDispatch({ type: "ADD_FOCUS_MINUTES", payload: duration, flow: flowDetected && flowShieldEnabled });
    dispatch({ type: "SET_FLOW", payload: false });
  }, [appDispatch, dispatch, duration, flowDetected, flowShieldEnabled]);

  // Detect timer completion
  useEffect(() => {
    if (running && secondsLeft === 0) {
      handleComplete();
    }
  }, [running, secondsLeft, handleComplete]);

  // Flow detection: elapsed >= 45 minutes
  useEffect(() => {
    if (!running || !flowShieldEnabled) return;
    const elapsed = totalSeconds - secondsLeft;
    if (elapsed >= 45 * 60 && !flowDetected) {
      dispatch({ type: "SET_FLOW", payload: true });
      appDispatch({ type: "SET_FLOW_MODE", payload: true });
    }
  }, [running, secondsLeft, totalSeconds, flowDetected, flowShieldEnabled, appDispatch, dispatch]);

  const handleStart = () => {
    if (completed) {
      dispatch({ type: "RESET" });
    }
    dispatch({ type: "SET_FLOW", payload: false });
    dispatch({ type: "START" });
  };

  const handlePause = () => {
    dispatch({ type: "PAUSE" });
    appDispatch({ type: "SET_FLOW_MODE", payload: false });
  };

  const handleReset = () => {
    dispatch({ type: "RESET" });
    appDispatch({ type: "SET_FLOW_MODE", payload: false });
  };

  const handlePreset = (mins) => {
    if (running) return;
    dispatch({ type: "SET_DURATION", payload: mins });
  };

  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (progress / 100) * circumference;

  const buttonLabel = completed
    ? t("focus.again")
    : secondsLeft < totalSeconds
    ? t("focus.resume")
    : t("focus.start");

  return (
    <div className="glass-card p-5 animate-fade-in">
      {layout === "vertical" && (
        <h2 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">
          {t("focus.title")}
        </h2>
      )}

      {layout === "vertical" && flowDetected && flowShieldEnabled && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
          🌊 {t("focus.flowDetected")}
        </div>
      )}

      {layout === "vertical" ? (
        <div className="flex flex-col items-center">
          <div className="relative w-40 h-40 mb-4">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r={radius} fill="none" stroke="currentColor" className="text-gray-200 dark:text-white/10" strokeWidth="6" />
              <circle cx="64" cy="64" r={radius} fill="none" stroke="url(#timer-gradient)" strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeOffset} className="transition-all duration-1000 ease-linear" />
              <defs>
                <linearGradient id="timer-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6C63FF" />
                  <stop offset="100%" stopColor="#A29BFE" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-mono font-semibold tabular-nums">
                {String(displayMin).padStart(2, "0")}:{String(displaySec).padStart(2, "0")}
              </span>
              {completed && (
                <span className="text-xs text-success font-medium mt-1 animate-fade-in">
                  {t("focus.done")}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            {PRESETS.map((mins) => (
              <button
                key={mins}
                onClick={() => handlePreset(mins)}
                disabled={running}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  duration === mins && !running
                    ? "bg-accent/10 text-accent dark:bg-accent/20 ring-1 ring-accent/20"
                    : "text-muted-light dark:text-muted-dark hover:bg-gray-100 dark:hover:bg-white/5"
                } disabled:opacity-50`}
              >
                {mins} {t("common.min")}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {!running ? (
              <button onClick={handleStart} className="btn-primary text-sm px-6">
                {buttonLabel}
              </button>
            ) : (
              <button onClick={handlePause} className="btn-primary text-sm px-6 bg-warn hover:bg-amber-500">
                {t("focus.pause")}
              </button>
            )}
            {(running || secondsLeft < totalSeconds) && (
              <button onClick={handleReset} className="btn-ghost text-sm">
                {t("focus.reset")}
              </button>
            )}
          </div>

          <p className="text-[10px] text-muted-light dark:text-muted-dark mt-3">
            {t("focus.xpHint", { xp: duration * 2 })}
          </p>
        </div>
      ) : (
        /* Horizontal layout */
        <div className="flex items-center gap-4">
          {/* SVG circle (small) */}
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r={radius} fill="none" stroke="currentColor" className="text-gray-200 dark:text-white/10" strokeWidth="6" />
              <circle cx="64" cy="64" r={radius} fill="none" stroke="url(#timer-gradient-h)" strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeOffset} className="transition-all duration-1000 ease-linear" />
              <defs>
                <linearGradient id="timer-gradient-h" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6C63FF" />
                  <stop offset="100%" stopColor="#A29BFE" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-base font-mono font-semibold tabular-nums">
                {String(displayMin).padStart(2, "0")}:{String(displaySec).padStart(2, "0")}
              </span>
              {completed && (
                <span className="text-[10px] text-success font-medium animate-fade-in">
                  {t("focus.done")}
                </span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mr-1">{t("focus.title")}</span>
              {PRESETS.map((mins) => (
                <button
                  key={mins}
                  onClick={() => handlePreset(mins)}
                  disabled={running}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    duration === mins && !running
                      ? "bg-accent/10 text-accent dark:bg-accent/20 ring-1 ring-accent/20"
                      : "text-muted-light dark:text-muted-dark hover:bg-gray-100 dark:hover:bg-white/5"
                  } disabled:opacity-50`}
                >
                  {mins}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {!running ? (
                <button onClick={handleStart} className="btn-primary text-xs px-4 py-1.5">
                  {buttonLabel}
                </button>
              ) : (
                <button onClick={handlePause} className="btn-primary text-xs px-4 py-1.5 bg-warn hover:bg-amber-500">
                  {t("focus.pause")}
                </button>
              )}
              {(running || secondsLeft < totalSeconds) && (
                <button onClick={handleReset} className="btn-ghost text-xs py-1.5">
                  {t("focus.reset")}
                </button>
              )}
              <span className="text-[10px] text-muted-light dark:text-muted-dark ml-1">
                {t("focus.xpHint", { xp: duration * 2 })}
              </span>
            </div>
          </div>

          {/* Flow indicator (horizontal) */}
          {flowDetected && flowShieldEnabled && (
            <div className="flex-shrink-0 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium animate-fade-in">
              🌊
            </div>
          )}
        </div>
      )}
    </div>
  );
}
