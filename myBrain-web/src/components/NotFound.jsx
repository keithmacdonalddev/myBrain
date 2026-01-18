import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, Search } from 'lucide-react';

/**
 * 404 Not Found page
 */
function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center p-8 max-w-md">
        <div className="text-8xl font-bold text-muted/20 mb-4">404</div>
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Search className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-text mb-2">Page Not Found</h2>
        <p className="text-muted mb-6">
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-muted border border-border rounded-lg hover:bg-panel hover:text-text transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <button
            onClick={() => navigate('/app')}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
