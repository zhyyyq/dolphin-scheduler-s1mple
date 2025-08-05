import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Workflow } from '../../types';
import api from '../../api';
import dayjs from 'dayjs';
import { RootState } from '..';
import { set } from 'yaml/dist/schema/yaml-1.1/set';
import { time } from 'console';

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
  selectedTimeType: string;
  selectedWorkflow: Workflow | null;
  selectedProject: number[]
  selectedTimeRange: [string, string];
  selectedDisplayType: string;
  taskStats: { statusDesc: string; count: number; statusCode: number }[];
  workflowStats: { statusDesc: string; count: number; statusCode: number }[];
} 

const initialState: MaintainState = {
  workflows: [],
  loading: true,
  error: null,
  projects: [],
  isRestoreModalOpen: false,
  isBackfillModalOpen: false,
  selectedTimeType: '0', // '0' for scheduling time, '1' for execution time
  selectedWorkflow: null,
  selectedProject: [],
  selectedTimeRange: [dayjs().startOf('day').toISOString(), dayjs().endOf('day').toISOString()],
  taskStats: [],
  workflowStats: [],
  selectedDisplayType: '0', // '0' for workflow instance stats, '1' for task stats
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
    setSelectedTimeRange: (state, action: PayloadAction<[dayjs.Dayjs, dayjs.Dayjs] | undefined>) => {
      state.selectedTimeRange = action.payload?.map(t => t.toISOString()) as [string, string] || initialState.selectedTimeRange;
    },
    setTaskStats: (state, action: PayloadAction<{ statusDesc: string; count: number; statusCode: number }[]>) => {
      state.taskStats = action.payload;
    },
    setSelectedTimeType: (state, action: PayloadAction<string>) => {
      state.selectedTimeType = action.payload;
    },
    setSelectedDisplayType: (state, action: PayloadAction<string>) => {
      state.selectedDisplayType = action.payload;
    },
    setWorkflowStats: (state, action: PayloadAction<{ statusDesc: string; count: number; statusCode: number }[]>) => {
      state.workflowStats = action.payload;
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
  setSelectedTimeRange,
  setTaskStats,
  setSelectedTimeType,
  setSelectedDisplayType,
  setWorkflowStats
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
  async (_, { getState, dispatch }) => {
    const state = getState() as RootState;
    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      const stats: any = await api.get('/api/maintain/stats', {
        projectCodes: state.maintain.selectedProject,
        timeType: state.maintain.selectedTimeType,
        timeRange: state.maintain.selectedTimeRange.map(t => dayjs(t).format('YYYY-MM-DD HH:mm:ss')),
        taskType: undefined
      });
      console.log('Fetched stats:', stats);
      dispatch(setTaskStats(stats.taskStats));
      dispatch(setWorkflowStats(stats.workflowStats));
      dispatch(setError(null));
      dispatch(setLoading(false));
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
