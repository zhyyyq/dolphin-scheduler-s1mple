import ShellTaskEditor from '../components/tasks/general/ShellTaskEditor';
import PythonTaskEditor from '../components/tasks/general/PythonTaskEditor';
import SqlTaskEditor from '../components/tasks/general/SqlTaskEditor';
import ProcedureTaskEditor from '../components/tasks/general/ProcedureTaskEditor';
import HttpTaskEditor from '../components/tasks/general/HttpTaskEditor';
import ParamsTaskEditor from '../components/tasks/general/ParamsTaskEditor';
import ConditionsTaskEditor from '../components/tasks/logic/ConditionsTaskEditor';
import SwitchTaskEditor from '../components/tasks/logic/SwitchTaskEditor';
import DependentTaskEditor from '../components/tasks/logic/DependentTaskEditor';
import SubWorkflowTaskEditor from '../components/tasks/logic/SubProcessTaskEditor';

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
];

export const taskTypes = editors.map(editor => editor.taskInfo);

export const taskCategories = [
  { key: 'general', label: '通用' },
  { key: 'logic', label: '逻辑' },
];
