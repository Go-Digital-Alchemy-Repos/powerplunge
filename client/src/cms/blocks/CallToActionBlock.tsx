import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Section, Container } from "@/cms/layout";
import type { BlockRenderProps } from "./types";

export default function CallToActionBlock({ data, settings }: BlockRenderProps) {
  const headline = data?.headline || data?.title || "Get Started";
  const subheadline = data?.subheadline || data?.subtitle || "";
  const primaryCtaText = data?.primaryCtaText || data?.buttonText || "";
  const primaryCtaHref = data?.primaryCtaHref || data?.buttonLink || "#";
  const secondaryCtaText = data?.secondaryCtaText || data?.secondaryButton || "";
  const secondaryCtaHref = data?.secondaryCtaHref || data?.secondaryLink || "";

  return (
    <Section
      background="surface"
      divider
      className={cn(settings?.className)}
      data-testid="block-cta"
    >
      <Container width="default">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
              {headline}
            </h2>
            {subheadline && (
              <p className="pp-text-muted text-lg mb-10 max-w-2xl mx-auto">
                {subheadline}
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {primaryCtaText && (
                <Button
                  size="lg"
                  className="glow-ice text-lg px-10 py-6"
                  onClick={() => {
                    if (primaryCtaHref) window.location.href = primaryCtaHref;
                  }}
                  data-testid="cta-primary-button"
                >
                  {primaryCtaText}
                </Button>
              )}
              {secondaryCtaText && (
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8"
                  onClick={() => {
                    if (secondaryCtaHref) window.location.href = secondaryCtaHref;
                  }}
                >
                  {secondaryCtaText}
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </Container>
    </Section>
  );
}
