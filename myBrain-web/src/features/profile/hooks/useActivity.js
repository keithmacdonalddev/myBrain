import { useQuery } from '@tanstack/react-query';
import { profileApi } from '../../../lib/api';

export function useUserActivity(options = {}) {
  const { days = 30, limit = 50 } = options;

  return useQuery({
    queryKey: ['user-activity', days, limit],
    queryFn: async () => {
      const response = await profileApi.getActivity({ days, limit });
      return response.data;
    },
  });
}
