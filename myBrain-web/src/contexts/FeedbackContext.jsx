import { createContext, useContext, useState } from 'react';

/**
 * FeedbackContext
 *
 * Manages the global state for the feedback modal.
 * Provides a way to open/close the feedback modal from anywhere in the app.
 *
 * Usage:
 * const { isFeedbackOpen, openFeedback, closeFeedback } = useFeedback();
 * <button onClick={openFeedback}>Report Issue</button>
 */
const FeedbackContext = createContext();

export function FeedbackProvider({ children }) {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const openFeedback = () => {
    setIsFeedbackOpen(true);
  };

  const closeFeedback = () => {
    setIsFeedbackOpen(false);
  };

  const value = {
    isFeedbackOpen,
    openFeedback,
    closeFeedback,
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
}
