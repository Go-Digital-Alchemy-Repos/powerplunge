import { cn } from "@/lib/utils";
import type { ReactNode, ElementType, CSSProperties } from "react";

type HeadingLevel = 1 | 2 | 3;

interface HeadingProps {
  level?: HeadingLevel;
  children: ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
  gradient?: boolean;
  style?: CSSProperties;
}

const levelStyles: Record<HeadingLevel, string> = {
  1: "font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight",
  2: "text-3xl md:text-4xl font-bold",
  3: "text-xl font-semibold",
};

export default function Heading({
  level = 2,
  children,
  className,
  align,
  gradient,
  style: styleProp,
}: HeadingProps) {
  const Tag = `h${level}` as ElementType;

  const style: CSSProperties = {
    fontFamily: "var(--pp-font-family, 'Inter', sans-serif)",
    letterSpacing:
      level === 1
        ? "-0.025em"
        : "var(--pp-letter-spacing, 0em)",
    ...styleProp,
  };

  return (
    <Tag
      className={cn(
        levelStyles[level],
        align === "center" && "text-center",
        align === "right" && "text-right",
        gradient && "text-gradient-ice",
        className
      )}
      style={style}
    >
      {children}
    </Tag>
  );
}
