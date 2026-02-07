import { Check } from "lucide-react";
import { Section, Container } from "@/cms/layout";
import { Heading } from "@/cms/typography";
import type { BlockRenderProps } from "./types";

export default function ComparisonTableBlock({ data, settings }: BlockRenderProps) {
  const title = data?.title || "";
  const columns: { key: string; label: string }[] = data?.columns || [];
  const rows: { label: string; valuesByKey?: Record<string, string | boolean>; feature?: string; values?: (string | boolean)[] }[] =
    data?.rows || [];
  const highlightColumnKey = data?.highlightColumnKey || "";

  const dataColumns = columns.filter((c) => c.key !== "feature");

  return (
    <Section className={settings?.className} data-testid="block-comparisontable">
      <Container width="default">
        {title && (
          <Heading level={2} align="center" className="mb-12">
            {title}
          </Heading>
        )}
        <div
          className="overflow-x-auto -mx-4 px-4"
          style={{
            borderRadius: "var(--pp-card-radius, 0.75rem)",
          }}
        >
          <div
            className="min-w-[500px]"
            style={{
              backgroundColor: "var(--pp-surface, #111827)",
              borderRadius: "var(--pp-card-radius, 0.75rem)",
              border: "1px solid color-mix(in srgb, var(--pp-primary, #67e8f9) 10%, transparent)",
              overflow: "hidden",
            }}
          >
            <table className="w-full border-collapse">
              <thead>
                <tr
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                    backgroundColor: "color-mix(in srgb, var(--pp-surface, #111827) 95%, black)",
                    borderBottom: "2px solid color-mix(in srgb, var(--pp-primary, #67e8f9) 15%, transparent)",
                  }}
                >
                  <th
                    className="text-left font-medium text-sm uppercase tracking-wider"
                    style={{
                      padding: "1rem 1.25rem",
                      fontFamily: "var(--pp-font-family, 'Inter', sans-serif)",
                      color: "var(--pp-text-muted, #9ca3af)",
                      minWidth: "140px",
                    }}
                  >
                    Feature
                  </th>
                  {dataColumns.map((col, idx) => {
                    const isHighlight = col.key === highlightColumnKey;
                    return (
                      <th
                        key={idx}
                        className="text-center font-semibold"
                        style={{
                          padding: "1rem 1.25rem",
                          fontFamily: "var(--pp-font-family, 'Inter', sans-serif)",
                          color: isHighlight
                            ? "var(--pp-primary, #67e8f9)"
                            : "var(--pp-text, #f9fafb)",
                          backgroundColor: isHighlight
                            ? "color-mix(in srgb, var(--pp-primary, #67e8f9) 8%, transparent)"
                            : "transparent",
                          minWidth: "120px",
                        }}
                      >
                        {isHighlight && (
                          <span
                            className="block text-[10px] uppercase tracking-widest font-bold mb-1"
                            style={{ color: "var(--pp-primary, #67e8f9)" }}
                          >
                            Recommended
                          </span>
                        )}
                        {col.label}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const rowLabel = row.label || row.feature || "";
                  const isEven = idx % 2 === 0;
                  return (
                    <tr
                      key={idx}
                      style={{
                        backgroundColor: isEven
                          ? "transparent"
                          : "color-mix(in srgb, var(--pp-surface, #111827) 60%, black)",
                        borderBottom:
                          idx < rows.length - 1
                            ? "1px solid color-mix(in srgb, var(--pp-primary, #67e8f9) 5%, transparent)"
                            : "none",
                        transition: "background-color 150ms ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--pp-primary, #67e8f9) 4%, transparent)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isEven
                          ? "transparent"
                          : "color-mix(in srgb, var(--pp-surface, #111827) 60%, black)";
                      }}
                    >
                      <td
                        className="font-medium text-sm"
                        style={{
                          padding: "0.875rem 1.25rem",
                          fontFamily: "var(--pp-font-family, 'Inter', sans-serif)",
                          color: "var(--pp-text, #f9fafb)",
                        }}
                      >
                        {rowLabel}
                      </td>
                      {dataColumns.map((col, cidx) => {
                        const val = row.valuesByKey
                          ? row.valuesByKey[col.key]
                          : row.values
                            ? row.values[cidx]
                            : (row as Record<string, any>)[col.key];
                        const isHighlight = col.key === highlightColumnKey;
                        return (
                          <td
                            key={cidx}
                            className="text-center text-sm"
                            style={{
                              padding: "0.875rem 1.25rem",
                              fontFamily: "var(--pp-font-family, 'Inter', sans-serif)",
                              backgroundColor: isHighlight
                                ? "color-mix(in srgb, var(--pp-primary, #67e8f9) 4%, transparent)"
                                : "transparent",
                            }}
                          >
                            {typeof val === "boolean" ? (
                              val ? (
                                <Check
                                  className="w-5 h-5 mx-auto"
                                  style={{ color: "var(--pp-primary, #67e8f9)" }}
                                />
                              ) : (
                                <span style={{ color: "var(--pp-text-muted, #9ca3af)" }}>—</span>
                              )
                            ) : val === "Yes" ? (
                              <Check
                                className="w-5 h-5 mx-auto"
                                style={{ color: "var(--pp-primary, #67e8f9)" }}
                              />
                            ) : val === "No" ? (
                              <span style={{ color: "var(--pp-text-muted, #9ca3af)" }}>—</span>
                            ) : (
                              <span
                                style={{
                                  color: isHighlight
                                    ? "var(--pp-text, #f9fafb)"
                                    : "var(--pp-text-muted, #9ca3af)",
                                  fontWeight: isHighlight ? 600 : 400,
                                }}
                              >
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
        </div>
      </Container>
    </Section>
  );
}
