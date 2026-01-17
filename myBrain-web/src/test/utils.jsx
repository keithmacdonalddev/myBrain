import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/authSlice';
import areasReducer from '../store/areasSlice';
import themeReducer from '../store/themeSlice';
import toastReducer from '../store/toastSlice';

// Create a test query client
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// Create a test store with optional preloaded state
function createTestStore(preloadedState = {}) {
  return configureStore({
    reducer: {
      auth: authReducer,
      areas: areasReducer,
      theme: themeReducer,
      toast: toastReducer,
    },
    preloadedState,
  });
}

// All providers wrapper
function AllProviders({ children, preloadedState = {} }) {
  const store = createTestStore(preloadedState);
  const queryClient = createTestQueryClient();

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
}

// Custom render that wraps with providers
function customRender(ui, { preloadedState = {}, ...options } = {}) {
  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders preloadedState={preloadedState}>
        {children}
      </AllProviders>
    ),
    ...options,
  });
}

// Re-export everything
export * from '@testing-library/react';
export { customRender as render, createTestStore, createTestQueryClient };
