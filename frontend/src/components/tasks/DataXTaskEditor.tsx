import React from 'react';
import { Form, Input } from 'antd';

const { TextArea } = Input;

const DataXTaskEditor: React.FC = () => {
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
        label="目标数据源名称 (Data Target Name)"
        name="datatarget_name"
        rules={[{ required: true, message: '请输入目标数据源名称' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="SQL"
        name="sql"
        rules={[{ required: true, message: '请输入 SQL' }]}
      >
        <TextArea rows={6} />
      </Form.Item>
      <Form.Item
        label="目标表 (Target Table)"
        name="target_table"
        rules={[{ required: true, message: '请输入目标表' }]}
      >
        <Input />
      </Form.Item>
    </>
  );
};

export default DataXTaskEditor;
