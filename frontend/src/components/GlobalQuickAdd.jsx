import { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { useSettings } from "../context/SettingsContext";
import { useI18n } from "../i18n/I18nContext";
import { X, Check, ChevronRight } from "lucide-react";

const PRIORITY_COLORS = {
  high: "bg-danger/10 text-danger dark:bg-danger/20",
  medium: "bg-warn/10 text-amber-700 dark:bg-warn/20 dark:text-warn",
  low: "bg-success/10 text-success dark:bg-success/20",
};
const ENERGY_COLORS = {
  low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};
const SIZE_COLORS = {
  quick: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  short: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  long: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
};

const STEPS = ["name", "priority", "when", "energy", "duration"];
const PRIORITY_KEYS = ["high", "medium", "low"];
const WHEN_KEYS = ["today", "tomorrow", "dayAfter", "nextWeek"];
const ENERGY_KEYS = ["low", "medium", "high"];
const SIZE_KEYS = ["quick", "short", "medium", "long"];

function resolveWhen(key) {
  const today = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10);
  if (key === "today") return fmt(today);
  if (key === "tomorrow") { const d = new Date(today); d.setDate(d.getDate() + 1); return fmt(d); }
  if (key === "dayAfter") { const d = new Date(today); d.setDate(d.getDate() + 2); return fmt(d); }
  if (key === "nextWeek") { const d = new Date(today); d.setDate(d.getDate() + (8 - d.getDay()) % 7 || 7); return fmt(d); }
  return null;
}

