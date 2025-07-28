import React from 'react';
import { Form, Input } from 'antd';
import { Graph } from '@antv/x6';
import { Task } from '../../types';
import { NodeIndexOutlined } from '@ant-design/icons';

interface SubWorkflowTaskEditorProps {
  form: any;
  initialValues: any;
}

interface SubWorkflowTaskEditorComponent extends React.FC<SubWorkflowTaskEditorProps> {
  taskInfo: any;
}

const SubWorkflowTaskEditor: SubWorkflowTaskEditorComponent = () => {
  return (
    <Form.Item
      label="工作流文件"
      name="workflow_name"
      rules={[{ required: true, message: '请输入子工作流的 YAML 文件路径' }]}
    >
      <Input placeholder='例如: $WORKFLOW{"demo/example_sub_workflow.yaml"}' />
    </Form.Item>
  );
};

SubWorkflowTaskEditor.taskInfo = {
  label: '子工作流',
  type: 'SUB_WORKFLOW',
  command: '',
  category: 'logic',
  icon: NodeIndexOutlined,
  editor: SubWorkflowTaskEditor,
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
      failRetryTimes: 0,
      failRetryInterval: 1,
      task_params: {
        workflow_name: '',
      },
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

export default SubWorkflowTaskEditor;
