import React from 'react';
import { Form, FormInstance, Radio, InputNumber } from 'antd';
import { NodeIndexOutlined } from '@ant-design/icons';
import { Graph } from '@antv/x6';
import { Task } from '../../../types';

interface LogicGateTaskEditorProps {
  form: FormInstance<any>;
  initialValues: any;
}

interface LogicGateTaskEditorComponent extends React.FC<LogicGateTaskEditorProps> {
  taskInfo: any;
}

const LogicGateTaskEditor: LogicGateTaskEditorComponent = ({ form }) => {
  const failureStrategy = Form.useWatch(['task_params', 'failure_strategy'], form);

  return (
    <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 16 }}>
      <Form.Item
        label="检查间隔"
        name={['task_params', 'check_interval']}
        initialValue={10}
      >
        <InputNumber min={1} addonAfter="秒" style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item
        label="依赖失败策略"
        name={['task_params', 'failure_strategy']}
        initialValue="wait"
      >
        <Radio.Group>
          <Radio value="fail">失败</Radio>
          <Radio value="wait">等待</Radio>
        </Radio.Group>
      </Form.Item>

      {failureStrategy === 'wait' && (
        <Form.Item
          label="依赖失败等待时间"
          name={['task_params', 'failure_waiting_time']}
          initialValue={30}
          rules={[{ required: true, message: '请输入等待时间' }]}
        >
          <InputNumber min={1} addonAfter="分" style={{ width: '100%' }} />
        </Form.Item>
      )}
    </div>
  );
};

const createLogicGateNode = (graph: Graph, task: any, contextMenu: { px: number, py: number }) => {
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
    failRetryTimes: 0,
    failRetryInterval: 1,
    task_params: {
      check_interval: 10,
      failure_strategy: 'wait',
      failure_waiting_time: 30,
    },
    _display_type: task.type,
  };

  graph.addNode({
    shape: 'task-node',
    x: contextMenu.px,
    y: contextMenu.py,
    data: nodeData as Task,
  });
};

LogicGateTaskEditor.taskInfo = {
  AND: {
    label: '与 (AND)',
    type: 'AND',
    category: 'logic',
    icon: NodeIndexOutlined,
    editor: LogicGateTaskEditor,
    createNode: createLogicGateNode,
  },
  OR: {
    label: '或 (OR)',
    type: 'OR',
    category: 'logic',
    icon: NodeIndexOutlined,
    editor: LogicGateTaskEditor,
    createNode: createLogicGateNode,
  }
};

export default LogicGateTaskEditor;
