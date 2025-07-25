import React, { useState, useEffect } from 'react';
import { Input, Form, Select, Typography } from 'antd';
import { Graph } from '@antv/x6';
import { Task } from '../../../types';
import api from '../../../api';
import { DatabaseOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Title } = Typography;
const { Option } = Select;

interface Datasource {
  label: string;
  value: string; // The name of the datasource
  id: number;    // The ID of the datasource
  type: string;  // The type of the datasource (e.g., POSTGRESQL)
}

interface SqlTaskEditorComponent extends React.FC {
  taskInfo: any;
}

const SqlTaskEditor: SqlTaskEditorComponent = () => {
  const [datasources, setDatasources] = useState<Datasource[]>([]);
  const [loading, setLoading] = useState(true);
  const form = Form.useFormInstance();

  useEffect(() => {
    const fetchDatasources = async () => {
      try {
        setLoading(true);
        const data = await api.get<Datasource[]>('/api/ds/datasources');
        setDatasources(data);

        // After fetching, check if we need to set the initial datasource
        const currentDatasourceId = form.getFieldValue('datasource');
        if (!currentDatasourceId && data.length > 0) {
          // If no datasource is set, default to the first one in the list
          form.setFieldsValue({
            datasource: data[0].id,
            datasourceType: data[0].type,
          });
        } else {
          // If a datasource ID is set but the type is missing, find and set it
          const currentDatasourceType = form.getFieldValue('datasourceType');
          if (currentDatasourceId && !currentDatasourceType) {
            const matchingDs = data.find(ds => ds.id === currentDatasourceId);
            if (matchingDs) {
              form.setFieldsValue({ datasourceType: matchingDs.type });
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch datasources", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDatasources();
  }, [form]);

  const handleDatasourceChange = (value: number, option: any) => {
    // When the datasource changes, we need to update both the 'datasource' (id) and 'datasourceType' fields
    // in the form's underlying data store.
    form.setFieldsValue({
      datasourceType: option.key,  // The type (e.g., POSTGRESQL)
    });
  };

  return (
    <>
      {/* This field is for storing the datasource type, but it's hidden from the user */}
      <Form.Item name="datasourceType" noStyle>
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
      
      <Form.Item label="SQL 类型" name="sqlType" initialValue="0">
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

SqlTaskEditor.taskInfo = {
  label: 'SQL',
  type: 'SQL',
  category: 'general',
  icon: DatabaseOutlined,
  editor: SqlTaskEditor,
  default_params: {
    sqlType: '0',
    sql: 'SELECT * FROM a',
    preStatements: '',
    postStatements: '',
    displayRows: 10,
  },
  createNode: (graph: Graph, task: any, contextMenu: { px: number, py: number }) => {
    const existingNodes = graph.getNodes();
    let newNodeName = task.label;
    let counter = 1;
    while (existingNodes.some(n => n.getData().label === newNodeName)) {
      newNodeName = `${task.label}_${counter}`;
      counter++;
    }

    const nodeData: Partial<Task> = {
      name: newNodeName,
      label: newNodeName,
      task_type: task.type,
      type: task.type,
      task_params: (task as any).default_params || {},
      _display_type: task.type,
    };

    graph.addNode({
      shape: 'task-node',
      x: contextMenu.px,
      y: contextMenu.py,
      data: nodeData as Task,
    });
  },
};

export default SqlTaskEditor;
