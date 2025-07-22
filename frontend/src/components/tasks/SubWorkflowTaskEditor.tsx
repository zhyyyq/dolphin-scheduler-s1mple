import React from 'react';
import { Form, Input } from 'antd';

const SubWorkflowTaskEditor: React.FC = () => {
  return (
    <Form.Item
      label="工作流文件"
      name="workflow_name"
      rules={[{ required: true, message: '请输入子工作流的 YAML 文件路径' }]}
    >
      <Input placeholder='例如: $WORKFLOW{"demo/example_sub_workflow.yaml"}' />
    </Form.Item>
  );
};

export default SubWorkflowTaskEditor;
