import { useCallback } from "react";
import { useApp } from "../context/AppContext";
import { useSettings } from "../context/SettingsContext";
import MicroConfetti from "./MicroConfetti";

export default function MicroConfettiManager() {
  const { state, dispatch } = useApp();
  const { settings } = useSettings();

  const handleDone = useCallback((id) => {
    dispatch({ type: "CLEAR_MICRO_CONFETTI", payload: id });
  }, [dispatch]);

  if (!settings.gamification?.microConfettiEnabled) return null;

  const queue = state.microConfettiQueue || [];
  if (queue.length === 0) return null;

  // Only show the first item at a time
  const item = queue[0];
  return (
    <MicroConfetti
      key={item.id}
      xp={item.xp}
      onDone={() => handleDone(item.id)}
    />
  );
}
