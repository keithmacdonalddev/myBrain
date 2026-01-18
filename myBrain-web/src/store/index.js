import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import areasReducer from './areasSlice';
import themeReducer from './themeSlice';
import toastReducer from './toastSlice';
import lifeAreasReducer from './lifeAreasSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    areas: areasReducer,
    theme: themeReducer,
    toast: toastReducer,
    lifeAreas: lifeAreasReducer,
  },
});

export default store;
