import type { Team } from "@/types";

export const TEAMS: Record<string, Team> = {
  RCB: {
    name: "Royal Challengers Bengaluru", short: "RCB",
    c1: "#D71920", c2: "#000000", city: "Bengaluru",
    logo: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#D71920" stroke="#000000" stroke-width="1.5"/><text x="20" y="14" text-anchor="middle" fill="#000000" font-size="6.5" font-weight="900" font-family="Arial">ROYAL</text><text x="20" y="24" text-anchor="middle" fill="#000000" font-size="11" font-weight="900" font-family="Arial">RCB</text><text x="20" y="32" text-anchor="middle" fill="#000000" font-size="5" font-weight="700" font-family="Arial">CHALLENGERS</text></svg>`,
  },
  MI: {
    name: "Mumbai Indians", short: "MI",
    c1: "#004BA0", c2: "#D4AF37", city: "Mumbai",
    logo: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#004BA0" stroke="#D4AF37" stroke-width="1.5"/><text x="20" y="17" text-anchor="middle" fill="#D4AF37" font-size="14" font-weight="900" font-family="Arial">MI</text><text x="20" y="27" text-anchor="middle" fill="#D4AF37" font-size="5.5" font-weight="700" font-family="Arial">MUMBAI</text><text x="20" y="33" text-anchor="middle" fill="#D4AF37" font-size="5.5" font-weight="700" font-family="Arial">INDIANS</text></svg>`,
  },
  CSK: {
    name: "Chennai Super Kings", short: "CSK",
    c1: "#FDB913", c2: "#1D4F91", city: "Chennai",
    logo: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#FDB913" stroke="#1D4F91" stroke-width="1.5"/><text x="20" y="17" text-anchor="middle" fill="#1D4F91" font-size="11" font-weight="900" font-family="Arial">CSK</text><text x="20" y="27" text-anchor="middle" fill="#1D4F91" font-size="5.5" font-weight="700" font-family="Arial">SUPER</text><text x="20" y="33" text-anchor="middle" fill="#1D4F91" font-size="5.5" font-weight="700" font-family="Arial">KINGS</text></svg>`,
  },
  KKR: {
    name: "Kolkata Knight Riders", short: "KKR",
    c1: "#3F1C5C", c2: "#D4AF37", city: "Kolkata",
    logo: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#3F1C5C" stroke="#D4AF37" stroke-width="1.5"/><text x="20" y="17" text-anchor="middle" fill="#D4AF37" font-size="11" font-weight="900" font-family="Arial">KKR</text><text x="20" y="27" text-anchor="middle" fill="#D4AF37" font-size="5.5" font-weight="700" font-family="Arial">KNIGHT</text><text x="20" y="33" text-anchor="middle" fill="#D4AF37" font-size="5.5" font-weight="700" font-family="Arial">RIDERS</text></svg>`,
  },
  SRH: {
    name: "Sunrisers Hyderabad", short: "SRH",
    c1: "#F26522", c2: "#000000", city: "Hyderabad",
    logo: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#F26522" stroke="#000000" stroke-width="1.5"/><text x="20" y="17" text-anchor="middle" fill="#000000" font-size="11" font-weight="900" font-family="Arial">SRH</text><text x="20" y="27" text-anchor="middle" fill="#000000" font-size="5.5" font-weight="700" font-family="Arial">SUNRISERS</text><text x="20" y="33" text-anchor="middle" fill="#000000" font-size="5.5" font-weight="700" font-family="Arial">HYDERABAD</text></svg>`,
  },
  GT: {
    name: "Gujarat Titans", short: "GT",
    c1: "#1B2133", c2: "#C4975A", city: "Ahmedabad",
    logo: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#1B2133" stroke="#C4975A" stroke-width="1.5"/><text x="20" y="17" text-anchor="middle" fill="#C4975A" font-size="14" font-weight="900" font-family="Arial">GT</text><text x="20" y="27" text-anchor="middle" fill="#C4975A" font-size="5.5" font-weight="700" font-family="Arial">GUJARAT</text><text x="20" y="33" text-anchor="middle" fill="#C4975A" font-size="5.5" font-weight="700" font-family="Arial">TITANS</text></svg>`,
  },
  DC: {
    name: "Delhi Capitals", short: "DC",
    c1: "#004C97", c2: "#EF1C25", city: "Delhi",
    logo: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#004C97" stroke="#EF1C25" stroke-width="1.5"/><text x="20" y="17" text-anchor="middle" fill="#EF1C25" font-size="14" font-weight="900" font-family="Arial">DC</text><text x="20" y="27" text-anchor="middle" fill="#fff" font-size="5.5" font-weight="700" font-family="Arial">DELHI</text><text x="20" y="33" text-anchor="middle" fill="#fff" font-size="5.5" font-weight="700" font-family="Arial">CAPITALS</text></svg>`,
  },
  PBKS: {
    name: "Punjab Kings", short: "PBKS",
    c1: "#ED1B24", c2: "#A8A9AD", city: "Chandigarh",
    logo: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#ED1B24" stroke="#A8A9AD" stroke-width="1.5"/><text x="20" y="15" text-anchor="middle" fill="#fff" font-size="9" font-weight="900" font-family="Arial">PBKS</text><text x="20" y="25" text-anchor="middle" fill="#fff" font-size="5.5" font-weight="700" font-family="Arial">PUNJAB</text><text x="20" y="33" text-anchor="middle" fill="#fff" font-size="5.5" font-weight="700" font-family="Arial">KINGS</text></svg>`,
  },
  RR: {
    name: "Rajasthan Royals", short: "RR",
    c1: "#EA1A85", c2: "#254AA5", city: "Jaipur",
    logo: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#EA1A85" stroke="#254AA5" stroke-width="1.5"/><text x="20" y="17" text-anchor="middle" fill="#254AA5" font-size="14" font-weight="900" font-family="Arial">RR</text><text x="20" y="27" text-anchor="middle" fill="#fff" font-size="5.5" font-weight="700" font-family="Arial">RAJASTHAN</text><text x="20" y="33" text-anchor="middle" fill="#fff" font-size="5.5" font-weight="700" font-family="Arial">ROYALS</text></svg>`,
  },
  LSG: {
    name: "Lucknow Super Giants", short: "LSG",
    c1: "#00AEEF", c2: "#F15A29", city: "Lucknow",
    logo: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#00AEEF" stroke="#F15A29" stroke-width="1.5"/><text x="20" y="17" text-anchor="middle" fill="#F15A29" font-size="11" font-weight="900" font-family="Arial">LSG</text><text x="20" y="27" text-anchor="middle" fill="#0F172A" font-size="5.5" font-weight="700" font-family="Arial">LUCKNOW</text><text x="20" y="33" text-anchor="middle" fill="#0F172A" font-size="5" font-weight="700" font-family="Arial">SUPER GIANTS</text></svg>`,
  },
};
