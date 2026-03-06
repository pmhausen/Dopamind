import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { LABEL_COLORS, resolveCatColorKey } from "../context/AppContext";
import { useSettings } from "../context/SettingsContext";
import { useI18n } from "../i18n/I18nContext";
import { useQuickAdd } from "../context/QuickAddContext";
import { useCalendar } from "../context/CalendarContext";
import { X, Check, ChevronRight, ChevronDown, AlertCircle, Folder, Tag, Zap } from "lucide-react";
import TagInput from "./TagInput";
import { getCatDisplayName } from "../utils/catUtils";

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
  const { getEventsForDate } = useCalendar();
  const open = quickAddOptions !== null;
  const mode = quickAddOptions?.mode || "task";
  const parentTaskId = quickAddOptions?.parentTaskId || null;
  const inheritedCategory = quickAddOptions?.inheritedCategory || null;
  const contextCategories = quickAddOptions?.categories || null;

  const [step, setStep] = useState(0);
  const [text, setText] = useState("");
  const [priority, setPriority] = useState("medium");
  const [when, setWhen] = useState("today");
  const [whenTimeOfDay, setWhenTimeOfDay] = useState("");
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
  const scrollableRef = useRef(null);
  const stepRefs = useRef([]);

  const sizeMappings = settings.estimation?.sizeMappings || { quick: 10, short: 25, medium: 45, long: 90 };
  const categories = contextCategories || (state.categories || []);

  const allTags = useMemo(() => (state.tasks || []).flatMap((tk) => [
    ...(tk.tags || []),
    ...(tk.subtasks || []).flatMap((s) => s.tags || []),
  ]).filter((v, i, a) => a.indexOf(v) === i).sort(), [state.tasks]);

  // Smart default: if today has >5 tasks, default to tomorrow
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTaskCount = (state.tasks || []).filter(
    (tk) => !tk.completed && (tk.scheduledDate === todayStr || (!tk.scheduledDate && tk.createdAt && new Date(tk.createdAt).toISOString().slice(0, 10) === todayStr))
  ).length;
  const smartWhenDefault = todayTaskCount > 5 ? "tomorrow" : "today";

  // Smart time-of-day: pick least-loaded block for a given resolved date
  const computeSmartTimeOfDay = useCallback((resolvedDate) => {
    const parseMin = (s) => {
      if (!s) return null;
      const [h, m] = s.split(":").map(Number);
      return h * 60 + (m || 0);
    };
    const parseEvMin = (s) => {
      if (!s) return null;
      if (/^\d{1,2}:\d{2}$/.test(s)) return parseMin(s);
      const d = new Date(s);
      if (isNaN(d)) return null;
      return d.getHours() * 60 + d.getMinutes();
    };
    const workStartMin = parseMin(settings.workSchedule?.start || "08:00") ?? 480;
    const workEndMin = parseMin(settings.workSchedule?.end || "18:00") ?? 1080;
    const blocks = [
      { id: "morning", start: Math.max(workStartMin, 0), end: Math.min(12 * 60, workEndMin) },
      { id: "afternoon", start: Math.max(12 * 60, workStartMin), end: Math.min(17 * 60, workEndMin) },
      { id: "evening", start: Math.max(17 * 60, workStartMin), end: workEndMin },
    ].filter((b) => b.start < b.end);

    const isToday = resolvedDate === todayStr;
    const nowMin = isToday ? (new Date().getHours() * 60 + new Date().getMinutes()) : -1;

    const dayEvents = getEventsForDate(resolvedDate).filter((e) => !e.allDay);
    const dayTasks = (state.tasks || []).filter(
      (tk) => !tk.completed && (tk.scheduledDate === resolvedDate || (!tk.scheduledDate && isToday))
    );

    let bestBlock = null;
    let bestAvail = -Infinity;
    for (const block of blocks) {
      if (isToday && block.end <= nowMin) continue;
      const blockDur = block.end - block.start;
      const eventMins = dayEvents.reduce((sum, ev) => {
        const s = parseEvMin(ev.start);
        const e = parseEvMin(ev.end);
        if (s == null || e == null) return sum;
        return sum + Math.max(0, Math.min(e, block.end) - Math.max(s, block.start));
      }, 0);
      const taskMins = dayTasks.reduce((sum, tk) => {
        if (tk.timeOfDay === block.id) return sum + (tk.estimatedMinutes || 45);
        return sum;
      }, 0);
      const avail = blockDur - eventMins - taskMins;
      if (avail > bestAvail) {
        bestAvail = avail;
        bestBlock = block.id;
      }
    }
    return bestBlock || (blocks[0]?.id) || "morning";
  }, [settings.workSchedule, todayStr, getEventsForDate, state.tasks]);

  const reset = useCallback(() => {
    const resolvedDate = resolveWhen(smartWhenDefault) || todayStr;
    setStep(0);
    setText("");
    setPriority("medium");
    setWhen(smartWhenDefault);
    setWhenTimeOfDay(computeSmartTimeOfDay(resolvedDate));
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
  }, [smartWhenDefault, inheritedCategory, computeSmartTimeOfDay, todayStr]);

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
    // whenTimeOfDay (from step 2) takes precedence over detailTimeOfDay (from details panel)
    const effectiveTimeOfDay = whenTimeOfDay && whenTimeOfDay !== "exact"
      ? whenTimeOfDay
      : (withDetails && detailTimeOfDay && detailTimeOfDay !== "exact" ? detailTimeOfDay : null);
    const effectiveScheduledTime = (whenTimeOfDay === "exact" || (!whenTimeOfDay && withDetails && detailTimeOfDay === "exact")) && detailScheduledTime
      ? detailScheduledTime : null;
    return {
      text: text.trim(),
      priority,
      energyCost: energy,
      estimatedMinutes: effectiveMinutes,
      sizeCategory: withDetails && detailShowCustom ? null : size,
      scheduledDate: resolveWhen(when),
      timeOfDay: effectiveTimeOfDay,
      scheduledTime: effectiveScheduledTime,
      deadline: withDetails ? (detailDeadline || null) : null,
      category: mode === "subtask" ? (inheritedCategory || null) : (withDetails ? (detailCategory || null) : null),
      tags: withDetails ? detailTags : [],
    };
  }, [text, priority, energy, size, when, whenTimeOfDay, sizeMappings, detailShowCustom, detailCustomMinutes,
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

  // Ultra-Quick: submit immediately with all defaults
  const handleUltraQuick = useCallback(() => {
    if (!text.trim()) return;
    const effectiveMinutes = sizeMappings["medium"] || 45;
    const resolvedDate = resolveWhen(smartWhenDefault) || todayStr;
    const payload = {
      text: text.trim(),
      priority: "medium",
      energyCost: "medium",
      estimatedMinutes: effectiveMinutes,
      sizeCategory: "medium",
      scheduledDate: resolvedDate,
      timeOfDay: computeSmartTimeOfDay(resolvedDate),
      scheduledTime: null,
      deadline: null,
      category: mode === "subtask" ? (inheritedCategory || null) : null,
      tags: [],
    };
    if (mode === "subtask" && parentTaskId) {
      dispatch({ type: "ADD_SUBTASK", payload: { taskId: parentTaskId, ...payload } });
    } else {
      dispatch({ type: "ADD_TASK", payload });
    }
    setFlash(true);
    setTimeout(() => { closeQuickAdd(); reset(); }, 600);
  }, [text, sizeMappings, smartWhenDefault, todayStr, computeSmartTimeOfDay, mode, inheritedCategory, parentTaskId, dispatch, closeQuickAdd, reset]);

  // Global keydown: Enter is handled by QuickAddEnterListener (mounted in AppLayout)
  // to open the bubble when no input is focused.

  // 3-finger tap for mobile — handled via EnterKeyListener below

  // Autofocus input on step 0
  useEffect(() => {
    if (open && step === 0 && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, step]);

  // Auto-scroll to active step when step changes
  // 80 ms gives React time to render the new step DOM node before we scroll to it
  const SCROLL_DELAY_MS = 80;
  useEffect(() => {
    if (!open) return;
    const el = stepRefs.current[step];
    if (el && scrollableRef.current) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "nearest" }), SCROLL_DELAY_MS);
    }
  }, [open, step]);

  // Keyboard navigation inside bubble
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") { handleClose(); return; }
      if (e.key === "Enter") {
        // Cmd/Ctrl+Enter on step 0 → ultra-quick submit
        if (step === 0 && (e.metaKey || e.ctrlKey) && text.trim()) {
          e.preventDefault();
          handleUltraQuick();
          return;
        }
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
  }, [open, step, text, advance, handleClose, handleSubmit, handleUltraQuick, showDetails]);

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

  const btnClass = (active) =>
    `px-3 py-2 rounded-xl text-xs font-medium transition-all ${active ? "ring-2 ring-accent shadow-sm scale-105" : "hover:scale-102"}`;

  // Summary value for completed step badges
  const getSummaryValue = (i) => {
    if (i === 0) return text.trim() || "—";
    if (i === 1) return t(`tasks.priority.${priority}`);
    if (i === 2) return whenTimeOfDay
      ? `${t(`tasks.whenOptions.${when}`)} · ${t(`tasks.timeOfDayOptions.${whenTimeOfDay}`)}`
      : t(`tasks.whenOptions.${when}`);
    if (i === 3) return t(`tasks.energy.${energy}`);
    if (i === 4) return `${t(`tasks.size.${size}`)} ~${sizeMappings[size]}${t("common.min")}`;
    return "";
  };

  const getSummaryBadgeClass = (i) => {
    if (i === 1) return PRIORITY_COLORS[priority];
    if (i === 3) return ENERGY_COLORS[energy];
    if (i === 4) return SIZE_COLORS[size];
    return "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/40 animate-fade-in overflow-y-auto">
      <div ref={bubbleRef} className={`glass-card p-5 w-full max-w-sm mx-4 my-4 shadow-2xl border border-accent/20 ${flash ? "ring-2 ring-success animate-pulse" : ""}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] text-muted-light dark:text-muted-dark uppercase tracking-wider font-semibold">
            {isSubtask ? t("quickBubble.createSubtask") : t("quickBubble.createTask")}
          </span>
          <button onClick={handleClose} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Success flash */}
        {flash && (
          <div className="flex items-center justify-center gap-2 py-4 animate-fade-in">
            <Check className="w-5 h-5 text-success" />
            <span className="text-sm font-medium text-success">{t("quickBubble.created")}</span>
          </div>
        )}

        {/* Vertical accordion steps */}
        {!flash && (
          <div ref={scrollableRef} className="space-y-1 max-h-[70vh] overflow-y-auto -mx-1 px-1">
            {STEPS.map((_, i) => {
              if (i > step) return null;
              const isDone = i < step;
              const isActive = i === step;

              return (
                <div key={i} ref={(el) => { stepRefs.current[i] = el; }} className="flex gap-2.5">
                  {/* Vertical stepper column */}
                  <div className="flex flex-col items-center" style={{ width: "18px", flexShrink: 0 }}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                      isDone
                        ? "bg-accent"
                        : "ring-2 ring-accent bg-white dark:bg-gray-800"
                    }`}>
                      {isDone
                        ? <Check className="w-2.5 h-2.5 text-white" />
                        : <div className="w-1.5 h-1.5 bg-accent rounded-full" />
                      }
                    </div>
                    {/* Connecting line to next step */}
                    {i < step && (
                      <div className="w-px bg-accent/25 flex-1 mt-1" style={{ minHeight: "10px" }} />
                    )}
                  </div>

                  {/* Step content */}
                  <div className="flex-1 min-w-0 pb-2">
                    {/* Step label */}
                    <div className="text-[9px] text-muted-light dark:text-muted-dark uppercase tracking-wider font-semibold mb-1">
                      {stepLabels[i]}
                    </div>

                    {/* Completed step: compact clickable summary */}
                    {isDone && (
                      <button
                        onClick={() => setStep(i)}
                        className="flex items-center gap-1.5 hover:opacity-75 transition-opacity text-left"
                      >
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getSummaryBadgeClass(i)}`}>
                          {getSummaryValue(i)}
                        </span>
                      </button>
                    )}

                    {/* Active step: full interaction */}
                    {isActive && (
                      <div className="mt-1 animate-fade-in">

                        {/* Step 0: Name input */}
                        {i === 0 && (
                          <>
                            <input
                              ref={inputRef}
                              value={text}
                              onChange={(e) => setText(e.target.value)}
                              placeholder={t("quickBubble.stepName")}
                              className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
                              autoFocus
                            />
                            {/* Ultra-quick + next buttons (only when text entered) */}
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={handleUltraQuick}
                                disabled={!text.trim()}
                                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 border ${
                                  !text.trim()
                                    ? "border-gray-200 dark:border-white/10 text-gray-400 cursor-not-allowed bg-gray-50 dark:bg-white/5"
                                    : "border-accent/30 text-accent hover:bg-accent/5 bg-white dark:bg-white/5"
                                }`}
                              >
                                <Zap className="w-3.5 h-3.5" />
                                {t("quickBubble.immediate")}
                              </button>
                              <button
                                onClick={advance}
                                disabled={!text.trim()}
                                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                                  !text.trim()
                                    ? "bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed"
                                    : "btn-primary"
                                }`}
                              >
                                {t("quickBubble.next")}
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}

                        {/* Step 1: Priority */}
                        {i === 1 && (
                          <>
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
                            <button
                              onClick={advance}
                              className="mt-2 w-full py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 btn-primary"
                            >
                              {t("quickBubble.next")}
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {/* Step 2: When */}
                        {i === 2 && (
                          <>
                            <div className="flex gap-2 flex-wrap">
                              {WHEN_KEYS.map((key) => (
                                <button
                                  key={key}
                                  onClick={() => {
                                    const resolved = resolveWhen(key) || todayStr;
                                    setWhen(key);
                                    setWhenTimeOfDay(computeSmartTimeOfDay(resolved));
                                  }}
                                  className={`${btnClass(when === key)} flex-1 min-w-[70px] ${when === key ? "bg-accent/10 text-accent" : "bg-gray-50 dark:bg-white/5 text-muted-light dark:text-muted-dark"}`}
                                >
                                  {t(`tasks.whenOptions.${key}`)}
                                </button>
                              ))}
                            </div>
                            {/* Time-of-day sub-selection */}
                            <div className="mt-2 pt-2 border-t border-gray-200/40 dark:border-white/10 animate-fade-in">
                              <div className="text-[9px] text-muted-light dark:text-muted-dark uppercase tracking-wider font-semibold mb-1.5">
                                {t("tasks.sectionWhen")}
                              </div>
                              <div className="flex gap-1.5 flex-wrap">
                                {["morning", "afternoon", "evening"].map((tod) => (
                                  <button
                                    key={tod}
                                    onClick={() => { setWhenTimeOfDay(tod); setStep(3); }}
                                    className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                      whenTimeOfDay === tod
                                        ? "bg-accent/15 text-accent ring-1 ring-accent/30 scale-105"
                                        : "bg-gray-50 dark:bg-white/5 text-muted-light dark:text-muted-dark hover:bg-gray-100 dark:hover:bg-white/10"
                                    }`}
                                  >
                                    {t(`tasks.timeOfDayOptions.${tod}`)}
                                  </button>
                                ))}
                                <button
                                  onClick={() => setWhenTimeOfDay("exact")}
                                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    whenTimeOfDay === "exact"
                                      ? "bg-accent/15 text-accent ring-1 ring-accent/30 scale-105"
                                      : "bg-gray-50 dark:bg-white/5 text-muted-light dark:text-muted-dark hover:bg-gray-100 dark:hover:bg-white/10"
                                  }`}
                                >
                                  {t("tasks.timeOfDayOptions.exact")}
                                </button>
                              </div>
                              {whenTimeOfDay === "exact" && (
                                <input
                                  type="time"
                                  value={detailScheduledTime}
                                  onChange={(e) => setDetailScheduledTime(e.target.value)}
                                  className="mt-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-accent/30"
                                />
                              )}
                            </div>
                            <button
                              onClick={advance}
                              className="mt-2 w-full py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 btn-primary"
                            >
                              {t("quickBubble.next")}
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {/* Step 3: Energy */}
                        {i === 3 && (
                          <>
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
                            <button
                              onClick={advance}
                              className="mt-2 w-full py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 btn-primary"
                            >
                              {t("quickBubble.next")}
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {/* Step 4: Duration */}
                        {i === 4 && (
                          <>
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
                            <button
                              onClick={advance}
                              className="mt-2 w-full py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 btn-primary"
                            >
                              {t("quickBubble.next")}
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {/* Step 5: Finish */}
                        {i === 5 && (
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
                                    {categories.map((cat) => {
                                      const qck = resolveCatColorKey(cat.color);
                                      const qlc = LABEL_COLORS[qck] || LABEL_COLORS.gray;
                                      return (
                                        <button
                                          key={cat.id}
                                          type="button"
                                          onClick={() => setDetailCategory(detailCategory === cat.id ? "" : cat.id)}
                                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all ${
                                            detailCategory === cat.id
                                              ? qlc.bg + " " + qlc.text + " ring-1 ring-current/20"
                                              : "text-muted-light dark:text-muted-dark hover:bg-gray-100 dark:hover:bg-white/5"
                                          }`}
                                        >
                                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${qlc.dot}`} />
                                          {getCatDisplayName(cat, t)}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Tags */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Tag className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark flex-shrink-0" />
                                  {detailTags.map((tag) => (
                                    <span key={tag} className={`badge text-[10px] ${LABEL_COLORS.gray.bg} ${LABEL_COLORS.gray.text} flex items-center gap-1`}>
                                      {tag}
                                      <button type="button" onClick={() => setDetailTags(detailTags.filter((x) => x !== tag))}>
                                        <X className="w-2.5 h-2.5" />
                                      </button>
                                    </span>
                                  ))}
                                  <TagInput
                                    value={detailTagInput}
                                    onChange={setDetailTagInput}
                                    onAddTag={(tag) => setDetailTags([...detailTags, tag])}
                                    existingTags={detailTags}
                                    allTags={allTags}
                                    placeholder={t("tasks.addTag")}
                                    className="w-full text-xs px-2 py-1 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-accent/30"
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

                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Enter hint */}
        {!flash && (
          <p className="text-center text-[9px] text-muted-light dark:text-muted-dark mt-2 opacity-60">
            Enter ↵{step === 0 && text.trim() ? ` · ⌘↵ ${t("quickBubble.immediate")}` : ""}
          </p>
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
