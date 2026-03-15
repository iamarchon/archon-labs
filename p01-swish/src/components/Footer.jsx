import { Link } from "react-router-dom";
import { T } from "../tokens";

export default function Footer() {
  return (
    <footer style={{
      borderTop: `1px solid ${T.line}`,
      padding: "32px 20px",
      textAlign: "center",
      marginTop: "60px",
      background: T.bg,
    }}>
      <p style={{ fontSize: "12px", color: T.inkFaint, marginBottom: "8px" }}>
        © 2025 Swish by Archon Labs
      </p>
      <p style={{ fontSize: "12px", color: T.inkFaint, marginBottom: "8px" }}>
        <Link to="/terms" style={{ color: T.inkFaint, textDecoration: "none" }}
          onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
          onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
        >Terms of Service</Link>
        {" · "}
        <Link to="/privacy" style={{ color: T.inkFaint, textDecoration: "none" }}
          onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
          onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
        >Privacy Policy</Link>
        {" · "}
        <a href="mailto:iamarchon@proton.me" style={{ color: T.inkFaint, textDecoration: "none" }}
          onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
          onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
        >Contact</a>
      </p>
      <p style={{ fontSize: "12px", color: T.inkFaint }}>
        For educational purposes only. Not financial advice.
      </p>
    </footer>
  );
}
