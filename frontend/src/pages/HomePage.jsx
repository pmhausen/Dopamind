import { useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import { useApp } from "../context/AppContext";
import { useCalendar } from "../context/CalendarContext";
import { useTimeTracking } from "../context/TimeTrackingContext";
import { useSettings } from "../context/SettingsContext";
import {
  CheckCircle, Calendar, Plus,
  LogIn, LogOut, Coffee, AlertCircle, Clock, ChevronLeft, ChevronRight, Pencil, X, GripVertical, CalendarPlus,
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

function UnifiedDayTimeline({ t, events, tasks, settings, onCompleteTask, onToggleSubtask, isTaskOverdue, onEditTask, onEditSubtask, onUpdateScheduledTime, onUpdateSubtaskScheduledTime, onRescheduleNextDay, isToday, isPastDay, gridInterval }) {
  const workStartH = parseInt(settings.workSchedule.start.split(":")[0], 10);
  const workStartM = parseInt(settings.workSchedule.start.split(":")[1] || "0", 10);
  const workEndH = parseInt(settings.workSchedule.end.split(":")[0], 10);
  const workEndM = parseInt(settings.workSchedule.end.split(":")[1] || "0", 10);
  const breakMin = settings.workSchedule.breakMinutes;
  const timeTrackingEnabled = settings.features?.timeTrackingEnabled !== false;
  const now = new Date();
  const nowH = now.getHours();
  const nowM = now.getMinutes();
  const STEP = gridInterval || 30;
  const ROW_HEIGHT = STEP === 15 ? 32 : STEP === 30 ? 40 : 52;

  const DAY_START = timeTrackingEnabled ? 0 : 6 * 60;
  const DAY_END = timeTrackingEnabled ? 24 * 60 : 22 * 60;

  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingSubtaskParent, setEditingSubtaskParent] = useState(null);
  const [editText, setEditText] = useState("");
  const [dragKey, setDragKey] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);

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
  const isNonWorkTime = (minFromMidnight) => timeTrackingEnabled && (minFromMidnight < workStart || minFromMidnight >= workEnd);
  const fmtTime = (totalMin) => {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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

  // 2. Break
  if (breakMin > 0) {
    const midMin = Math.floor((workStart + workEnd) / 2);
    let breakStart = midMin;
    for (let offset = 0; offset < (workEnd - workStart) / 2; offset += STEP) {
      if (isRangeFree(midMin - offset, midMin - offset + breakMin)) { breakStart = midMin - offset; break; }
      if (isRangeFree(midMin + offset, midMin + offset + breakMin)) { breakStart = midMin + offset; break; }
    }
    entries.push({ key: "break", type: "break", startMin: breakStart, durationMin: breakMin, label: `${breakMin}${t("common.min")} ${t("timeTracking.break")}` });
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
    const subtasks = (task.subtasks || []).filter((s) => !s.completed);
    if (subtasks.length > 0) {
      let cursor = desiredStart;
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
      const parentDur = STEP;
      const parentStart = findFreeStart(cursor, parentDur);
      entries.push({ key: `task-${task.id}`, type: "task-parent", startMin: parentStart, durationMin: parentDur, label: task.text, task, priority: task.priority, overdue: isTaskOverdue(task), scheduled: !!task.scheduledTime, subtaskCount: subtasks.length });
      claimRange(parentStart, parentStart + parentDur);
    } else {
      const dur = Math.max(STEP, task.estimatedMinutes || 25);
      const actualStart = findFreeStart(desiredStart, dur);
      entries.push({ key: `task-${task.id}`, type: "task", startMin: actualStart, durationMin: dur, label: task.text, task, priority: task.priority, overdue: isTaskOverdue(task), scheduled: !!task.scheduledTime });
      claimRange(actualStart, actualStart + dur);
    }
  };

  for (const task of scheduledTasks) {
    const [th, tm] = task.scheduledTime.split(":").map(Number);
    placeTask(task, toMin(th, tm || 0));
  }
  let nextFree = workStart;
  for (const task of unscheduledTasks) {
    placeTask(task, nextFree);
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

  // --- Build grid rows ---
  const gridSlots = [];
  for (let min = DAY_START; min < DAY_END; min += STEP) {
    gridSlots.push(min);
  }

  // Map entries to grid slots they occupy
  const entryMap = new Map(); // slotMin -> [entries]
  for (const entry of entries) {
    const slotStart = Math.floor(entry.startMin / STEP) * STEP;
    if (!entryMap.has(slotStart)) entryMap.set(slotStart, []);
    entryMap.get(slotStart).push(entry);
  }

  // --- Drag handlers ---
  const handleDragStart = (e, key) => {
    setDragKey(key);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", key);
  };
  const handleDragOver = (e, slotMin) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverSlot(slotMin); };
  const handleDragLeave = () => setDragOverSlot(null);
  const handleDrop = (e, targetSlotMin) => {
    e.preventDefault();
    setDragOverSlot(null);
    if (!dragKey) { setDragKey(null); return; }
    const srcEntry = entries.find((en) => en.key === dragKey);
    const newTime = fmtTime(targetSlotMin);
    if (srcEntry?.type === "subtask" && srcEntry.parentTask && srcEntry.subtask) {
      onUpdateSubtaskScheduledTime(srcEntry.parentTask.id, srcEntry.subtask.id, newTime);
    } else if (srcEntry?.type === "task-parent" && srcEntry.task) {
      const subtaskEntries = entries.filter((en) => en.type === "subtask" && en.parentTask?.id === srcEntry.task.id);
      if (subtaskEntries.length > 0) {
        const latestSubEnd = Math.max(...subtaskEntries.map((se) => se.startMin + se.durationMin));
        if (targetSlotMin < latestSubEnd) { setDragKey(null); return; }
      }
      onUpdateScheduledTime(srcEntry.task.id, newTime);
    } else if (srcEntry?.task) {
      onUpdateScheduledTime(srcEntry.task.id, newTime);
    }
    setDragKey(null);
  };
  const handleDragEnd = () => { setDragKey(null); setDragOverSlot(null); };
  const isDraggable = (entry) => !isPastDay && (entry.type === "task" || entry.type === "task-parent" || entry.type === "subtask" || entry.type === "break");

  // --- Render ---
  const nowLineSlot = Math.floor(nowTotal / STEP) * STEP;

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

      {/* Grid-based timeline */}
      <div className="relative">
        {gridSlots.map((slotMin) => {
          const slotEnd = slotMin + STEP;
          const isPastSlot = isPastDay || (isToday && slotEnd <= nowTotal);
          const nonWork = isNonWorkTime(slotMin);
          const slotEntries = entryMap.get(slotMin) || [];
          const dragOver = dragOverSlot === slotMin && dragKey;
          const isNowSlot = isToday && slotMin <= nowTotal && nowTotal < slotEnd;

          // Req 4: In the past, hide empty grid rows (only show rows with completed tasks or events)
          if (isPastSlot && isToday && slotEntries.length === 0) return null;
          // Also hide past slots with only pushed-down entries (they moved away)
          const realEntries = slotEntries.filter((e) => !e.pushedDown);
          if (isPastSlot && isToday && realEntries.length === 0) return null;

          return (
            <div key={slotMin} className="relative">
              {/* "Now" line — full-width colored line */}
              {isNowSlot && (
                <div
                  className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                  style={{ top: `${Math.round(((nowTotal - slotMin) / STEP) * 100)}%` }}
                >
                  <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 flex-shrink-0" />
                  <div className="flex-1 h-[2px] bg-red-500" />
                </div>
              )}

              <div
                onDragOver={(e) => handleDragOver(e, slotMin)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, slotMin)}
                style={{ minHeight: `${ROW_HEIGHT}px` }}
                className={`flex items-stretch gap-2 border-t transition-all
                  ${nonWork ? "bg-gray-50/50 dark:bg-white/[0.015] border-gray-100 dark:border-white/[0.03]" : "border-gray-200 dark:border-white/5"}
                  ${dragOver ? "ring-2 ring-accent/40 bg-accent/5 rounded" : ""}
                  ${isPastSlot ? "opacity-60" : ""}
                `}
              >
                {/* Time label */}
                <span className={`w-14 text-[11px] font-mono flex-shrink-0 pt-1 text-right pr-2 select-none
                  ${isNowSlot ? "text-red-500 font-bold" : nonWork ? "text-gray-300 dark:text-gray-600" : "text-gray-400 dark:text-gray-500"}
                `}>
                  {fmtTime(slotMin)}
                </span>

                {/* Entry content or empty drop zone */}
                <div className="flex-1 min-h-full py-0.5 flex flex-col gap-0.5">
                  {slotEntries.length === 0 && (
                    <div className="flex-1" />
                  )}
                  {slotEntries.map((entry) => {
                    const isEditing = editingTaskId === (entry.task?.id || entry.subtask?.id);
                    const dragging = dragKey === entry.key;
                    const isTask = entry.type === "task" || entry.type === "task-parent";
                    const isSubtask = entry.type === "subtask";
                    const isParentSummary = entry.type === "task-parent";
                    const spanSlots = Math.max(1, Math.ceil(entry.durationMin / STEP));
                    const entryHeight = spanSlots * ROW_HEIGHT - 4;

                    // Can this entry be rescheduled to next day?
                    const todayDate = new Date().toISOString().slice(0, 10);
                    const canReschedule = entry.pushedDown && (isTask || isSubtask) && entry.task &&
                      (!entry.task.deadline || entry.task.deadline >= todayDate);

                    return (
                      <div
                        key={entry.key}
                        draggable={isDraggable(entry) && !isEditing}
                        onDragStart={(e) => handleDragStart(e, entry.key)}
                        onDragEnd={handleDragEnd}
                        style={{ minHeight: `${entryHeight}px` }}
                        className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs group transition-all
                          ${dragging ? "opacity-50 scale-[0.97]" : ""}
                          ${isSubtask ? "ml-4" : ""}
                          ${entry.type === "event" ? "bg-accent/10 text-accent font-medium border-l-2 border-accent" : ""}
                          ${isParentSummary ? "bg-gray-200 dark:bg-white/10 border border-dashed border-gray-300 dark:border-white/20 text-muted-light dark:text-muted-dark italic" : ""}
                          ${isSubtask && !entry.overdue ? "bg-gray-50 dark:bg-white/[0.03] border-l-2 border-accent/30" : ""}
                          ${isSubtask && entry.overdue ? "bg-danger/5 text-danger border-l-2 border-danger/30" : ""}
                          ${isTask && !isParentSummary && entry.overdue ? "bg-danger/10 text-danger border-l-2 border-danger" : ""}
                          ${isTask && !isParentSummary && !entry.overdue ? "bg-gray-100 dark:bg-white/5 border-l-2 border-gray-300 dark:border-white/15" : ""}
                          ${entry.type === "break" ? "bg-warn/10 text-amber-700 dark:text-warn border-l-2 border-warn" : ""}
                          ${entry.pushedDown ? "border-dashed !border-l-2 !border-orange-400 bg-orange-50 dark:bg-orange-900/10" : ""}
                        `}
                      >
                        {/* Drag handle */}
                        {isDraggable(entry) && !isPastSlot && (
                          <span className="w-3 flex-shrink-0 opacity-0 group-hover:opacity-40 cursor-grab active:cursor-grabbing transition-opacity">
                            <GripVertical className="w-3 h-3 text-muted-light dark:text-muted-dark" />
                          </span>
                        )}

                        {/* Icons */}
                        {entry.type === "event" && <Calendar className="w-3 h-3 flex-shrink-0" />}
                        {isTask && entry.overdue && <AlertCircle className="w-3 h-3 flex-shrink-0" />}
                        {isTask && entry.scheduled && !entry.overdue && <Clock className="w-3 h-3 flex-shrink-0 text-accent" />}
                        {isSubtask && <span className="w-1.5 h-1.5 rounded-full bg-accent/40 flex-shrink-0" />}
                        {isParentSummary && <CheckCircle className="w-3 h-3 flex-shrink-0 opacity-50" />}
                        {entry.type === "break" && <Coffee className="w-3 h-3 flex-shrink-0" />}

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
                          <span className="flex-1 truncate">
                            {entry.label}
                            {isParentSummary && entry.subtaskCount > 0 && <span className="ml-1 text-[10px] font-mono opacity-50">({entry.subtaskCount} ↑)</span>}
                            {(isTask || isSubtask) && entry.durationMin > 0 && <span className="ml-1 text-[10px] font-mono opacity-50">~{entry.durationMin}{t("common.min")}</span>}
                          </span>
                        )}

                        {/* Priority dot */}
                        {(isTask || isSubtask) && entry.priority && !isEditing && (
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${entry.priority === "high" ? "bg-danger" : entry.priority === "medium" ? "bg-warn" : "bg-success"}`} />
                        )}

                        {/* Subtask parent badge */}
                        {isSubtask && entry.parentTask && (
                          <span className="hidden sm:inline text-[9px] text-muted-light dark:text-muted-dark truncate max-w-[80px]" title={entry.parentTask.text}>
                            ← {entry.parentTask.text}
                          </span>
                        )}

                        {/* Reschedule to next day button (Req 3) */}
                        {canReschedule && !isEditing && (
                          <button
                            onClick={() => onRescheduleNextDay(entry.task.id)}
                            className="flex-shrink-0 px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-[10px] font-medium hover:bg-orange-200 dark:hover:bg-orange-800/40 transition-colors"
                            title={t("home.rescheduleNextDay")}
                          >
                            <CalendarPlus className="w-3 h-3 inline -mt-0.5" /> {t("home.rescheduleNextDay")}
                          </button>
                        )}

                        {/* Task action buttons */}
                        {isTask && entry.task && !isPastSlot && !isEditing && (
                          <>
                            <button onClick={() => onCompleteTask(entry.task.id)}
                              className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 flex-shrink-0 hover:border-accent hover:bg-accent/10 transition-colors flex items-center justify-center"
                              title={t("tasks.complete")} aria-label={t("tasks.complete")}>
                              <CheckCircle className="w-3 h-3 text-accent" />
                            </button>
                            <button onClick={() => { setEditingTaskId(entry.task.id); setEditText(entry.task.text); }}
                              className="w-5 h-5 rounded hover:bg-gray-100 dark:hover:bg-white/5 flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                              title={t("common.edit")} aria-label={t("common.edit")}>
                              <Pencil className="w-2.5 h-2.5 text-muted-light dark:text-muted-dark" />
                            </button>
                          </>
                        )}
                        {isTask && !isPastSlot && isEditing && (
                          <button onClick={() => setEditingTaskId(null)}
                            className="w-5 h-5 rounded hover:bg-gray-100 dark:hover:bg-white/5 flex-shrink-0 flex items-center justify-center"
                            title={t("common.cancel")} aria-label={t("common.cancel")}>
                            <X className="w-2.5 h-2.5 text-muted-light dark:text-muted-dark" />
                          </button>
                        )}

                        {/* Subtask action buttons */}
                        {isSubtask && entry.subtask && entry.parentTask && !isPastSlot && !isEditing && (
                          <>
                            <button onClick={() => onToggleSubtask(entry.parentTask.id, entry.subtask.id)}
                              className={`w-5 h-5 rounded border-2 flex-shrink-0 transition-colors flex items-center justify-center ${
                                entry.subtask.completed ? "border-success bg-success/10" : "border-gray-300 dark:border-gray-600 hover:border-accent hover:bg-accent/10"
                              }`}
                              title={entry.subtask.completed ? t("tasks.reopen") : t("tasks.complete")}>
                              <CheckCircle className={`w-3 h-3 ${entry.subtask.completed ? "text-success" : "text-accent"}`} />
                            </button>
                            <button onClick={() => { setEditingTaskId(entry.subtask.id); setEditingSubtaskParent(entry.parentTask.id); setEditText(entry.subtask.text); }}
                              className="w-5 h-5 rounded hover:bg-gray-100 dark:hover:bg-white/5 flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                              title={t("common.edit")} aria-label={t("common.edit")}>
                              <Pencil className="w-2.5 h-2.5 text-muted-light dark:text-muted-dark" />
                            </button>
                          </>
                        )}
                        {isSubtask && !isPastSlot && isEditing && (
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
        })}
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
        const d = new Date(tk.completedAt);
        const completedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return completedDate === viewDate;
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
    // Today: show pending tasks not scheduled for a future date
    dayTasks = pendingTasks.filter((tk) => {
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
  const gridInterval = settings.timeline?.gridInterval || 30;
  const { updateSettings } = useSettings();

  const handleRescheduleNextDay = (taskId) => {
    const tomorrow = shiftDate(todayStr, +1);
    dispatch({ type: "UPDATE_TASK", payload: { id: taskId, scheduledDate: tomorrow } });
  };

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
            {/* Grid interval selector */}
            <div className="flex items-center gap-0.5 ml-2 bg-gray-100 dark:bg-white/5 rounded-lg p-0.5">
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
            </div>
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
          onToggleSubtask={(taskId, subtaskId) => dispatch({ type: "TOGGLE_SUBTASK", payload: { taskId, subtaskId } })}
          isTaskOverdue={isTaskOverdue}
          onEditTask={(id, text) => dispatch({ type: "UPDATE_TASK", payload: { id, text } })}
          onEditSubtask={(taskId, subtaskId, text) => dispatch({ type: "UPDATE_SUBTASK", payload: { taskId, subtaskId, text } })}
          onUpdateScheduledTime={(id, time) => dispatch({ type: "UPDATE_TASK", payload: { id, scheduledTime: time } })}
          onUpdateSubtaskScheduledTime={(taskId, subtaskId, time) => dispatch({ type: "UPDATE_SUBTASK", payload: { taskId, subtaskId, scheduledTime: time } })}
          onRescheduleNextDay={handleRescheduleNextDay}
          isToday={isToday}
          isPastDay={isPast}
          gridInterval={gridInterval}
        />
      </div>
    </div>
  );
}
