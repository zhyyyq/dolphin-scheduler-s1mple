import React from 'react';
import { Form, Input, Select, Button, Space } from 'antd';
import { MinusCircleOutlined, PlusOutlined, ForkOutlined } from '@ant-design/icons';
import { Task } from '../../../types';
import { Graph } from '@antv/x6';

const { Option } = Select;

interface SwitchTaskEditorProps {
  initialValues: Task;
  allTasks: Task[]; // Expect a list of all tasks in the workflow
}

interface SwitchTaskEditorComponent extends React.FC<SwitchTaskEditorProps> {
  taskInfo: any;
}

const SwitchTaskEditor: SwitchTaskEditorComponent = ({ initialValues, allTasks }) => {
  // Filter out the current switch task itself from the list of possible next nodes
  const availableNodes = allTasks.filter((task: Task) => task.name !== initialValues.name);

  return (
    <Form.List name="dependTaskList">
      {(fields, { add, remove }) => (
        <>
          {fields.map(({ key, name, ...restField }) => (
            <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
              <Form.Item
                {...restField}
                name={[name, 'condition']}
                rules={[{ required: true, message: '请输入条件' }]}
                style={{ width: '300px' }}
              >
                <Input placeholder="Condition (e.g., ${status} == 'done')" />
              </Form.Item>
              <Form.Item
                {...restField}
                name={[name, 'nextNode']}
                rules={[{ required: true, message: '请选择下一个节点' }]}
              >
                <Select placeholder="选择下一个节点" style={{ width: '200px' }}>
                  {availableNodes.map((task: Task) => (
                    <Option key={task.name} value={task.name}>
                      {task.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <MinusCircleOutlined onClick={() => remove(name)} />
            </Space>
          ))}
          <Form.Item>
            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
              添加分支条件
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
