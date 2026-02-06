import { cn } from "@/lib/utils";
import { Section, Container } from "@/cms/layout";
import type { BlockRenderProps } from "./types";

const gridColsMap: Record<number, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
};

const spacingMap: Record<string, string> = {
  tight: "gap-2",
  normal: "gap-4",
  loose: "gap-8",
};

export default function ImageGridBlock({ data, settings }: BlockRenderProps) {
  const items = data?.items || data?.images || [];
  const columns = data?.columns || 3;
  const spacing = data?.spacing || "normal";

  return (
    <Section className={settings?.className} data-testid="block-imagegrid">
      <Container>
        <div
          className={cn(
            "grid grid-cols-2",
            gridColsMap[columns] || "md:grid-cols-3",
            spacingMap[spacing] || "gap-4"
          )}
        >
          {items.map(
            (
              img: { src: string; alt?: string; caption?: string; linkHref?: string },
              idx: number
            ) => {
              const imgEl = (
                <img
                  src={img.src}
                  alt={img.alt || ""}
                  className="rounded-lg shadow-lg w-full h-48 object-cover"
                />
              );
              return (
                <figure key={idx}>
                  {img.linkHref ? (
                    <a href={img.linkHref} className="block">
                      {imgEl}
                    </a>
                  ) : (
                    imgEl
                  )}
                  {img.caption && (
                    <figcaption className="mt-2 text-sm pp-text-muted text-center">
                      {img.caption}
                    </figcaption>
                  )}
                </figure>
              );
            }
          )}
        </div>
      </Container>
    </Section>
  );
}
