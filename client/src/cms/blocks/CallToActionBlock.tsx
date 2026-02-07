import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Section, Container } from "@/cms/layout";
import { Heading, Text, Eyebrow } from "@/cms/typography";
import { CmsButton } from "@/cms/ui";
import type { BlockRenderProps } from "./types";

export default function CallToActionBlock({ data, settings }: BlockRenderProps) {
  const headline = data?.headline || data?.title || "Get Started";
  const subheadline = data?.subheadline || data?.subtitle || "";
  const primaryCtaText = data?.primaryCtaText || data?.buttonText || "";
  const primaryCtaHref = data?.primaryCtaHref || data?.buttonLink || "#";
  const secondaryCtaText = data?.secondaryCtaText || data?.secondaryButton || "";
  const secondaryCtaHref = data?.secondaryCtaHref || data?.secondaryLink || "";

  return (
    <section
      className={cn("relative overflow-hidden", settings?.className)}
      style={{
        paddingTop: "calc(var(--pp-section-py, 3rem) * 2)",
        paddingBottom: "calc(var(--pp-section-py, 3rem) * 2)",
      }}
      data-testid="block-cta"
    >
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, color-mix(in srgb, var(--pp-primary, #67e8f9) 6%, transparent) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: "linear-gradient(to right, transparent, color-mix(in srgb, var(--pp-primary, #67e8f9) 20%, transparent), transparent)",
        }}
      />

      <Container width="default" className="relative z-10">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Eyebrow align="center" className="mb-4">Ready?</Eyebrow>

          <Heading
            level={2}
            align="center"
            className="text-4xl md:text-5xl lg:text-6xl mb-6 max-w-[20ch] mx-auto leading-[1.1]"
          >
            {headline}
          </Heading>

          {subheadline && (
            <Text
              size="lg"
              muted
              align="center"
              className="mb-12 max-w-[50ch] mx-auto leading-relaxed"
            >
              {subheadline}
            </Text>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {primaryCtaText && (
              <CmsButton
                variant="primary"
                size="lg"
                href={primaryCtaHref}
                data-testid="cta-primary-button"
              >
                {primaryCtaText}
              </CmsButton>
            )}
            {secondaryCtaText && (
              <CmsButton
                variant="ghost"
                size="lg"
                href={secondaryCtaHref}
                data-testid="cta-secondary-button"
              >
                {secondaryCtaText}
              </CmsButton>
            )}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
