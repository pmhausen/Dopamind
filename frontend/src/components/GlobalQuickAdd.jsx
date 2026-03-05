import { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { useSettings } from "../context/SettingsContext";
import { useI18n } from "../i18n/I18nContext";
import { useQuickAdd } from "../context/QuickAddContext";
import { X, Check, ChevronRight, ChevronDown, AlertCircle, Folder, Tag } from "lucide-react";

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
const TAG_COLORS = [
  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
];
function getTagColor(tag) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) & 0xffff;
  return TAG_COLORS[hash % TAG_COLORS.length];
}
function sanitizeTag(input) {
  return input.trim().replace(/,/g, "");
}

const STEPS = ["name", "priority", "when", "energy", "duration", "finish"];
const PRIORITY_KEYS = ["high", "medium", "low"];
const WHEN_KEYS = ["today", "tomorrow", "dayAfter", "nextWeek"];
const ENERGY_KEYS = ["low", "medium", "high"];
const SIZE_KEYS = ["quick", "short", "medium", "long"];
const TIME_OF_DAY_OPTIONS = ["morning", "afternoon", "evening", "exact"];

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
  const { quickAddOptions, closeQuickAdd } = useQuickAdd();
  const open = quickAddOptions !== null;
  const mode = quickAddOptions?.mode || "task";
  const parentTaskId = quickAddOptions?.parentTaskId || null;
  const inheritedCategory = quickAddOptions?.inheritedCategory || null;
  const contextCategories = quickAddOptions?.categories || null;

  const [step, setStep] = useState(0);
  const [text, setText] = useState("");
  const [priority, setPriority] = useState("medium");
  const [when, setWhen] = useState("today");
  const [energy, setEnergy] = useState("medium");
  const [size, setSize] = useState("medium");
  const [flash, setFlash] = useState(false);

  // Detail form state
  const [showDetails, setShowDetails] = useState(false);
  const [detailTimeOfDay, setDetailTimeOfDay] = useState("");
  const [detailScheduledTime, setDetailScheduledTime] = useState("");
  const [detailDeadline, setDetailDeadline] = useState("");
  const [detailCategory, setDetailCategory] = useState(inheritedCategory || "");
  const [detailTags, setDetailTags] = useState([]);
  const [detailTagInput, setDetailTagInput] = useState("");
  const [detailShowCustom, setDetailShowCustom] = useState(false);
  const [detailCustomMinutes, setDetailCustomMinutes] = useState(null);

  const inputRef = useRef(null);
  const bubbleRef = useRef(null);

  const sizeMappings = settings.estimation?.sizeMappings || { quick: 10, short: 25, medium: 45, long: 90 };
  const categories = contextCategories || (state.categories || []);

  // Smart default: if today has >5 tasks, default to tomorrow
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTaskCount = (state.tasks || []).filter(
    (tk) => !tk.completed && (tk.scheduledDate === todayStr || (!tk.scheduledDate && tk.createdAt && new Date(tk.createdAt).toISOString().slice(0, 10) === todayStr))
  ).length;
  const smartWhenDefault = todayTaskCount > 5 ? "tomorrow" : "today";

  const reset = useCallback(() => {
    setStep(0);
    setText("");
    setPriority("medium");
    setWhen(smartWhenDefault);
    setEnergy("medium");
    setSize("medium");
    setFlash(false);
    setShowDetails(false);
    setDetailTimeOfDay("");
    setDetailScheduledTime("");
    setDetailDeadline("");
    setDetailCategory(inheritedCategory || "");
    setDetailTags([]);
    setDetailTagInput("");
    setDetailShowCustom(false);
    setDetailCustomMinutes(null);
  }, [smartWhenDefault, inheritedCategory]);

  // Reset when quickAddOptions changes (new open event)
  useEffect(() => {
    if (open) {
      reset();
      setWhen(smartWhenDefault);
      setDetailCategory(inheritedCategory || "");
    }
  }, [open, quickAddOptions]); // eslint-disable-line

  const handleClose = useCallback(() => {
    closeQuickAdd();
    reset();
  }, [closeQuickAdd, reset]);

  const buildPayload = useCallback((withDetails = false) => {
    const effectiveMinutes = withDetails && detailShowCustom && detailCustomMinutes
      ? detailCustomMinutes
      : (sizeMappings[size] || 25);
    return {
      text: text.trim(),
      priority,
      energyCost: energy,
      estimatedMinutes: effectiveMinutes,
      sizeCategory: withDetails && detailShowCustom ? null : size,
      scheduledDate: resolveWhen(when),
      timeOfDay: withDetails && detailTimeOfDay && detailTimeOfDay !== "exact" ? detailTimeOfDay : null,
      scheduledTime: withDetails && detailTimeOfDay === "exact" && detailScheduledTime ? detailScheduledTime : null,
      deadline: withDetails ? (detailDeadline || null) : null,
      category: mode === "subtask" ? (inheritedCategory || null) : (withDetails ? (detailCategory || null) : null),
      tags: withDetails ? detailTags : [],
    };
  }, [text, priority, energy, size, when, sizeMappings, detailShowCustom, detailCustomMinutes,
      detailTimeOfDay, detailScheduledTime, detailDeadline, detailCategory, detailTags,
      mode, inheritedCategory]);

  const handleSubmit = useCallback((withDetails = false) => {
    if (!text.trim()) return;
    const payload = buildPayload(withDetails);
    if (mode === "subtask" && parentTaskId) {
      dispatch({ type: "ADD_SUBTASK", payload: { taskId: parentTaskId, ...payload } });
    } else {
      dispatch({ type: "ADD_TASK", payload });
    }
    setFlash(true);
    setTimeout(() => { closeQuickAdd(); reset(); }, 600);
  }, [text, buildPayload, mode, parentTaskId, dispatch, closeQuickAdd, reset]);

  // Advance to next step (step 4 → 5 now, step 5 handled by buttons)
  const advance = useCallback(() => {
    if (step === 0 && !text.trim()) return;
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      handleSubmit(false);
    }
  }, [step, text, handleSubmit]);

  const handleTagKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === ",") && detailTagInput.trim()) {
      e.preventDefault();
      const tag = sanitizeTag(detailTagInput);
      if (tag && !detailTags.includes(tag)) setDetailTags([...detailTags, tag]);
      setDetailTagInput("");
    }
  };

  // Global keydown: Enter opens bubble (when no input focused)
  useEffect(() => {
    const handler = (e) => {
      if (open) return;
      if (e.key !== "Enter") return;
      const tag = document.activeElement?.tagName?.toLowerCase();
      const editable = document.activeElement?.isContentEditable;
      if (tag === "input" || tag === "textarea" || tag === "select" || editable) return;
      if (document.querySelector("[role='dialog']") || document.querySelector(".modal-card")) return;
      e.preventDefault();
      // Open with default task mode via context
      // GlobalQuickAdd relies on QuickAddContext for open state;
      // pressing Enter when closed calls openQuickAdd from context — handled in App.js via a side-effect
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // 3-finger tap for mobile — handled via EnterKeyListener below

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
        if (step === 5) {
          // On finish step, Enter submits (primary action)
          e.preventDefault();
          handleSubmit(showDetails);
          return;
        }
        if (step === 0 && document.activeElement === inputRef.current) {
          e.preventDefault();
          advance();
          return;
        }
        if (step > 0 && step < 5) {
          e.preventDefault();
          advance();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, step, advance, handleClose, handleSubmit, showDetails]);

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

  const isSubtask = mode === "subtask";
  const createLabel = isSubtask ? t("quickBubble.createSubtask") : t("quickBubble.createTask");

  const stepLabels = [
    t("quickBubble.stepName"),
    t("quickBubble.stepPriority"),
    t("quickBubble.stepWhen"),
    t("quickBubble.stepEnergy"),
    t("quickBubble.stepDuration"),
    t("quickBubble.stepFinish"),
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40 animate-fade-in overflow-y-auto">
      <div ref={bubbleRef} className={`glass-card p-5 w-full max-w-sm mx-4 my-4 shadow-2xl border border-accent/20 ${flash ? "ring-2 ring-success animate-pulse" : ""}`}>
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
                    onClick={() => { setSize(key); setStep(5); }}
                    className={`${btnClass(size === key)} flex-1 text-center ${SIZE_COLORS[key]}`}
                  >
                    <span className="block">{t(`tasks.size.${key}`)}</span>
                    <span className="block text-[9px] opacity-60 mt-0.5">~{sizeMappings[key]}{t("common.min")}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Step 5: Finish */}
            {step === 5 && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSubmit(false)}
                    className="flex-1 btn-primary text-xs py-2 flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {createLabel}
                  </button>
                  <button
                    onClick={() => setShowDetails((v) => !v)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 border ${
                      showDetails
                        ? "bg-accent/10 text-accent border-accent/20"
                        : "bg-gray-50 dark:bg-white/5 text-muted-light dark:text-muted-dark border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10"
                    }`}
                  >
                    {showDetails ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    {t("quickBubble.addDetails")}
                  </button>
                </div>

                {/* Inline details form */}
                {showDetails && (
                  <div className="space-y-3 pt-2 border-t border-gray-200/50 dark:border-white/10 animate-fade-in">
                    {/* Time of day */}
                    <div>
                      <label className="text-[10px] font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-1 block">
                        {t("tasks.sectionWhen")}
                      </label>
                      <div className="flex gap-1 flex-wrap">
                        {TIME_OF_DAY_OPTIONS.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setDetailTimeOfDay(detailTimeOfDay === opt ? "" : opt)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                              detailTimeOfDay === opt
                                ? "bg-accent/10 text-accent ring-1 ring-accent/20"
                                : "bg-gray-50 dark:bg-white/5 text-muted-light dark:text-muted-dark hover:bg-gray-100 dark:hover:bg-white/10"
                            }`}
                          >
                            {t(`tasks.timeOfDayOptions.${opt}`)}
                          </button>
                        ))}
                      </div>
                      {detailTimeOfDay === "exact" && (
                        <input
                          type="time"
                          value={detailScheduledTime}
                          onChange={(e) => setDetailScheduledTime(e.target.value)}
                          className="mt-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-accent/30"
                        />
                      )}
                    </div>

                    {/* Deadline */}
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark flex-shrink-0" />
                      <span className="text-xs text-muted-light dark:text-muted-dark">{t("tasks.hardDeadline")}</span>
                      <input
                        type="date"
                        value={detailDeadline}
                        onChange={(e) => setDetailDeadline(e.target.value)}
                        className="px-2 py-1 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-accent/30"
                      />
                    </div>

                    {/* Category — inherited for subtasks */}
                    {isSubtask && inheritedCategory ? (
                      <div className="flex items-center gap-2">
                        <Folder className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark flex-shrink-0" />
                        <span className="text-xs text-muted-light dark:text-muted-dark">{t("tasks.subtaskCategoryInherited")}</span>
                        <span className="px-2.5 py-1 rounded-lg text-xs bg-gray-100 dark:bg-white/10">
                          {categories.find((c) => c.id === inheritedCategory)?.name || inheritedCategory}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Folder className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark flex-shrink-0" />
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setDetailCategory(detailCategory === cat.id ? "" : cat.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                              detailCategory === cat.id
                                ? (cat.color || "bg-gray-100 text-gray-700") + " ring-1 ring-current/20"
                                : "text-muted-light dark:text-muted-dark hover:bg-gray-100 dark:hover:bg-white/5"
                            }`}
                          >
                            {cat.name || cat.emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Tags */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Tag className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark flex-shrink-0" />
                      {detailTags.map((tag) => (
                        <span key={tag} className={`badge text-[10px] ${getTagColor(tag)} flex items-center gap-1`}>
                          {tag}
                          <button type="button" onClick={() => setDetailTags(detailTags.filter((x) => x !== tag))}>
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        value={detailTagInput}
                        onChange={(e) => setDetailTagInput(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                        placeholder={t("tasks.addTag")}
                        className="flex-1 min-w-[80px] text-xs px-2 py-1 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-accent/30"
                      />
                    </div>

                    {/* Custom minutes */}
                    <div>
                      <button
                        type="button"
                        onClick={() => { setDetailShowCustom(!detailShowCustom); if (!detailCustomMinutes) setDetailCustomMinutes(sizeMappings[size] || 25); }}
                        className={`text-[10px] transition-colors ${detailShowCustom ? "text-accent font-medium" : "text-muted-light dark:text-muted-dark hover:text-accent"}`}
                      >
                        {detailShowCustom ? t("tasks.sizeUsePreset") : t("tasks.sizeCustom")}
                      </button>
                      {detailShowCustom && (
                        <div className="flex items-center gap-2 mt-1.5 animate-fade-in">
                          <input
                            type="range"
                            min={5}
                            max={240}
                            step={5}
                            value={detailCustomMinutes || 25}
                            onChange={(e) => setDetailCustomMinutes(Number(e.target.value))}
                            className="flex-1 accent-accent"
                          />
                          <span className="text-xs font-mono text-accent w-12 text-right">{detailCustomMinutes || 25}{t("common.min")}</span>
                        </div>
                      )}
                    </div>

                    {/* Submit with details */}
                    <button
                      onClick={() => handleSubmit(true)}
                      className="w-full btn-primary text-xs py-2 flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {createLabel}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Next/Done button (steps 0-4) */}
            {step < 5 && (
              <button
                onClick={advance}
                disabled={step === 0 && !text.trim()}
                className={`mt-3 w-full py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  step === 0 && !text.trim()
                    ? "bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed"
                    : "btn-primary"
                }`}
              >
                <>
                  {t("quickBubble.next")}
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              </button>
            )}

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

// EnterKeyListener: opens the QuickAdd on Enter key when nothing is focused
// Renders inside AppLayout so it has access to QuickAddContext
export function QuickAddEnterListener() {
  const { quickAddOptions, openQuickAdd } = useQuickAdd();
  const open = quickAddOptions !== null;

  useEffect(() => {
    const handler = (e) => {
      if (open) return;
      if (e.key !== "Enter") return;
      const tag = document.activeElement?.tagName?.toLowerCase();
      const editable = document.activeElement?.isContentEditable;
      if (tag === "input" || tag === "textarea" || tag === "select" || editable) return;
      if (document.querySelector("[role='dialog']") || document.querySelector(".modal-card")) return;
      e.preventDefault();
      openQuickAdd({ mode: "task" });
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, openQuickAdd]);

  useEffect(() => {
    const handler = (e) => {
      if (open) return;
      if (e.touches.length === 3) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;
        e.preventDefault();
        openQuickAdd({ mode: "task" });
      }
    };
    document.addEventListener("touchstart", handler, { passive: false });
    return () => document.removeEventListener("touchstart", handler);
  }, [open, openQuickAdd]);

  return null;
}
