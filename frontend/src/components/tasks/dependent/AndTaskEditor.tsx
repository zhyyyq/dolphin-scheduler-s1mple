import React from 'react';
import { Form, FormInstance } from 'antd';
import { GatewayOutlined } from '@ant-design/icons';
import { Graph } from '@antv/x6';
import { Task } from '../../../types';

interface AndTaskEditorProps {
  form: FormInstance<any>;
  initialValues: any;
}

interface AndTaskEditorComponent extends React.FC<AndTaskEditorProps> {
  taskInfo: any;
}

const AndTaskEditor: AndTaskEditorComponent = () => {
  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <p>这是一个“与”逻辑门。</p>
      <p>请将多个上游节点的输出连接到此节点的输入，所有上游节点成功后，此节点才会成功。</p>
    </div>
  );
};

AndTaskEditor.taskInfo = {
  label: '与 (AND)',
  type: 'AND',
  category: 'logic',
  icon: GatewayOutlined,
  editor: AndTaskEditor,
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

export default AndTaskEditor;
