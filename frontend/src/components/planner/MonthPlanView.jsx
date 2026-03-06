// MonthPlanView: Month calendar grid with task/event indicators
// Extracted from HomePage.jsx for reuse in PlannerPage

function toLocalDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function MonthPlanView({ t, tasks, getEventsForDate, monthStart, onSelectDay, todayStr }) {
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
          <div key={d} className="text-center text-[9px] lg:text-xs font-medium text-muted-light dark:text-muted-dark uppercase py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
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
              className={`flex flex-col items-center p-1 lg:p-2 rounded-lg text-center min-h-[44px] lg:min-h-[56px] transition-all border ${
                isToday
                  ? "border-accent bg-accent/10"
                  : isPast
                  ? "border-transparent bg-gray-50/50 dark:bg-white/[0.02]"
                  : "border-transparent hover:bg-gray-50 dark:hover:bg-white/5"
              }`}
            >
              <span className={`text-xs lg:text-sm font-medium ${isToday ? "text-accent font-bold" : isPast ? "text-gray-400 dark:text-gray-600" : ""}`}>
                {date.slice(8).replace(/^0/, "")}
              </span>
              {evCount > 0 && <div className="w-1 h-1 lg:w-1.5 lg:h-1.5 rounded-full bg-accent mt-0.5" />}
              {pendingCount > 0 && <span className="text-[8px] lg:text-[10px] text-muted-light dark:text-muted-dark">{pendingCount}</span>}
              {completedCount > 0 && <span className="text-[8px] lg:text-[10px] text-success">✓{completedCount}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
