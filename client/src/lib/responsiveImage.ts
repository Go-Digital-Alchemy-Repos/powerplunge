import type { ImgHTMLAttributes } from "react";

type ResponsiveImageOptions = {
  sizes?: string;
};

const optimizedR2WidthsByPath: Record<string, number[]> = {
  "/r2/uploads/1770848135066_fe090fbb_hero.jpg": [320, 640, 960, 1280, 1920],
  "/r2/uploads/1770849636936_1c30381d_powerplungelogo_1767907611722-eH_PwLev.png": [320],
  "/r2/uploads/1770849863219_13f414e5_tank.png": [320, 640, 960],
  "/r2/uploads/1770849874105_5cfbcd6a_pump.png": [320, 640, 960],
  "/r2/uploads/1770965470789_be3ee985_5881678808368.jpg": [320, 640, 960, 1280],
};

function optimizedPathForWidth(src: string, width: number): string | null {
  const match = src.match(/^\/r2\/uploads\/(.+)\.[^./?#]+$/);
  if (!match) return null;
  return `/r2/optimized/${width}/uploads/${match[1]}.webp`;
}

export function getResponsiveImageProps(
  src: string,
  options: ResponsiveImageOptions = {},
): Pick<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "sizes"> {
  const widths = optimizedR2WidthsByPath[src];
  if (!widths?.length) {
    return { src };
  }

  const srcSet = widths
    .map((width) => {
      const optimizedPath = optimizedPathForWidth(src, width);
      return optimizedPath ? `${optimizedPath} ${width}w` : null;
    })
    .filter(Boolean)
    .join(", ");

  return {
    src,
    srcSet: srcSet || undefined,
    sizes: srcSet ? options.sizes : undefined,
  };
}
