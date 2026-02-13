import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Container } from "@/cms/layout";
import { Heading, Text } from "@/cms/typography";
import { CmsButton } from "@/cms/ui";
import type { BlockRenderProps } from "./types";

const minHeightMap: Record<string, string> = {
  default: "70vh",
  tall: "85vh",
  full: "100vh",
};

function parseVideoId(url: string): { provider: "youtube" | "vimeo"; id: string } | null {
  if (!url) return null;
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) return { provider: "youtube", id: ytMatch[1] };
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
  if (vimeoMatch) return { provider: "vimeo", id: vimeoMatch[1] };
  return null;
}

function VideoBackground({
  videoUrl,
  fallbackImage,
}: {
  videoUrl: string;
  fallbackImage: string;
}) {
  const [videoReady, setVideoReady] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const parsed = parseVideoId(videoUrl);

  useEffect(() => {
    if (!fallbackImage) {
      setImageLoaded(true);
      return;
    }
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageLoaded(true);
    img.src = fallbackImage;
  }, [fallbackImage]);

  const handleIframeLoad = useCallback(() => {
    setTimeout(() => setVideoReady(true), 500);
  }, []);

  if (!parsed) return null;

  const embedSrc =
    parsed.provider === "youtube"
      ? `https://www.youtube-nocookie.com/embed/${parsed.id}?autoplay=1&mute=1&loop=1&playlist=${parsed.id}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`
      : `https://player.vimeo.com/video/${parsed.id}?autoplay=1&muted=1&loop=1&background=1&quality=auto`;

  return (
    <>
      {fallbackImage && (
        <img
          src={fallbackImage}
          alt=""
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-700",
            videoReady ? "opacity-0" : "opacity-100"
          )}
          data-testid="img-hero-background-fallback"
        />
      )}
      {imageLoaded && (
        <iframe
          ref={iframeRef}
          src={embedSrc}
          title="Background video"
          allow="autoplay; fullscreen"
          className={cn(
            "absolute inset-0 w-full h-full border-0 pointer-events-none transition-opacity duration-700",
            videoReady ? "opacity-100" : "opacity-0"
          )}
          style={{
            width: "177.78vh",
            height: "100vh",
            minWidth: "100%",
            minHeight: "100%",
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
          onLoad={handleIframeLoad}
          data-testid="video-hero-background"
        />
      )}
    </>
  );
}

function OverlayGradient({ opacity, align }: { opacity: number; align: string }) {
  const o = opacity / 100;
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background:
            align === "center"
              ? `linear-gradient(to bottom, rgba(0,0,0,${o * 0.6}) 0%, rgba(0,0,0,${o}) 40%, rgba(0,0,0,${o}) 60%, rgba(0,0,0,${o * 0.6}) 100%)`
              : `linear-gradient(to right, rgba(0,0,0,${o}) 0%, rgba(0,0,0,${o * 0.7}) 50%, transparent 100%)`,
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-32"
        style={{
          background: "linear-gradient(to top, var(--pp-bg, #030712), transparent)",
        }}
      />
    </>
  );
}

