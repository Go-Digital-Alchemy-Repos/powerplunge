import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getIconWithFallback } from "@/lib/iconUtils";
import { Section, Container } from "@/cms/layout";
import { FadeIn } from "@/cms/motion";
import { Heading, Text } from "@/cms/typography";
import type { BlockRenderProps } from "./types";

const gridColsMap: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
};

export default function FeatureListBlock({ data, settings }: BlockRenderProps) {
  const title = data?.title || "";
  const items = data?.items || data?.features || [];
  const columns = data?.columns || 3;

  return (
    <Section className={settings?.className} data-testid="block-featurelist">
      <Container>
        <FadeIn>
        {title && (
          <Heading level={2} align="center" className="mb-12">
            {title}
          </Heading>
        )}
        <div
          className={cn(
            "grid grid-cols-1 gap-6",
            gridColsMap[columns] || "md:grid-cols-3"
          )}
        >
          {items.map(
            (
              f: { icon?: string; title: string; description: string },
              idx: number
            ) => {
              const Icon = getIconWithFallback(f.icon, Check);
              return (
                <div
                  key={idx}
                  className="flex flex-col items-center text-center h-full"
                  style={{
                    backgroundColor: "var(--pp-surface, #111827)",
                    borderRadius: "var(--pp-card-radius, 0.75rem)",
                    border: "1px solid color-mix(in srgb, var(--pp-primary, #67e8f9) 10%, transparent)",
                    padding: "2rem 1.5rem",
                    transition: "border-color 200ms ease, box-shadow 200ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "color-mix(in srgb, var(--pp-primary, #67e8f9) 25%, transparent)";
                    e.currentTarget.style.boxShadow = "0 0 24px color-mix(in srgb, var(--pp-primary, #67e8f9) 8%, transparent)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "color-mix(in srgb, var(--pp-primary, #67e8f9) 10%, transparent)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  data-testid={`card-feature-${idx}`}
                >
                  <div
                    className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--pp-primary, #67e8f9) 15%, transparent)",
                    }}
                  >
                    <Icon
                      className="w-6 h-6"
                      style={{ color: "var(--pp-primary, #67e8f9)" }}
                    />
                  </div>
                  <Heading level={3} className="mb-3">{f.title}</Heading>
                  <Text muted className="leading-relaxed">{f.description}</Text>
                </div>
              );
            }
          )}
        </div>
        </FadeIn>
      </Container>
    </Section>
  );
}
