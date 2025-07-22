import React from 'react';
import { Form, Input, Select } from 'antd';

const { TextArea } = Input;
const { Option } = Select;

const OpenMLDBTaskEditor: React.FC = () => {
  return (
    <>
      <Form.Item
        label="Zookeeper 地址"
        name="zookeeper"
        rules={[{ required: true, message: '请输入 Zookeeper 地址' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="Zookeeper 路径"
        name="zookeeper_path"
        rules={[{ required: true, message: '请输入 Zookeeper 路径' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="执行模式 (Execute Mode)"
        name="execute_mode"
        rules={[{ required: true, message: '请选择执行模式' }]}
      >
        <Select>
          <Option value="online">online</Option>
          <Option value="offline">offline</Option>
        </Select>
      </Form.Item>
      <Form.Item
        label="SQL"
        name="sql"
        rules={[{ required: true, message: '请输入 SQL' }]}
      >
        <TextArea rows={8} />
      </Form.Item>
    </>
  );
};

export default OpenMLDBTaskEditor;
