import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { T } from "../tokens";

// mobileNavId: which MobileNav item to highlight with glow ring
const STEPS = [
  {
    target: "#nav-home",
    mobileNavId: "mnav-home",
    route: "/",
    title: "Your Home Base",
    text: "Track your portfolio value, holdings, and daily performance here.",
  },
  {
    target: "#nav-markets",
    mobileNavId: "mnav-markets",
    route: "/markets",
    title: "Browse Stocks & Crypto",
    text: "Search 8,000+ stocks and crypto. Filter by category to find ideas.",
  },
  {
    target: ".stock-row",
    mobileNavId: null,
    route: "/markets",
    title: "Buy Your First Stock",
    text: "Tap any stock to see its chart and buy shares with your $10,000.",
  },
  {
    target: "#nav-auto",
    mobileNavId: "mnav-auto",
    route: "/auto-invest",
    title: "Auto-Invest",
    text: "Set up automatic weekly buys \u2014 even $5/week builds real habits.",
  },
  {
    target: "#nav-learn",
    mobileNavId: "mnav-learn",
    route: "/learn",
    title: "Learn & Earn XP",
    text: "Complete bite-sized lessons to level up and unlock scenarios.",
  },
  {
    target: "#nav-scenarios",
    mobileNavId: "mnav-scenarios",
    route: "/scenarios",
    title: "Test Your Instincts",
    text: "Real-world investing challenges. Make decisions, see outcomes.",
  },
  {
    target: null,
    mobileNavId: null,
    route: null,
    title: "You're ready!",
    text: "Start by browsing Markets and making your first trade.",
    isFinal: true,
  },
];

// Saved original styles so we can restore them
const ELEVATED_PROPS = ["position", "zIndex", "borderRadius", "boxShadow", "isolation"];

function elevateElement(el) {
  if (!el) return null;
  const saved = {};
  for (const prop of ELEVATED_PROPS) saved[prop] = el.style[prop];
  el.style.position = "relative";
  el.style.zIndex = "10001";
  el.style.isolation = "isolate";
  el.style.borderRadius = "8px";
  el.style.boxShadow = "0 0 0 4px rgba(0,113,227,0.6), 0 0 20px rgba(0,113,227,0.3)";
  return saved;
}

function restoreElement(el, saved) {
  if (!el || !saved) return;
  for (const prop of ELEVATED_PROPS) el.style[prop] = saved[prop] || "";
}

function isMobile() {
  return window.innerWidth < 768;
}

