import { Routes, Route } from 'react-router-dom';
import { ProjectPanelProvider } from '../../contexts/ProjectPanelContext';
import ProjectSlidePanel from '../../components/projects/ProjectSlidePanel';
import { ProjectsList } from './components/ProjectsList';
import ProjectDashboard from './pages/ProjectDashboard';

function ProjectsRoutes() {
  return (
    <ProjectPanelProvider>
      <div className="h-full">
        <Routes>
          <Route index element={<ProjectsList />} />
          <Route path=":id" element={<ProjectDashboard />} />
        </Routes>
        <ProjectSlidePanel />
      </div>
    </ProjectPanelProvider>
  );
}

export default ProjectsRoutes;
