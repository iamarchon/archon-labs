import { TEAMS } from "@/lib/data/teams";

interface TeamLogoProps {
  team: string;
  size?: number;
}

export default function TeamLogo({ team, size = 40 }: TeamLogoProps) {
  const t = TEAMS[team];
  if (!t) return null;
  return (
    <div
      style={{ width: size, height: size, flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: t.logo }}
    />
  );
}
