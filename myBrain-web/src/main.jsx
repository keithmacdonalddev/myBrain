import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import ErrorBoundary from './components/ui/ErrorBoundary'
import { initErrorCapture } from './lib/errorCapture'
import './styles/globals.css'

// Initialize global error capture (window.onerror, unhandledrejection, etc.)
initErrorCapture()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary name="root">
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
