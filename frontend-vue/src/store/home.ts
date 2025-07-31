import { Module, ActionContext } from 'vuex';
import { State as RootState } from './index';
import { Workflow, Project } from '../types';
import api from '../api';

export interface HomeState {
  workflows: Workflow[];
  projects: Project[];
  loading: boolean;
  error: string | null;
  selectedProject: number | 'all';
  isRestoreModalOpen: boolean;
  isBackfillModalOpen: boolean;
  selectedWorkflow: Workflow | null;
}

const state: HomeState = {
  workflows: [],
  projects: [],
  loading: false,
  error: null,
  selectedProject: 'all',
  isRestoreModalOpen: false,
  isBackfillModalOpen: false,
  selectedWorkflow: null,
};

const mutations = {
  setWorkflows(state: HomeState, workflows: Workflow[]) {
    state.workflows = workflows;
  },
  setProjects(state: HomeState, projects: Project[]) {
    state.projects = projects;
  },
  setLoading(state: HomeState, loading: boolean) {
    state.loading = loading;
  },
  setError(state: HomeState, error: string | null) {
    state.error = error;
  },
  setSelectedProject(state: HomeState, project: number | 'all') {
    state.selectedProject = project;
  },
  setIsRestoreModalOpen(state: HomeState, isOpen: boolean) {
    state.isRestoreModalOpen = isOpen;
  },
  setIsBackfillModalOpen(state: HomeState, isOpen: boolean) {
    state.isBackfillModalOpen = isOpen;
  },
  setSelectedWorkflow(state: HomeState, workflow: Workflow | null) {
    state.selectedWorkflow = workflow;
  },
};

const actions = {
  async fetchProjects({ commit }: ActionContext<HomeState, RootState>) {
    try {
      const projects = await api.get<Project[]>('/api/projects');
      commit('setProjects', projects);
    } catch (e) {
      console.error('Failed to fetch projects', e);
    }
  },
  async fetchWorkflows({ commit }: ActionContext<HomeState, RootState>) {
    commit('setLoading', true);
    commit('setError', null);
    try {
      const workflows = await api.get<Workflow[]>('/api/workflow/combined');
      commit('setWorkflows', workflows);
    } catch (e) {
      commit('setError', 'Failed to fetch workflows');
    } finally {
      commit('setLoading', false);
    }
  },
  async deleteWorkflow({ dispatch }: ActionContext<HomeState, RootState>, workflow: Workflow) {
    await api.delete(`/api/workflow/${workflow.uuid}`);
    dispatch('fetchWorkflows');
  },
  async onlineWorkflow({ dispatch }: ActionContext<HomeState, RootState>, workflow: Workflow) {
    await api.post(`/api/workflow/${workflow.uuid}/online`);
    dispatch('fetchWorkflows');
  },
};

const homeModule: Module<HomeState, RootState> = {
  namespaced: true,
  state,
  mutations,
  actions,
};

export default homeModule;
