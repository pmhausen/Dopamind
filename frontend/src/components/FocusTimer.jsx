import { useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { useI18n } from "../i18n/I18nContext";
import { useSettings } from "../context/SettingsContext";
import { useFocusTimer } from "../context/FocusTimerContext";

const PRESETS = [15, 25, 45];

const PAUSE_ACTIVITIES = [
  "🚶 Kurz spazieren gehen",
  "💧 Ein Glas Wasser trinken",
  "🧘 2 Minuten tief atmen",
  "👁 Augen 20 Sekunden entspannen",
  "🤸 Kurz strecken",
  "☀️ Ans Fenster treten",
  "🎵 Ein Lied genießen",
  "🍎 Gesunden Snack holen",
  "📝 Gedanken notieren",
  "😄 Jemanden anlächeln",
  "🌿 Pflanze gießen",
  "🧹 Schreibtisch aufräumen",
  "📖 Eine Seite lesen",
  "🎨 Kurz kritzeln",
  "🐾 Haustier streicheln",
  "☕ Tee oder Kaffee machen",
  "💭 Tagträumen",
  "👐 Hände waschen",
  "🧠 Wortspiel denken",
  "🎯 Kurz meditieren",
];

export default function FocusTimer() {
  const { dispatch: appDispatch } = useApp();
  const { t } = useI18n();
  const { settings } = useSettings();
  const { state: timerState, dispatch } = useFocusTimer();

  const { duration, secondsLeft, running, completed, flowDetected, pauseSuggestion } = timerState;

  const flowShieldEnabled = settings.gamification?.flowShieldEnabled !== false;
  const pauseSuggestionsEnabled = settings.gamification?.pauseSuggestionsEnabled !== false;

  const totalSeconds = duration * 60;
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  const displayMin = Math.floor(secondsLeft / 60);
  const displaySec = secondsLeft % 60;

  const handleComplete = useCallback(() => {
    const suggestion = pauseSuggestionsEnabled
      ? PAUSE_ACTIVITIES[Math.floor(Math.random() * PAUSE_ACTIVITIES.length)]
      : null;
    dispatch({ type: "COMPLETE", payload: { pauseSuggestion: suggestion } });
    appDispatch({ type: "ADD_FOCUS_MINUTES", payload: duration, flow: flowDetected && flowShieldEnabled });
    dispatch({ type: "SET_FLOW", payload: false });
  }, [appDispatch, dispatch, duration, flowDetected, pauseSuggestionsEnabled, flowShieldEnabled]);

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
      <h2 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">
        {t("focus.title")}
      </h2>

      {flowDetected && flowShieldEnabled && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
          🌊 {t("focus.flowDetected")}
        </div>
      )}

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

        {pauseSuggestion && pauseSuggestionsEnabled && completed && (
          <div className="mt-3 px-3 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs text-center animate-fade-in">
            <p className="font-medium mb-0.5">{t("focus.pauseSuggestion")}</p>
            <p>{pauseSuggestion}</p>
          </div>
        )}
      </div>
    </div>
  );
}
