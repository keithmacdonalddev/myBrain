import { createContext, useContext, useState, useCallback } from 'react';

const TaskPanelContext = createContext(null);

export function TaskPanelProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [initialData, setInitialData] = useState(null);

  const openTask = useCallback((id) => {
    setTaskId(id);
    setInitialData(null);
    setIsOpen(true);
  }, []);

  const openNewTask = useCallback((data = null) => {
    setTaskId(null);
    setInitialData(data); // { title: 'Pre-filled title', ... }
    setIsOpen(true);
  }, []);

  const closeTask = useCallback(() => {
    setIsOpen(false);
    // Delay clearing state to allow close animation
    setTimeout(() => {
      setTaskId(null);
      setInitialData(null);
    }, 300);
  }, []);

  const value = {
    isOpen,
    taskId,
    initialData,
    openTask,
    openNewTask,
    closeTask,
  };

  return (
    <TaskPanelContext.Provider value={value}>
      {children}
    </TaskPanelContext.Provider>
  );
}

export function useTaskPanel() {
  const context = useContext(TaskPanelContext);
  if (!context) {
    throw new Error('useTaskPanel must be used within a TaskPanelProvider');
  }
  return context;
}
