import { Route } from 'react-router-dom';
import ConnectionsPage from './pages/ConnectionsPage';
import UserProfilePage from './pages/UserProfilePage';

export const socialRoutes = (
  <>
    <Route path="social/connections" element={<ConnectionsPage />} />
    <Route path="social/profile/:userId" element={<UserProfilePage />} />
  </>
);
