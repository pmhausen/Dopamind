import { useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import { useResourceMonitor } from "../context/ResourceMonitorContext";
import { useSettings } from "../context/SettingsContext";
import { useSearchParams } from "react-router-dom";
import { Trash2, Plus, Pencil, Check, X, Activity, Coffee, Calendar as CalIcon } from "lucide-react";
import FocusTimer from "../components/FocusTimer";

function formatMinutes(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${String(m).padStart(2, "0")}min`;
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Activity overview tab
function ActivityTab({ t, state, getTodayActivity }) {
  const today = getTodayActivity();
  const recentSessions = (state.activitySessions || []).slice(0, 14);

  return (
    <div className="space-y-5">
      {/* Today's activity card */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">
          {t("resourceMonitor.todayActivity")}
        </h3>
        {today ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm font-medium">{t("resourceMonitor.activeSince")} {formatTime(today.firstActivity)}</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="glass-card p-3 text-center">
                <p className="text-xl font-bold font-mono text-accent">{formatTime(today.firstActivity)}</p>
                <p className="text-[10px] text-muted-light dark:text-muted-dark uppercase tracking-wider mt-1">{t("resourceMonitor.firstActivity")}</p>
              </div>
              <div className="glass-card p-3 text-center">
                <p className="text-xl font-bold font-mono">{formatTime(today.lastActivity)}</p>
                <p className="text-[10px] text-muted-light dark:text-muted-dark uppercase tracking-wider mt-1">{t("resourceMonitor.lastActivity")}</p>
              </div>
              <div className="glass-card p-3 text-center">
                <p className="text-xl font-bold font-mono text-accent">{(today.focusBlocks || []).length}</p>
                <p className="text-[10px] text-muted-light dark:text-muted-dark uppercase tracking-wider mt-1">{t("resourceMonitor.focusBlocks")}</p>
              </div>
              <div className="glass-card p-3 text-center">
                <p className="text-xl font-bold font-mono">{today.tasksCompleted || 0}</p>
                <p className="text-[10px] text-muted-light dark:text-muted-dark uppercase tracking-wider mt-1">{t("resourceMonitor.tasksCompleted")}</p>
              </div>
            </div>
            {(today.impliedBreaks || []).length > 0 && (
              <div>
                <p className="text-xs text-muted-light dark:text-muted-dark uppercase tracking-wider mb-2">{t("resourceMonitor.impliedBreaks")}</p>
                <div className="flex flex-wrap gap-2">
                  {today.impliedBreaks.map((b, i) => {
                    const durMin = Math.round((b.end - b.start) / 60000);
                    return (
                      <span key={i} className="badge bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs">
                        <Coffee className="w-3 h-3 mr-1 inline" />
                        {formatTime(b.start)} – {formatTime(b.end)} ({durMin}min)
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-light dark:text-muted-dark text-center py-4">
            {t("resourceMonitor.noActivityYet")}
          </p>
        )}
      </div>

      {/* Recent activity sessions */}
      {recentSessions.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">
            {t("resourceMonitor.weekPattern")}
          </h3>
          <div className="space-y-2">
            {recentSessions.map((session) => {
              const durMin = session.lastActivity && session.firstActivity
                ? Math.round((session.lastActivity - session.firstActivity) / 60000)
                : 0;
              return (
                <div key={session.id || session.date} className="flex items-center gap-3 py-2 px-1">
                  <div className="text-xs font-mono text-muted-light dark:text-muted-dark w-20">
                    {new Date(session.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "2-digit" })}
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-xs font-mono">{formatTime(session.firstActivity)}</span>
                    <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(durMin / 480 * 100, 100)}%` }} />
                    </div>
                    <span className="text-xs font-mono">{formatTime(session.lastActivity)}</span>
                  </div>
                  <span className="text-xs font-mono font-medium w-16 text-right">{formatMinutes(durMin)}</span>
                  <div className="flex gap-2 text-[10px] text-muted-light dark:text-muted-dark">
                    <span>🎯 {session.tasksCompleted || 0}</span>
                    <span>🧠 {(session.focusBlocks || []).length}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Absence management tab
