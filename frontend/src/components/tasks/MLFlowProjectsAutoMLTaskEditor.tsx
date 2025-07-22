import React from 'react';
import { Form, Input } from 'antd';

const MLFlowProjectsAutoMLTaskEditor: React.FC = () => {
  return (
    <>
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
      <Form.Item
        label="模型名称 (Model Name)"
        name="model_name"
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="AutoML 工具"
        name="automl_tool"
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="数据路径 (Data Path)"
        name="data_path"
      >
        <Input />
      </Form.Item>
    </>
  );
};

export default MLFlowProjectsAutoMLTaskEditor;
