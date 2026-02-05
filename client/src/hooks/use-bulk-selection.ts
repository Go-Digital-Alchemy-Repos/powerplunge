import { useState, useCallback, useMemo } from "react";

export function useBulkSelection<T extends { id: string }>(items: T[] = []) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === items.length && items.length > 0) {
        return new Set();
      }
      return new Set(items.map((item) => item.id));
    });
  }, [items]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectItems = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const isAllSelected = useMemo(() => {
    return items.length > 0 && selectedIds.size === items.length;
  }, [items.length, selectedIds.size]);

  const isPartiallySelected = useMemo(() => {
    return selectedIds.size > 0 && selectedIds.size < items.length;
  }, [items.length, selectedIds.size]);

  const selectedItems = useMemo(() => {
    return items.filter((item) => selectedIds.has(item.id));
  }, [items, selectedIds]);

  return {
    selectedIds,
    selectedItems,
    selectedCount: selectedIds.size,
    toggleItem,
    toggleAll,
    clearSelection,
    selectItems,
    isSelected,
    isAllSelected,
    isPartiallySelected,
  };
}
