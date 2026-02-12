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
  percentLabel?: string;
  fixedLabel?: string;
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
  percentLabel = "Percentage",
  fixedLabel = "Fixed Amount",
}: AmountTypeInputProps) {
  const isPercent = type === "percent";
  const effectiveMax = isPercent ? (max ?? 100) : max;
  const effectiveStep = step ?? (isPercent ? 1 : 0.01);
  const [displayValue, setDisplayValue] = React.useState(value === 0 ? "" : String(value));
  const [isFocused, setIsFocused] = React.useState(false);

  React.useEffect(() => {
    if (!isFocused) {
      setDisplayValue(value === 0 ? "" : String(value));
    }
  }, [value, isFocused]);

  return (
    <div className={cn("space-y-2", className)} data-testid={dataTestId}>
      <div className="inline-flex rounded-lg bg-muted p-0.5">
        <button
          type="button"
          onClick={() => { if (!disabled) onTypeChange("percent"); }}
          disabled={disabled}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
            isPercent
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          data-testid={dataTestId ? `${dataTestId}-percent` : undefined}
        >
          {percentLabel}
        </button>
        <button
          type="button"
          onClick={() => { if (!disabled) onTypeChange("fixed"); }}
          disabled={disabled}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
            !isPercent
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          data-testid={dataTestId ? `${dataTestId}-fixed` : undefined}
        >
          {fixedLabel}
        </button>
      </div>
      <div
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background text-sm shadow-sm transition-colors",
          "focus-within:ring-1 focus-within:ring-ring",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className="flex items-center pl-3 pr-1 text-muted-foreground select-none font-medium">
          {isPercent ? "%" : "$"}
        </span>
        <input
          type="number"
          value={displayValue}
          onChange={(e) => {
            setDisplayValue(e.target.value);
            onChange(parseFloat(e.target.value) || 0);
          }}
          onFocus={() => {
            setIsFocused(true);
            if (value === 0) setDisplayValue("");
          }}
          onBlur={() => {
            setIsFocused(false);
            setDisplayValue(value === 0 ? "" : String(value));
          }}
          min={min}
          max={effectiveMax}
          step={effectiveStep}
          disabled={disabled}
          placeholder={isPercent ? "0" : "0.00"}
          className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          data-testid={dataTestId ? `${dataTestId}-input` : undefined}
        />
      </div>
    </div>
  );
}

export { AmountTypeInput };
export type { AmountTypeInputProps };
