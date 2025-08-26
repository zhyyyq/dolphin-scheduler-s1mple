import React from 'react';
import { Form, Input } from 'antd';
import { Graph } from '@antv/x6';
import { Task } from '@/types';
import { CodeOutlined } from '@ant-design/icons';

interface AlertOaTaskEditorProps {
  isCustom?: boolean;
}

interface AlertOaTaskEditorComponent extends React.FC<AlertOaTaskEditorProps> {
  taskInfo: any;
}

const AlertOaTaskEditor: AlertOaTaskEditorComponent = ({ isCustom = false }) => {
  return (
    <>
      <Form.Item
        label="柜员号配置"
        name="userIds"
        help="支持配置多个，换行输入"
        rules={[{ required: true, message: '请配置柜员号' }]}
      >
        <Input.TextArea
          style={{ width: '100%' }}
          placeholder="请配置柜员号"
        />
      </Form.Item>
      <Form.Item
        label="自定义消息"
        name="msg"
        rules={[{ required: false }]}
      >
        <Input.TextArea
          style={{ width: '100%' }}
          placeholder="请配置自定义消息"
        />
      </Form.Item>
    </>

  );
};

AlertOaTaskEditor.taskInfo = {
  label: 'OA',
  type: 'ALERT_OA',
  default_params: {
    failRetryTimes: 0,
    failRetryInterval: 1,
    userIds: '',
    msg: ''
  },
  category: 'alert',
  icon: CodeOutlined,
  editor: AlertOaTaskEditor,
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

export default AlertOaTaskEditor;
