import React, { useEffect, useState } from 'react';
import { Modal, Input, Form, Switch, Space, Button } from 'antd';
import { Task } from '../types';
import SqlTaskEditor from './tasks/SqlTaskEditor';
import ShellTaskEditor from './tasks/ShellTaskEditor';
import SwitchTaskEditor from './tasks/SwitchTaskEditor';
import SubWorkflowTaskEditor from './tasks/SubWorkflowTaskEditor';
import SparkTaskEditor from './tasks/SparkTaskEditor';
import PythonTaskEditor from './tasks/PythonTaskEditor';
import ConditionsTaskEditor from './tasks/ConditionsTaskEditor';
import DataXTaskEditor from './tasks/DataXTaskEditor';
import CustomDataXTaskEditor from './tasks/CustomDataXTaskEditor';
import DependentTaskEditor from './tasks/DependentTaskEditor';
import DVCInitTaskEditor from './tasks/DVCInitTaskEditor';
import DVCUploadTaskEditor from './tasks/DVCUploadTaskEditor';
import DVCDownloadTaskEditor from './tasks/DVCDownloadTaskEditor';
import FlinkTaskEditor from './tasks/FlinkTaskEditor';
import HttpTaskEditor from './tasks/HttpTaskEditor';
import K8STaskEditor from './tasks/K8STaskEditor';
import MapReduceTaskEditor from './tasks/MapReduceTaskEditor';
import MLFlowProjectsCustomTaskEditor from './tasks/MLFlowProjectsCustomTaskEditor';
import MLFlowProjectsAutoMLTaskEditor from './tasks/MLFlowProjectsAutoMLTaskEditor';
import MLflowModelsTaskEditor from './tasks/MLflowModelsTaskEditor';
import MLFlowProjectsBasicAlgorithmTaskEditor from './tasks/MLFlowProjectsBasicAlgorithmTaskEditor';
import OpenMLDBTaskEditor from './tasks/OpenMLDBTaskEditor';
import ProcedureTaskEditor from './tasks/ProcedureTaskEditor';
import PytorchTaskEditor from './tasks/PytorchTaskEditor';
import SagemakerTaskEditor from './tasks/SagemakerTaskEditor';
import DefaultTaskEditor from './tasks/DefaultTaskEditor';
import yaml from 'js-yaml';
// Import other specific editors as needed

interface EditTaskModalProps {
  open: boolean;
  task: Task | null;
  onCancel: () => void;
  onSave: (updated_task: Task) => void;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({ open, task, onCancel, onSave }) => {
  const [form] = Form.useForm();
  const [useDefaultEditor, setUseDefaultEditor] = useState(false);

  useEffect(() => {
    // Reset the switch when a new task is opened
    setUseDefaultEditor(false);
    if (open && task) {
      form.setFieldsValue(task);
    }
  }, [open, task, form]);

  if (!task) {
    return null;
  }

  const handleOk = () => {
    form.validateFields().then(values => {
      let updatedTask = { ...task, ...values };

      if (values.yaml_content) { // For the Default Editor
        try {
          const yamlData = yaml.load(values.yaml_content) as object;
          updatedTask = { ...task, name: values.name, ...yamlData };
        } catch (e) {
          console.error("Error parsing YAML:", e);
          return;
        }
        delete updatedTask.yaml_content;
      }

      if (values.conditions_yaml) { // For the Conditions Editor
        try {
          const conditionsData = yaml.load(values.conditions_yaml) as { op: string, groups: any[] };
          updatedTask = {
            ...task,
            name: values.name,
            success_task: values.success_task,
            failed_task: values.failed_task,
            op: conditionsData.op,
            groups: conditionsData.groups,
          };
        } catch (e) {
          console.error("Error parsing YAML for Conditions:", e);
          return;
        }
        delete updatedTask.conditions_yaml;
      }

      if (values.denpendence_yaml) { // For the Dependent Editor
        try {
          const denpendenceData = yaml.load(values.denpendence_yaml) as object;
          updatedTask = {
            ...task,
            name: values.name,
            denpendence: denpendenceData,
          };
        } catch (e) {
          console.error("Error parsing YAML for Dependent:", e);
          return;
        }
        delete updatedTask.denpendence_yaml;
      }

      // This logic is now simplified. The parser will handle the string conversion.
      // The form values will be directly merged.
      if (values.http_params_yaml) {
        // The yaml content is now the direct value for http_params
        values.http_params = values.http_params_yaml;
        delete values.http_params_yaml;
      }
      
      updatedTask = { ...task, ...values };
      onSave(updatedTask);

    }).catch(info => {
      console.log('Validate Failed:', info);
    });
  };

  const renderTaskEditor = () => {
    if (useDefaultEditor) {
      return <DefaultTaskEditor initialValues={task} form={form} />;
    }

    switch (task.task_type) {
      case 'Sql':
        return <SqlTaskEditor />;
      case 'Shell':
        return <ShellTaskEditor />;
      case 'Switch':
        return <SwitchTaskEditor />;
      case 'SubWorkflow':
        return <SubWorkflowTaskEditor />;
      case 'Spark':
        return <SparkTaskEditor />;
      case 'Python':
        return <PythonTaskEditor />;
      case 'Condition':
        return <ConditionsTaskEditor form={form} initialValues={task} />;
      case 'DataX':
        return <DataXTaskEditor />;
      case 'CustomDataX':
        return <CustomDataXTaskEditor />;
      case 'Dependent':
        return <DependentTaskEditor form={form} initialValues={task} />;
      case 'DVCInit':
        return <DVCInitTaskEditor />;
      case 'DVCUpload':
        return <DVCUploadTaskEditor />;
      case 'DVCDownload':
        return <DVCDownloadTaskEditor />;
      case 'Flink':
        return <FlinkTaskEditor />;
      case 'Http':
        return <HttpTaskEditor form={form} initialValues={task} />;
      case 'K8S':
        return <K8STaskEditor />;
      case 'MR':
        return <MapReduceTaskEditor />;
      case 'MLFlowProjectsCustom':
        return <MLFlowProjectsCustomTaskEditor />;
      case 'MLFlowProjectsAutoML':
        return <MLFlowProjectsAutoMLTaskEditor />;
      case 'MLflowModels':
        return <MLflowModelsTaskEditor />;
      case 'MLFlowProjectsBasicAlgorithm':
        return <MLFlowProjectsBasicAlgorithmTaskEditor />;
      case 'OpenMLDB':
        return <OpenMLDBTaskEditor />;
      case 'Procedure':
        return <ProcedureTaskEditor />;
      case 'pytorch':
        return <PytorchTaskEditor />;
      case 'Sagemaker':
        return <SagemakerTaskEditor />;
      // Add cases for other task types here
      default:
        return <DefaultTaskEditor initialValues={task} form={form} />;
    }
  };

  return (
    <Modal
      title={`编辑任务: ${task.name}`}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      forceRender
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Space>
            <Switch checked={useDefaultEditor} onChange={setUseDefaultEditor} />
            <span>使用 YAML 编辑器</span>
          </Space>
          <div>
            <Button onClick={onCancel}>取消</Button>
            <Button type="primary" onClick={handleOk}>确定</Button>
          </div>
        </div>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="任务名称"
          name="name"
          rules={[{ required: true, message: '请输入任务名称' }]}
        >
          <Input />
        </Form.Item>
        {renderTaskEditor()}
      </Form>
    </Modal>
  );
};

export default EditTaskModal;