export default function GlobalQuickAdd() {
  const { state, dispatch } = useApp();
  const { settings } = useSettings();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [text, setText] = useState("");
  const [priority, setPriority] = useState("medium");
  const [when, setWhen] = useState("today");
  const [energy, setEnergy] = useState("medium");
  const [size, setSize] = useState("medium");
  const [flash, setFlash] = useState(false);
  const inputRef = useRef(null);
  const bubbleRef = useRef(null);

  const sizeMappings = settings.estimation?.sizeMappings || { quick: 10, short: 25, medium: 45, long: 90 };

  // Smart default: if today has >5 tasks, default to tomorrow
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTaskCount = (state.tasks || []).filter(
    (tk) => !tk.completed && (tk.scheduledDate === todayStr || (!tk.scheduledDate && tk.createdAt && new Date(tk.createdAt).toISOString().slice(0, 10) === todayStr))
  ).length;
  const smartWhenDefault = todayTaskCount > 5 ? "tomorrow" : "today";

  const reset = useCallback(() => {
    setStep(0);
    setText("");
    setPriority("high");
    setWhen(smartWhenDefault);
    setEnergy("medium");
    setSize("medium");
    setFlash(false);
  }, [smartWhenDefault]);

  const handleOpen = useCallback(() => {
    reset();
    setWhen(smartWhenDefault);
    setOpen(true);
  }, [reset, smartWhenDefault]);

  const handleClose = useCallback(() => {
    setOpen(false);
    reset();
  }, [reset]);

  const handleSubmit = useCallback(() => {
    if (!text.trim()) return;
    dispatch({
      type: "ADD_TASK",
      payload: {
        text: text.trim(),
        priority,
        energyCost: energy,
        estimatedMinutes: sizeMappings[size] || 25,
        sizeCategory: size,
        scheduledDate: resolveWhen(when),
        timeOfDay: null,
      },
    });
    setFlash(true);
    setTimeout(() => { handleClose(); }, 600);
  }, [text, priority, energy, size, when, sizeMappings, dispatch, handleClose]);

  // Advance to next step or submit
  const advance = useCallback(() => {
    if (step === 0 && !text.trim()) return;
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      handleSubmit();
    }
  }, [step, text, handleSubmit]);

  // Global keydown: Enter opens bubble (when no input focused)
  useEffect(() => {
    const handler = (e) => {
      if (open) return; // bubble handles its own keys
      if (e.key !== "Enter") return;
      const tag = document.activeElement?.tagName?.toLowerCase();
      const editable = document.activeElement?.isContentEditable;
      if (tag === "input" || tag === "textarea" || tag === "select" || editable) return;
      // Don't open if a modal/dialog is visible
      if (document.querySelector("[role='dialog']") || document.querySelector(".modal-card")) return;
      e.preventDefault();
      handleOpen();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, handleOpen]);

  // 3-finger tap for mobile
  useEffect(() => {
    const handler = (e) => {
      if (open) return;
      if (e.touches.length === 3) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;
        e.preventDefault();
        handleOpen();
      }
    };
    document.addEventListener("touchstart", handler, { passive: false });
    return () => document.removeEventListener("touchstart", handler);
  }, [open, handleOpen]);

  // Autofocus input on step 0
  useEffect(() => {
    if (open && step === 0 && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, step]);

  // Keyboard navigation inside bubble
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") { handleClose(); return; }
      if (e.key === "Enter") {
        // On step 0, Enter in input advances
        if (step === 0 && document.activeElement === inputRef.current) {
          e.preventDefault();
          advance();
          return;
        }
        // On other steps, Enter confirms default selection
        if (step > 0) {
          e.preventDefault();
          advance();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, step, advance, handleClose]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target)) handleClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, handleClose]);

  if (!open) return null;

  const stepLabels = [
    t("quickBubble.stepName"),
    t("quickBubble.stepPriority"),
    t("quickBubble.stepWhen"),
    t("quickBubble.stepEnergy"),
    t("quickBubble.stepDuration"),
  ];

  const renderStepIndicator = () => (
    <div className="flex gap-1 justify-center mb-3">
      {STEPS.map((_, i) => (
        <div key={i} className={`h-1 rounded-full transition-all ${i <= step ? "bg-accent w-6" : "bg-gray-200 dark:bg-white/10 w-3"}`} />
      ))}
    </div>
  );

  const btnClass = (active) =>
    `px-3 py-2 rounded-xl text-xs font-medium transition-all ${active ? "ring-2 ring-accent shadow-sm scale-105" : "hover:scale-102"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40 animate-fade-in">
      <div ref={bubbleRef} className={`glass-card p-5 w-full max-w-sm mx-4 shadow-2xl border border-accent/20 ${flash ? "ring-2 ring-success animate-pulse" : ""}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-muted-light dark:text-muted-dark uppercase tracking-wider font-semibold">
            {stepLabels[step]}
          </span>
          <button onClick={handleClose} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {renderStepIndicator()}

        {/* Success flash */}
        {flash && (
          <div className="flex items-center justify-center gap-2 py-4 animate-fade-in">
            <Check className="w-5 h-5 text-success" />
            <span className="text-sm font-medium text-success">{t("quickBubble.created")}</span>
          </div>
        )}

        {/* Step content */}
        {!flash && (
          <div className="animate-fade-in">
            {step === 0 && (
              <div>
                <input
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t("quickBubble.stepName")}
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
                  autoFocus
                />
              </div>
            )}

            {step === 1 && (
              <div className="flex gap-2">
                {PRIORITY_KEYS.map((key) => (
                  <button
                    key={key}
                    onClick={() => { setPriority(key); setStep(2); }}
                    className={`${btnClass(priority === key)} flex-1 ${PRIORITY_COLORS[key]}`}
                  >
                    {t(`tasks.priority.${key}`)}
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="flex gap-2 flex-wrap">
                {WHEN_KEYS.map((key) => (
                  <button
                    key={key}
                    onClick={() => { setWhen(key); setStep(3); }}
                    className={`${btnClass(when === key)} flex-1 min-w-[70px] ${when === key ? "bg-accent/10 text-accent" : "bg-gray-50 dark:bg-white/5 text-muted-light dark:text-muted-dark"}`}
                  >
                    {t(`tasks.whenOptions.${key}`)}
                  </button>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="flex gap-2">
                {ENERGY_KEYS.map((key) => (
                  <button
                    key={key}
                    onClick={() => { setEnergy(key); setStep(4); }}
                    className={`${btnClass(energy === key)} flex-1 ${ENERGY_COLORS[key]}`}
                  >
                    {t(`tasks.energy.${key}`)}
                  </button>
                ))}
              </div>
            )}

            {step === 4 && (
              <div className="flex gap-2">
                {SIZE_KEYS.map((key) => (
                  <button
                    key={key}
                    onClick={() => { setSize(key); setTimeout(handleSubmit, 50); }}
                    className={`${btnClass(size === key)} flex-1 text-center ${SIZE_COLORS[key]}`}
                  >
                    <span className="block">{t(`tasks.size.${key}`)}</span>
                    <span className="block text-[9px] opacity-60 mt-0.5">~{sizeMappings[key]}{t("common.min")}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Next/Done button */}
            <button
              onClick={advance}
              disabled={step === 0 && !text.trim()}
              className={`mt-3 w-full py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                step === 0 && !text.trim()
                  ? "bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed"
                  : "btn-primary"
              }`}
            >
              {step === STEPS.length - 1 ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  {t("quickBubble.done")}
                </>
              ) : (
                <>
                  {t("quickBubble.next")}
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            {/* Enter hint */}
            <p className="text-center text-[9px] text-muted-light dark:text-muted-dark mt-1.5 opacity-60">
              Enter ↵
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
