import { Routes, Route } from 'react-router-dom';

function MessagesPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-text mb-4">Messages</h1>
      <p className="text-muted">Communication and collaboration.</p>
      <div className="mt-6 p-4 bg-panel border border-border rounded-lg">
        <p className="text-sm text-muted">This feature is coming soon!</p>
      </div>
    </div>
  );
}

function MessagesRoutes() {
  return (
    <Routes>
      <Route index element={<MessagesPage />} />
    </Routes>
  );
}

export default MessagesRoutes;
