import { useTheme } from "../context/ThemeContext";
import { useApp, getLevelTitle } from "../context/AppContext";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import { Sun, Moon, Settings, Trophy, LogOut, User, Flame, Zap, BatteryLow } from "lucide-react";
import { Link } from "react-router-dom";
import XpBar from "./XpBar";
import NotificationBell from "./NotificationBell";
import { useState, useRef, useEffect } from "react";

export default function Header() {
  const { dark, toggle } = useTheme();
  const { state, dispatch } = useApp();
  const { t, lang } = useI18n();
  const { settings } = useSettings();
  const { user, logout } = useAuth();
  const levelTitle = getLevelTitle(state.level, lang);
  const features = settings.features || {};
  const [showEnergyPicker, setShowEnergyPicker] = useState(false);
  const energyRef = useRef(null);

  useEffect(() => {
    if (!showEnergyPicker) return;
    const handleClick = (e) => {
      if (energyRef.current && !energyRef.current.contains(e.target)) {
        setShowEnergyPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showEnergyPicker]);

  return (
    <header className="relative z-30 bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-md border-b border-gray-200/50 dark:border-white/5 flex-shrink-0">
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        {/* Mobile: Logo */}
        <div className="flex items-center gap-3 lg:hidden">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <span className="text-white font-bold text-sm">D</span>
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Dopamind</h1>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {features.gamificationEnabled !== false && (
            <Link
              to="/achievements"
              className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-muted-light dark:text-muted-dark"
              aria-label="Achievements"
            >
              <Trophy className="w-4 h-4" />
            </Link>
          )}
          <Link
            to="/settings"
            className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-muted-light dark:text-muted-dark"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
          <NotificationBell />
          {features.gamificationEnabled !== false && settings.gamification?.energyCheckinEnabled !== false && (
            <div className="relative" ref={energyRef}>
              <button
                onClick={() => setShowEnergyPicker((v) => !v)}
                className={`hidden sm:flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${
                  state.energyLevel === "high" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50" :
                  state.energyLevel === "low" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50" :
                  state.energyLevel ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50" :
                  "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15"
                }`}
                title={t("home.energyEdit")}
              >
                {state.energyLevel === "high" ? <Flame className="w-4 h-4" /> :
                 state.energyLevel === "low" ? <BatteryLow className="w-4 h-4" /> :
                 <Zap className="w-4 h-4" />}
              </button>
              {showEnergyPicker && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl shadow-lg p-2 flex flex-col gap-1 min-w-[140px]">
                  {["low", "normal", "high"].map((level) => (
                    <button
                      key={level}
                      onClick={() => { dispatch({ type: "SET_ENERGY_LEVEL", payload: level }); setShowEnergyPicker(false); }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-left w-full ${
                        state.energyLevel === level
                          ? "bg-accent/10 text-accent"
                          : "hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {level === "high" ? <Flame className="w-3.5 h-3.5" /> : level === "low" ? <BatteryLow className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                      {t(`home.energy.${level}`)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={toggle}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            aria-label="Toggle theme"
          >
            {dark ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-gray-500" />
            )}
          </button>

          {/* User info & logout */}
          {user && (
            <div className="flex items-center gap-2 ml-1 pl-2 border-l border-gray-200/50 dark:border-white/10">
              <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-light dark:text-muted-dark">
                <User className="w-3.5 h-3.5" />
                <span className="max-w-[120px] truncate">{user.name}</span>
              </div>
              <button
                onClick={logout}
                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-light dark:text-muted-dark hover:text-danger transition-colors"
                title={t("auth.logout")}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: XP / Level (only on mobile, not on desktop where Sidebar shows it) */}
      {features.gamificationEnabled !== false && (
        <div className="lg:hidden px-4 pb-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] text-muted-light dark:text-muted-dark">Lv. {state.level}</span>
            <span className="text-[10px] text-muted-light dark:text-muted-dark">{levelTitle}</span>
          </div>
          <XpBar />
        </div>
      )}
    </header>
  );
}
