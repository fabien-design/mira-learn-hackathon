import { cn } from "@/lib/utils";

const GRADIENTS: [string, string][] = [
  ["#E6332A", "#B12420"],
  ["#D4A853", "#9A7A36"],
  ["#1D1D1B", "#4A4A45"],
  ["#63B1BB", "#3F7F87"],
  ["#95C11F", "#658212"],
  ["#E6332A", "#FF7A4D"],
  ["#1D1D1B", "#6B7280"],
  ["#D4A853", "#E6332A"],
  ["#888888", "#4A4A45"],
];

function gradientFor(seed: string): [string, string] {
  let n = 0;
  for (let i = 0; i < seed.length; i++) n = (n + seed.charCodeAt(i)) % GRADIENTS.length;
  return GRADIENTS[n] ?? GRADIENTS[0];
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

interface MiraAvatarProps {
  name: string;
  size?: number;
  ring?: boolean;
  className?: string;
}

export function MiraAvatar({ name, size = 44, ring, className }: MiraAvatarProps) {
  const [a, b] = gradientFor(initialsFrom(name));
  const fontSize = Math.round(size * 0.38);
  return (
    <span
      aria-label={name}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize,
        background: `linear-gradient(135deg, ${a} 0%, ${b} 100%)`,
        boxShadow: ring ? "0 0 0 4px #fff, 0 0 0 5px var(--rule)" : undefined,
      }}
    >
      {initialsFrom(name)}
    </span>
  );
}
