import DependentTaskEditor from "../components/SchedulerEditor/components/tasks/dependent/DependentTaskEditor";
import DiyFunctionTaskEditor from "../components/SchedulerEditor/components/tasks/DiyFunctionTaskEditor";
import AlertTaskEditor from "../components/SchedulerEditor/components/tasks/general/AlertTaskEditor";
import HttpTaskEditor from "../components/SchedulerEditor/components/tasks/general/HttpTaskEditor";
import JavaTaskEditor from "../components/SchedulerEditor/components/tasks/general/JavaTaskEditor";
import ParamsTaskEditor from "../components/SchedulerEditor/components/tasks/general/ParamsTaskEditor";
import ProcedureTaskEditor from "../components/SchedulerEditor/components/tasks/general/ProcedureTaskEditor";
import PythonTaskEditor from "../components/SchedulerEditor/components/tasks/general/PythonTaskEditor";
import ShellTaskEditor from "../components/SchedulerEditor/components/tasks/general/ShellTaskEditor";
import SqlTaskEditor from "../components/SchedulerEditor/components/tasks/general/SqlTaskEditor";
import ConditionsTaskEditor from "../components/SchedulerEditor/components/tasks/logic/ConditionsTaskEditor";
import LogicGateTaskEditor from "../components/SchedulerEditor/components/tasks/logic/LogicGateTaskEditor";
import SwitchTaskEditor from "../components/SchedulerEditor/components/tasks/logic/SwitchTaskEditor";
import SubWorkflowTaskEditor from "../components/SchedulerEditor/components/tasks/SubWorkflowTaskEditor";


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
  AlertTaskEditor,
  JavaTaskEditor
];

export const taskTypes = editors.map(editor => editor.taskInfo);

export const taskCategories = [
  { key: 'general', label: '通用' },
  { key: 'logic', label: '逻辑' },
  { key: '依赖', label: '依赖' },
];