function AbsenceTab({ t, state, dispatch }) {
  const isAbsent = !!state.absenceMode;
  const isSick = state.absenceMode?.type === "sick";
  const isOnVacation = state.absenceMode?.type === "vacation";
  const todayStr = new Date().toISOString().slice(0, 10);
  const [vacationStart, setVacationStart] = useState(todayStr);
  const [vacationEnd, setVacationEnd] = useState(todayStr);
  const [note, setNote] = useState("");

  return (
    <div className="space-y-5">
      {/* Active absence mode */}
      {isAbsent && (
        <div className={`glass-card p-6 ${isSick ? "border-l-4 border-danger" : "border-l-4 border-accent"}`}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{isSick ? "🤒" : "🏖️"}</span>
            <div>
              <h3 className="text-base font-semibold">{isSick ? t("absence.sickMode") : t("absence.vacationMode")}</h3>
              <p className="text-sm text-muted-light dark:text-muted-dark">
                {isSick
                  ? t("absence.sickActive")
                  : t("absence.vacationActive").replace("{endDate}", state.absenceMode?.endDate || "")}
              </p>
            </div>
          </div>
          <button
            onClick={() => dispatch({ type: "DEACTIVATE_ABSENCE" })}
            className="btn-primary text-sm"
          >
            {t("absence.deactivate")}
          </button>
        </div>
      )}

      {/* Activate absence mode */}
      {!isAbsent && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Sick mode */}
          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🤒</span>
              <h3 className="text-sm font-semibold">{t("absence.sickMode")}</h3>
            </div>
            <p className="text-xs text-muted-light dark:text-muted-dark">{t("absence.frozen")}</p>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("absence.note")}
              className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <button
              onClick={() => { dispatch({ type: "ACTIVATE_SICK_MODE", payload: { note } }); setNote(""); }}
              className="btn-primary text-sm w-full bg-danger/90 hover:bg-danger"
            >
              {t("absence.activateSick")}
            </button>
          </div>

          {/* Vacation mode */}
          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏖️</span>
              <h3 className="text-sm font-semibold">{t("absence.vacationMode")}</h3>
            </div>
            <p className="text-xs text-muted-light dark:text-muted-dark">{t("absence.shifted")}</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-light dark:text-muted-dark uppercase tracking-wider mb-1 block">{t("absence.startDate")}</label>
                <input
                  type="date"
                  value={vacationStart}
                  onChange={(e) => setVacationStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-light dark:text-muted-dark uppercase tracking-wider mb-1 block">{t("absence.endDate")}</label>
                <input
                  type="date"
                  value={vacationEnd}
                  min={vacationStart}
                  onChange={(e) => setVacationEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
            </div>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("absence.note")}
              className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <button
              onClick={() => { dispatch({ type: "ACTIVATE_VACATION_MODE", payload: { startDate: vacationStart, endDate: vacationEnd, note } }); setNote(""); }}
              className="btn-primary text-sm w-full"
            >
              {t("absence.activateVacation")}
            </button>
          </div>
        </div>
      )}

      {/* Absence history */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">
          {t("absence.history")}
        </h3>
        {(state.absenceHistory || []).length === 0 ? (
          <p className="text-sm text-muted-light dark:text-muted-dark text-center py-4">{t("absence.noHistory")}</p>
        ) : (
          <div className="space-y-2">
            {state.absenceHistory.map((a) => {
              const isRange = a.startDate !== a.endDate;
              return (
                <div key={a.id} className="group flex items-center gap-3 py-2">
                  <span className="text-lg">{a.type === "sick" ? "🤒" : "🏖️"}</span>
                  <span className="text-xs font-mono text-muted-light dark:text-muted-dark">
                    {new Date(a.startDate + "T00:00:00").toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" })}
                    {isRange && <> – {new Date(a.endDate + "T00:00:00").toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" })}</>}
                  </span>
                  <span className={`badge text-[10px] ${a.type === "sick" ? "bg-danger/10 text-danger" : "bg-accent/10 text-accent"}`}>
                    {a.type === "sick" ? t("absence.sickMode") : t("absence.vacationMode")}
                  </span>
                  {a.note && <span className="text-xs text-muted-light dark:text-muted-dark truncate flex-1">{a.note}</span>}
                  <button
                    onClick={() => dispatch({ type: "DELETE_ABSENCE_HISTORY", payload: a.id })}
                    className="w-6 h-6 rounded flex items-center justify-center text-muted-light hover:text-danger transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TimeTrackingPage() {
  const { t } = useI18n();
  const { state, dispatch, getTodayActivity } = useResourceMonitor();
  const { settings } = useSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "focus" ? "focus" : searchParams.get("tab") === "absence" ? "absence" : "activity";
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <div className="space-y-5 animate-fade-in">
      <h2 className="sr-only">{t("resourceMonitor.title")}</h2>
      <div className="flex items-center gap-1 border-b border-gray-200/50 dark:border-white/5">
        {[
          { key: "activity", label: t("resourceMonitor.tabActivity"), icon: Activity },
          { key: "focus", label: t("resourceMonitor.tabFocus"), icon: Coffee },
          { key: "absence", label: t("resourceMonitor.tabAbsence"), icon: CalIcon },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setActiveTab(key); setSearchParams(key === "activity" ? {} : { tab: key }); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? "border-accent text-accent"
                : "border-transparent text-muted-light dark:text-muted-dark hover:text-foreground-light dark:hover:text-foreground-dark"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "focus" && (
        <div className="max-w-sm">
          <FocusTimer />
        </div>
      )}

      {activeTab === "activity" && (
        <ActivityTab t={t} state={state} getTodayActivity={getTodayActivity} />
      )}

      {activeTab === "absence" && (
        <AbsenceTab t={t} state={state} dispatch={dispatch} />
      )}
    </div>
  );
}
