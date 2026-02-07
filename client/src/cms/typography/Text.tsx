import { cn } from "@/lib/utils";
import type { ReactNode, CSSProperties } from "react";

type TextSize = "sm" | "base" | "lg" | "xl";

interface TextProps {
  children: ReactNode;
  size?: TextSize;
  muted?: boolean;
  align?: "left" | "center" | "right";
  prose?: boolean;
  className?: string;
  style?: CSSProperties;
}

const sizeMap: Record<TextSize, string> = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

export default function Text({
  children,
  size = "base",
  muted = false,
  align,
  prose = false,
  className,
  style: styleProp,
}: TextProps) {
  const style: CSSProperties = {
    fontFamily: "var(--pp-font-family, 'Inter', sans-serif)",
    lineHeight: "var(--pp-line-height, 1.5)",
    ...(prose ? { maxWidth: "70ch" } : {}),
    ...styleProp,
  };

  return (
    <p
      className={cn(
        sizeMap[size],
        muted && "pp-text-muted",
        align === "center" && "text-center mx-auto",
        align === "right" && "text-right",
        className
      )}
      style={style}
    >
      {children}
    </p>
  );
}
