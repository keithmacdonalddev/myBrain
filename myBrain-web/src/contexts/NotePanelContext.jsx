import { createContext, useContext, useState, useCallback } from 'react';

const NotePanelContext = createContext(null);

export function NotePanelProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [noteId, setNoteId] = useState(null);

  const openNote = useCallback((id) => {
    setNoteId(id);
    setIsOpen(true);
  }, []);

  const closeNote = useCallback(() => {
    setIsOpen(false);
    // Delay clearing noteId to allow close animation
    setTimeout(() => setNoteId(null), 300);
  }, []);

  const value = {
    isOpen,
    noteId,
    openNote,
    closeNote,
  };

  return (
    <NotePanelContext.Provider value={value}>
      {children}
    </NotePanelContext.Provider>
  );
}

export function useNotePanel() {
  const context = useContext(NotePanelContext);
  if (!context) {
    throw new Error('useNotePanel must be used within a NotePanelProvider');
  }
  return context;
}
