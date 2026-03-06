import { NavLink } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";
import { useApp, getLevelTitle, DAILY_CHALLENGES } from "../context/AppContext";
import { useResourceMonitor } from "../context/ResourceMonitorContext";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import {
  Home,
  CheckSquare,
  Calendar,
  Mail,
  Settings,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Shield,
} from "lucide-react";
import { useState } from "react";
import XpBar from "./XpBar";

const NAV_ITEMS = [
  { to: "/", icon: Home, key: "home" },
  { to: "/tasks", icon: CheckSquare, key: "tasks" },
  { to: "/planner", icon: Calendar, key: "planner" },
  { to: "/mail", icon: Mail, key: "mail" },
  { to: "/achievements", icon: Trophy, key: "achievements" },
  { to: "/settings", icon: Settings, key: "settings" },
];

export default function Sidebar() {
  const { t } = useI18n();
  const { state } = useApp();
  const { isAbsent, isSick, isOnVacation } = useResourceMonitor();
  const { settings } = useSettings();
  const { isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [showChallengeDetail, setShowChallengeDetail] = useState(false);
  const { lang } = useI18n();
  const levelTitle = getLevelTitle(state.level, lang);

  const features = settings.features || {};
  const visibleNavItems = NAV_ITEMS.filter(({ key }) => {
    if (key === "mail" && !features.mailEnabled) return false;
    if (key === "planner" && !features.calendarEnabled) return false;
    if (key === "achievements" && !features.gamificationEnabled) return false;
    return true;
  });

  return (
    <aside
      className={`hidden lg:flex flex-col h-full overflow-y-auto z-40 transition-all duration-200 bg-card-light/90 dark:bg-card-dark/90 backdrop-blur-md border-r border-gray-200/50 dark:border-white/5 ${
        collapsed ? "w-16 xl:w-20" : "w-56 xl:w-72"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 xl:px-5 py-4 xl:py-5 border-b border-gray-200/50 dark:border-white/5">
        <div className="w-8 h-8 xl:w-10 xl:h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm xl:text-base">D</span>
        </div>
        {!collapsed && (
          <span className="text-lg xl:text-xl font-semibold tracking-tight">Dopamind</span>
        )}
      </div>

      {/* Nav Links */}
      <nav className="flex-1 py-3 px-2 xl:px-3 space-y-1 overflow-y-auto">
        {visibleNavItems.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 xl:px-4 py-2.5 xl:py-3 rounded-xl text-sm xl:text-base font-medium transition-all ${
                isActive
                  ? "bg-accent/10 text-accent dark:bg-accent/20"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
              }`
            }
          >
            <Icon className="w-5 h-5 xl:w-6 xl:h-6 flex-shrink-0" />
            {!collapsed && <span>{t(`nav.${key}`)}</span>}
          </NavLink>
        ))}

        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 xl:px-4 py-2.5 xl:py-3 rounded-xl text-sm xl:text-base font-medium transition-all ${
                isActive
                  ? "bg-accent/10 text-accent dark:bg-accent/20"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
              }`
            }
          >
            <Shield className="w-5 h-5 xl:w-6 xl:h-6 flex-shrink-0" />
            {!collapsed && <span>{t("nav.admin")}</span>}
          </NavLink>
        )}
      </nav>

      {/* Status footer */}
      <div className="px-3 pb-3 space-y-3">
        {/* Absence mode indicator */}
        {features.resourceMonitorEnabled !== false && isAbsent && (
          <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium ${
            isSick ? "bg-danger/10 text-danger" : "bg-accent/10 text-accent"
          }`}>
            <span>{isSick ? "🤒" : "🏖️"}</span>
            {!collapsed && <span>{isSick ? t("absence.sickMode") : t("absence.vacationMode")}</span>}
          </div>
        )}

        {!collapsed && features.gamificationEnabled !== false && (
          <div className="px-1">
            <div className="text-[10px] text-muted-light dark:text-muted-dark mb-0.5">
              Lv. {state.level}
            </div>
            <div className="text-[10px] text-muted-light dark:text-muted-dark mb-1">{levelTitle}</div>
            <XpBar />
          </div>
        )}

        {!collapsed && features.gamificationEnabled !== false && settings.gamification?.dailyChallengeEnabled && state.dailyChallenge && (() => {
          const def = DAILY_CHALLENGES.find((d) => d.id === state.dailyChallenge.challengeId);
          if (!def) return null;
          const progress = def.type === "complete_tasks" ? state.completedToday : state.focusMinutesToday;
          const pct = Math.min(100, Math.round((progress / def.target) * 100));
          return (
            <div className="px-1">
              <button
                onClick={() => setShowChallengeDetail((v) => !v)}
                className="w-full text-left"
                title={t("home.dailyChallenge")}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-light dark:text-muted-dark flex items-center gap-1">
                    🎯 <span>{t("home.dailyChallenge")}</span>
                    {state.dailyChallenge.completed && <span className="text-success text-[10px]">✓</span>}
                  </span>
                  <span className="text-[10px] text-muted-light dark:text-muted-dark">{pct}%</span>
                </div>
                <div className="w-full h-1 rounded-full bg-gray-200 dark:bg-white/10">
                  <div
                    className={`h-full rounded-full transition-all ${state.dailyChallenge.completed ? "bg-success" : "bg-accent"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
              {showChallengeDetail && (
                <div className="mt-1.5 p-2 rounded-lg bg-gray-50 dark:bg-white/5 text-[10px] text-muted-light dark:text-muted-dark">
                  <p>{t(`home.challenge.${def.type}`, { target: def.target })}</p>
                  <p className="mt-0.5 font-medium">{progress}/{def.target}</p>
                </div>
              )}
            </div>
          );
        })()}

        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-full flex items-center justify-center py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-muted-light dark:text-muted-dark transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
