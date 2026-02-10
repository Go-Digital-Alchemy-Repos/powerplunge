import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Award } from "lucide-react";
import { getIconWithFallback } from "@/lib/iconUtils";
import type { BlockRenderProps } from "./types";

export default function StatsBarBlock({ data, settings }: BlockRenderProps) {
  const stats = data?.stats || [];

  return (
    <section
      className={cn("py-20 border-t border-border bg-card/30", settings?.className)}
      data-testid="block-statsbar"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat: { icon?: string; label: string; value: string }, idx: number) => {
            const Icon = getIconWithFallback(stat.icon, Award);
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <Icon className="w-8 h-8 text-primary mx-auto mb-3" />
                <p className="text-2xl font-display font-bold mb-1">{stat.value}</p>
                <p className="text-muted-foreground text-sm">{stat.label}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
