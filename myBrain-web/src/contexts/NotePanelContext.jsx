import { createContext, useContext, useState, useCallback } from 'react';

const NotePanelContext = createContext(null);

export function NotePanelProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [noteId, setNoteId] = useState(null);
  const [initialData, setInitialData] = useState(null);

  const openNote = useCallback((id) => {
    setNoteId(id);
    setInitialData(null);
    setIsOpen(true);
  }, []);

  const openNewNote = useCallback((data = null) => {
    setNoteId(null);
    setInitialData(data); // { title: 'Pre-filled title', ... }
    setIsOpen(true);
  }, []);

  const closeNote = useCallback(() => {
    setIsOpen(false);
    // Delay clearing state to allow close animation
    setTimeout(() => {
      setNoteId(null);
      setInitialData(null);
    }, 300);
  }, []);

  const value = {
    isOpen,
    noteId,
    initialData,
    openNote,
    openNewNote,
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
