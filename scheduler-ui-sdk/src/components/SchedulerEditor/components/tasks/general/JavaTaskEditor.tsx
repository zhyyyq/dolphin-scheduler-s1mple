import React from 'react';
import { Form, Input } from 'antd';
import { Graph } from '@antv/x6';
import { Task } from '@/types';
import { CodeOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface JavaTaskEditorProps {
  isCustom?: boolean;
}

interface JavaTaskEditorComponent extends React.FC<JavaTaskEditorProps> {
  taskInfo: any;
}

const JavaTaskEditor: JavaTaskEditorComponent = ({ isCustom = false }) => {
  return (
    <Form.Item
      label="Java Definition"
      name="java_code"
      rules={[{ required: true, message: '请输入 Java 代码' }]}
    >
      <TextArea
        rows={15}
        placeholder="在此输入您的 Java 脚本"
        style={{ fontFamily: 'monospace' }}
        readOnly={isCustom}
      />
    </Form.Item>
  );
};

JavaTaskEditor.taskInfo = {
  label: 'Java',
  type: 'JAVA',
  default_params: {
    failRetryTimes: 0,
    failRetryInterval: 1,
    java_code: `public class Main {

  public static void main(String[] args) {
    System.out.println("test");
  }

}`
  },
  category: 'general',
  icon: CodeOutlined,
  editor: JavaTaskEditor,
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

    return graph.addNode({
      shape: 'task-node',
      x: contextMenu.px,
      y: contextMenu.py,
      data: nodeData as Task,
    });
  },
};

export default JavaTaskEditor;
