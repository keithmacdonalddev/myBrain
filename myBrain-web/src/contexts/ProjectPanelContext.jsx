import { createContext, useContext, useState, useCallback } from 'react';

const ProjectPanelContext = createContext(null);

export function ProjectPanelProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [projectId, setProjectId] = useState(null);

  const openProject = useCallback((id) => {
    setProjectId(id);
    setIsOpen(true);
  }, []);

  const openNewProject = useCallback(() => {
    setProjectId(null);
    setIsOpen(true);
  }, []);

  const closeProject = useCallback(() => {
    setIsOpen(false);
    // Delay clearing projectId to allow close animation
    setTimeout(() => setProjectId(null), 300);
  }, []);

  const value = {
    isOpen,
    projectId,
    openProject,
    openNewProject,
    closeProject,
  };

  return (
    <ProjectPanelContext.Provider value={value}>
      {children}
    </ProjectPanelContext.Provider>
  );
}

export function useProjectPanel() {
  const context = useContext(ProjectPanelContext);
  if (!context) {
    throw new Error('useProjectPanel must be used within a ProjectPanelProvider');
  }
  return context;
}
