import { cn } from "@/lib/utils";
import { Section, Container } from "@/cms/layout";
import { FadeIn } from "@/cms/motion";
import type { BlockRenderProps } from "./types";

export default function ImageBlock({ data, settings }: BlockRenderProps) {
  const src = data?.src || "";
  const alt = data?.alt || "";
  const caption = data?.caption || "";
  const rounded = data?.rounded !== false;
  const linkHref = data?.linkHref || "";
  const aspectRatio = data?.aspectRatio || "";

  if (!src) {
    return (
      <Section className={settings?.className} data-testid="block-image">
        <Container>
          <FadeIn>
          <div className="pp-surface-bg rounded-lg p-8 text-center pp-text-muted">
            No image source provided
          </div>
          </FadeIn>
        </Container>
      </Section>
    );
  }

  const imgEl = (
    <img
      src={src}
      alt={alt}
      className={cn(
        "shadow-lg w-full",
        rounded && "rounded-lg",
        aspectRatio === "16:9" && "aspect-video object-cover",
        aspectRatio === "4:3" && "aspect-[4/3] object-cover",
        aspectRatio === "1:1" && "aspect-square object-cover"
      )}
    />
  );

  return (
    <Section className={settings?.className} data-testid="block-image">
      <Container>
        <FadeIn>
        <figure className={cn(settings?.alignment === "center" && "flex flex-col items-center")}>
          {linkHref ? (
            <a href={linkHref} className="block">
              {imgEl}
            </a>
          ) : (
            imgEl
          )}
          {caption && (
            <figcaption className="mt-4 text-sm pp-text-muted">
              {caption}
            </figcaption>
          )}
        </figure>
        </FadeIn>
      </Container>
    </Section>
  );
}
