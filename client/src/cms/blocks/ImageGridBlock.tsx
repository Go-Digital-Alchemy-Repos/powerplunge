import { cn } from "@/lib/utils";
import { Section, Container } from "@/cms/layout";
import { FadeIn } from "@/cms/motion";
import { Text } from "@/cms/typography";
import type { BlockRenderProps } from "./types";

const gridColsMap: Record<number, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
};

const spacingMap: Record<string, string> = {
  tight: "gap-3",
  normal: "gap-5",
  loose: "gap-8",
};

export default function ImageGridBlock({ data, settings }: BlockRenderProps) {
  const items = data?.items || data?.images || [];
  const columns = data?.columns || 3;
  const spacing = data?.spacing || "normal";

  return (
    <Section className={settings?.className} data-testid="block-imagegrid">
      <Container>
        <FadeIn>
        <div
          className={cn(
            "grid grid-cols-2",
            gridColsMap[columns] || "md:grid-cols-3",
            spacingMap[spacing] || "gap-5"
          )}
        >
          {items.map(
            (
              img: { src: string; alt?: string; caption?: string; linkHref?: string },
              idx: number
            ) => {
              const imageEl = (
                <div
                  className="relative overflow-hidden aspect-[4/3]"
                  style={{
                    borderRadius: "var(--pp-card-radius, 0.75rem)",
                  }}
                >
                  <img
                    src={img.src}
                    alt={img.alt || ""}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    data-testid={`img-grid-${idx}`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              );

              return (
                <figure
                  key={idx}
                  className="group"
                  style={{
                    transition: "transform 300ms ease, box-shadow 300ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.2), 0 0 24px color-mix(in srgb, var(--pp-primary, #67e8f9) 8%, transparent)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  data-testid={`card-image-${idx}`}
                >
                  {img.linkHref ? (
                    <a href={img.linkHref} className="block">
                      {imageEl}
                    </a>
                  ) : (
                    imageEl
                  )}
                  {img.caption && (
                    <Text
                      size="sm"
                      muted
                      align="center"
                      className="mt-3"
                    >
                      {img.caption}
                    </Text>
                  )}
                </figure>
              );
            }
          )}
        </div>
        </FadeIn>
      </Container>
    </Section>
  );
}