function SplitImage({ src, side }: { src: string; side: "left" | "right" }) {
  return (
    <motion.div
      className={cn(
        "relative w-full lg:w-1/2 min-h-[300px] lg:min-h-0",
        side === "left" ? "lg:order-first" : "lg:order-last"
      )}
      initial={{ opacity: 0, x: side === "left" ? -40 : 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
    >
      <img
        src={src}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
      <div
        className={cn(
          "absolute inset-0",
          side === "left"
            ? "bg-gradient-to-r from-transparent to-background/40"
            : "bg-gradient-to-l from-transparent to-background/40"
        )}
      />
    </motion.div>
  );
}

export default function HeroBlock({ data, settings }: BlockRenderProps) {
  const badge = data?.badge || "";
  const titleHighlight = data?.titleHighlight || "";
  const headline = data?.headline || data?.title || "Welcome";
  const subheadline = data?.subheadline || data?.subtitle || "";
  const ctaText = data?.ctaText || data?.primaryButtonText || "";
  const ctaHref = data?.ctaHref || data?.primaryButtonLink || "#";
  const secondaryCtaText = data?.secondaryCtaText || data?.secondaryButtonText || "";
  const secondaryCtaHref = data?.secondaryCtaHref || data?.secondaryButtonLink || "";
  const backgroundImage = data?.backgroundImage || "";
  const backgroundType = data?.backgroundType || "image";
  const videoUrl = data?.videoUrl || "";
  const heroImage = data?.heroImage || "";
  const align = data?.align || "center";
  const layout: string = data?.layout || "stacked";
  const fullWidth = data?.fullWidth !== false;
  const overlayOpacity = typeof data?.overlayOpacity === "number" ? data.overlayOpacity : 60;
  const minHeight = data?.minHeight || "default";
  const themeVariant = data?.themeVariant || "";

  const isSplit = layout === "split-left" || layout === "split-right";
  const imageSide = layout === "split-right" ? "left" : "right";
  const isVideo = backgroundType === "video" && !!videoUrl && !!parseVideoId(videoUrl);
  const hasBackground = isVideo || !!backgroundImage;

  return (
    <section
      className={cn(
        "relative flex items-center overflow-hidden",
        fullWidth ? "w-full" : "",
        isSplit ? "flex-col lg:flex-row" : "justify-center",
        settings?.className
      )}
      style={{
        minHeight: minHeightMap[minHeight] || minHeightMap.default,
      }}
      data-testid="block-hero"
    >
      {hasBackground && (
        <div className="absolute inset-0 overflow-hidden">
          {isVideo ? (
            <VideoBackground videoUrl={videoUrl} fallbackImage={backgroundImage} />
          ) : backgroundImage ? (
            <img
              src={backgroundImage}
              alt=""
              className="w-full h-full object-cover"
              data-testid="img-hero-background"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : null}
          <OverlayGradient opacity={overlayOpacity} align={align} />
        </div>
      )}

      {!hasBackground && !isSplit && (
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--pp-primary, #67e8f9) 8%, transparent) 0%, transparent 70%)",
          }}
        />
      )}

      {isSplit && heroImage && (
        <SplitImage src={heroImage} side={imageSide} />
      )}

      <div
        className={cn(
          "relative z-10",
          isSplit ? "w-full lg:w-1/2 flex items-center" : "w-full"
        )}
        style={{
          paddingTop: "calc(var(--pp-section-py, 3rem) * 2.5)",
          paddingBottom: "calc(var(--pp-section-py, 3rem) * 2.5)",
        }}
      >
        <Container width={isSplit ? "narrow" : "wide"}>
          <motion.div
            className={cn(
              isSplit ? "text-left" : "",
              !isSplit && align === "center" ? "text-center" : "",
              !isSplit && align === "left" ? "text-left" : ""
            )}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {badge && (
              <div className="inline-block bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
                <span className="text-primary text-sm font-medium">{badge}</span>
              </div>
            )}

            <Heading
              level={1}
              className={cn(
                "mb-8 leading-[1.05]",
                align === "center" && !isSplit ? "max-w-[18ch] mx-auto" : "max-w-[18ch]"
              )}
              gradient={themeVariant === "ice"}
            >
              {titleHighlight ? (
                <>
                  {headline.replace(titleHighlight, "")}
                  <span className="text-gradient-ice">{titleHighlight}</span>
                </>
              ) : (
                headline
              )}
            </Heading>

            {subheadline && (
              <Text
                size="xl"
                muted
                className={cn(
                  "mb-12 leading-relaxed",
                  align === "center" && !isSplit
                    ? "max-w-[50ch] mx-auto"
                    : "max-w-[50ch]"
                )}
              >
                {subheadline}
              </Text>
            )}

            {(ctaText || secondaryCtaText) && (
              <div
                className={cn(
                  "flex flex-wrap items-center gap-4",
                  align === "center" && !isSplit ? "justify-center" : "justify-start"
                )}
                data-testid="hero-cta-row"
              >
                {ctaText && (
                  <CmsButton
                    variant="primary"
                    size="lg"
                    href={ctaHref}
                    data-testid="button-hero-primary"
                  >
                    {ctaText}
                  </CmsButton>
                )}
                {secondaryCtaText && (
                  <CmsButton
                    variant="outline"
                    size="lg"
                    href={secondaryCtaHref}
                    data-testid="button-hero-secondary"
                  >
                    {secondaryCtaText}
                  </CmsButton>
                )}
              </div>
            )}
          </motion.div>
        </Container>
      </div>
    </section>
  );
}
