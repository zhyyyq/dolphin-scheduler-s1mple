import { createStore } from 'vuex';
import homeModule, { HomeState } from './home';
import workflowEditorModule, { WorkflowEditorState } from './workflowEditor';

export interface State {
  home: HomeState;
  workflowEditor: WorkflowEditorState;
}

export default createStore<State>({
  modules: {
    home: homeModule,
    workflowEditor: workflowEditorModule,
  },
});
