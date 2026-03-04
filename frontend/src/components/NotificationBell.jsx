import { useState, useRef, useEffect } from "react";
import { Bell, AlertTriangle, Clock, X, CalendarDays } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useCalendar } from "../context/CalendarContext";
import { useI18n } from "../i18n/I18nContext";
import { Link } from "react-router-dom";

export default function NotificationBell() {
  const { t } = useI18n();
  const { state } = useApp();
  const { getEventsForDate } = useCalendar();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("dopamind-dismissed-notifs") || "[]");
    } catch { return []; }
  });
  const ref = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Build notifications from tasks
  const notifications = [];

  for (const task of state.tasks) {
    if (task.completed || !task.deadline) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(task.deadline)) continue;
    const deadlineDate = new Date(task.deadline + "T23:59:59");
    const diffMs = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / 86400000);

    if (diffDays < 0) {
      // Overdue
      notifications.push({
        id: `overdue-${task.id}`,
        type: "overdue",
        taskId: task.id,
        text: task.text,
        detail: t("notifications.overdueSince").replace("{days}", String(Math.abs(diffDays))),
        priority: task.priority,
        sortOrder: 0,
      });
    } else if (diffDays <= 1) {
      // Due today or tomorrow
      notifications.push({
        id: `urgent-${task.id}`,
        type: "urgent",
        taskId: task.id,
        text: task.text,
        detail: diffDays === 0 ? t("notifications.dueToday") : t("notifications.dueTomorrow"),
        priority: task.priority,
        sortOrder: 1,
      });
    }
  }

  // Check for scheduled date/time conflicts with calendar events
  const isTimeOnly = (s) => /^\d{1,2}:\d{2}$/.test(s);
  for (const task of state.tasks) {
    if (task.completed || !task.scheduledDate || !task.scheduledTime) continue;
    const taskDate = task.scheduledDate;
    const [th, tm] = task.scheduledTime.split(":").map(Number);
    const taskStartMin = th * 60 + (tm || 0);
    const taskEndMin = taskStartMin + (task.estimatedMinutes || 25);

    const dayEvents = getEventsForDate(taskDate);
    for (const ev of dayEvents) {
      if (ev.allDay || !ev.start) continue;
      let evStartMin, evEndMin;
      if (isTimeOnly(ev.start)) {
        const [eh, em] = ev.start.split(":").map(Number);
        evStartMin = eh * 60 + (em || 0);
        if (ev.end && isTimeOnly(ev.end)) {
          const [eeh, eem] = ev.end.split(":").map(Number);
          evEndMin = eeh * 60 + (eem || 0);
        } else {
          evEndMin = evStartMin + 60;
        }
      } else {
        const sd = new Date(ev.start);
        if (isNaN(sd)) continue;
        evStartMin = sd.getHours() * 60 + sd.getMinutes();
        const ed = ev.end ? new Date(ev.end) : null;
        evEndMin = ed && !isNaN(ed) ? ed.getHours() * 60 + ed.getMinutes() : evStartMin + 60;
      }
      // Check for overlap
      if (taskStartMin < evEndMin && taskEndMin > evStartMin) {
        notifications.push({
          id: `conflict-${task.id}-${ev.id || ev.title}`,
          type: "conflict",
          taskId: task.id,
          text: task.text,
          detail: t("notifications.scheduledConflict")
            .replace("{task}", task.text)
            .replace("{time}", `${String(th).padStart(2, "0")}:${String(tm || 0).padStart(2, "0")}`),
          priority: task.priority,
          sortOrder: 0.5,
        });
        break; // One conflict notification per task is enough
      }
    }
  }

  // Sort: overdue first, then urgent, then by priority
  notifications.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    const p = { high: 0, medium: 1, low: 2 };
    return (p[a.priority] ?? 1) - (p[b.priority] ?? 1);
  });

  // Filter out dismissed
  const visible = notifications.filter((n) => !dismissed.includes(n.id));
  const count = visible.length;

  const dismiss = (id) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem("dopamind-dismissed-notifs", JSON.stringify(next));
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/5 transition-colors relative"
        aria-label={t("notifications.title")}
      >
        <Bell className="w-4 h-4 text-muted-light dark:text-muted-dark" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 max-h-96 overflow-y-auto glass-card rounded-xl shadow-xl border border-gray-200/50 dark:border-white/10 z-50">
          <div className="px-4 py-3 border-b border-gray-200/50 dark:border-white/5">
            <h4 className="text-sm font-semibold">{t("notifications.title")}</h4>
          </div>

          {visible.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-light dark:text-muted-dark">
              {t("notifications.empty")}
            </div>
          ) : (
            <div className="divide-y divide-gray-200/30 dark:divide-white/5">
              {visible.map((n) => (
                <div
                  key={n.id}
                  className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    n.type === "overdue"
                      ? "bg-danger/10 text-danger"
                      : n.type === "conflict"
                      ? "bg-accent/10 text-accent"
                      : "bg-warn/10 text-amber-600 dark:text-warn"
                  }`}>
                    {n.type === "overdue" ? <AlertTriangle className="w-3.5 h-3.5" /> : n.type === "conflict" ? <CalendarDays className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{n.text}</p>
                    <p className={`text-[11px] mt-0.5 ${
                      n.type === "overdue" ? "text-danger" : n.type === "conflict" ? "text-accent" : "text-amber-600 dark:text-warn"
                    }`}>
                      {n.detail}
                    </p>
                  </div>
                  <button
                    onClick={() => dismiss(n.id)}
                    className="w-5 h-5 rounded flex items-center justify-center text-muted-light hover:text-danger transition-colors flex-shrink-0"
                    title={t("common.close")}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {visible.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-200/50 dark:border-white/5">
              <Link
                to="/tasks"
                onClick={() => setOpen(false)}
                className="text-xs text-accent hover:underline"
              >
                {t("notifications.viewAll")}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
