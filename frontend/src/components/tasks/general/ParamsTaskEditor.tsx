import React, { useEffect, useState } from 'react';
import { Form, Input, Select, Typography } from 'antd';
import { Graph } from '@antv/x6';
import { Task } from '../../../types';
import { ProfileOutlined } from '@ant-design/icons';

const { Title } = Typography;
const { Option } = Select;

interface ParamsTaskEditorProps {
  form: any;
  graph: Graph;
  initialValues: Task;
}

interface ParamsTaskEditorComponent extends React.FC<ParamsTaskEditorProps> {
  taskInfo: any;
}

const ParamsTaskEditor: ParamsTaskEditorComponent = ({ form, graph, initialValues }) => {
  const [direction, setDirection] = useState(initialValues.task_params?.direction || 'OUT');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (graph && initialValues) {
      const edges = graph.getConnectedEdges(initialValues.name);
      setIsConnected(edges && edges.length > 0);
    }
  }, [graph, initialValues]);

  useEffect(() => {
    const currentDirection = form.getFieldValue('direction');
    if (currentDirection) {
      setDirection(currentDirection);
    }
  }, [form]);

  const handleDirectionChange = (value: string) => {
    setDirection(value);
    form.setFieldsValue({ direction: value });
  };

  return (
    <>
      <Title level={5}>{direction === 'IN' ? '定义输入参数' : '定义输出参数'}</Title>
      <Form.Item
        label="方向"
        name="direction"
        initialValue={direction}
      >
        <Select onChange={handleDirectionChange} disabled={isConnected}>
          <Option value="IN">IN</Option>
          <Option value="OUT">OUT</Option>
        </Select>
      </Form.Item>
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

ParamsTaskEditor.taskInfo = {
  label: '参数',
  type: 'PARAMS',
  command: '',
  category: 'general',
  icon: ProfileOutlined,
  editor: ParamsTaskEditor,
  createNode: (graph: Graph, task: any, contextMenu: { px: number, py: number }) => {
    const existingNodes = graph.getNodes();
    let newNodeName = task.label;
    let counter = 1;
    while (existingNodes.some(n => n.getData().label === newNodeName)) {
      newNodeName = `${task.label}_${counter}`;
      counter++;
    }

    const nodeData: Task = {
      name: newNodeName,
      label: newNodeName,
      type: 'PARAMS',
      task_type: 'PARAMS',
      command: '', // Add empty command to satisfy Task type
      task_params: {
        prop: newNodeName,
        type: 'VARCHAR',
        direction: 'IN',
        value: '',
      },
      _display_type: 'PARAMS',
    };

    return graph.addNode({
      shape: 'task-node',
      x: contextMenu.px,
      y: contextMenu.py,
      data: nodeData,
    });
  },
};

export default ParamsTaskEditor;
