import { useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import { useApp } from "../context/AppContext";
import { useCalendar } from "../context/CalendarContext";
import { useTimeTracking } from "../context/TimeTrackingContext";
import { useSettings } from "../context/SettingsContext";
import {
  CheckCircle, Calendar, Plus,
  LogIn, LogOut, Coffee, AlertCircle, Clock, ChevronLeft, ChevronRight, Pencil, X,
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

function UnifiedDayTimeline({ t, events, tasks, settings, onCompleteTask, isTaskOverdue, onEditTask, isToday, isPastDay }) {
  const startH = parseInt(settings.workSchedule.start.split(":")[0], 10);
  const endH = parseInt(settings.workSchedule.end.split(":")[0], 10);
  const breakMin = settings.workSchedule.breakMinutes;
  const now = new Date();
  const nowH = now.getHours();

  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editText, setEditText] = useState("");

  const handleEditSave = (taskId) => {
    if (editText.trim()) {
      onEditTask(taskId, editText.trim());
    }
    setEditingTaskId(null);
  };

  // Build hourly slots with proper calendar event blocking
  const slots = [];
  for (let h = startH; h < endH; h++) {
    const timeStr = `${String(h).padStart(2, "0")}:00`;
    const event = events.find((ev) => {
      if (ev.allDay) return false;
      if (!ev.start) return false;
      // Handle both "HH:MM" time strings and full ISO datetime strings
      let evStartH, evEndH;
      if (ev.start.length <= 5) {
        evStartH = parseInt(ev.start.split(":")[0], 10);
        evEndH = ev.end ? parseInt(ev.end.split(":")[0], 10) : evStartH + 1;
      } else {
        const startDate = new Date(ev.start);
        const endDate = ev.end ? new Date(ev.end) : null;
        evStartH = startDate.getHours();
        evEndH = endDate ? endDate.getHours() : evStartH + 1;
      }
      // If end minute > 0, the event still occupies that hour
      if (ev.end) {
        const endMin = ev.end.length <= 5
          ? parseInt(ev.end.split(":")[1] || "0", 10)
          : new Date(ev.end).getMinutes();
        if (endMin > 0) evEndH += 1;
      }
      return h >= evStartH && h < evEndH;
    });
    if (event) {
      // Show the event's actual time range in the label
      const timeRange = event.start && event.end ? `${event.start}–${event.end}` : "";
      slots.push({ time: timeStr, hour: h, type: "event", label: event.title || event.summary, eventTime: timeRange });
    } else {
      slots.push({ time: timeStr, hour: h, type: "free" });
    }
  }

  // Fill free slots with pending tasks, respecting creation time for today
  const pendingTasks = [...tasks];
  for (const slot of slots) {
    if (slot.type === "free" && pendingTasks.length > 0) {
      if (isToday) {
        // Only schedule a task in a slot at or after the task's creation hour
        const idx = pendingTasks.findIndex((task) => {
          if (!task.createdAt) return true;
          const createdHour = new Date(task.createdAt).getHours();
          return createdHour <= slot.hour;
        });
        if (idx >= 0) {
          const [task] = pendingTasks.splice(idx, 1);
          slot.type = "task";
          slot.task = task;
          slot.label = task.text;
          slot.priority = task.priority;
          slot.overdue = isTaskOverdue(task);
        }
      } else {
        const task = pendingTasks.shift();
        slot.type = "task";
        slot.task = task;
        slot.label = task.text;
        slot.priority = task.priority;
        slot.overdue = isTaskOverdue(task);
      }
    }
  }

  // Insert break in the middle
  if (breakMin > 0 && slots.length > 2) {
    const midIdx = Math.floor(slots.length / 2);
    slots.splice(midIdx, 0, {
      time: slots[midIdx]?.time,
      hour: slots[midIdx]?.hour,
      type: "break",
      label: `${breakMin}${t("common.min")} ${t("timeTracking.break")}`,
    });
  }

  return (
    <div className="space-y-1">
      {slots.map((slot, i) => {
        const isPast = isPastDay || (isToday && slot.hour !== undefined && slot.hour < nowH);
        const isCurrent = isToday && slot.hour !== undefined && slot.hour === nowH;
        const isEditing = editingTaskId === slot.task?.id;

        return (
          <div
            key={i}
            className={`flex items-center gap-3 group transition-opacity ${isPast ? "opacity-40" : ""}`}
          >
            {/* Time column */}
            <span className={`w-12 text-[11px] font-mono flex-shrink-0 ${isCurrent ? "text-accent font-bold" : "text-muted-light dark:text-muted-dark"}`}>
              {slot.time}
              {isCurrent && <span className="ml-0.5 text-accent">◀</span>}
            </span>

            {/* Slot content */}
            <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
              slot.type === "event"
                ? "bg-accent/10 text-accent font-medium"
                : slot.type === "task"
                ? slot.overdue
                  ? "bg-danger/10 text-danger"
                  : "bg-gray-100 dark:bg-white/5"
                : slot.type === "break"
                ? "bg-warn/10 text-amber-700 dark:text-warn"
                : "bg-gray-50 dark:bg-white/[0.02] text-muted-light dark:text-muted-dark"
            }`}>
              {slot.type === "event" && <Calendar className="w-3 h-3 flex-shrink-0" />}
              {slot.type === "task" && slot.overdue && <AlertCircle className="w-3 h-3 flex-shrink-0" />}
              {slot.type === "break" && <Coffee className="w-3 h-3 flex-shrink-0" />}
              {slot.type === "free" && <Clock className="w-3 h-3 flex-shrink-0 opacity-30" />}

              {isEditing ? (
                <input
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={() => handleEditSave(slot.task.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleEditSave(slot.task.id);
                    if (e.key === "Escape") setEditingTaskId(null);
                  }}
                  className="flex-1 bg-transparent outline-none border-b border-accent min-w-0"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="flex-1 truncate">
                  {slot.label || t(`home.${slot.type === "free" ? "freeSlot" : "taskSlot"}`)}
                </span>
              )}

              {slot.type === "task" && slot.priority && !isEditing && (
                <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  slot.priority === "high" ? "bg-danger" : slot.priority === "medium" ? "bg-warn" : "bg-success"
                }`} />
              )}
            </div>

            {/* Task action buttons */}
            {slot.type === "task" && slot.task && !isPast && !isEditing && (
              <>
                <button
                  onClick={() => onCompleteTask(slot.task.id)}
                  className="w-6 h-6 rounded-md border-2 border-gray-300 dark:border-gray-600 flex-shrink-0 hover:border-accent hover:bg-accent/10 transition-colors flex items-center justify-center"
                  title={t("tasks.complete")}
                  aria-label={t("tasks.complete")}
                >
                  <CheckCircle className="w-3.5 h-3.5 text-accent" />
                </button>
                <button
                  onClick={() => { setEditingTaskId(slot.task.id); setEditText(slot.task.text); }}
                  className="w-6 h-6 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                  title={t("common.edit")}
                  aria-label={t("common.edit")}
                >
                  <Pencil className="w-3 h-3 text-muted-light dark:text-muted-dark" />
                </button>
              </>
            )}
            {slot.type === "task" && slot.task && !isPast && isEditing && (
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
  const topTasks = isPast
    ? []
    : [...pendingTasks]
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
          isToday={isToday}
          isPastDay={isPast}
        />
      </div>
    </div>
  );
}
