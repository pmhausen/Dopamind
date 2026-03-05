import { useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import { useResourceMonitor } from "../context/ResourceMonitorContext";
import { useApp } from "../context/AppContext";
import { Calendar, CheckCircle, ArrowRight, Archive, X } from "lucide-react";

export default function TriageModal() {
  const { t } = useI18n();
  const { state: rmState, dispatch: rmDispatch, hasPendingTriage } = useResourceMonitor();
  const { state: appState, dispatch: appDispatch } = useApp();
  const [reducedWindow, setReducedWindow] = useState(null);

  if (!hasPendingTriage || !rmState.pendingTriage) return null;

  const triage = rmState.pendingTriage;
  const isSickReturn = triage.absenceType === "sick";

  // Find overdue tasks (tasks that have a deadline before today or were scheduled during absence)
  const today = new Date().toISOString().slice(0, 10);
  const overdueTasks = (appState.tasks || []).filter((task) => {
    if (task.completed) return false;
    if (task.deadline && task.deadline < today) return true;
    if (task.scheduledDate && task.scheduledDate < today) return true;
    return false;
  });

  const handleScheduleToday = (taskId) => {
    appDispatch({ type: "UPDATE_TASK", payload: { id: taskId, scheduledDate: today } });
  };

  const handleDefer = (taskId) => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const deferDate = nextWeek.toISOString().slice(0, 10);
    appDispatch({ type: "UPDATE_TASK", payload: { id: taskId, scheduledDate: deferDate } });
  };

  const handleArchive = (taskId) => {
    appDispatch({ type: "TOGGLE_TASK", payload: taskId });
  };

  const handleDismiss = () => {
    rmDispatch({ type: "DISMISS_TRIAGE" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] bg-black/60">
      <div className="modal-card p-6 max-w-lg w-full mx-4 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{t("triage.welcomeBack")}</h3>
          <button onClick={handleDismiss} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary */}
        <p className="text-sm text-muted-light dark:text-muted-dark">
          {isSickReturn
            ? t("triage.sickSummary").replace("{startDate}", triage.startDate)
            : t("triage.vacationSummary").replace("{startDate}", triage.startDate).replace("{endDate}", rmState.absenceHistory?.[0]?.endDate || today)}
        </p>

        {/* Overdue tasks */}
        {overdueTasks.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-3">
              {t("triage.overdueTasks")} ({overdueTasks.length})
            </h4>
            <div className="space-y-2">
              {overdueTasks.slice(0, 10).map((task) => (
                <div key={task.id} className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 dark:bg-white/5">
                  <span className="text-sm flex-1 truncate">{task.text}</span>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleScheduleToday(task.id)}
                      className="px-2 py-1 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors flex items-center gap-1"
                      title={t("triage.scheduleToday")}
                    >
                      <Calendar className="w-3 h-3" /> {t("triage.scheduleToday")}
                    </button>
                    <button
                      onClick={() => handleDefer(task.id)}
                      className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-white/10 text-xs font-medium hover:bg-gray-200 dark:hover:bg-white/15 transition-colors flex items-center gap-1"
                      title={t("triage.defer")}
                    >
                      <ArrowRight className="w-3 h-3" /> {t("triage.defer")}
                    </button>
                    <button
                      onClick={() => handleArchive(task.id)}
                      className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-white/10 text-xs font-medium hover:bg-gray-200 dark:hover:bg-white/15 transition-colors flex items-center gap-1"
                      title={t("triage.archive")}
                    >
                      <Archive className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reduced window suggestion */}
        {reducedWindow === null && (
          <div className="glass-card p-4 bg-accent/5 border-accent/20">
            <p className="text-sm mb-3">{t("triage.reducedWindow")}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setReducedWindow(true)}
                className="btn-primary text-sm"
              >
                {t("triage.reducedYes")}
              </button>
              <button
                onClick={() => setReducedWindow(false)}
                className="btn-ghost text-sm"
              >
                {t("triage.reducedNo")}
              </button>
            </div>
          </div>
        )}

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="btn-primary text-sm w-full flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          {t("triage.allSorted")}
        </button>
      </div>
    </div>
  );
}
