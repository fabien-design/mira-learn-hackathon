import { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

interface SectionTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3";
  size?: "hero" | "page" | "section";
}

const SIZE: Record<"hero" | "page" | "section", string> = {
  hero: "text-[clamp(2.5rem,5.5vw,4rem)] leading-[1.05]",
  page: "text-4xl leading-tight",
  section: "text-2xl leading-tight",
};

export function SectionTitle({
  as: Tag = "h2",
  size = "section",
  className,
  children,
  ...rest
}: SectionTitleProps) {
  return (
    <Tag
      className={cn(
        "font-serif font-medium tracking-tight text-charcoal",
        SIZE[size],
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
