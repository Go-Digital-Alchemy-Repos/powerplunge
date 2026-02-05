import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  disabled?: boolean;
}

interface BulkActionsBarProps {
  selectedCount: number;
  actions: BulkAction[];
  onClear: () => void;
}

export function BulkActionsBar({ selectedCount, actions, onClear }: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div 
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 shadow-2xl"
      data-testid="bulk-actions-bar"
    >
      <div className="flex items-center gap-2">
        <span className="bg-primary text-primary-foreground text-sm font-medium px-2 py-1 rounded">
          {selectedCount}
        </span>
        <span className="text-sm text-slate-300">
          {selectedCount === 1 ? "item selected" : "items selected"}
        </span>
      </div>
      
      <div className="h-6 w-px bg-slate-600" />
      
      <div className="flex items-center gap-2">
        {actions.map((action, index) => (
          <Button
            key={index}
            size="sm"
            variant={action.variant || "default"}
            onClick={action.onClick}
            disabled={action.disabled}
            data-testid={`bulk-action-${index}`}
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
      </div>
      
      <Button
        size="sm"
        variant="ghost"
        onClick={onClear}
        className="ml-2 text-slate-400 hover:text-white"
        data-testid="bulk-clear"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
