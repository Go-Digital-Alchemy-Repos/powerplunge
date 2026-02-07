import { useState } from "react";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import { Section, Container } from "@/cms/layout";
import { FadeIn } from "@/cms/motion";
import { Heading, Text } from "@/cms/typography";
import type { BlockRenderProps } from "./types";

function TestimonialCard({
  item,
  idx,
}: {
  item: { quote: string; name: string; title?: string; avatar?: string };
  idx: number;
}) {
  return (
    <div
      className="flex flex-col h-full"
      style={{
        backgroundColor: "var(--pp-surface, #111827)",
        borderRadius: "var(--pp-card-radius, 0.75rem)",
        border: "1px solid color-mix(in srgb, var(--pp-primary, #67e8f9) 10%, transparent)",
        padding: "1.75rem",
        transition: "border-color 200ms ease, box-shadow 200ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "color-mix(in srgb, var(--pp-primary, #67e8f9) 25%, transparent)";
        e.currentTarget.style.boxShadow = "0 0 20px color-mix(in srgb, var(--pp-primary, #67e8f9) 6%, transparent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "color-mix(in srgb, var(--pp-primary, #67e8f9) 10%, transparent)";
        e.currentTarget.style.boxShadow = "none";
      }}
      data-testid={`card-testimonial-${idx}`}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-0.5">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className="w-4 h-4 fill-yellow-400 text-yellow-400"
            />
          ))}
        </div>
        <Quote
          className="w-5 h-5 opacity-20"
          style={{ color: "var(--pp-primary, #67e8f9)" }}
        />
      </div>

      <blockquote className="flex-1 mb-6">
        <Text
          size="base"
          className="italic leading-relaxed"
          style={{
            color: "color-mix(in srgb, var(--pp-text, #f9fafb) 85%, transparent)",
          }}
        >
          "{item.quote}"
        </Text>
      </blockquote>

      <div
        className="flex items-center gap-3 pt-5"
        style={{
          borderTop: "1px solid color-mix(in srgb, var(--pp-primary, #67e8f9) 8%, transparent)",
        }}
      >
        {item.avatar ? (
          <img
            src={item.avatar}
            alt={item.name}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            style={{
              border: "2px solid color-mix(in srgb, var(--pp-primary, #67e8f9) 20%, transparent)",
            }}
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-semibold"
            style={{
              backgroundColor: "color-mix(in srgb, var(--pp-primary, #67e8f9) 15%, transparent)",
              color: "var(--pp-primary, #67e8f9)",
            }}
          >
            {item.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <Text size="sm" className="font-semibold !mb-0" style={{ color: "var(--pp-text, #f9fafb)" }}>
            {item.name}
          </Text>
          {item.title && (
            <Text size="sm" muted className="text-xs !mb-0">{item.title}</Text>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TestimonialsBlock({ data, settings }: BlockRenderProps) {
  const title = data?.title || "";
  const items = data?.items || data?.testimonials || [];
  const layout = data?.layout || "cards";
  const [current, setCurrent] = useState(0);

  if (layout === "slider" && items.length > 0) {
    const next = () => setCurrent((c) => (c + 1) % items.length);
    const prev = () => setCurrent((c) => (c - 1 + items.length) % items.length);

    return (
      <Section className={settings?.className} data-testid="block-testimonials">
        <Container width="default">
          <FadeIn>
          {title && (
            <Heading level={2} align="center" className="mb-12">
              {title}
            </Heading>
          )}
          <div className="relative max-w-2xl mx-auto">
            <TestimonialCard item={items[current]} idx={current} />
            {items.length > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <button
                  onClick={prev}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer"
                  style={{
                    backgroundColor: "var(--pp-surface, #111827)",
                    border: "1px solid color-mix(in srgb, var(--pp-primary, #67e8f9) 15%, transparent)",
                  }}
                  data-testid="testimonial-prev"
                >
                  <ChevronLeft className="w-5 h-5" style={{ color: "var(--pp-text, #f9fafb)" }} />
                </button>
                <div className="flex gap-1.5">
                  {items.map((_, i: number) => (
                    <button
                      key={i}
                      onClick={() => setCurrent(i)}
                      className="w-2 h-2 rounded-full transition-all cursor-pointer"
                      style={{
                        backgroundColor:
                          i === current
                            ? "var(--pp-primary, #67e8f9)"
                            : "color-mix(in srgb, var(--pp-text, #f9fafb) 20%, transparent)",
                      }}
                      data-testid={`testimonial-dot-${i}`}
                    />
                  ))}
                </div>
                <button
                  onClick={next}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer"
                  style={{
                    backgroundColor: "var(--pp-surface, #111827)",
                    border: "1px solid color-mix(in srgb, var(--pp-primary, #67e8f9) 15%, transparent)",
                  }}
                  data-testid="testimonial-next"
                >
                  <ChevronRight className="w-5 h-5" style={{ color: "var(--pp-text, #f9fafb)" }} />
                </button>
              </div>
            )}
          </div>
          </FadeIn>
        </Container>
      </Section>
    );
  }

  return (
    <Section className={settings?.className} data-testid="block-testimonials">
      <Container>
        <FadeIn>
        {title && (
          <Heading level={2} align="center" className="mb-12">
            {title}
          </Heading>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(
            (
              item: { quote: string; name: string; title?: string; avatar?: string },
              idx: number
            ) => (
              <TestimonialCard key={idx} item={item} idx={idx} />
            )
          )}
        </div>
        </FadeIn>
      </Container>
    </Section>
  );
}
