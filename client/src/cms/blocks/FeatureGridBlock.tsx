import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { getIconWithFallback } from "@/lib/iconUtils";
import type { BlockRenderProps } from "./types";

export default function FeatureGridBlock({ data, settings }: BlockRenderProps) {
  const title = data?.title || "";
  const titleHighlight = data?.titleHighlight || "";
  const titleSuffix = data?.titleSuffix || "";
  const subtitle = data?.subtitle || "";
  const sectionId = data?.sectionId || "";
  const columns = data?.columns || 3;
  const features = data?.features || [];

  return (
    <section
      className={cn("py-24", settings?.className)}
      id={sectionId}
      data-testid="block-featuregrid"
    >
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            {title} <span className="text-gradient-ice">{titleHighlight}</span>{titleSuffix}
          </h2>
          {subtitle && (
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </motion.div>

        <div
          className={cn(
            "grid gap-8",
            columns === 2
              ? "md:grid-cols-2"
              : columns === 4
                ? "md:grid-cols-4"
                : "md:grid-cols-3"
          )}
        >
          {features.map(
            (feature: { icon?: string; title: string; description: string }, i: number) => {
              const Icon = getIconWithFallback(feature.icon, Check);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-gradient-card border-gradient-ice rounded-2xl p-8 relative group hover:scale-[1.02] transition-transform duration-300"
                >
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:glow-ice-sm transition-shadow">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            }
          )}
        </div>
      </div>
    </section>
  );
}
