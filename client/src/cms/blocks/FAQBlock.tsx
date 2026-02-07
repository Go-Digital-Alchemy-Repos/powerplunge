import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { Section, Container } from "@/cms/layout";
import { FadeIn } from "@/cms/motion";
import { Heading, Text } from "@/cms/typography";
import type { BlockRenderProps } from "./types";

function AccordionItem({
  question,
  answer,
  isOpen,
  onToggle,
  idx,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  idx: number;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen]);

  return (
    <div
      style={{
        borderRadius: "var(--pp-card-radius, 0.75rem)",
        border: isOpen
          ? "1px solid color-mix(in srgb, var(--pp-primary, #67e8f9) 20%, transparent)"
          : "1px solid color-mix(in srgb, var(--pp-primary, #67e8f9) 8%, transparent)",
        backgroundColor: isOpen
          ? "var(--pp-surface, #111827)"
          : "transparent",
        transition: "border-color 200ms ease, background-color 200ms ease",
      }}
      data-testid={`faq-item-${idx}`}
    >
      <button
        className="w-full flex items-center justify-between gap-4 text-left cursor-pointer"
        style={{
          padding: "1.25rem 1.5rem",
          fontFamily: "var(--pp-font-family, 'Inter', sans-serif)",
        }}
        onClick={onToggle}
        data-testid={`faq-toggle-${idx}`}
      >
        <span
          className="font-semibold text-base"
          style={{ color: "var(--pp-text, #f9fafb)" }}
        >
          {question}
        </span>
        <ChevronDown
          className="w-5 h-5 flex-shrink-0 transition-transform duration-300"
          style={{
            color: isOpen
              ? "var(--pp-primary, #67e8f9)"
              : "var(--pp-text-muted, #9ca3af)",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
      <div
        ref={contentRef}
        className="overflow-hidden transition-[height] duration-300 ease-in-out"
        style={{ height }}
      >
        <div
          style={{
            padding: "0 1.5rem 1.25rem",
          }}
        >
          <div
            style={{
              borderTop: "1px solid color-mix(in srgb, var(--pp-primary, #67e8f9) 8%, transparent)",
              paddingTop: "1rem",
            }}
          >
            <Text muted prose className="leading-relaxed">{answer}</Text>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FAQBlock({ data, settings }: BlockRenderProps) {
  const title = data?.title || "";
  const items = data?.items || [];
  const allowMultipleOpen = data?.allowMultipleOpen === true;
  const [openIndices, setOpenIndices] = useState<Set<number>>(new Set());

  const toggle = useCallback(
    (idx: number) => {
      setOpenIndices((prev) => {
        const next = new Set(allowMultipleOpen ? prev : []);
        if (prev.has(idx)) {
          next.delete(idx);
        } else {
          next.add(idx);
        }
        return next;
      });
    },
    [allowMultipleOpen]
  );

  return (
    <Section className={settings?.className} data-testid="block-faq">
      <Container width="narrow">
        <FadeIn>
        {title && (
          <Heading level={2} align="center" className="mb-12">
            {title}
          </Heading>
        )}
        <div className="flex flex-col gap-3">
          {items.map(
            (
              faq: { q?: string; question?: string; a?: string; answer?: string },
              idx: number
            ) => {
              const question = faq.q || faq.question || "";
              const answer = faq.a || faq.answer || "";
              return (
                <AccordionItem
                  key={idx}
                  question={question}
                  answer={answer}
                  isOpen={openIndices.has(idx)}
                  onToggle={() => toggle(idx)}
                  idx={idx}
                />
              );
            }
          )}
        </div>
        </FadeIn>
      </Container>
    </Section>
  );
}
