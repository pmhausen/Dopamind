import { useApp, getLevelTitle } from "../context/AppContext";
import { useI18n } from "../i18n/I18nContext";

export default function XpBar() {
  const { state, xpForLevel, xpForNextLevel } = useApp();
  const { lang } = useI18n();

  const currentLevelXp = xpForLevel(state.level);
  const nextLevelXp = xpForNextLevel(state.level);
  const progress = nextLevelXp > currentLevelXp
    ? ((state.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100
    : 0;

  const title = getLevelTitle(state.level, lang);

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-center gap-2 w-full">
        <span className="text-xs text-muted-light dark:text-muted-dark font-mono whitespace-nowrap">
          {state.xp} XP
        </span>
        <div className="flex-1 h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent to-accent-glow rounded-full transition-all duration-700 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <span className="text-xs text-muted-light dark:text-muted-dark font-mono whitespace-nowrap">
          Lv.{state.level + 1}
        </span>
      </div>
      <p className="text-[10px] text-muted-light dark:text-muted-dark truncate">{title}</p>
    </div>
  );
}
