import { Routes, Route } from 'react-router-dom';
import CalendarView from './components/CalendarView';

function CalendarRoutes() {
  return (
    <Routes>
      <Route index element={<CalendarView />} />
    </Routes>
  );
}

export default CalendarRoutes;
