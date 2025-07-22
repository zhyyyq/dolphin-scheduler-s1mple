import React from 'react';
import { Form, Input, Select, InputNumber } from 'antd';

const { Option } = Select;

const MLflowModelsTaskEditor: React.FC = () => {
  return (
    <>
      <Form.Item
        label="模型 URI (Model URI)"
        name="model_uri"
        rules={[{ required: true, message: '请输入模型 URI' }]}
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
        label="部署模式 (Deploy Mode)"
        name="deploy_mode"
      >
        <Select>
          <Option value="DOCKER">Docker</Option>
          <Option value="MLFLOW">MLflow</Option>
        </Select>
      </Form.Item>
      <Form.Item
        label="端口 (Port)"
        name="port"
      >
        <InputNumber style={{ width: '100%' }} />
      </Form.Item>
    </>
  );
};

export default MLflowModelsTaskEditor;
