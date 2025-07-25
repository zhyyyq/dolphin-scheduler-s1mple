import React from 'react';
import { Input, Form } from 'antd';

const { TextArea } = Input;

const ShellTaskEditor: React.FC = () => {
  return (
    <>
      <Form.Item
        label="脚本"
        name="command"
        rules={[{ required: true, message: '请输入脚本内容' }]}
      >
        <TextArea rows={10} placeholder="请输入脚本内容" />
      </Form.Item>
    </>
  );
};

export default ShellTaskEditor;
