import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";
import { getIconWithFallback } from "@/lib/iconUtils";
import { Button } from "@/components/ui/button";
import type { BlockRenderProps } from "./types";

export default function CTABlock({ data, settings, onAddToCart }: BlockRenderProps) {
  const title = data?.title || data?.heading || "Get Started";
  const titleHighlight = data?.titleHighlight || "";
  const subtitle = data?.subtitle || data?.description || "";
  const buttonText = data?.buttonText || data?.primaryButton || "";
  const buttonLink = data?.buttonLink || data?.primaryLink || "";
  const buttonIcon = data?.buttonIcon || "";
  const buttonAction = data?.buttonAction || "navigate";
  const productId = data?.productId || "";
  const secondaryButton = data?.secondaryButton || "";
  const secondaryLink = data?.secondaryLink || "";

  const ButtonIcon = buttonIcon ? getIconWithFallback(buttonIcon, Zap) : null;

  const handleButtonClick = () => {
    if (buttonAction === "addToCart" && onAddToCart) {
      onAddToCart(productId || "", 1);
    } else if (buttonLink) {
      window.location.href = buttonLink;
    }
  };

  return (
    <section
      className={cn("py-24 bg-card/30 border-t border-border", settings?.className)}
      data-testid="block-cta"
    >
      <div className="max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
            {title}{" "}
            {titleHighlight && <span className="text-gradient-ice">{titleHighlight}</span>}
          </h2>
          {subtitle && (
            <p className="text-muted-foreground text-lg mb-10 max-w-2xl mx-auto">{subtitle}</p>
          )}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {buttonText && (
              <Button
                size="lg"
                className="glow-ice text-lg px-10 py-6"
                onClick={handleButtonClick}
                data-testid="cta-primary-button"
              >
                {buttonText}
                {ButtonIcon && <ButtonIcon className="w-5 h-5 ml-2" />}
              </Button>
            )}
            {secondaryButton && (
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8"
                onClick={() => secondaryLink && (window.location.href = secondaryLink)}
              >
                {secondaryButton}
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
