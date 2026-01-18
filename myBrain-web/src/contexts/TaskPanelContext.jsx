import { createContext, useContext, useState, useCallback } from 'react';

const TaskPanelContext = createContext(null);

export function TaskPanelProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [taskId, setTaskId] = useState(null);

  const openTask = useCallback((id) => {
    setTaskId(id);
    setIsOpen(true);
  }, []);

  const openNewTask = useCallback(() => {
    setTaskId(null);
    setIsOpen(true);
  }, []);

  const closeTask = useCallback(() => {
    setIsOpen(false);
    // Delay clearing taskId to allow close animation
    setTimeout(() => setTaskId(null), 300);
  }, []);

  const value = {
    isOpen,
    taskId,
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
