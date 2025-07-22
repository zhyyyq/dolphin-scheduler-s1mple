import React, { useEffect } from 'react';
import { Modal, Input, Form } from 'antd';
import { Task } from '../types';
import SqlTaskEditor from './tasks/SqlTaskEditor';
import ShellTaskEditor from './tasks/ShellTaskEditor';
import SwitchTaskEditor from './tasks/SwitchTaskEditor';
import SubWorkflowTaskEditor from './tasks/SubWorkflowTaskEditor';
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
      onSave({ ...task, ...values });
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
      // Add cases for other task types here
      default:
        return <p>此任务类型没有可用的自定义编辑器。</p>;
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
