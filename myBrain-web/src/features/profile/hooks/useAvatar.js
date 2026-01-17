import { useMutation } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { profileApi } from '../../../lib/api';
import { setUser } from '../../../store/authSlice';

export function useUploadAvatar() {
  const dispatch = useDispatch();

  return useMutation({
    mutationFn: (file) => profileApi.uploadAvatar(file).then(res => res.data),
    onSuccess: (data) => {
      dispatch(setUser(data.user));
    },
  });
}

export function useDeleteAvatar() {
  const dispatch = useDispatch();

  return useMutation({
    mutationFn: () => profileApi.deleteAvatar().then(res => res.data),
    onSuccess: (data) => {
      dispatch(setUser(data.user));
    },
  });
}
