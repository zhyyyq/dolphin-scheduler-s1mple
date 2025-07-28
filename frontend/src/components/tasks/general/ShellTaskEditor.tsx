import React from 'react';
import { Input, Form } from 'antd';
import { Graph } from '@antv/x6';
import { Task } from '../../../types';
import { CodeOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface ShellTaskEditorComponent extends React.FC {
  taskInfo: any;
}

const ShellTaskEditor: ShellTaskEditorComponent = () => {
  return (
    <>
      <Form.Item
        label="脚本"
        name="command"
        rules={[{ required: true, message: '请输入脚本内容' }]}
      >
        <TextArea rows={10} placeholder="请输入脚本内容" />
      </Form.Item>
    </>
  );
};

ShellTaskEditor.taskInfo = {
  label: 'Shell',
  type: 'SHELL',
  command: 'echo "Hello"',
  category: 'general',
  icon: CodeOutlined,
  editor: ShellTaskEditor,
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
      command: task.command,
    };

    graph.addNode({
      shape: 'task-node',
      x: contextMenu.px,
      y: contextMenu.py,
      data: nodeData as Task,
    });
  },
};

export default ShellTaskEditor;
