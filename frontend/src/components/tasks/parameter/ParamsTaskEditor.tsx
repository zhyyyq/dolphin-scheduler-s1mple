import React from 'react';
import { Form, Input, Select, Typography } from 'antd';

const { Title } = Typography;
const { Option } = Select;

const ParamsTaskEditor: React.FC = () => {
  return (
    <>
      <Title level={5}>定义输出参数</Title>
      <Form.Item
        label="参数名"
        name="prop"
        rules={[{ required: true, message: '请输入参数名' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="类型"
        name="type"
        initialValue="VARCHAR"
      >
        <Select>
          <Option value="VARCHAR">VARCHAR</Option>
          <Option value="INTEGER">INTEGER</Option>
          <Option value="LONG">LONG</Option>
          <Option value="FLOAT">FLOAT</Option>
          <Option value="DOUBLE">DOUBLE</Option>
          <Option value="DATE">DATE</Option>
          <Option value="TIMESTAMP">TIMESTAMP</Option>
          <Option value="BOOLEAN">BOOLEAN</Option>
        </Select>
      </Form.Item>
      <Form.Item
        label="参数值"
        name="value"
      >
        <Input />
      </Form.Item>
    </>
  );
};

export default ParamsTaskEditor;
