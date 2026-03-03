import { useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import { useApp } from "../context/AppContext";
import { useCalendar } from "../context/CalendarContext";
import { useTimeTracking } from "../context/TimeTrackingContext";
import { useSettings } from "../context/SettingsContext";
import {
  CheckCircle, Calendar, Plus,
  LogIn, LogOut, Coffee, AlertCircle, Clock, ChevronLeft, ChevronRight, Pencil, X, GripVertical,
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

function UnifiedDayTimeline({ t, events, tasks, settings, onCompleteTask, isTaskOverdue, onEditTask, onUpdateScheduledTime, onUpdateSubtaskScheduledTime, isToday, isPastDay }) {
  const startH = parseInt(settings.workSchedule.start.split(":")[0], 10);
  const startM = parseInt(settings.workSchedule.start.split(":")[1] || "0", 10);
  const endH = parseInt(settings.workSchedule.end.split(":")[0], 10);
  const endM = parseInt(settings.workSchedule.end.split(":")[1] || "0", 10);
  const breakMin = settings.workSchedule.breakMinutes;
  const now = new Date();
  const nowH = now.getHours();
  const nowM = now.getMinutes();
  const STEP = 15; // 15-minute granularity
  const PX_PER_MIN = 2.5; // pixels per minute — makes durations visually proportional

  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editText, setEditText] = useState("");
  const [dragKey, setDragKey] = useState(null);
  const [dragOverKey, setDragOverKey] = useState(null);

  const handleEditSave = (taskId) => {
    if (editText.trim()) {
      onEditTask(taskId, editText.trim());
    }
    setEditingTaskId(null);
  };

  // Helper: convert hour+min to total minutes from midnight
  const toMin = (h, m) => h * 60 + m;
  const startTotal = toMin(startH, startM);
  const endTotal = toMin(endH, endM);
  const totalSlotCount = Math.floor((endTotal - startTotal) / STEP);

  // Helper: format minute offset as HH:MM
  const fmtTime = (totalMin) => {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const isTimeOnly = (s) => /^\d{1,2}:\d{2}$/.test(s);
  const nowTotal = toMin(nowH, nowM);

  // --- Build a flat list of timeline entries (not grid slots) ---
  // Each entry: { key, type, startMin, durationMin, label, ... }
  const entries = [];
  let usedRanges = []; // track occupied minute ranges

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
      } else {
        evEndMin = evStartMin + 60;
      }
    } else {
      const sd = new Date(ev.start);
      if (isNaN(sd)) continue;
      evStartMin = toMin(sd.getHours(), sd.getMinutes());
      const ed = ev.end ? new Date(ev.end) : null;
      evEndMin = ed && !isNaN(ed) ? toMin(ed.getHours(), ed.getMinutes()) : evStartMin + 60;
    }
    const dur = Math.max(STEP, evEndMin - evStartMin);
    entries.push({
      key: `ev-${ev.id || ev.title}-${evStartMin}`,
      type: "event",
      startMin: evStartMin,
      durationMin: dur,
      label: ev.title || ev.summary,
    });
    claimRange(evStartMin, evStartMin + dur);
  }

  // 2. Break — placed around midday, duration-aware
  if (breakMin > 0) {
    const midMin = Math.floor((startTotal + endTotal) / 2);
    let breakStart = midMin;
    // Find a free spot near the middle
    for (let offset = 0; offset < (endTotal - startTotal) / 2; offset += STEP) {
      if (isRangeFree(midMin - offset, midMin - offset + breakMin)) { breakStart = midMin - offset; break; }
      if (isRangeFree(midMin + offset, midMin + offset + breakMin)) { breakStart = midMin + offset; break; }
    }
    entries.push({
      key: "break",
      type: "break",
      startMin: breakStart,
      durationMin: breakMin,
      label: `${breakMin}${t("common.min")} ${t("timeTracking.break")}`,
    });
    claimRange(breakStart, breakStart + breakMin);
  }

  // 3. Tasks — expand subtasks into individual entries
  // For tasks with subtasks: place each subtask individually, then the parent as a compact summary AFTER.
  // For tasks without subtasks: place normally.
  const scheduledTasks = tasks.filter((tk) => tk.scheduledTime);
  const unscheduledTasks = tasks.filter((tk) => !tk.scheduledTime);

  const findFreeStart = (desiredStart, dur) => {
    let s = Math.max(startTotal, desiredStart);
    while (s + dur <= endTotal) {
      if (isRangeFree(s, s + dur)) return s;
      s += STEP;
    }
    return s; // fallback even if overflows
  };

  const placeTask = (task, desiredStart) => {
    const subtasks = (task.subtasks || []).filter((s) => !s.completed);
    const hasSubtasks = subtasks.length > 0;

    if (hasSubtasks) {
      // Place each subtask as its own entry
      let cursor = desiredStart;
      for (const sub of subtasks) {
        const subDur = Math.max(STEP, sub.estimatedMinutes ?? STEP);
        // Subtask may have its own scheduledTime
        let subStart;
        if (sub.scheduledTime) {
          const [sh, sm] = sub.scheduledTime.split(":").map(Number);
          subStart = findFreeStart(toMin(sh, sm || 0), subDur);
        } else {
          subStart = findFreeStart(cursor, subDur);
        }
        entries.push({
          key: `sub-${task.id}-${sub.id}`,
          type: "subtask",
          startMin: subStart,
          durationMin: subDur,
          label: sub.text,
          parentTask: task,
          subtask: sub,
          priority: task.priority,
          overdue: isTaskOverdue(task),
        });
        claimRange(subStart, subStart + subDur);
        cursor = subStart + subDur;
      }
      // Place the parent task as a compact summary AFTER all subtasks
      const parentDur = STEP; // compact — just a marker
      const parentStart = findFreeStart(cursor, parentDur);
      entries.push({
        key: `task-${task.id}`,
        type: "task-parent",
        startMin: parentStart,
        durationMin: parentDur,
        label: task.text,
        task,
        priority: task.priority,
        overdue: isTaskOverdue(task),
        scheduled: !!task.scheduledTime,
        subtaskCount: subtasks.length,
      });
      claimRange(parentStart, parentStart + parentDur);
    } else {
      // Simple task, no subtasks
      const dur = Math.max(STEP, task.estimatedMinutes || 25);
      const actualStart = findFreeStart(desiredStart, dur);
      entries.push({
        key: `task-${task.id}`,
        type: "task",
        startMin: actualStart,
        durationMin: dur,
        label: task.text,
        task,
        priority: task.priority,
        overdue: isTaskOverdue(task),
        scheduled: !!task.scheduledTime,
      });
      claimRange(actualStart, actualStart + dur);
    }
  };

  // Place scheduled tasks first
  for (const task of scheduledTasks) {
    const [th, tm] = task.scheduledTime.split(":").map(Number);
    const taskStartMin = toMin(th, tm || 0);
    if (isToday && taskStartMin > nowTotal) continue;
    placeTask(task, taskStartMin);
  }

  // Place unscheduled tasks in remaining free time
  let nextFree = startTotal;
  for (const task of unscheduledTasks) {
    placeTask(task, nextFree);
    // Advance nextFree past the entries we just placed
    const justPlaced = entries.filter((e) => e.key === `task-${task.id}` || e.key.startsWith(`sub-${task.id}-`));
    if (justPlaced.length > 0) {
      nextFree = Math.max(...justPlaced.map((e) => e.startMin + e.durationMin));
    }
  }

  // --- Sort entries and insert free-time gap entries between occupied ranges ---
  // Gaps are visual spacers without any label (requirement: show free time, but no "Frei" text).
  entries.sort((a, b) => a.startMin - b.startMin);
  const finalEntries = [];
  let cursor = startTotal;
  for (const entry of entries) {
    if (entry.startMin > cursor) {
      const gapDur = entry.startMin - cursor;
      if (gapDur >= STEP) {
        finalEntries.push({
          key: `free-${cursor}`,
          type: "free",
          startMin: cursor,
          durationMin: gapDur,
          label: "",
        });
      }
    }
    finalEntries.push(entry);
    cursor = Math.max(cursor, entry.startMin + entry.durationMin);
  }
  // Trailing gap until end of workday
  if (cursor < endTotal) {
    const gapDur = endTotal - cursor;
    if (gapDur >= STEP) {
      finalEntries.push({
        key: `free-${cursor}`,
        type: "free",
        startMin: cursor,
        durationMin: gapDur,
        label: "",
      });
    }
  }

  // --- Drag & drop handlers ---
  const handleDragStart = (e, key) => {
    setDragKey(key);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", key);
  };
  const handleDragOver = (e, key) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverKey(key);
  };
  const handleDragLeave = () => setDragOverKey(null);
  const handleDrop = (e, targetEntry) => {
    e.preventDefault();
    setDragOverKey(null);
    if (!dragKey || dragKey === targetEntry.key) { setDragKey(null); return; }
    const srcEntry = finalEntries.find((en) => en.key === dragKey);
    const newTime = fmtTime(targetEntry.startMin);

    // Handle subtask drag — update subtask scheduledTime
    if (srcEntry?.type === "subtask" && srcEntry.parentTask && srcEntry.subtask) {
      onUpdateSubtaskScheduledTime(srcEntry.parentTask.id, srcEntry.subtask.id, newTime);
      setDragKey(null);
      return;
    }

    // Handle parent task drag — enforce: cannot move before latest subtask
    if (srcEntry?.type === "task-parent" && srcEntry.task) {
      const subtaskEntries = finalEntries.filter((en) => en.type === "subtask" && en.parentTask?.id === srcEntry.task.id);
      if (subtaskEntries.length > 0) {
        const latestSubEnd = Math.max(...subtaskEntries.map((se) => se.startMin + se.durationMin));
        if (targetEntry.startMin < latestSubEnd) {
          // Blocked — cannot place parent before subtasks
          setDragKey(null);
          return;
        }
      }
      onUpdateScheduledTime(srcEntry.task.id, newTime);
      setDragKey(null);
      return;
    }

    if (srcEntry?.task) {
      onUpdateScheduledTime(srcEntry.task.id, newTime);
    }
    setDragKey(null);
  };
  const handleDragEnd = () => { setDragKey(null); setDragOverKey(null); };

  const isDraggable = (entry) => !isPastDay && (entry.type === "task" || entry.type === "task-parent" || entry.type === "subtask" || entry.type === "break");

  return (
    <div className="space-y-0.5">
      {finalEntries.map((entry) => {
        const isPast = isPastDay || (isToday && entry.startMin + entry.durationMin <= nowTotal);
        const isCurrent = isToday && entry.startMin <= nowTotal && nowTotal < entry.startMin + entry.durationMin;
        const isEditing = editingTaskId === (entry.task?.id || entry.subtask?.id);
        const dragging = dragKey === entry.key;
        const dragOver = dragOverKey === entry.key && dragKey !== entry.key;

        // Height proportional to duration
        const heightPx = Math.max(28, Math.round(entry.durationMin * PX_PER_MIN));

        const isTask = entry.type === "task" || entry.type === "task-parent";
        const isSubtask = entry.type === "subtask";
        const isParentSummary = entry.type === "task-parent";
        const isFree = entry.type === "free";

        // Free time gap — just a thin visual spacer with time label, no text
        if (isFree) {
          return (
            <div
              key={entry.key}
              onDragOver={(e) => handleDragOver(e, entry.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, entry)}
              style={{ minHeight: `${heightPx}px` }}
              className={`flex items-start gap-3 transition-all ${dragOver ? "ring-2 ring-accent/40 rounded-lg bg-accent/5" : ""}`}
            >
              <span className="w-4 flex-shrink-0" />
              <span className="w-12 text-[11px] font-mono flex-shrink-0 text-muted-light/40 dark:text-muted-dark/40 pt-1">
                {fmtTime(entry.startMin)}
              </span>
              <div style={{ minHeight: `${Math.max(12, heightPx - 4)}px` }} className="flex-1 border-l border-dashed border-gray-200 dark:border-white/5" />
            </div>
          );
        }

        return (
          <div
            key={entry.key}
            draggable={isDraggable(entry) && !isEditing}
            onDragStart={(e) => handleDragStart(e, entry.key)}
            onDragOver={(e) => handleDragOver(e, entry.key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, entry)}
            onDragEnd={handleDragEnd}
            style={{ minHeight: `${heightPx}px` }}
            className={`flex items-center gap-3 group transition-all ${isPast ? "opacity-40" : ""} ${dragging ? "opacity-50 scale-[0.97]" : ""} ${dragOver ? "ring-2 ring-accent/40 rounded-lg" : ""} ${isSubtask ? "ml-3" : ""}`}
          >
            {/* Drag handle */}
            {isDraggable(entry) && !isPast && (
              <span className="w-4 flex-shrink-0 opacity-0 group-hover:opacity-40 cursor-grab active:cursor-grabbing transition-opacity">
                <GripVertical className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark" />
              </span>
            )}
            {!isDraggable(entry) && <span className="w-4 flex-shrink-0" />}

            {/* Time column */}
            <span className={`w-12 text-[11px] font-mono flex-shrink-0 ${isCurrent ? "text-accent font-bold" : "text-muted-light dark:text-muted-dark"}`}>
              {fmtTime(entry.startMin)}
              {isCurrent && <span className="ml-0.5 text-accent">◀</span>}
            </span>

            {/* Slot content */}
            <div
              style={{ minHeight: `${Math.max(24, heightPx - 4)}px` }}
              className={`flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all ${
                entry.type === "event"
                  ? "bg-accent/10 text-accent font-medium"
                  : isParentSummary
                  ? "bg-gray-200 dark:bg-white/10 border border-dashed border-gray-300 dark:border-white/20 text-muted-light dark:text-muted-dark"
                  : isSubtask
                  ? entry.overdue
                    ? "bg-danger/5 text-danger border-l-2 border-danger/30"
                    : "bg-gray-50 dark:bg-white/[0.03] border-l-2 border-accent/30"
                  : (isTask && entry.overdue)
                  ? "bg-danger/10 text-danger"
                  : isTask
                  ? "bg-gray-100 dark:bg-white/5"
                  : entry.type === "break"
                  ? "bg-warn/10 text-amber-700 dark:text-warn"
                  : ""
              }`}
            >
              {entry.type === "event" && <Calendar className="w-3 h-3 flex-shrink-0" />}
              {isTask && entry.overdue && <AlertCircle className="w-3 h-3 flex-shrink-0" />}
              {isTask && entry.scheduled && !entry.overdue && <Clock className="w-3 h-3 flex-shrink-0 text-accent" />}
              {isSubtask && <span className="w-1.5 h-1.5 rounded-full bg-accent/40 flex-shrink-0" />}
              {isParentSummary && <CheckCircle className="w-3 h-3 flex-shrink-0 opacity-50" />}
              {entry.type === "break" && <Coffee className="w-3 h-3 flex-shrink-0" />}

              {isEditing ? (
                <input
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={() => handleEditSave(entry.task?.id || entry.subtask?.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleEditSave(entry.task?.id || entry.subtask?.id);
                    if (e.key === "Escape") setEditingTaskId(null);
                  }}
                  className="flex-1 bg-transparent outline-none border-b border-accent min-w-0"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className={`flex-1 truncate ${isParentSummary ? "italic" : ""}`}>
                  {entry.label}
                  {isParentSummary && entry.subtaskCount > 0 && (
                    <span className="ml-1 text-[10px] font-mono opacity-50">({entry.subtaskCount} ↑)</span>
                  )}
                  {(isTask || isSubtask) && entry.durationMin > 0 && (
                    <span className="ml-1.5 text-[10px] font-mono opacity-60">~{entry.durationMin}{t("common.min")}</span>
                  )}
                </span>
              )}

              {(isTask || isSubtask) && entry.priority && !isEditing && (
                <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  entry.priority === "high" ? "bg-danger" : entry.priority === "medium" ? "bg-warn" : "bg-success"
                }`} />
              )}
            </div>

            {/* Parent task box shown next to subtask entries */}
            {isSubtask && entry.parentTask && (
              <div className="w-24 flex-shrink-0 px-2 py-1 rounded border border-dashed border-gray-300 dark:border-white/15 bg-gray-100 dark:bg-white/5 text-[10px] text-muted-light dark:text-muted-dark truncate" title={entry.parentTask.text}>
                {entry.parentTask.text}
              </div>
            )}

            {/* Task action buttons */}
            {isTask && entry.task && !isPast && !isEditing && (
              <>
                <button
                  onClick={() => onCompleteTask(entry.task.id)}
                  className="w-6 h-6 rounded-md border-2 border-gray-300 dark:border-gray-600 flex-shrink-0 hover:border-accent hover:bg-accent/10 transition-colors flex items-center justify-center"
                  title={t("tasks.complete")}
                  aria-label={t("tasks.complete")}
                >
                  <CheckCircle className="w-3.5 h-3.5 text-accent" />
                </button>
                <button
                  onClick={() => { setEditingTaskId(entry.task.id); setEditText(entry.task.text); }}
                  className="w-6 h-6 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                  title={t("common.edit")}
                  aria-label={t("common.edit")}
                >
                  <Pencil className="w-3 h-3 text-muted-light dark:text-muted-dark" />
                </button>
              </>
            )}
            {isTask && entry.task && !isPast && isEditing && (
              <button
                onClick={() => setEditingTaskId(null)}
                className="w-6 h-6 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 flex-shrink-0 flex items-center justify-center transition-all"
                title={t("common.cancel")}
                aria-label={t("common.cancel")}
              >
                <X className="w-3 h-3 text-muted-light dark:text-muted-dark" />
              </button>
            )}
          </div>
        );
      })}
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

export default function HomePage() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const { getEventsForDate } = useCalendar();
  const { settings } = useSettings();

  const todayStr = new Date().toISOString().slice(0, 10);
  const [viewDate, setViewDate] = useState(todayStr);
  const isToday = viewDate === todayStr;
  const isPast = viewDate < todayStr;

  const viewEvents = getEventsForDate(viewDate);
  const allDayEvents = viewEvents.filter((ev) => ev.allDay);

  const isTaskOverdue = (task) => task.deadline && !task.completed && new Date(task.deadline + "T23:59:59") < new Date();

  const pendingTasks = state.tasks.filter((tk) => !tk.completed);
  const overdueTasks = pendingTasks.filter(isTaskOverdue);

  // Filter tasks for the day view: exclude tasks whose scheduledDate is in the future
  const dayTasks = isPast
    ? []
    : pendingTasks.filter((tk) => {
        // If task has a scheduledDate and the view date is before that date, hide it
        if (tk.scheduledDate && viewDate < tk.scheduledDate) return false;
        return true;
      });

  const topTasks = [...dayTasks]
        .sort((a, b) => {
          const aOverdue = isTaskOverdue(a) ? 0 : 1;
          const bOverdue = isTaskOverdue(b) ? 0 : 1;
          if (aOverdue !== bOverdue) return aOverdue - bOverdue;
          const p = { high: 0, medium: 1, low: 2 };
          return (p[a.priority] ?? 1) - (p[b.priority] ?? 1);
        })
        .slice(0, MAX_TIMELINE_TASKS);

  const handleQuickAdd = (text) => {
    dispatch({ type: "ADD_TASK", payload: { text, priority: "medium", estimatedMinutes: 25 } });
  };

  const shiftDate = (dateStr, delta) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
  };

  const prevDay = () => setViewDate((cur) => shiftDate(cur, -1));
  const nextDay = () => setViewDate((cur) => shiftDate(cur, +1));

  const formatViewDate = () => {
    if (isToday) return t("common.today");
    if (viewDate === shiftDate(todayStr, +1)) return t("common.tomorrow");
    if (viewDate === shiftDate(todayStr, -1)) return t("common.yesterday");
    const [y, m, d] = viewDate.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const features = settings.features || {};

  return (
    <div className="space-y-5 animate-fade-in">
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

      {/* Unified Day Timeline */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider">{t("home.dayPlan")}</h3>
            <p className="text-[10px] text-muted-light dark:text-muted-dark mt-0.5">{t("home.dayPlanHint")}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={prevDay}
              className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center transition-colors"
              title={t("home.previousDay")}
              aria-label={t("home.previousDay")}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium min-w-[72px] text-center">{formatViewDate()}</span>
            <button
              onClick={nextDay}
              className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center transition-colors"
              title={t("home.nextDay")}
              aria-label={t("home.nextDay")}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {overdueTasks.length > 0 && isToday && (
              <span className="badge bg-danger/10 text-danger text-[10px] flex items-center gap-1 ml-1">
                <AlertCircle className="w-3 h-3" /> {overdueTasks.length} {t("tasks.overdue")}
              </span>
            )}
          </div>
        </div>

        {isToday && (
          <div className="mb-3">
            <QuickAddTask t={t} onAdd={handleQuickAdd} />
          </div>
        )}

        <UnifiedDayTimeline
          t={t}
          events={viewEvents}
          tasks={topTasks}
          settings={settings}
          onCompleteTask={(id) => dispatch({ type: "COMPLETE_TASK", payload: id })}
          isTaskOverdue={isTaskOverdue}
          onEditTask={(id, text) => dispatch({ type: "UPDATE_TASK", payload: { id, text } })}
          onUpdateScheduledTime={(id, time) => dispatch({ type: "UPDATE_TASK", payload: { id, scheduledTime: time } })}
          onUpdateSubtaskScheduledTime={(taskId, subtaskId, time) => dispatch({ type: "UPDATE_SUBTASK", payload: { taskId, subtaskId, scheduledTime: time } })}
          isToday={isToday}
          isPastDay={isPast}
        />
      </div>
    </div>
  );
}
