import { configureStore } from '@reduxjs/toolkit';
import workflowEditorReducer from './slices/workflowEditorSlice';

export const store = configureStore({
  reducer: {
    workflowEditor: workflowEditorReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
