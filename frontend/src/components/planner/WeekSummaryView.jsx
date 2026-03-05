// WeekSummaryView: Simplified day cards with task counts and top items
// Extracted from HomePage.jsx for reuse in PlannerPage

function shiftDateBy(dateStr, delta) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

const ENERGY_DOT = { low: "bg-emerald-400", medium: "bg-amber-400", high: "bg-red-400" };

export default function WeekSummaryView({ t, tasks, getEventsForDate, weekStart, onSelectDay, todayStr, settings, energyLevel }) {
  const days = Array.from({ length: 7 }, (_, i) => shiftDateBy(weekStart, i));
  const dayNames = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  const getTasksForDay = (date) => {
    if (date > todayStr) return tasks.filter((tk) => !tk.completed && tk.scheduledDate === date);
    if (date === todayStr) return tasks.filter((tk) => {
      if (tk.completed) return tk.completedAt && tk.completedAt.slice(0, 10) === date;
      return !tk.scheduledDate || tk.scheduledDate <= todayStr;
    });
    return tasks.filter((tk) => {
      if (tk.completed && tk.completedAt) return tk.completedAt.slice(0, 10) === date;
      return !tk.completed && tk.scheduledDate === date;
    });
  };

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((date, i) => {
        const dayTasks = getTasksForDay(date);
        const pendingTasks = dayTasks.filter((tk) => !tk.completed);
        const completedTasks = dayTasks.filter((tk) => tk.completed);
        const events = getEventsForDate(date).filter((ev) => !ev.allDay);
        const isToday = date === todayStr;
        const isPast = date < todayStr;
        const dayNum = date.slice(8);

        // Energy balance
        const energyCounts = { low: 0, medium: 0, high: 0 };
        pendingTasks.forEach((tk) => { energyCounts[tk.energyCost || "medium"]++; });

        return (
          <button
            key={date}
            onClick={() => onSelectDay(date)}
            className={`rounded-xl p-2 text-left transition-all hover:ring-1 hover:ring-accent/30 ${
              isToday ? "ring-1 ring-accent/40 bg-accent/5" : isPast ? "opacity-60 bg-gray-50 dark:bg-white/[0.02]" : "bg-gray-50 dark:bg-white/[0.02]"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[10px] font-bold uppercase ${isToday ? "text-accent" : "text-muted-light dark:text-muted-dark"}`}>
                {dayNames[i]}
              </span>
              <span className={`text-xs font-mono ${isToday ? "text-accent font-bold" : ""}`}>{dayNum}</span>
            </div>

            {/* Task count */}
            <div className="flex items-center gap-1 mb-1">
              {pendingTasks.length > 0 && <span className="text-xs font-bold">{pendingTasks.length}</span>}
              {completedTasks.length > 0 && <span className="text-[10px] text-success">✓{completedTasks.length}</span>}
              {events.length > 0 && <span className="text-[10px] text-accent">📅{events.length}</span>}
            </div>

            {/* Energy dots */}
            {pendingTasks.length > 0 && (
              <div className="flex gap-0.5 mb-1">
                {Object.entries(energyCounts).filter(([, c]) => c > 0).map(([level, count]) => (
                  <div key={level} className="flex gap-px">
                    {Array.from({ length: Math.min(count, 3) }).map((_, j) => (
                      <span key={j} className={`w-1.5 h-1.5 rounded-full ${ENERGY_DOT[level]}`} />
                    ))}
                    {count > 3 && <span className="text-[8px] text-muted-light dark:text-muted-dark">+{count - 3}</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Top 2 task names */}
            <div className="space-y-0.5">
              {pendingTasks.slice(0, 2).map((tk) => (
                <p key={tk.id} className="text-[9px] truncate text-muted-light dark:text-muted-dark leading-tight">{tk.text}</p>
              ))}
              {pendingTasks.length > 2 && (
                <p className="text-[8px] text-muted-light dark:text-muted-dark">+{pendingTasks.length - 2}</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
