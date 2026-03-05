import { useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import { useApp } from "../context/AppContext";
import { useResourceMonitor } from "../context/ResourceMonitorContext";
import { useSettings } from "../context/SettingsContext";
import AchievementsPanel from "../components/AchievementsPanel";
import { Download, Trophy, BarChart2, Brain, TrendingUp } from "lucide-react";

function StatCard({ label, value, color, unit }) {
  return (
    <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-white/5">
      <p className={`text-2xl font-bold ${color}`}>{value}{unit ? <span className="text-sm ml-0.5">{unit}</span> : ""}</p>
      <p className="text-[10px] text-muted-light dark:text-muted-dark uppercase mt-0.5">{label}</p>
    </div>
  );
}

const ENERGY_COLORS = {
  high:   { bg: "bg-green-500", text: "text-green-700 dark:text-green-300" },
  normal: { bg: "bg-blue-400",  text: "text-blue-700 dark:text-blue-300"  },
  low:    { bg: "bg-amber-400", text: "text-amber-700 dark:text-amber-300" },
};

function EnergyHistoryChart({ t, energyLog, period }) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  let filtered = energyLog || [];
  if (period === "week") {
    const cutoff = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
    filtered = filtered.filter((e) => e.date >= cutoff);
  } else if (period === "month") {
    const cutoff = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    filtered = filtered.filter((e) => e.date >= cutoff);
  } else if (period === "year") {
    filtered = filtered.filter((e) => e.date.slice(0, 4) === todayStr.slice(0, 4));
  }

  if (filtered.length === 0) {
    return <p className="text-xs text-muted-light dark:text-muted-dark">{t("stats.noEnergyData")}</p>;
  }

  const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-1.5">
      {sorted.map((entry) => {
        const cfg = ENERGY_COLORS[entry.level] || ENERGY_COLORS.normal;
        return (
          <div key={entry.date} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-light dark:text-muted-dark w-20 shrink-0">{entry.date}</span>
            <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
              <div className={`h-full rounded-full ${cfg.bg}`} style={{ width: "100%" }} />
            </div>
            <span className={`text-[10px] ${cfg.text} w-20 text-right shrink-0`}>{t(`home.energy.${entry.level}`)}</span>
          </div>
        );
      })}
    </div>
  );
}

const SIZE_ORDER = ["quick", "short", "medium", "long"];
const SIZE_BAR_COLORS = { quick: "bg-emerald-400", short: "bg-blue-400", medium: "bg-amber-400", long: "bg-orange-400" };

