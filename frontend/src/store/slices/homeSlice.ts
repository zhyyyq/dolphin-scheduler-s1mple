import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Workflow } from '../../types';
import api from '../../api';

interface HomeState {
  workflows: Workflow[];
  loading: boolean;
  error: string | null;
  projects: string[];
  selectedProject: string | null;
  isRestoreModalOpen: boolean;
  isBackfillModalOpen: boolean;
  selectedWorkflow: Workflow | null;
}

const initialState: HomeState = {
  workflows: [],
  loading: true,
  error: null,
  projects: [],
  selectedProject: null,
  isRestoreModalOpen: false,
  isBackfillModalOpen: false,
  selectedWorkflow: null,
};

export const homeSlice = createSlice({
  name: 'home',
  initialState,
  reducers: {
    setWorkflows: (state, action: PayloadAction<Workflow[]>) => {
      state.workflows = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setProjects: (state, action: PayloadAction<string[]>) => {
      state.projects = action.payload;
    },
    setSelectedProject: (state, action: PayloadAction<string | null>) => {
      state.selectedProject = action.payload;
    },
    setIsRestoreModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isRestoreModalOpen = action.payload;
    },
    setIsBackfillModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isBackfillModalOpen = action.payload;
    },
    setSelectedWorkflow: (state, action: PayloadAction<Workflow | null>) => {
      state.selectedWorkflow = action.payload;
    },
  },
});

export const fetchWorkflows = createAsyncThunk(
  'home/fetchWorkflows',
  async (_, { dispatch }) => {
    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      const combinedWorkflows = await api.get<Workflow[]>('/api/workflow/combined');
      dispatch(setWorkflows(combinedWorkflows));
      const uniqueProjects = Array.from(new Set(combinedWorkflows.map(w => w.projectName).filter(Boolean) as string[]));
      dispatch(setProjects(uniqueProjects));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      dispatch(setError(errorMessage));
    } finally {
      dispatch(setLoading(false));
    }
  }
);

export const {
  setWorkflows,
  setLoading,
  setError,
  setProjects,
  setSelectedProject,
  setIsRestoreModalOpen,
  setIsBackfillModalOpen,
  setSelectedWorkflow,
} = homeSlice.actions;

export default homeSlice.reducer;
