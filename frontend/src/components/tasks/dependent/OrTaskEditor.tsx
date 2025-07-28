import React from 'react';
import { Form, FormInstance } from 'antd';
import { GatewayOutlined } from '@ant-design/icons';
import { Graph } from '@antv/x6';
import { Task } from '../../../types';

interface OrTaskEditorProps {
  form: FormInstance<any>;
  initialValues: any;
}

interface OrTaskEditorComponent extends React.FC<OrTaskEditorProps> {
  taskInfo: any;
}

const OrTaskEditor: OrTaskEditorComponent = () => {
  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <p>这是一个“或”逻辑门。</p>
      <p>请将多个上游节点的输出连接到此节点的输入，任意一个上游节点成功后，此节点就会成功。</p>
    </div>
  );
};

OrTaskEditor.taskInfo = {
  label: '或 (OR)',
  type: 'OR',
  category: 'logic',
  icon: GatewayOutlined,
  editor: OrTaskEditor,
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
      task_params: {},
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

export default OrTaskEditor;
