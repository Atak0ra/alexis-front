import { Code2, GitBranch, Lightbulb, Rocket, Sparkles, Terminal } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type IconFieldVariant = "light" | "dark";

type Spot = {
  Icon: LucideIcon;
  top: string;
  left: string;
  size: number;
  delay: number;
  duration: number;
};

export const SPOTS: Spot[] = [
  { Icon: Code2,     top: "8%",  left: "6%",  size: 44, delay: 0,   duration: 9 },
  { Icon: Lightbulb, top: "70%", left: "10%", size: 32, delay: 2.4, duration: 11 },
  { Icon: GitBranch, top: "15%", left: "88%", size: 40, delay: 4.8, duration: 8.5 },
  { Icon: Terminal,  top: "55%", left: "92%", size: 28, delay: 1.2, duration: 10 },
  { Icon: Sparkles,  top: "85%", left: "50%", size: 36, delay: 6,   duration: 9.5 },
  { Icon: Rocket,    top: "4%",  left: "45%", size: 26, delay: 3.6, duration: 10.5 },
];

const VARIANT_COLOR_CLASS: Record<IconFieldVariant, string> = {
  light: "text-brand/15",
  dark: "text-white/10",
};

export default function LandingIconField({ variant }: { variant: IconFieldVariant }) {
  return (
    <div
      aria-hidden="true"
      data-testid={`icon-field-${variant}`}
      className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block"
    >
      {SPOTS.map(({ Icon, top, left, size, delay, duration }, i) => (
        <Icon
          key={i}
          strokeWidth={1.5}
          className={`absolute animate-watermark-fade ${VARIANT_COLOR_CLASS[variant]}`}
          style={{
            top,
            left,
            width: size,
            height: size,
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
          }}
        />
      ))}
    </div>
  );
}
