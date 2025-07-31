import ShellTaskEditor from '../pages/WorkflowEditorPage/components/tasks/general/ShellTaskEditor';
import PythonTaskEditor from '../pages/WorkflowEditorPage/components/tasks/general/PythonTaskEditor';
import SqlTaskEditor from '../pages/WorkflowEditorPage/components/tasks/general/SqlTaskEditor';
import ProcedureTaskEditor from '../pages/WorkflowEditorPage/components/tasks/general/ProcedureTaskEditor';
import HttpTaskEditor from '../pages/WorkflowEditorPage/components/tasks/general/HttpTaskEditor';
import ParamsTaskEditor from '../pages/WorkflowEditorPage/components/tasks/general/ParamsTaskEditor';
import ConditionsTaskEditor from '../pages/WorkflowEditorPage/components/tasks/logic/ConditionsTaskEditor';
import SwitchTaskEditor from '../pages/WorkflowEditorPage/components/tasks/logic/SwitchTaskEditor';
import DependentTaskEditor from '../pages/WorkflowEditorPage/components/tasks/dependent/DependentTaskEditor';
import LogicGateTaskEditor from '../pages/WorkflowEditorPage/components/tasks/logic/LogicGateTaskEditor';
import SubWorkflowTaskEditor from '../pages/WorkflowEditorPage/components/tasks/logic/SubProcessTaskEditor';
import DiyFunctionTaskEditor from '../pages/WorkflowEditorPage/components/tasks/DiyFunctionTaskEditor';

const AndTask = { taskInfo: LogicGateTaskEditor.taskInfo.AND };
const OrTask = { taskInfo: LogicGateTaskEditor.taskInfo.OR };

const editors = [
  ShellTaskEditor,
  PythonTaskEditor,
  SqlTaskEditor,
  ProcedureTaskEditor,
  HttpTaskEditor,
  ParamsTaskEditor,
  ConditionsTaskEditor,
  SwitchTaskEditor,
  DependentTaskEditor,
  SubWorkflowTaskEditor,
  DiyFunctionTaskEditor,
  AndTask,
  OrTask,
];

export const taskTypes = editors.map(editor => editor.taskInfo);

export const taskCategories = [
  { key: 'general', label: '通用' },
  { key: 'logic', label: '逻辑' },
  { key: '依赖', label: '依赖' },
];
