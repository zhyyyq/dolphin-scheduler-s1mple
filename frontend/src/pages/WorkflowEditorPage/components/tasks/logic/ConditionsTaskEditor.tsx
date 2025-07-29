import React from 'react';
import { Form, Input } from 'antd';
import yaml from 'js-yaml';
import { Graph } from '@antv/x6';
import { Task } from '../../../types';
import { ApartmentOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface ConditionsTaskEditorComponent extends React.FC {
  taskInfo: any;
}

const ConditionsTaskEditor: ConditionsTaskEditorComponent = () => {
  return (
    <Form.Item
      label="条件逻辑 (YAML)"
      name={['task_params', 'conditions_yaml']}
      rules={[
        { required: true, message: '请输入条件逻辑' },
        {
          validator: async (_, value) => {
            if (!value) return;
            try {
              yaml.load(value);
            } catch (e) {
              throw new Error('YAML 格式无效');
            }
          },
        },
      ]}
    >
      <TextArea rows={10} placeholder={'op: AND\ngroups:\n  - op: OR\n    conditions:\n      - "1 == 1"\n      - "2 > 1"'} />
    </Form.Item>
  );
};

ConditionsTaskEditor.taskInfo = {
  label: '条件',
  type: 'CONDITIONS',
  command: '',
  category: 'logic',
  icon: ApartmentOutlined,
  editor: ConditionsTaskEditor,
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
      task_params: {
        ...((task as any).default_params || {}),
        dependence: {
          relation: 'AND',
          dependTaskList: [
            {
              relation: 'AND',
              dependTaskList: [],
              conditionResult: {
                successNode: [],
                failedNode: []
              }
            }
          ]
        }
      },
      _display_type: task.type,
    };

    return graph.addNode({
      shape: 'task-node',
      x: contextMenu.px,
      y: contextMenu.py,
      data: nodeData as Task,
      ports: {
        groups: {
          top: {
            position: 'top',
            attrs: {
              circle: { r: 4, magnet: true, stroke: '#5F95FF', strokeWidth: 1, fill: '#fff' },
              text: { fill: '#666', fontSize: 12, y: -15 }, // Adjust y for offset
            },
            label: {
              position: {
                name: 'outside',
                args: { y: -6, x: 18 },
              },
            },
          },
          bottom: {
            position: 'bottom',
            attrs: {
              circle: { r: 4, magnet: true, stroke: '#5F95FF', strokeWidth: 1, fill: '#fff' },
              text: { fontSize: 12 },
            },
            label: {
              position: {
                name: 'outside',
                args: { y: 6, x: 18 },
              },
            },
          },
        },
        items: [
          { group: 'top', id: 'in', attrs: { text: { text: 'in' } } },
          {
            group: 'bottom',
            id: 'out-success',
            args: { x: '25%' },
            attrs: {
              circle: { fill: '#52c41a' },
              text: { text: 'Success', fill: '#52c41a' },
            },
          },
          {
            group: 'bottom',
            id: 'out-failure',
            args: { x: '75%' },
            attrs: {
              circle: { fill: '#ff4d4f' },
              text: { text: 'Failure', fill: '#ff4d4f' },
            },
          },
        ],
      },
    });
  },
};

export default ConditionsTaskEditor;
