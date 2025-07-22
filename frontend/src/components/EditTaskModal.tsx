import React, { useEffect } from 'react';
import { Modal, Input, Form } from 'antd';
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

  useEffect(() => {
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
      onSave(updatedTask);

    }).catch(info => {
      console.log('Validate Failed:', info);
    });
  };

  const renderTaskEditor = () => {
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
