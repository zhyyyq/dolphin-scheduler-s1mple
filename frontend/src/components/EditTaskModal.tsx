import React, { useEffect } from 'react';
import { Modal, Input, Form } from 'antd';
import { Task } from '../types';
import SqlTaskEditor from './tasks/SqlTaskEditor';
import ShellTaskEditor from './tasks/ShellTaskEditor';
import SwitchTaskEditor from './tasks/SwitchTaskEditor';
import SubWorkflowTaskEditor from './tasks/SubWorkflowTaskEditor';
import SparkTaskEditor from './tasks/SparkTaskEditor';
import PythonTaskEditor from './tasks/PythonTaskEditor';
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

      if (values.yaml_content) {
        try {
          const yamlData = yaml.load(values.yaml_content) as object;
          // Merge the yaml data, ensuring name from the main form is preserved
          updatedTask = { ...task, name: values.name, ...yamlData };
        } catch (e) {
          console.error("Error parsing YAML:", e);
          // Optionally, show an error message to the user
          return;
        }
      }
      
      delete updatedTask.yaml_content; // Clean up the temporary field
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
