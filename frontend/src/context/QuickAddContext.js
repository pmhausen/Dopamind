import { createContext, useContext, useState, useCallback } from "react";

const QuickAddContext = createContext(null);

export function QuickAddProvider({ children }) {
  const [quickAddOptions, setQuickAddOptions] = useState(null);

  const openQuickAdd = useCallback((options = {}) => {
    setQuickAddOptions({ mode: "task", ...options });
  }, []);

  const closeQuickAdd = useCallback(() => {
    setQuickAddOptions(null);
  }, []);

  return (
    <QuickAddContext.Provider value={{ quickAddOptions, openQuickAdd, closeQuickAdd }}>
      {children}
    </QuickAddContext.Provider>
  );
}

export const useQuickAdd = () => useContext(QuickAddContext);
