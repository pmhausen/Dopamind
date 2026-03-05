import { useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import { useApp } from "../context/AppContext";
import { useResourceMonitor } from "../context/ResourceMonitorContext";
import AchievementsPanel from "../components/AchievementsPanel";
import { BarChart, TrendIndicator, HeatmapGrid } from "../components/charts";
import { useFilteredStats } from "../hooks/useFilteredStats";
import { Download, Trophy, BarChart2, Brain, TrendingUp } from "lucide-react";

// Shared helpers

function StatCard({ label, value, color, unit }) {
  return (
    <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-white/5">
      <p className={`text-2xl font-bold ${color}`}>
        {value}
        {unit ? <span className="text-sm ml-0.5">{unit}</span> : ""}
      </p>
      <p className="text-[10px] text-muted-light dark:text-muted-dark uppercase mt-0.5">{label}</p>
    </div>
  );
}

function formatFocusTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

const ENERGY_COLORS = {
  high:   { bg: "bg-green-500",  text: "text-green-700 dark:text-green-300"  },
  normal: { bg: "bg-blue-400",   text: "text-blue-700 dark:text-blue-300"    },
  low:    { bg: "bg-amber-400",  text: "text-amber-700 dark:text-amber-300"  },
};

const ENERGY_EMOJI = { high: "⚡", normal: "😊", low: "🌱" };

const SIZE_ORDER = ["quick", "short", "medium", "long"];
const SIZE_BAR_COLORS = {
  quick:  "bg-emerald-400",
  short:  "bg-blue-400",
  medium: "bg-amber-400",
  long:   "bg-orange-400",
};

// EstimationAccuracySection

function EstimationAccuracySection({ t, timeLog }) {
  const byCategory = {};
  const overall = { count: 0, totalDiff: 0, overruns: 0 };
  for (const entry of (timeLog || [])) {
    if (!entry.estimatedMin || !entry.actualMin) continue;
    overall.count++;
    overall.totalDiff += Math.abs(entry.actualMin - entry.estimatedMin);
    if (entry.actualMin > entry.estimatedMin) overall.overruns++;
    if (entry.sizeCategory) {
      if (!byCategory[entry.sizeCategory])
        byCategory[entry.sizeCategory] = { count: 0, totalEst: 0, totalAct: 0 };
      byCategory[entry.sizeCategory].count++;
      byCategory[entry.sizeCategory].totalEst += entry.estimatedMin;
      byCategory[entry.sizeCategory].totalAct += entry.actualMin;
    }
  }
  if (overall.count === 0)
    return <p className="text-xs text-muted-light dark:text-muted-dark">{t("stats.noEstimationData")}</p>;

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

// PeriodSelector

function PeriodSelector({ t, period, setPeriod, customFrom, setCustomFrom, customTo, setCustomTo }) {
  const PERIODS = [
    { key: "today",  label: t("stats.today")       },
    { key: "week",   label: t("stats.thisWeek")     },
    { key: "month",  label: t("stats.thisMonth")    },
    { key: "year",   label: t("stats.thisYear")     },
    { key: "all",    label: t("stats.allTime")      },
    { key: "custom", label: t("stats.customPeriod") },
  ];
  return (
    <>
      <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-white/5 rounded-xl p-1">
        {PERIODS.map(({ key, label }) => (
          <button key={key} onClick={() => setPeriod(key)}
            className={`flex-1 min-w-[48px] px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
              period === key ? "bg-white dark:bg-white/15 text-accent shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >{label}</button>
        ))}
      </div>
      {period === "custom" && (
        <div className="flex gap-2 items-center text-sm">
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="input-field text-sm px-2 py-1" />
          <span className="text-muted-light dark:text-muted-dark">–</span>
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="input-field text-sm px-2 py-1" />
        </div>
      )}
    </>
  );
}

// EnergyHistoryChart

function EnergyHistoryChart({ t, energyLog, period, customFrom, customTo }) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  let filtered = energyLog || [];
  if (period === "today") {
    filtered = filtered.filter((e) => e.date === todayStr);
  } else if (period === "week") {
    const cutoff = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
    filtered = filtered.filter((e) => e.date >= cutoff);
  } else if (period === "month") {
    const cutoff = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    filtered = filtered.filter((e) => e.date >= cutoff);
  } else if (period === "year") {
    filtered = filtered.filter((e) => e.date.slice(0, 4) === todayStr.slice(0, 4));
  } else if (period === "custom" && customFrom && customTo) {
    filtered = filtered.filter((e) => e.date >= customFrom && e.date <= customTo);
  }
  if (filtered.length === 0)
    return <p className="text-xs text-muted-light dark:text-muted-dark">{t("stats.noEnergyData")}</p>;
  const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div className="space-y-1.5">
      {sorted.map((entry, i) => {
        const cfg = ENERGY_COLORS[entry.level] || ENERGY_COLORS.normal;
        return (
          <div key={entry.changedAt || `${entry.date}-${i}`} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-light dark:text-muted-dark w-20 shrink-0">{entry.date}</span>
            <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
              <div className={`h-full rounded-full ${cfg.bg}`} style={{ width: "100%" }} />
            </div>
            <span className={`text-[10px] ${cfg.text} w-16 text-right shrink-0`}>{ENERGY_EMOJI[entry.level] || ""} {t(`home.energy.${entry.level}`)}</span>
          </div>
        );
      })}
    </div>
  );
}

// BrainReportTab

function BrainReportTab({ t, state, resourceMonitorState }) {
  const [period, setPeriod] = useState("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const stats = useFilteredStats(state, period, customFrom, customTo);

  const handleExportJSON = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      period, periodStart: stats.periodStart, periodEnd: stats.periodEnd,
      stats: {
        totalTasks: stats.totalTasks, totalFocusMin: stats.totalFocusMin,
        avgTasksPerDay: stats.avgTasksPerDay, avgFocusPerDay: stats.avgFocusPerDay,
        activeDays: stats.activeDays, consistencyPct: stats.consistencyPct,
        currentStreak: stats.currentStreak, longestStreak: stats.longestStreak,
        level: state.level, xp: state.xp,
        achievements: (state.unlockedAchievements || []).length,
        notMyDayCount: state.notMyDayCount || 0,
      },
      xpLog: state.xpLog || [], dailyCompletionLog: state.dailyCompletionLog || [],
      focusLog: state.focusLog || [], energyLog: state.energyLog || [],
      activitySessions: (resourceMonitorState?.activitySessions || []).slice(-30),
      exportedBy: "Dopamind Brain Report",
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `dopamind-brain-report-${stats.periodStart}-${stats.periodEnd}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const activityChartData = stats.dailyData.map((d) => ({
    label: new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2),
    value: d.tasks,
    color: d.energyLevel === "high" ? "bg-green-400" : d.energyLevel === "low" ? "bg-amber-400" : "bg-blue-400",
  }));

  const focusTimeData = [
    { label: t("stats.morning"),   value: stats.focusByTimeOfDay.morning,   color: "bg-amber-400"  },
    { label: t("stats.afternoon"), value: stats.focusByTimeOfDay.afternoon, color: "bg-blue-400"   },
    { label: t("stats.evening"),   value: stats.focusByTimeOfDay.evening,   color: "bg-purple-400" },
  ];
  const hasFocusTimeData = focusTimeData.some((d) => d.value > 0);
  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        <button onClick={handleExportJSON} className="btn-ghost text-sm flex items-center gap-2 px-4 py-2">
          <Download className="w-4 h-4" />{t("stats.exportJSON")}
        </button>
        <button onClick={() => window.print()} className="btn-ghost text-sm flex items-center gap-2 px-4 py-2">
          <Download className="w-4 h-4" />{t("stats.exportPrint")}
        </button>
      </div>

      <PeriodSelector t={t} period={period} setPeriod={setPeriod} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} />

      {(period === "today" || period === "week") && (state.energyLevel || stats.totalTasks > 0) && (
        <div className="glass-card p-5">
          <div className="flex items-start gap-3">
            {state.energyLevel && <span className="text-2xl mt-0.5">{ENERGY_EMOJI[state.energyLevel] || "😊"}</span>}
            <div>
              <p className="text-sm font-medium leading-relaxed">
                {stats.totalTasks > 0
                  ? t("stats.summaryText", { tasks: stats.totalTasks, focus: formatFocusTime(stats.totalFocusMin) })
                  : t("stats.summaryTextNoTasks")}
              </p>
              {state.compassionModeDate === todayStr && (
                <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">💙 {t("home.compassionMode")}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">{stats.periodLabel}</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-white/5">
            <div className="flex items-center justify-center gap-1.5">
              <p className="text-2xl font-bold text-success">{stats.totalTasks}</p>
              <TrendIndicator value={stats.tasksDelta} />
            </div>
            <p className="text-[10px] text-muted-light dark:text-muted-dark uppercase mt-0.5">{t("stats.completed")}</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-white/5">
            <div className="flex items-center justify-center gap-1.5">
              <p className="text-2xl font-bold text-accent">{formatFocusTime(stats.totalFocusMin)}</p>
              <TrendIndicator value={stats.focusDelta} />
            </div>
            <p className="text-[10px] text-muted-light dark:text-muted-dark uppercase mt-0.5">{t("stats.focusMin")}</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-white/5">
            <p className="text-2xl font-bold text-blue-500">{stats.avgTasksPerDay}</p>
            <p className="text-[10px] text-muted-light dark:text-muted-dark uppercase mt-0.5">{t("stats.avgTasksPerDay")}</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-white/5">
            <p className="text-2xl font-bold text-purple-500">{stats.avgFocusPerDay}<span className="text-sm ml-0.5">{t("common.min")}</span></p>
            <p className="text-[10px] text-muted-light dark:text-muted-dark uppercase mt-0.5">{t("stats.avgFocusPerDay")}</p>
          </div>
        </div>
      </div>

      {activityChartData.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">{t("stats.activityOverTime")}</h3>
          <BarChart data={activityChartData} height={80} />
        </div>
      )}

      {(state.energyLog || []).length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">{t("stats.energyHistory")}</h3>
          <EnergyHistoryChart t={t} energyLog={state.energyLog} period={period} customFrom={customFrom} customTo={customTo} />
        </div>
      )}

      {hasFocusTimeData && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">{t("stats.focusByTimeOfDay")}</h3>
          <BarChart data={focusTimeData} horizontal />
        </div>
      )}

      {stats.filteredTimeLog.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">{t("stats.estimationAccuracy")}</h3>
          <EstimationAccuracySection t={t} timeLog={stats.filteredTimeLog} />
        </div>
      )}

      {(state.notMyDayCount || 0) > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">{t("stats.selfCareScore")}</h3>
          <div className="flex items-center gap-3">
            <span className="text-2xl">💙</span>
            <p className="text-sm leading-relaxed">{t("stats.selfCareLabel", { count: state.notMyDayCount || 0 })}</p>
          </div>
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

// XpHistoryTab

function XpHistoryTab({ t, state }) {
  const [chartPeriod, setChartPeriod] = useState("week");
  const nextLevelXp = state.level * state.level * 50;
  const currentLevelXp = (state.level - 1) * (state.level - 1) * 50;
  const progressPct = Math.min(100, Math.round(((state.xp - currentLevelXp) / Math.max(1, nextLevelXp - currentLevelXp)) * 100));

  const xpLog = state.xpLog || [];
  const daysToShow = chartPeriod === "week" ? 7 : 30;
  const cutoff = new Date(Date.now() - daysToShow * 86400000).toISOString().split("T")[0];

  const xpByDate = {};
  for (const entry of xpLog.filter((e) => e.date >= cutoff)) {
    xpByDate[entry.date] = (xpByDate[entry.date] || 0) + entry.amount;
  }

  const chartData = Array.from({ length: daysToShow }, (_, i) => {
    const d = new Date(Date.now() - (daysToShow - 1 - i) * 86400000).toISOString().split("T")[0];
    const lbl = new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2);
    return { label: lbl, value: xpByDate[d] || 0, color: "bg-yellow-400" };
  });

  const xpBySource = {};
  for (const entry of xpLog) {
    xpBySource[entry.source] = (xpBySource[entry.source] || 0) + entry.amount;
  }
  const totalXpLogged = Object.values(xpBySource).reduce((a, b) => a + b, 0);

  const XP_SOURCES = [
    { key: "task",        label: t("stats.xpFromTasks"),        color: "bg-success"    },
    { key: "focus",       label: t("stats.xpFromFocus"),        color: "bg-accent"     },
    { key: "achievement", label: t("stats.xpFromAchievements"), color: "bg-yellow-400" },
    { key: "challenge",   label: t("stats.xpFromChallenges"),   color: "bg-orange-400" },
    { key: "focus_start", label: t("stats.xpFromFocusStart"),   color: "bg-purple-400" },
    { key: "streak",      label: t("stats.xpFromStreak"),       color: "bg-red-400"    },
  ];

  const avgXpPerDay = (() => {
    if (xpLog.length === 0) return 0;
    const uniqueDates = [...new Set(xpLog.map((e) => e.date))];
    const total = xpLog.reduce((s, e) => s + e.amount, 0);
    return uniqueDates.length > 0 ? Math.round(total / uniqueDates.length) : 0;
  })();

  const milestones = Array.from({ length: 3 }, (_, i) => {
    const l = state.level + 1 + i;
    const needed = Math.max(0, l * l * 50 - state.xp);
    return { level: l, xpNeeded: needed, daysEst: avgXpPerDay > 0 && needed > 0 ? Math.ceil(needed / avgXpPerDay) : null };
  });

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

      {xpLog.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider">{t("stats.xpHistory")}</h3>
            <div className="flex gap-1">
              {["week", "month"].map((p) => (
                <button key={p} onClick={() => setChartPeriod(p)}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${chartPeriod === p ? "bg-white dark:bg-white/15 text-accent shadow-sm" : "text-gray-500 dark:text-gray-400"}`}
                >{p === "week" ? t("stats.thisWeek") : "30d"}</button>
              ))}
            </div>
          </div>
          <BarChart data={chartData} height={80} />
        </div>
      )}

      {totalXpLogged > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">{t("stats.xpSources")}</h3>
          <div className="space-y-3">
            {XP_SOURCES.filter((s) => (xpBySource[s.key] || 0) > 0).map((s) => {
              const val = xpBySource[s.key] || 0;
              const pct = Math.round((val / totalXpLogged) * 100);
              return (
                <div key={s.key} className="text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{s.label}</span>
                    <span className="font-mono text-muted-light dark:text-muted-dark">{val} XP ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                    <div className={`h-full rounded-full ${s.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">{t("stats.milestones")}</h3>
        <div className="space-y-2">
          {avgXpPerDay > 0 && (
            <div className="flex justify-between text-sm mb-3">
              <span className="text-muted-light dark:text-muted-dark">{t("stats.avgXpPerDay")}</span>
              <span className="font-medium">{avgXpPerDay} XP</span>
            </div>
          )}
          {milestones.map((m) => {
            const levelXpBase = (m.level - 1) * (m.level - 1) * 50;
            const levelXpTop = m.level * m.level * 50;
            const pct = Math.min(100, Math.round(((state.xp - levelXpBase) / Math.max(1, levelXpTop - levelXpBase)) * 100));
            return (
              <div key={m.level} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-white/5">
                <span className="text-purple-500 font-bold text-sm w-8 shrink-0">L{m.level}</span>
                <div className="flex-1 min-w-0">
                  <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-accent to-purple-500" style={{ width: `${Math.max(0, pct)}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-light dark:text-muted-dark mt-0.5">
                    {m.xpNeeded > 0 ? `${m.xpNeeded} XP ${t("stats.toNextLevel")}${m.daysEst ? ` · ~${m.daysEst}d` : ""}` : "✓"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// AnalysisTab

function AnalysisTab({ t, state }) {
  const [period, setPeriod] = useState("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const stats = useFilteredStats(state, period, customFrom, customTo);

  const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  const activityData = stats.dailyData.slice(-30).map((d) => ({
    label: new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2),
    value: d.tasks,
    color: "bg-success",
  }));

  const sizeData = (() => {
    const counts = { quick: 0, short: 0, medium: 0, long: 0 };
    for (const entry of state.timeLog || []) {
      if (entry.sizeCategory && counts[entry.sizeCategory] !== undefined) counts[entry.sizeCategory]++;
    }
    return counts;
  })();
  const totalSizes = Object.values(sizeData).reduce((a, b) => a + b, 0);

  const todayStr = new Date().toISOString().split("T")[0];
  const streakDots = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000).toISOString().split("T")[0];
    if (d === todayStr) return state.completedToday > 0 || state.focusMinutesToday > 0;
    const entry = (state.dailyCompletionLog || []).find((e) => e.date === d);
    return !!(entry && (entry.tasks > 0 || entry.focusMin > 0));
  });

  const energyLevels = [
    { key: "high",   label: t("home.energy.high"),   color: "bg-green-400", emoji: "⚡" },
    { key: "normal", label: t("home.energy.normal"),  color: "bg-blue-400",  emoji: "😊" },
    { key: "low",    label: t("home.energy.low"),     color: "bg-amber-400", emoji: "🌱" },
  ];
  const maxEnergyTasks = Math.max(stats.energyProductivity.high.avgTasks, stats.energyProductivity.normal.avgTasks, stats.energyProductivity.low.avgTasks, 1);
  const totalEnergyDays = stats.energyProductivity.high.days + stats.energyProductivity.normal.days + stats.energyProductivity.low.days;

  const strongestDaysLabel = stats.weekdayHeatmap
    .map((v, i) => ({ v, label: WEEKDAY_LABELS[i] }))
    .filter((d) => d.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, 2)
    .map((d) => d.label)
    .join(" & ");

  return (
    <div className="space-y-5">
      <PeriodSelector t={t} period={period} setPeriod={setPeriod} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} />

      {activityData.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">{t("stats.activityOverTime")}</h3>
          <BarChart data={activityData} height={80} />
        </div>
      )}

      {stats.activeDays > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">{t("stats.weekdayHeatmap")}</h3>
          <HeatmapGrid data={stats.weekdayHeatmap} labels={WEEKDAY_LABELS} />
          {strongestDaysLabel && (
            <p className="text-xs text-muted-light dark:text-muted-dark mt-3">{t("stats.strongestDays", { days: strongestDaysLabel })}</p>
          )}
        </div>
      )}

      {totalEnergyDays > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">{t("stats.energyCorrelation")}</h3>
          <div className="space-y-3">
            {energyLevels.map(({ key, label, color, emoji }) => {
              const data = stats.energyProductivity[key];
              if (data.days === 0) return null;
              return (
                <div key={key} className="text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{emoji} {label} ({data.days}×)</span>
                    <span className="text-muted-light dark:text-muted-dark">Ø {data.avgTasks} Tasks · Ø {data.avgFocusMin}m</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.round((data.avgTasks / maxEnergyTasks) * 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {totalSizes > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">{t("stats.taskSizeDistribution")}</h3>
          <div className="space-y-2">
            {SIZE_ORDER.map((key) => {
              const count = sizeData[key];
              if (!count) return null;
              const pct = Math.round((count / totalSizes) * 100);
              return (
                <div key={key} className="text-xs">
                  <div className="flex justify-between mb-0.5">
                    <span className="font-medium">{t(`tasks.size.${key}`)}</span>
                    <span className="text-muted-light dark:text-muted-dark">{count}× ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                    <div className={`h-full rounded-full ${SIZE_BAR_COLORS[key]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">{t("stats.consistencyScore")}</h3>
        <div className="space-y-4">
          {stats.totalDays > 1 && (
            <>
              <p className="text-xs text-muted-light dark:text-muted-dark">
                {t("stats.consistencyText", { active: stats.activeDays, total: stats.totalDays, pct: stats.consistencyPct })}
              </p>
              <div className="w-full h-3 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-success to-accent transition-all" style={{ width: `${stats.consistencyPct}%` }} />
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <StatCard label={t("stats.currentStreak")} value={state.currentStreakDays || 0} color="text-warn" />
            <StatCard label={t("stats.longestStreak")} value={state.longestStreakDays || 0} color="text-orange-500" />
          </div>
          <div className="flex gap-0.5 flex-wrap">
            {streakDots.map((active, i) => (
              <div key={i} className={`w-3 h-3 rounded-sm transition-colors ${active ? "bg-accent" : "bg-gray-100 dark:bg-white/10"}`} />
            ))}
          </div>
        </div>
      </div>

      {(state.focusLog || []).length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">{t("stats.focusQuality")}</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                <p className="text-xl font-bold text-accent">{formatFocusTime(state.totalFocusMinutes || 0)}</p>
                <p className="text-[10px] text-muted-light dark:text-muted-dark uppercase mt-0.5">{t("stats.totalFocus")}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                <p className="text-xl font-bold text-green-500">{state.focusBlocksToday || 0}</p>
                <p className="text-[10px] text-muted-light dark:text-muted-dark uppercase mt-0.5">{t("stats.focusBlocksToday")}</p>
              </div>
            </div>
            {(state.timeLog || []).length > 0 && <EstimationAccuracySection t={t} timeLog={state.timeLog} />}
          </div>
        </div>
      )}
    </div>
  );
}

// Tabs

const TABS = [
  { key: "report",       icon: Brain,      labelKey: "stats.tabReport"       },
  { key: "achievements", icon: Trophy,     labelKey: "stats.tabAchievements" },
  { key: "xp",          icon: TrendingUp, labelKey: "stats.tabXP"           },
  { key: "analysis",    icon: BarChart2,  labelKey: "stats.tabAnalysis"     },
];

export default function AchievementsPage() {
  const { t } = useI18n();
  const { state } = useApp();
  const { state: rmState } = useResourceMonitor();
  const [activeTab, setActiveTab] = useState("report");

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-xl font-semibold">{t("stats.pageTitle")}</h1>
      <div className="flex gap-1 bg-gray-100 dark:bg-white/5 rounded-xl p-1">
        {TABS.map(({ key, icon: Icon, labelKey }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === key ? "bg-white dark:bg-white/15 text-accent shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t(labelKey)}</span>
          </button>
        ))}
      </div>
      {activeTab === "report"       && <BrainReportTab t={t} state={state} resourceMonitorState={rmState} />}
      {activeTab === "achievements" && <AchievementsPanel />}
      {activeTab === "xp"           && <XpHistoryTab t={t} state={state} />}
      {activeTab === "analysis"     && <AnalysisTab t={t} state={state} />}
    </div>
  );
}
