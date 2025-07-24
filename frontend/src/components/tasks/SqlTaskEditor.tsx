import React, { useState, useEffect } from 'react';
import { Input, Form, Select } from 'antd';
import api from '../../api';

const { TextArea } = Input;
const { Option } = Select;

interface Datasource {
  label: string;
  value: string; // The name of the datasource
  id: number;    // The ID of the datasource
  type: string;  // The type of the datasource (e.g., POSTGRESQL)
}

const SqlTaskEditor: React.FC = () => {
  const [datasources, setDatasources] = useState<Datasource[]>([]);
  const [loading, setLoading] = useState(true);
  const form = Form.useFormInstance();

  useEffect(() => {
    const fetchDatasources = async () => {
      try {
        setLoading(true);
        const data = await api.get<Datasource[]>('/api/ds/datasources');
        setDatasources(data);
      } catch (error) {
        console.error("Failed to fetch datasources", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDatasources();
  }, []);

  const handleDatasourceChange = (value: number, option: any) => {
    // When the datasource changes, we need to update both the 'datasource' (id) and 'type' fields
    // in the form's underlying data store.
    form.setFieldsValue({
      datasource: value, // The ID
      type: option.key,  // The type (e.g., POSTGRESQL)
    });
  };

  return (
    <>
      {/* This field is for storing the datasource type, but it's hidden from the user */}
      <Form.Item name="type" noStyle>
        <Input type="hidden" />
      </Form.Item>

      <Form.Item label="数据源名称" name="datasource" rules={[{ required: true, message: "请选择一个数据源" }]}>
        <Select
          showSearch
          placeholder="选择或搜索数据源"
          loading={loading}
          optionFilterProp="label"
          onChange={handleDatasourceChange}
        >
          {datasources.map(ds => (
            <Option key={ds.type} value={ds.id} label={ds.label}>
              {ds.label} ({ds.type})
            </Option>
          ))}
        </Select>
      </Form.Item>
      
      <Form.Item label="SQL 类型" name="sqlType" initialValue="1">
        <Select placeholder="选择 SQL 类型">
          <Option value="0">查询</Option>
          <Option value="1">非查询</Option>
        </Select>
      </Form.Item>
      
      <Form.Item label="SQL" name="sql" rules={[{ required: true, message: "请输入 SQL 语句" }]}>
        <TextArea rows={6} placeholder="输入 SQL 语句或 $FILE{...} 引用" />
      </Form.Item>
      
      {/* Note: The name is now 'preStatements' and we will handle converting it to an array later */}
      <Form.Item label="前置 SQL" name="preStatements">
        <TextArea rows={2} placeholder="多条SQL用分号分隔"/>
      </Form.Item>
      
      {/* Note: The name is now 'postStatements' and we will handle converting it to an array later */}
      <Form.Item label="后置 SQL" name="postStatements">
        <TextArea rows={2} placeholder="多条SQL用分号分隔"/>
      </Form.Item>
      
      <Form.Item label="显示行数" name="displayRows" initialValue={10}>
        <Input type="number" />
      </Form.Item>
    </>
  );
};

export default SqlTaskEditor;
