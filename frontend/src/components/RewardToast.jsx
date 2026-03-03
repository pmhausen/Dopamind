import { useApp } from "../context/AppContext";
import { useEffect } from "react";
import { TrendingUp, Star, X } from "lucide-react";

const ICONS = {
  "level-up": <TrendingUp className="w-6 h-6 text-accent" />,
  "hat-trick": <Star className="w-6 h-6 text-warn" />,
};

export default function RewardToast() {
  const { state, dispatch } = useApp();

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
      {activeRewards.map((r) => (
        <div
          key={r.id}
          className="glass-card flex items-center gap-3 px-4 py-3 animate-slide-up shadow-lg min-w-[220px]"
        >
          <div className="animate-reward-pop">
            {ICONS[r.type] || ICONS["level-up"]}
          </div>
          <p className="text-sm font-medium">{r.message}</p>
          <button
            onClick={() => dispatch({ type: "DISMISS_REWARD", payload: r.id })}
            className="ml-auto text-muted-light hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
