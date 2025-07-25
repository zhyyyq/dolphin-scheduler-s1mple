import React from 'react';
import { Form, Input } from 'antd';
import { Graph } from '@antv/x6';
import { Task } from '../../../types';
import { SettingOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface ProcedureTaskEditorComponent extends React.FC {
  taskInfo: any;
}

const ProcedureTaskEditor: ProcedureTaskEditorComponent = () => {
  return (
    <>
      <Form.Item
        label="数据源名称 (Datasource Name)"
        name="datasource_name"
        rules={[{ required: true, message: '请输入数据源名称' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="方法 (Method)"
        name="method"
        rules={[{ required: true, message: '请输入方法' }]}
      >
        <TextArea rows={4} />
      </Form.Item>
    </>
  );
};

ProcedureTaskEditor.taskInfo = {
  label: '存储过程',
  type: 'PROCEDURE',
  command: '',
  category: 'general',
  icon: SettingOutlined,
  editor: ProcedureTaskEditor,
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

export default ProcedureTaskEditor;
