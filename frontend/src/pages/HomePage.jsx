import { useState, useEffect } from "react";
import { useI18n } from "../i18n/I18nContext";
import { useApp } from "../context/AppContext";
import { DAILY_CHALLENGES } from "../context/AppContext";
import { useCalendar } from "../context/CalendarContext";
import { useTimeTracking } from "../context/TimeTrackingContext";
import { useSettings } from "../context/SettingsContext";
import CountdownStart from "../components/CountdownStart";
import {
  CheckCircle, Calendar, Plus,
  LogIn, LogOut, Coffee, AlertCircle, Clock, ChevronLeft, ChevronRight, Pencil, X, GripVertical, CalendarPlus, List, Trash2,
} from "lucide-react";


function ClockWidget({ t }) {
  const { state, dispatch, getSessionMinutes, isOnBreak } = useTimeTracking();
  const isClockedIn = !!state.currentSession;

  const formatTime = (min) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  if (!isClockedIn) {
    return (
      <button
        onClick={() => dispatch({ type: "CLOCK_IN" })}
        className="glass-card p-4 w-full flex items-center gap-3 hover:bg-accent/5 transition-colors group"
      >
        <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center group-hover:bg-success group-hover:text-white transition-colors">
          <LogIn className="w-5 h-5 text-success group-hover:text-white" />
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold">{t("timeTracking.clockIn")}</p>
          <p className="text-[10px] text-muted-light dark:text-muted-dark">{t("timeTracking.workHours")}</p>
        </div>
      </button>
    );
  }

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-sm font-medium">{t("timeTracking.currentSession")}</span>
        </div>
        <span className="text-lg font-bold font-mono text-accent">{formatTime(getSessionMinutes())}</span>
      </div>
      <div className="flex gap-2">
        {isOnBreak ? (
          <button onClick={() => dispatch({ type: "END_BREAK" })} className="btn-ghost text-sm flex items-center gap-1.5 flex-1 justify-center">
            <LogIn className="w-3.5 h-3.5" /> {t("timeTracking.endBreak")}
          </button>
        ) : (
          <button onClick={() => dispatch({ type: "START_BREAK" })} className="btn-ghost text-sm flex items-center gap-1.5 flex-1 justify-center">
            <Coffee className="w-3.5 h-3.5" /> {t("timeTracking.break")}
          </button>
        )}
        <button onClick={() => dispatch({ type: "CLOCK_OUT" })} className="btn-ghost text-sm flex items-center gap-1.5 flex-1 justify-center text-danger hover:bg-danger/10">
          <LogOut className="w-3.5 h-3.5" /> {t("timeTracking.clockOut")}
        </button>
      </div>
    </div>
  );
}

