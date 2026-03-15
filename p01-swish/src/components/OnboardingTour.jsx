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

function getRect(selector) {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  return el.getBoundingClientRect();
}

export default function OnboardingTour({ onComplete, onStepChange }) {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const tooltipRef = useRef(null);

  const current = STEPS[step];

  const measureTarget = useCallback(() => {
    const rect = getRect(current.target);
    setTargetRect(rect);
  }, [current.target]);

  // Navigate to the step's route if needed, then measure
  useEffect(() => {
    if (current.route && location.pathname !== current.route) {
      navigate(current.route);
    }
    const timer = setTimeout(measureTarget, 350);
    return () => clearTimeout(timer);
  }, [step, current.route, location.pathname, navigate, measureTarget]);

  // Re-measure on scroll/resize
  useEffect(() => {
    window.addEventListener("scroll", measureTarget, true);
    window.addEventListener("resize", measureTarget);
    return () => {
      window.removeEventListener("scroll", measureTarget, true);
      window.removeEventListener("resize", measureTarget);
    };
  }, [measureTarget]);

  const finish = useCallback(() => {
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

  // Desktop spotlight
  const pad = 8;
  const hasTarget = targetRect && current.target;

  const spotStyle = hasTarget
    ? {
        position: "fixed",
        top: targetRect.top - pad,
        left: targetRect.left - pad,
        width: targetRect.width + pad * 2,
        height: targetRect.height + pad * 2,
        borderRadius: "10px",
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
        zIndex: 10001,
        pointerEvents: "none",
        transition: "top .3s ease, left .3s ease, width .3s ease, height .3s ease",
      }
    : null;

  return (
    <>
      {/* Full-screen dark backdrop — always visible */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 10000,
          background: "rgba(0,0,0,0.6)",
        }}
      />

      {/* Desktop spotlight cutout (hidden on mobile via the backdrop covering it) */}
      {spotStyle && <div className="tour-spotlight" style={spotStyle} />}

      {/* Invisible click blocker */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 10002 }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Tooltip card — smart vertical positioning to avoid highlighted element */}
      <div
        ref={tooltipRef}
        className="tour-tooltip"
        style={{
          position: "fixed",
          ...(hasTarget && targetRect
            ? (targetRect.top + targetRect.height / 2 < window.innerHeight / 2)
              ? { bottom: "100px", top: "auto" }   // element in top half → tooltip at bottom
              : { top: "90px", bottom: "auto" }     // element in bottom half → tooltip at top
            : { bottom: "100px", top: "auto" }),    // no target → default bottom
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10003,
          width: "calc(100% - 32px)",
          maxWidth: "360px",
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
