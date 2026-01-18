import { Navigate } from 'react-router-dom';

// Settings functionality has been moved to the Profile page
// This component redirects to profile for backwards compatibility
function SettingsPage() {
  return <Navigate to="/app/profile" replace />;
}

export default SettingsPage;