export default function OnboardingTour({ onComplete, onStepChange }) {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const tooltipRef = useRef(null);
  const elevatedRef = useRef({ el: null, saved: null });

  const current = STEPS[step];

  // Elevate target element above backdrop
  useEffect(() => {
    // Restore previous
    restoreElement(elevatedRef.current.el, elevatedRef.current.saved);
    elevatedRef.current = { el: null, saved: null };

    if (!current.target) return;

    const timer = setTimeout(() => {
      const el = document.querySelector(current.target);
      if (el) {
        const saved = elevateElement(el);
        elevatedRef.current = { el, saved };
        setTargetRect(el.getBoundingClientRect());
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [step, current.target]);

  // Restore on unmount (tour end / skip)
  useEffect(() => {
    return () => {
      restoreElement(elevatedRef.current.el, elevatedRef.current.saved);
    };
  }, []);

  // Re-measure on scroll/resize
  const measureTarget = useCallback(() => {
    if (!current.target) { setTargetRect(null); return; }
    const el = document.querySelector(current.target);
    if (el) setTargetRect(el.getBoundingClientRect());
  }, [current.target]);

  useEffect(() => {
    window.addEventListener("scroll", measureTarget, true);
    window.addEventListener("resize", measureTarget);
    return () => {
      window.removeEventListener("scroll", measureTarget, true);
      window.removeEventListener("resize", measureTarget);
    };
  }, [measureTarget]);

  // Navigate to the step's route if needed
  useEffect(() => {
    if (current.route && location.pathname !== current.route) {
      navigate(current.route);
    }
  }, [step, current.route, location.pathname, navigate]);

  const finish = useCallback(() => {
    restoreElement(elevatedRef.current.el, elevatedRef.current.saved);
    elevatedRef.current = { el: null, saved: null };
    localStorage.setItem("swish_tour_completed", "true");
    onComplete();
  }, [onComplete]);

  const handleNext = () => {
    if (current.isFinal) {
      finish();
      navigate("/markets");
      return;
    }
    setStep(s => {
      const next = s + 1;
      if (onStepChange) onStepChange(next);
      return next;
    });
  };

  const hasTarget = targetRect && current.target;

  // Tooltip positioning
  const getTooltipStyle = () => {
    const base = {
      position: "fixed",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 10003,
      width: "calc(100% - 32px)",
      maxWidth: "360px",
    };

    // No target → centered on screen
    if (!hasTarget) {
      if (isMobile()) return { ...base, bottom: "100px", top: "auto" };
      return { ...base, top: "30%", bottom: "auto" };
    }

    // Mobile: smart top/bottom based on element position
    if (isMobile()) {
      const elementMidY = targetRect.top + targetRect.height / 2;
      if (elementMidY < window.innerHeight / 2) {
        return { ...base, bottom: "100px", top: "auto" };
      }
      return { ...base, top: "90px", bottom: "auto" };
    }

    // Desktop: position near the highlighted element
    const gap = 12;
    const tooltipHeight = 240;
    const tooltipWidth = 320;
    const belowY = targetRect.bottom + gap;
    const aboveY = targetRect.top - gap - tooltipHeight;
    const tooltipLeft = Math.max(16, Math.min(targetRect.left, window.innerWidth - tooltipWidth - 20));

    if (belowY + tooltipHeight < window.innerHeight) {
      return { ...base, top: belowY, bottom: "auto", left: tooltipLeft, transform: "none", width: tooltipWidth };
    }
    return { ...base, top: Math.max(10, aboveY), bottom: "auto", left: tooltipLeft, transform: "none", width: tooltipWidth };
  };

  return (
    <>
      {/* Full-screen dark backdrop */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 10000,
          background: "rgba(0,0,0,0.6)",
        }}
      />

      {/* Invisible click blocker */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 10002 }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className="tour-tooltip"
        style={{
          ...getTooltipStyle(),
          background: T.white,
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 12px 40px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)",
          animation: "fadeIn .2s ease, slideUp .2s ease",
        }}
      >
        {/* Step progress bar */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "16px" }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1, height: "4px", borderRadius: "2px",
                background: i <= step ? "#0071e3" : "#e5e7eb",
                transition: "background .2s ease",
              }}
            />
          ))}
        </div>

        <div style={{ fontSize: "11px", fontWeight: 600, color: T.inkFaint, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "8px" }}>
          Step {step + 1} of {STEPS.length}
        </div>

        <div style={{ fontSize: "18px", fontWeight: 700, color: T.ink, letterSpacing: "-0.4px", marginBottom: "8px", lineHeight: 1.3 }}>
          {current.title}
        </div>

        <div style={{ fontSize: "14px", color: T.inkSub, lineHeight: 1.6, marginBottom: "24px" }}>
          {current.text}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={finish}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: T.inkFaint, fontSize: "12px", fontWeight: 400,
              padding: "4px 0",
            }}
          >
            Skip tour
          </button>

          <button
            onClick={handleNext}
            style={{
              background: T.accent, color: T.white, border: "none",
              borderRadius: "10px", padding: "10px 22px",
              fontSize: "14px", fontWeight: 600, cursor: "pointer",
              transition: "opacity .15s",
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = ".88"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            {current.isFinal ? "Let's go \u2192" : "Next \u2192"}
          </button>
        </div>
      </div>
    </>
  );
}

// Export STEPS so App.jsx can read the current step's mobileNavId
OnboardingTour.STEPS = STEPS;
