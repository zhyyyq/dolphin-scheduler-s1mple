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
import ParamsTaskEditor from '../components/tasks/ParamsTaskEditor';
import ShellTaskEditor from '../components/tasks/ShellTaskEditor';
import PythonTaskEditor from '../components/tasks/PythonTaskEditor';
import ConditionsTaskEditor from '../components/tasks/ConditionsTaskEditor';
import SwitchTaskEditor from '../components/tasks/SwitchTaskEditor';
import DependentTaskEditor from '../components/tasks/DependentTaskEditor';
import SubWorkflowTaskEditor from '../components/tasks/SubWorkflowTaskEditor';
import SqlTaskEditor from '../components/tasks/SqlTaskEditor';
import DataXTaskEditor from '../components/tasks/DataXTaskEditor';
import SparkTaskEditor from '../components/tasks/SparkTaskEditor';
import FlinkTaskEditor from '../components/tasks/FlinkTaskEditor';
import MapReduceTaskEditor from '../components/tasks/MapReduceTaskEditor';
import KubernetesTaskEditor from '../components/tasks/K8STaskEditor';
import SagemakerTaskEditor from '../components/tasks/SagemakerTaskEditor';
import MLflowModelsTaskEditor from '../components/tasks/MLflowModelsTaskEditor';
import OpenMLDBTaskEditor from '../components/tasks/OpenMLDBTaskEditor';
import PytorchTaskEditor from '../components/tasks/PytorchTaskEditor';
import DVCTaskEditor from '../components/tasks/DVCInitTaskEditor'; // Assuming DVC uses one of these
import HttpTaskEditor from '../components/tasks/HttpTaskEditor';
import ProcedureTaskEditor from '../components/tasks/ProcedureTaskEditor';

export const taskTypes = [
  { label: 'Params', type: 'PARAMS', command: '', category: 'general', icon: ProfileOutlined, editor: ParamsTaskEditor },
  { label: 'Shell', type: 'SHELL', command: 'echo "Hello"', category: 'general', icon: CodeOutlined, editor: ShellTaskEditor },
  { label: 'Python', type: 'PYTHON', command: 'print("Hello")', category: 'general', icon: CodeOutlined, editor: PythonTaskEditor },
  { label: 'Conditions', type: 'CONDITIONS', command: '', category: 'control_flow', icon: ApartmentOutlined, editor: ConditionsTaskEditor },
  { label: 'Switch', type: 'SWITCH', command: '', category: 'control_flow', icon: ForkOutlined, editor: SwitchTaskEditor },
  { label: 'Dependent', type: 'DEPENDENT', command: '', category: 'control_flow', icon: NodeIndexOutlined, editor: DependentTaskEditor },
  { label: 'Sub Process', type: 'SUB_PROCESS', command: '', category: 'control_flow', icon: PartitionOutlined, editor: SubWorkflowTaskEditor },
  { 
    label: 'SQL', 
    type: 'SQL', 
    category: 'data', 
    icon: DatabaseOutlined,
    editor: SqlTaskEditor,
    default_params: {
      sqlType: '0',
      sql: 'SELECT * FROM a',
      preStatements: '',
      postStatements: '',
      displayRows: 10,
    } 
  },
  { label: 'DataX', type: 'DATAX', command: '', category: 'data', icon: SendOutlined, editor: DataXTaskEditor },
  { label: 'Spark', type: 'SPARK', command: '', category: 'big_data', icon: RocketOutlined, editor: SparkTaskEditor },
  { label: 'Flink', type: 'FLINK', command: '', category: 'big_data', icon: RocketOutlined, editor: FlinkTaskEditor },
  { label: 'Map Reduce', type: 'MAP_REDUCE', command: '', category: 'big_data', icon: RocketOutlined, editor: MapReduceTaskEditor },
  { label: 'Kubernetes', type: 'KUBERNETES', command: '', category: 'cloud_ml', icon: DeploymentUnitOutlined, editor: KubernetesTaskEditor },
  { label: 'SageMaker', type: 'SAGEMAKER', command: '', category: 'cloud_ml', icon: CloudOutlined, editor: SagemakerTaskEditor },
  { label: 'MLflow', type: 'ML_FLOW', command: '', category: 'cloud_ml', icon: ExperimentOutlined, editor: MLflowModelsTaskEditor },
  { label: 'OpenMLDB', type: 'OPEN_MLDB', command: '', category: 'cloud_ml', icon: ReadOutlined, editor: OpenMLDBTaskEditor },
  { label: 'PyTorch', type: 'PYTORCH', command: '', category: 'cloud_ml', icon: GithubOutlined, editor: PytorchTaskEditor },
  { label: 'DVC', type: 'DVC', command: '', category: 'cloud_ml', icon: GithubOutlined, editor: DVCTaskEditor },
  { label: 'HTTP', type: 'HTTP', command: 'curl http://example.com', category: 'other', icon: CloudServerOutlined, editor: HttpTaskEditor },
  { label: 'Procedure', type: 'PROCEDURE', command: '', category: 'other', icon: SettingOutlined, editor: ProcedureTaskEditor },
];

export const taskCategories = [
  { key: 'general', label: 'General' },
  { key: 'control_flow', label: 'Control Flow' },
  { key: 'data', label: 'Data' },
  { key: 'big_data', label: 'Big Data' },
  { key: 'cloud_ml', label: 'Cloud/ML' },
  { key: 'other', label: 'Other' },
];
