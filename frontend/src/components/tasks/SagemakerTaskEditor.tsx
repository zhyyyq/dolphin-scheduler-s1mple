import React from 'react';
import { Form, Input } from 'antd';

const SagemakerTaskEditor: React.FC = () => {
  return (
    <Form.Item
      label="Sagemaker 请求 JSON"
      name="sagemaker_request_json"
      rules={[{ required: true, message: '请输入 Sagemaker 请求 JSON 的文件引用' }]}
      tooltip='例如: $FILE{"example_sagemaker_params.json"}'
    >
      <Input />
    </Form.Item>
  );
};

export default SagemakerTaskEditor;
