import React, { useState, useEffect } from 'react';
import { Input } from 'antd';
import { Node } from '@antv/x6';

interface SubProcessTaskEditorProps {
  currentNode: Node;
}

export const SubProcessTaskEditor: React.FC<SubProcessTaskEditorProps> = ({ currentNode }) => {
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
