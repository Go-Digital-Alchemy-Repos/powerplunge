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
    <Section divider className={settings?.className} data-testid="block-trustbar">
      <Container>
        <div
          className={cn(
            layout === "row"
              ? "flex flex-wrap items-center justify-center gap-8 md:gap-16"
              : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6"
          )}
        >
          {items.map((item, idx) => {
            const Icon = getIconWithFallback(item.icon, Shield);
            return (
              <div
                key={idx}
                className={cn(
                  "flex items-center gap-3",
                  layout === "wrap" && "flex-col text-center"
                )}
              >
                <div className="flex-shrink-0 w-10 h-10 bg-cyan-500/10 rounded-full flex items-center justify-center">
                  <Icon className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">
                    {item.label}
                  </p>
                  {item.sublabel && (
                    <p className="text-xs pp-text-muted">{item.sublabel}</p>
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
