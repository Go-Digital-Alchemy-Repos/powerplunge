import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { getIconWithFallback } from "@/lib/iconUtils";
import { Section, Container } from "@/cms/layout";
import type { BlockRenderProps } from "./types";

export default function TrustBarBlock({ data, settings }: BlockRenderProps) {
  const items: { icon?: string; label: string; sublabel?: string }[] =
    data?.items || [];
  const layout = data?.layout || "row";

  return (
    <Section
      background="surface"
      className={settings?.className}
      data-testid="block-trustbar"
    >
      <Container>
        <div
          className={cn(
            layout === "row"
              ? "flex flex-wrap items-center justify-center gap-6 md:gap-0"
              : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6"
          )}
        >
          {items.map((item, idx) => {
            const Icon = getIconWithFallback(item.icon, Shield);
            const isLast = idx === items.length - 1;
            return (
              <div
                key={idx}
                className={cn(
                  "flex items-center gap-3",
                  layout === "row" && "flex-1 min-w-[160px] justify-center",
                  layout === "row" && !isLast && "md:border-r",
                  layout === "wrap" && "flex-col text-center"
                )}
                style={{
                  borderColor: layout === "row" && !isLast
                    ? "color-mix(in srgb, var(--pp-primary, #67e8f9) 12%, transparent)"
                    : undefined,
                  padding: layout === "row" ? "0.75rem 0" : undefined,
                }}
                data-testid={`trust-item-${idx}`}
              >
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--pp-primary, #67e8f9) 12%, transparent)",
                  }}
                >
                  <Icon
                    className="w-5 h-5"
                    style={{ color: "var(--pp-primary, #67e8f9)" }}
                  />
                </div>
                <div>
                  <p
                    className="text-sm font-semibold leading-tight"
                    style={{
                      fontFamily: "var(--pp-font-family, 'Inter', sans-serif)",
                      color: "var(--pp-text, #f9fafb)",
                    }}
                  >
                    {item.label}
                  </p>
                  {item.sublabel && (
                    <p
                      className="text-xs mt-0.5"
                      style={{
                        fontFamily: "var(--pp-font-family, 'Inter', sans-serif)",
                        color: "var(--pp-text-muted, #9ca3af)",
                      }}
                    >
                      {item.sublabel}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
