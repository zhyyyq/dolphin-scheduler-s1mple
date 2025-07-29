import React, { useState } from 'react';
import { Modal, Form, Input, App as AntApp } from 'antd';
import api from '../../../api';

interface CreateProjectModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ open, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(false);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await api.post('/api/projects', values);
      message.success('项目创建成功');
      onSuccess();
      form.resetFields();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="创建项目"
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
    >
      <Form form={form} layout="vertical" name="create_project_form">
        <Form.Item
          name="name"
          label="项目名称"
          rules={[{ required: true, message: '请输入项目名称' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="owner"
          label="所属用户"
          rules={[{ required: true, message: '请输入所属用户' }]}
          initialValue="admin"
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="description"
          label="项目描述"
        >
          <Input.TextArea rows={4} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateProjectModal;
