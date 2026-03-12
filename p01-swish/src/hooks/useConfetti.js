import confetti from "canvas-confetti";
import { useCallback } from "react";

export default function useConfetti() {
  const fireConfetti = useCallback((type = "trade") => {
    const colors = ["#0071e3", "#ffffff", "#34d399"];

    if (type === "firstTrade") {
      // Initial gold burst
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: ["#ffd700", "#0071e3", "#ffffff"],
      });
    }

    if (type === "levelUp") {
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 },
        colors: ["#ffd700", "#0071e3", "#ffffff"],
      });
      return;
    }

    // 4.5s tunnel from both sides
    const duration = 4500;
    const end = Date.now() + duration;
    const interval = setInterval(() => {
      if (Date.now() > end) { clearInterval(interval); return; }
      confetti({
        particleCount: 15,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 15,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });
    }, 200);
  }, []);

  return { fireConfetti };
}
