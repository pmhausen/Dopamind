import { useApp, getLevelTitle } from "../context/AppContext";
import { useSettings } from "../context/SettingsContext";
import { useI18n } from "../i18n/I18nContext";
import { useEffect, useRef } from "react";
import {
  TrendingUp, Star, X, Sparkles, Brain, Sunrise, Moon, Zap,
  Rocket, ListChecks, Trophy, Crown, Clock, Shield, Flame,
  Target, Timer, Medal, Infinity, Swords, TrendingDown, AlertTriangle,
} from "lucide-react";

const ICONS = {
  "level-up":           <TrendingUp className="w-6 h-6 text-accent" />,
  "hat-trick":          <Star className="w-6 h-6 text-warn" />,
  "first-task":         <Sparkles className="w-6 h-6 text-accent" />,
  "first-focus":        <Brain className="w-6 h-6 text-accent" />,
  "early-bird":         <Sunrise className="w-6 h-6 text-warn" />,
  "night-owl":          <Moon className="w-6 h-6 text-accent" />,
  "focus-duo":          <Zap className="w-6 h-6 text-warn" />,
  "quick-starter":      <Rocket className="w-6 h-6 text-accent" />,
  "subtask-master":     <ListChecks className="w-6 h-6 text-success" />,
  "daily-5":            <Trophy className="w-6 h-6 text-warn" />,
  "daily-10":           <Crown className="w-6 h-6 text-warn" />,
  "focus-hour":         <Clock className="w-6 h-6 text-accent" />,
  "week-warrior":       <Shield className="w-6 h-6 text-accent" />,
  "streak-3":           <Flame className="w-6 h-6 text-warn" />,
  "streak-7":           <Flame className="w-6 h-6 text-warn" />,
  "streak-30":          <Flame className="w-6 h-6 text-orange-500" />,
  "streak-100":         <Flame className="w-6 h-6 text-red-500" />,
  "deadline-hero":      <Target className="w-6 h-6 text-accent" />,
  "focus-marathon":     <Timer className="w-6 h-6 text-accent" />,
  "month-100":          <Medal className="w-6 h-6 text-warn" />,
  "year-365":           <Medal className="w-6 h-6 text-warn" />,
  "focus-1000min":      <Infinity className="w-6 h-6 text-accent" />,
  "week-50":            <Swords className="w-6 h-6 text-accent" />,
  "level-10":           <TrendingUp className="w-6 h-6 text-accent" />,
  "level-25":           <TrendingUp className="w-6 h-6 text-accent" />,
  "level-50":           <TrendingUp className="w-6 h-6 text-accent" />,
  "deadline-bonus":     <Target className="w-6 h-6 text-success" />,
  "daily-bonus":        <Sparkles className="w-6 h-6 text-warn" />,
  "focus-combo":        <Zap className="w-6 h-6 text-warn" />,
  "overdue-penalty":    <AlertTriangle className="w-6 h-6 text-danger" />,
  "inactivity-penalty": <TrendingDown className="w-6 h-6 text-danger" />,
};

const SIZE_CLASSES = {
  large:   "border border-yellow-400/60 shadow-[0_0_18px_2px_rgba(250,204,21,0.25)] scale-105",
  medium:  "border border-accent/40 shadow-[0_0_10px_1px_rgba(108,99,255,0.2)]",
  small:   "",
  penalty: "border border-danger/40 bg-danger/5",
};

function playRewardSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const isPenalty = type === "overdue-penalty" || type === "inactivity-penalty";
    const isLevelUp = type === "level-up";

    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (isLevelUp ? 1.0 : 0.6));

    if (isPenalty) {
      // Low descending tone for penalties
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(330, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.5);
      osc.connect(gain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } else if (isLevelUp) {
      // Rising arpeggio for level-up
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
        g.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.12 + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.4);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.4);
      });
    } else {
      // Pleasant two-note chime for regular rewards
      [659, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
        g.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.1 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.5);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.5);
      });
    }
    setTimeout(() => ctx.close(), 2000);
  } catch {
    // Web Audio API not available
  }
}

export default function RewardToast() {
  const { state, dispatch } = useApp();
  const { settings } = useSettings();
  const { t, lang } = useI18n();
  const prevCountRef = useRef(0);

  const activeRewards = state.rewards.slice(-3);

  // Play sound when a new reward appears
  useEffect(() => {
    const count = state.rewards.length;
    if (settings.gamification?.soundEnabled && count > prevCountRef.current) {
      const latest = state.rewards[count - 1];
      if (latest) playRewardSound(latest.type);
    }
    prevCountRef.current = count;
  }, [state.rewards, settings.gamification?.soundEnabled]);

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
        const isPenalty = r.type === "overdue-penalty" || r.type === "inactivity-penalty";
        const message = r.messageKey
          ? t(r.messageKey, { level: r.level, title, name, xp: r.xp, days: r.days, daysOverdue: r.daysOverdue })
          : r.message;
        const sizeClass = isPenalty ? SIZE_CLASSES.penalty : (SIZE_CLASSES[r.size] || "");

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
