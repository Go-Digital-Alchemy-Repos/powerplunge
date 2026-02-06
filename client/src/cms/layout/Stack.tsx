import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type StackGap = 1 | 2 | 3 | 4 | 5 | 6;

interface StackProps {
  children: ReactNode;
  gap?: StackGap;
  className?: string;
}

export default function Stack({ children, gap = 4, className }: StackProps) {
  return (
    <div
      className={cn("flex flex-col", className)}
      style={{ gap: `var(--pp-space-${gap}, ${gap * 4}px)` }}
    >
      {children}
    </div>
  );
}
