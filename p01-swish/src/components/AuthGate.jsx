import { SignIn, useAuth, useUser } from "@clerk/react";
import { T } from "../tokens";

export default function AuthGate({ children }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  if (!isLoaded) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: T.bg }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.8px", color: T.ink, marginBottom: "8px" }}>
            swish<span style={{ color: T.accent }}>.</span>
          </div>
          <div style={{ color: T.inkFaint, fontSize: "14px" }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: T.bg, padding: "40px 28px" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "42px", fontWeight: 700, letterSpacing: "-1.5px", color: T.ink, marginBottom: "6px" }}>
            swish<span style={{ color: T.accent }}>.</span>
          </div>
          <div style={{ color: T.inkSub, fontSize: "16px", marginBottom: "40px", lineHeight: 1.65 }}>
            Virtual stock trading for the next generation
          </div>
          <div style={{ display: "inline-block" }}>
            <SignIn
              appearance={{
                elements: {
                  rootBox: { width: "100%" },
                  card: {
                    boxShadow: "0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
                    borderRadius: "20px",
                  },
                },
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return children;
}
