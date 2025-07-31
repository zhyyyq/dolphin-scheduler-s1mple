import { createStore, ActionContext } from 'vuex';
import { Workflow, Project } from '../types';
import api from '../api';

export interface State {
  workflows: Workflow[];
  projects: Project[];
  loading: boolean;
  error: string | null;
  selectedProject: number | 'all';
  isRestoreModalOpen: boolean;
  isBackfillModalOpen: boolean;
  selectedWorkflow: Workflow | null;
}

const state: State = {
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
  setWorkflows(state: State, workflows: Workflow[]) {
    state.workflows = workflows;
  },
  setProjects(state: State, projects: Project[]) {
    state.projects = projects;
  },
  setLoading(state: State, loading: boolean) {
    state.loading = loading;
  },
  setError(state: State, error: string | null) {
    state.error = error;
  },
  setSelectedProject(state: State, project: number | 'all') {
    state.selectedProject = project;
  },
  setIsRestoreModalOpen(state: State, isOpen: boolean) {
    state.isRestoreModalOpen = isOpen;
  },
  setIsBackfillModalOpen(state: State, isOpen: boolean) {
    state.isBackfillModalOpen = isOpen;
  },
  setSelectedWorkflow(state: State, workflow: Workflow | null) {
    state.selectedWorkflow = workflow;
  },
};

const actions = {
  async fetchProjects({ commit }: ActionContext<State, State>) {
    try {
      const projects = await api.get<Project[]>('/api/projects');
      commit('setProjects', projects);
    } catch (e) {
      console.error('Failed to fetch projects', e);
    }
  },
  async fetchWorkflows({ commit }: ActionContext<State, State>) {
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
  async deleteWorkflow({ dispatch }: ActionContext<State, State>, workflow: Workflow) {
    await api.delete(`/api/workflow/${workflow.uuid}`);
    dispatch('fetchWorkflows');
  },
  async onlineWorkflow({ dispatch }: ActionContext<State, State>, workflow: Workflow) {
    await api.post(`/api/workflow/${workflow.uuid}/online`);
    dispatch('fetchWorkflows');
  },
};

export default createStore({
  state,
  mutations,
  actions,
  modules: {},
});
