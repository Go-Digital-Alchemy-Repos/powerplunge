import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type ContainerWidth = "narrow" | "default" | "wide" | "full";

interface ContainerProps {
  children: ReactNode;
  width?: ContainerWidth;
  className?: string;
}

const widthScale: Record<ContainerWidth, number | null> = {
  narrow: 0.46875,
  default: 0.78125,
  wide: 1,
  full: null,
};

export default function Container({
  children,
  width = "wide",
  className,
}: ContainerProps) {
  const scale = widthScale[width];

  return (
    <div
      className={cn("mx-auto w-full", className)}
      style={{
        maxWidth:
          scale === null
            ? "none"
            : scale === 1
              ? "calc(var(--pp-container-max, 1280) * 1px)"
              : `calc(var(--pp-container-max, 1280) * ${scale} * 1px)`,
        paddingLeft: "var(--pp-section-px, 1rem)",
        paddingRight: "var(--pp-section-px, 1rem)",
      }}
    >
      {children}
    </div>
  );
}
