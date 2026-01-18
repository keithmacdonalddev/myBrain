import { Routes, Route } from 'react-router-dom';
import { ProjectPanelProvider } from '../../contexts/ProjectPanelContext';
import ProjectSlidePanel from '../../components/projects/ProjectSlidePanel';
import { ProjectsList } from './components/ProjectsList';

function ProjectsRoutes() {
  return (
    <ProjectPanelProvider>
      <div className="h-full">
        <Routes>
          <Route index element={<ProjectsList />} />
        </Routes>
        <ProjectSlidePanel />
      </div>
    </ProjectPanelProvider>
  );
}

export default ProjectsRoutes;
