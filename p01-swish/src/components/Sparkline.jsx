import { T } from "../tokens";

export default function Sparkline({ positive, width = 72, height = 28, data }) {
  const pts = data?.length >= 2
    ? data
    : positive ? [4,7,5,11,14,10,17,13,19,22] : [22,19,23,16,11,13,9,6,8,2];
  const max = Math.max(...pts), min = Math.min(...pts), range = max - min || 1;
  const coords = pts.map((p, i) => `${(i/(pts.length-1))*width},${height-((p-min)/range)*(height-6)-3}`);
  const resolvedPositive = data?.length >= 2 ? pts[pts.length - 1] >= pts[0] : positive;
  const color = resolvedPositive ? T.green : T.red;
  const uid = `sp${resolvedPositive?"p":"n"}${width}${data?"d":""}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display:"block" }}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity=".14" />
          <stop offset="100%" stopColor={color} stopOpacity="0"   />
        </linearGradient>
      </defs>
      <path d={`M 0,${height} L ${coords.join(" L ")} L ${width},${height} Z`} fill={`url(#${uid})`} />
      <path d={`M ${coords.join(" L ")}`} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
