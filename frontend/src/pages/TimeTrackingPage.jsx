import { useState, useEffect } from "react";
import { useI18n } from "../i18n/I18nContext";
import { useTimeTracking } from "../context/TimeTrackingContext";
import { useSettings } from "../context/SettingsContext";
import { useSearchParams } from "react-router-dom";
import { Play, Square, Coffee, Trash2, Plus, Pencil, Check, X } from "lucide-react";
import FocusTimer from "../components/FocusTimer";

function formatMinutes(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${String(m).padStart(2, "0")}min`;
}

function LiveClock({ getMinutes }) {
  const [display, setDisplay] = useState(getMinutes());

  useEffect(() => {
    const iv = setInterval(() => setDisplay(getMinutes()), 10000);
    return () => clearInterval(iv);
  }, [getMinutes]);

  return <span>{formatMinutes(display)}</span>;
}

export default function TimeTrackingPage() {
  const { t } = useI18n();
  const { state, dispatch, getSessionMinutes, getTodayMinutes, getWeekMinutes, isOnBreak } = useTimeTracking();
  const { settings } = useSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") === "focus" ? "focus" : "workTime");
  const [showAbsenceForm, setShowAbsenceForm] = useState(false);
  const todayStr = new Date().toISOString().slice(0, 10);
  const [absence, setAbsence] = useState({ startDate: todayStr, endDate: todayStr, type: "vacation", note: "" });
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [editEntry, setEditEntry] = useState(null);
  const [editingAbsenceId, setEditingAbsenceId] = useState(null);
  const [editAbsence, setEditAbsence] = useState(null);

  const isClockedIn = !!state.currentSession;

  // Work schedule calculations
  const workStart = settings.workSchedule.start;
  const workEnd = settings.workSchedule.end;
  const [startH, startM] = workStart.split(":").map(Number);
  const [endH, endM] = workEnd.split(":").map(Number);
  const targetMinutesDay = (endH * 60 + endM) - (startH * 60 + startM) - settings.workSchedule.breakMinutes;

  const todayMinutes = getTodayMinutes();
  const weekMinutes = getWeekMinutes();
  const weekTarget = targetMinutesDay * settings.workSchedule.workDays.length;
  const balance = weekMinutes - weekTarget;

  const handleAbsenceSubmit = (e) => {
    e.preventDefault();
    dispatch({ type: "ADD_ABSENCE", payload: absence });
    setShowAbsenceForm(false);
    const today = new Date().toISOString().slice(0, 10);
    setAbsence({ startDate: today, endDate: today, type: "vacation", note: "" });
  };

  const startEditEntry = (entry) => {
    setEditingEntryId(entry.id);
    const ciDate = new Date(entry.clockIn);
    const coDate = new Date(entry.clockOut);
    setEditEntry({
      date: entry.date,
      clockInTime: ciDate.toTimeString().slice(0, 5),
      clockOutTime: coDate.toTimeString().slice(0, 5),
    });
  };

  const saveEditEntry = (e, entryId) => {
    e.preventDefault();
    const [ciH, ciM] = editEntry.clockInTime.split(":").map(Number);
    const [coH, coM] = editEntry.clockOutTime.split(":").map(Number);
    const base = new Date(editEntry.date + "T00:00:00");
    const clockIn = new Date(base); clockIn.setHours(ciH, ciM, 0, 0);
    const clockOut = new Date(base); clockOut.setHours(coH, coM, 0, 0);
    const totalMinutes = Math.max(0, Math.round((clockOut - clockIn) / 60000));
    dispatch({ type: "UPDATE_ENTRY", payload: { id: entryId, date: editEntry.date, clockIn: clockIn.getTime(), clockOut: clockOut.getTime(), totalMinutes } });
    setEditingEntryId(null);
    setEditEntry(null);
  };

  const startEditAbsence = (a) => {
    setEditingAbsenceId(a.id);
    setEditAbsence({ startDate: a.startDate || a.date, endDate: a.endDate || a.date, type: a.type, note: a.note || "" });
  };

  const saveEditAbsence = (e, absenceId) => {
    e.preventDefault();
    dispatch({ type: "UPDATE_ABSENCE", payload: { id: absenceId, ...editAbsence } });
    setEditingAbsenceId(null);
    setEditAbsence(null);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <h2 className="sr-only">{t("timeTracking.title")}</h2>
      <div className="flex items-center gap-1 border-b border-gray-200/50 dark:border-white/5">
        <button
          onClick={() => { setActiveTab("workTime"); setSearchParams({}); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "workTime"
              ? "border-accent text-accent"
              : "border-transparent text-muted-light dark:text-muted-dark hover:text-foreground-light dark:hover:text-foreground-dark"
          }`}
        >
          {t("timeTracking.tabWorkTime")}
        </button>
        <button
          onClick={() => { setActiveTab("focus"); setSearchParams({ tab: "focus" }); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "focus"
              ? "border-accent text-accent"
              : "border-transparent text-muted-light dark:text-muted-dark hover:text-foreground-light dark:hover:text-foreground-dark"
          }`}
        >
          {t("timeTracking.tabFocus")}
        </button>
      </div>

      {activeTab === "focus" ? (
        <div className="max-w-sm">
          <FocusTimer />
        </div>
      ) : (
      <>

      {/* Clock Widget */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Big Clock Button */}
          <button
            onClick={() => dispatch({ type: isClockedIn ? "CLOCK_OUT" : "CLOCK_IN" })}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
              isClockedIn
                ? "bg-danger/10 hover:bg-danger/20 text-danger ring-2 ring-danger/30"
                : "bg-success/10 hover:bg-success/20 text-success ring-2 ring-success/30"
            }`}
          >
            {isClockedIn ? <Square className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
          </button>

          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm font-medium text-muted-light dark:text-muted-dark uppercase tracking-wider">
              {isClockedIn ? t("timeTracking.currentSession") : t("timeTracking.clockIn")}
            </p>
            {isClockedIn ? (
              <div className="text-3xl font-mono font-semibold mt-1">
                <LiveClock getMinutes={getSessionMinutes} />
              </div>
            ) : (
              <p className="text-lg font-semibold mt-1">
                {t("timeTracking.clockIn")}
              </p>
            )}
            {isClockedIn && (
              <p className="text-xs text-muted-light dark:text-muted-dark mt-1">
                {t("timeTracking.clockIn")}: {new Date(state.currentSession.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>

          {/* Break Button */}
          {isClockedIn && (
            <button
              onClick={() => dispatch({ type: isOnBreak ? "END_BREAK" : "START_BREAK" })}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isOnBreak
                  ? "bg-warn/10 text-amber-700 dark:text-warn ring-1 ring-warn/20 animate-pulse-soft"
                  : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
              }`}
            >
              <Coffee className="w-4 h-4" />
              {isOnBreak ? t("timeTracking.endBreak") : t("timeTracking.startBreak")}
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold font-mono text-accent">{formatMinutes(todayMinutes)}</p>
          <p className="text-[10px] text-muted-light dark:text-muted-dark mt-1 uppercase tracking-wider">{t("timeTracking.todayTotal")}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold font-mono">{formatMinutes(targetMinutesDay)}</p>
          <p className="text-[10px] text-muted-light dark:text-muted-dark mt-1 uppercase tracking-wider">{t("timeTracking.target")}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold font-mono">{formatMinutes(weekMinutes)}</p>
          <p className="text-[10px] text-muted-light dark:text-muted-dark mt-1 uppercase tracking-wider">{t("timeTracking.weekTotal")}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className={`text-2xl font-bold font-mono ${balance >= 0 ? "text-success" : "text-danger"}`}>
            {balance >= 0 ? "+" : ""}{formatMinutes(Math.abs(balance))}
          </p>
          <p className="text-[10px] text-muted-light dark:text-muted-dark mt-1 uppercase tracking-wider">{t("timeTracking.balance")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Time Log */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">
            {t("timeTracking.log")}
          </h3>
          {state.entries.length === 0 ? (
            <p className="text-sm text-muted-light dark:text-muted-dark text-center py-4">
              {t("timeTracking.noEntries")}
            </p>
          ) : (
            <div className="space-y-2">
              {state.entries.slice(0, 14).map((entry) => {
                if (editingEntryId === entry.id) {
                  return (
                    <form key={entry.id} onSubmit={(e) => saveEditEntry(e, entry.id)} className="space-y-2 p-2 rounded-xl bg-gray-50 dark:bg-white/5">
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={editEntry.date}
                          onChange={(e) => setEditEntry((d) => ({ ...d, date: e.target.value }))}
                          className="flex-1 px-2 py-1 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-accent/30"
                        />
                        <input
                          type="time"
                          value={editEntry.clockInTime}
                          onChange={(e) => setEditEntry((d) => ({ ...d, clockInTime: e.target.value }))}
                          className="w-24 px-2 py-1 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-accent/30"
                        />
                        <span className="text-xs text-muted-light">–</span>
                        <input
                          type="time"
                          value={editEntry.clockOutTime}
                          onChange={(e) => setEditEntry((d) => ({ ...d, clockOutTime: e.target.value }))}
                          className="w-24 px-2 py-1 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-accent/30"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="btn-primary text-xs py-1 flex items-center gap-1"><Check className="w-3 h-3" /> {t("common.save")}</button>
                        <button type="button" onClick={() => setEditingEntryId(null)} className="btn-ghost text-xs py-1"><X className="w-3 h-3" /></button>
                      </div>
                    </form>
                  );
                }
                return (
                  <div key={entry.id} className="group flex items-center gap-3 py-2 px-1">
                    <div className="text-xs font-mono text-muted-light dark:text-muted-dark w-20">
                      {new Date(entry.date).toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "2-digit" })}
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-xs font-mono">
                        {new Date(entry.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full"
                          style={{ width: `${Math.min((entry.totalMinutes / targetMinutesDay) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono">
                        {new Date(entry.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-medium w-16 text-right">
                      {formatMinutes(entry.totalMinutes)}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => startEditEntry(entry)}
                        className="w-6 h-6 rounded flex items-center justify-center text-muted-light hover:text-accent transition-all"
                        title={t("common.edit")}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => dispatch({ type: "DELETE_ENTRY", payload: entry.id })}
                        className="w-6 h-6 rounded flex items-center justify-center text-muted-light hover:text-danger transition-all"
                        title={t("common.delete")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Absences */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider">
              {t("timeTracking.absence")}
            </h3>
            <button
              onClick={() => setShowAbsenceForm(!showAbsenceForm)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/5 text-accent"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {showAbsenceForm && (
            <form onSubmit={handleAbsenceSubmit} className="space-y-3 mb-4 pb-4 border-b border-gray-200/50 dark:border-white/5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-light dark:text-muted-dark uppercase tracking-wider mb-1 block">{t("timeTracking.absenceFrom")}</label>
                  <input
                    type="date"
                    value={absence.startDate}
                    onChange={(e) => setAbsence((a) => ({ ...a, startDate: e.target.value, endDate: a.endDate < e.target.value ? e.target.value : a.endDate }))}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-light dark:text-muted-dark uppercase tracking-wider mb-1 block">{t("timeTracking.absenceTo")}</label>
                  <input
                    type="date"
                    value={absence.endDate}
                    min={absence.startDate}
                    onChange={(e) => setAbsence((a) => ({ ...a, endDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
              </div>
              <select
                value={absence.type}
                onChange={(e) => setAbsence((a) => ({ ...a, type: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                {Object.entries(t("timeTracking.absenceTypes")).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <input
                type="text"
                value={absence.note}
                onChange={(e) => setAbsence((a) => ({ ...a, note: e.target.value }))}
                placeholder={t("timeTracking.absenceNote")}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <button type="submit" className="btn-primary text-sm w-full">{t("common.save")}</button>
            </form>
          )}

          {state.absences.length === 0 && !showAbsenceForm ? (
            <p className="text-sm text-muted-light dark:text-muted-dark text-center py-4">
              {t("timeTracking.noEntries")}
            </p>
          ) : (
            <div className="space-y-2">
              {state.absences.map((a) => {
                if (editingAbsenceId === a.id) {
                  return (
                    <form key={a.id} onSubmit={(e) => saveEditAbsence(e, a.id)} className="space-y-2 p-2 rounded-xl bg-gray-50 dark:bg-white/5">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={editAbsence.startDate}
                          onChange={(e) => setEditAbsence((d) => ({ ...d, startDate: e.target.value, endDate: d.endDate < e.target.value ? e.target.value : d.endDate }))}
                          className="px-2 py-1 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-accent/30"
                        />
                        <input
                          type="date"
                          value={editAbsence.endDate}
                          min={editAbsence.startDate}
                          onChange={(e) => setEditAbsence((d) => ({ ...d, endDate: e.target.value }))}
                          className="px-2 py-1 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-accent/30"
                        />
                      </div>
                      <select
                        value={editAbsence.type}
                        onChange={(e) => setEditAbsence((d) => ({ ...d, type: e.target.value }))}
                        className="w-full px-2 py-1 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-accent/30"
                      >
                        {Object.entries(t("timeTracking.absenceTypes")).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={editAbsence.note}
                        onChange={(e) => setEditAbsence((d) => ({ ...d, note: e.target.value }))}
                        placeholder={t("timeTracking.absenceNote")}
                        className="w-full px-2 py-1 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-accent/30"
                      />
                      <div className="flex gap-2">
                        <button type="submit" className="btn-primary text-xs py-1 flex items-center gap-1"><Check className="w-3 h-3" /> {t("common.save")}</button>
                        <button type="button" onClick={() => setEditingAbsenceId(null)} className="btn-ghost text-xs py-1"><X className="w-3 h-3" /></button>
                      </div>
                    </form>
                  );
                }
                const start = a.startDate || a.date;
                const end = a.endDate || a.date;
                const isRange = start !== end;
                const dayCount = isRange ? Math.round((new Date(end) - new Date(start)) / 86400000) + 1 : 1;
                return (
                  <div key={a.id} className="group flex items-center gap-3 py-2">
                    <span className="text-xs font-mono text-muted-light dark:text-muted-dark min-w-[80px]">
                      {new Date(start + "T00:00:00").toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" })}
                      {isRange && (
                        <> – {new Date(end + "T00:00:00").toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" })}</>
                      )}
                    </span>
                    {isRange && (
                      <span className="text-[10px] text-muted-light dark:text-muted-dark font-mono">
                        {dayCount} {t("timeTracking.days")}
                      </span>
                    )}
                    <span className={`badge text-[10px] ${
                      a.type === "vacation" ? "bg-accent/10 text-accent" :
                      a.type === "sick" ? "bg-danger/10 text-danger" :
                      a.type === "childSick" ? "bg-warn/10 text-amber-700" :
                      "bg-success/10 text-success"
                    }`}>
                      {t(`timeTracking.absenceTypes.${a.type}`)}
                    </span>
                    {a.note && <span className="text-xs text-muted-light dark:text-muted-dark truncate flex-1">{a.note}</span>}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all ml-auto">
                      <button
                        onClick={() => startEditAbsence(a)}
                        className="w-6 h-6 rounded flex items-center justify-center text-muted-light hover:text-accent transition-all"
                        title={t("common.edit")}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => dispatch({ type: "DELETE_ABSENCE", payload: a.id })}
                        className="w-6 h-6 rounded flex items-center justify-center text-muted-light hover:text-danger transition-all"
                        title={t("common.delete")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}
