import { createContext, useContext, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useMutation } from '@tanstack/react-query';
import { profileApi } from '../lib/api';
import { setUser } from '../store/authSlice';

const TooltipsContext = createContext({
  tooltipsEnabled: true,
  toggleTooltips: () => {},
  setTooltipsEnabled: () => {},
  isUpdating: false,
});

export function TooltipsProvider({ children }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  // Get tooltipsEnabled from user preferences, default to true
  const tooltipsEnabled = user?.preferences?.tooltipsEnabled ?? true;

  // Mutation to update preferences
  const updatePreferencesMutation = useMutation({
    mutationFn: (preferences) => profileApi.updatePreferences(preferences),
    onSuccess: (response) => {
      // Update user in Redux store with new preferences
      if (response.data?.user) {
        dispatch(setUser(response.data.user));
      }
    },
  });

  const setTooltipsEnabled = useCallback((enabled) => {
    updatePreferencesMutation.mutate({ tooltipsEnabled: enabled });
  }, [updatePreferencesMutation]);

  const toggleTooltips = useCallback(() => {
    setTooltipsEnabled(!tooltipsEnabled);
  }, [tooltipsEnabled, setTooltipsEnabled]);

  return (
    <TooltipsContext.Provider
      value={{
        tooltipsEnabled,
        toggleTooltips,
        setTooltipsEnabled,
        isUpdating: updatePreferencesMutation.isPending,
      }}
    >
      {children}
    </TooltipsContext.Provider>
  );
}

export function useTooltips() {
  const context = useContext(TooltipsContext);
  if (!context) {
    throw new Error('useTooltips must be used within a TooltipsProvider');
  }
  return context;
}

export default TooltipsContext;
