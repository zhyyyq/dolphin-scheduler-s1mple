import React, { useState, useEffect } from 'react';
import { Input } from 'antd';
import { Node, Graph } from '@antv/x6';
import { Task } from '../../../types';
import { PartitionOutlined } from '@ant-design/icons';

interface SubProcessTaskEditorProps {
  currentNode: Node;
}

interface SubProcessTaskEditorComponent extends React.FC<SubProcessTaskEditorProps> {
  taskInfo: any;
}

const SubProcessTaskEditor: SubProcessTaskEditorComponent = ({ currentNode }) => {
  const [workflowName, setWorkflowName] = useState(currentNode.getData()?.workflow_name || '');

  useEffect(() => {
    setWorkflowName(currentNode.getData()?.workflow_name || '');
  }, [currentNode]);

  const handleWorkflowNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setWorkflowName(newName);
    currentNode.setData({ ...currentNode.getData(), workflow_name: newName });
  };

  return (
    <>
      <p>工作流名称:</p>
      <Input
        value={workflowName}
        onChange={handleWorkflowNameChange}
      />
    </>
  );
};

SubProcessTaskEditor.taskInfo = {
  label: '子流程',
  type: 'SUB_PROCESS',
  command: '',
  category: 'logic',
  icon: PartitionOutlined,
  editor: SubProcessTaskEditor,
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

export default SubProcessTaskEditor;
