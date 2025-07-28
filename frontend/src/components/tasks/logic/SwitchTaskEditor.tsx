import React from 'react';
import { ForkOutlined } from '@ant-design/icons';
import { Task } from '../../../types';
import { Graph } from '@antv/x6';
import { Alert } from 'antd';

interface SwitchTaskEditorProps {
  initialValues: Task;
}

interface SwitchTaskEditorComponent extends React.FC<SwitchTaskEditorProps> {
  taskInfo: any;
}

const SwitchTaskEditor: SwitchTaskEditorComponent = ({ initialValues }) => {
  return (
    <Alert
      message="分支逻辑配置"
      description="请通过在画布上连接 Switch 节点到其他节点来创建分支，然后双击连线来编辑分支的 Case 条件。条件为空的连线将作为 Default 分支。"
      type="info"
      showIcon
    />
  );
};

SwitchTaskEditor.taskInfo = {
  label: '开关',
  type: 'SWITCH',
  command: '',
  category: 'logic',
  icon: ForkOutlined,
  editor: SwitchTaskEditor,
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

export default SwitchTaskEditor;
