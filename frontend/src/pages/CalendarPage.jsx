import { useState, useMemo } from "react";
import { useI18n } from "../i18n/I18nContext";
import { useCalendar } from "../context/CalendarContext";
import { ChevronLeft, ChevronRight, Plus, X, Pencil, MapPin } from "lucide-react";

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday-based
}

export default function CalendarPage() {
  const { t } = useI18n();
  const { state, dispatch, addEvent, updateEvent, deleteEvent, getEventsForDate } = useCalendar();
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({ title: "", description: "", location: "", date: "", start: "09:00", end: "10:00", allDay: false });

  // Parse date parts directly to avoid UTC/local timezone drift
  const [year, monthNum] = state.selectedDate.split("-").map(Number);
  const month = monthNum - 1;

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const weeks = useMemo(() => {
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    while (rows[rows.length - 1]?.length < 7) rows[rows.length - 1].push(null);
    return rows;
  }, [firstDay, daysInMonth]);

  const navigateMonth = (delta) => {
    const d = new Date(year, month + delta, 1);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    dispatch({ type: "SET_DATE", payload: dateStr });
  };

  const selectDate = (day) => {
    if (!day) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    dispatch({ type: "SET_DATE", payload: dateStr });
  };

  const selectedEvents = getEventsForDate(state.selectedDate);

  const handleAddEvent = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    if (editingEvent) {
      updateEvent({
        ...editingEvent,
        title: formData.title,
        description: formData.description,
        location: formData.location,
        date: formData.date || state.selectedDate,
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
        date: formData.date || state.selectedDate,
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
      date: event.date || state.selectedDate,
      start: event.start || "09:00",
      end: event.end || "10:00",
      allDay: event.allDay || false,
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 glass-card p-5">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navigateMonth(-1)} className="btn-ghost p-2">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold">
              {t("calendar.months")[month]} {year}
            </h2>
            <button onClick={() => navigateMonth(1)} className="btn-ghost p-2">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {t("calendar.weekdays").map((day) => (
              <div key={day} className="text-center text-[10px] font-semibold text-muted-light dark:text-muted-dark uppercase">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="space-y-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1">
                {week.map((day, di) => {
                  if (!day) return <div key={di} />;
                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === state.selectedDate;
                  const dayEvents = getEventsForDate(dateStr);

                  return (
                    <button
                      key={di}
                      onClick={() => selectDate(day)}
                      className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all ${
                        isSelected
                          ? "bg-accent text-white"
                          : isToday
                          ? "bg-accent/10 text-accent font-semibold"
                          : "hover:bg-gray-100 dark:hover:bg-white/5"
                      }`}
                    >
                      {day}
                      {dayEvents.length > 0 && (
                        <div className="flex gap-0.5 mt-0.5">
                          {dayEvents.slice(0, 3).map((ev, i) => (
                            <div
                              key={i}
                              className={`w-1 h-1 rounded-full ${
                                isSelected ? "bg-white/80" : ev.allDay ? "bg-accent" : "bg-accent/60"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Day Detail Panel */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider">
              {new Date(state.selectedDate + "T00:00").toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h3>
            <button
              onClick={() => {
                setEditingEvent(null);
                setFormData({ title: "", description: "", location: "", date: state.selectedDate, start: "09:00", end: "10:00", allDay: false });
                setShowForm(true);
              }}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/5 text-accent"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Event list */}
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-muted-light dark:text-muted-dark text-center py-8">
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
                    <p className="text-[10px] text-accent/70 font-medium">{t("calendar.allDay")}</p>
                    {event.location && (
                      <p className="text-[10px] text-accent/60 flex items-center gap-0.5 mt-0.5 truncate"><MapPin className="w-2.5 h-2.5 flex-shrink-0" />{event.location}</p>
                    )}
                    {event.description && (
                      <p className="text-xs text-muted-light dark:text-muted-dark mt-0.5 truncate">{event.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleEditEvent(event)}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-accent/50 hover:text-accent transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteEvent(event.id)}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-accent/50 hover:text-danger transition-all"
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
                      <p className="text-[10px] text-muted-light dark:text-muted-dark font-mono mt-0.5">
                        {event.start} – {event.end}
                      </p>
                    )}
                    {event.location && (
                      <p className="text-[10px] text-muted-light dark:text-muted-dark flex items-center gap-0.5 mt-0.5 truncate"><MapPin className="w-2.5 h-2.5 flex-shrink-0" />{event.location}</p>
                    )}
                    {event.description && (
                      <p className="text-xs text-muted-light dark:text-muted-dark mt-1 truncate">{event.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleEditEvent(event)}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-muted-light hover:text-accent transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteEvent(event.id)}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-muted-light hover:text-danger transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Event Form */}
          {showForm && (
            <form onSubmit={handleAddEvent} className="mt-4 pt-4 border-t border-gray-200/50 dark:border-white/5 space-y-3">
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
                placeholder={t("calendar.eventTitle")}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                autoFocus
              />
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                placeholder={t("calendar.eventDescription")}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                rows={2}
              />
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-light dark:text-muted-dark flex-shrink-0" />
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData((f) => ({ ...f, location: e.target.value }))}
                  placeholder={t("calendar.eventLocation")}
                  className="flex-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.allDay}
                  onChange={(e) => setFormData((f) => ({ ...f, allDay: e.target.checked }))}
                  className="rounded"
                />
                {t("calendar.allDay")}
              </label>
              {!formData.allDay && (
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={formData.start}
                    onChange={(e) => setFormData((f) => ({ ...f, start: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  <input
                    type="time"
                    value={formData.end}
                    onChange={(e) => setFormData((f) => ({ ...f, end: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <button type="submit" className="btn-primary text-sm flex-1">{t("calendar.save")}</button>
                <button type="button" onClick={() => { setShowForm(false); setEditingEvent(null); }} className="btn-ghost text-sm">
                  {t("calendar.cancel")}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
