import { useApp } from "../context/AppContext";
import { useI18n } from "../i18n/I18nContext";

function StatCard({ label, value, unit, accent }) {
  return (
    <div className="glass-card p-4 text-center">
      <p className={`text-2xl font-bold font-mono ${accent || ""}`}>{value}</p>
      <p className="text-[10px] text-muted-light dark:text-muted-dark mt-1 uppercase tracking-wider">
        {label}
        {unit && <span className="ml-0.5">{unit}</span>}
      </p>
    </div>
  );
}

export default function StatsPanel() {
  const { state } = useApp();
  const { t } = useI18n();

  const pendingTasks = state.tasks.filter((task) => !task.completed).length;
  const totalMinutes = state.tasks
    .filter((task) => !task.completed)
    .reduce((sum, task) => sum + task.estimatedMinutes, 0);

  return (
    <div className="animate-fade-in">
      <h2 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-3">
        {t("stats.today")}
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label={t("stats.completed")} value={state.completedToday} accent="text-success" />
        <StatCard label={t("stats.open")} value={pendingTasks} />
        <StatCard label={t("stats.focusMin")} value={state.focusMinutesToday} unit={t("stats.min")} accent="text-accent" />
        <StatCard label={t("stats.estimatedMin")} value={totalMinutes} unit={t("stats.min")} />
      </div>
    </div>
  );
}
