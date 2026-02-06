import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Section, Container } from "@/cms/layout";
import type { BlockRenderProps } from "./types";

export default function ComparisonTableBlock({ data, settings }: BlockRenderProps) {
  const title = data?.title || "";
  const columns: { key: string; label: string }[] = data?.columns || [];
  const rows: { label: string; valuesByKey?: Record<string, string | boolean>; feature?: string; values?: (string | boolean)[] }[] =
    data?.rows || [];
  const highlightColumnKey = data?.highlightColumnKey || "";

  return (
    <Section className={settings?.className} data-testid="block-comparisontable">
      <Container width="default">
        {title && (
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            {title}
          </h2>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b pp-border-subtle">
                <th className="text-left p-4 pp-text-muted font-medium">
                  Feature
                </th>
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className={cn(
                      "p-4 text-center font-semibold",
                      col.key === highlightColumnKey
                        ? "text-cyan-400 bg-cyan-500/10"
                        : "text-white"
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const rowLabel = row.label || row.feature || "";
                return (
                  <tr key={idx} className="border-b pp-border-subtle border-opacity-50">
                    <td className="p-4 text-slate-300">{rowLabel}</td>
                    {columns.map((col, cidx) => {
                      const val = row.valuesByKey
                        ? row.valuesByKey[col.key]
                        : row.values
                          ? row.values[cidx]
                          : undefined;
                      return (
                        <td
                          key={cidx}
                          className={cn(
                            "p-4 text-center",
                            col.key === highlightColumnKey && "bg-cyan-500/5"
                          )}
                        >
                          {typeof val === "boolean" ? (
                            val ? (
                              <Check className="w-5 h-5 text-cyan-400 mx-auto" />
                            ) : (
                              <span className="pp-text-muted">—</span>
                            )
                          ) : (
                            <span className="text-slate-300">
                              {val ?? "—"}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Container>
    </Section>
  );
}
