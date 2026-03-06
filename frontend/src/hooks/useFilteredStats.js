import { useMemo } from "react";

function getWeekStart(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function getDayCount(startStr, endStr) {
  const start = new Date(startStr + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}

function getPrevPeriodBounds(periodStart, periodEnd) {
  const dayCount = getDayCount(periodStart, periodEnd);
  const startDate = new Date(periodStart + "T00:00:00");
  const prevEnd = new Date(startDate.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - (dayCount - 1) * 86400000);
  return {
    start: prevStart.toISOString().split("T")[0],
    end: prevEnd.toISOString().split("T")[0],
  };
}

function getWeekNumber(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

export function useFilteredStats(state, period, customFrom, customTo) {
  return useMemo(() => {
    const today = new Date().toISOString().split("T")[0];

    // Compute period bounds
    let periodStart, periodEnd;
    if (period === "today") {
      periodStart = today;
      periodEnd = today;
    } else if (period === "week") {
      periodStart = getWeekStart(today);
      periodEnd = today;
    } else if (period === "month") {
      periodStart = today.slice(0, 7) + "-01";
      periodEnd = today;
    } else if (period === "year") {
      periodStart = today.slice(0, 4) + "-01-01";
      periodEnd = today;
    } else if (period === "all") {
      const allDates = [
        ...(state.dailyCompletionLog || []).map((d) => d.date),
        ...(state.xpLog || []).map((e) => e.date),
      ];
      periodStart = allDates.length > 0 ? allDates.reduce((a, b) => (a < b ? a : b)) : today;
      periodEnd = today;
    } else if (period === "custom" && customFrom && customTo) {
      periodStart = customFrom;
      periodEnd = customTo;
    } else {
      periodStart = today;
      periodEnd = today;
    }

    // Build daily data (from log + today's live state)
    const dailyLog = (state.dailyCompletionLog || []).filter(
      (d) => d.date >= periodStart && d.date <= periodEnd
    );

    let dailyData = [...dailyLog];
    if (today >= periodStart && today <= periodEnd) {
      const hasTodayInLog = dailyLog.some((d) => d.date === today);
      const todayEntry = {
        date: today,
        tasks: state.completedToday || 0,
        focusMin: state.focusMinutesToday || 0,
        focusBlocks: state.focusBlocksToday || 0,
        energyLevel: state.energyLevel || null,
      };
      if (!hasTodayInLog) {
        dailyData = [...dailyData, todayEntry];
      } else {
        dailyData = dailyData.map((d) => (d.date === today ? todayEntry : d));
      }
    }
    dailyData.sort((a, b) => a.date.localeCompare(b.date));

    // Core KPIs
    const totalTasks = dailyData.reduce((s, d) => s + d.tasks, 0);
    const totalFocusMin = dailyData.reduce((s, d) => s + d.focusMin, 0);
    const activeDays = dailyData.filter((d) => d.tasks > 0 || d.focusMin > 0).length;
    const totalDays = getDayCount(periodStart, periodEnd);
    const consistencyPct = totalDays > 0 ? Math.round((activeDays / totalDays) * 100) : 0;
    const avgTasksPerDay = activeDays > 0 ? Math.round((totalTasks / activeDays) * 10) / 10 : 0;
    const avgFocusPerDay = activeDays > 0 ? Math.round(totalFocusMin / activeDays) : 0;

    // Previous period deltas
    const { start: prevStart, end: prevEnd } = getPrevPeriodBounds(periodStart, periodEnd);
    const prevDailyData = (state.dailyCompletionLog || []).filter(
      (d) => d.date >= prevStart && d.date <= prevEnd
    );
    const prevTasks = prevDailyData.reduce((s, d) => s + d.tasks, 0);
    const prevFocus = prevDailyData.reduce((s, d) => s + d.focusMin, 0);
    const tasksDelta = prevTasks > 0 ? Math.round(((totalTasks - prevTasks) / prevTasks) * 100) : null;
    const focusDelta = prevFocus > 0 ? Math.round(((totalFocusMin - prevFocus) / prevFocus) * 100) : null;

    // XP data for the period
    const xpData = (state.xpLog || []).filter(
      (e) => e.date >= periodStart && e.date <= periodEnd
    );

    // Energy log for the period
    const energyData = (state.energyLog || []).filter(
      (e) => e.date >= periodStart && e.date <= periodEnd
    );

    // Focus by time of day (from focusLog)
    const focusByTimeOfDay = { morning: 0, afternoon: 0, evening: 0 };
    for (const entry of (state.focusLog || []).filter(
      (e) => e.date >= periodStart && e.date <= periodEnd
    )) {
      if (entry.hour >= 5 && entry.hour < 12) focusByTimeOfDay.morning += entry.minutes;
      else if (entry.hour >= 12 && entry.hour < 17) focusByTimeOfDay.afternoon += entry.minutes;
      else if (entry.hour >= 17 && entry.hour < 24) focusByTimeOfDay.evening += entry.minutes;
    }

    // Weekday heatmap (Mo=0, So=6), tasks per weekday
    const weekdayHeatmap = [0, 0, 0, 0, 0, 0, 0];
    for (const day of dailyData) {
      const d = new Date(day.date + "T00:00:00");
      const dow = d.getDay(); // 0=Sun
      const idx = dow === 0 ? 6 : dow - 1; // Mo=0, So=6
      weekdayHeatmap[idx] += day.tasks;
    }

    // Energy-productivity correlation
    const energyProductivity = {
      high: { tasks: 0, focusMin: 0, days: 0, avgTasks: 0, avgFocusMin: 0 },
      normal: { tasks: 0, focusMin: 0, days: 0, avgTasks: 0, avgFocusMin: 0 },
      low: { tasks: 0, focusMin: 0, days: 0, avgTasks: 0, avgFocusMin: 0 },
    };
    for (const day of dailyData) {
      const lvl = day.energyLevel;
      if (lvl && energyProductivity[lvl]) {
        energyProductivity[lvl].tasks += day.tasks;
        energyProductivity[lvl].focusMin += day.focusMin;
        energyProductivity[lvl].days++;
      }
    }
    for (const k of Object.keys(energyProductivity)) {
      const e = energyProductivity[k];
      e.avgTasks = e.days > 0 ? Math.round((e.tasks / e.days) * 10) / 10 : 0;
      e.avgFocusMin = e.days > 0 ? Math.round(e.focusMin / e.days) : 0;
    }

    // Estimation data filtered by period
    const filteredTimeLog = (state.timeLog || []).filter(
      (e) => !e.date || (e.date >= periodStart && e.date <= periodEnd)
    );

    // Period label
    const formatShortDate = (d) => {
      if (!d) return "";
      const dt = new Date(d + "T00:00:00");
      return dt.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" });
    };

    let periodLabel;
    if (period === "today") {
      periodLabel = new Date(today + "T00:00:00").toLocaleDateString(undefined, {
        weekday: "long",
        day: "2-digit",
        month: "long",
      });
    } else if (period === "week") {
      periodLabel = `KW ${getWeekNumber(today)} · ${formatShortDate(periodStart)}–${formatShortDate(today)}`;
    } else if (period === "month") {
      periodLabel = new Date(today + "T00:00:00").toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
    } else if (period === "year") {
      periodLabel = today.slice(0, 4);
    } else if (period === "all") {
      periodLabel = periodStart !== today
        ? `${formatShortDate(periodStart)} – ${formatShortDate(today)}`
        : formatShortDate(today);
    } else {
      periodLabel = `${formatShortDate(periodStart)} – ${formatShortDate(periodEnd)}`;
    }

    return {
      totalTasks,
      totalFocusMin,
      avgTasksPerDay,
      avgFocusPerDay,
      activeDays,
      totalDays,
      consistencyPct,
      tasksDelta,
      focusDelta,
      dailyData,
      xpData,
      energyData,
      focusByTimeOfDay,
      weekdayHeatmap,
      energyProductivity,
      filteredTimeLog,
      currentStreak: state.currentStreakDays || 0,
      longestStreak: state.longestStreakDays || 0,
      periodLabel,
      periodStart,
      periodEnd,
    };
  }, [state, period, customFrom, customTo]);
}
