import React from 'react';
import { Form, Input, Select } from 'antd';

const { Option } = Select;

const SparkTaskEditor: React.FC = () => {
  return (
    <>
      <Form.Item
        label="主类 (Main Class)"
        name="main_class"
        rules={[{ required: true, message: '请输入主类' }]}
      >
        <Input placeholder="例如: org.apache.spark.examples.SparkPi" />
      </Form.Item>

      <Form.Item
        label="主程序包 (Main Package)"
        name="main_package"
        rules={[{ required: true, message: '请输入主程序包' }]}
      >
        <Input placeholder="例如: test_java.jar" />
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
        label="部署模式 (Deploy Mode)"
        name="deploy_mode"
        rules={[{ required: true, message: '请选择部署模式' }]}
      >
        <Select>
          <Option value="local">local</Option>
          <Option value="cluster">cluster</Option>
          <Option value="client">client</Option>
        </Select>
      </Form.Item>
    </>
  );
};

export default SparkTaskEditor;
