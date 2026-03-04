import { useState, useEffect, useRef } from "react";
import { useI18n } from "../i18n/I18nContext";
import { useApp } from "../context/AppContext";

export default function CountdownStart({ estimatedMinutes = 25, onClose }) {
  const [count, setCount] = useState(5);
  const [started, setStarted] = useState(false);
  const { dispatch } = useApp();
  const { t } = useI18n();
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(intervalRef.current);
          setStarted(true);
          dispatch({ type: "START_FOCUS", payload: { minutes: estimatedMinutes } });
          setTimeout(onClose, 500);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [dispatch, estimatedMinutes, onClose]);

  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const offset = circ - ((5 - count) / 5) * circ;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="glass-card p-8 flex flex-col items-center gap-4 min-w-[12rem]">
        <p className="text-sm font-medium text-muted-light dark:text-muted-dark">
          {t("countdown.title")}
        </p>
        <div className="relative w-28 h-28">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="currentColor"
              className="text-gray-200 dark:text-white/10"
              strokeWidth="6"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="#6C63FF"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl font-bold font-mono">
              {started ? "🚀" : count === 0 ? t("countdown.go") : count}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="btn-ghost text-sm">
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}
