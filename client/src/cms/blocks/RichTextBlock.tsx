import { cn } from "@/lib/utils";
import { Section, Container } from "@/cms/layout";
import { FadeIn } from "@/cms/motion";
import { Heading } from "@/cms/typography";
import type { BlockRenderProps } from "./types";

export default function RichTextBlock({ data, settings }: BlockRenderProps) {
  const title = data?.title || "";
  const body = data?.bodyRichText || data?.content || "";
  const align = data?.align || "left";

  return (
    <Section className={settings?.className} data-testid="block-richtext">
      <Container width="default">
        <FadeIn>
        <div
          className={cn(
            align === "center" && "text-center",
            align === "right" && "text-right",
            align === "center" && "mx-auto"
          )}
          style={{ maxWidth: "72ch" }}
        >
          {title && (
            <Heading level={2} className="mb-12">{title}</Heading>
          )}
          <div
            className="pp-richtext"
            style={{
              fontFamily: "var(--pp-font-family, 'Inter', sans-serif)",
              lineHeight: "1.8",
              color: "color-mix(in srgb, var(--pp-text, #f9fafb) 80%, transparent)",
            }}
            dangerouslySetInnerHTML={{ __html: body }}
          />
        </div>
        </FadeIn>
      </Container>
    </Section>
  );
}
