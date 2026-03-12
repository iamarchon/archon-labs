import { StrictMode, Component } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import "./index.css";
import App from "./App";

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: "60px 28px", maxWidth: "480px", margin: "0 auto", fontFamily: "DM Sans, system-ui, sans-serif", textAlign: "center" }}>
          <div style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.8px", color: "#1d1d1f", marginBottom: "16px" }}>
            swish<span style={{ color: "#0071e3" }}>.</span>
          </div>
          <pre style={{ marginTop: "16px", padding: "16px", background: "#f5f5f7", borderRadius: "12px", fontSize: "12px", color: "#c0392b", textAlign: "left", overflow: "auto", whiteSpace: "pre-wrap" }}>
            {this.state.error.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      {clerkKey ? (
        <ClerkProvider publishableKey={clerkKey}>
          <App />
        </ClerkProvider>
      ) : (
        <div style={{ padding: "60px 28px", maxWidth: "480px", margin: "0 auto", fontFamily: "DM Sans, system-ui, sans-serif", textAlign: "center" }}>
          <div style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.8px", color: "#1d1d1f", marginBottom: "16px" }}>
            swish<span style={{ color: "#0071e3" }}>.</span>
          </div>
          <div style={{ color: "#6e6e73", fontSize: "15px" }}>
            Missing VITE_CLERK_PUBLISHABLE_KEY. Check Vercel env vars.
          </div>
        </div>
      )}
    </ErrorBoundary>
  </StrictMode>
);
