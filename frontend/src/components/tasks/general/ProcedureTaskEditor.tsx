import React, { useState, useEffect } from 'react';
import { Input, Form, Select } from 'antd';
import { Graph } from '@antv/x6';
import { Task } from '../../../types';
import api from '../../../api';
import { SettingOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Option } = Select;

interface Datasource {
  label: string;
  value: string;
  id: number;
  type: string;
}

interface ProcedureTaskEditorComponent extends React.FC {
  taskInfo: any;
}

const ProcedureTaskEditor: ProcedureTaskEditorComponent = () => {
  const [datasources, setDatasources] = useState<Datasource[]>([]);
  const [loading, setLoading] = useState(true);
  const form = Form.useFormInstance();

  useEffect(() => {
    const fetchDatasources = async () => {
      try {
        setLoading(true);
        const data = await api.get<Datasource[]>('/api/ds/datasources');
        setDatasources(data);

        const currentDatasourceId = form.getFieldValue('datasource');
        if (!currentDatasourceId && data.length > 0) {
          form.setFieldsValue({
            datasource: data[0].id,
            datasourceType: data[0].type,
          });
        } else {
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
    form.setFieldsValue({
      datasourceType: option.key,
    });
  };

  return (
    <>
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
      
      <Form.Item label="SQL Statement" name="method" rules={[{ required: true, message: "请输入 SQL 语句" }]}>
        <TextArea rows={6} placeholder="call procedure_name(${param1}, ${param2})" />
      </Form.Item>
    </>
  );
};

ProcedureTaskEditor.taskInfo = {
  label: '存储过程',
  type: 'PROCEDURE',
  command: '',
  category: 'general',
  icon: SettingOutlined,
  editor: ProcedureTaskEditor,
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
      task_params: JSON.parse(JSON.stringify((task as any).default_params || {})),
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

export default ProcedureTaskEditor;
