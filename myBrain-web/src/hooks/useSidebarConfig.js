import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '../lib/api';

/**
 * Hook to fetch sidebar configuration for regular users
 * Returns the global sidebar config that admins have set
 */
export function useSidebarConfig() {
  return useQuery({
    queryKey: ['sidebar-config'],
    queryFn: async () => {
      const response = await settingsApi.getSidebarConfig();
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - sidebar config doesn't change often
  });
}

export default useSidebarConfig;
