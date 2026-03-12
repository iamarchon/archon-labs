import confetti from "canvas-confetti";
import { useCallback } from "react";

const Z = 1002; // Above TradeSuccessModal (z-index: 1000)

export default function useConfetti() {
  const fireConfetti = useCallback((type = "trade") => {
    const colors = ["#0071e3", "#ffffff", "#34d399"];

    if (type === "firstTrade") {
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: ["#ffd700", "#0071e3", "#ffffff"],
        zIndex: Z,
      });
    }

    if (type === "levelUp") {
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 },
        colors: ["#ffd700", "#0071e3", "#ffffff"],
        zIndex: Z,
      });
      return;
    }

    // 3s tunnel from both sides
    const duration = 3000;
    const end = Date.now() + duration;
    const interval = setInterval(() => {
      if (Date.now() > end) { clearInterval(interval); return; }
      confetti({
        particleCount: 15,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
        zIndex: Z,
      });
      confetti({
        particleCount: 15,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
        zIndex: Z,
      });
    }, 200);
  }, []);

  return { fireConfetti };
}
