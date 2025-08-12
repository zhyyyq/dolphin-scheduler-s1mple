import React from 'react';
import { Form, Select, SelectProps } from 'antd';
import { Graph } from '@antv/x6';
import { Task } from '@/types';
import { CodeOutlined } from '@ant-design/icons';
import { AlertEnum } from '@/utils/alertUtils';

const options: SelectProps['options'] = [
  {
    label: "短信",
    value: AlertEnum.sms
  },
  {
    label: 'OA',
    value: AlertEnum.oa
  },
  {
    label: '企业微信',
    value: AlertEnum.companyWechat
  }
];


interface AlertTaskEditorProps {
  isCustom?: boolean;
}

interface AlertTaskEditorComponent extends React.FC<AlertTaskEditorProps> {
  taskInfo: any;
}

const AlertTaskEditor:AlertTaskEditorComponent = ({ isCustom = false }) => {
  return (
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
  );
};

AlertTaskEditor.taskInfo = {
  label: 'alert',
  type: 'ALERT',
  default_params: {
    failRetryTimes: 0,
    failRetryInterval: 1,
    channels: 'sms'
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
