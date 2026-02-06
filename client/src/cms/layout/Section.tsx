import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type SectionBackground = "default" | "surface" | "accent" | "muted";

interface SectionProps {
  children: ReactNode;
  background?: SectionBackground;
  divider?: boolean;
  className?: string;
  "data-testid"?: string;
}

const bgStyles: Record<SectionBackground, React.CSSProperties> = {
  default: {},
  surface: { backgroundColor: "var(--pp-surface, #111827)" },
  accent: { backgroundColor: "var(--pp-primary, #67e8f9)", color: "var(--pp-primary-text, #030712)" },
  muted: { backgroundColor: "var(--pp-surface-alt, #1f2937)" },
};

export default function Section({
  children,
  background = "default",
  divider = false,
  className,
  "data-testid": testId,
}: SectionProps) {
  return (
    <section
      className={cn("w-full", divider && "pp-border-subtle border-b", className)}
      style={{
        paddingTop: "var(--pp-section-py, 3rem)",
        paddingBottom: "var(--pp-section-py, 3rem)",
        ...bgStyles[background],
      }}
      data-testid={testId}
    >
      {children}
    </section>
  );
}
