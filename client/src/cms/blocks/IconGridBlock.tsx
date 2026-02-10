import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import { getIconWithFallback } from "@/lib/iconUtils";
import type { BlockRenderProps } from "./types";

export default function IconGridBlock({ data, settings }: BlockRenderProps) {
  const items = data?.items || [];
  const title = data?.title || "";
  const titleHighlight = data?.titleHighlight || "";
  const columns = data?.columns || 5;
  const sectionId = data?.sectionId || "";

  return (
    <section
      className={cn("py-24", settings?.className)}
      id={sectionId}
      data-testid="block-icongrid"
    >
      <div className="max-w-7xl mx-auto px-6">
        {title && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              {title.replace(titleHighlight, "")}{" "}
              <span className="text-gradient-ice">{titleHighlight}</span>
            </h2>
          </motion.div>
        )}

        <div
          className={cn(
            "grid gap-6",
            columns === 5
              ? "sm:grid-cols-2 lg:grid-cols-5"
              : columns === 4
                ? "sm:grid-cols-2 lg:grid-cols-4"
                : columns === 3
                  ? "sm:grid-cols-2 lg:grid-cols-3"
                  : "sm:grid-cols-2"
          )}
        >
          {items.map((item: { icon?: string; title: string }, i: number) => {
            const Icon = getIconWithFallback(item.icon, Star);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-gradient-card border border-border rounded-2xl p-6 text-center hover:border-primary/50 transition-colors"
              >
                <Icon className="w-10 h-10 text-primary mx-auto mb-4" />
                <p className="font-medium">{item.title}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
