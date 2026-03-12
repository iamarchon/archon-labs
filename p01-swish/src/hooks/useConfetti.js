import confetti from "canvas-confetti";
import { useCallback } from "react";

export default function useConfetti() {
  const fireConfetti = useCallback((type = "trade") => {
    if (type === "firstTrade") {
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: ["#0071e3", "#ffffff", "#ffd700"],
      });
      setTimeout(() => confetti({
        particleCount: 100,
        angle: 60,
        spread: 80,
        origin: { x: 0 },
      }), 300);
      setTimeout(() => confetti({
        particleCount: 100,
        angle: 120,
        spread: 80,
        origin: { x: 1 },
      }), 300);
    } else if (type === "levelUp") {
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 },
        colors: ["#ffd700", "#0071e3", "#ffffff"],
      });
    } else {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#0071e3", "#ffffff", "#34d399"],
      });
    }
  }, []);

  return { fireConfetti };
}
