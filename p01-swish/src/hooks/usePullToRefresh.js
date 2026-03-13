import { useState, useEffect, useRef, useCallback } from "react";

const THRESHOLD = 80;

export default function usePullToRefresh(onRefresh) {
  const [state, setState] = useState("idle"); // idle | pulling | refreshing | done
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const pulling = useRef(false);

  const handleRefresh = useCallback(async () => {
    setState("refreshing");
    setPullDistance(THRESHOLD);
    try {
      await onRefresh();
    } catch { /* ignore */ }
    setState("done");
    setTimeout(() => {
      setState("idle");
      setPullDistance(0);
    }, 1200);
  }, [onRefresh]);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 768px)").matches && "ontouchstart" in window;
    if (!isMobile) return;

    const onTouchStart = (e) => {
      if (window.scrollY > 0 || state === "refreshing" || state === "done") return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    };

    const onTouchMove = (e) => {
      if (!pulling.current || state === "refreshing" || state === "done") return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0 && window.scrollY === 0) {
        const dist = Math.min(dy * 0.5, THRESHOLD * 1.5);
        setPullDistance(dist);
        setState("pulling");
        if (dy > 10) e.preventDefault();
      } else {
        pulling.current = false;
        setPullDistance(0);
        setState("idle");
      }
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullDistance >= THRESHOLD && state === "pulling") {
        handleRefresh();
      } else {
        setState("idle");
        setPullDistance(0);
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [state, pullDistance, handleRefresh]);

  return { state, pullDistance };
}
