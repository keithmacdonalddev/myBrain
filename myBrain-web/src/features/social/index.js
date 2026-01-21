// Social feature module exports
export { socialRoutes } from './routes';

// Components
export { default as ConnectionCard } from './components/ConnectionCard';
export { default as ConnectionsList } from './components/ConnectionsList';
export { default as UserSearch } from './components/UserSearch';
export { default as SuggestedConnections } from './components/SuggestedConnections';
export { default as ShareModal } from './components/ShareModal';
export { default as ShareButton } from './components/ShareButton';

// Pages
export { default as ConnectionsPage } from './pages/ConnectionsPage';
export { default as UserProfilePage } from './pages/UserProfilePage';
export { default as SharedWithMePage } from './pages/SharedWithMePage';

// Hooks
export * from './hooks/useConnections';
