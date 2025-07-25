import React from 'react';
import {
  CodeOutlined,
  ApartmentOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  ForkOutlined,
  NodeIndexOutlined,
  SendOutlined,
  PartitionOutlined,
  DeploymentUnitOutlined,
  CloudOutlined,
  ExperimentOutlined,
  GithubOutlined,
  ReadOutlined,
  RocketOutlined,
  SettingOutlined,
  ProfileOutlined, // Add a new icon for Params
} from '@ant-design/icons';

// Import all task editors
import ShellTaskEditor from '../components/tasks/general/ShellTaskEditor';
import PythonTaskEditor from '../components/tasks/general/PythonTaskEditor';
import SqlTaskEditor from '../components/tasks/general/SqlTaskEditor';
import ProcedureTaskEditor from '../components/tasks/general/ProcedureTaskEditor';
import HttpTaskEditor from '../components/tasks/general/HttpTaskEditor';
import ParamsTaskEditor from '../components/tasks/parameter/ParamsTaskEditor';
import ConditionsTaskEditor from '../components/tasks/logic/ConditionsTaskEditor';
import SwitchTaskEditor from '../components/tasks/logic/SwitchTaskEditor';
import DependentTaskEditor from '../components/tasks/logic/DependentTaskEditor';
import SubWorkflowTaskEditor from '../components/tasks/logic/SubProcessTaskEditor';

export const taskTypes = [
  { label: 'Shell', type: 'SHELL', command: 'echo "Hello"', category: 'general', icon: CodeOutlined, editor: ShellTaskEditor },
  { label: 'Python', type: 'PYTHON', command: 'print("Hello")', category: 'general', icon: CodeOutlined, editor: PythonTaskEditor },
  { label: 'SQL', type: 'SQL', category: 'general', icon: DatabaseOutlined, editor: SqlTaskEditor, default_params: { sqlType: '0', sql: 'SELECT * FROM a', preStatements: '', postStatements: '', displayRows: 10, } },
  { label: 'Procedure', type: 'PROCEDURE', command: '', category: 'general', icon: SettingOutlined, editor: ProcedureTaskEditor },
  { label: 'HTTP', type: 'HTTP', command: 'curl http://example.com', category: 'general', icon: CloudServerOutlined, editor: HttpTaskEditor },
  { label: 'Params', type: 'PARAMS', command: '', category: 'parameter', icon: ProfileOutlined, editor: ParamsTaskEditor },
  { label: 'Conditions', type: 'CONDITIONS', command: '', category: 'logic', icon: ApartmentOutlined, editor: ConditionsTaskEditor },
  { label: 'Switch', type: 'SWITCH', command: '', category: 'logic', icon: ForkOutlined, editor: SwitchTaskEditor },
  { label: 'Dependent', type: 'DEPENDENT', command: '', category: 'logic', icon: NodeIndexOutlined, editor: DependentTaskEditor },
  { label: 'Sub Process', type: 'SUB_PROCESS', command: '', category: 'logic', icon: PartitionOutlined, editor: SubWorkflowTaskEditor },
];

export const taskCategories = [
  { key: 'general', label: 'General' },
  { key: 'parameter', label: 'Parameter' },
  { key: 'logic', label: 'Logic' },
];
