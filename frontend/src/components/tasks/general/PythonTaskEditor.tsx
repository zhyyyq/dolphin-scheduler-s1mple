import React from 'react';
import { Form, Input } from 'antd';
import { Graph } from '@antv/x6';
import { Task } from '../../../types';
import { CodeOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface PythonTaskEditorComponent extends React.FC {
  taskInfo: any;
}

const PythonTaskEditor: PythonTaskEditorComponent = () => {
  return (
    <Form.Item
      label="Python Definition"
      name="definition"
      rules={[{ required: true, message: '请输入 Python 代码' }]}
    >
      <TextArea
        rows={15}
        placeholder="在此输入您的 Python 脚本"
        style={{ fontFamily: 'monospace' }}
      />
    </Form.Item>
  );
};

PythonTaskEditor.taskInfo = {
  label: 'Python',
  type: 'PYTHON',
  command: 'print("Hello")',
  category: 'general',
  icon: CodeOutlined,
  editor: PythonTaskEditor,
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

export default PythonTaskEditor;
