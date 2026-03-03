import { useApp, ACHIEVEMENTS } from "../context/AppContext";
import { useI18n } from "../i18n/I18nContext";
import { Lock } from "lucide-react";

const SIZE_ORDER = ["small", "medium", "large"];

export default function AchievementsPanel() {
  const { state } = useApp();
  const { t } = useI18n();

  const unlocked = state.unlockedAchievements || [];

  return (
    <div className="space-y-8">
      {SIZE_ORDER.map((size) => {
        const group = ACHIEVEMENTS.filter((a) => a.size === size);
        const sectionKey = size === "small" ? "achievements.small" : size === "medium" ? "achievements.medium" : "achievements.large";

        return (
          <section key={size}>
            <h2 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-3">
              {t(sectionKey)}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {group.map((ach) => {
                const isUnlocked = unlocked.includes(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`glass-card p-4 flex flex-col gap-2 transition-all ${
                      isUnlocked
                        ? size === "large"
                          ? "border border-yellow-400/50 shadow-[0_0_12px_1px_rgba(250,204,21,0.2)]"
                          : size === "medium"
                          ? "border border-accent/30"
                          : ""
                        : "opacity-50 grayscale"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold leading-tight ${isUnlocked ? "" : "text-muted-light dark:text-muted-dark"}`}>
                        {t(`achievements.${ach.id}.name`)}
                      </p>
                      {!isUnlocked && <Lock className="w-3.5 h-3.5 flex-shrink-0 text-muted-light dark:text-muted-dark mt-0.5" />}
                    </div>
                    <p className="text-[11px] text-muted-light dark:text-muted-dark leading-snug">
                      {t(`achievements.${ach.id}.desc`)}
                    </p>
                    <span className={`self-start text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                      isUnlocked
                        ? "bg-accent/10 text-accent dark:bg-accent/20"
                        : "bg-gray-100 dark:bg-white/5 text-muted-light dark:text-muted-dark"
                    }`}>
                      {t("achievements.xpReward", { xp: ach.xp })}
                    </span>
                    {isUnlocked && (
                      <span className="text-[10px] text-success font-medium">{t("achievements.unlocked")}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
