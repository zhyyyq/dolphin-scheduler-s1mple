import React from 'react';
import { Form, Input } from 'antd';

const { TextArea } = Input;

const ProcedureTaskEditor: React.FC = () => {
  return (
    <>
      <Form.Item
        label="数据源名称 (Datasource Name)"
        name="datasource_name"
        rules={[{ required: true, message: '请输入数据源名称' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="方法 (Method)"
        name="method"
        rules={[{ required: true, message: '请输入方法' }]}
      >
        <TextArea rows={4} />
      </Form.Item>
    </>
  );
};

export default ProcedureTaskEditor;
