import { useTheme } from "../context/ThemeContext";
import { useApp, getLevelTitle } from "../context/AppContext";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import { Sun, Moon, Globe, Settings, Trophy, LogOut, User } from "lucide-react";
import { Link } from "react-router-dom";
import XpBar from "./XpBar";
import NotificationBell from "./NotificationBell";

export default function Header() {
  const { dark, toggle } = useTheme();
  const { state } = useApp();
  const { lang, switchLang, availableLanguages, t } = useI18n();
  const { settings } = useSettings();
  const { user, logout } = useAuth();
  const levelTitle = getLevelTitle(state.level, lang);
  const features = settings.features || {};

  return (
    <header className="sticky top-0 z-30 md:relative bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-md border-b border-gray-200/50 dark:border-white/5">
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        {/* Mobile: Logo */}
        <div className="flex items-center gap-3 md:hidden">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <span className="text-white font-bold text-sm">D</span>
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Dopamind</h1>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {features.gamificationEnabled !== false && (
            <Link
              to="/achievements"
              className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-muted-light dark:text-muted-dark"
              aria-label="Achievements"
            >
              <Trophy className="w-4 h-4" />
            </Link>
          )}
          <Link
            to="/settings"
            className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-muted-light dark:text-muted-dark"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
          <NotificationBell />
          <button
            onClick={() => {
              const idx = availableLanguages.indexOf(lang);
              switchLang(availableLanguages[(idx + 1) % availableLanguages.length]);
            }}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-muted-light dark:text-muted-dark"
            title={lang.toUpperCase()}
          >
            <Globe className="w-4 h-4" />
          </button>

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
        <div className="md:hidden px-4 pb-2">
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
