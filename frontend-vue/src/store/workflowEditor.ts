import { Module } from 'vuex';
import { State as RootState } from './index';
import { WorkflowDetail, Task } from '../types';
import api from '../api';

// Define a more specific type for context menu
interface ContextMenu {
  visible: boolean;
  x: number;
  y: number;
  type: 'node' | 'edge' | 'blank';
  data?: any;
}

export interface WorkflowEditorState {
  workflow: WorkflowDetail | null;
  diyFunctions: Task[];
  contextMenu: ContextMenu;
  isEditTaskModalOpen: boolean;
  isEditParamModalOpen: boolean;
  isEditEdgeLabelModalOpen: boolean;
  isViewYamlModalOpen: boolean;
  selectedTask: Task | null;
  selectedParam: any; // Define a proper type if available
  selectedEdge: any; // Define a proper type if available
  graphInstance: any; // This will hold the graph instance, e.g., from G6 or d3
}

const state: WorkflowEditorState = {
  workflow: null,
  diyFunctions: [],
  contextMenu: { visible: false, x: 0, y: 0, type: 'blank' },
  isEditTaskModalOpen: false,
  isEditParamModalOpen: false,
  isEditEdgeLabelModalOpen: false,
  isViewYamlModalOpen: false,
  selectedTask: null,
  selectedParam: null,
  selectedEdge: null,
  graphInstance: null,
};

const mutations = {
  setWorkflow(state: WorkflowEditorState, workflow: WorkflowDetail | null) {
    state.workflow = workflow;
  },
  setDiyFunctions(state: WorkflowEditorState, functions: Task[]) {
    state.diyFunctions = functions;
  },
  setContextMenu(state: WorkflowEditorState, menu: ContextMenu) {
    state.contextMenu = menu;
  },
  setGraphInstance(state: WorkflowEditorState, instance: any) {
    state.graphInstance = instance;
  },
  // Add other mutations for modals and selections
};

import { ActionContext } from 'vuex';

const actions = {
  async fetchDiyFunctions({ commit }: ActionContext<WorkflowEditorState, RootState>) {
    const functions = await api.get<Task[]>('/api/diy-functions'); // Adjust API path
    commit('setDiyFunctions', functions);
  },
  async fetchWorkflow({ commit }: ActionContext<WorkflowEditorState, RootState>, uuid: string) {
    const workflow = await api.get<WorkflowDetail>(`/api/workflow/${uuid}`);
    commit('setWorkflow', workflow);
  },
  clearWorkflow({ commit }: ActionContext<WorkflowEditorState, RootState>) {
    commit('setWorkflow', null);
  },
  initializeGraph({ commit }: ActionContext<WorkflowEditorState, RootState>, container: HTMLElement) {
    // Graph initialization logic will go here.
    // For now, just store a placeholder.
    const graph = { container }; // Replace with actual graph library instance
    commit('setGraphInstance', graph);
  },
  // Add other actions for saving, importing, etc.
};

const workflowEditorModule: Module<WorkflowEditorState, RootState> = {
  namespaced: true,
  state,
  mutations,
  actions,
};

export default workflowEditorModule;
