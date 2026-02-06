import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Section, Container } from "@/cms/layout";
import type { BlockRenderProps } from "./types";

export default function FAQBlock({ data, settings }: BlockRenderProps) {
  const title = data?.title || "";
  const items = data?.items || [];
  const allowMultipleOpen = data?.allowMultipleOpen === true;
  const [openIndices, setOpenIndices] = useState<Set<number>>(new Set());

  const toggle = (idx: number) => {
    setOpenIndices((prev) => {
      const next = new Set(allowMultipleOpen ? prev : []);
      if (prev.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  return (
    <Section className={settings?.className} data-testid="block-faq">
      <Container width="narrow">
        {title && (
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            {title}
          </h2>
        )}
        <div className="space-y-4">
          {items.map(
            (
              faq: { q?: string; question?: string; a?: string; answer?: string },
              idx: number
            ) => {
              const question = faq.q || faq.question || "";
              const answer = faq.a || faq.answer || "";
              const isOpen = openIndices.has(idx);

              return (
                <div
                  key={idx}
                  className="border pp-border-subtle rounded-lg overflow-hidden"
                  data-testid={`faq-item-${idx}`}
                >
                  <button
                    className="w-full flex items-center justify-between p-4 text-left pp-surface-bg hover:brightness-110 transition-colors"
                    onClick={() => toggle(idx)}
                    data-testid={`faq-toggle-${idx}`}
                  >
                    <span className="font-medium text-white">{question}</span>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 pp-text-muted flex-shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="p-4 pp-text-muted bg-slate-900/50">
                      {answer}
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>
      </Container>
    </Section>
  );
}
