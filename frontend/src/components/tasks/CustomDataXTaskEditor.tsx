import React from 'react';
import { Form, Input } from 'antd';

const CustomDataXTaskEditor: React.FC = () => {
  return (
    <Form.Item
      label="自定义 JSON 配置"
      name="json"
      rules={[{ required: true, message: '请输入 JSON 文件引用' }]}
      tooltip='例如: $FILE{"example_datax.json"}'
    >
      <Input />
    </Form.Item>
  );
};

export default CustomDataXTaskEditor;
