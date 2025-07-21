import React, { useEffect } from 'react';
import { Modal, Input, Form } from 'antd';
import { Task } from '../types';
import SqlTaskEditor from './tasks/SqlTaskEditor';
// Import other specific editors as needed

interface EditTaskModalProps {
  task: Task | null;
  onCancel: () => void;
  onSave: (updated_task: Task) => void;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({ task, onCancel, onSave }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (task) {
      form.setFieldsValue(task);
    }
  }, [task, form]);

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
        return <SqlTaskEditor task={task} onChange={(new_task) => form.setFieldsValue(new_task)} />;
      // Add cases for other task types here
      default:
        return <p>此任务类型没有可用的自定义编辑器。</p>;
    }
  };

  return (
    <Modal
      title={`编辑任务: ${task.name}`}
      visible={!!task}
      onOk={handleOk}
      onCancel={onCancel}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={task}>
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
