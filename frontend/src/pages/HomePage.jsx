import { useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import { useApp } from "../context/AppContext";
import { useCalendar } from "../context/CalendarContext";
import { useTimeTracking } from "../context/TimeTrackingContext";
import { useSettings } from "../context/SettingsContext";
import FocusTimer from "../components/FocusTimer";
import {
  CheckCircle, Clock, Calendar, Plus, Play, Pause,
  LogIn, LogOut, Coffee, ArrowRight,
} from "lucide-react";

function QuickCard({ icon: Icon, label, value, accent, unit }) {
  return (
    <div className="glass-card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent || "bg-accent/10"}`}>
        <Icon className={`w-5 h-5 ${accent ? "text-white" : "text-accent"}`} />
      </div>
      <div>
        <p className="text-2xl font-bold font-mono">{value}{unit && <span className="text-sm ml-0.5">{unit}</span>}</p>
        <p className="text-[10px] text-muted-light dark:text-muted-dark uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

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
            <Play className="w-3.5 h-3.5" /> {t("timeTracking.endBreak")}
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

function DayPlan({ t, events, tasks, settings }) {
  const startH = parseInt(settings.workSchedule.start.split(":")[0], 10);
  const endH = parseInt(settings.workSchedule.end.split(":")[0], 10);
  const breakMin = settings.workSchedule.breakMinutes;

  // Build time slots
  const slots = [];
  for (let h = startH; h < endH; h++) {
    const timeStr = `${String(h).padStart(2, "0")}:00`;

    // Check if an event overlaps this hour
    const event = events.find((ev) => {
      if (ev.allDay) return false;
      const evStart = ev.start ? new Date(ev.start) : null;
      const evEnd = ev.end ? new Date(ev.end) : null;
      if (!evStart) return false;
      const evStartH = evStart.getHours();
      const evEndH = evEnd ? evEnd.getHours() : evStartH + 1;
      return h >= evStartH && h < evEndH;
    });

    if (event) {
      slots.push({ time: timeStr, type: "event", label: event.title || event.summary });
    } else {
      slots.push({ time: timeStr, type: "free" });
    }
  }

  // Fill free slots with tasks
  const pendingTasks = [...tasks];
  for (const slot of slots) {
    if (slot.type === "free" && pendingTasks.length > 0) {
      const task = pendingTasks.shift();
      slot.type = "task";
      slot.label = task.text;
      slot.priority = task.priority;
    }
  }

  // Insert break roughly in the middle
  if (breakMin > 0 && slots.length > 2) {
    const midIdx = Math.floor(slots.length / 2);
    slots.splice(midIdx, 0, { time: slots[midIdx]?.time, type: "break", label: `${breakMin}${t("common.min")} ${t("timeTracking.break")}` });
  }

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-1">{t("home.dayPlan")}</h3>
      <p className="text-[10px] text-muted-light dark:text-muted-dark mb-3">{t("home.dayPlanHint")}</p>
      <div className="space-y-1.5">
        {slots.map((slot, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <span className="w-12 text-[11px] font-mono text-muted-light dark:text-muted-dark flex-shrink-0">{slot.time}</span>
            <div className={`flex-1 px-3 py-1.5 rounded-lg text-xs truncate ${
              slot.type === "event" ? "bg-accent/10 text-accent font-medium" :
              slot.type === "task" ? "bg-gray-100 dark:bg-white/5" :
              slot.type === "break" ? "bg-warn/10 text-amber-700 dark:text-warn" :
              "bg-gray-50 dark:bg-white/[0.02] text-muted-light dark:text-muted-dark"
            }`}>
              {slot.label || t(`home.${slot.type === "free" ? "freeSlot" : "taskSlot"}`)}
              {slot.priority && (
                <span className={`ml-2 inline-block w-1.5 h-1.5 rounded-full ${
                  slot.priority === "high" ? "bg-danger" : slot.priority === "medium" ? "bg-warn" : "bg-success"
                }`} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const { getEventsForDate } = useCalendar();
  const { getTodayMinutes } = useTimeTracking();
  const { settings } = useSettings();

  const today = new Date().toISOString().slice(0, 10);
  const todayEvents = getEventsForDate(today);

  const pendingTasks = state.tasks.filter((tk) => !tk.completed);
  const topTasks = [...pendingTasks]
    .sort((a, b) => {
      const p = { high: 0, medium: 1, low: 2 };
      return (p[a.priority] ?? 1) - (p[b.priority] ?? 1);
    })
    .slice(0, 6);

  const handleQuickAdd = (text) => {
    dispatch({ type: "ADD_TASK", payload: { text, priority: "medium", estimatedMinutes: 25 } });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-semibold">{t("home.greeting")}</h2>
        <p className="text-sm text-muted-light dark:text-muted-dark mt-1">{t("home.subtitle")}</p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickCard icon={CheckCircle} label={t("stats.completed")} value={state.completedToday} accent="bg-success" />
        <QuickCard icon={CheckCircle} label={t("stats.open")} value={pendingTasks.length} />
        <QuickCard icon={Clock} label={t("stats.focusMin")} value={state.focusMinutesToday} unit={t("stats.min")} accent="bg-accent" />
        <QuickCard icon={Clock} label={t("timeTracking.workHours")} value={getTodayMinutes()} unit={t("stats.min")} />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Clock In/Out */}
          <ClockWidget t={t} />

          {/* Today's Tasks + Quick Add */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-3">{t("home.openTasks")}</h3>
            <QuickAddTask t={t} onAdd={handleQuickAdd} />
            {topTasks.length === 0 ? (
              <p className="text-sm text-muted-light dark:text-muted-dark py-4 text-center">{t("home.noTasks")}</p>
            ) : (
              <div className="space-y-1 mt-3">
                {topTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 py-2 group">
                    <button
                      onClick={() => dispatch({ type: "COMPLETE_TASK", payload: task.id })}
                      className="w-5 h-5 rounded-md border-2 border-gray-300 dark:border-gray-600 flex-shrink-0 hover:border-accent hover:bg-accent/10 transition-colors flex items-center justify-center"
                    >
                      <CheckCircle className="w-3 h-3 opacity-0 group-hover:opacity-50 text-accent" />
                    </button>
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      task.priority === "high" ? "bg-danger" : task.priority === "medium" ? "bg-warn" : "bg-success"
                    }`} />
                    <span className="text-sm flex-1 truncate">{task.text}</span>
                    <span className="text-[10px] text-muted-light dark:text-muted-dark font-mono">~{task.estimatedMinutes}{t("common.min")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Events */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-3">{t("home.upcoming")}</h3>
            {todayEvents.length === 0 ? (
              <p className="text-sm text-muted-light dark:text-muted-dark py-4 text-center">{t("home.noEvents")}</p>
            ) : (
              <div className="space-y-2">
                {todayEvents
                  .sort((a, b) => (a.start || "").localeCompare(b.start || ""))
                  .map((ev) => (
                  <div key={ev.id} className="flex items-center gap-3 py-2">
                    <Calendar className="w-4 h-4 text-accent flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ev.title || ev.summary}</p>
                      {ev.start && !ev.allDay && (
                        <p className="text-[10px] text-muted-light dark:text-muted-dark font-mono">
                          {new Date(ev.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {ev.end && <> <ArrowRight className="w-2.5 h-2.5 inline" /> {new Date(ev.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>}
                        </p>
                      )}
                      {ev.allDay && <p className="text-[10px] text-muted-light dark:text-muted-dark">{t("calendar.allDay")}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          <FocusTimer />
          <DayPlan t={t} events={todayEvents} tasks={topTasks} settings={settings} />
        </div>
      </div>
    </div>
  );
}
