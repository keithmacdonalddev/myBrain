import { useSearchParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import UserSearch from '../components/UserSearch';
import ConnectionsList from '../components/ConnectionsList';
import SuggestedConnections from '../components/SuggestedConnections';

export default function ConnectionsPage() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'connections';

  return (
    <div className="h-full flex flex-col bg-bg">
      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-text">Connections</h1>
              <p className="text-sm text-muted">
                Manage your connections and find new people
              </p>
            </div>
          </div>

          <div className="sm:ml-auto w-full sm:w-64">
            <UserSearch />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 sm:px-6 pb-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2">
            <ConnectionsList initialTab={initialTab} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <SuggestedConnections limit={5} />
          </div>
        </div>
      </div>
    </div>
  );
}
