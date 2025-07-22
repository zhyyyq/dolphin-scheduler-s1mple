import React from 'react';
import { Form, Input } from 'antd';

const DVCInitTaskEditor: React.FC = () => {
  return (
    <>
      <Form.Item
        label="DVC 仓库 (Repository)"
        name="repository"
        rules={[{ required: true, message: '请输入 DVC 仓库地址' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="存储地址 (Store URL)"
        name="store_url"
        rules={[{ required: true, message: '请输入 DVC 存储地址' }]}
      >
        <Input />
      </Form.Item>
    </>
  );
};

export default DVCInitTaskEditor;
