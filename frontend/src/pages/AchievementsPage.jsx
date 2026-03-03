import { useI18n } from "../i18n/I18nContext";
import AchievementsPanel from "../components/AchievementsPanel";

export default function AchievementsPage() {
  const { t } = useI18n();

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-xl font-semibold">{t("achievements.title")}</h1>
      <AchievementsPanel />
    </div>
  );
}
