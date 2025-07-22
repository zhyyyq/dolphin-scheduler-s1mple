import React from 'react';
import { Form, Input, Select } from 'antd';

const { Option } = Select;

const MapReduceTaskEditor: React.FC = () => {
  return (
    <>
      <Form.Item
        label="主类 (Main Class)"
        name="main_class"
        rules={[{ required: true, message: '请输入主类' }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        label="主程序包 (Main Package)"
        name="main_package"
        rules={[{ required: true, message: '请输入主程序包' }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        label="程序类型 (Program Type)"
        name="program_type"
        rules={[{ required: true, message: '请选择程序类型' }]}
      >
        <Select>
          <Option value="JAVA">Java</Option>
          <Option value="SCALA">Scala</Option>
          <Option value="PYTHON">Python</Option>
        </Select>
      </Form.Item>

      <Form.Item
        label="主程序参数 (Main Args)"
        name="main_args"
      >
        <Input />
      </Form.Item>
    </>
  );
};

export default MapReduceTaskEditor;