function QuickAddTask({ t, onAdd }) {
  const [text, setText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd(text.trim());
    setText("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("home.quickAdd")}
        className="flex-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all"
      />
      <button type="submit" className="btn-primary p-2"><Plus className="w-4 h-4" /></button>
    </form>
  );
}

function UnifiedDayTimeline({ t, events, tasks, settings, onCompleteTask, onToggleSubtask, isTaskOverdue, onEditTask, onEditSubtask, onUpdateScheduledTime, onUpdateSubtaskScheduledTime, onRescheduleNextDay, isToday, isPastDay, gridInterval, viewDate, removedBreaks, onToggleBreakRemoved, breakTimeOverrides, onUpdateBreakTime, timeTrackingBreaks, onStartTask, countdownStartEnabled, showFullDay, hideParentWithSubtasks, onPushDownTask, energyLevel }) {
  const workStartH = parseInt(settings.workSchedule.start.split(":")[0], 10);
  const workStartM = parseInt(settings.workSchedule.start.split(":")[1] || "0", 10);
  const workEndH = parseInt(settings.workSchedule.end.split(":")[0], 10);
  const workEndM = parseInt(settings.workSchedule.end.split(":")[1] || "0", 10);
  const breakMin = settings.workSchedule.breakMinutes;
  const timeTrackingEnabled = settings.features?.timeTrackingEnabled !== false;
  const [currentTime, setCurrentTime] = useState(new Date());
  const [confirmedPushIds, setConfirmedPushIds] = useState(() => new Set());
  useEffect(() => {
    setConfirmedPushIds(new Set());
  }, [viewDate]);
  useEffect(() => {
    if (!isToday) return;
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, [isToday]);
  const now = isToday ? currentTime : new Date();
  const nowH = now.getHours();
  const nowM = now.getMinutes();
  const isListMode = gridInterval === "list";
  const STEP = isListMode ? 30 : (gridInterval || 30);
  const ROW_HEIGHT = STEP === 15 ? 32 : STEP === 30 ? 40 : 52;
  // Pixels per minute for minute-precise rendering in grid mode
  const PX_PER_MIN = ROW_HEIGHT / STEP;
  const MIN_ENTRY_HEIGHT_PX = 20;

  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingSubtaskParent, setEditingSubtaskParent] = useState(null);
  const [editText, setEditText] = useState("");
  const [editingTimeKey, setEditingTimeKey] = useState(null); // key of entry whose time is being edited
  const [dragKey, setDragKey] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [dragTimeMin, setDragTimeMin] = useState(null); // minute-precise drag target time
  const todayDate = new Date().toISOString().slice(0, 10);

  const handleEditSave = (id) => {
    if (editText.trim()) {
      if (editingSubtaskParent) {
        onEditSubtask(editingSubtaskParent, id, editText.trim());
      } else {
        onEditTask(id, editText.trim());
      }
    }
    setEditingTaskId(null);
    setEditingSubtaskParent(null);
  };

  const toMin = (h, m) => h * 60 + m;
  const workStart = toMin(workStartH, workStartM);
  const workEnd = toMin(workEndH, workEndM);

  const DAY_START = showFullDay ? 0 : workStart;
  const DAY_END = showFullDay ? 24 * 60 : workEnd;
  const isNonWorkTime = (minFromMidnight) => timeTrackingEnabled && (minFromMidnight < workStart || minFromMidnight >= workEnd);

  const taskSchedulingRound = settings.timeline?.taskSchedulingRound || "halfHour";
  const taskSchedulingCustomMinutes = settings.timeline?.taskSchedulingCustomMinutes ?? 30;
  const getTaskMinStart = (task) => {
    if (!isToday || !task.createdAt) return workStart;
    const created = new Date(task.createdAt);
    if (created.toISOString().slice(0, 10) !== todayDate) return workStart;
    const createdMin = created.getHours() * 60 + created.getMinutes();
    let minStart;
    if (taskSchedulingRound === "fullHour") {
      minStart = Math.ceil(createdMin / 60) * 60;
    } else if (taskSchedulingRound === "custom") {
      minStart = Math.ceil((createdMin + taskSchedulingCustomMinutes) / STEP) * STEP;
    } else {
      minStart = Math.ceil(createdMin / 30) * 30;
    }
    return Math.max(workStart, minStart);
  };
  const fmtTime = (totalMin) => {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };
  // Energy cost indicator: priority maps to energy requirement
  const PRIORITY_ENERGY = { high: "high", medium: "normal", low: "low" };
  const ENERGY_EMOJI = { high: "⚡", normal: "🔵", low: "🔋" };
  const getEnergyMatch = (priority) => {
    const cost = PRIORITY_ENERGY[priority] || "normal";
    if (!energyLevel) return { emoji: ENERGY_EMOJI[cost], matched: false };
    const matched = cost === energyLevel;
    return { emoji: ENERGY_EMOJI[cost], matched };
  };
  const isTimeOnly = (s) => /^\d{1,2}:\d{2}$/.test(s);
  const nowTotal = toMin(nowH, nowM);

  // --- Build all entries (events, break, tasks, subtasks) ---
  const entries = [];
  let usedRanges = [];
  const isRangeFree = (from, to) => !usedRanges.some((r) => from < r.to && to > r.from);
  const claimRange = (from, to) => usedRanges.push({ from, to });

  // 1. Calendar events
  for (const ev of events) {
    if (ev.allDay || !ev.start) continue;
    let evStartMin, evEndMin;
    if (isTimeOnly(ev.start)) {
      const [eh, em] = ev.start.split(":").map(Number);
      evStartMin = toMin(eh, em);
      if (ev.end && isTimeOnly(ev.end)) {
        const [eeh, eem] = ev.end.split(":").map(Number);
        evEndMin = toMin(eeh, eem);
      } else { evEndMin = evStartMin + 60; }
    } else {
      const sd = new Date(ev.start);
      if (isNaN(sd)) continue;
      evStartMin = toMin(sd.getHours(), sd.getMinutes());
      const ed = ev.end ? new Date(ev.end) : null;
      evEndMin = ed && !isNaN(ed) ? toMin(ed.getHours(), ed.getMinutes()) : evStartMin + 60;
    }
    const dur = Math.max(STEP, evEndMin - evStartMin);
    entries.push({ key: `ev-${ev.id || ev.title}-${evStartMin}`, type: "event", startMin: evStartMin, durationMin: dur, label: ev.title || ev.summary });
    claimRange(evStartMin, evStartMin + dur);
  }

  // 2. Break (Requirement 6: respect removed breaks and custom break times)
  const breakRemoved = (removedBreaks || []).includes(viewDate);
  if (breakMin > 0 && !breakRemoved) {
    let breakStart;
    const customBreakTime = breakTimeOverrides?.[viewDate];
    if (customBreakTime) {
      const [bh, bm] = customBreakTime.split(":").map(Number);
      breakStart = toMin(bh, bm || 0);
    } else {
      const midMin = Math.floor((workStart + workEnd) / 2);
      breakStart = midMin;
      for (let offset = 0; offset < (workEnd - workStart) / 2; offset += STEP) {
        if (isRangeFree(midMin - offset, midMin - offset + breakMin)) { breakStart = midMin - offset; break; }
        if (isRangeFree(midMin + offset, midMin + offset + breakMin)) { breakStart = midMin + offset; break; }
      }
    }
    // Match with actual time tracking breaks retrospectively (by time proximity)
    let matchedBreak = null;
    if (timeTrackingBreaks && timeTrackingBreaks.length > 0) {
      const breakMid = breakStart + breakMin / 2;
      matchedBreak = timeTrackingBreaks.reduce((best, b) => {
        const bStart = new Date(b.start);
        const bMid = bStart.getHours() * 60 + bStart.getMinutes() + ((b.end ? new Date(b.end) - bStart : 0) / 120000);
        const dist = Math.abs(bMid - breakMid);
        if (!best || dist < best.dist) return { ...b, dist };
        return best;
      }, null);
      if (matchedBreak && matchedBreak.dist > 120) matchedBreak = null; // Only match within 2 hours
    }
    entries.push({ key: "break", type: "break", startMin: breakStart, durationMin: breakMin, label: `${breakMin}${t("common.min")} ${t("timeTracking.break")}`, matchedBreak });
    claimRange(breakStart, breakStart + breakMin);
  }

  // 3. Tasks
  const scheduledTasks = tasks.filter((tk) => tk.scheduledTime);
  const unscheduledTasks = tasks.filter((tk) => !tk.scheduledTime);
  const findFreeStart = (desiredStart, dur) => {
    let s = Math.max(workStart, desiredStart);
    while (s + dur <= workEnd) { if (isRangeFree(s, s + dur)) return s; s += STEP; }
    s = Math.max(DAY_START, desiredStart);
    while (s + dur <= DAY_END) { if (isRangeFree(s, s + dur)) return s; s += STEP; }
    return s;
  };

  const placeTask = (task, desiredStart) => {
    // Only include subtasks that are scheduled for viewDate (or have no explicit scheduledDate)
    const subtasks = (task.subtasks || []).filter(
      (s) => !s.completed && (!s.scheduledDate || s.scheduledDate === viewDate)
    );
    if (subtasks.length > 0) {
      let cursor = desiredStart;
      if (!hideParentWithSubtasks) {
        // Requirement 5: Main task is scheduled independently using its OWN estimatedMinutes.
        const parentDur = Math.max(STEP, task.estimatedMinutes || 25);
        const parentStart = findFreeStart(desiredStart, parentDur);
        entries.push({ key: `task-${task.id}`, type: "task-parent", startMin: parentStart, durationMin: parentDur, label: task.text, task, priority: task.priority, overdue: isTaskOverdue(task), scheduled: !!task.scheduledTime, subtaskCount: subtasks.length, completed: !!task.completed });
        claimRange(parentStart, parentStart + parentDur);
        cursor = parentStart + parentDur;
      }
      for (const sub of subtasks) {
        const subDur = Math.max(STEP, sub.estimatedMinutes ?? STEP);
        let subStart;
        if (sub.scheduledTime) {
          const [sh, sm] = sub.scheduledTime.split(":").map(Number);
          subStart = findFreeStart(toMin(sh, sm || 0), subDur);
        } else { subStart = findFreeStart(cursor, subDur); }
        entries.push({ key: `sub-${task.id}-${sub.id}`, type: "subtask", startMin: subStart, durationMin: subDur, label: sub.text, parentTask: task, subtask: sub, priority: task.priority, overdue: isTaskOverdue(task) });
        claimRange(subStart, subStart + subDur);
        cursor = subStart + subDur;
      }
    } else {
      const dur = Math.max(STEP, task.estimatedMinutes || 25);
      const actualStart = findFreeStart(desiredStart, dur);
      entries.push({ key: `task-${task.id}`, type: "task", startMin: actualStart, durationMin: dur, label: task.text, task, priority: task.priority, overdue: isTaskOverdue(task), scheduled: !!task.scheduledTime, completed: !!task.completed });
      claimRange(actualStart, actualStart + dur);
    }
  };

  for (const task of scheduledTasks) {
    const [th, tm] = task.scheduledTime.split(":").map(Number);
    placeTask(task, toMin(th, tm || 0));
  }
  let nextFree = workStart;
  for (const task of unscheduledTasks) {
    const minStart = getTaskMinStart(task);
    placeTask(task, Math.max(nextFree, minStart));
    const justPlaced = entries.filter((e) => e.key === `task-${task.id}` || e.key.startsWith(`sub-${task.id}-`));
    if (justPlaced.length > 0) nextFree = Math.max(...justPlaced.map((e) => e.startMin + e.durationMin));
  }

  // --- Requirement 3: push overdue (non-event) entries below the now-line ---
  // If isToday: tasks/breaks whose scheduled end is in the past get repositioned after nowTotal
  if (isToday) {
    const overdueEntries = entries.filter((e) => e.type !== "event" && e.startMin + e.durationMin <= nowTotal);
    let pushCursor = nowTotal;
    // Snap to next grid slot after now
    pushCursor = Math.ceil(pushCursor / STEP) * STEP;
    for (const oe of overdueEntries) {
      const entryId = oe.task?.id || oe.subtask?.id;
      if ((oe.type === "task" || oe.type === "task-parent" || oe.type === "subtask") && entryId && !confirmedPushIds.has(entryId)) {
        oe.needsPushConfirm = true;
        continue; // don't push yet, keep at original position for confirmation
      }
      // Unclaim original range
      usedRanges = usedRanges.filter((r) => !(r.from === oe.startMin && r.to === oe.startMin + oe.durationMin));
      // Find new spot after now
      let s = pushCursor;
      while (s + oe.durationMin <= DAY_END && !isRangeFree(s, s + oe.durationMin)) s += STEP;
      oe.startMin = s;
      oe.pushedDown = true;
      claimRange(s, s + oe.durationMin);
      pushCursor = s + oe.durationMin;
    }
  }

  // --- Time-pressure warnings ---
  const tw = settings.timeWarnings || {};
  const totalTaskMin = entries.filter((e) => e.type === "task" || e.type === "subtask" || e.type === "task-parent").reduce((sum, e) => sum + e.durationMin, 0);
  const totalFreeMin = (workEnd - workStart) - breakMin - entries.filter((e) => e.type === "event").reduce((sum, e) => sum + e.durationMin, 0) - totalTaskMin;
  let warningLevel = null;
  if (tw.enabled !== false && isToday) {
    const c1 = tw.criticalThreshold1 ?? 15; const c2 = tw.criticalThreshold2 ?? 0;
    const m1 = tw.moderateThreshold1 ?? 60; const m2 = tw.moderateThreshold2 ?? 30;
    if (totalFreeMin <= Math.max(c1, c2)) warningLevel = "critical";
    else if (totalFreeMin <= Math.max(m1, m2)) warningLevel = "moderate";
  }

  // --- Build grid rows (full 24h so they cover any visEnd) ---
  const gridSlots = [];
  for (let min = 0; min < 24 * 60; min += STEP) {
    gridSlots.push(min);
  }

  // Compute visible range: always extend to cover all entries and now-line
  let visStart = showFullDay ? 0 : workStart;
  let visEnd = showFullDay ? 24 * 60 : workEnd;
  if (entries.length > 0) {
    const earliest = Math.min(...entries.map((e) => e.startMin));
    const latest = Math.max(...entries.map((e) => e.startMin + e.durationMin));
    visStart = Math.min(visStart, earliest);
    visEnd = Math.max(visEnd, latest);
  }
  if (isToday) {
    visStart = Math.min(visStart, nowTotal);
    visEnd = Math.max(visEnd, nowTotal + 60);
  }
  // Snap to STEP boundaries and add one-slot padding; clamp to 0–24h
  visStart = Math.max(0, Math.floor(visStart / STEP) * STEP - STEP);
  visEnd = Math.min(24 * 60, Math.ceil(visEnd / STEP) * STEP + STEP);
  const visGridSlots = gridSlots.filter((s) => s >= visStart && s < visEnd);

  // --- Drag handlers (minute-precise D&D with time indicator) ---
  const handleDragStart = (e, key) => {
    setDragKey(key);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", key);
    const srcEntry = entries.find((en) => en.key === key);
    if (srcEntry) e.dataTransfer.setData("application/x-offset", String(srcEntry.startMin));
  };
  const handleDragEnd = () => { setDragKey(null); setDragOverSlot(null); setDragTimeMin(null); };
  const isDraggable = (entry) => !isPastDay && (entry.type === "task" || entry.type === "task-parent" || entry.type === "subtask" || entry.type === "break");

  // --- Render ---

  // === LIST MODE (Requirement 3) ===
  if (isListMode) {
    const sortedEntries = [...entries].sort((a, b) => a.startMin - b.startMin);
    return (
      <div className="relative space-y-1">
        {/* Warning banners */}
        {warningLevel === "critical" && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-danger/10 text-danger text-xs font-medium mb-2 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {t("home.timeWarningCritical").replace("{min}", String(Math.max(0, Math.round(totalFreeMin))))}
          </div>
        )}
        {warningLevel === "moderate" && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warn/10 text-amber-700 dark:text-warn text-xs font-medium mb-2">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            {t("home.timeWarningModerate").replace("{min}", String(Math.max(0, Math.round(totalFreeMin))))}
          </div>
        )}

        {/* Current time indicator for list mode */}
        {isToday && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-accent/5 border border-accent/20 mb-3">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-accent" />
            </div>
            <div>
              <span className="text-lg font-bold font-mono text-accent">{fmtTime(nowTotal)}</span>
              <span className="text-[10px] text-muted-light dark:text-muted-dark ml-2">{t("home.nowMarker")}</span>
            </div>
          </div>
        )}

        {/* Push-down confirmation cards */}
        {entries.filter(e => e.needsPushConfirm).map(e => (
          <div key={`confirm-${e.key}`} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-500/20 text-sm mb-1">
            <AlertCircle className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />
            <span className="flex-1 truncate text-sm">{e.label}</span>
            <button onClick={() => e.task ? onCompleteTask(e.task.id) : (e.parentTask && onCompleteTask(e.parentTask.id))} className="px-2 py-1 rounded-lg bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-colors">✓ {t("tasks.complete")}</button>
            <button className="px-2 py-1 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-medium hover:bg-orange-200 transition-colors" onClick={() => {
              const taskId = e.task?.id || e.subtask?.id;
              setConfirmedPushIds(prev => new Set([...prev, taskId]));
              if (onPushDownTask && taskId) onPushDownTask(taskId, fmtTime(Math.ceil(nowTotal / STEP) * STEP), e.type === "subtask" ? e.parentTask?.id : null);
            }}>→ {t("home.pushDown")}</button>
          </div>
        ))}

        {/* List entries */}
        {sortedEntries.map((entry) => {
          const isTask = entry.type === "task" || entry.type === "task-parent";
          const isSubtask = entry.type === "subtask";
          const isParentSummary = entry.type === "task-parent";
          const isPastEntry = isPastDay || (isToday && entry.startMin + entry.durationMin <= nowTotal);
          const isEditing = editingTaskId === (entry.task?.id || entry.subtask?.id);
          const canReschedule = entry.pushedDown && (isTask || isSubtask) && entry.task &&
            (!entry.task.deadline || entry.task.deadline >= todayDate);

          return (
            <div
              key={entry.key}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group
                ${isPastEntry ? "opacity-50" : ""}
                ${entry.completed ? "!opacity-60 line-through !bg-success/5 !border-success/30" : ""}
                ${isSubtask ? "ml-6" : ""}
                ${entry.type === "event" ? "bg-accent/5 border border-accent/15" : ""}
                ${isParentSummary ? "bg-gray-50 dark:bg-white/[0.03] border border-dashed border-gray-200 dark:border-white/10 italic" : ""}
                ${isTask && !isParentSummary && !entry.completed ? "bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5" : ""}
                ${isSubtask ? "bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100/50 dark:border-white/[0.03]" : ""}
                ${entry.type === "break" ? "bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-500/10" : ""}
                ${entry.overdue && !entry.completed ? "!border-danger/30 !bg-danger/5" : ""}
                ${entry.pushedDown ? "!border-orange-300 dark:!border-orange-600/30 !bg-orange-50 dark:!bg-orange-900/10" : ""}
              `}
            >
              {/* Editable time field for list mode — click to edit */}
              {(isTask || isSubtask) && !isEditing ? (
                editingTimeKey === entry.key ? (
                  <input
                    type="time"
                    autoFocus
                    defaultValue={fmtTime(entry.startMin)}
                    onBlur={(e) => {
                      setEditingTimeKey(null);
                      if (!e.target.value) return;
                      if (isSubtask && entry.parentTask && entry.subtask) {
                        onUpdateSubtaskScheduledTime(entry.parentTask.id, entry.subtask.id, e.target.value);
                      } else if (entry.task) {
                        onUpdateScheduledTime(entry.task.id, e.target.value);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.target.blur();
                      if (e.key === "Escape") { e.target.value = fmtTime(entry.startMin); setEditingTimeKey(null); }
                    }}
                    className="w-[5.5rem] text-sm font-mono bg-white dark:bg-white/10 border border-accent/40 rounded-lg px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-accent/30 flex-shrink-0 transition-all"
                  />
                ) : (
                  <button
                    onClick={() => setEditingTimeKey(entry.key)}
                    className="w-[5.5rem] text-sm font-mono bg-white/60 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-center flex-shrink-0 hover:border-accent/40 hover:bg-accent/5 transition-all cursor-pointer"
                    title={t("common.edit")}
                  >
                    {fmtTime(entry.startMin)}
                  </button>
                )
              ) : (
                <span className="w-[5.5rem] text-sm font-mono text-muted-light dark:text-muted-dark text-center flex-shrink-0 py-1.5">{fmtTime(entry.startMin)}</span>
              )}

              {/* Icon */}
              {entry.type === "event" && <Calendar className="w-3.5 h-3.5 flex-shrink-0 text-accent" />}
              {isTask && entry.overdue && <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-danger" />}
              {isTask && !entry.overdue && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${entry.priority === "high" ? "bg-danger" : entry.priority === "medium" ? "bg-warn" : "bg-success"}`} />}
              {isSubtask && <span className="w-1.5 h-1.5 rounded-full bg-accent/40 flex-shrink-0" />}
              {entry.type === "break" && <Coffee className="w-3.5 h-3.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />}

              {/* Label */}
              {isEditing ? (
                <input
                  autoFocus value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={() => handleEditSave(entry.task?.id || entry.subtask?.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleEditSave(entry.task?.id || entry.subtask?.id);
                    if (e.key === "Escape") { setEditingTaskId(null); setEditingSubtaskParent(null); }
                  }}
                  className="flex-1 bg-transparent outline-none border-b border-accent min-w-0 text-sm"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="flex-1 min-w-0 flex flex-col">
                  <span className="truncate">
                    {entry.label}
                    {(isTask || isSubtask) && entry.durationMin > 0 && <span className="ml-1.5 text-[10px] font-mono text-muted-light dark:text-muted-dark">– {fmtTime(entry.startMin + entry.durationMin)} ({entry.durationMin}{t("common.min")})</span>}
                  </span>
                  {isSubtask && entry.parentTask && (
                    <span className="text-[10px] text-muted-light dark:text-muted-dark truncate">↑ {entry.parentTask.text}</span>
                  )}
                </span>
              )}

              {/* Break remove button */}
              {entry.type === "break" && !isPastEntry && onToggleBreakRemoved && (
                <button onClick={() => onToggleBreakRemoved(viewDate)}
                  className="w-5 h-5 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                  title={t("home.removeBreak")} aria-label={t("home.removeBreak")}>
                  <Trash2 className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                </button>
              )}

              {/* Reschedule */}
              {canReschedule && !isEditing && (
                <button onClick={() => onRescheduleNextDay(entry.task.id)}
                  className="flex-shrink-0 px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-[10px] font-medium hover:bg-orange-200 dark:hover:bg-orange-800/40 transition-colors"
                  title={t("home.rescheduleNextDay")}>
                  <CalendarPlus className="w-3 h-3 inline -mt-0.5" /> {t("home.rescheduleNextDay")}
                </button>
              )}

              {/* Task actions */}
              {isTask && entry.task && !isPastEntry && !isEditing && !entry.completed && (
                <>
                  <button onClick={() => onCompleteTask(entry.task.id)}
                    className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 flex-shrink-0 hover:border-accent hover:bg-accent/10 transition-colors flex items-center justify-center"
                    title={t("tasks.complete")}>
                    <CheckCircle className="w-3 h-3 text-accent" />
                  </button>
                  {onStartTask && countdownStartEnabled && (
                    <button onClick={() => onStartTask(entry.task)}
                      className="w-5 h-5 rounded bg-accent/10 flex-shrink-0 hover:bg-accent hover:text-white transition-colors flex items-center justify-center text-accent text-[10px]"
                      title={t("tasks.start")}>
                      ▶
                    </button>
                  )}
                  <button onClick={() => { setEditingTaskId(entry.task.id); setEditText(entry.task.text); }}
                    className="w-5 h-5 rounded hover:bg-gray-100 dark:hover:bg-white/5 flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                    title={t("common.edit")}>
                    <Pencil className="w-2.5 h-2.5 text-muted-light dark:text-muted-dark" />
                  </button>
                </>
              )}
              {isSubtask && entry.subtask && entry.parentTask && !isPastEntry && !isEditing && (
                <>
                  <button onClick={() => onToggleSubtask(entry.parentTask.id, entry.subtask.id)}
                    className={`w-5 h-5 rounded border-2 flex-shrink-0 transition-colors flex items-center justify-center ${
                      entry.subtask.completed ? "border-success bg-success/10" : "border-gray-300 dark:border-gray-600 hover:border-accent hover:bg-accent/10"
                    }`}
                    title={entry.subtask.completed ? t("tasks.reopen") : t("tasks.complete")}>
                    <CheckCircle className={`w-3 h-3 ${entry.subtask.completed ? "text-success" : "text-accent"}`} />
                  </button>
                  {onStartTask && countdownStartEnabled && !entry.subtask.completed && (
                    <button onClick={() => onStartTask(entry.subtask)}
                      className="w-5 h-5 rounded bg-accent/10 flex-shrink-0 hover:bg-accent hover:text-white transition-colors flex items-center justify-center text-accent text-[10px]"
                      title={t("tasks.start")} aria-label={t("tasks.start")}>
                      ▶
                    </button>
                  )}
                  <button onClick={() => { setEditingTaskId(entry.subtask.id); setEditingSubtaskParent(entry.parentTask.id); setEditText(entry.subtask.text); }}
                    className="w-5 h-5 rounded hover:bg-gray-100 dark:hover:bg-white/5 flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                    title={t("common.edit")}>
                    <Pencil className="w-2.5 h-2.5 text-muted-light dark:text-muted-dark" />
                  </button>
                </>
              )}
            </div>
          );
        })}
        {sortedEntries.length === 0 && (
          <p className="text-sm text-muted-light dark:text-muted-dark text-center py-6">{t("home.noTasks")}</p>
        )}
      </div>
    );
  }

  // === GRID TIMELINE MODE (15/30/60 min) — minute-precise positioning ===
  const visTotalMinutes = visEnd - visStart;
  const totalHeight = visTotalMinutes * PX_PER_MIN;

  return (
    <div className="relative">
      {/* Warning banner */}
      {warningLevel === "critical" && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-danger/10 text-danger text-xs font-medium mb-2 animate-pulse">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {t("home.timeWarningCritical").replace("{min}", String(Math.max(0, Math.round(totalFreeMin))))}
        </div>
      )}
      {warningLevel === "moderate" && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warn/10 text-amber-700 dark:text-warn text-xs font-medium mb-2">
          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
          {t("home.timeWarningModerate").replace("{min}", String(Math.max(0, Math.round(totalFreeMin))))}
        </div>
      )}

      {/* Minute-precise continuous timeline */}
      <div
        className="relative flex"
        data-timeline-grid
        style={{ height: `${totalHeight}px` }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          const rect = e.currentTarget.getBoundingClientRect();
          const relY = e.clientY - rect.top;
          const minuteFromTop = visStart + relY / PX_PER_MIN;
          const clampedMin = Math.max(visStart, Math.min(visEnd - 1, Math.round(minuteFromTop)));
          setDragTimeMin(clampedMin);
          setDragOverSlot(Math.floor(clampedMin / STEP) * STEP);
        }}
        onDragLeave={() => { setDragOverSlot(null); setDragTimeMin(null); }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverSlot(null);
          setDragTimeMin(null);
          if (!dragKey) { setDragKey(null); return; }
          const srcEntry = entries.find((en) => en.key === dragKey);
          if (!srcEntry) { setDragKey(null); return; }
          const rect = e.currentTarget.getBoundingClientRect();
          const relY = e.clientY - rect.top;
          const targetMin = Math.max(visStart, Math.min(visEnd - 1, Math.round(visStart + relY / PX_PER_MIN)));
          const newTime = fmtTime(targetMin);
          if (srcEntry.type === "break") {
            if (onUpdateBreakTime) onUpdateBreakTime(viewDate, newTime);
          } else if (srcEntry.type === "subtask" && srcEntry.parentTask && srcEntry.subtask) {
            onUpdateSubtaskScheduledTime(srcEntry.parentTask.id, srcEntry.subtask.id, newTime);
          } else if (srcEntry.type === "task-parent" && srcEntry.task) {
            onUpdateScheduledTime(srcEntry.task.id, newTime);
          } else if (srcEntry?.task) {
            onUpdateScheduledTime(srcEntry.task.id, newTime);
          }
          setDragKey(null);
        }}
      >
        {/* Time labels column */}
        <div className="w-16 flex-shrink-0 relative select-none">
          {visGridSlots.map((slotMin) => {
            const top = (slotMin - visStart) * PX_PER_MIN;
            const nonWork = isNonWorkTime(slotMin);
            const isNowSlot = isToday && slotMin <= nowTotal && nowTotal < slotMin + STEP;
            return (
              <span
                key={slotMin}
                className={`absolute right-1 text-[11px] font-mono leading-none
                  ${isNowSlot ? "text-accent font-semibold" : nonWork ? "text-gray-300 dark:text-gray-600" : "text-gray-400 dark:text-gray-500"}
                `}
                style={{ top: `${top}px` }}
              >
                {fmtTime(slotMin)}
              </span>
            );
          })}
        </div>

        {/* Main timeline area */}
        <div className="flex-1 relative">
          {/* Grid lines */}
          {visGridSlots.map((slotMin) => {
            const top = (slotMin - visStart) * PX_PER_MIN;
            const nonWork = isNonWorkTime(slotMin);
            return (
              <div
                key={`line-${slotMin}`}
                className={`absolute left-0 right-0 border-t ${nonWork ? "border-gray-100 dark:border-white/[0.03]" : "border-gray-200/60 dark:border-white/5"}`}
                style={{ top: `${top}px` }}
              />
            );
          })}

          {/* Non-work background */}
          {visGridSlots.filter((s) => isNonWorkTime(s)).map((slotMin) => {
            const top = (slotMin - visStart) * PX_PER_MIN;
            return (
              <div
                key={`bg-${slotMin}`}
                className="absolute left-0 right-0 bg-gray-50/50 dark:bg-white/[0.015]"
                style={{ top: `${top}px`, height: `${STEP * PX_PER_MIN}px` }}
              />
            );
          })}

          {/* "Now" indicator — minute-precise position */}
          {isToday && nowTotal >= visStart && nowTotal < visEnd && (
            <div
              className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
              style={{ top: `${(nowTotal - visStart) * PX_PER_MIN}px` }}
            >
              <span className="text-[9px] font-bold font-mono text-accent bg-accent/10 rounded-full px-1.5 py-0.5 -ml-0.5 flex-shrink-0 border border-accent/20 shadow-sm">
                {fmtTime(nowTotal)}
              </span>
              <div className="flex-1 h-[1.5px] bg-gradient-to-r from-accent/60 to-accent/10" />
            </div>
          )}

          {/* Drag time indicator — shows minute-precise time during drag */}
          {dragKey && dragTimeMin !== null && dragTimeMin >= visStart && dragTimeMin < visEnd && (
            <div
              className="absolute left-0 right-0 z-30 flex items-center pointer-events-none"
              style={{ top: `${(dragTimeMin - visStart) * PX_PER_MIN}px` }}
            >
              <span className="text-[10px] font-bold font-mono text-white bg-accent rounded-full px-2 py-0.5 shadow-lg -ml-1 flex-shrink-0">
                {fmtTime(dragTimeMin)}
              </span>
              <div className="flex-1 h-[2px] bg-accent/40 border-dashed" />
            </div>
          )}

          {/* Entries — absolutely positioned at minute-precise offsets */}
          {entries.map((entry) => {
            const isPastEntry = isPastDay || (isToday && entry.startMin + entry.durationMin <= nowTotal);
            // In the past on today, hide empty pushed-down entries
            if (isPastEntry && isToday && entry.pushedDown) return null;
            const isEditing = editingTaskId === (entry.task?.id || entry.subtask?.id);
            const dragging = dragKey === entry.key;
            const isTask = entry.type === "task" || entry.type === "task-parent";
            const isSubtask = entry.type === "subtask";
            const isParentSummary = entry.type === "task-parent";
            const entryTop = (entry.startMin - visStart) * PX_PER_MIN;
            const entryHeight = Math.max(entry.durationMin * PX_PER_MIN, MIN_ENTRY_HEIGHT_PX);

            const canReschedule = entry.pushedDown && (isTask || isSubtask) && entry.task &&
              (!entry.task.deadline || entry.task.deadline >= todayDate);

            return (
              <div
                key={entry.key}
                draggable={isDraggable(entry) && !isEditing}
                onDragStart={(e) => handleDragStart(e, entry.key)}
                onDragEnd={handleDragEnd}
                className={`absolute left-0 right-0 flex items-start gap-1.5 px-2 py-0.5 rounded-md text-xs group transition-all overflow-hidden
                  ${dragging ? "opacity-50 scale-[0.97] z-10" : "z-10"}
                  ${isPastEntry ? "opacity-50" : ""}
                  ${entry.completed ? "!opacity-60 line-through !bg-success/10 !border-l-2 !border-success/50" : ""}
                  ${isSubtask ? "ml-4 !left-4" : ""}
                  ${entry.type === "event" ? "bg-accent/10 text-accent font-medium border-l-2 border-accent" : ""}
                  ${isParentSummary ? "bg-gray-200 dark:bg-white/10 border border-dashed border-gray-300 dark:border-white/20 text-muted-light dark:text-muted-dark italic" : ""}
                  ${isSubtask && !entry.overdue ? "bg-gray-50 dark:bg-white/[0.03] border-l-2 border-accent/30" : ""}
                  ${isSubtask && entry.overdue ? "bg-danger/5 text-danger border-l-2 border-danger/30" : ""}
                  ${isTask && !isParentSummary && entry.overdue && !entry.completed ? "bg-danger/10 text-danger border-l-2 border-danger" : ""}
                  ${isTask && !isParentSummary && !entry.overdue && !entry.completed ? "bg-gray-100 dark:bg-white/5 border-l-2 border-gray-300 dark:border-white/15" : ""}
                  ${entry.type === "break" ? "bg-warn/10 text-amber-700 dark:text-warn border-l-2 border-warn" : ""}
                  ${entry.pushedDown ? "border-dashed !border-l-2 !border-orange-400 bg-orange-50 dark:bg-orange-900/10" : ""}
                  ${entry.needsPushConfirm ? "!border-l-2 !border-amber-400 bg-amber-50 dark:bg-amber-900/10" : ""}
                `}
                style={{ top: `${entryTop}px`, height: `${entryHeight}px` }}
              >
                {/* Drag handle */}
                {isDraggable(entry) && !isPastEntry && (
                  <span className="w-3 flex-shrink-0 opacity-0 group-hover:opacity-40 cursor-grab active:cursor-grabbing transition-opacity mt-0.5">
                    <GripVertical className="w-3 h-3 text-muted-light dark:text-muted-dark" />
                  </span>
                )}

                {/* Time badge — minute-precise start–end */}
                <span className="text-[9px] font-mono text-muted-light dark:text-muted-dark flex-shrink-0 mt-0.5 opacity-70">
                  {fmtTime(entry.startMin)}–{fmtTime(entry.startMin + entry.durationMin)}
                </span>

                {/* Icons */}
                {entry.type === "event" && <Calendar className="w-3 h-3 flex-shrink-0 mt-0.5" />}
                {isTask && entry.overdue && <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />}
                {isTask && entry.scheduled && !entry.overdue && <Clock className="w-3 h-3 flex-shrink-0 text-accent mt-0.5" />}
                {isSubtask && <span className="w-1.5 h-1.5 rounded-full bg-accent/40 flex-shrink-0 mt-1" />}
                {isParentSummary && <CheckCircle className="w-3 h-3 flex-shrink-0 opacity-50 mt-0.5" />}
                {entry.type === "break" && <Coffee className="w-3 h-3 flex-shrink-0 mt-0.5" />}

                {/* Label / edit */}
                {isEditing ? (
                  <input
                    autoFocus value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={() => handleEditSave(entry.task?.id || entry.subtask?.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleEditSave(entry.task?.id || entry.subtask?.id);
                      if (e.key === "Escape") { setEditingTaskId(null); setEditingSubtaskParent(null); }
                    }}
                    className="flex-1 bg-transparent outline-none border-b border-accent min-w-0 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="flex-1 min-w-0 flex flex-col mt-0.5">
                    <span className="truncate">
                      {entry.label}
                      {isParentSummary && entry.subtaskCount > 0 && <span className="ml-1 text-[10px] font-mono opacity-50">({entry.subtaskCount} ↑)</span>}
                    </span>
                    {isSubtask && entry.parentTask && (
                      <span className="text-[9px] text-muted-light dark:text-muted-dark truncate">↑ {entry.parentTask.text}</span>
                    )}
                  </span>
                )}

                {/* Priority dot */}
                {(isTask || isSubtask) && entry.priority && !isEditing && (
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${entry.priority === "high" ? "bg-danger" : entry.priority === "medium" ? "bg-warn" : "bg-success"}`} />
                )}

                {/* Energy resource indicator */}
                {(isTask || isSubtask) && entry.priority && !isEditing && energyLevel && (
                  <span
                    className={`text-[9px] flex-shrink-0 mt-0.5 transition-opacity ${getEnergyMatch(entry.priority).matched ? "opacity-100" : "opacity-30"}`}
                    title={`${t("home.energyCost")}: ${t(`home.energy.${PRIORITY_ENERGY[entry.priority] || "normal"}`)}`}
                  >
                    {getEnergyMatch(entry.priority).emoji}
                  </span>
                )}

                {/* Reschedule to next day button */}
                {canReschedule && !isEditing && (
                  <button
                    onClick={() => onRescheduleNextDay(entry.task.id)}
                    className="flex-shrink-0 px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-[10px] font-medium hover:bg-orange-200 dark:hover:bg-orange-800/40 transition-colors"
                    title={t("home.rescheduleNextDay")}
                  >
                    <CalendarPlus className="w-3 h-3 inline -mt-0.5" /> {t("home.rescheduleNextDay")}
                  </button>
                )}

                {/* Break remove button */}
                {entry.type === "break" && !isPastEntry && onToggleBreakRemoved && (
                  <button onClick={() => onToggleBreakRemoved(viewDate)}
                    className="w-5 h-5 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                    title={t("home.removeBreak")} aria-label={t("home.removeBreak")}>
                    <Trash2 className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  </button>
                )}

                {/* Break matched indicator */}
                {entry.type === "break" && entry.matchedBreak && (
                  <span className="text-[9px] text-amber-600/60 dark:text-amber-400/60 font-mono flex-shrink-0" title={t("home.breakMatched")}>
                    ✓
                  </span>
                )}

                {/* Task action buttons */}
                {isTask && entry.task && !isPastEntry && !isEditing && !entry.completed && (
                  <>
                    <button onClick={() => onCompleteTask(entry.task.id)}
                      className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 flex-shrink-0 hover:border-accent hover:bg-accent/10 transition-colors flex items-center justify-center"
                      title={t("tasks.complete")} aria-label={t("tasks.complete")}>
                      <CheckCircle className="w-3 h-3 text-accent" />
                    </button>
                    {onStartTask && countdownStartEnabled && (
                      <button onClick={() => onStartTask(entry.task)}
                        className="w-5 h-5 rounded bg-accent/10 flex-shrink-0 hover:bg-accent hover:text-white transition-colors flex items-center justify-center text-accent text-[10px]"
                        title={t("tasks.start")} aria-label={t("tasks.start")}>
                        ▶
                      </button>
                    )}
                    {entry.needsPushConfirm && (
                      <button
                        onClick={() => {
                          const taskId = entry.task?.id || entry.subtask?.id;
                          setConfirmedPushIds(prev => new Set([...prev, taskId]));
                          if (onPushDownTask && taskId) onPushDownTask(taskId, fmtTime(Math.ceil(nowTotal / STEP) * STEP), entry.type === "subtask" ? entry.parentTask?.id : null);
                        }}
                        className="w-5 h-5 rounded bg-amber-100 dark:bg-amber-900/30 flex-shrink-0 hover:bg-amber-200 transition-colors flex items-center justify-center text-amber-700 dark:text-amber-300 text-[10px]"
                        title={t("home.pushDown")}>
                        →
                      </button>
                    )}
                    <button onClick={() => { setEditingTaskId(entry.task.id); setEditText(entry.task.text); }}
                      className="w-5 h-5 rounded hover:bg-gray-100 dark:hover:bg-white/5 flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                      title={t("common.edit")} aria-label={t("common.edit")}>
                      <Pencil className="w-2.5 h-2.5 text-muted-light dark:text-muted-dark" />
                    </button>
                  </>
                )}
                {isTask && !isPastEntry && isEditing && (
                  <button onClick={() => setEditingTaskId(null)}
                    className="w-5 h-5 rounded hover:bg-gray-100 dark:hover:bg-white/5 flex-shrink-0 flex items-center justify-center"
                    title={t("common.cancel")} aria-label={t("common.cancel")}>
                    <X className="w-2.5 h-2.5 text-muted-light dark:text-muted-dark" />
                  </button>
                )}

                {/* Subtask action buttons */}
                {isSubtask && entry.subtask && entry.parentTask && !isPastEntry && !isEditing && (
                  <>
                    <button onClick={() => onToggleSubtask(entry.parentTask.id, entry.subtask.id)}
                      className={`w-5 h-5 rounded border-2 flex-shrink-0 transition-colors flex items-center justify-center ${
                        entry.subtask.completed ? "border-success bg-success/10" : "border-gray-300 dark:border-gray-600 hover:border-accent hover:bg-accent/10"
                      }`}
                      title={entry.subtask.completed ? t("tasks.reopen") : t("tasks.complete")}>
                      <CheckCircle className={`w-3 h-3 ${entry.subtask.completed ? "text-success" : "text-accent"}`} />
                    </button>
                    {onStartTask && countdownStartEnabled && !entry.subtask.completed && (
                      <button onClick={() => onStartTask(entry.subtask)}
                        className="w-5 h-5 rounded bg-accent/10 flex-shrink-0 hover:bg-accent hover:text-white transition-colors flex items-center justify-center text-accent text-[10px]"
                        title={t("tasks.start")} aria-label={t("tasks.start")}>
                        ▶
                      </button>
                    )}
                    <button onClick={() => { setEditingTaskId(entry.subtask.id); setEditingSubtaskParent(entry.parentTask.id); setEditText(entry.subtask.text); }}
                      className="w-5 h-5 rounded hover:bg-gray-100 dark:hover:bg-white/5 flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                      title={t("common.edit")} aria-label={t("common.edit")}>
                      <Pencil className="w-2.5 h-2.5 text-muted-light dark:text-muted-dark" />
                    </button>
                  </>
                )}
                {isSubtask && !isPastEntry && isEditing && (
                  <button onClick={() => { setEditingTaskId(null); setEditingSubtaskParent(null); }}
                    className="w-5 h-5 rounded hover:bg-gray-100 dark:hover:bg-white/5 flex-shrink-0 flex items-center justify-center"
                    title={t("common.cancel")} aria-label={t("common.cancel")}>
                    <X className="w-2.5 h-2.5 text-muted-light dark:text-muted-dark" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const CATEGORY_CONFIG = {
  work:     { emoji: "💼" },
  personal: { emoji: "👤" },
  health:   { emoji: "💪" },
  finance:  { emoji: "💰" },
  learning: { emoji: "📚" },
  home:     { emoji: "🏠" },
  errand:   { emoji: "🏃" },
  creative: { emoji: "🎨" },
};

const MAX_TIMELINE_TASKS = 8;

// Helper: format Date to "YYYY-MM-DD" local date string
function toLocalDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Helper: get ISO week's Monday
function getWeekMonday(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function shiftDateBy(dateStr, delta) {
  const [y, m, dd] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, dd + delta)).toISOString().slice(0, 10);
}

function WeekTimelineView({ t, tasks, getEventsForDate, weekStart, onSelectDay, todayStr, settings, onMoveTask, onMoveSubtask, onCompleteTask, onToggleSubtask, onStartTask, countdownStartEnabled, energyLevel }) {
  const HOUR_HEIGHT = 44; // px per hour
  const PX_PER_MIN = HOUR_HEIGHT / 60;

  const workStartH = parseInt(settings.workSchedule.start.split(":")[0], 10);
  const workStartM = parseInt(settings.workSchedule.start.split(":")[1] || "0", 10);
  const workEndH = parseInt(settings.workSchedule.end.split(":")[0], 10);
  const workEndM = parseInt(settings.workSchedule.end.split(":")[1] || "0", 10);
  const workStart = workStartH * 60 + workStartM;
  const workEnd = workEndH * 60 + workEndM;
  const hideParentWithSubtasks = settings.timeline?.hideParentWithSubtasks === true;

  const [currentTime, setCurrentTime] = useState(new Date());
  const [dragItem, setDragItem] = useState(null); // { id, type: "task"|"subtask", parentId }
  const [dragOver, setDragOver] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const days = Array.from({ length: 7 }, (_, i) => shiftDateBy(weekStart, i));
  const dayNames = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  const fmtTime = (totalMin) => {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  // Energy cost indicator (mirrors day view logic):
  // Priority "high" requires high energy, "medium" requires normal energy, "low" requires low energy.
  const WEEK_PRIORITY_ENERGY = { high: "high", medium: "normal", low: "low" };
  const WEEK_ENERGY_EMOJI = { high: "⚡", normal: "🔵", low: "🔋" };
  // Minimum chip height in px required before showing hover action buttons
  const MIN_HEIGHT_FOR_ACTIONS = 20;
  const getWeekEnergyMatch = (priority) => {
    const cost = WEEK_PRIORITY_ENERGY[priority] || "normal";
    if (!energyLevel) return { emoji: WEEK_ENERGY_EMOJI[cost], matched: false };
    return { emoji: WEEK_ENERGY_EMOJI[cost], matched: cost === energyLevel };
  };

  const nowTotal = currentTime.getHours() * 60 + currentTime.getMinutes();
  const isCurrentWeek = days.includes(todayStr);

  // Get top-level tasks for a day (including completed tasks)
  const getTasksForDay = (date) => tasks.filter((tk) => {
    if (tk.completed) {
      // Show completed tasks on the day they were completed
      if (tk.completedAt) {
        return toLocalDateStr(new Date(tk.completedAt)) === date;
      }
      return false;
    }
    if (date > todayStr) return tk.scheduledDate === date;
    if (date === todayStr) return !tk.scheduledDate || tk.scheduledDate <= todayStr;
    // Past days: show tasks that were scheduled for that date (pending ones that weren't rescheduled)
    return tk.scheduledDate === date;
  });

  // Expand tasks to renderable items (tasks + subtasks), respecting hideParentWithSubtasks
  const getItemsForDay = (date) => {
    const dayTasks = getTasksForDay(date);
    const items = [];
    for (const task of dayTasks) {
      if (task.completed) {
        // Show completed tasks as simple items (no subtask expansion needed)
        items.push({ type: "task", id: task.id, parentId: null, text: task.text, estimatedMinutes: task.estimatedMinutes || 30, scheduledTime: task.scheduledTime, priority: task.priority, completed: true });
        continue;
      }
      const incompleteSubs = (task.subtasks || []).filter((s) => !s.completed);
      if (hideParentWithSubtasks && incompleteSubs.length > 0) {
        for (const sub of incompleteSubs) {
          if (!sub.scheduledDate || sub.scheduledDate === date) {
            items.push({ type: "subtask", id: sub.id, parentId: task.id, text: sub.text, estimatedMinutes: sub.estimatedMinutes || task.estimatedMinutes || 30, scheduledTime: sub.scheduledTime || task.scheduledTime, priority: task.priority });
          }
        }
      } else {
        items.push({ type: "task", id: task.id, parentId: null, text: task.text, estimatedMinutes: task.estimatedMinutes || 30, scheduledTime: task.scheduledTime, priority: task.priority });
        for (const sub of incompleteSubs) {
          // Show subtask if it belongs to this day (no explicit scheduledDate or scheduled for this date)
          if (!sub.scheduledDate || sub.scheduledDate === date) {
            items.push({ type: "subtask", id: sub.id, parentId: task.id, text: sub.text, estimatedMinutes: sub.estimatedMinutes || 30, scheduledTime: sub.scheduledTime || task.scheduledTime, priority: task.priority });
          }
        }
      }
    }
    // Also include subtasks independently rescheduled to this day (parent not on this day)
    for (const task of tasks) {
      if (task.completed) continue;
      if (dayTasks.some((dt) => dt.id === task.id)) continue;
      for (const sub of (task.subtasks || []).filter((s) => !s.completed && s.scheduledDate === date)) {
        items.push({ type: "subtask", id: sub.id, parentId: task.id, text: sub.text, estimatedMinutes: sub.estimatedMinutes || 30, scheduledTime: sub.scheduledTime, priority: task.priority });
      }
    }
    return items;
  };

  // Compute effective canvas time range (canvas auto-scaling — Req 2)
  let effectiveStart = workStart;
  let effectiveEnd = workEnd;
  for (const date of days) {
    for (const item of getItemsForDay(date)) {
      if (item.scheduledTime) {
        const [h, m] = item.scheduledTime.split(":").map(Number);
        const s = h * 60 + m;
        effectiveStart = Math.min(effectiveStart, s);
        effectiveEnd = Math.max(effectiveEnd, s + (item.estimatedMinutes || 30));
      }
    }
    for (const ev of getEventsForDate(date).filter((ev) => !ev.allDay && ev.start)) {
      let evMin;
      if (/^\d{1,2}:\d{2}$/.test(ev.start)) {
        const [eh, em] = ev.start.split(":").map(Number);
        evMin = eh * 60 + em;
      } else {
        const sd = new Date(ev.start);
        if (!isNaN(sd)) evMin = sd.getHours() * 60 + sd.getMinutes();
      }
      if (evMin !== undefined) {
        effectiveStart = Math.min(effectiveStart, evMin);
        effectiveEnd = Math.max(effectiveEnd, evMin + 60);
      }
    }
  }
  if (isCurrentWeek) {
    effectiveStart = Math.min(effectiveStart, nowTotal);
    effectiveEnd = Math.max(effectiveEnd, nowTotal + 60);
  }
  // Snap to hour boundaries, clamp to 0–24h
  effectiveStart = Math.max(0, Math.floor(effectiveStart / 60) * 60);
  effectiveEnd = Math.min(24 * 60, Math.ceil(effectiveEnd / 60) * 60);
  const totalHeight = (effectiveEnd - effectiveStart) * PX_PER_MIN;

  const nowInRange = isCurrentWeek && nowTotal >= effectiveStart && nowTotal < effectiveEnd;
  const nowTop = (nowTotal - effectiveStart) * PX_PER_MIN;

  // Hourly grid slots
  const gridSlots = [];
  for (let min = effectiveStart; min <= effectiveEnd; min += 60) {
    gridSlots.push(min);
  }

  const HEADER_H = 28;

  return (
    <div className="flex overflow-x-auto select-none">
      {/* Time axis */}
      <div className="flex-shrink-0 w-10 relative" style={{ paddingTop: `${HEADER_H}px` }}>
        <div style={{ height: `${totalHeight}px`, position: "relative" }}>
          {gridSlots.map((min) => (
            <span
              key={min}
              className="absolute right-1 text-[9px] font-mono text-gray-400 dark:text-gray-500 leading-none"
              style={{ top: `${(min - effectiveStart) * PX_PER_MIN - 4}px` }}
            >
              {fmtTime(min)}
            </span>
          ))}
        </div>
      </div>

      {/* Day columns */}
      <div className="flex flex-1 min-w-0 relative gap-px">
        {/* "Now" indicator — spans all columns */}
        {nowInRange && (
          <div
            className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
            style={{ top: `${nowTop + HEADER_H}px` }}
          >
            <div className="flex-1 h-[1.5px] bg-gradient-to-r from-accent/70 to-accent/10" />
            <span className="text-[8px] font-bold font-mono text-accent bg-accent/10 rounded-full px-1 py-px flex-shrink-0 border border-accent/20 mr-px">
              {fmtTime(nowTotal)}
            </span>
          </div>
        )}

        {days.map((date, idx) => {
          const isToday = date === todayStr;
          const isPast = date < todayStr;
          const items = getItemsForDay(date);
          const events = getEventsForDate(date).filter((ev) => !ev.allDay && ev.start);
          const isDragTarget = dragOver === date;
          // Place unscheduled items starting at workStart (consistent with day view)
          let unscheduledNextMin = workStart;
          // Account for scheduled items that might overlap with workStart area
          items.forEach((item) => {
            if (!item.scheduledTime) return;
            const [sh, sm] = item.scheduledTime.split(":").map(Number);
            const itemEnd = sh * 60 + sm + (item.estimatedMinutes || 30);
            if (sh * 60 + sm <= unscheduledNextMin && itemEnd > unscheduledNextMin) {
              unscheduledNextMin = itemEnd;
            }
          });

          return (
            <div key={date} className="flex-1 flex flex-col min-w-0" style={{ minWidth: "36px" }}>
              {/* Day header */}
              <button
                onClick={() => onSelectDay(date)}
                className={`flex flex-col items-center justify-center text-center transition-all rounded-t ${
                  isToday
                    ? "bg-accent/10 text-accent"
                    : isPast
                    ? "text-gray-400 dark:text-gray-600"
                    : "hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400"
                }`}
                style={{ height: `${HEADER_H}px` }}
              >
                <span className="text-[8px] font-medium uppercase leading-none">{dayNames[idx]}</span>
                <span className={`text-[11px] font-bold leading-tight ${isToday ? "text-accent" : ""}`}>
                  {date.slice(8)}
                </span>
              </button>

              {/* Timeline column */}
              <div
                className={`relative overflow-hidden border-l border-gray-100 dark:border-white/[0.06] transition-colors ${
                  isToday ? "bg-accent/[0.02]" : ""
                } ${isDragTarget ? "bg-accent/5 !border-l-accent/40" : ""}`}
                style={{ height: `${totalHeight}px` }}
                onDragOver={(e) => { e.preventDefault(); if (!isPast && dragOver !== date) setDragOver(date); }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(null);
                  if (dragItem && !isPast) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const relY = e.clientY - rect.top;
                    const rawMin = effectiveStart + relY / PX_PER_MIN;
                    const snapped = Math.round(rawMin / 5) * 5;
                    const newTime = fmtTime(Math.max(effectiveStart, Math.min(effectiveEnd - 5, snapped)));
                    if (dragItem.type === "subtask") {
                      onMoveSubtask(dragItem.parentId, dragItem.id, date, newTime);
                    } else {
                      onMoveTask(dragItem.id, date, newTime);
                    }
                    setDragItem(null);
                  }
                }}
              >
                {/* Hourly grid lines */}
                {gridSlots.map((min) => (
                  <div
                    key={min}
                    className="absolute left-0 right-0 border-t border-gray-100 dark:border-white/[0.05]"
                    style={{ top: `${(min - effectiveStart) * PX_PER_MIN}px` }}
                  />
                ))}

                {/* Half-hour grid lines */}
                {gridSlots.slice(0, -1).map((min) => (
                  <div
                    key={`h-${min}`}
                    className="absolute left-0 right-0 border-t border-gray-50 dark:border-white/[0.02]"
                    style={{ top: `${(min + 30 - effectiveStart) * PX_PER_MIN}px` }}
                  />
                ))}

                {/* Calendar events */}
                {events.map((ev) => {
                  let evMin;
                  if (/^\d{1,2}:\d{2}$/.test(ev.start)) {
                    const [eh, em] = ev.start.split(":").map(Number);
                    evMin = eh * 60 + em;
                  } else {
                    const sd = new Date(ev.start);
                    if (isNaN(sd)) return null;
                    evMin = sd.getHours() * 60 + sd.getMinutes();
                  }
                  const topPx = (evMin - effectiveStart) * PX_PER_MIN;
                  if (topPx < 0 || topPx >= totalHeight) return null;
                  let dur = 60;
                  if (ev.end) {
                    let endMin;
                    if (/^\d{1,2}:\d{2}$/.test(ev.end)) {
                      const [eh, em] = ev.end.split(":").map(Number);
                      endMin = eh * 60 + em;
                    } else {
                      const ed = new Date(ev.end);
                      endMin = isNaN(ed) ? evMin + 60 : ed.getHours() * 60 + ed.getMinutes();
                    }
                    dur = Math.max(15, endMin - evMin);
                  }
                  const heightPx = Math.max(12, dur * PX_PER_MIN);
                  return (
                    <div
                      key={ev.id || `${ev.title || "ev"}-${evMin}`}
                      className="absolute left-0 right-0 mx-0.5 rounded bg-accent/15 border-l-2 border-accent text-[8px] px-0.5 overflow-hidden"
                      style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                      title={ev.title || ev.summary}
                    >
                      <span className="truncate block leading-tight text-accent">{ev.title || ev.summary}</span>
                    </div>
                  );
                })}

                {/* Tasks and subtasks */}
                {items.map((item) => {
                  const dur = item.estimatedMinutes || 30;
                  const heightPx = Math.max(14, dur * PX_PER_MIN);
                  let topPx;
                  if (item.scheduledTime) {
                    const [h, m] = item.scheduledTime.split(":").map(Number);
                    topPx = (h * 60 + m - effectiveStart) * PX_PER_MIN;
                  } else {
                    topPx = (unscheduledNextMin - effectiveStart) * PX_PER_MIN;
                    unscheduledNextMin += dur;
                  }
                  // Clip to canvas bounds (Req 2)
                  if (topPx + heightPx < 0 || topPx >= totalHeight) return null;
                  topPx = Math.max(0, topPx);
                  const clippedHeight = Math.min(heightPx, totalHeight - topPx);
                  const isDragging = dragItem?.id === item.id && dragItem?.type === item.type;
                  const isSubtask = item.type === "subtask";
                  const isCompleted = !!item.completed;
                  const priorityClass = isCompleted
                    ? "bg-success/15 border-l-[3px] border-success/50 line-through opacity-60"
                    : item.priority === "high"
                    ? "bg-danger/20 border-l-[3px] border-danger"
                    : item.priority === "medium"
                    ? "bg-warn/15 border-l-[3px] border-warn"
                    : "bg-gray-100 dark:bg-white/[0.08] border-l-[3px] border-gray-300 dark:border-white/20";
                  return (
                    <div
                      key={`${item.type}-${item.id}`}
                      draggable
                      onDragStart={(e) => {
                        setDragItem({ id: item.id, type: item.type, parentId: item.parentId });
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", item.id);
                      }}
                      onDragEnd={() => { setDragItem(null); setDragOver(null); }}
                      className={`absolute rounded text-[8px] px-1 overflow-hidden cursor-grab active:cursor-grabbing z-10 transition-opacity group ${priorityClass} ${isDragging ? "opacity-40" : "opacity-100"} ${isSubtask ? "mx-2 opacity-80" : "mx-0.5"}`}
                      style={{ top: `${topPx}px`, height: `${clippedHeight}px`, left: isSubtask ? "6px" : "2px", right: "2px" }}
                      title={`${item.text} — ${t("home.dragHint")}`}
                    >
                      <div className="flex items-center gap-0.5 h-full min-w-0">
                        {isCompleted && <span className="text-success text-[8px] flex-shrink-0">✓</span>}
                        <span className="flex-1 truncate leading-tight font-medium min-w-0">{item.text}</span>
                        {/* Energy indicator */}
                        {energyLevel && item.priority && !isCompleted && (
                          <span className={`text-[7px] flex-shrink-0 transition-opacity ${getWeekEnergyMatch(item.priority).matched ? "opacity-100" : "opacity-25"}`}>
                            {getWeekEnergyMatch(item.priority).emoji}
                          </span>
                        )}
                        {/* Action buttons (visible on hover when height permits) */}
                        {clippedHeight >= MIN_HEIGHT_FOR_ACTIONS && !isCompleted && (
                          <span className="flex-shrink-0 flex items-center gap-px opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Complete / toggle subtask */}
                            {item.type === "subtask" && onToggleSubtask ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); onToggleSubtask(item.parentId, item.id); }}
                                className="w-3 h-3 flex items-center justify-center rounded-sm bg-white/50 hover:bg-success/30 text-[7px]"
                                title={t("tasks.complete")}
                              >✓</button>
                            ) : onCompleteTask ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); onCompleteTask(item.id); }}
                                className="w-3 h-3 flex items-center justify-center rounded-sm bg-white/50 hover:bg-success/30 text-[7px]"
                                title={t("tasks.complete")}
                              >✓</button>
                            ) : null}
                            {/* Start countdown */}
                            {countdownStartEnabled && onStartTask && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onStartTask({ id: item.id, text: item.text, estimatedMinutes: item.estimatedMinutes }); }}
                                className="w-3 h-3 flex items-center justify-center rounded-sm bg-white/50 hover:bg-accent/30 text-[7px]"
                                title={t("tasks.start")}
                              >▶</button>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}



function MonthPlanView({ t, tasks, getEventsForDate, monthStart, onSelectDay, todayStr }) {
  const [y, m] = monthStart.split("-").map(Number);
  const firstDay = new Date(y, m - 1, 1);
  const lastDay = new Date(y, m, 0);
  const daysInMonth = lastDay.getDate();

  // Weekday of first day (Mon=0..Sun=6)
  const startWd = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const cells = [];
  for (let i = 0; i < startWd; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`);
  }

  const dayNames = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  return (
    <div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {dayNames.map((d) => (
          <div key={d} className="text-center text-[9px] font-medium text-muted-light dark:text-muted-dark uppercase py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} />;
          const isToday = date === todayStr;
          const isPast = date < todayStr;
          const dayTasks = tasks.filter((tk) => {
            if (tk.completed) {
              if (!tk.completedAt) return false;
              return toLocalDateStr(new Date(tk.completedAt)) === date;
            }
            if (date > todayStr) return tk.scheduledDate === date;
            if (date === todayStr) return !tk.scheduledDate || tk.scheduledDate <= todayStr;
            return false;
          });
          const evCount = getEventsForDate(date).filter((ev) => !ev.allDay).length;
          const pendingCount = dayTasks.filter((tk) => !tk.completed).length;
          const completedCount = dayTasks.filter((tk) => tk.completed).length;

          return (
            <button
              key={date}
              onClick={() => onSelectDay(date)}
              className={`flex flex-col items-center p-1 rounded-lg text-center min-h-[48px] transition-all border ${
                isToday
                  ? "border-accent bg-accent/10"
                  : isPast
                  ? "border-transparent bg-gray-50/50 dark:bg-white/2"
                  : "border-transparent hover:bg-gray-50 dark:hover:bg-white/5"
              }`}
            >
              <span className={`text-xs font-medium ${isToday ? "text-accent font-bold" : isPast ? "text-gray-400 dark:text-gray-600" : ""}`}>
                {date.slice(8).replace(/^0/, "")}
              </span>
              {evCount > 0 && <div className="w-1 h-1 rounded-full bg-accent mt-0.5" />}
              {pendingCount > 0 && <span className="text-[8px] text-muted-light dark:text-muted-dark">{pendingCount}</span>}
              {completedCount > 0 && <span className="text-[8px] text-success">✓{completedCount}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}


export default function HomePage() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const { getEventsForDate } = useCalendar();
  const { settings } = useSettings();

  const todayStr = new Date().toISOString().slice(0, 10);
  const [viewDate, setViewDate] = useState(todayStr);
  const isToday = viewDate === todayStr;
  const isPast = viewDate < todayStr;

  // New gamification state
  const [showWeeklyReport, setShowWeeklyReport] = useState(false);
  const [countdownTask, setCountdownTask] = useState(null);
  const [timelineShowFullDay, setTimelineShowFullDay] = useState(() => settings.features?.timeTrackingEnabled === false);
  const [planView, setPlanView] = useState("day"); // "day" | "week" | "month"

  // Weekly report: show on Monday if not yet dismissed this week
  useEffect(() => {
    if (!settings.gamification?.weeklyReportEnabled) return;
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon
    if (dayOfWeek !== 1) return;
    const weekStart = todayStr;
    if (state.lastWeeklyReport !== weekStart && state.previousWeekStats) {
      setShowWeeklyReport(true);
    }
  }, [settings.gamification?.weeklyReportEnabled, state.lastWeeklyReport, state.previousWeekStats, todayStr]);

  const viewEvents = getEventsForDate(viewDate);
  const allDayEvents = viewEvents.filter((ev) => ev.allDay);

  const isTaskOverdue = (task) => task.deadline && !task.completed && new Date(task.deadline + "T23:59:59") < new Date();

  const pendingTasks = state.tasks.filter((tk) => !tk.completed);
  const overdueTasks = pendingTasks.filter(isTaskOverdue);

  // Filter tasks for the day view:
  // - Past days: show only tasks completed on that date
  // - Today: show pending tasks not scheduled for a future date
  // - Future days: show tasks scheduled for exactly that date (no duplicates across days)
  const isFuture = viewDate > todayStr;
  let dayTasks;
  if (isPast) {
    // Past: show tasks completed on this date
    dayTasks = state.tasks.filter((tk) => {
      if (!tk.completed) return false;
      // Check if completedAt matches viewDate (local timezone)
      if (tk.completedAt) {
        return toLocalDateStr(new Date(tk.completedAt)) === viewDate;
      }
      return false;
    });
  } else if (isFuture) {
    // Future: show tasks scheduled for exactly this date — no redundancy
    dayTasks = pendingTasks.filter((tk) => {
      if (tk.scheduledDate === viewDate) return true;
      return false;
    });
  } else {
    // Today: show pending tasks not scheduled for a future date + tasks completed today
    dayTasks = state.tasks.filter((tk) => {
      if (tk.completed) {
        // Include tasks completed today
        if (tk.completedAt) {
          return toLocalDateStr(new Date(tk.completedAt)) === todayStr;
        }
        return false;
      }
      if (tk.scheduledDate && tk.scheduledDate > todayStr) return false;
      return true;
    });
  }

  const topTasks = [...dayTasks]
        .sort((a, b) => {
          const aOverdue = isTaskOverdue(a) ? 0 : 1;
          const bOverdue = isTaskOverdue(b) ? 0 : 1;
          if (aOverdue !== bOverdue) return aOverdue - bOverdue;
          const p = { high: 0, medium: 1, low: 2 };
          // Energy-level sort: low energy → prefer low priority tasks first
          if (state.energyLevel === "low") {
            return (p[b.priority] ?? 1) - (p[a.priority] ?? 1);
          }
          return (p[a.priority] ?? 1) - (p[b.priority] ?? 1);
        });
  const hiddenTaskCount = Math.max(0, topTasks.length - MAX_TIMELINE_TASKS);
  const topTasksSliced = topTasks.slice(0, MAX_TIMELINE_TASKS);

  const handleQuickAdd = (text) => {
    dispatch({ type: "ADD_TASK", payload: { text, priority: "medium", estimatedMinutes: 25 } });
  };

  const shiftDate = (dateStr, delta) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
  };

  const prevDay = () => setViewDate((cur) => shiftDate(cur, -1));
  const nextDay = () => setViewDate((cur) => shiftDate(cur, +1));

  // Week navigation: move viewDate by 7 days
  const prevWeek = () => setViewDate((cur) => shiftDate(cur, -7));
  const nextWeek = () => setViewDate((cur) => shiftDate(cur, +7));

  // Month navigation
  const prevMonth = () => setViewDate((cur) => {
    const [y, m] = cur.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`;
  });
  const nextMonth = () => setViewDate((cur) => {
    const [y, m] = cur.split("-").map(Number);
    const d = new Date(y, m, 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`;
  });

  const weekStart = getWeekMonday(viewDate);
  const monthStart = viewDate.slice(0, 7) + "-01";

  const formatViewDate = () => {
    if (planView === "week") {
      const weekEnd = shiftDateBy(weekStart, 6);
      return `${weekStart.slice(8)}.${weekStart.slice(5,7)} – ${weekEnd.slice(8)}.${weekEnd.slice(5,7)}.${weekEnd.slice(0,4)}`;
    }
    if (planView === "month") {
      const [y, m] = viewDate.split("-").map(Number);
      return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
    }
    if (isToday) return t("common.today");
    if (viewDate === shiftDate(todayStr, +1)) return t("common.tomorrow");
    if (viewDate === shiftDate(todayStr, -1)) return t("common.yesterday");
    const [y, m, d] = viewDate.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const features = settings.features || {};
  const gridInterval = settings.timeline?.gridInterval || 30;
  const { updateSettings } = useSettings();
  const { state: ttState } = useTimeTracking();

  // Requirement 6: Break removal and repositioning state (per-day)
  const [removedBreaks, setRemovedBreaks] = useState(() => {
    try { return JSON.parse(localStorage.getItem("dopamind-removed-breaks") || "[]"); } catch { return []; }
  });
  const [breakTimeOverrides, setBreakTimeOverrides] = useState(() => {
    try { return JSON.parse(localStorage.getItem("dopamind-break-overrides") || "{}"); } catch { return {}; }
  });
  const handleToggleBreakRemoved = (date) => {
    setRemovedBreaks((prev) => {
      const next = prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date];
      localStorage.setItem("dopamind-removed-breaks", JSON.stringify(next));
      return next;
    });
  };
  const handleUpdateBreakTime = (date, time) => {
    setBreakTimeOverrides((prev) => {
      const next = { ...prev, [date]: time };
      localStorage.setItem("dopamind-break-overrides", JSON.stringify(next));
      return next;
    });
  };
  // Get time tracking breaks for the viewed day (for retrospective matching)
  const viewDayTTBreaks = (ttState.entries || [])
    .filter((e) => e.date === viewDate)
    .flatMap((e) => e.breaks || [])
    .filter((b) => b.start && b.end);

  const handleRescheduleNextDay = (taskId) => {
    const tomorrow = shiftDate(todayStr, +1);
    dispatch({ type: "UPDATE_TASK", payload: { id: taskId, scheduledDate: tomorrow } });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Weekly Report Modal (Feature 9) */}
      {showWeeklyReport && state.previousWeekStats && settings.gamification?.weeklyReportEnabled && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="glass-card p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">📊 {t("home.weeklyReport")}</h3>
              <button
                onClick={() => { setShowWeeklyReport(false); dispatch({ type: "DISMISS_WEEKLY_REPORT" }); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-light hover:text-danger hover:bg-danger/10 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-xl bg-accent/5">
                <p className="text-xl font-bold text-accent">{state.previousWeekStats.tasks}</p>
                <p className="text-[10px] text-muted-light dark:text-muted-dark uppercase">{t("stats.completed")}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-green-50 dark:bg-green-900/10">
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{state.previousWeekStats.focusMinutes}</p>
                <p className="text-[10px] text-muted-light dark:text-muted-dark uppercase">{t("stats.focusMin")}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/10">
                <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{state.previousWeekStats.xp}</p>
                <p className="text-[10px] text-muted-light dark:text-muted-dark uppercase">XP</p>
              </div>
            </div>
            {state.previousWeekStats.topDay && (
              <p className="text-xs text-center text-muted-light dark:text-muted-dark">
                🏆 {t("home.weeklyTopDay")}: {new Date(state.previousWeekStats.topDay + "T00:00:00").toLocaleDateString(undefined, { weekday: "long" })}
              </p>
            )}
            <button
              onClick={() => { setShowWeeklyReport(false); dispatch({ type: "DISMISS_WEEKLY_REPORT" }); }}
              className="btn-primary w-full text-sm"
            >
              {t("home.weeklyReportDismiss")}
            </button>
          </div>
        </div>
      )}

      {/* Energy Check-in (Feature 6): energy is managed via the Header energy picker */}

      {/* Daily Challenge (Feature 7) — only on mobile (sidebar shows it on desktop) */}
      {isToday && settings.gamification?.dailyChallengeEnabled && state.dailyChallenge && (() => {
        const def = DAILY_CHALLENGES.find((d) => d.id === state.dailyChallenge.challengeId);
        if (!def) return null;
        const progress = def.type === "complete_tasks" ? state.completedToday : state.focusMinutesToday;
        const pct = Math.min(100, Math.round((progress / def.target) * 100));
        return (
          <div className={`md:hidden glass-card p-4 border ${state.dailyChallenge.completed ? "border-green-300 dark:border-green-700" : "border-accent/20"}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                🎯 {t("home.dailyChallenge")}
                {state.dailyChallenge.completed && <span className="text-success">✓</span>}
              </p>
              <span className="text-xs text-muted-light dark:text-muted-dark">{pct}%</span>
            </div>
            <p className="text-xs text-muted-light dark:text-muted-dark mb-2">
              {t(`home.challenge.${def.type}`, { target: def.target })}
            </p>
            <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-light dark:text-muted-dark mt-1">{progress}/{def.target}</p>
          </div>
        );
      })()}

      {/* Greeting + Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{t("home.greeting")}</h2>
          <p className="text-sm text-muted-light dark:text-muted-dark mt-0.5">{t("home.subtitle")}</p>
        </div>
        <div className="flex gap-3">
          <div className="glass-card px-4 py-2 text-center">
            <p className="text-lg font-bold font-mono text-success">{state.completedToday}</p>
            <p className="text-[10px] text-muted-light dark:text-muted-dark uppercase tracking-wider">{t("stats.completed")}</p>
          </div>
          <div className="glass-card px-4 py-2 text-center">
            <p className="text-lg font-bold font-mono">{pendingTasks.length}</p>
            <p className="text-[10px] text-muted-light dark:text-muted-dark uppercase tracking-wider">{t("stats.open")}</p>
          </div>
          <div className="glass-card px-4 py-2 text-center">
            <p className="text-lg font-bold font-mono text-accent">{state.focusMinutesToday}<span className="text-xs ml-0.5">{t("stats.min")}</span></p>
            <p className="text-[10px] text-muted-light dark:text-muted-dark uppercase tracking-wider">{t("stats.focusMin")}</p>
          </div>
          {/* Compassion Mode button (Feature 1) */}
          {isToday && settings.gamification?.compassionModeEnabled && !state.compassionModeDate && (
            <button
              onClick={() => dispatch({ type: "SET_COMPASSION_MODE" })}
              className="glass-card px-3 py-2 text-center hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors"
              title={t("home.compassionMode")}
            >
              <p className="text-lg">💙</p>
              <p className="text-[10px] text-muted-light dark:text-muted-dark uppercase tracking-wider whitespace-nowrap">{t("home.notMyDay")}</p>
            </button>
          )}
          {isToday && state.compassionModeDate === todayStr && (
            <div className="glass-card px-3 py-2 text-center bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800/30">
              <p className="text-lg">💙</p>
              <p className="text-[10px] text-pink-600 dark:text-pink-400 uppercase tracking-wider whitespace-nowrap">{t("home.compassionActive")}</p>
            </div>
          )}
        </div>
      </div>

      {/* All-day events banner */}
      {allDayEvents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allDayEvents.map((ev) => (
            <span key={ev.id} className="badge bg-accent/10 text-accent text-xs flex items-center gap-1.5 px-3 py-1.5">
              <Calendar className="w-3.5 h-3.5" /> {ev.title || ev.summary} <span className="opacity-60 text-[10px]">{t("calendar.allDay")}</span>
            </span>
          ))}
        </div>
      )}

      {/* Clock widget (only when time tracking is enabled) */}
      {features.timeTrackingEnabled !== false && <ClockWidget t={t} />}

      {/* Unified Day/Week/Month Timeline */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider">{t("home.dayPlan")}</h3>
            <p className="text-[10px] text-muted-light dark:text-muted-dark mt-0.5">{t("home.dayPlanHint")}</p>
          </div>
          <div className="flex items-center gap-1 flex-wrap justify-end">
            {/* View mode switcher */}
            <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-white/5 rounded-lg p-0.5">
              {["day", "week", "month"].map((v) => (
                <button
                  key={v}
                  onClick={() => setPlanView(v)}
                  className={`px-2 py-0.5 rounded text-[10px] transition-all ${
                    planView === v
                      ? "bg-white dark:bg-white/15 text-accent font-bold shadow-sm"
                      : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  }`}
                >
                  {t(`home.planView.${v}`)}
                </button>
              ))}
            </div>
            {/* Navigation */}
            <button
              onClick={planView === "week" ? prevWeek : planView === "month" ? prevMonth : prevDay}
              className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center transition-colors"
              aria-label={t("home.previousDay")}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium min-w-[90px] text-center">{formatViewDate()}</span>
            <button
              onClick={planView === "week" ? nextWeek : planView === "month" ? nextMonth : nextDay}
              className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center transition-colors"
              aria-label={t("home.nextDay")}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {overdueTasks.length > 0 && isToday && planView === "day" && (
              <span className="badge bg-danger/10 text-danger text-[10px] flex items-center gap-1 ml-1">
                <AlertCircle className="w-3 h-3" /> {overdueTasks.length} {t("tasks.overdue")}
              </span>
            )}
            {/* Grid interval selector + List mode – only in day view */}
            {planView === "day" && (
              <div className="flex items-center gap-0.5 ml-1 bg-gray-100 dark:bg-white/5 rounded-lg p-0.5">
                {[15, 30, 60].map((iv) => (
                  <button
                    key={iv}
                    onClick={() => updateSettings("timeline", { gridInterval: iv })}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                      gridInterval === iv
                        ? "bg-white dark:bg-white/15 text-accent font-bold shadow-sm"
                        : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    }`}
                    title={t("home.gridInterval")}
                  >
                    {iv}m
                  </button>
                ))}
                <button
                  onClick={() => updateSettings("timeline", { gridInterval: "list" })}
                  className={`px-2 py-0.5 rounded text-[10px] transition-all flex items-center gap-0.5 ${
                    gridInterval === "list"
                      ? "bg-white dark:bg-white/15 text-accent font-bold shadow-sm"
                      : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  }`}
                  title={t("home.listMode")}
                >
                  <List className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setTimelineShowFullDay(v => !v)}
                  className={`px-2 py-0.5 rounded text-[10px] transition-all flex items-center gap-0.5 ${
                    timelineShowFullDay
                      ? "bg-white dark:bg-white/15 text-accent font-bold shadow-sm"
                      : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  }`}
                  title={timelineShowFullDay ? t("home.workHoursOnly") : t("home.toggleFullDay")}
                >
                  {timelineShowFullDay ? "24h" : t("home.workHoursOnly")}
                </button>
              </div>
            )}
          </div>
        </div>

        {planView === "week" && (
          <WeekTimelineView
            t={t}
            tasks={state.tasks}
            getEventsForDate={getEventsForDate}
            weekStart={weekStart}
            onSelectDay={(date) => { setViewDate(date); setPlanView("day"); }}
            todayStr={todayStr}
            settings={settings}
            onMoveTask={(taskId, date, time) => dispatch({ type: "UPDATE_TASK", payload: { id: taskId, scheduledDate: date, scheduledTime: time } })}
            onMoveSubtask={(parentId, subId, date, time) => dispatch({ type: "UPDATE_SUBTASK", payload: { taskId: parentId, subtaskId: subId, scheduledDate: date, scheduledTime: time } })}
            onCompleteTask={(id) => dispatch({ type: "COMPLETE_TASK", payload: id })}
            onToggleSubtask={(taskId, subtaskId) => dispatch({ type: "TOGGLE_SUBTASK", payload: { taskId, subtaskId } })}
            onStartTask={(task) => setCountdownTask(task)}
            countdownStartEnabled={settings.gamification?.countdownStartEnabled !== false}
            energyLevel={state.energyLevel}
          />
        )}

        {planView === "month" && (
          <MonthPlanView
            t={t}
            tasks={state.tasks}
            getEventsForDate={getEventsForDate}
            monthStart={monthStart}
            onSelectDay={(date) => { setViewDate(date); setPlanView("day"); }}
            todayStr={todayStr}
          />
        )}

        {planView === "day" && (
          <>
            {isToday && (
              <div className="mb-3">
                <QuickAddTask t={t} onAdd={handleQuickAdd} />
              </div>
            )}

            <UnifiedDayTimeline
              t={t}
              events={viewEvents}
              tasks={topTasksSliced}
              settings={settings}
              onCompleteTask={(id) => dispatch({ type: "COMPLETE_TASK", payload: id })}
              onToggleSubtask={(taskId, subtaskId) => dispatch({ type: "TOGGLE_SUBTASK", payload: { taskId, subtaskId } })}
              isTaskOverdue={isTaskOverdue}
              onEditTask={(id, text) => dispatch({ type: "UPDATE_TASK", payload: { id, text } })}
              onEditSubtask={(taskId, subtaskId, text) => dispatch({ type: "UPDATE_SUBTASK", payload: { taskId, subtaskId, text } })}
              onUpdateScheduledTime={(id, time) => dispatch({ type: "UPDATE_TASK", payload: { id, scheduledTime: time, scheduledDate: viewDate } })}
              onUpdateSubtaskScheduledTime={(taskId, subtaskId, time) => dispatch({ type: "UPDATE_SUBTASK", payload: { taskId, subtaskId, scheduledTime: time, scheduledDate: viewDate } })}
              onRescheduleNextDay={handleRescheduleNextDay}
              isToday={isToday}
              isPastDay={isPast}
              gridInterval={gridInterval}
              viewDate={viewDate}
              removedBreaks={removedBreaks}
              onToggleBreakRemoved={handleToggleBreakRemoved}
              breakTimeOverrides={breakTimeOverrides}
              onUpdateBreakTime={handleUpdateBreakTime}
              timeTrackingBreaks={viewDayTTBreaks}
              onPushDownTask={(id, time, parentId) => {
                if (parentId) {
                  dispatch({ type: "UPDATE_SUBTASK", payload: { taskId: parentId, subtaskId: id, scheduledTime: time, scheduledDate: todayStr } });
                } else {
                  dispatch({ type: "UPDATE_TASK", payload: { id, scheduledTime: time, scheduledDate: todayStr } });
                }
              }}
              onStartTask={(task) => setCountdownTask(task)}
              countdownStartEnabled={settings.gamification?.countdownStartEnabled !== false}
              showFullDay={timelineShowFullDay}
              hideParentWithSubtasks={settings.timeline?.hideParentWithSubtasks === true}
              energyLevel={state.energyLevel}
            />
            {hiddenTaskCount > 0 && (
              <p className="text-[11px] text-muted-light dark:text-muted-dark text-center mt-2">
                +{hiddenTaskCount} {t("home.moreTasksHidden")}
              </p>
            )}
          </>
        )}
      </div>

      {countdownTask && (
        <CountdownStart
          taskId={countdownTask.id}
          taskText={countdownTask.text}
          estimatedMinutes={countdownTask.estimatedMinutes || 25}
          onClose={() => setCountdownTask(null)}
        />
      )}
    </div>
  );
}
