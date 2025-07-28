import React from 'react';
import { Form, Input, Button, Space } from 'antd';
import { MinusCircleOutlined, PlusOutlined, ForkOutlined } from '@ant-design/icons';
import { Task } from '../../../types';
import { Graph } from '@antv/x6';

interface SwitchTaskEditorProps {
  initialValues: Task;
  allTasks: Task[]; // Expect a list of all tasks in the workflow
}

interface SwitchTaskEditorComponent extends React.FC<SwitchTaskEditorProps> {
  taskInfo: any;
}

const SwitchTaskEditor: SwitchTaskEditorComponent = ({ initialValues, allTasks }) => {
  return (
    <Form.List name="switch_conditions">
      {(fields, { add, remove }) => (
        <>
          {fields.map(({ key, name, ...restField }) => (
            <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
              <Form.Item
                {...restField}
                name={[name, 'condition']}
                rules={[{ required: true, message: '请输入条件' }]}
                style={{ width: '450px' }}
              >
                <Input placeholder="Condition (e.g., ${status} == 'done')" />
              </Form.Item>
              <Form.Item
                {...restField}
                name={[name, 'target_node']}
                style={{ display: 'none' }}
              >
                <Input />
              </Form.Item>
              <MinusCircleOutlined onClick={() => remove(name)} />
            </Space>
          ))}
          <Form.Item>
            <Button type="dashed" onClick={() => add({ condition: '', target_node: '' })} block icon={<PlusOutlined />}>
              添加Case
            </Button>
          </Form.Item>
        </>
      )}
    </Form.List>
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
