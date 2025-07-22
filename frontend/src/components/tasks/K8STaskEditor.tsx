import React from 'react';
import { Form, Input, InputNumber } from 'antd';

const { TextArea } = Input;

const K8STaskEditor: React.FC = () => {
  return (
    <>
      <Form.Item
        label="镜像 (Image)"
        name="image"
        rules={[{ required: true, message: '请输入镜像名称' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="命名空间 (Namespace JSON)"
        name="namespace"
        rules={[{ required: true, message: '请输入命名空间 JSON' }]}
      >
        <TextArea rows={3} placeholder='例如: { "name": "default","cluster": "lab" }' />
      </Form.Item>
      <Form.Item
        label="最小 CPU 核数"
        name="minCpuCores"
        rules={[{ required: true, message: '请输入最小 CPU 核数' }]}
      >
        <InputNumber style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item
        label="最小内存 (GB)"
        name="minMemorySpace"
        rules={[{ required: true, message: '请输入最小内存' }]}
      >
        <InputNumber style={{ width: '100%' }} />
      </Form.Item>
    </>
  );
};

export default K8STaskEditor;
