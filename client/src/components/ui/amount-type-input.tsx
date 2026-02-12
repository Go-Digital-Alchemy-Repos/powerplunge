import * as React from "react"
import { cn } from "@/lib/utils"

interface AmountTypeInputProps {
  value: number;
  onChange: (value: number) => void;
  type: "percent" | "fixed";
  onTypeChange: (type: "percent" | "fixed") => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  "data-testid"?: string;
  disabled?: boolean;
}

function AmountTypeInput({
  value,
  onChange,
  type,
  onTypeChange,
  min = 0,
  max,
  step,
  className,
  "data-testid": dataTestId,
  disabled = false,
}: AmountTypeInputProps) {
  const isPercent = type === "percent";
  const effectiveMax = isPercent ? (max ?? 100) : max;
  const effectiveStep = step ?? (isPercent ? 1 : 0.01);

  return (
    <div
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background text-sm shadow-sm transition-colors",
        "focus-within:ring-1 focus-within:ring-ring",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      data-testid={dataTestId}
    >
      <span className="flex items-center pl-3 text-muted-foreground select-none">
        {isPercent ? "" : "$"}
      </span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={effectiveMax}
        step={effectiveStep}
        disabled={disabled}
        className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        data-testid={dataTestId ? `${dataTestId}-input` : undefined}
      />
      {isPercent && (
        <span className="flex items-center pr-1 text-muted-foreground select-none">
          %
        </span>
      )}
      <div className="flex items-center border-l border-input">
        <button
          type="button"
          onClick={() => { if (!disabled) onTypeChange("percent"); }}
          disabled={disabled}
          className={cn(
            "px-2.5 py-1 text-xs font-medium transition-colors h-full",
            isPercent
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
          data-testid={dataTestId ? `${dataTestId}-percent` : undefined}
        >
          %
        </button>
        <button
          type="button"
          onClick={() => { if (!disabled) onTypeChange("fixed"); }}
          disabled={disabled}
          className={cn(
            "px-2.5 py-1 text-xs font-medium transition-colors rounded-r-md h-full",
            !isPercent
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
          data-testid={dataTestId ? `${dataTestId}-fixed` : undefined}
        >
          $
        </button>
      </div>
    </div>
  );
}

export { AmountTypeInput };
export type { AmountTypeInputProps };
