import { cn } from "@/lib/utils";
import { Section, Container } from "@/cms/layout";
import type { BlockRenderProps } from "./types";

export default function RichTextBlock({ data, settings }: BlockRenderProps) {
  const title = data?.title || "";
  const body = data?.bodyRichText || data?.content || "";
  const align = data?.align || "left";

  return (
    <Section className={settings?.className} data-testid="block-richtext">
      <Container width="default">
        <div
          className={cn(
            align === "center" && "text-center",
            align === "right" && "text-right"
          )}
        >
          {title && (
            <h2 className="text-3xl font-bold text-white mb-6">{title}</h2>
          )}
          <div
            className="prose prose-invert prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: body }}
          />
        </div>
      </Container>
    </Section>
  );
}
