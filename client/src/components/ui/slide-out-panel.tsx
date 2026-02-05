import { useEffect, useCallback, useState } from "react";
import { X } from "lucide-react";
import { Button } from "./button";

interface SlideOutPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "sm" | "md" | "lg" | "xl";
  isDirty?: boolean;
}

const widthClasses = {
  sm: "w-full md:w-[400px]",
  md: "w-full md:w-[500px] lg:w-[550px]",
  lg: "w-full md:w-[600px] lg:w-[700px]",
  xl: "w-full md:w-[45vw] lg:w-[50vw] min-w-[500px]",
};

export function SlideOutPanel({
  open,
  onClose,
  title,
  children,
  footer,
  width = "xl",
  isDirty = false,
}: SlideOutPanelProps) {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm("You have unsaved changes. Are you sure you want to close?");
      if (!confirmed) return;
    }
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  }, [isDirty, onClose]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        handleClose();
      }
    };
    
    if (open) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [open, handleClose]);

  if (!open && !isClosing) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div 
        className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${
          isClosing ? "opacity-0" : "opacity-100"
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />
      
      <div 
        className={`absolute right-0 top-0 h-full bg-card border-l border-border shadow-2xl flex flex-col transition-transform duration-200 ease-out ${widthClasses[width]} ${
          isClosing ? "translate-x-full" : "translate-x-0"
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <h2 className="font-display text-xl font-bold truncate">{title}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
            data-testid="button-close-panel"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {children}
        </div>

        {footer && (
          <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-card">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

interface PanelFooterProps {
  onCancel: () => void;
  onSave: () => void;
  onSaveAndClose?: () => void;
  isSaving?: boolean;
  saveLabel?: string;
}

export function PanelFooter({
  onCancel,
  onSave,
  onSaveAndClose,
  isSaving = false,
  saveLabel = "Save",
}: PanelFooterProps) {
  return (
    <>
      <Button variant="outline" onClick={onCancel} disabled={isSaving} data-testid="button-cancel">
        Cancel
      </Button>
      {onSaveAndClose && (
        <Button variant="outline" onClick={onSaveAndClose} disabled={isSaving} data-testid="button-save-close">
          Save & Close
        </Button>
      )}
      <Button onClick={onSave} disabled={isSaving} data-testid="button-save">
        {isSaving ? "Saving..." : saveLabel}
      </Button>
    </>
  );
}
