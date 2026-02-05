import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { Bookmark, ChevronDown, Plus, Trash2, Check } from "lucide-react";
import type { SavedFilter } from "@/hooks/use-saved-filters";

interface SavedFiltersPanelProps<T> {
  savedFilters: SavedFilter<T>[];
  filterName: string;
  setFilterName: (name: string) => void;
  onSave: (name: string, filters: T) => void;
  onLoad: (filter: SavedFilter<T>) => void;
  onDelete: (id: string) => void;
  currentFilters: T;
  hasActiveFilters: boolean;
}

export function SavedFiltersPanel<T extends Record<string, any>>({
  savedFilters,
  filterName,
  setFilterName,
  onSave,
  onLoad,
  onDelete,
  currentFilters,
  hasActiveFilters,
}: SavedFiltersPanelProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    if (filterName.trim()) {
      onSave(filterName.trim(), currentFilters);
      setIsSaving(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2" data-testid="saved-filters-panel">
      {savedFilters.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" data-testid="load-filter-dropdown">
              <Bookmark className="w-4 h-4 mr-2" />
              Saved Filters
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {savedFilters.map((filter) => (
              <DropdownMenuItem
                key={filter.id}
                className="flex items-center justify-between"
                data-testid={`saved-filter-${filter.id}`}
              >
                <button
                  className="flex-1 text-left"
                  onClick={() => {
                    onLoad(filter);
                  }}
                >
                  {filter.name}
                </button>
                <button
                  className="p-1 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(filter.id);
                  }}
                  data-testid={`delete-filter-${filter.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {hasActiveFilters && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              data-testid="save-filter-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Save Filter
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="end">
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-sm mb-2">Save Current Filters</h4>
                <Input
                  placeholder="Filter name..."
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  data-testid="input-filter-name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSave}
                  disabled={!filterName.trim()}
                  data-testid="confirm-save-filter"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
