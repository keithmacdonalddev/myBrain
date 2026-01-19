import { Routes, Route } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';
import MobilePageHeader from '../../components/layout/MobilePageHeader';

function FitnessPage() {
  return (
    <div className="h-full flex flex-col bg-bg">
      <MobilePageHeader title="Fitness" icon={Dumbbell} />

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Desktop Header */}
        <h1 className="hidden sm:block text-2xl font-bold text-text mb-4">Fitness</h1>
        <p className="text-muted">Track your workouts, meals, and body metrics.</p>
        <div className="mt-6 p-4 bg-panel border border-border rounded-lg">
          <p className="text-sm text-muted">This feature is coming soon!</p>
        </div>
      </div>
    </div>
  );
}

function FitnessRoutes() {
  return (
    <Routes>
      <Route index element={<FitnessPage />} />
    </Routes>
  );
}

export default FitnessRoutes;
