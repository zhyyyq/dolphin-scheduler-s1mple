import React from 'react';
import { Input, Form, Select } from 'antd';
import { Task } from '../../types';

const { TextArea } = Input;
const { Option } = Select;

interface SqlTaskEditorProps {
  task: Task;
  onChange: (new_task: Task) => void;
}

const SqlTaskEditor: React.FC<SqlTaskEditorProps> = ({ task, onChange }) => {
  const handleChange = (changedValues: any) => {
    onChange({ ...task, ...changedValues });
  };

  return (
    <Form
      layout="vertical"
      initialValues={task}
      onValuesChange={handleChange}
    >
      <Form.Item label="数据源名称" name="datasource_name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item label="SQL 类型" name="sql_type">
        <Select placeholder="选择 SQL 类型">
          <Option value="0">查询</Option>
          <Option value="1">非查询</Option>
        </Select>
      </Form.Item>
      <Form.Item label="SQL" name="sql" rules={[{ required: true }]}>
        <TextArea rows={6} placeholder="输入 SQL 语句或 $FILE{...} 引用" />
      </Form.Item>
      <Form.Item label="前置 SQL" name="pre_sql">
        <TextArea rows={2} />
      </Form.Item>
      <Form.Item label="后置 SQL" name="post_sql">
        <TextArea rows={2} />
      </Form.Item>
      <Form.Item label="显示行数" name="display_rows">
        <Input type="number" />
      </Form.Item>
    </Form>
  );
};

export default SqlTaskEditor;
