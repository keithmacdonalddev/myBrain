import { Routes, Route } from 'react-router-dom';
import { TaskPanelProvider } from '../../contexts/TaskPanelContext';
import TaskSlidePanel from '../../components/tasks/TaskSlidePanel';
import TasksList from './components/TasksList';

function TasksRoutes() {
  return (
    <TaskPanelProvider>
      <div className="h-full">
        <Routes>
          <Route index element={<TasksList />} />
        </Routes>
        <TaskSlidePanel />
      </div>
    </TaskPanelProvider>
  );
}

export default TasksRoutes;
