import React from 'react';
import { Form, Input } from 'antd';

const { TextArea } = Input;

const PythonTaskEditor: React.FC = () => {
  return (
    <Form.Item
      label="Python Definition"
      name="definition"
      rules={[{ required: true, message: '请输入 Python 代码' }]}
    >
      <TextArea
        rows={15}
        placeholder="在此输入您的 Python 脚本"
        style={{ fontFamily: 'monospace' }}
      />
    </Form.Item>
  );
};

export default PythonTaskEditor;
