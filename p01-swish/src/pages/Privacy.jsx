import { T } from "../tokens";

const S = {
  page: { maxWidth: "720px", margin: "0 auto", padding: "60px 20px 100px" },
  h1: { fontSize: "32px", fontWeight: 700, letterSpacing: "-0.8px", color: T.ink, marginBottom: "8px" },
  date: { fontSize: "13px", color: T.inkFaint, marginBottom: "48px" },
  h2: { fontSize: "18px", fontWeight: 600, color: T.ink, marginTop: "36px", marginBottom: "12px" },
  h3: { fontSize: "15px", fontWeight: 600, color: T.inkMid, marginTop: "20px", marginBottom: "8px" },
  p: { fontSize: "15px", lineHeight: 1.7, color: T.ink, marginBottom: "12px" },
  ul: { fontSize: "15px", lineHeight: 1.7, color: T.ink, paddingLeft: "24px", marginBottom: "12px" },
};

export default function Privacy() {
  return (
    <div style={S.page}>
      <h1 style={S.h1}>Privacy Policy</h1>
      <p style={S.date}>Last updated: March 2026</p>

      <h2 style={S.h2}>1. Overview</h2>
      <p style={S.p}>Archon Labs ("we", "us", "our") operates Swish at swishapp.vercel.app. This Privacy Policy explains what information we collect, how we use it, and your rights regarding that information.</p>

      <h2 style={S.h2}>2. Information We Collect</h2>
      <h3 style={S.h3}>Information you provide:</h3>
      <ul style={S.ul}>
        <li>Email address and name when creating an account (via Clerk authentication)</li>
        <li>Any information entered into the AI Coach chat</li>
      </ul>
      <h3 style={S.h3}>Information collected automatically:</h3>
      <ul style={S.ul}>
        <li>Virtual trading activity (trades, holdings, XP, league membership)</li>
        <li>Usage data such as pages visited and features used</li>
        <li>Device type and browser information</li>
      </ul>
      <h3 style={S.h3}>Information we do NOT collect:</h3>
      <ul style={S.ul}>
        <li>Real financial information</li>
        <li>Payment or credit card details</li>
        <li>Government ID or social security numbers</li>
        <li>Precise location data</li>
      </ul>

      <h2 style={S.h2}>3. How We Use Your Information</h2>
      <p style={S.p}>We use the information we collect to:</p>
      <ul style={S.ul}>
        <li>Operate and maintain your account and portfolio</li>
        <li>Display leaderboards and league features</li>
        <li>Personalise your learning experience</li>
        <li>Improve the platform based on usage patterns</li>
        <li>Respond to support requests</li>
      </ul>
      <p style={S.p}>We do not use your information to serve advertising. We do not sell your data to any third party.</p>

      <h2 style={S.h2}>4. Children's Privacy (COPPA)</h2>
      <p style={S.p}>Swish is intended for users aged 13 and older. We do not knowingly collect personal information from children under 13 without verifiable parental consent. If you are a parent and believe your child under 13 has created an account without your consent, please contact us immediately at <a href="mailto:iamarchon@proton.me" style={{ color: T.accent }}>iamarchon@proton.me</a> and we will delete the account and associated data. If you are between 13 and 17, we encourage a parent or guardian to review this policy with you.</p>

      <h2 style={S.h2}>5. Data Storage and Security</h2>
      <p style={S.p}>User data is stored securely using Supabase. Authentication is handled by Clerk. Both providers maintain industry-standard security practices. While we take reasonable precautions to protect your data, no system is completely secure and we cannot guarantee absolute security.</p>

      <h2 style={S.h2}>6. Third-Party Services</h2>
      <p style={S.p}>Swish uses the following third-party services which may process your data:</p>
      <ul style={S.ul}>
        <li><strong>Clerk</strong> — Authentication and user accounts</li>
        <li><strong>Supabase</strong> — Database and data storage</li>
        <li><strong>Finnhub</strong> — Real-time market data</li>
        <li><strong>Anthropic Claude API</strong> — AI Coach responses</li>
        <li><strong>Vercel</strong> — Hosting and deployment</li>
      </ul>
      <p style={S.p}>Each of these providers has their own privacy policy governing their data practices.</p>

      <h2 style={S.h2}>7. Data Retention</h2>
      <p style={S.p}>We retain your account data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where retention is required by law.</p>

      <h2 style={S.h2}>8. Your Rights</h2>
      <p style={S.p}>Depending on your location you may have the right to:</p>
      <ul style={S.ul}>
        <li>Access the personal data we hold about you</li>
        <li>Request correction of inaccurate data</li>
        <li>Request deletion of your account and data</li>
        <li>Object to certain uses of your data</li>
      </ul>
      <p style={S.p}>To exercise any of these rights, contact us at <a href="mailto:iamarchon@proton.me" style={{ color: T.accent }}>iamarchon@proton.me</a>.</p>

      <h2 style={S.h2}>9. Cookies</h2>
      <p style={S.p}>Swish uses essential cookies to maintain your login session. We do not use tracking cookies or advertising cookies. You can disable cookies in your browser settings but this may affect functionality.</p>

      <h2 style={S.h2}>10. Changes to This Policy</h2>
      <p style={S.p}>We may update this policy from time to time. We will update the date at the top of this page when changes are made. Continued use of Swish after changes constitutes acceptance of the updated policy.</p>

      <h2 style={S.h2}>11. Contact</h2>
      <p style={S.p}>For any privacy-related questions or data requests:</p>
      <p style={S.p}>
        Archon Labs<br />
        Email: <a href="mailto:iamarchon@proton.me" style={{ color: T.accent }}>iamarchon@proton.me</a><br />
        Website: <a href="https://swishapp.vercel.app" style={{ color: T.accent }}>swishapp.vercel.app</a>
      </p>
    </div>
  );
}
