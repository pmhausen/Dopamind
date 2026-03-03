import { useApp, getLevelTitle } from "../context/AppContext";
import { useI18n } from "../i18n/I18nContext";
import { useEffect } from "react";
import {
  TrendingUp, Star, X, Sparkles, Brain, Sunrise, Moon, Zap,
  Rocket, ListChecks, Trophy, Crown, Clock, Shield, Flame,
  Target, Timer, Medal, Infinity, Swords,
} from "lucide-react";

const ICONS = {
  "level-up":       <TrendingUp className="w-6 h-6 text-accent" />,
  "hat-trick":      <Star className="w-6 h-6 text-warn" />,
  "first-task":     <Sparkles className="w-6 h-6 text-accent" />,
  "first-focus":    <Brain className="w-6 h-6 text-accent" />,
  "early-bird":     <Sunrise className="w-6 h-6 text-warn" />,
  "night-owl":      <Moon className="w-6 h-6 text-accent" />,
  "focus-duo":      <Zap className="w-6 h-6 text-warn" />,
  "quick-starter":  <Rocket className="w-6 h-6 text-accent" />,
  "subtask-master": <ListChecks className="w-6 h-6 text-success" />,
  "daily-5":        <Trophy className="w-6 h-6 text-warn" />,
  "daily-10":       <Crown className="w-6 h-6 text-warn" />,
  "focus-hour":     <Clock className="w-6 h-6 text-accent" />,
  "week-warrior":   <Shield className="w-6 h-6 text-accent" />,
  "streak-3":       <Flame className="w-6 h-6 text-warn" />,
  "streak-7":       <Flame className="w-6 h-6 text-warn" />,
  "streak-30":      <Flame className="w-6 h-6 text-orange-500" />,
  "streak-100":     <Flame className="w-6 h-6 text-red-500" />,
  "deadline-hero":  <Target className="w-6 h-6 text-accent" />,
  "focus-marathon": <Timer className="w-6 h-6 text-accent" />,
  "month-100":      <Medal className="w-6 h-6 text-warn" />,
  "year-365":       <Medal className="w-6 h-6 text-warn" />,
  "focus-1000min":  <Infinity className="w-6 h-6 text-accent" />,
  "week-50":        <Swords className="w-6 h-6 text-accent" />,
  "level-10":       <TrendingUp className="w-6 h-6 text-accent" />,
  "level-25":       <TrendingUp className="w-6 h-6 text-accent" />,
  "level-50":       <TrendingUp className="w-6 h-6 text-accent" />,
  "deadline-bonus": <Target className="w-6 h-6 text-success" />,
  "daily-bonus":    <Sparkles className="w-6 h-6 text-warn" />,
  "focus-combo":    <Zap className="w-6 h-6 text-warn" />,
};

const SIZE_CLASSES = {
  large:  "border border-yellow-400/60 shadow-[0_0_18px_2px_rgba(250,204,21,0.25)] scale-105",
  medium: "border border-accent/40 shadow-[0_0_10px_1px_rgba(108,99,255,0.2)]",
  small:  "",
};

export default function RewardToast() {
  const { state, dispatch } = useApp();
  const { t, lang } = useI18n();

  const activeRewards = state.rewards.slice(-3);

  useEffect(() => {
    if (activeRewards.length === 0) return;
    const timer = setTimeout(() => {
      dispatch({ type: "DISMISS_REWARD", payload: activeRewards[0].id });
    }, 4000);
    return () => clearTimeout(timer);
  }, [activeRewards, dispatch]);

  if (activeRewards.length === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-6 z-50 flex flex-col gap-2">
      {activeRewards.map((r) => {
        const title = r.type === "level-up" && r.level ? getLevelTitle(r.level, lang) : "";
        const name = r.achievementId ? t(`achievements.${r.achievementId}.name`) : "";
        const message = r.messageKey
          ? t(r.messageKey, { level: r.level, title, name, xp: r.xp })
          : r.message;
        const sizeClass = SIZE_CLASSES[r.size] || "";

        return (
          <div
            key={r.id}
            className={`glass-card flex items-center gap-3 px-4 py-3 animate-slide-up shadow-lg min-w-[220px] ${sizeClass} ${r.size === "large" ? "text-base font-semibold" : ""}`}
          >
            <div className="animate-reward-pop">
              {ICONS[r.type] || ICONS["level-up"]}
            </div>
            <p className="text-sm font-medium flex-1">{message}</p>
            <button
              onClick={() => dispatch({ type: "DISMISS_REWARD", payload: r.id })}
              className="ml-auto text-muted-light hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
