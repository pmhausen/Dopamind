import { useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import { useApp } from "../context/AppContext";
import { useCalendar } from "../context/CalendarContext";
import { useSettings } from "../context/SettingsContext";
import WeekSummaryView from "../components/planner/WeekSummaryView";
import MonthPlanView from "../components/planner/MonthPlanView";
import { ChevronLeft, ChevronRight, Plus, X, Pencil, MapPin } from "lucide-react";
import EventFormStepper from "../components/EventFormStepper";

function toLocalDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekMonday(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt.toISOString().slice(0, 10);
}

function shiftDateBy(dateStr, delta) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

export default function PlannerPage() {
  const { t } = useI18n();
  const { state: appState, dispatch } = useApp();
  const { state: calState, dispatch: calDispatch, addEvent, updateEvent, deleteEvent, getEventsForDate } = useCalendar();
  const { settings } = useSettings();

  const todayStr = toLocalDateStr(new Date());
  const [planView, setPlanView] = useState("week"); // "week" | "month"
  const [viewDate, setViewDate] = useState(todayStr);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({ title: "", description: "", location: "", date: "", start: "09:00", end: "10:00", allDay: false });

  const weekStart = getWeekMonday(viewDate);
  const [monthY, monthM] = viewDate.split("-").map(Number);
  const monthStart = `${monthY}-${String(monthM).padStart(2, "0")}-01`;

  // Navigation
  const prevPeriod = () => {
    if (planView === "week") {
      setViewDate((cur) => shiftDateBy(cur, -7));
    } else {
      setViewDate((cur) => {
        const [y, m] = cur.split("-").map(Number);
        const d = new Date(y, m - 2, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      });
    }
  };
  const nextPeriod = () => {
    if (planView === "week") {
      setViewDate((cur) => shiftDateBy(cur, +7));
    } else {
      setViewDate((cur) => {
        const [y, m] = cur.split("-").map(Number);
        const d = new Date(y, m, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      });
    }
  };

  const formatPeriodLabel = () => {
    if (planView === "week") {
      const weekEnd = shiftDateBy(weekStart, 6);
      return `${weekStart.slice(8)}.${weekStart.slice(5, 7)} – ${weekEnd.slice(8)}.${weekEnd.slice(5, 7)}.${weekEnd.slice(0, 4)}`;
    }
    const [y, m] = viewDate.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  };

  const handleSelectDay = (date) => {
    setSelectedDate(date);
    // Also sync CalendarContext selected date for event CRUD
    calDispatch({ type: "SET_DATE", payload: date });
  };

  const selectedEvents = getEventsForDate(selectedDate);

  // Tasks for selected day
  const isFuture = selectedDate > todayStr;
  const isPast = selectedDate < todayStr;
  let dayTasks;
  if (isPast) {
    dayTasks = appState.tasks.filter((tk) => {
      if (!tk.completed) return false;
      if (tk.completedAt) return toLocalDateStr(new Date(tk.completedAt)) === selectedDate;
      return false;
    });
  } else if (isFuture) {
    dayTasks = appState.tasks.filter((tk) => !tk.completed && tk.scheduledDate === selectedDate);
  } else {
    dayTasks = appState.tasks.filter((tk) => {
      if (tk.completed) {
        if (tk.completedAt) return toLocalDateStr(new Date(tk.completedAt)) === todayStr;
        return false;
      }
      if (tk.scheduledDate && tk.scheduledDate > todayStr) return false;
      return true;
    });
  }
  const pendingDayTasks = dayTasks.filter((tk) => !tk.completed);
  const completedDayTasks = dayTasks.filter((tk) => tk.completed);

  const handleAddEvent = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    if (editingEvent) {
      updateEvent({
        ...editingEvent,
        title: formData.title,
        description: formData.description,
        location: formData.location,
        date: formData.date || selectedDate,
        start: formData.allDay ? null : formData.start,
        end: formData.allDay ? null : formData.end,
        allDay: formData.allDay,
      });
      setEditingEvent(null);
    } else {
      addEvent({
        id: Date.now().toString(36),
        title: formData.title,
        description: formData.description,
        location: formData.location,
        date: formData.date || selectedDate,
        start: formData.allDay ? null : formData.start,
        end: formData.allDay ? null : formData.end,
        allDay: formData.allDay,
      });
    }
    setFormData({ title: "", description: "", location: "", date: "", start: "09:00", end: "10:00", allDay: false });
    setShowForm(false);
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title || "",
      description: event.description || "",
      location: event.location || "",
      date: event.date || selectedDate,
      start: event.start || "09:00",
      end: event.end || "10:00",
      allDay: event.allDay || false,
    });
    setShowForm(true);
  };

  const selectedDateLabel = new Date(selectedDate + "T00:00").toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header + view switcher */}
      <div className="glass-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
          <div>
            <h2 className="text-xl font-semibold">{t("nav.planner")}</h2>
          </div>
          <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2 flex-wrap">
            {/* View switcher */}
            <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-white/5 rounded-lg p-0.5">
              {["week", "month"].map((v) => (
                <button
                  key={v}
                  onClick={() => setPlanView(v)}
                  className={`px-2 py-0.5 rounded text-[10px] lg:text-xs transition-all ${
                    planView === v
                      ? "bg-white dark:bg-white/15 text-accent font-bold shadow-sm"
                      : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  }`}
                >
                  {t(`home.planView.${v}`)}
                </button>
              ))}
            </div>
            {/* Period navigation */}
            <div className="flex items-center gap-1">
            <button
              onClick={prevPeriod}
              className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center transition-colors"
              aria-label={t("home.previousDay")}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium min-w-[100px] text-center">{formatPeriodLabel()}</span>
            <button
              onClick={nextPeriod}
              className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center transition-colors"
              aria-label={t("home.nextDay")}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            </div>
          </div>
        </div>

        {/* Week or Month view */}
        {planView === "week" && (
          <WeekSummaryView
            t={t}
            tasks={appState.tasks}
            getEventsForDate={getEventsForDate}
            weekStart={weekStart}
            onSelectDay={handleSelectDay}
            todayStr={todayStr}
            settings={settings}
            energyLevel={appState.energyLevel}
          />
        )}
        {planView === "month" && (
          <MonthPlanView
            t={t}
            tasks={appState.tasks}
            getEventsForDate={getEventsForDate}
            monthStart={monthStart}
            onSelectDay={handleSelectDay}
            todayStr={todayStr}
          />
        )}
      </div>

      {/* Day detail panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Tasks for selected day */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-3">
            {selectedDateLabel}
          </h3>
          {dayTasks.length === 0 ? (
            <p className="text-sm text-muted-light dark:text-muted-dark text-center py-6">{t("tasks.empty")}</p>
          ) : (
            <div className="space-y-2">
              {pendingDayTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-2 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors group"
                >
                  <button
                    onClick={() => dispatch({ type: "COMPLETE_TASK", payload: task.id })}
                    className="mt-0.5 w-4 h-4 rounded border border-gray-300 dark:border-white/20 flex-shrink-0 hover:border-success hover:bg-success/10 transition-colors"
                    aria-label={t("tasks.complete")}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.text}</p>
                    {task.estimatedMinutes && (
                      <p className="text-xs text-muted-light dark:text-muted-dark">~{task.estimatedMinutes}{t("common.min")}</p>
                    )}
                    {task.subtasks && task.subtasks.filter((s) => !s.completed).length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {task.subtasks.filter((s) => !s.completed).map((sub) => (
                          <div key={sub.id} className="flex items-center gap-1.5">
                            <button
                              onClick={() => dispatch({ type: "TOGGLE_SUBTASK", payload: { taskId: task.id, subtaskId: sub.id } })}
                              className="w-3 h-3 rounded border border-gray-300 dark:border-white/20 flex-shrink-0 hover:border-success hover:bg-success/10 transition-colors"
                              aria-label={t("tasks.complete")}
                            />
                            <span className="text-xs text-muted-light dark:text-muted-dark truncate">{sub.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {completedDayTasks.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-white/5">
                  {completedDayTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-2 p-2 rounded-xl opacity-50">
                      <span className="text-success text-xs">✓</span>
                      <p className="text-sm line-through truncate">{task.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Events for selected day */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider">
              {t("calendar.title")}
            </h3>
            <button
              onClick={() => {
                setEditingEvent(null);
                setFormData({ title: "", description: "", location: "", date: selectedDate, start: "09:00", end: "10:00", allDay: false });
                setShowForm(true);
              }}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/5 text-accent"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {selectedEvents.length === 0 && !showForm ? (
            <p className="text-sm text-muted-light dark:text-muted-dark text-center py-6">
              {t("calendar.noEvents")}
            </p>
          ) : (
            <div className="space-y-2">
              {/* All-day events first */}
              {selectedEvents.filter((e) => e.allDay).map((event) => (
                <div
                  key={event.id}
                  className="group flex items-center gap-3 px-3 py-2 rounded-xl bg-accent/10 dark:bg-accent/20 hover:bg-accent/15 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-accent truncate">{event.title}</p>
                    <p className="text-xs text-accent/70 font-medium">{t("calendar.allDay")}</p>
                    {event.location && (
                      <p className="text-xs text-accent/60 flex items-center gap-0.5 mt-0.5 truncate"><MapPin className="w-2.5 h-2.5 flex-shrink-0" />{event.location}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleEditEvent(event)}
                    className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-accent/50 hover:text-accent transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteEvent(event.id)}
                    className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-accent/50 hover:text-danger transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {/* Timed events */}
              {selectedEvents.filter((e) => !e.allDay).sort((a, b) => (a.start || "").localeCompare(b.start || "")).map((event) => (
                <div
                  key={event.id}
                  className="group flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
                >
                  <div className="w-1 h-full min-h-[2rem] rounded-full bg-accent flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{event.title}</p>
                    {event.start && (
                      <p className="text-xs text-muted-light dark:text-muted-dark font-mono mt-0.5">
                        {event.start} – {event.end}
                      </p>
                    )}
                    {event.location && (
                      <p className="text-xs text-muted-light dark:text-muted-dark flex items-center gap-0.5 mt-0.5 truncate"><MapPin className="w-2.5 h-2.5 flex-shrink-0" />{event.location}</p>
                    )}
                    {event.description && (
                      <p className="text-xs text-muted-light dark:text-muted-dark mt-1 truncate">{event.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleEditEvent(event)}
                    className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-muted-light hover:text-accent transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteEvent(event.id)}
                    className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-muted-light hover:text-danger transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add / Edit Event Form */}
          {showForm && (
            <EventFormStepper
              key={editingEvent?.id || "new"}
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleAddEvent}
              onCancel={() => { setShowForm(false); setEditingEvent(null); }}
              editing={!!editingEvent}
            />
          )}
        </div>
      </div>
    </div>
  );
}