function EstimationAccuracySection({ t, timeLog }) {
  const byCategory = {};
  const overall = { count: 0, totalDiff: 0, overruns: 0 };
  for (const entry of (timeLog || [])) {
    if (!entry.estimatedMin || !entry.actualMin) continue;
    overall.count++;
    overall.totalDiff += Math.abs(entry.actualMin - entry.estimatedMin);
    if (entry.actualMin > entry.estimatedMin) overall.overruns++;
    if (entry.sizeCategory) {
      if (!byCategory[entry.sizeCategory]) byCategory[entry.sizeCategory] = { count: 0, totalEst: 0, totalAct: 0 };
      byCategory[entry.sizeCategory].count++;
      byCategory[entry.sizeCategory].totalEst += entry.estimatedMin;
      byCategory[entry.sizeCategory].totalAct += entry.actualMin;
    }
  }
  if (overall.count === 0) return <p className="text-xs text-muted-light dark:text-muted-dark">{t("stats.noEstimationData")}</p>;

  const avgDiff = Math.round(overall.totalDiff / overall.count);
  const overrunPct = Math.round((overall.overruns / overall.count) * 100);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-xl font-bold text-accent">{overall.count}</p>
          <p className="text-[10px] text-muted-light dark:text-muted-dark uppercase">{t("stats.trackedTasks")}</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-warn">±{avgDiff}{t("common.min")}</p>
          <p className="text-[10px] text-muted-light dark:text-muted-dark uppercase">{t("stats.avgDeviation")}</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-danger">{overrunPct}%</p>
          <p className="text-[10px] text-muted-light dark:text-muted-dark uppercase">{t("stats.overrunRate")}</p>
        </div>
      </div>
      {/* Per-category breakdown */}
      <div className="space-y-2">
        {SIZE_ORDER.filter((k) => byCategory[k]).map((key) => {
          const cat = byCategory[key];
          const avgEst = Math.round(cat.totalEst / cat.count);
          const avgAct = Math.round(cat.totalAct / cat.count);
          const maxVal = Math.max(avgEst, avgAct, 1);
          return (
            <div key={key} className="text-xs">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-medium">{t(`tasks.size.${key}`)} ({cat.count}x)</span>
                <span className="text-muted-light dark:text-muted-dark">{t("stats.estVsAct", { est: avgEst, act: avgAct })}</span>
              </div>
              <div className="flex gap-1 h-2">
                <div className={`${SIZE_BAR_COLORS[key]} rounded opacity-40`} style={{ width: `${(avgEst / maxVal) * 50}%` }} title={`${t("stats.estimated")}: ${avgEst}${t("common.min")}`} />
                <div className={`${SIZE_BAR_COLORS[key]} rounded`} style={{ width: `${(avgAct / maxVal) * 50}%` }} title={`${t("stats.actual")}: ${avgAct}${t("common.min")}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BrainReportTab({ t, state, resourceMonitorState }) {
  const [period, setPeriod] = useState("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const filteredEnergyLog = (() => {
    const log = state.energyLog || [];
    if (period === "custom" && customFrom && customTo) {
      return log.filter((e) => e.date >= customFrom && e.date <= customTo);
    }
    return log;
  })();

  const handleExportJSON = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      period: "all-time",
      stats: {
        tasksCompletedThisYear: (state.completedThisYear || 0),
        tasksThisWeek: state.completedThisWeek,
        tasksThisMonth: state.completedThisMonth,
        totalFocusMinutes: state.totalFocusMinutes,
        focusMinutesThisWeek: state.focusMinutesThisWeek,
        focusMinutesThisMonth: state.focusMinutesThisMonth,
        currentStreak: state.currentStreakDays,
        longestStreak: state.longestStreakDays,
        level: state.level,
        xp: state.xp,
        achievements: (state.unlockedAchievements || []).length,
        notMyDayCount: state.notMyDayCount || 0,
      },
      previousWeek: state.previousWeekStats || null,
      focusLog: (state.focusLog || []).slice(-30),
      energyLog: state.energyLog || [],
      activitySessions: (resourceMonitorState?.activitySessions || []).slice(-30),
      absenceHistory: resourceMonitorState?.absenceHistory || [],
      exportedBy: "Dopamind Brain Report",
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dopamind-brain-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const PERIODS = [
    { key: "week",   label: t("stats.thisWeek") },
    { key: "month",  label: t("stats.thisMonth") },
    { key: "year",   label: t("stats.thisYear") },
    { key: "all",    label: t("stats.allTime") },
    { key: "custom", label: t("stats.customPeriod") },
  ];

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <button onClick={handleExportJSON} className="btn-ghost text-sm flex items-center gap-2 px-4 py-2">
          <Download className="w-4 h-4" />
          {t("stats.exportJSON")}
        </button>
        <button onClick={() => window.print()} className="btn-ghost text-sm flex items-center gap-2 px-4 py-2">
          <Download className="w-4 h-4" />
          {t("stats.exportPrint")}
        </button>
      </div>

      {/* Period filter */}
      <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-white/5 rounded-xl p-1">
        {PERIODS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`flex-1 min-w-[60px] px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
              period === key
                ? "bg-white dark:bg-white/15 text-accent shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {period === "custom" && (
        <div className="flex gap-2 items-center text-sm">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="input-field text-sm px-2 py-1"
          />
          <span className="text-muted-light dark:text-muted-dark">–</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="input-field text-sm px-2 py-1"
          />
        </div>
      )}

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">{t("stats.thisWeek")}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label={t("stats.completed")} value={state.completedThisWeek} color="text-success" />
          <StatCard label={t("stats.focusMin")} value={state.focusMinutesThisWeek} color="text-accent" unit={t("common.min")} />
          <StatCard label={t("stats.streak")} value={state.currentStreakDays} color="text-warn" />
          <StatCard label="XP" value={state.xp} color="text-yellow-500" />
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">{t("stats.thisMonth")}</h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label={t("stats.completed")} value={state.completedThisMonth} color="text-success" />
          <StatCard label={t("stats.focusMin")} value={state.focusMinutesThisMonth} color="text-accent" unit={t("common.min")} />
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">{t("stats.allTime")}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard label={t("stats.focusMin")} value={state.totalFocusMinutes} color="text-accent" unit={t("common.min")} />
          <StatCard label={t("stats.longestStreak")} value={state.longestStreakDays} color="text-warn" />
          <StatCard label={t("stats.level")} value={state.level} color="text-purple-500" />
        </div>
      </div>

      {/* notMyDay count */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">{t("stats.notMyDayTitle")}</h3>
        <div className="flex items-center gap-3">
          <span className="text-2xl">💙</span>
          <div>
            <p className="text-2xl font-bold text-pink-500">{state.notMyDayCount || 0}</p>
            <p className="text-[10px] text-muted-light dark:text-muted-dark uppercase">{t("stats.notMyDayLabel")}</p>
          </div>
        </div>
      </div>

      {/* Energy level history */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">{t("stats.energyHistory")}</h3>
        <EnergyHistoryChart t={t} energyLog={period === "custom" ? filteredEnergyLog : state.energyLog} period={period} />
      </div>

      {/* Estimation accuracy */}
      {(state.timeLog || []).length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">{t("stats.estimationAccuracy")}</h3>
          <EstimationAccuracySection t={t} timeLog={state.timeLog} />
        </div>
      )}

      {state.previousWeekStats && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">{t("stats.previousWeek")}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard label={t("stats.completed")} value={state.previousWeekStats.tasks} color="text-success" />
            <StatCard label={t("stats.focusMin")} value={state.previousWeekStats.focusMinutes} color="text-accent" unit={t("common.min")} />
            <StatCard label="XP" value={state.previousWeekStats.xp} color="text-yellow-500" />
          </div>
        </div>
      )}
    </div>
  );
}

function XpHistoryTab({ t, state }) {
  const xpForLevel = (level) => (level - 1) * (level - 1) * 50;
  const xpForNextLevel = (level) => level * level * 50;
  const currentLevelXp = xpForLevel(state.level);
  const nextLevelXp = xpForNextLevel(state.level);
  const progressPct = Math.min(100, Math.round(((state.xp - currentLevelXp) / Math.max(1, nextLevelXp - currentLevelXp)) * 100));

  return (
    <div className="space-y-5">
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">{t("stats.xpProgress")}</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">Level {state.level}</span>
            <span className="text-muted-light dark:text-muted-dark">{state.xp} / {nextLevelXp} XP</span>
          </div>
          <div className="w-full h-3 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-accent to-purple-500 transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="text-xs text-muted-light dark:text-muted-dark text-right">{progressPct}% {t("stats.toNextLevel")}</p>
        </div>
      </div>
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">{t("stats.xpSources")}</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-light dark:text-muted-dark">{t("stats.xpFromTasks")}</span>
            <span className="font-mono font-medium">{state.xp} XP</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsTab({ t, state }) {
  const totalHours = Math.floor((state.totalFocusMinutes || 0) / 60);
  const totalMins = (state.totalFocusMinutes || 0) % 60;

  return (
    <div className="space-y-5">
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">{t("stats.focus")}</h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label={t("stats.totalFocus")} value={`${totalHours}h ${totalMins}m`} color="text-accent" />
          <StatCard label={t("stats.focusBlocksToday")} value={state.focusBlocksToday || 0} color="text-green-500" />
          <StatCard label={t("stats.focusBlocksWeek")} value={state.focusBlocksThisWeek || 0} color="text-blue-500" />
          <StatCard label={t("stats.focusMinToday")} value={state.focusMinutesToday || 0} color="text-purple-500" unit={t("common.min")} />
        </div>
      </div>
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">{t("stats.tasks")}</h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label={t("stats.today")} value={state.completedToday || 0} color="text-success" />
          <StatCard label={t("stats.thisWeek")} value={state.completedThisWeek || 0} color="text-accent" />
          <StatCard label={t("stats.thisMonth")} value={state.completedThisMonth || 0} color="text-blue-500" />
          <StatCard label={t("stats.thisYear")} value={state.completedThisYear || 0} color="text-purple-500" />
        </div>
      </div>
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">{t("stats.streakStats")}</h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label={t("stats.currentStreak")} value={state.currentStreakDays || 0} color="text-warn" />
          <StatCard label={t("stats.longestStreak")} value={state.longestStreakDays || 0} color="text-orange-500" />
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { key: "report", icon: Brain, labelKey: "stats.tabReport" },
  { key: "achievements", icon: Trophy, labelKey: "stats.tabAchievements" },
  { key: "xp", icon: TrendingUp, labelKey: "stats.tabXP" },
  { key: "statistics", icon: BarChart2, labelKey: "stats.tabStats" },
];

export default function AchievementsPage() {
  const { t } = useI18n();
  const { state } = useApp();
  const { state: rmState } = useResourceMonitor();
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState("report");

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-xl font-semibold">{t("stats.pageTitle")}</h1>

      <div className="flex gap-1 bg-gray-100 dark:bg-white/5 rounded-xl p-1">
        {TABS.map(({ key, icon: Icon, labelKey }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === key
                ? "bg-white dark:bg-white/15 text-accent shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t(labelKey)}</span>
          </button>
        ))}
      </div>

      {activeTab === "report" && <BrainReportTab t={t} state={state} resourceMonitorState={rmState} />}
      {activeTab === "achievements" && <AchievementsPanel />}
      {activeTab === "xp" && <XpHistoryTab t={t} state={state} />}
      {activeTab === "statistics" && <StatsTab t={t} state={state} />}
    </div>
  );
}
