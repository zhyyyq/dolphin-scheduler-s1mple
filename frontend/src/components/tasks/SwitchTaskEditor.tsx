import React from 'react';
import { Input, Button } from 'antd';

interface SwitchTaskEditorProps {
  currentNode: any;
}

export const SwitchTaskEditor: React.FC<SwitchTaskEditorProps> = ({ currentNode }) => {
  const data = currentNode.getData();

  const handleSwitchChange = (index: number, field: 'condition' | 'task', value: string) => {
    const newConditions = [...(data.condition || [])];
    newConditions[index] = { ...newConditions[index], [field]: value };
    currentNode.setData({ ...data, condition: newConditions });
  };

  const addSwitchBranch = () => {
    const newConditions = [...(data.condition || []), { task: '', condition: '' }];
    currentNode.setData({ ...data, condition: newConditions });
  };

  const removeSwitchBranch = (index: number) => {
    const newConditions = [...(data.condition || [])];
    newConditions.splice(index, 1);
    currentNode.setData({ ...data, condition: newConditions });
  };

  return (
    <>
      <p>分支条件:</p>
      {data.condition?.map((branch: any, index: number) => (
        <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
          <Input
            placeholder="条件 (例如 ${var} > 1)"
            value={branch.condition}
            onChange={e => handleSwitchChange(index, 'condition', e.target.value)}
            style={{ flex: 1 }}
          />
          <Input
            placeholder="任务名称"
            value={branch.task}
            onChange={e => handleSwitchChange(index, 'task', e.target.value)}
            style={{ flex: 1 }}
          />
          <Button onClick={() => removeSwitchBranch(index)} danger type="text">X</Button>
        </div>
      ))}
      <Button onClick={addSwitchBranch} type="dashed" style={{ width: '100%' }}>
        + 添加分支
      </Button>
    </>
  );
};
