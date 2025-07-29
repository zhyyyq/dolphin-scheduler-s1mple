import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import dayjs from 'dayjs';

interface WorkflowEditorState {
  workflowName: string;
  workflowSchedule: string;
  isScheduleEnabled: boolean;
  scheduleTimeRange: [string | null, string | null];
}

const initialState: WorkflowEditorState = {
  workflowName: 'my-workflow',
  workflowSchedule: '0 0 * * *',
  isScheduleEnabled: true,
  scheduleTimeRange: [dayjs().toISOString(), dayjs().add(100, 'year').toISOString()],
};

export const workflowEditorSlice = createSlice({
  name: 'workflowEditor',
  initialState,
  reducers: {
    setWorkflowName: (state, action: PayloadAction<string>) => {
      state.workflowName = action.payload;
    },
    setWorkflowSchedule: (state, action: PayloadAction<string>) => {
      state.workflowSchedule = action.payload;
    },
    setIsScheduleEnabled: (state, action: PayloadAction<boolean>) => {
      state.isScheduleEnabled = action.payload;
    },
    setScheduleTimeRange: (state, action: PayloadAction<[string | null, string | null]>) => {
      state.scheduleTimeRange = action.payload;
    },
  },
});

export const {
  setWorkflowName,
  setWorkflowSchedule,
  setIsScheduleEnabled,
  setScheduleTimeRange,
} = workflowEditorSlice.actions;

export default workflowEditorSlice.reducer;
