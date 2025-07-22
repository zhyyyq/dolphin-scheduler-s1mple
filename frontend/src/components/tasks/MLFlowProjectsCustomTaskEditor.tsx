import React from 'react';
import { Form, Input } from 'antd';

const MLFlowProjectsCustomTaskEditor: React.FC = () => {
  return (
    <>
      <Form.Item
        label="仓库地址 (Repository)"
        name="repository"
        rules={[{ required: true, message: '请输入仓库地址' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="MLflow Tracking URI"
        name="mlflow_tracking_uri"
        rules={[{ required: true, message: '请输入 MLflow Tracking URI' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="参数 (Parameters)"
        name="parameters"
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="实验名称 (Experiment Name)"
        name="experiment_name"
      >
        <Input />
      </Form.Item>
    </>
  );
};

export default MLFlowProjectsCustomTaskEditor;
