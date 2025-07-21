import React from 'react';
import { Input } from 'antd';

interface SubProcessTaskEditorProps {
  currentNode: any;
}

export const SubProcessTaskEditor: React.FC<SubProcessTaskEditorProps> = ({ currentNode }) => {
  const data = currentNode.getData();

  return (
    <>
      <p>工作流名称:</p>
      <Input value={data.workflow_name} onChange={e => currentNode.setData({ ...data, workflow_name: e.target.value })} />
    </>
  );
};
