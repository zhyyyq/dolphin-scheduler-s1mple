import React from 'react';
import { Form, Input } from 'antd';

const { TextArea } = Input;

const ShellTaskEditor: React.FC = () => {
  return (
    <Form.Item
      label="命令"
      name="command"
      rules={[{ required: true, message: '请输入 Shell 命令' }]}
    >
      <TextArea rows={10} placeholder="请输入 Shell 命令" />
    </Form.Item>
  );
};

export default ShellTaskEditor;
