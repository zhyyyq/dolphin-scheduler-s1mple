import React from 'react';
import { Form, Input, Select, SelectProps } from 'antd';
import { Graph } from '@antv/x6';
import { Task } from '@/types';
import { CodeOutlined } from '@ant-design/icons';

const options: SelectProps['options'] = [
  {
    label: "短信",
    value: "sms"
  },
  {
    label: 'OA',
    value: 'oa'
  },
  {
    label: '企业微信',
    value: 'companyWechat'
  }
];

const handleChange = (value: string[]) => {
  console.log(`selected ${value}`);
};
interface PythonTaskEditorProps {
  isCustom?: boolean;
}

interface AlertTaskEditorComponent extends React.FC<PythonTaskEditorProps> {
  taskInfo: any;
}

const AlertTaskEditor:AlertTaskEditorComponent = ({ isCustom = false }) => {
  return (
    <Form.Item
      label="告警渠道配置"
      name="channel"
      rules={[{ required: true, message: '请选择告警渠道' }]}
    >
       <Select
          mode="multiple"
          allowClear
          style={{ width: '100%' }}
          placeholder="请选择告警渠道"
          defaultValue={['sms']}
          onChange={handleChange}
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
