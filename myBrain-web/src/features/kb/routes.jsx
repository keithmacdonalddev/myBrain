import { Routes, Route } from 'react-router-dom';

function KnowledgeBasePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-text mb-4">Knowledge Base</h1>
      <p className="text-muted">Organized articles and reference materials.</p>
      <div className="mt-6 p-4 bg-panel border border-border rounded-lg">
        <p className="text-sm text-muted">This feature is coming soon!</p>
      </div>
    </div>
  );
}

function KnowledgeBaseRoutes() {
  return (
    <Routes>
      <Route index element={<KnowledgeBasePage />} />
    </Routes>
  );
}

export default KnowledgeBaseRoutes;
