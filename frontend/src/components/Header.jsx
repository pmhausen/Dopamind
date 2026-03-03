import { useTheme } from "../context/ThemeContext";
import { useApp } from "../context/AppContext";
import { useI18n } from "../i18n/I18nContext";
import { Sun, Moon, Globe } from "lucide-react";
import XpBar from "./XpBar";

export default function Header() {
  const { dark, toggle } = useTheme();
  const { state } = useApp();
  const { lang, switchLang, availableLanguages } = useI18n();

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

        {/* Desktop: XP Bar */}
        <div className="hidden md:block flex-1 max-w-xs">
          <XpBar />
        </div>

        {/* Mobile (tablet): XP Bar */}
        <div className="hidden sm:block md:hidden flex-1 max-w-[200px]">
          <XpBar />
        </div>

        <div className="flex items-center gap-2">
          <div className="badge bg-accent/10 text-accent dark:bg-accent/20">
            Lv. {state.level}
          </div>

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
        </div>
      </div>

      <div className="sm:hidden px-4 pb-2">
        <XpBar />
      </div>
    </header>
  );
}
