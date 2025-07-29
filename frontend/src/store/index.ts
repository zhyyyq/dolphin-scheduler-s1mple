import { configureStore } from '@reduxjs/toolkit';
import workflowEditorReducer from './slices/workflowEditorSlice';

export const store = configureStore({
  reducer: {
    workflowEditor: workflowEditorReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['workflowEditor/setGraph'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['workflowEditor.graph'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
