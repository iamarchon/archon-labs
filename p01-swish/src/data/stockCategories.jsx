import { Car, ShoppingBag, Monitor, Zap, Film, Gamepad2, Heart, Landmark,
  Globe, BarChart2, Utensils, Plane, Truck, TrendingUp, Bitcoin } from "lucide-react";

export const STOCK_CATEGORIES = {
  AAPL: "Tech", NVDA: "Tech", MSFT: "Tech", GOOGL: "Tech", AMD: "Tech",
  TSLA: "Auto",
  RBLX: "Gaming",
  NFLX: "Media", SPOT: "Media", DIS: "Media",
  SNAP: "Social", META: "Social",
  PYPL: "Fintech", COIN: "Crypto",
  BTC: "Crypto", ETH: "Crypto", BNB: "Crypto", SOL: "Crypto", XRP: "Crypto",
  DOGE: "Crypto", ADA: "Crypto", AVAX: "Crypto", SHIB: "Crypto", DOT: "Crypto",
  MATIC: "Crypto", LTC: "Crypto", UNI: "Crypto", LINK: "Crypto", ATOM: "Crypto",
  XLM: "Crypto", ALGO: "Crypto", ICP: "Crypto", FIL: "Crypto", NEAR: "Crypto",
  NKE: "Consumer",
  AMZN: "Retail",
  CMG: "Food", SBUX: "Food",
  ABNB: "Travel", UBER: "Transport",
  SPY: "ETF", VOO: "ETF", QQQ: "ETF", VTI: "ETF", IWM: "ETF", IVV: "ETF",
  GLD: "ETF", TLT: "ETF", ARKK: "ETF", VNQ: "ETF", SCHD: "ETF", VGT: "ETF",
  XLF: "ETF", XLE: "ETF", SOXX: "ETF", DIA: "ETF", VEA: "ETF", VWO: "ETF",
  BND: "ETF", IEMG: "ETF",
};

const CATEGORY_ICON_CONFIG = {
  Auto:      { icon: Car,         bg: "#e8f4fd", color: "#0071e3" },
  Tech:      { icon: Monitor,     bg: "#f0f0f5", color: "#5856d6" },
  Retail:    { icon: ShoppingBag, bg: "#fff0f0", color: "#ff3b30" },
  Media:     { icon: Film,        bg: "#fff8e6", color: "#ff9500" },
  Gaming:    { icon: Gamepad2,    bg: "#f0fff4", color: "#34c759" },
  Finance:   { icon: Landmark,    bg: "#e8f4fd", color: "#0071e3" },
  Fintech:   { icon: BarChart2,   bg: "#f5f0ff", color: "#af52de" },
  Health:    { icon: Heart,       bg: "#fff0f5", color: "#ff2d55" },
  Energy:    { icon: Zap,         bg: "#fffbe6", color: "#ff9500" },
  Social:    { icon: Globe,       bg: "#e6f9ff", color: "#32ade6" },
  Consumer:  { icon: ShoppingBag, bg: "#fff0f0", color: "#ff3b30" },
  Food:      { icon: Utensils,    bg: "#fff8e6", color: "#ff9500" },
  Travel:    { icon: Plane,       bg: "#e8f4fd", color: "#0071e3" },
  Crypto:    { icon: Bitcoin,     bg: "#fff8e6", color: "#f7931a" },
  Transport: { icon: Truck,       bg: "#f0f0f5", color: "#5856d6" },
  ETF:       { icon: BarChart2,   bg: "#f0f0f5", color: "#86868b" },
  Other:     { icon: TrendingUp,  bg: "#f5f5f7", color: "#86868b" },
};

export function CategoryIcon({ category, size = 22, iconSize = 13 }) {
  const config = CATEGORY_ICON_CONFIG[category] || CATEGORY_ICON_CONFIG.Other;
  const Icon = config.icon;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: size,
      height: size,
      borderRadius: 6,
      backgroundColor: config.bg,
      flexShrink: 0,
    }}>
      <Icon size={iconSize} color={config.color} strokeWidth={2} />
    </span>
  );
}
