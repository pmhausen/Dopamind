import { NavLink } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";
import { useApp, getLevelTitle } from "../context/AppContext";
import { useTimeTracking } from "../context/TimeTrackingContext";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import {
  Home,
  CheckSquare,
  Calendar,
  Mail,
  Clock,
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
  { to: "/calendar", icon: Calendar, key: "calendar" },
  { to: "/mail", icon: Mail, key: "mail" },
  { to: "/time", icon: Clock, key: "time" },
  { to: "/achievements", icon: Trophy, key: "achievements" },
  { to: "/settings", icon: Settings, key: "settings" },
];

export default function Sidebar() {
  const { t } = useI18n();
  const { state } = useApp();
  const { state: ttState } = useTimeTracking();
  const { settings } = useSettings();
  const { isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const { lang } = useI18n();
  const levelTitle = getLevelTitle(state.level, lang);

  const features = settings.features || {};
  const visibleNavItems = NAV_ITEMS.filter(({ key }) => {
    if (key === "mail" && !features.mailEnabled) return false;
    if (key === "calendar" && !features.calendarEnabled) return false;
    if (key === "time" && !features.timeTrackingEnabled) return false;
    if (key === "achievements" && !features.gamificationEnabled) return false;
    return true;
  });

  return (
    <aside
      className={`hidden md:flex flex-col h-screen sticky top-0 z-40 transition-all duration-200 bg-card-light/90 dark:bg-card-dark/90 backdrop-blur-md border-r border-gray-200/50 dark:border-white/5 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200/50 dark:border-white/5">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">D</span>
        </div>
        {!collapsed && (
          <span className="text-lg font-semibold tracking-tight">Dopamind</span>
        )}
      </div>

      {/* Nav Links */}
      <nav className="flex-1 py-3 px-2 space-y-1">
        {visibleNavItems.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-accent/10 text-accent dark:bg-accent/20"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{t(`nav.${key}`)}</span>}
          </NavLink>
        ))}

        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-accent/10 text-accent dark:bg-accent/20"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
              }`
            }
          >
            <Shield className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{t("nav.admin")}</span>}
          </NavLink>
        )}
      </nav>

      {/* Status footer */}
      <div className="px-3 pb-3 space-y-3">
        {/* Active clock indicator */}
        {features.timeTrackingEnabled !== false && ttState.currentSession && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-success/10 text-success text-xs font-medium">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse-soft" />
            {!collapsed && <span>{t("timeTracking.clockIn")}</span>}
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
