import { T } from "../tokens";

const S = {
  page: { maxWidth: "720px", margin: "0 auto", padding: "60px 20px 100px" },
  h1: { fontSize: "32px", fontWeight: 700, letterSpacing: "-0.8px", color: T.ink, marginBottom: "8px" },
  date: { fontSize: "13px", color: T.inkFaint, marginBottom: "48px" },
  h2: { fontSize: "18px", fontWeight: 600, color: T.ink, marginTop: "36px", marginBottom: "12px" },
  p: { fontSize: "15px", lineHeight: 1.7, color: T.ink, marginBottom: "12px" },
  ul: { fontSize: "15px", lineHeight: 1.7, color: T.ink, paddingLeft: "24px", marginBottom: "12px" },
};

export default function Terms() {
  return (
    <div style={S.page}>
      <h1 style={S.h1}>Terms of Service</h1>
      <p style={S.date}>Last updated: March 2026</p>

      <h2 style={S.h2}>1. About Swish</h2>
      <p style={S.p}>Swish is a virtual stock trading simulator built for educational purposes. It is operated by Archon Labs. By accessing or using Swish, you agree to these Terms of Service.</p>

      <h2 style={S.h2}>2. Educational Purpose Only</h2>
      <p style={S.p}>Swish is a simulation platform designed to teach investing concepts. Nothing on this platform constitutes financial advice, investment advice, or a recommendation to buy or sell any real security. All trading activity on Swish uses virtual currency with no real monetary value. Any resemblance to actual investment performance is coincidental.</p>

      <h2 style={S.h2}>3. Eligibility</h2>
      <p style={S.p}>You must be at least 13 years old to use Swish. If you are under 18, you confirm that your parent or legal guardian has reviewed and agreed to these Terms on your behalf. If you are a parent or guardian creating an account for a minor, you accept responsibility for their use of the platform.</p>

      <h2 style={S.h2}>4. Virtual Currency</h2>
      <p style={S.p}>The $10,000 in virtual cash provided to new users has no real-world monetary value. It cannot be withdrawn, transferred, exchanged for real money or goods, or redeemed in any form. Archon Labs reserves the right to reset, modify, or remove virtual balances at any time.</p>

      <h2 style={S.h2}>5. Market Data</h2>
      <p style={S.p}>Swish displays real-time or delayed market data sourced from third-party providers including Finnhub. While we strive for accuracy, we do not guarantee the completeness, timeliness, or accuracy of any data displayed. Do not use this data to make real investment decisions.</p>

      <h2 style={S.h2}>6. User Accounts</h2>
      <p style={S.p}>You are responsible for maintaining the security of your account. You agree not to share your account, impersonate others, or use the platform for any unlawful purpose. We reserve the right to suspend or terminate accounts that violate these terms.</p>

      <h2 style={S.h2}>7. Acceptable Use</h2>
      <p style={S.p}>You agree not to:</p>
      <ul style={S.ul}>
        <li>Attempt to manipulate leaderboards or XP through automated means</li>
        <li>Use the platform to harass other users</li>
        <li>Attempt to reverse engineer, scrape, or copy the platform</li>
        <li>Use the platform for any commercial purpose without written permission</li>
      </ul>

      <h2 style={S.h2}>8. Intellectual Property</h2>
      <p style={S.p}>All content, design, and code on Swish is owned by Archon Labs unless otherwise noted. You may not reproduce, distribute, or create derivative works without our permission.</p>

      <h2 style={S.h2}>9. Disclaimer of Warranties</h2>
      <p style={S.p}>Swish is provided "as is" without any warranty of any kind. We do not guarantee the platform will be available at all times, error-free, or suitable for any particular purpose.</p>

      <h2 style={S.h2}>10. Limitation of Liability</h2>
      <p style={S.p}>To the fullest extent permitted by law, Archon Labs shall not be liable for any indirect, incidental, or consequential damages arising from your use of Swish, including any financial decisions made based on content seen on the platform.</p>

      <h2 style={S.h2}>11. Changes to Terms</h2>
      <p style={S.p}>We may update these terms at any time. Continued use of the platform after changes constitutes acceptance of the updated terms. We will note the updated date at the top of this page.</p>

      <h2 style={S.h2}>12. Contact</h2>
      <p style={S.p}>Questions about these terms? Email us at: <a href="mailto:iamarchon@proton.me" style={{ color: T.accent }}>iamarchon@proton.me</a></p>
    </div>
  );
}
