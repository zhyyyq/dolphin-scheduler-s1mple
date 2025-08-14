import React from 'react';
import { Form, Select, SelectProps, Input } from 'antd';
import { Graph } from '@antv/x6';
import { Task } from '@/types';
import { CodeOutlined } from '@ant-design/icons';
import { AlertEnum } from '@/utils/alertUtils';

const options: SelectProps['options'] = [
  {
    label: "短信",
    value: AlertEnum.sms
  },
  // {
  //   label: 'OA',
  //   value: AlertEnum.oa
  // },
  // {
  //   label: '企业微信',
  //   value: AlertEnum.wechat
  // }
];


interface AlertTaskEditorProps {
  isCustom?: boolean;
}

interface AlertTaskEditorComponent extends React.FC<AlertTaskEditorProps> {
  taskInfo: any;
}

const AlertTaskEditor: AlertTaskEditorComponent = ({ isCustom = false }) => {
  return (
    <>
      <Form.Item
        label="告警渠道配置"
        name="channels"
        rules={[{ required: true, message: '请选择告警渠道' }]}
      >
        <Select
          style={{ width: '100%' }}
          placeholder="请选择告警渠道"
          options={options}
        />
      </Form.Item>
      <Form.Item
        label="手机号配置"
        name="mobiles"
        help="支持配置多个，换行输入"
        rules={[{ required: true, message: '请配置手机号' }]}
      >
        <Input.TextArea
          style={{ width: '100%' }}
          placeholder="请配置手机号"
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

AlertTaskEditor.taskInfo = {
  label: 'alert',
  type: 'ALERT',
  default_params: {
    failRetryTimes: 0,
    failRetryInterval: 1,
    channels: 'sms',
    mobiles: '',
    msg: ''
  },
  category: 'general',
  icon: CodeOutlined,
  editor: AlertTaskEditor,
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

export default AlertTaskEditor;
