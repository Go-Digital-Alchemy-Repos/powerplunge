import { useState, useCallback, useEffect } from "react";

export interface SavedFilter<T = Record<string, any>> {
  id: string;
  name: string;
  filters: T;
  createdAt: string;
}

export function useSavedFilters<T extends Record<string, any>>(storageKey: string) {
  const [savedFilters, setSavedFilters] = useState<SavedFilter<T>[]>([]);
  const [filterName, setFilterName] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setSavedFilters(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse saved filters:", e);
      }
    }
  }, [storageKey]);

  const saveFilter = useCallback((name: string, filters: T) => {
    const newFilter: SavedFilter<T> = {
      id: crypto.randomUUID(),
      name,
      filters,
      createdAt: new Date().toISOString(),
    };
    
    setSavedFilters((prev) => {
      const updated = [...prev, newFilter];
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
    
    setFilterName("");
    return newFilter;
  }, [storageKey]);

  const deleteFilter = useCallback((id: string) => {
    setSavedFilters((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  }, [storageKey]);

  const updateFilter = useCallback((id: string, name: string, filters: T) => {
    setSavedFilters((prev) => {
      const updated = prev.map((f) =>
        f.id === id ? { ...f, name, filters } : f
      );
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  }, [storageKey]);

  const getFilter = useCallback((id: string) => {
    return savedFilters.find((f) => f.id === id);
  }, [savedFilters]);

  return {
    savedFilters,
    filterName,
    setFilterName,
    saveFilter,
    deleteFilter,
    updateFilter,
    getFilter,
  };
}
