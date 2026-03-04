import { useEffect, useState } from "react";

const INJECTED = { current: false };

function injectStyles() {
  if (INJECTED.current) return;
  INJECTED.current = true;
  const style = document.createElement("style");
  style.textContent = `
@keyframes micro-confetti-fly {
  0% { transform: translate(0, 0) scale(1); opacity: 1; }
  100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
}
@keyframes micro-xp-fade {
  0% { transform: translateX(-50%) translateY(0); opacity: 1; }
  100% { transform: translateX(-50%) translateY(-30px); opacity: 0; }
}
.micro-confetti-particle {
  position: fixed;
  top: 50%;
  left: 50%;
  border-radius: 2px;
  animation: micro-confetti-fly 0.8s ease-out forwards;
}
.micro-xp-label {
  position: fixed;
  top: 45%;
  left: 50%;
  transform: translateX(-50%);
  font-weight: bold;
  font-size: 1.1rem;
  color: #6C63FF;
  animation: micro-xp-fade 0.8s ease-out forwards;
  pointer-events: none;
  z-index: 9999;
  white-space: nowrap;
}
  `;
  document.head.appendChild(style);
}

export default function MicroConfetti({ xp, onDone }) {
  const [particles] = useState(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 80,
      y: -(20 + Math.random() * 40),
      color: ["#6C63FF", "#A29BFE", "#FFD700", "#FF6B6B", "#51CF66", "#74C0FC"][i % 6],
      size: 4 + Math.random() * 4,
    }))
  );

  useEffect(() => {
    injectStyles();
    const t = setTimeout(onDone, 900);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          className="micro-confetti-particle"
          style={{
            "--tx": `${p.x}px`,
            "--ty": `${p.y}px`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
          }}
        />
      ))}
      <div className="micro-xp-label">+{xp} XP</div>
    </div>
  );
}
