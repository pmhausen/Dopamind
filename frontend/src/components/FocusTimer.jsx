import { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { useI18n } from "../i18n/I18nContext";

const PRESETS = [15, 25, 45];

export default function FocusTimer() {
  const { dispatch } = useApp();
  const { t } = useI18n();
  const [duration, setDuration] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const intervalRef = useRef(null);

  const totalSeconds = duration * 60;
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  const displayMin = Math.floor(secondsLeft / 60);
  const displaySec = secondsLeft % 60;

  const handleComplete = useCallback(() => {
    setRunning(false);
    setCompleted(true);
    clearInterval(intervalRef.current);
    dispatch({ type: "ADD_FOCUS_MINUTES", payload: duration });
  }, [dispatch, duration]);

  useEffect(() => {
    if (running && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
      }, 1000);
      return () => clearInterval(intervalRef.current);
    } else if (running && secondsLeft === 0) {
      handleComplete();
    }
  }, [running, secondsLeft, handleComplete]);

  const handleStart = () => {
    if (completed) {
      setCompleted(false);
      setSecondsLeft(duration * 60);
    }
    setRunning(true);
  };

  const handlePause = () => {
    setRunning(false);
    clearInterval(intervalRef.current);
  };

  const handleReset = () => {
    setRunning(false);
    setCompleted(false);
    clearInterval(intervalRef.current);
    setSecondsLeft(duration * 60);
  };

  const handlePreset = (mins) => {
    if (running) return;
    setDuration(mins);
    setSecondsLeft(mins * 60);
    setCompleted(false);
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
    </div>
  );
}
