import { createContext, useContext, useState, useCallback } from 'react';

// Context for managing quick capture modal state globally
const QuickCaptureContext = createContext(null);

export function QuickCaptureProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const openCapture = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeCapture = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = {
    isOpen,
    openCapture,
    closeCapture,
  };

  return (
    <QuickCaptureContext.Provider value={value}>
      {children}
    </QuickCaptureContext.Provider>
  );
}

export function useQuickCapture() {
  const context = useContext(QuickCaptureContext);
  if (!context) {
    throw new Error('useQuickCapture must be used within a QuickCaptureProvider');
  }
  return context;
}
