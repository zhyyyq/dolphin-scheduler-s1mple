import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Workflow } from '../../types';
import api from '../../api';
import { Dayjs } from 'dayjs';

interface Project {
  code: number;
  name: string;
}

interface MaintainState {
  workflows: Workflow[];
  loading: boolean;
  error: string | null;
  projects: Project[];
  isRestoreModalOpen: boolean;
  isBackfillModalOpen: boolean;
  selectedWorkflow: Workflow | null;
  selectedProject: number[]
  selectedTimeType: string; // 'schedule' or 'execute'
  selectedTimeRange?: [Dayjs, Dayjs];
}

const initialState: MaintainState = {
  workflows: [],
  loading: true,
  error: null,
  projects: [],
  isRestoreModalOpen: false,
  isBackfillModalOpen: false,
  selectedWorkflow: null,
  selectedProject: [],
  selectedTimeType: 'schedule', // Default to 'schedule'
  selectedTimeRange: undefined
};

export const maintainSlice = createSlice({
  name: 'maintain',
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
    setProjects: (state, action: PayloadAction<Project[]>) => {
      state.projects = action.payload;
    },
    setSelectedProject: (state, action: PayloadAction<number[]>) => {
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
    setSelectedTimeType: (state, action: PayloadAction<string>) => {
      state.selectedTimeType = action.payload;
    },
    setSelectedTimeRange: (state, action: PayloadAction<[Dayjs, Dayjs] | undefined>) => {
      state.selectedTimeRange = action.payload;
    }
  },
});

export const {
  setWorkflows,
  setLoading,
  setError,
  setProjects,
  setSelectedProject,
  setIsRestoreModalOpen,
  setIsBackfillModalOpen,
  setSelectedWorkflow,
  setSelectedTimeType,
  setSelectedTimeRange
} = maintainSlice.actions;

export const fetchProjects = createAsyncThunk(
  'home/fetchProjects',
  async (_, { dispatch }) => {
    try {
      const projects = await api.get<Project[]>('/api/projects');
      dispatch(setProjects(projects));
      dispatch(setSelectedProject(projects.map(project => project.code)));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      dispatch(setError(errorMessage));
    }
  }
);
export const fetchStats = createAsyncThunk(
  'home/fetchStats',
  async (_, { dispatch }) => {
    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      const stats = await api.get('/api/workflow/stats');
      // Assuming stats is an object with the required properties
      // Dispatch actions to update the state with stats if needed
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      dispatch(setError(errorMessage));
    } finally {
      dispatch(setLoading(false));
    }
  }
);
export const fetchWorkflows = createAsyncThunk(
  'home/fetchWorkflows',
  async (_, { dispatch }) => {
    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      const combinedWorkflows = await api.get<Workflow[]>('/api/workflow/combined');
      const sortedWorkflows = combinedWorkflows.sort((a, b) => new Date(b.updateTime).getTime() - new Date(a.updateTime).getTime());
      dispatch(setWorkflows(sortedWorkflows));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      dispatch(setError(errorMessage));
    } finally {
      dispatch(setLoading(false));
    }
  }
);

export default maintainSlice.reducer;
